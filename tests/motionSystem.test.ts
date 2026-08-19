import { describe,expect,it } from 'vitest';
import { compileCharacter, exportCharacterBundle } from '../src/core/compileCharacter';
import { parseCharacterBundle } from '../src/core/characterBundle';
import { generateFactoryBatch } from '../src/core/characterFactory';
import { FACTORY_MOTION_TENDENCIES, factoryMotionProfile } from '../src/core/factoryMotion';
import { ACTION_ORDER, applyMotionInPlace, DEFAULT_MOTION_STATE, normalizeMotionState, POSE_ORDER } from '../src/core/motionSystem';
import { DEFAULT_EXPRESSION_SET } from '../src/core/expressionSystem';
import { DEFAULT_CHARACTER } from '../src/data/parts';

const positions=(character:ReturnType<typeof compileCharacter>,id:string)=>Array.from(character.layers.find(layer=>layer.id===id)?.positions??[]);
const distance=(values:number[],a:number,b:number)=>Math.hypot(values[a]-values[b],values[a+1]-values[b+1]);

describe('Character Motion Studio v1',()=>{
  it('exposes eight simple poses and six visible actions',()=>{
    expect(POSE_ORDER).toEqual(['idle','relax','confident','cute','cool','fight','run','jump']);
    expect(ACTION_ORDER).toEqual(['breathe','blink','talk','wave','walk','run']);
    expect(DEFAULT_MOTION_STATE).toEqual({version:1,pose:'idle',action:'breathe',playing:true,autoBlink:true});
  });

  it('poses the body while keeping face geometry rigid',()=>{
    const character=compileCharacter(structuredClone(DEFAULT_CHARACTER)),bodyBefore=positions(character,'jacket'),faceBefore=positions(character,'face');
    applyMotionInPlace(character,{version:1,pose:'fight',action:'none',playing:false,autoBlink:false},0);
    const bodyAfter=positions(character,'jacket'),faceAfter=positions(character,'face');
    expect(bodyAfter).not.toEqual(bodyBefore);
    expect(faceAfter).not.toEqual(faceBefore);
    expect(distance(faceAfter,0,3)).toBeCloseTo(distance(faceBefore,0,3),5);
    expect(character.layers.every(layer=>Array.from(layer.positions).every(Number.isFinite))).toBe(true);
  });

  it('animates blink and talk without changing mesh topology or colors',()=>{
    const blink=compileCharacter(structuredClone(DEFAULT_CHARACTER)),blinkEyeBefore=positions(blink,'eye-white'),blinkColors=blink.layers.map(layer=>Array.from(layer.colors)),blinkIndices=blink.layers.map(layer=>Array.from(layer.indices));
    applyMotionInPlace(blink,{version:1,pose:'idle',action:'blink',playing:true,autoBlink:false},120);
    expect(positions(blink,'eye-white')).not.toEqual(blinkEyeBefore);
    expect(blink.layers.map(layer=>Array.from(layer.colors))).toEqual(blinkColors);
    expect(blink.layers.map(layer=>Array.from(layer.indices))).toEqual(blinkIndices);

    const talk=compileCharacter(structuredClone(DEFAULT_CHARACTER)),mouthBefore=positions(talk,'mouth');
    applyMotionInPlace(talk,{version:1,pose:'relax',action:'talk',playing:true,autoBlink:false},180);
    expect(positions(talk,'mouth')).not.toEqual(mouthBefore);
  });

  it('normalizes malformed motion state to safe defaults',()=>{
    expect(normalizeMotionState({pose:'fight',action:'wave',playing:false,autoBlink:false})).toEqual({version:1,pose:'fight',action:'wave',playing:false,autoBlink:false});
    expect(normalizeMotionState({pose:'bad' as never,action:'bad' as never})).toEqual(DEFAULT_MOTION_STATE);
  });

  it('gives every Factory style a deterministic characterity profile',()=>{
    for(const style of Object.keys(FACTORY_MOTION_TENDENCIES) as (keyof typeof FACTORY_MOTION_TENDENCIES)[]){
      const a=factoryMotionProfile(style,'motion-seed'),b=factoryMotionProfile(style,'motion-seed'),tendency=FACTORY_MOTION_TENDENCIES[style];
      expect(a).toEqual(b);expect(tendency.poses).toContain(a.pose);expect(tendency.expressions).toContain(a.expression);expect(tendency.actions).toContain(a.action);
    }
  });

  it('compiles Factory characters through every pose to finite polygon buffers',()=>{
    const batch=generateFactoryBatch({seed:'motion-factory-compile',style:'energetic',count:4,poolSize:48,qualityFloor:68});
    for(const candidate of batch)for(const pose of POSE_ORDER){const character=compileCharacter(candidate.definition);applyMotionInPlace(character,{version:1,pose,action:'none',playing:false,autoBlink:false},0);expect(character.layers.every(layer=>Array.from(layer.positions).every(Number.isFinite))).toBe(true);}
  });

  it('round-trips Motion Studio state through the CharacterBundle JSON parser',()=>{
    const bundle=exportCharacterBundle(structuredClone(DEFAULT_CHARACTER),{activeExpression:'serious',expressionSet:DEFAULT_EXPRESSION_SET});
    bundle.motion={version:1,pose:'cool',action:'walk',playing:false,autoBlink:true};
    const parsed=parseCharacterBundle(JSON.parse(JSON.stringify(bundle)));
    expect(parsed.motion).toEqual(bundle.motion);
    expect(parsed.expressions?.active).toBe('serious');
  });
});
