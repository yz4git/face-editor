import { describe, expect, it } from 'vitest';
import { ACCENT_PARTS, allPartDefinitions, BROW_PARTS, EYE_PARTS, FACE_PARTS, HAIR_PARTS, HOOD_PARTS, MOUTH_PARTS, NOSE_PARTS, OUTFIT_PARTS, SHIRT_PARTS, STRAP_PARTS } from '../src/data/partLibrary';
import { compileCharacter } from '../src/core/compileCharacter';
import { DEFAULT_CHARACTER } from '../src/data/parts';

const PACK_IDS={
  outfit:['blazer','bomber','long-coat','tactical-jacket','cropped-jacket','tech-parka'],
  hood:['open-collar','stand-collar','fur-collar','double-collar','high-wrap','split-lapel'],
  shirt:['dress-shirt','henley','sweater','hoodie-inner','vest-inner','utility-top'],
  strap:['chest-rig','shoulder-brace','belt-pack','asymmetric-strap','tech-harness','layered-pouch'],
  accent:['panel-line','arm-band','badge','zip-line','belt-buckle','tech-emblem'],
} as const;

describe('declarative part library',()=>{
  it('stores every generated selectable part as finite triangles',()=>{
    const parts=[...Object.values(OUTFIT_PARTS),...Object.values(HOOD_PARTS),...Object.values(SHIRT_PARTS),...Object.values(STRAP_PARTS),...Object.values(ACCENT_PARTS),...Object.values(HAIR_PARTS),...Object.values(FACE_PARTS),...Object.values(EYE_PARTS),...Object.values(BROW_PARTS),...Object.values(NOSE_PARTS),...Object.values(MOUTH_PARTS)];
    expect(parts).toHaveLength(122);
    for(const part of parts){
      expect(part.triangles.length).toBeGreaterThan(0);
      expect(part.tags).toContain('generated-source-sheet');
      for(const tri of part.triangles){expect(tri.points).toHaveLength(3);expect(tri.points.flat().every(Number.isFinite)).toBe(true);}
    }
    expect(allPartDefinitions().length).toBeGreaterThan(parts.length);
  });

  it('exposes legacy rows plus the 30-part image-derived clothing pack',()=>{
    expect(Object.keys(OUTFIT_PARTS)).toHaveLength(12);
    expect(Object.keys(HOOD_PARTS)).toHaveLength(12);
    expect(Object.keys(SHIRT_PARTS)).toHaveLength(12);
    expect(Object.keys(STRAP_PARTS)).toHaveLength(12);
    expect(Object.keys(ACCENT_PARTS)).toHaveLength(14);
    expect(Object.values(STRAP_PARTS).some(part=>part.triangles.some(t=>t.layer==='strap-metal'&&t.colorRole==='metal'))).toBe(true);
    for(const family of [HOOD_PARTS,SHIRT_PARTS,STRAP_PARTS,ACCENT_PARTS])for(const part of Object.values(family))expect(part.tags).toContain('outfit-component');
    for(const id of PACK_IDS.outfit)expect(OUTFIT_PARTS[id].tags).toContain('image-derived');
    for(const id of PACK_IDS.hood)expect(HOOD_PARTS[id].tags).toContain('clothing-pack-v1');
    for(const id of PACK_IDS.shirt)expect(SHIRT_PARTS[id].tags).toContain('clothing-pack-v1');
    for(const id of PACK_IDS.strap)expect(STRAP_PARTS[id].tags).toContain('clothing-pack-v1');
    for(const id of PACK_IDS.accent)expect(ACCENT_PARTS[id].tags).toContain('clothing-pack-v1');
  });

  it('applies Mii-style eye spacing and scaling to game mesh data',()=>{
    const a=structuredClone(DEFAULT_CHARACTER),b=structuredClone(DEFAULT_CHARACTER);
    b.transforms.eyes.spacing=.12;b.transforms.eyes.scaleX=1.35;b.transforms.eyes.scaleY=.8;
    const eyePositions=(c:typeof a)=>Array.from(compileCharacter(c).layers.find(l=>l.id==='eye-white')!.positions);
    expect(eyePositions(a)).not.toEqual(eyePositions(b));
  });

  it('changes jacket and modular outfit components independently',()=>{
    const base=structuredClone(DEFAULT_CHARACTER),jacket=structuredClone(DEFAULT_CHARACTER),hood=structuredClone(DEFAULT_CHARACTER),shirt=structuredClone(DEFAULT_CHARACTER),strap=structuredClone(DEFAULT_CHARACTER),accent=structuredClone(DEFAULT_CHARACTER);
    jacket.outfitStyle='long-coat';hood.hoodStyle='high-wrap';shirt.shirtStyle='dress-shirt';strap.strapStyle='tech-harness';accent.accentStyle='tech-emblem';
    const signature=(c:typeof base)=>compileCharacter(c).layers.map(l=>`${l.id}:${l.indices.length}:${Array.from(l.positions.slice(0,12)).join(',')}`).join('|');
    expect(signature(jacket)).not.toBe(signature(base));
    expect(signature(hood)).not.toBe(signature(base));
    expect(signature(shirt)).not.toBe(signature(base));
    expect(signature(strap)).not.toBe(signature(base));
    expect(signature(accent)).not.toBe(signature(base));
  });
});
