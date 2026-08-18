#!/usr/bin/env python3
"""Extract flat polygon geometry from a reference image.

The utility supports two complementary fitting paths:

adaptive
    Lab seed segmentation -> k-means denoise -> Canny/corners -> Delaunay ->
    Lab reconstruction-error refinement. Best for flat-shaded regions where
    internal color facets should drive extra vertices.

contour
    Lab seed segmentation -> component filtering -> approxPolyDP ->
    deterministic ear-clipping. Best for silhouettes such as face, brows,
    mouth and clothing blocks because the boundary is preserved instead of
    losing edge coverage to unconstrained Delaunay triangles.

Only derived coordinates, shade deltas and metrics are emitted. Source pixels
are never embedded in the game data.
"""
from __future__ import annotations

import argparse
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

try:
    import cv2
    import numpy as np
except ImportError as exc:  # pragma: no cover
    raise SystemExit("reference-vectorizer requires: pip install opencv-python numpy") from exc


@dataclass
class Config:
    roi: tuple[int, int, int, int]
    seed_rgb: list[tuple[int, int, int]]
    seed_point: tuple[int, int]
    lab_tolerance: float = 38.0
    contour_epsilon: float = 1.8
    edge_stride: int = 8
    max_corners: int = 90
    min_triangle_coverage: float = 0.86
    target_lab_error: float = 10.5
    max_points: int = 165
    refinement_batch: int = 10
    min_point_distance: float = 7.0
    game_scale: float = 0.0062
    pixel_origin: tuple[float, float] = (720.0, 406.0)
    game_origin: tuple[float, float] = (0.0, 0.62)
    base_rgb: tuple[int, int, int] = (57, 40, 29)
    kmeans_colors: int = 8
    component_mode: str = "seeded"  # seeded | largest | all
    min_component_area: int = 8
    triangulation_mode: str = "adaptive"  # adaptive | contour
    fill_holes: bool = False
    morph_close: int = 2
    morph_open: int = 1

    @classmethod
    def load(cls, path: Path) -> "Config":
        raw = json.loads(path.read_text())
        return cls(
            roi=tuple(raw["roi"]),
            seed_rgb=[tuple(v) for v in raw["seed_rgb"]],
            seed_point=tuple(raw.get("seed_point", [raw["roi"][0], raw["roi"][1]])),
            lab_tolerance=float(raw.get("lab_tolerance", 38.0)),
            contour_epsilon=float(raw.get("contour_epsilon", 1.8)),
            edge_stride=int(raw.get("edge_stride", 8)),
            max_corners=int(raw.get("max_corners", 90)),
            min_triangle_coverage=float(raw.get("min_triangle_coverage", 0.86)),
            target_lab_error=float(raw.get("target_lab_error", 10.5)),
            max_points=int(raw.get("max_points", 165)),
            refinement_batch=int(raw.get("refinement_batch", 10)),
            min_point_distance=float(raw.get("min_point_distance", 7.0)),
            game_scale=float(raw.get("game_scale", 0.0062)),
            pixel_origin=tuple(raw.get("pixel_origin", [720.0, 406.0])),
            game_origin=tuple(raw.get("game_origin", [0.0, 0.62])),
            base_rgb=tuple(raw.get("base_rgb", [57, 40, 29])),
            kmeans_colors=int(raw.get("kmeans_colors", 8)),
            component_mode=str(raw.get("component_mode", "seeded")),
            min_component_area=int(raw.get("min_component_area", 8)),
            triangulation_mode=str(raw.get("triangulation_mode", "adaptive")),
            fill_holes=bool(raw.get("fill_holes", False)),
            morph_close=int(raw.get("morph_close", 2)),
            morph_open=int(raw.get("morph_open", 1)),
        )


def rgb_to_lab(rgb: tuple[int, int, int]) -> np.ndarray:
    arr = np.uint8([[list(rgb)]])
    return cv2.cvtColor(arr, cv2.COLOR_RGB2LAB)[0, 0].astype(np.float32)


