import { describe, expect, it } from 'vitest';
import { BODY_PARTS, BROW_PARTS, EYE_PARTS, FACE_PARTS, HAIR_PARTS, MOUTH_PARTS, NOSE_PARTS } from '../src/data/partLibrary';
import { EYE_REFERENCE_BOUNDS, GENERATED_VARIATION_SOURCE, HAIR_REFERENCE_BOUNDS, HAIR_REFERENCE_FIT } from '../src/data/generatedVariationGeometry';
import { REFERENCE_FACE_FIT_METRICS, REFERENCE_FACE_OUTLINE } from '../src/data/referenceFaceGeometry';
import { REFERENCE_BODY_FIT_METRICS } from '../src/data/referenceBodyGeometry';

describe('sample-derived polygon geometry',()=>{
  it('keeps all ten hairstyles aligned to high-IoU source-sheet geometry',()=>{
    expect(GENERATED_VARIATION_SOURCE.hairCount).toBe(10);expect(GENERATED_VARIATION_SOURCE.fitRevision).toBe(6);expect(Object.keys(HAIR_PARTS)).toHaveLength(10);
    for(const [id,hair] of Object.entries(HAIR_PARTS)){
      const key=id as keyof typeof HAIR_REFERENCE_BOUNDS,target=HAIR_REFERENCE_BOUNDS[key],fit=HAIR_REFERENCE_FIT[key];
      expect(hair.tags).toContain('variation-sheet');expect(hair.tags).toContain('face-aligned-v2');expect(hair.triangles.length).toBeGreaterThanOrEqual(fit.triangles);
      expect(fit.triangles).toBeGreaterThanOrEqual(130);expect(fit.maskIoU).toBeGreaterThanOrEqual(.974);
      expect(Math.abs(hair.bounds.minX-target.minX)).toBeLessThan(.05);expect(Math.abs(hair.bounds.maxX-target.maxX)).toBeLessThan(.05);expect(Math.abs(hair.bounds.minY-target.minY)).toBeLessThan(.05);expect(Math.abs(hair.bounds.maxY-target.maxY)).toBeLessThan(.05);
      expect(hair.triangles.some(t=>t.layer==='hair-front')).toBe(true);
    }
    for(const id of ['ponytail','side-tail','twin-tail','bun','half-up'] as const)expect(HAIR_PARTS[id].triangles.some(t=>t.layer==='hair-back')).toBe(true);
    for(const id of ['ponytail','side-tail','twin-tail','braid','bun','half-up'] as const)expect(HAIR_PARTS[id].triangles.some(t=>t.layer==='hair-tie')).toBe(true);
  });

  it('restores source-sheet eye painter layers, aspect ratios and clean catchlights',()=>{
    expect(GENERATED_VARIATION_SOURCE.eyeCount).toBe(10);expect(Object.keys(EYE_PARTS)).toHaveLength(10);
    for(const [id,eye] of Object.entries(EYE_PARTS)){
      expect(eye.tags).toContain('painter-order-v2');const target=EYE_REFERENCE_BOUNDS[id as keyof typeof EYE_REFERENCE_BOUNDS];
      expect(eye.bounds.minX).toBeCloseTo(target.minX,3);expect(eye.bounds.maxX).toBeCloseTo(target.maxX,3);expect(eye.bounds.minY).toBeCloseTo(target.minY,3);expect(eye.bounds.maxY).toBeCloseTo(target.maxY,3);
      expect(eye.triangles.some(t=>t.layer==='eye-outline')).toBe(true);
      if(id!=='closed'){for(const layer of ['eye-white','iris','pupil','eye-glint'])expect(eye.triangles.some(t=>t.layer===layer)).toBe(true);}
    }
    const bright=EYE_REFERENCE_BOUNDS.bright;expect(bright.maxX-bright.minX).toBeGreaterThanOrEqual(.36);expect(bright.maxY-bright.minY).toBeGreaterThanOrEqual(.40);
    expect(EYE_PARTS.sparkle.triangles.filter(t=>t.layer==='eye-glint').length).toBeGreaterThan(EYE_PARTS.bright.triangles.filter(t=>t.layer==='eye-glint').length);
  });

  it('uses the sampled face outline, brow, nose and open smile by default',()=>{
    expect(REFERENCE_FACE_FIT_METRICS.visibleOutlineIoU).toBeGreaterThanOrEqual(.94);expect(REFERENCE_FACE_FIT_METRICS.browMaskIoU).toBeGreaterThanOrEqual(.94);expect(REFERENCE_FACE_FIT_METRICS.noseMaskIoU).toBeGreaterThanOrEqual(.80);expect(REFERENCE_FACE_FIT_METRICS.mouthOuterIoU).toBeGreaterThanOrEqual(.97);expect(REFERENCE_FACE_FIT_METRICS.mouthInnerIoU).toBeGreaterThanOrEqual(.97);
    expect(FACE_PARTS.soft.tags).toContain('reference-fit');expect(BROW_PARTS.soft.tags).toContain('reference-fit');expect(NOSE_PARTS.diamond.tags).toContain('reference-fit');expect(MOUTH_PARTS['smile-open'].tags).toContain('reference-fit');expect(FACE_PARTS.soft.triangles.length).toBeGreaterThanOrEqual(REFERENCE_FACE_OUTLINE.length);
  });

  it('uses high-IoU sampled clothing geometry for the female body',()=>{
    for(const metric of Object.values(REFERENCE_BODY_FIT_METRICS))expect(metric.maskIoU).toBeGreaterThanOrEqual(.95);expect(BODY_PARTS.female.tags).toContain('reference-fit');
    const expected=Object.values(REFERENCE_BODY_FIT_METRICS).reduce((sum,metric)=>sum+metric.triangles,0);expect(BODY_PARTS.female.triangles).toHaveLength(expected);
  });
});
