import type { CharacterMotionState, CutsceneCameraState, CutsceneCue, CutsceneProject, CutsceneTemplateId, ExpressionId, MotionActionId, PoseId } from './types';

export const CUTSCENE_LIMITS={durationMs:{min:2000,max:30000},cueCount:{max:48},camera:{zoom:{min:.65,max:1.8},panX:{min:-1,max:1},panY:{min:-1,max:1}},titleMax:48,labelMax:32,dialogueMax:160} as const;
export const DEFAULT_CUTSCENE_CAMERA:CutsceneCameraState={zoom:1,panX:0,panY:0};

const EXPRESSION_IDS:readonly ExpressionId[]=['neutral','smile','happy','angry','sad','surprised','serious','blink'];
const POSE_IDS:readonly PoseId[]=['idle','relax','confident','cute','cool','fight','run','jump'];
const ACTION_IDS:readonly MotionActionId[]=['none','breathe','blink','talk','wave','walk','run'];
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const finite=(value:unknown,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?value:fallback;
const text=(value:unknown,fallback:string,max:number)=>typeof value==='string'?(value.trim().slice(0,max)||fallback):fallback;
const optionalText=(value:unknown,max:number)=>typeof value==='string'?value.slice(0,max):undefined;
const validId=<T extends string>(value:unknown,values:readonly T[]):T|undefined=>typeof value==='string'&&values.includes(value as T)?value as T:undefined;
const cameraEqual=(a:CutsceneCameraState,b:CutsceneCameraState)=>a.zoom===b.zoom&&a.panX===b.panX&&a.panY===b.panY;

export function normalizeCutsceneCamera(input?:Partial<CutsceneCameraState>|null):CutsceneCameraState{
  return{
    zoom:clamp(finite(input?.zoom,1),CUTSCENE_LIMITS.camera.zoom.min,CUTSCENE_LIMITS.camera.zoom.max),
    panX:clamp(finite(input?.panX,0),CUTSCENE_LIMITS.camera.panX.min,CUTSCENE_LIMITS.camera.panX.max),
    panY:clamp(finite(input?.panY,0),CUTSCENE_LIMITS.camera.panY.min,CUTSCENE_LIMITS.camera.panY.max),
  };
}

function normalizeCue(input:Partial<CutsceneCue>|null|undefined,index:number,durationMs:number):CutsceneCue{
  const fallbackId=`cue-${String(index+1).padStart(2,'0')}`;
  const cue:CutsceneCue={
    id:text(input?.id,fallbackId,40).replace(/[^a-zA-Z0-9_-]/g,'-'),
    timeMs:Math.round(clamp(finite(input?.timeMs,index===0?0:index*1000),0,durationMs)),
    label:text(input?.label,index===0?'START':`BEAT ${index+1}`,CUTSCENE_LIMITS.labelMax),
  };
  const expression=validId(input?.expression,EXPRESSION_IDS),pose=validId(input?.pose,POSE_IDS),action=validId(input?.action,ACTION_IDS);
  if(expression)cue.expression=expression;
  if(pose)cue.pose=pose;
  if(action)cue.action=action;
  if(input?.camera)cue.camera=normalizeCutsceneCamera(input.camera);
  if(input&&Object.prototype.hasOwnProperty.call(input,'dialogue'))cue.dialogue=optionalText(input.dialogue,CUTSCENE_LIMITS.dialogueMax)??'';
  return cue;
}

export function normalizeCutsceneProject(input?:Partial<CutsceneProject>|null):CutsceneProject{
  const durationMs=Math.round(clamp(finite(input?.durationMs,8000),CUTSCENE_LIMITS.durationMs.min,CUTSCENE_LIMITS.durationMs.max));
  const source=Array.isArray(input?.cues)?input!.cues.slice(0,CUTSCENE_LIMITS.cueCount.max):[];
  const cues=(source.length?source:[{id:'start',timeMs:0,label:'START',expression:'neutral',pose:'idle',action:'breathe',camera:DEFAULT_CUTSCENE_CAMERA} as CutsceneCue])
    .map((cue,index)=>normalizeCue(cue,index,durationMs))
    .sort((a,b)=>a.timeMs-b.timeMs||a.id.localeCompare(b.id));
  const unique=new Set<string>();
  for(const [index,cue] of cues.entries()){
    const base=cue.id||`cue-${index+1}`;let id=base,suffix=2;while(unique.has(id))id=`${base}-${suffix++}`;cue.id=id;unique.add(id);
  }
  return{version:1,title:text(input?.title,'UNTITLED CUTSCENE',CUTSCENE_LIMITS.titleMax),durationMs,cues};
}

export const cloneCutsceneProject=(project:CutsceneProject)=>structuredClone(normalizeCutsceneProject(project));

const cue=(id:string,timeMs:number,label:string,values:Omit<CutsceneCue,'id'|'timeMs'|'label'>):CutsceneCue=>({id,timeMs,label,...values});

export const CUTSCENE_TEMPLATES:Record<CutsceneTemplateId,CutsceneProject>={
  intro:normalizeCutsceneProject({version:1,title:'INTRO',durationMs:8000,cues:[
    cue('intro-01',0,'ESTABLISH',{expression:'neutral',pose:'idle',action:'breathe',camera:{zoom:.78,panX:0,panY:-.05},dialogue:''}),
    cue('intro-02',1800,'PUSH IN',{expression:'smile',pose:'confident',action:'breathe',camera:{zoom:1.05,panX:0,panY:.08}}),
    cue('intro-03',3600,'LINE',{expression:'happy',pose:'confident',action:'talk',camera:{zoom:1.28,panX:.04,panY:.16},dialogue:'Ready when you are.'}),
    cue('intro-04',6200,'BUTTON',{expression:'serious',pose:'cool',action:'none',camera:{zoom:1.1,panX:-.04,panY:.08},dialogue:''}),
  ]}),
  reaction:normalizeCutsceneProject({version:1,title:'REACTION',durationMs:6000,cues:[
    cue('react-01',0,'HOLD',{expression:'neutral',pose:'relax',action:'breathe',camera:{zoom:1.02,panX:0,panY:.08},dialogue:''}),
    cue('react-02',1500,'NOTICE',{expression:'surprised',pose:'cute',action:'blink',camera:{zoom:1.25,panX:.05,panY:.14}}),
    cue('react-03',3000,'REACT',{expression:'happy',pose:'confident',action:'wave',camera:{zoom:1.15,panX:-.04,panY:.08},dialogue:'Oh! There you are.'}),
    cue('react-04',5000,'SETTLE',{expression:'smile',pose:'relax',action:'breathe',camera:{zoom:1.0,panX:0,panY:.05},dialogue:''}),
  ]}),
  battle:normalizeCutsceneProject({version:1,title:'BATTLE INTRO',durationMs:9000,cues:[
    cue('battle-01',0,'WIDE',{expression:'serious',pose:'cool',action:'breathe',camera:{zoom:.72,panX:0,panY:-.08},dialogue:''}),
    cue('battle-02',1800,'STEP IN',{expression:'serious',pose:'fight',action:'walk',camera:{zoom:.92,panX:-.06,panY:.02}}),
    cue('battle-03',3800,'THREAT',{expression:'angry',pose:'fight',action:'talk',camera:{zoom:1.3,panX:.07,panY:.15},dialogue:'This ends here.'}),
    cue('battle-04',5900,'READY',{expression:'angry',pose:'fight',action:'breathe',camera:{zoom:1.05,panX:0,panY:.06},dialogue:''}),
    cue('battle-05',7600,'GO',{expression:'serious',pose:'run',action:'run',camera:{zoom:.86,panX:-.08,panY:-.02}}),
  ]}),
};

export interface EvaluatedCutsceneState{
  timeMs:number;
  activeCue:CutsceneCue;
  expression:ExpressionId;
  pose:PoseId;
  action:MotionActionId;
  camera:CutsceneCameraState;
  dialogue:string;
}

function lastDefined<T>(cues:CutsceneCue[],timeMs:number,read:(cue:CutsceneCue)=>T|undefined,fallback:T):T{
  let value=fallback;
  for(const item of cues){if(item.timeMs>timeMs)break;const next=read(item);if(next!==undefined)value=next;}
  return value;
}

function evaluateCamera(cues:CutsceneCue[],timeMs:number):CutsceneCameraState{
  const authored=cues.filter(item=>item.camera).map(item=>({timeMs:item.timeMs,camera:normalizeCutsceneCamera(item.camera)}));
  if(!authored.length)return{...DEFAULT_CUTSCENE_CAMERA};
  let previous=authored[0],next=authored[authored.length-1];
  for(const item of authored){if(item.timeMs<=timeMs)previous=item;if(item.timeMs>=timeMs){next=item;break;}}
  if(previous.timeMs===next.timeMs||cameraEqual(previous.camera,next.camera))return{...previous.camera};
  const t=clamp((timeMs-previous.timeMs)/(next.timeMs-previous.timeMs),0,1);
  return{
    zoom:previous.camera.zoom+(next.camera.zoom-previous.camera.zoom)*t,
    panX:previous.camera.panX+(next.camera.panX-previous.camera.panX)*t,
    panY:previous.camera.panY+(next.camera.panY-previous.camera.panY)*t,
  };
}

export function evaluateCutscene(projectInput:CutsceneProject,timeMsInput:number):EvaluatedCutsceneState{
  const project=normalizeCutsceneProject(projectInput),timeMs=clamp(finite(timeMsInput,0),0,project.durationMs);
  let activeCue=project.cues[0];for(const item of project.cues){if(item.timeMs<=timeMs)activeCue=item;else break;}
  return{
    timeMs,
    activeCue,
    expression:lastDefined(project.cues,timeMs,item=>item.expression,'neutral'),
    pose:lastDefined(project.cues,timeMs,item=>item.pose,'idle'),
    action:lastDefined(project.cues,timeMs,item=>item.action,'none'),
    camera:evaluateCamera(project.cues,timeMs),
    dialogue:lastDefined(project.cues,timeMs,item=>Object.prototype.hasOwnProperty.call(item,'dialogue')?item.dialogue:undefined,''),
  };
}

export function createCutsceneCue(timeMs:number,expression:ExpressionId,motion:CharacterMotionState,camera:CutsceneCameraState=DEFAULT_CUTSCENE_CAMERA,index=0):CutsceneCue{
  return normalizeCue({
    id:`cue-${Date.now().toString(36)}-${index}`,
    timeMs,
    label:`BEAT ${index+1}`,
    expression,
    pose:motion.pose,
    action:motion.action,
    camera,
  },index,CUTSCENE_LIMITS.durationMs.max);
}
