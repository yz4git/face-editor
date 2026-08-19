import type { CharacterMotionState, CompiledPolygonCharacter, MotionActionId, PoseId, Vec2 } from './types';

export const POSE_ORDER:readonly PoseId[]=['idle','relax','confident','cute','cool','fight','run','jump'];
export const ACTION_ORDER:readonly Exclude<MotionActionId,'none'>[]=['breathe','blink','talk','wave','walk','run'];

export interface MotionPosePreset{
  id:PoseId;
  label:string;
  description:string;
  bodyX:number;
  bodyY:number;
  torsoLean:number;
  headTilt:number;
  headX:number;
  headY:number;
  leftArm:number;
  rightArm:number;
  stance:number;
}

export const DEFAULT_MOTION_STATE:CharacterMotionState={version:1,pose:'idle',action:'breathe',playing:false,autoBlink:true};

export const POSE_PRESETS:Record<PoseId,MotionPosePreset>={
  idle:{id:'idle',label:'IDLE',description:'Balanced neutral stance',bodyX:0,bodyY:0,torsoLean:0,headTilt:0,headX:0,headY:0,leftArm:0,rightArm:0,stance:0},
  relax:{id:'relax',label:'RELAX',description:'Soft weight shift and loose shoulders',bodyX:-.025,bodyY:-.01,torsoLean:.025,headTilt:-.045,headX:.012,headY:0,leftArm:.08,rightArm:-.04,stance:.035},
  confident:{id:'confident',label:'CONFIDENT',description:'Open chest and steady head',bodyX:.01,bodyY:.018,torsoLean:-.018,headTilt:.018,headX:0,headY:.012,leftArm:-.12,rightArm:.12,stance:.06},
  cute:{id:'cute',label:'CUTE',description:'Compact friendly tilt',bodyX:.025,bodyY:-.005,torsoLean:.04,headTilt:-.085,headX:.018,headY:.012,leftArm:.18,rightArm:-.18,stance:-.03},
  cool:{id:'cool',label:'COOL',description:'Asymmetric relaxed lean',bodyX:-.03,bodyY:0,torsoLean:-.05,headTilt:.06,headX:-.01,headY:.006,leftArm:-.08,rightArm:.14,stance:.08},
  fight:{id:'fight',label:'FIGHT',description:'Forward combat-ready silhouette',bodyX:.015,bodyY:-.025,torsoLean:-.09,headTilt:.025,headX:.012,headY:-.005,leftArm:-.34,rightArm:.28,stance:.18},
  run:{id:'run',label:'RUN',description:'Strong forward running pose',bodyX:.04,bodyY:.015,torsoLean:-.16,headTilt:.035,headX:.018,headY:.01,leftArm:-.48,rightArm:.44,stance:.25},
  jump:{id:'jump',label:'JUMP',description:'Lifted airborne pose',bodyX:0,bodyY:.12,torsoLean:.03,headTilt:-.025,headX:0,headY:.018,leftArm:.32,rightArm:-.32,stance:.16},
};

