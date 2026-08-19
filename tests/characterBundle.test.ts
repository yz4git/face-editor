import { describe, expect, it } from 'vitest';
import { cutsceneStateForBundle, parseCharacterBundle, serializeCharacterBundle } from '../src/core/characterBundle';
import { exportCharacterBundle } from '../src/core/compileCharacter';
import { CUTSCENE_TEMPLATES, cloneCutsceneProject } from '../src/core/cutsceneSystem';
import { DEFAULT_EXPRESSION_SET } from '../src/core/expressionSystem';
import { DEFAULT_CHARACTER } from '../src/data/parts';

describe('CharacterBundle persistence',()=>{
  it('round-trips definition, compiled triangle mesh, expressions and cutscene direction',()=>{
    const definition=structuredClone(DEFAULT_CHARACTER);
    definition.bodyProportions={height:1.12,build:.91,shoulders:1.18};
    const original=exportCharacterBundle(definition,{activeExpression:'surprised',expressionSet:DEFAULT_EXPRESSION_SET});
    original.cutscene=cloneCutsceneProject(CUTSCENE_TEMPLATES.battle);
    original.cutscene.title='CUSTOM BATTLE';
    original.cutscene.cues[2].dialogue='Persist this line.';
    const restored=parseCharacterBundle(JSON.parse(serializeCharacterBundle(original)));
    expect(restored.definition).toEqual(original.definition);
    expect(restored.mesh).toEqual(original.mesh);
    expect(restored.expressions?.active).toBe('surprised');
    expect(Object.keys(restored.expressions?.set.expressions??{})).toHaveLength(8);
    expect(restored.cutscene).toEqual(original.cutscene);
  });

  it('adds expression defaults and exposes an intro cutscene fallback for legacy definition-only JSON',()=>{
    const restored=parseCharacterBundle(JSON.parse(JSON.stringify(DEFAULT_CHARACTER)));
    expect(restored.format).toBe('face-editor-polygon-character');
    expect(restored.mesh.layers.length).toBeGreaterThan(0);
    expect(restored.expressions?.active).toBe('neutral');
    expect(Object.keys(restored.expressions?.set.expressions??{})).toHaveLength(8);
    expect(restored.cutscene).toBeUndefined();
    expect(cutsceneStateForBundle(restored).title).toBe('INTRO');
  });

  it('normalizes authored cutscene limits while importing a bundle',()=>{
    const bundle=exportCharacterBundle(DEFAULT_CHARACTER,{expressionSet:DEFAULT_EXPRESSION_SET});
    bundle.cutscene={version:1,title:'X'.repeat(100),durationMs:999999,cues:[{id:'one',timeMs:999999,label:'Y'.repeat(100),camera:{zoom:99,panX:99,panY:-99}}]};
    const restored=parseCharacterBundle(JSON.parse(JSON.stringify(bundle)));
    expect(restored.cutscene?.title.length).toBeLessThanOrEqual(48);
    expect(restored.cutscene?.durationMs).toBe(30000);
    expect(restored.cutscene?.cues[0].timeMs).toBe(30000);
    expect(restored.cutscene?.cues[0].camera).toEqual({zoom:1.8,panX:1,panY:-1});
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
