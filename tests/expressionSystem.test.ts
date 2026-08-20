import { describe,expect,it } from 'vitest';
import { compileCharacter,exportCharacterBundle } from '../src/core/compileCharacter';
import { applyExpression,DEFAULT_EXPRESSION_SET,EXPRESSION_ORDER } from '../src/core/expressionSystem';
import { generateFactoryBatch } from '../src/core/characterFactory';
import { DEFAULT_CHARACTER } from '../src/data/parts';

describe('Expression System v1',()=>{
  it('ships the eight required deterministic expression presets',()=>{
    expect(EXPRESSION_ORDER).toEqual(['neutral','smile','happy','angry','sad','surprised','serious','blink']);
    expect(Object.keys(DEFAULT_EXPRESSION_SET.expressions).sort()).toEqual([...EXPRESSION_ORDER].sort());
    expect(DEFAULT_EXPRESSION_SET.defaultExpression).toBe('neutral');
  });

  it('keeps the authored character identity separate from expression overrides',()=>{
    const base=structuredClone(DEFAULT_CHARACTER);
    base.hairStyle='half-up';base.faceShape='diamond';base.noseStyle='button';base.outfitStyle='vest';base.hoodStyle='wing';base.shirtStyle='sleeveless-high';base.strapStyle='y-harness';base.accentStyle='triangle';
    base.colors={skin:'#d99b6c',hair:'#173d70',eyes:'#168a91',brows:'#173d70',jacket:'#7a3d8e',accent:'#56c4d8'};
    const original=structuredClone(base);
    for(const id of EXPRESSION_ORDER){
      const expressed=applyExpression(base,id);
      expect([expressed.baseStyle,expressed.outfitStyle,expressed.hoodStyle,expressed.shirtStyle,expressed.strapStyle,expressed.accentStyle,expressed.hairStyle,expressed.faceShape,expressed.noseStyle]).toEqual([base.baseStyle,base.outfitStyle,base.hoodStyle,base.shirtStyle,base.strapStyle,base.accentStyle,base.hairStyle,base.faceShape,base.noseStyle]);
      expect(expressed.colors).toEqual(base.colors);
    }
    expect(base).toEqual(original);
    expect(applyExpression(base,'neutral')).toEqual(base);
    expect(applyExpression(base,'neutral')).not.toBe(base);
  });

  it('composes identity-preserving expression transform deltas on top of manual facial adjustments',()=>{
    const base=structuredClone(DEFAULT_CHARACTER);
    base.transforms.brows={x:.01,y:.02,scaleX:1.2,scaleY:.9,rotation:.1,spacing:.03};
    base.transforms.eyes={x:0,y:.04,scaleX:1.1,scaleY:1.2,rotation:-.02,spacing:.05};
    const angry=applyExpression(base,'angry');
    expect(angry.transforms.brows.x).toBeCloseTo(.01);
    expect(angry.transforms.brows.y).toBeCloseTo(0);
    expect(angry.transforms.brows.scaleX).toBeCloseTo(1.2);
    expect(angry.transforms.brows.scaleY).toBeCloseTo(.9);
    expect(angry.transforms.brows.rotation).toBeCloseTo(.195);
    expect(angry.transforms.brows.spacing).toBeCloseTo(.03);
    expect(angry.transforms.eyes.y).toBeCloseTo(.038);
    expect(angry.transforms.eyes.scaleY).toBeCloseTo(1.08);
  });

  it('compiles every expression for Factory-generated characters to finite polygon buffers',()=>{
    const candidates=generateFactoryBatch({seed:'expression-factory-regression',style:'futuristic',count:6,poolSize:64,qualityFloor:72});
    expect(candidates).toHaveLength(6);
    for(const candidate of candidates)for(const id of EXPRESSION_ORDER){
      const mesh=compileCharacter(applyExpression(candidate.definition,id));
      expect(mesh.layers.length).toBeGreaterThan(0);
      expect([mesh.bounds.minX,mesh.bounds.minY,mesh.bounds.maxX,mesh.bounds.maxY].every(Number.isFinite)).toBe(true);
      for(const layer of mesh.layers){expect(Array.from(layer.positions).every(Number.isFinite)).toBe(true);expect(Array.from(layer.colors).every(Number.isFinite)).toBe(true);}
    }
  });

  it('exports the neutral character mesh plus a reusable expression set and active expression',()=>{
    const base=structuredClone(DEFAULT_CHARACTER);
    const bundle=exportCharacterBundle(base,{activeExpression:'happy',expressionSet:DEFAULT_EXPRESSION_SET});
    expect(bundle.definition).toEqual(base);
    expect(bundle.expressions?.active).toBe('happy');
    expect(bundle.expressions?.set.defaultExpression).toBe('neutral');
    expect(Object.keys(bundle.expressions?.set.expressions??{})).toHaveLength(8);
    expect(bundle.mesh.layers.length).toBeGreaterThan(0);
  });
});