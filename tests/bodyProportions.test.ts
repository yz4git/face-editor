import { describe,expect,it } from 'vitest';
import { BODY_NECK_PIVOT_Y,createBodyProportionMapper,normalizeBodyProportions } from '../src/core/bodyProportions';
import { compileCharacter,exportCharacterBundle } from '../src/core/compileCharacter';
import { DEFAULT_CHARACTER,normalizeCharacter } from '../src/data/parts';

const clone=()=>structuredClone(DEFAULT_CHARACTER);
const BODY_LAYERS=new Set(['skin-base','shirt','jacket-underlay','jacket','hood','strap','strap-metal','accent']);

describe('Body Proportion v1',()=>{
  it('keeps the neck pivot fixed while scaling points below it',()=>{
    const map=createBodyProportionMapper({height:1.25,build:1.25,shoulders:1.35});
    expect(map([.22,BODY_NECK_PIVOT_Y])).toEqual([.22,BODY_NECK_PIVOT_Y]);
    const lower=map([.5,-1.4]);
    expect(lower[0]).toBeGreaterThan(.5);
    expect(lower[1]).toBeLessThan(-1.4);
  });

  it('clamps malformed or extreme saved values safely',()=>{
    expect(normalizeBodyProportions({height:99,build:-4,shoulders:Number.NaN})).toEqual({height:1.25,build:.8,shoulders:1});
  });

  it('changes body and outfit geometry without changing any head or face layer',()=>{
    const base=clone(),modified=clone();
    modified.bodyProportions={height:1.22,build:1.18,shoulders:1.28};
    const a=compileCharacter(base),b=compileCharacter(modified);
    let changedBodyLayers=0;
    for(const layerA of a.layers){
      const layerB=b.layers.find(layer=>layer.id===layerA.id);expect(layerB).toBeTruthy();
      if(BODY_LAYERS.has(layerA.id)){
        if(Array.from(layerA.positions).some((value,index)=>value!==layerB!.positions[index]))changedBodyLayers++;
      }else{
        expect(Array.from(layerB!.positions)).toEqual(Array.from(layerA.positions));
      }
    }
    expect(changedBodyLayers).toBeGreaterThan(2);
    expect(b.layers.every(layer=>Array.from(layer.positions).every(Number.isFinite))).toBe(true);
  });

  it('upgrades old character data to default 100% body proportions',()=>{
    const old=clone();delete old.bodyProportions;
    expect(normalizeCharacter(old).bodyProportions).toEqual({height:1,build:1,shoulders:1});
  });

  it('preserves body proportions in exported character data and mesh',()=>{
    const character=clone();character.bodyProportions={height:.86,build:1.12,shoulders:.91};
    const bundle=exportCharacterBundle(character);
    expect(bundle.definition.bodyProportions).toEqual(character.bodyProportions);
    expect(bundle.mesh.layers.every(layer=>layer.positions.every(Number.isFinite))).toBe(true);
  });
});