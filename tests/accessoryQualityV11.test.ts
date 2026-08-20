import { describe,expect,it } from 'vitest';
import { accessoryTriangles } from '../src/data/accessoryPackV1Geometry';
import { EAR_ACCESSORY_OPTIONS,EYEWEAR_OPTIONS,FACE_DETAIL_OPTIONS,HEADWEAR_OPTIONS } from '../src/core/characterExpansion';

const finite=(value:number)=>Number.isFinite(value);

describe('Accessory Quality Pass v1.1',()=>{
  it('replaces every headwear placeholder with a denser silhouette',()=>{
    for(const option of HEADWEAR_OPTIONS){
      const triangles=accessoryTriangles('headwear',option.id);
      if(option.id==='none'){expect(triangles).toHaveLength(0);continue;}
      expect(triangles.length,option.id).toBeGreaterThanOrEqual(16);
      expect(triangles.flatMap(item=>item.points.flat()).every(finite)).toBe(true);
    }
  });

  it('keeps all accessory families finite and selectable',()=>{
    for(const [kind,options] of [
      ['eyewear',EYEWEAR_OPTIONS],['faceDetail',FACE_DETAIL_OPTIONS],['earAccessory',EAR_ACCESSORY_OPTIONS],
    ] as const){
      for(const option of options){
        const triangles=accessoryTriangles(kind,option.id as never);
        if(option.id==='none'){expect(triangles).toHaveLength(0);continue;}
        expect(triangles.length,`${kind}:${option.id}`).toBeGreaterThan(0);
        for(const triangle of triangles){
          expect(triangle.points.flat().every(finite)).toBe(true);
          expect(finite(triangle.zIndex)).toBe(true);
          expect(finite(triangle.shade)).toBe(true);
        }
      }
    }
  });

  it('uses curved density for the previously coarse beanie, beret and cap',()=>{
    expect(accessoryTriangles('headwear','beanie').length).toBeGreaterThan(50);
    expect(accessoryTriangles('headwear','beret').length).toBeGreaterThan(20);
    expect(accessoryTriangles('headwear','cap').length).toBeGreaterThan(30);
  });
});
