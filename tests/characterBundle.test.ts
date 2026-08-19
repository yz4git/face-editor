import { describe, expect, it } from 'vitest';
import { parseCharacterBundle, serializeCharacterBundle } from '../src/core/characterBundle';
import { exportCharacterBundle } from '../src/core/compileCharacter';
import { DEFAULT_EXPRESSION_SET } from '../src/core/expressionSystem';
import { DEFAULT_CHARACTER } from '../src/data/parts';

describe('CharacterBundle persistence',()=>{
  it('round-trips definition, compiled triangle mesh and bundled expressions',()=>{
    const definition=structuredClone(DEFAULT_CHARACTER);
    definition.bodyProportions={height:1.12,build:.91,shoulders:1.18};
    const original=exportCharacterBundle(definition,{activeExpression:'surprised',expressionSet:DEFAULT_EXPRESSION_SET});
    const restored=parseCharacterBundle(JSON.parse(serializeCharacterBundle(original)));
    expect(restored.definition).toEqual(original.definition);
    expect(restored.mesh).toEqual(original.mesh);
    expect(restored.expressions?.active).toBe('surprised');
    expect(Object.keys(restored.expressions?.set.expressions??{})).toHaveLength(8);
  });

  it('adds the default bundled expression set when importing a legacy definition-only JSON',()=>{
    const restored=parseCharacterBundle(JSON.parse(JSON.stringify(DEFAULT_CHARACTER)));
    expect(restored.format).toBe('face-editor-polygon-character');
    expect(restored.mesh.layers.length).toBeGreaterThan(0);
    expect(restored.expressions?.active).toBe('neutral');
    expect(Object.keys(restored.expressions?.set.expressions??{})).toHaveLength(8);
  });

  it('rejects malformed bundles before they reach the renderer',()=>{
    const bundle=exportCharacterBundle(DEFAULT_CHARACTER,{expressionSet:DEFAULT_EXPRESSION_SET});
    const malformed=structuredClone(bundle) as unknown as Record<string,unknown>;
    const colors=(malformed.definition as Record<string,unknown>).colors as Record<string,unknown>;
    colors.skin='not-a-color';
    expect(()=>parseCharacterBundle(malformed)).toThrow(/colors\.skin/);
  });

  it('rejects non-finite polygon buffers',()=>{
    const bundle=exportCharacterBundle(DEFAULT_CHARACTER,{expressionSet:DEFAULT_EXPRESSION_SET});
    const malformed=structuredClone(bundle);
    malformed.mesh.layers[0].positions[0]=Number.NaN;
    expect(()=>parseCharacterBundle(malformed)).toThrow(/contains invalid buffer values/);
  });
});
