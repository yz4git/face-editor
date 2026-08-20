import { describe,expect,it } from 'vitest';
import { compileCharacter,exportCharacterBundle } from '../src/core/compileCharacter';
import { parseCharacterBundle } from '../src/core/characterBundle';
import { normalizeClothingLayers } from '../src/core/characterExpansion';
import { DEFAULT_CHARACTER,normalizeCharacter } from '../src/data/parts';

describe('Minimal Layer Pack',()=>{
  it('keeps legacy characters fully layered by default',()=>{
    const legacy=structuredClone(DEFAULT_CHARACTER);delete legacy.clothingLayers;
    expect(normalizeClothingLayers(legacy.clothingLayers)).toEqual({outer:'outfit',hood:true,strap:true,accent:true});
    expect(normalizeCharacter(legacy).clothingLayers).toEqual({outer:'outfit',hood:true,strap:true,accent:true});
  });

  it('can render a shirt-only character with collar, harness and accent removed',()=>{
    const character=structuredClone(DEFAULT_CHARACTER);
    character.outfitStyle='blazer';character.shirtStyle='dress-shirt';character.hoodStyle='split-lapel';character.strapStyle='tech-harness';character.accentStyle='tech-emblem';
    character.clothingLayers={outer:'shirt-only',hood:false,strap:false,accent:false};
    const compiled=compileCharacter(character),ids=compiled.layers.map(layer=>layer.id);
    expect(ids).toContain('shirt');
    expect(ids).not.toContain('jacket');expect(ids).not.toContain('jacket-underlay');expect(ids).not.toContain('hood');expect(ids).not.toContain('strap');expect(ids).not.toContain('strap-metal');expect(ids).not.toContain('accent');
    expect(character.outfitStyle).toBe('blazer');expect(character.strapStyle).toBe('tech-harness');
  });

  it('round-trips non-destructive layer visibility through bundles',()=>{
    const character=structuredClone(DEFAULT_CHARACTER);character.clothingLayers={outer:'shirt-only',hood:true,strap:false,accent:false};
    const parsed=parseCharacterBundle(exportCharacterBundle(character));
    expect(parsed.definition.clothingLayers).toEqual(character.clothingLayers);
  });
});
