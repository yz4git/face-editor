import { describe, expect, it } from 'vitest';
import { BODY_PARTS, BROW_PARTS, EYE_PARTS, FACE_PARTS, HAIR_PARTS, MOUTH_PARTS, NOSE_PARTS } from '../src/data/partLibrary';
import { GENERATED_VARIATION_SOURCE } from '../src/data/generatedVariationGeometry';
import { REFERENCE_FACE_FIT_METRICS, REFERENCE_FACE_OUTLINE } from '../src/data/referenceFaceGeometry';
import { REFERENCE_BODY_FIT_METRICS } from '../src/data/referenceBodyGeometry';

describe('sample-derived polygon geometry',()=>{
  it('provides all ten image-derived hair variations as triangle data',()=>{
    expect(GENERATED_VARIATION_SOURCE.hairCount).toBe(10);
    expect(Object.keys(HAIR_PARTS)).toHaveLength(10);
    for(const hair of Object.values(HAIR_PARTS)){
      expect(hair.tags).toContain('variation-sheet');
      expect(hair.tags).toContain('reference-fit');
      expect(hair.triangles.length).toBeGreaterThan(10);
      expect(hair.triangles.flatMap(t=>t.points).flat().every(Number.isFinite)).toBe(true);
    }
  });

  it('provides all ten image-derived anime-eye variations',()=>{
    expect(GENERATED_VARIATION_SOURCE.eyeCount).toBe(10);
    expect(Object.keys(EYE_PARTS)).toHaveLength(10);
    for(const eye of Object.values(EYE_PARTS)){
      expect(eye.tags).toContain('variation-sheet');
      expect(eye.tags).toContain('reference-fit');
      expect(eye.triangles.length).toBeGreaterThan(0);
      expect(eye.triangles.flatMap(t=>t.points).flat().every(Number.isFinite)).toBe(true);
    }
    const bright=EYE_PARTS.bright.bounds;
    expect(bright.maxX-bright.minX).toBeGreaterThan(.34);
    expect(bright.maxY-bright.minY).toBeGreaterThan(.30);
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