def lab_candidate_mask(image_bgr: np.ndarray, cfg: Config) -> np.ndarray:
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    seed_labs = np.stack([rgb_to_lab(v) for v in cfg.seed_rgb])
    distances = np.min(np.linalg.norm(lab[:, :, None, :] - seed_labs[None, None, :, :], axis=3), axis=2)
    candidate = np.uint8(distances <= cfg.lab_tolerance) * 255
    kernel = np.ones((3, 3), np.uint8)
    if cfg.morph_close:
        candidate = cv2.morphologyEx(candidate, cv2.MORPH_CLOSE, kernel, iterations=cfg.morph_close)
    if cfg.morph_open:
        candidate = cv2.morphologyEx(candidate, cv2.MORPH_OPEN, kernel, iterations=cfg.morph_open)
    return candidate


def select_components(candidate: np.ndarray, cfg: Config) -> np.ndarray:
    count, labels, stats, _ = cv2.connectedComponentsWithStats(candidate, connectivity=8)
    if count <= 1:
        return candidate
    if cfg.component_mode == "all":
        keep = [i for i in range(1, count) if int(stats[i, cv2.CC_STAT_AREA]) >= cfg.min_component_area]
    elif cfg.component_mode == "largest":
        keep = [max(range(1, count), key=lambda i: int(stats[i, cv2.CC_STAT_AREA]))]
    elif cfg.component_mode == "seeded":
        x0, y0, _, _ = cfg.roi
        sx, sy = int(cfg.seed_point[0] - x0), int(cfg.seed_point[1] - y0)
        if not (0 <= sx < candidate.shape[1] and 0 <= sy < candidate.shape[0]):
            raise ValueError("seed_point must be inside roi")
        label = int(labels[sy, sx])
        if label == 0:
            ys, xs = np.nonzero(candidate)
            if len(xs) == 0:
                raise ValueError("no pixels matched the configured Lab seeds")
            nearest = int(np.argmin((xs - sx) ** 2 + (ys - sy) ** 2))
            label = int(labels[ys[nearest], xs[nearest]])
        keep = [label] if label > 0 else []
    else:
        raise ValueError(f"unsupported component_mode: {cfg.component_mode}")
    result = np.zeros_like(candidate)
    for label in keep:
        result[labels == label] = 255
    return result


def fill_external(mask: np.ndarray) -> np.ndarray:
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    result = np.zeros_like(mask)
    cv2.drawContours(result, contours, -1, 255, -1)
    return result


def quantize_lab(image_bgr: np.ndarray, mask: np.ndarray, k: int) -> np.ndarray:
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
    pixels = lab[mask > 0].astype(np.float32)
    if len(pixels) < k:
        return image_bgr.copy()
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 40, 0.3)
    _, labels, centers = cv2.kmeans(pixels, k, None, criteria, 4, cv2.KMEANS_PP_CENTERS)
    qlab = lab.copy()
    qlab[mask > 0] = np.uint8(np.clip(centers[labels.ravel()], 0, 255))
    return cv2.cvtColor(qlab, cv2.COLOR_LAB2BGR)


def dedupe_points(points: Iterable[tuple[float, float]], min_distance: float = 1.5) -> list[tuple[float, float]]:
    accepted: list[tuple[float, float]] = []
    threshold2 = min_distance * min_distance
    for x, y in points:
        if not accepted or min((x - ax) ** 2 + (y - ay) ** 2 for ax, ay in accepted) >= threshold2:
            accepted.append((float(x), float(y)))
    return accepted


