import { describe,expect,it } from 'vitest';
import { compileCharacter,exportCharacterBundle } from '../src/core/compileCharacter';
import { parseCharacterBundle } from '../src/core/characterBundle';
import { EAR_ACCESSORY_OPTIONS,EYEWEAR_OPTIONS,FACE_DETAIL_OPTIONS,HEADWEAR_OPTIONS,normalizeAccessories,setAccessories,type ExpandedCharacterDefinition } from '../src/core/characterExpansion';
import { DEFAULT_CHARACTER } from '../src/data/parts';

const accessoryLayerIds=new Set(['headwear','eyewear','face-detail','ear-accessory']);

describe('Accessory Pack v1',()=>{
  it('defaults every accessory category to NONE and keeps legacy rendering clean',()=>{
    const legacy=structuredClone(DEFAULT_CHARACTER);delete (legacy as ExpandedCharacterDefinition).accessories;
    expect(normalizeAccessories(legacy)).toEqual({headwear:'none',eyewear:'none',faceDetail:'none',earAccessory:'none'});
    expect(compileCharacter(legacy).layers.some(layer=>accessoryLayerIds.has(layer.id))).toBe(false);
  });

  it('renders all 32 non-none accessory choices as finite independent layers',()=>{
    const families=[
      ['headwear',HEADWEAR_OPTIONS] as const,
      ['eyewear',EYEWEAR_OPTIONS] as const,
      ['faceDetail',FACE_DETAIL_OPTIONS] as const,
      ['earAccessory',EAR_ACCESSORY_OPTIONS] as const,
    ];
    let rendered=0;
    for(const [kind,options] of families)for(const option of options){
      if(option.id==='none')continue;
      const character=structuredClone(DEFAULT_CHARACTER),state=normalizeAccessories(character);state[kind]=option.id as never;setAccessories(character,state);
      const mesh=compileCharacter(character),layers=mesh.layers.filter(layer=>accessoryLayerIds.has(layer.id));
      expect(layers.length,`${kind}:${option.id}`).toBeGreaterThan(0);
      for(const layer of layers){expect(Array.from(layer.positions).every(Number.isFinite)).toBe(true);expect(Array.from(layer.colors).every(Number.isFinite)).toBe(true);}
      rendered++;
    }
    expect(rendered).toBe(32);
  });

  it('supports several accessories simultaneously without mutating core part choices',()=>{
    const character=structuredClone(DEFAULT_CHARACTER),before={hair:character.hairStyle,face:character.faceShape,eyes:character.eyeStyle};
    setAccessories(character,{headwear:'beanie',eyewear:'round-glasses',faceDetail:'freckles',earAccessory:'hoop-earring'});
    const mesh=compileCharacter(character),ids=mesh.layers.map(layer=>layer.id);
    expect(ids).toEqual(expect.arrayContaining(['headwear','eyewear','face-detail','ear-accessory']));
    expect({hair:character.hairStyle,face:character.faceShape,eyes:character.eyeStyle}).toEqual(before);
  });

  it('round-trips accessory state through character bundles',()=>{
    const character=structuredClone(DEFAULT_CHARACTER);setAccessories(character,{headwear:'sci-fi-visor',eyewear:'cyber-visor',faceDetail:'under-eye-line',earAccessory:'cyber-earpiece'});
    const parsed=parseCharacterBundle(exportCharacterBundle(character));
    expect(normalizeAccessories(parsed.definition)).toEqual(normalizeAccessories(character));
  });
});
