import { describe, expect, it } from 'vitest';
import { compileCharacter, exportCharacterBundle } from '../src/core/compileCharacter';
import { DEFAULT_CHARACTER } from '../src/data/parts';

const clone=()=>structuredClone(DEFAULT_CHARACTER);

describe('compileCharacter',()=>{
  it('emits consistent triangle buffers',()=>{
    const compiled=compileCharacter(clone());
    expect(compiled.layers.length).toBeGreaterThan(8);
    for(const layer of compiled.layers){
      expect(layer.positions.length%9).toBe(0);
      expect(layer.colors.length).toBe(layer.positions.length);
      expect(layer.indices.length%3).toBe(0);
      expect(layer.indices.length).toBe(layer.positions.length/3);
      expect(Array.from(layer.positions).every(Number.isFinite)).toBe(true);
      expect(Array.from(layer.colors).every(v=>Number.isFinite(v)&&v>=0&&v<=1)).toBe(true);
    }
  });

  it('changes mesh data when a selectable part changes',()=>{
    const a=clone();
    const b=clone();
    b.hairStyle='twin-tail';
    const meshA=compileCharacter(a);
    const meshB=compileCharacter(b);
    const count=(m:ReturnType<typeof compileCharacter>)=>m.layers.reduce((sum,l)=>sum+l.indices.length,0);
    expect(count(meshB)).not.toBe(count(meshA));
  });

  it('exports a versioned JSON-safe bundle',()=>{
    const bundle=exportCharacterBundle(clone());
    expect(bundle.format).toBe('face-editor-polygon-character');
    expect(bundle.formatVersion).toBe(1);
    expect(()=>JSON.stringify(bundle)).not.toThrow();
    expect(bundle.mesh.layers[0].positions).toBeInstanceOf(Array);
  });
});
