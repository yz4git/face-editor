import { describe,expect,it } from 'vitest';
import { compileCharacter,exportCharacterBundle } from '../src/core/compileCharacter';
import { parseCharacterBundle } from '../src/core/characterBundle';
import { DEFAULT_SHIRT_COLOR,DEFAULT_TRIM_COLOR } from '../src/core/characterExpansion';
import { DEFAULT_CHARACTER,normalizeCharacter } from '../src/data/parts';

const layerColors=(compiled:ReturnType<typeof compileCharacter>,id:string)=>Array.from(compiled.layers.find(layer=>layer.id===id)?.colors??[]);

describe('Clothing Color System v2',()=>{
  it('normalizes legacy definitions to stable inner and trim defaults',()=>{
    const legacy=structuredClone(DEFAULT_CHARACTER);delete legacy.colors.shirt;delete legacy.colors.trim;
    const normalized=normalizeCharacter(legacy);
    expect(normalized.colors.shirt).toBe(DEFAULT_SHIRT_COLOR);expect(normalized.colors.trim).toBe(DEFAULT_TRIM_COLOR);
  });

  it('changes inner color without recoloring the jacket',()=>{
    const a=structuredClone(DEFAULT_CHARACTER),b=structuredClone(DEFAULT_CHARACTER);a.outfitStyle=b.outfitStyle='blazer';a.shirtStyle=b.shirtStyle='dress-shirt';a.colors.shirt='#16212b';b.colors.shirt='#f4eee5';
    const ca=compileCharacter(a),cb=compileCharacter(b);
    expect(layerColors(ca,'shirt')).not.toEqual(layerColors(cb,'shirt'));
    expect(layerColors(ca,'jacket')).toEqual(layerColors(cb,'jacket'));
  });

  it('changes trim color on collar/hood independently',()=>{
    const a=structuredClone(DEFAULT_CHARACTER),b=structuredClone(DEFAULT_CHARACTER);a.hoodStyle=b.hoodStyle='split-lapel';a.colors.trim='#f3eee4';b.colors.trim='#163f5c';
    const ca=compileCharacter(a),cb=compileCharacter(b);
    expect(layerColors(ca,'hood')).not.toEqual(layerColors(cb,'hood'));
    expect(layerColors(ca,'shirt')).toEqual(layerColors(cb,'shirt'));
  });

  it('round-trips shirt, trim and accent color values',()=>{
    const character=structuredClone(DEFAULT_CHARACTER);character.colors.shirt='#dfe8ef';character.colors.trim='#433d39';character.colors.accent='#56c4d8';
    const parsed=parseCharacterBundle(exportCharacterBundle(character));
    expect(parsed.definition.colors.shirt).toBe('#dfe8ef');expect(parsed.definition.colors.trim).toBe('#433d39');expect(parsed.definition.colors.accent).toBe('#56c4d8');
  });
});
