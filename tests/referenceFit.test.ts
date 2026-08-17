import { describe, expect, it } from 'vitest';
import { EYE_PARTS, HAIR_PARTS } from '../src/data/partLibrary';
import { REFERENCE_FIT_METRICS, REFERENCE_PONYTAIL_HAIR } from '../src/data/referenceGeometry';

describe('sample-derived polygon geometry',()=>{
  it('keeps the extracted ponytail above the measured fit threshold',()=>{
    expect(REFERENCE_FIT_METRICS.hairMaskIoU).toBeGreaterThanOrEqual(.93);
    expect(REFERENCE_FIT_METRICS.hairLabError).toBeLessThanOrEqual(10.5);
    expect(REFERENCE_PONYTAIL_HAIR).toHaveLength(REFERENCE_FIT_METRICS.hairTriangles);
    expect(HAIR_PARTS.ponytail.tags).toContain('reference-fit');
    expect(HAIR_PARTS.ponytail.triangles.length).toBeGreaterThanOrEqual(REFERENCE_FIT_METRICS.hairTriangles);
  });

  it('uses the tall anime-eye proportions measured from the sample',()=>{
    const b=EYE_PARTS.bright.bounds;
    expect(EYE_PARTS.bright.tags).toContain('reference-fit');
    expect(b.maxX-b.minX).toBeGreaterThan(.36);
    expect(b.maxY-b.minY).toBeGreaterThan(.36);
  });
});
