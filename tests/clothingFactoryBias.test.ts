import { describe,expect,it } from 'vitest';
import { FACTORY_STYLES } from '../src/core/characterFactory';
import { applyClothingFactoryBias,clothingFactoryBiasFor } from '../src/core/clothingFactoryBias';

describe('Clothing Variation Pack v1 Factory bias',()=>{
  it('boosts image-derived clothing according to each Factory style',()=>{
    applyClothingFactoryBias();
    for(const recipe of FACTORY_STYLES){const bias=clothingFactoryBiasFor(recipe.id);for(const id of bias.outfit)expect(recipe.outfit[id],`${recipe.id}:outfit:${id}`).toBeGreaterThan(1);for(const id of bias.hood)expect(recipe.hood[id],`${recipe.id}:hood:${id}`).toBeGreaterThan(1);for(const id of bias.shirt)expect(recipe.shirt[id],`${recipe.id}:shirt:${id}`).toBeGreaterThan(1);for(const id of bias.strap)expect(recipe.strap[id],`${recipe.id}:strap:${id}`).toBeGreaterThan(1);for(const id of bias.accent)expect(recipe.accent[id],`${recipe.id}:accent:${id}`).toBeGreaterThan(1);}
  });
});
