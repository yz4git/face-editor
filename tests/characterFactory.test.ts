import { describe,expect,it } from 'vitest';
import { FACTORY_STYLES, createVariationBatch, generateFactoryBatch } from '../src/core/characterFactory';
import { DEFAULT_CHARACTER } from '../src/data/parts';

describe('Character Factory v1',()=>{
  it('is deterministic for the same seed and style',()=>{
    const a=generateFactoryBatch({seed:'factory-regression-1',style:'cool',count:12,poolSize:84});
    const b=generateFactoryBatch({seed:'factory-regression-1',style:'cool',count:12,poolSize:84});
    expect(a.map(item=>item.signature)).toEqual(b.map(item=>item.signature));
    expect(a.map(item=>item.scores)).toEqual(b.map(item=>item.scores));
  });

  it('returns twelve unique quality-gated candidates',()=>{
    const batch=generateFactoryBatch({seed:'quality-gate',style:'futuristic',count:12,poolSize:96,qualityFloor:72});
    expect(batch).toHaveLength(12);
    expect(new Set(batch.map(item=>item.signature)).size).toBe(12);
    expect(batch.every(item=>item.scores.quality>=72)).toBe(true);
    expect(batch.every(item=>item.scores.harmony>=0&&item.scores.harmony<=100)).toBe(true);
    expect(batch.every(item=>item.scores.diversity>=0&&item.scores.diversity<=100)).toBe(true);
  });

  it('supports all six style recipes with viable output',()=>{
    for(const recipe of FACTORY_STYLES){
      const batch=generateFactoryBatch({seed:`recipe-${recipe.id}`,style:recipe.id,count:4,poolSize:32,qualityFloor:68});
      expect(batch).toHaveLength(4);
      expect(batch.every(item=>item.style===recipe.id)).toBe(true);
    }
  });

  it('keeps requested groups fixed while generating variations',()=>{
    const anchor=structuredClone(DEFAULT_CHARACTER);
    anchor.faceShape='diamond';anchor.eyeStyle='narrow';anchor.browStyle='angled';anchor.noseStyle='button';anchor.mouthStyle='smirk';
    anchor.hairStyle='half-up';anchor.outfitStyle='vest';anchor.hoodStyle='wing';anchor.shirtStyle='sleeveless-high';anchor.strapStyle='y-harness';anchor.accentStyle='triangle';
    anchor.colors={skin:'#d99b6c',hair:'#173d70',eyes:'#168a91',brows:'#173d70',jacket:'#7a3d8e',accent:'#56c4d8'};
    const batch=createVariationBatch(anchor,{seed:'locked-variation',style:'futuristic',count:8,poolSize:72,qualityFloor:60,locks:['face','hair','outfit','colors']});
    expect(batch).toHaveLength(8);
    for(const item of batch){const c=item.definition;expect([c.faceShape,c.eyeStyle,c.browStyle,c.noseStyle,c.mouthStyle]).toEqual([anchor.faceShape,anchor.eyeStyle,anchor.browStyle,anchor.noseStyle,anchor.mouthStyle]);expect(c.hairStyle).toBe(anchor.hairStyle);expect([c.baseStyle,c.outfitStyle,c.hoodStyle,c.shirtStyle,c.strapStyle,c.accentStyle]).toEqual([anchor.baseStyle,anchor.outfitStyle,anchor.hoodStyle,anchor.shirtStyle,anchor.strapStyle,anchor.accentStyle]);expect(c.colors).toEqual(anchor.colors);}
  });

  it('keeps a meaningful spread instead of returning near-identical top scores',()=>{
    const batch=generateFactoryBatch({seed:'diversity-rank',style:'street',count:12,poolSize:120,qualityFloor:70});
    const average=batch.reduce((sum,item)=>sum+item.scores.diversity,0)/batch.length;
    expect(average).toBeGreaterThan(34);
  });
});