def feature_points(image_bgr: np.ndarray, mask: np.ndarray, cfg: Config) -> list[tuple[float, float]]:
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 45, 120, L2gradient=True)
    edges = cv2.bitwise_and(edges, edges, mask=mask)
    points: list[tuple[float, float]] = []
    contours, _ = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    for contour in contours:
        if abs(cv2.contourArea(contour)) < 8:
            continue
        approx = cv2.approxPolyDP(contour, cfg.contour_epsilon, True)
        points.extend((float(p[0][0]), float(p[0][1])) for p in approx)
    ys, xs = np.nonzero(edges)
    order = np.argsort(xs + ys * image_bgr.shape[1])
    for idx in order[:: max(1, cfg.edge_stride)]:
        points.append((float(xs[idx]), float(ys[idx])))
    corners = cv2.goodFeaturesToTrack(
        gray,
        maxCorners=cfg.max_corners,
        qualityLevel=0.015,
        minDistance=cfg.min_point_distance,
        mask=mask,
        blockSize=5,
        useHarrisDetector=False,
    )
    if corners is not None:
        points.extend((float(p[0][0]), float(p[0][1])) for p in corners)
    return dedupe_points(points, 2.2)


def triangle_mask(shape: tuple[int, int], triangle: np.ndarray) -> np.ndarray:
    result = np.zeros(shape, np.uint8)
    cv2.fillConvexPoly(result, np.round(triangle).astype(np.int32), 255, lineType=cv2.LINE_8)
    return result


def triangulate_delaunay(points: list[tuple[float, float]], mask: np.ndarray, coverage: float) -> list[np.ndarray]:
    h, w = mask.shape
    subdiv = cv2.Subdiv2D((0, 0, w, h))
    for x, y in points:
        if 0 <= x < w and 0 <= y < h:
            try:
                subdiv.insert((float(x), float(y)))
            except cv2.error:
                pass
    result: list[np.ndarray] = []
    seen: set[tuple[int, ...]] = set()
    for raw in subdiv.getTriangleList():
        tri = np.array(raw, np.float32).reshape(3, 2)
        if np.any(tri[:, 0] < 0) or np.any(tri[:, 0] >= w) or np.any(tri[:, 1] < 0) or np.any(tri[:, 1] >= h):
            continue
        key = tuple(np.round(tri.flatten() * 10).astype(int))
        if key in seen:
            continue
        seen.add(key)
        tm = triangle_mask((h, w), tri)
        area = int(np.count_nonzero(tm))
        if area < 3:
            continue
        inside = int(np.count_nonzero(cv2.bitwise_and(tm, mask)))
        if inside / area >= coverage:
            result.append(tri)
    return result


def polygon_area(points: list[tuple[float, float]]) -> float:
    return sum(points[i][0] * points[(i + 1) % len(points)][1] - points[(i + 1) % len(points)][0] * points[i][1] for i in range(len(points))) / 2.0


def point_in_triangle(p, a, b, c) -> bool:
    def cross(u, v, w):
        return (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0])
    c1, c2, c3 = cross(a, b, p), cross(b, c, p), cross(c, a, p)
    return (c1 >= -1e-6 and c2 >= -1e-6 and c3 >= -1e-6) or (c1 <= 1e-6 and c2 <= 1e-6 and c3 <= 1e-6)


def earclip_polygon(points: list[tuple[float, float]]) -> list[np.ndarray]:
    if len(points) < 3:
        return []
    vertices = points[:] if polygon_area(points) > 0 else list(reversed(points))
    indices = list(range(len(vertices)))
    triangles: list[np.ndarray] = []
    guard = 0
    while len(indices) > 3 and guard < len(vertices) * len(vertices) * 2:
        clipped = False
        for position, current in enumerate(indices):
            previous = indices[position - 1]
            following = indices[(position + 1) % len(indices)]
            a, b, c = vertices[previous], vertices[current], vertices[following]
            cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])
            if cross <= 1e-7:
                continue
            if any(point_in_triangle(vertices[j], a, b, c) for j in indices if j not in (previous, current, following)):
                continue
            triangles.append(np.array([a, b, c], np.float32))
            del indices[position]
            clipped = True
            break
        if not clipped:
            scores = []
            for position, current in enumerate(indices):
                a = vertices[indices[position - 1]]
                b = vertices[current]
                c = vertices[indices[(position + 1) % len(indices)]]
                scores.append(abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])))
            del indices[int(np.argmin(scores))]
        guard += 1
    if len(indices) == 3:
        triangles.append(np.array([vertices[i] for i in indices], np.float32))
    return triangles