const BODY_LAYER_IDS=new Set(['skin-base','shirt','jacket-underlay','jacket','hood','strap','strap-metal','accent']);
const HAIR_LAYER_IDS=new Set(['hair-back','hair-front','hair-accent']);
const EYE_LAYER_IDS=new Set(['eye-outline','eye-white','iris','pupil','eye-glint']);
const MOUTH_LAYER_IDS=new Set(['mouth-outline','mouth','mouth-detail']);
const NECK:Vec2=[0,.18];
const EYE_Y=.62;
const MOUTH_Y=.21;
const clamp01=(value:number)=>Math.max(0,Math.min(1,value));
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const smooth=(edge0:number,edge1:number,value:number)=>{const t=clamp01((value-edge0)/(edge1-edge0||1));return t*t*(3-2*t);};
const finite=(value:unknown,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;

export function normalizeMotionState(input?:Partial<CharacterMotionState>|null):CharacterMotionState{
  const pose=POSE_ORDER.includes(input?.pose as PoseId)?input!.pose as PoseId:DEFAULT_MOTION_STATE.pose;
  const actions:readonly MotionActionId[]=['none',...ACTION_ORDER];
  const action=actions.includes(input?.action as MotionActionId)?input!.action as MotionActionId:DEFAULT_MOTION_STATE.action;
  return{
    version:1,
    pose,
    action,
    playing:typeof input?.playing==='boolean'?input.playing:DEFAULT_MOTION_STATE.playing,
    autoBlink:typeof input?.autoBlink==='boolean'?input.autoBlink:DEFAULT_MOTION_STATE.autoBlink,
  };
}

export const cloneMotionState=(state:CharacterMotionState)=>structuredClone(normalizeMotionState(state));

function rotate(x:number,y:number,pivotX:number,pivotY:number,angle:number):[number,number]{
  if(Math.abs(angle)<1e-8)return[x,y];
  const dx=x-pivotX,dy=y-pivotY,c=Math.cos(angle),s=Math.sin(angle);
  return[pivotX+dx*c-dy*s,pivotY+dx*s+dy*c];
}

function triangleWave01(value:number){const phase=((value%1)+1)%1;return phase<.5?phase*2:(1-phase)*2;}

function blinkAmount(state:CharacterMotionState,timeSeconds:number){
  if(!state.playing)return 0;
  let amount=0;
  if(state.autoBlink){
    const cycle=((timeSeconds%4.2)+4.2)%4.2;
    if(cycle>3.72&&cycle<3.92)amount=Math.sin((cycle-3.72)/.20*Math.PI);
  }
  if(state.action==='blink'){
    const cycle=((timeSeconds%1.05)+1.05)%1.05;
    if(cycle<.24)amount=Math.max(amount,Math.sin(cycle/.24*Math.PI));
  }
  return clamp01(amount);
}

function actionDynamics(state:CharacterMotionState,timeSeconds:number){
  if(!state.playing)return{bob:0,sway:0,leftArm:0,rightArm:0,breath:0,hairLag:0};
  const slow=Math.sin(timeSeconds*Math.PI*2*.55),walk=Math.sin(timeSeconds*Math.PI*2*1.55),run=Math.sin(timeSeconds*Math.PI*2*2.35);
  let bob=0,sway=0,leftArm=0,rightArm=0,breath=0,hairLag=slow*.008;
  if(state.action==='breathe'||state.action==='none'){breath=slow*.009;sway=slow*.005;}
  if(state.action==='talk'){breath=slow*.004;bob=Math.sin(timeSeconds*Math.PI*2*1.1)*.006;}
  if(state.action==='wave'){rightArm=.20+Math.sin(timeSeconds*Math.PI*2*2.0)*.34;bob=Math.abs(slow)*.007;}
  if(state.action==='walk'){bob=Math.abs(walk)*.022;sway=walk*.014;leftArm=walk*.20;rightArm=-walk*.20;hairLag=walk*.012;}
  if(state.action==='run'){bob=Math.abs(run)*.038;sway=run*.018;leftArm=run*.34;rightArm=-run*.34;hairLag=run*.018;}
  return{bob,sway,leftArm,rightArm,breath,hairLag};
}

function transformBodyPoint(x:number,y:number,preset:MotionPosePreset,dynamics:ReturnType<typeof actionDynamics>):[number,number]{
  const side=x<0?-1:1;
  const shoulderX=.48*side,shoulderY=-.43;
  const armWeight=smooth(.38,.92,Math.abs(x))*smooth(.28,1.28,-y)*(1-smooth(1.72,2.25,-y));
  const armAngle=(side<0?preset.leftArm+dynamics.leftArm:preset.rightArm+dynamics.rightArm)*armWeight;
  let point=rotate(x,y,shoulderX,shoulderY,armAngle);

  const lowerWeight=smooth(.92,2.18,-point[1]);
  point=[point[0]+side*preset.stance*.20*lowerWeight,point[1]-Math.abs(preset.stance)*.025*lowerWeight];

  const breathWeight=1-smooth(.95,2.1,-point[1]);
  point=[point[0]*(1+dynamics.breath*.55*breathWeight),NECK[1]+(point[1]-NECK[1])*(1+dynamics.breath*breathWeight)];
  point=rotate(point[0],point[1],NECK[0],NECK[1],preset.torsoLean);
  return[point[0]+preset.bodyX+dynamics.sway,point[1]+preset.bodyY+dynamics.bob];
}

function transformHeadPoint(layerId:string,x:number,y:number,preset:MotionPosePreset,dynamics:ReturnType<typeof actionDynamics>,blink:number,state:CharacterMotionState,timeSeconds:number):[number,number]{
  if(EYE_LAYER_IDS.has(layerId)&&blink>0)y=EYE_Y+(y-EYE_Y)*(1-blink*.90);
  if(MOUTH_LAYER_IDS.has(layerId)&&state.playing&&state.action==='talk'){
    const open=.5+.5*Math.sin(timeSeconds*Math.PI*2*3.2);
    y=MOUTH_Y+(y-MOUTH_Y)*(1+open*.38);
  }
  const hair=HAIR_LAYER_IDS.has(layerId);
  const extraHairRotation=hair?dynamics.hairLag*.7:0;
  const angle=preset.headTilt+preset.torsoLean*.12+extraHairRotation;
  const rotated=rotate(x,y,NECK[0],NECK[1],angle);
  const hairX=hair?dynamics.hairLag:0;
  return[
    rotated[0]+preset.bodyX+preset.headX+dynamics.sway*.45+hairX,
    rotated[1]+preset.bodyY+preset.headY+dynamics.bob*.72,
  ];
}

function recomputeBounds(character:CompiledPolygonCharacter){
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const layer of character.layers){
    for(let i=0;i<layer.positions.length;i+=3){
      const x=layer.positions[i],y=layer.positions[i+1];
      minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
    }
  }
  character.bounds={minX:finite(minX,-1),minY:finite(minY,-2),maxX:finite(maxX,1),maxY:finite(maxY,2)};
}

