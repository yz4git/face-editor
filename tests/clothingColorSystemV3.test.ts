import { describe,expect,it } from 'vitest';
import { compileCharacter } from '../src/core/compileCharacter';
import { DEFAULT_HARDWARE_COLOR,DEFAULT_SECONDARY_COLOR,hardwareColor,secondaryColor } from '../src/core/characterExpansion';
import { DEFAULT_CHARACTER } from '../src/data/parts';

const layerColors=(character:ReturnType<typeof compileCharacter>,id:string)=>Array.from(character.layers.find(layer=>layer.id===id)?.colors??[]);

describe('Clothing Color System v3',()=>{
  it('keeps legacy characters on the previous strap and metal colors',()=>{
    const legacy=structuredClone(DEFAULT_CHARACTER);delete legacy.colors.secondary;delete legacy.colors.hardware;
    expect(secondaryColor(legacy)).toBe(DEFAULT_SECONDARY_COLOR);
    expect(hardwareColor(legacy)).toBe(DEFAULT_HARDWARE_COLOR);
  });

  it('changes secondary color without changing hardware color',()=>{
    const base=structuredClone(DEFAULT_CHARACTER);base.strapStyle='double-pouch';
    const before=compileCharacter(base),edited=structuredClone(base);edited.colors.secondary='#1f2933';
    const after=compileCharacter(edited);
    expect(layerColors(after,'strap')).not.toEqual(layerColors(before,'strap'));
    expect(layerColors(after,'strap-metal')).toEqual(layerColors(before,'strap-metal'));
  });

  it('changes hardware color independently',()=>{
    const base=structuredClone(DEFAULT_CHARACTER);base.strapStyle='double-pouch';
    const before=compileCharacter(base),edited=structuredClone(base);edited.colors.hardware='#d9b65a';
    const after=compileCharacter(edited);
    expect(layerColors(after,'strap-metal')).not.toEqual(layerColors(before,'strap-metal'));
    expect(layerColors(after,'strap')).toEqual(layerColors(before,'strap'));
  });
});
