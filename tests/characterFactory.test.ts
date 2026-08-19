import { describe,expect,it } from 'vitest';
import { FACTORY_STYLES, createFactoryCandidate, createVariationBatch, generateFactoryBatch } from '../src/core/characterFactory';
import { DEFAULT_CHARACTER } from '../src/data/parts';

const average=(values:number[])=>values.reduce((sum,value)=>sum+value,0)/values.length;

describe('Character Factory v1',()=>{
  it('is deterministic for the same seed and style',()=>{
    const a=generateFactoryBatch({seed:'factory-regression-1',style:'cool',count:12,poolSize:84});
    const b=generateFactoryBatch({seed:'factory-regression-1',style:'cool',count:12,poolSize:84});
    expect(a.map(item=>item.signature)).toEqual(b.map(item=>item.signature));
    expect(a.map(item=>item.scores)).toEqual(b.map(item=>item.scores));
    expect(a.map(item=>item.definition.bodyProportions)).toEqual(b.map(item=>item.definition.bodyProportions));
  });

  it('returns twelve unique quality-gated candidates',()=>{
    const batch=generateFactoryBatch({seed:'quality-gate',style:'futuristic',count:12,poolSize:96,qualityFloor:72});
    expect(batch).toHaveLength(12);
    expect(new Set(batch.map(item=>item.signature)).size).toBe(12);
    expect(batch.every(item=>item.scores.quality>=72)).toBe(true);
    expect(batch.every(item=>item.scores.harmony>=0&&item.scores.harmony<=100)).toBe(true);
    expect(batch.every(item=>item.scores.diversity>=0&&item.scores.diversity<=100)).toBe(true);
  });

  it('supports all six style recipes with viable output and recipe-bounded body proportions',()=>{
    for(const recipe of FACTORY_STYLES){
      const batch=generateFactoryBatch({seed:`recipe-${recipe.id}`,style:recipe.id,count:12,poolSize:72,qualityFloor:68});
      expect(batch).toHaveLength(12);
      expect(batch.every(item=>item.style===recipe.id)).toBe(true);
      for(const item of batch){
        const body=item.definition.bodyProportions;expect(body).toBeTruthy();
        expect(body!.height).toBeGreaterThanOrEqual(recipe.body.height[0]);expect(body!.height).toBeLessThanOrEqual(recipe.body.height[1]);
        expect(body!.build).toBeGreaterThanOrEqual(recipe.body.build[0]);expect(body!.build).toBeLessThanOrEqual(recipe.body.build[1]);
        expect(body!.shoulders).toBeGreaterThanOrEqual(recipe.body.shoulders[0]);expect(body!.shoulders).toBeLessThanOrEqual(recipe.body.shoulders[1]);
      }
      const bodySignatures=new Set(batch.map(item=>{const body=item.definition.bodyProportions!;return`${Math.round(body.height*20)}:${Math.round(body.build*20)}:${Math.round(body.shoulders*20)}`;}));
      expect(bodySignatures.size).toBeGreaterThanOrEqual(3);
    }
  });

  it('gives style recipes visibly different body tendencies',()=>{
    const sample=(style:'soft'|'energetic'|'elegant')=>Array.from({length:48},(_,index)=>createFactoryCandidate(`body-tendency-${index}`,style)!.definition.bodyProportions!);
    const soft=sample('soft'),energetic=sample('energetic'),elegant=sample('elegant');
    expect(average(elegant.map(body=>body.height))).toBeGreaterThan(average(soft.map(body=>body.height))+.09);
    expect(average(energetic.map(body=>body.shoulders))).toBeGreaterThan(average(soft.map(body=>body.shoulders))+.12);
    expect(average(elegant.map(body=>body.build))).toBeLessThan(average(energetic.map(body=>body.build))-.10);
  });

  it('keeps requested groups fixed while leaving unlocked outfit and body space for variations',()=>{
    const anchor=structuredClone(DEFAULT_CHARACTER);
    anchor.faceShape='diamond';anchor.eyeStyle='narrow';anchor.browStyle='angled';anchor.noseStyle='button';anchor.mouthStyle='smirk';
    anchor.hairStyle='half-up';anchor.outfitStyle='vest';anchor.hoodStyle='wing';anchor.shirtStyle='sleeveless-high';anchor.strapStyle='y-harness';anchor.accentStyle='triangle';
    anchor.colors={skin:'#d99b6c',hair:'#173d70',eyes:'#168a91',brows:'#173d70',jacket:'#7a3d8e',accent:'#56c4d8'};
    const batch=createVariationBatch(anchor,{seed:'locked-variation',style:'futuristic',count:8,poolSize:72,qualityFloor:60,locks:['face','hair','colors']});
    expect(batch).toHaveLength(8);
    for(const item of batch){const c=item.definition;expect([c.faceShape,c.eyeStyle,c.browStyle,c.noseStyle,c.mouthStyle]).toEqual([anchor.faceShape,anchor.eyeStyle,anchor.browStyle,anchor.noseStyle,anchor.mouthStyle]);expect(c.hairStyle).toBe(anchor.hairStyle);expect(c.colors).toEqual(anchor.colors);expect(c.bodyProportions).toBeTruthy();}
    expect(new Set(batch.map(item=>[item.definition.outfitStyle,item.definition.hoodStyle,item.definition.shirtStyle,item.definition.strapStyle,item.definition.accentStyle].join('|'))).size).toBeGreaterThan(1);
    expect(new Set(batch.map(item=>JSON.stringify(item.definition.bodyProportions))).size).toBeGreaterThan(1);
  });

  it('treats body proportions as part of the outfit/silhouette lock',()=>{
    const anchor=structuredClone(DEFAULT_CHARACTER);anchor.bodyProportions={height:.82,build:1.18,shoulders:1.29};
    const batch=createVariationBatch(anchor,{seed:'body-lock',style:'street',count:6,poolSize:48,qualityFloor:0,locks:['outfit']});
    expect(batch).toHaveLength(6);
    expect(batch.every(item=>JSON.stringify(item.definition.bodyProportions)===JSON.stringify(anchor.bodyProportions))).toBe(true);
  });

  it('collapses to one unique result when every variation group is locked',()=>{
    const anchor=structuredClone(DEFAULT_CHARACTER);anchor.bodyProportions={height:1.17,build:.91,shoulders:1.12};
    const batch=createVariationBatch(anchor,{seed:'fully-locked',style:'soft',count:8,poolSize:72,qualityFloor:0,locks:['face','hair','outfit','colors']});
    expect(batch).toHaveLength(1);
    expect(batch[0].definition.bodyProportions).toEqual(anchor.bodyProportions);
    expect(batch[0].signature).toBe(generateFactoryBatch({seed:'irrelevant',style:'soft',count:1,poolSize:1,anchor,locks:['face','hair','outfit','colors'],qualityFloor:0})[0].signature);
  });

  it('keeps a meaningful spread instead of returning near-identical top scores',()=>{
    const batch=generateFactoryBatch({seed:'diversity-rank',style:'street',count:12,poolSize:120,qualityFloor:70});
    const averageDiversity=batch.reduce((sum,item)=>sum+item.scores.diversity,0)/batch.length;
    expect(averageDiversity).toBeGreaterThan(34);
  });
});
