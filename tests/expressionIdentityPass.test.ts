import { describe,expect,it } from 'vitest';
import { applyExpression,EXPRESSION_ORDER } from '../src/core/expressionSystem';
import { DEFAULT_CHARACTER } from '../src/data/parts';

describe('Eye/Brow Expression Identity Pass',()=>{
  it('preserves authored eye and brow styles for non-blink expressions',()=>{
    const base=structuredClone(DEFAULT_CHARACTER);base.eyeStyle='side-glance';base.browStyle='bold';
    for(const id of EXPRESSION_ORDER.filter(id=>id!=='neutral'&&id!=='blink')){
      const expressed=applyExpression(base,id);
      expect(expressed.eyeStyle,id).toBe('side-glance');
      expect(expressed.browStyle,id).toBe('bold');
    }
  });

  it('uses closed eyes only for the explicit blink frame',()=>{
    const base=structuredClone(DEFAULT_CHARACTER);base.eyeStyle='sharp';base.browStyle='thin';
    expect(applyExpression(base,'blink').eyeStyle).toBe('closed');
    expect(applyExpression(base,'blink').browStyle).toBe('thin');
    expect(applyExpression(base,'happy').eyeStyle).toBe('sharp');
  });

  it('still deforms eye and brow transforms to communicate emotion',()=>{
    const base=structuredClone(DEFAULT_CHARACTER);base.transforms.eyes.scaleY=1.1;base.transforms.brows.rotation=.02;
    const angry=applyExpression(base,'angry'),surprised=applyExpression(base,'surprised');
    expect(angry.transforms.eyes.scaleY).toBeLessThan(base.transforms.eyes.scaleY);
    expect(angry.transforms.brows.rotation).toBeGreaterThan(base.transforms.brows.rotation);
    expect(surprised.transforms.eyes.scaleY).toBeGreaterThan(base.transforms.eyes.scaleY);
    expect(surprised.transforms.brows.y).toBeGreaterThan(base.transforms.brows.y);
  });
});
