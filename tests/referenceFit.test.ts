import { describe, expect, it } from 'vitest';
import { BODY_PARTS, BROW_PARTS, EYE_PARTS, FACE_PARTS, HAIR_PARTS, MOUTH_PARTS, NOSE_PARTS } from '../src/data/partLibrary';
import { REFERENCE_FIT_METRICS, REFERENCE_PONYTAIL_HAIR } from '../src/data/referenceGeometry';
import { REFERENCE_FACE_FIT_METRICS, REFERENCE_FACE_OUTLINE } from '../src/data/referenceFaceGeometry';
import { REFERENCE_BODY_FIT_METRICS } from '../src/data/referenceBodyGeometry';

describe('sample-derived polygon geometry',()=>{
  it('keeps the extracted ponytail above the measured fit threshold',()=>{
    expect(REFERENCE_FIT_METRICS.hairMaskIoU).toBeGreaterThanOrEqual(.93);
    expect(REFERENCE_FIT_METRICS.hairLabError).toBeLessThanOrEqual(10.5);
    expect(REFERENCE_PONYTAIL_HAIR).toHaveLength(REFERENCE_FIT_METRICS.hairTriangles);
    expect(HAIR_PARTS.ponytail.tags).toContain('reference-fit');
    expect(HAIR_PARTS.ponytail.triangles.length).toBeGreaterThanOrEqual(REFERENCE_FIT_METRICS.hairTriangles);
  });

  it('uses the large anime-eye proportions measured from the sample',()=>{
    const b=EYE_PARTS.bright.bounds,width=b.maxX-b.minX,height=b.maxY-b.minY;
    expect(EYE_PARTS.bright.tags).toContain('reference-fit');
    expect(width).toBeGreaterThan(.34);
    expect(height).toBeGreaterThan(.31);
    expect(width/height).toBeGreaterThan(1.02);
  });

  it('uses the sampled face outline, brow, nose and open smile by default',()=>{
    expect(REFERENCE_FACE_FIT_METRICS.visibleOutlineIoU).toBeGreaterThanOrEqual(.94);
    expect(REFERENCE_FACE_FIT_METRICS.browMaskIoU).toBeGreaterThanOrEqual(.94);
    expect(REFERENCE_FACE_FIT_METRICS.noseMaskIoU).toBeGreaterThanOrEqual(.80);
    expect(REFERENCE_FACE_FIT_METRICS.mouthOuterIoU).toBeGreaterThanOrEqual(.97);
    expect(REFERENCE_FACE_FIT_METRICS.mouthInnerIoU).toBeGreaterThanOrEqual(.97);
    expect(FACE_PARTS.soft.tags).toContain('reference-fit');
    expect(BROW_PARTS.soft.tags).toContain('reference-fit');
    expect(NOSE_PARTS.diamond.tags).toContain('reference-fit');
    expect(MOUTH_PARTS['smile-open'].tags).toContain('reference-fit');
    expect(FACE_PARTS.soft.triangles.length).toBeGreaterThanOrEqual(REFERENCE_FACE_OUTLINE.length);
  });

  it('uses high-IoU sampled clothing geometry for the female body',()=>{
    for(const metric of Object.values(REFERENCE_BODY_FIT_METRICS))expect(metric.maskIoU).toBeGreaterThanOrEqual(.95);
    expect(BODY_PARTS.female.tags).toContain('reference-fit');
    const expected=Object.values(REFERENCE_BODY_FIT_METRICS).reduce((sum,metric)=>sum+metric.triangles,0);
    expect(BODY_PARTS.female.triangles).toHaveLength(expected);
    const layers=new Set(BODY_PARTS.female.triangles.map(t=>t.layer));
    for(const layer of ['shirt','jacket','hood','strap','accent'])expect(layers.has(layer)).toBe(true);
  });
});