def triangulate_contours(mask: np.ndarray, cfg: Config) -> list[np.ndarray]:
    source = fill_external(mask) if cfg.fill_holes else mask
    contours, _ = cv2.findContours(source, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    result: list[np.ndarray] = []
    for contour in contours:
        if abs(cv2.contourArea(contour)) < cfg.min_component_area:
            continue
        approx = cv2.approxPolyDP(contour, cfg.contour_epsilon, True).reshape(-1, 2)
        points = [(float(x), float(y)) for x, y in approx]
        result.extend(earclip_polygon(points))
    return result


def median_bgr(image_bgr: np.ndarray, mask: np.ndarray) -> tuple[int, int, int]:
    pixels = image_bgr[mask > 0]
    if len(pixels) == 0:
        return (0, 0, 0)
    med = np.median(pixels, axis=0)
    return tuple(int(round(v)) for v in med)


def render_triangles(image_bgr: np.ndarray, mask: np.ndarray, triangles: list[np.ndarray]):
    rendered = np.zeros_like(image_bgr)
    covered = np.zeros(mask.shape, np.uint8)
    colors: list[tuple[int, int, int]] = []
    for tri in triangles:
        tm = triangle_mask(mask.shape, tri)
        sample_mask = cv2.bitwise_and(tm, mask)
        color = median_bgr(image_bgr, sample_mask)
        cv2.fillConvexPoly(rendered, np.round(tri).astype(np.int32), color, lineType=cv2.LINE_AA)
        cv2.fillConvexPoly(covered, np.round(tri).astype(np.int32), 255)
        colors.append(color)
    return rendered, covered, colors


def lab_error(source_bgr: np.ndarray, rendered_bgr: np.ndarray, mask: np.ndarray) -> tuple[float, np.ndarray]:
    src = cv2.cvtColor(source_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    dst = cv2.cvtColor(rendered_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    per_pixel = np.linalg.norm(src - dst, axis=2)
    values = per_pixel[mask > 0]
    return float(values.mean()) if len(values) else math.inf, per_pixel


def choose_refinement_points(error: np.ndarray, mask: np.ndarray, existing: list[tuple[float, float]], cfg: Config):
    score = cv2.GaussianBlur(error, (0, 0), 2.2)
    score = np.where(mask > 0, score, -1.0)
    work = score.copy()
    picked: list[tuple[float, float]] = []
    radius = int(max(4, round(cfg.min_point_distance)))
    for _ in range(cfg.refinement_batch):
        y, x = np.unravel_index(int(np.argmax(work)), work.shape)
        if work[y, x] < 0:
            break
        if all((x - px) ** 2 + (y - py) ** 2 >= cfg.min_point_distance ** 2 for px, py in existing + picked):
            picked.append((float(x), float(y)))
        cv2.circle(work, (int(x), int(y)), radius, -1.0, -1)
    return picked


def mask_iou(a: np.ndarray, b: np.ndarray) -> float:
    inter = np.count_nonzero((a > 0) & (b > 0))
    union = np.count_nonzero((a > 0) | (b > 0))
    return float(inter / union) if union else 1.0


def additive_shade(color_bgr: tuple[int, int, int], base_rgb: tuple[int, int, int]) -> int:
    b, g, r = color_bgr
    deltas = np.array([r - base_rgb[0], g - base_rgb[1], b - base_rgb[2]], np.float32)
    return int(np.clip(np.median(deltas), -48, 48))


def to_game(x: float, y: float, cfg: Config) -> tuple[float, float]:
    x0, y0, _, _ = cfg.roi
    global_x, global_y = x + x0, y + y0
    gx = cfg.game_origin[0] + (global_x - cfg.pixel_origin[0]) * cfg.game_scale
    gy = cfg.game_origin[1] - (global_y - cfg.pixel_origin[1]) * cfg.game_scale
    return round(gx, 4), round(gy, 4)


def adaptive_fit(roi: np.ndarray, mask: np.ndarray, cfg: Config):
    quantized = quantize_lab(roi, mask, cfg.kmeans_colors)
    points = feature_points(quantized, mask, cfg)
    if len(points) > max(24, cfg.max_points - cfg.refinement_batch * 3):
        idx = np.linspace(0, len(points) - 1, max(24, cfg.max_points - cfg.refinement_batch * 3), dtype=int)
        points = [points[int(i)] for i in idx]
    best = None
    while True:
        triangles = triangulate_delaunay(points, mask, cfg.min_triangle_coverage)
        rendered, covered, colors = render_triangles(roi, mask, triangles)
        error, error_map = lab_error(roi, rendered, mask)
        iou = mask_iou(mask, cv2.bitwise_and(covered, mask))
        current = (error, iou, triangles, colors, rendered, covered, list(points))
        if best is None or (error + (1.0 - iou) * 20) < (best[0] + (1.0 - best[1]) * 20):
            best = current
        if error <= cfg.target_lab_error or len(points) >= cfg.max_points:
            break
        extra = choose_refinement_points(error_map, mask, points, cfg)
        if not extra:
            break
        points.extend(extra[: max(0, cfg.max_points - len(points))])
    assert best is not None
    return best


def contour_fit(roi: np.ndarray, mask: np.ndarray, cfg: Config):
    metric_mask = fill_external(mask) if cfg.fill_holes else mask
    triangles = triangulate_contours(mask, cfg)
    rendered, covered, colors = render_triangles(roi, metric_mask, triangles)
    error, _ = lab_error(roi, rendered, metric_mask)
    return error, mask_iou(metric_mask, covered), triangles, colors, rendered, covered, []


def run(image_path: Path, cfg: Config, output: Path):
    full = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
    if full is None:
        raise SystemExit(f"could not read image: {image_path}")
    x0, y0, x1, y1 = cfg.roi
    roi = full[y0:y1, x0:x1].copy()
    if roi.size == 0:
        raise ValueError("roi is empty")

    mask = select_components(lab_candidate_mask(roi, cfg), cfg)
    if cfg.fill_holes:
        mask = fill_external(mask)
    if not np.any(mask):
        raise ValueError("reference mask is empty")

    if cfg.triangulation_mode == "contour":
        error, iou, triangles, colors, rendered, covered, points = contour_fit(roi, mask, cfg)
        algorithm = "lab-seeded-components+approxPolyDP+earclip"
    elif cfg.triangulation_mode == "adaptive":
        error, iou, triangles, colors, rendered, covered, points = adaptive_fit(roi, mask, cfg)
        algorithm = "lab-seeded-components+kmeans+canny+corners+Subdiv2D+adaptive-Lab-error"
    else:
        raise ValueError(f"unsupported triangulation_mode: {cfg.triangulation_mode}")

    geometry = []
    for tri, color in zip(triangles, colors):
        geometry.append({
            "points": [list(to_game(float(x), float(y), cfg)) for x, y in tri],
            "shade": additive_shade(color, cfg.base_rgb),
        })

    output.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "algorithm": algorithm,
        "metrics": {
            "labMeanError": round(error, 4),
            "maskIoU": round(iou, 4),
            "triangles": len(triangles),
            "points": len(points),
        },
        "triangles": geometry,
    }
    output.write_text(json.dumps(payload, ensure_ascii=False, indent=2))

    audit = np.full_like(roi, 245)
    audit[mask > 0] = rendered[mask > 0]
    for tri in triangles:
        cv2.polylines(audit, [np.round(tri).astype(np.int32)], True, (35, 35, 35), 1, cv2.LINE_AA)
    cv2.imwrite(str(output.with_suffix(".png")), audit)
    cv2.imwrite(str(output.with_name(output.stem + "-mask.png")), mask)
    print(json.dumps(payload["metrics"], indent=2))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image", type=Path)
    parser.add_argument("config", type=Path)
    parser.add_argument("--output", type=Path, default=Path("reference-fit.json"))
    args = parser.parse_args()
    run(args.image, Config.load(args.config), args.output)


if __name__ == "__main__":
    main()
