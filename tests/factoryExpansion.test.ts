import { describe,expect,it } from 'vitest';
import { createFactoryCandidate } from '../src/core/characterFactory';
import { expandFactoryCandidate } from '../src/core/factoryExpansion';
import { normalizeAccessories,normalizeClothingLayers,normalizeHairModular } from '../src/core/characterExpansion';

describe('Factory expansion integration',()=>{
  it('deterministically adds expansion state to quality-gated candidates',()=>{
    const base=createFactoryCandidate('expansion-factory-seed','futuristic');expect(base).toBeTruthy();
    const a=expandFactoryCandidate(base!),b=expandFactoryCandidate(base!);
    expect(a.definition).toEqual(b.definition);expect(a.signature).toBe(b.signature);
    expect(a.definition.colors.shirt).toMatch(/^#[0-9a-f]{6}$/i);expect(a.definition.colors.trim).toMatch(/^#[0-9a-f]{6}$/i);
    expect(normalizeHairModular(a.definition)).toBeTruthy();expect(normalizeAccessories(a.definition)).toBeTruthy();
  });

  it('keeps accessory density bounded so Factory characters do not become overdecorated',()=>{
    for(let i=0;i<40;i++){
      const base=createFactoryCandidate(`accessory-density-${i}`,'street');if(!base)continue;
      const accessories=normalizeAccessories(expandFactoryCandidate(base).definition),active=Object.values(accessories).filter(id=>id!=='none').length;
      expect(active).toBeLessThanOrEqual(2);
    }
  });

  it('preserves expanded outfit/hair/color state when those variation locks are active',()=>{
    const anchorBase=createFactoryCandidate('expansion-anchor','elegant');const variantBase=createFactoryCandidate('expansion-variant','elegant');expect(anchorBase&&variantBase).toBeTruthy();
    const anchor=expandFactoryCandidate(anchorBase!).definition;
    const variant=expandFactoryCandidate(variantBase!,anchor,['outfit','hair','colors']).definition;
    expect(normalizeClothingLayers(variant.clothingLayers)).toEqual(normalizeClothingLayers(anchor.clothingLayers));
    expect(normalizeHairModular(variant)).toEqual(normalizeHairModular(anchor));
    expect(normalizeAccessories(variant)).toEqual(normalizeAccessories(anchor));
    expect(variant.colors.shirt).toBe(anchor.colors.shirt);expect(variant.colors.trim).toBe(anchor.colors.trim);
  });
});
