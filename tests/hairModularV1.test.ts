import { describe,expect,it } from 'vitest';
import { compileCharacter,exportCharacterBundle } from '../src/core/compileCharacter';
import { parseCharacterBundle } from '../src/core/characterBundle';
import { normalizeHairModular,setHairModular,type ExpandedCharacterDefinition } from '../src/core/characterExpansion';
import { DEFAULT_CHARACTER } from '../src/data/parts';

const positions=(character:typeof DEFAULT_CHARACTER)=>Array.from(compileCharacter(character).layers.find(layer=>layer.id==='hair-back')?.positions??[]);

describe('Hair Modular v1',()=>{
  it('preserves the legacy hair appearance when modular state is absent/auto',()=>{
    const legacy=structuredClone(DEFAULT_CHARACTER);delete (legacy as ExpandedCharacterDefinition).hairModular;
    expect(normalizeHairModular(legacy)).toEqual({back:'auto',extra:'none'});
  });

  it('combines an existing front preset with independent back and extra geometry',()=>{
    const base=structuredClone(DEFAULT_CHARACTER),modular=structuredClone(DEFAULT_CHARACTER);base.hairStyle=modular.hairStyle='bob';
    setHairModular(modular,{back:'long',extra:'ponytail'});
    expect(positions(modular).length).toBeGreaterThan(positions(base).length);
    expect(modular.hairStyle).toBe('bob');
  });

  it('produces distinct silhouettes across non-conflicting back and extra choices',()=>{
    const signatures=new Set<string>();
    for(const back of ['short','medium','long','wavy'] as const)for(const extra of ['none','ponytail','twin-tail','bun','braid'] as const){
      const character=structuredClone(DEFAULT_CHARACTER);character.hairStyle='bob';setHairModular(character,{back,extra});
      const mesh=compileCharacter(character),layer=mesh.layers.find(item=>item.id==='hair-back');expect(layer).toBeTruthy();
      expect(Array.from(layer!.positions).every(Number.isFinite)).toBe(true);
      signatures.add(Array.from(layer!.positions).map(value=>value.toFixed(3)).join(','));
    }
    expect(signatures.size).toBe(20);
  });

  it('round-trips modular hair state without changing legacy hairStyle',()=>{
    const character=structuredClone(DEFAULT_CHARACTER);character.hairStyle='half-up';setHairModular(character,{back:'wavy',extra:'bun'});
    const parsed=parseCharacterBundle(exportCharacterBundle(character));
    expect(parsed.definition.hairStyle).toBe('half-up');
    expect(normalizeHairModular(parsed.definition)).toEqual({back:'wavy',extra:'bun'});
  });
});