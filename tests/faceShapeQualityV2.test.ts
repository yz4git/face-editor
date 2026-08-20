import { describe,expect,it } from 'vitest';
import { refineFaceShapePoint } from '../src/core/faceShapeQuality';
import { compileCharacter } from '../src/core/compileCharacter';
import { DEFAULT_CHARACTER,FACE_OPTIONS } from '../src/data/parts';

const faceBounds=(style:string)=>{
  const character=structuredClone(DEFAULT_CHARACTER);character.faceShape=style as typeof character.faceShape;
  const layer=compileCharacter(character).layers.find(item=>item.id==='face');expect(layer).toBeTruthy();
  const xs:number[]=[],ys:number[]=[];for(let i=0;i<(layer?.positions.length??0);i+=3){xs.push(layer!.positions[i]);ys.push(layer!.positions[i+1]);}
  return{width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
};

describe('Face Shape Quality Pass v2',()=>{
  it('makes square jaws wider than pointed jaws at the lower face',()=>{
    const p:[number,number]=[.5,.18];
    expect(Math.abs(refineFaceShapePoint('square',p)[0])).toBeGreaterThan(Math.abs(refineFaceShapePoint('pointed',p)[0]));
  });

  it('makes round faces wider/shorter than long oval faces',()=>{
    const round=faceBounds('round'),long=faceBounds('long-oval');
    expect(round.width).toBeGreaterThan(long.width);expect(round.height).toBeLessThan(long.height);
  });

  it('keeps all ten face shapes finite and visibly separated',()=>{
    const ratios=FACE_OPTIONS.map(({id})=>{const bounds=faceBounds(id);expect(Number.isFinite(bounds.width)&&bounds.width>0).toBe(true);expect(Number.isFinite(bounds.height)&&bounds.height>0).toBe(true);return Math.round(bounds.width/bounds.height*100)/100;});
    expect(new Set(ratios).size).toBeGreaterThanOrEqual(6);
  });
});