export function applyMotionInPlace(character:CompiledPolygonCharacter,input?:Partial<CharacterMotionState>|null,timeMs=0):CompiledPolygonCharacter{
  const state=normalizeMotionState(input),preset=POSE_PRESETS[state.pose],timeSeconds=Math.max(0,finite(timeMs,0))/1000,dynamics=actionDynamics(state,timeSeconds),blink=blinkAmount(state,timeSeconds);
  for(const layer of character.layers){
    const body=BODY_LAYER_IDS.has(layer.id);
    for(let i=0;i<layer.positions.length;i+=3){
      const x=layer.positions[i],y=layer.positions[i+1];
      const point=body?transformBodyPoint(x,y,preset,dynamics):transformHeadPoint(layer.id,x,y,preset,dynamics,blink,state,timeSeconds);
      layer.positions[i]=point[0];layer.positions[i+1]=point[1];
    }
  }
  recomputeBounds(character);
  return character;
}

export function motionPoseLabel(id:PoseId){return POSE_PRESETS[id].label;}
export function motionActionLabel(id:MotionActionId){return id==='none'?'STILL':id.toUpperCase();}

export function motionTransitionSample(from:PoseId,to:PoseId,t:number):MotionPosePreset{
  const a=POSE_PRESETS[from],b=POSE_PRESETS[to],mix=clamp01(t);
  return{
    id:mix<.5?from:to,
    label:mix<.5?a.label:b.label,
    description:`${a.label} → ${b.label}`,
    bodyX:lerp(a.bodyX,b.bodyX,mix),bodyY:lerp(a.bodyY,b.bodyY,mix),torsoLean:lerp(a.torsoLean,b.torsoLean,mix),headTilt:lerp(a.headTilt,b.headTilt,mix),headX:lerp(a.headX,b.headX,mix),headY:lerp(a.headY,b.headY,mix),leftArm:lerp(a.leftArm,b.leftArm,mix),rightArm:lerp(a.rightArm,b.rightArm,mix),stance:lerp(a.stance,b.stance,mix),
  };
}

export function motionCycleProgress(timeMs:number,durationMs=1000){return triangleWave01(Math.max(0,timeMs)/Math.max(1,durationMs));}
