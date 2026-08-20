import type { CharacterDefinition, ClothingLayerState } from './types';

export const DEFAULT_CLOTHING_LAYERS: ClothingLayerState = {
  outer: 'outfit',
  hood: true,
  strap: true,
  accent: true,
};

export function normalizeClothingLayers(value: CharacterDefinition['clothingLayers']): ClothingLayerState {
  if (!value) return structuredClone(DEFAULT_CLOTHING_LAYERS);
  return {
    outer: value.outer === 'shirt-only' ? 'shirt-only' : 'outfit',
    hood: value.hood !== false,
    strap: value.strap !== false,
    accent: value.accent !== false,
  };
}
