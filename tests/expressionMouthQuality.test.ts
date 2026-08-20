import { describe,expect,it } from 'vitest';
import { applyExpression,expressionMouthStyle } from '../src/core/expressionSystem';
import { DEFAULT_CHARACTER } from '../src/data/parts';

describe('Expression / Mouth Quality Pass',()=>{
  it('keeps authored smile-family mouth identity for positive expressions',()=>{
    expect(expressionMouthStyle('smirk','smile','smile')).toBe('smirk');
    expect(expressionMouthStyle('soft-smile','happy','smile-open')).toBe('soft-smile');
  });

  it('keeps an authored open mouth for surprise instead of replacing every character',()=>{
    expect(expressionMouthStyle('o','surprised','surprised')).toBe('o');
    expect(expressionMouthStyle('wide-open','surprised','surprised')).toBe('wide-open');
    expect(expressionMouthStyle('neutral','surprised','surprised')).toBe('o');
  });

  it('caps surprise-mouth expansion for petite/round characters',()=>{
    const base=structuredClone(DEFAULT_CHARACTER);base.faceShape='round';base.bodyProportions={height:.82,build:.86,shoulders:.86};base.mouthStyle='neutral';
    const surprised=applyExpression(base,'surprised');
    expect(surprised.mouthStyle).toBe('o');
    expect(surprised.transforms.mouth.scaleX).toBeLessThanOrEqual(base.transforms.mouth.scaleX*1.02+1e-8);
    expect(surprised.transforms.mouth.scaleY).toBeLessThanOrEqual(base.transforms.mouth.scaleY*1.02+1e-8);
  });

  it('preserves distinctive resting mouths for serious and angry expressions when compatible',()=>{
    const base=structuredClone(DEFAULT_CHARACTER);base.mouthStyle='smirk';
    expect(applyExpression(base,'serious').mouthStyle).toBe('smirk');
    expect(applyExpression(base,'angry').mouthStyle).toBe('smirk');
  });
});
