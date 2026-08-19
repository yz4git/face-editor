import type { CharacterDefinition, CharacterExpressionSet, CharacterMotionState, CompiledPolygonCharacter, MotionActionId, PoseId } from '../core/types';
import { ACTION_ORDER, applyMotionInPlace, cloneMotionState, DEFAULT_MOTION_STATE, motionActionLabel, motionPoseLabel, normalizeMotionState, POSE_ORDER, POSE_PRESETS } from '../core/motionSystem';
import { downloadMotionSheet } from '../render/MotionSheetRenderer';

export interface MotionEditorBridge{
  getCharacter():CharacterDefinition;
  getExpressionSet():CharacterExpressionSet;
  setCompiledPreviewMutator(mutator:((character:CompiledPolygonCharacter,timeMs:number)=>void)|null):void;
  setAnimationTime(timeMs:number):void;
  setMotionExportState(state:CharacterMotionState):void;
}

const POSE_ICONS:Record<PoseId,string>={idle:'│',relax:'⌁',confident:'◆',cute:'♡',cool:'◇',fight:'✦',run:'»',jump:'↑'};
const ACTION_ICONS:Record<Exclude<MotionActionId,'none'>,string>={breathe:'≈',blink:'⌒',talk:'◡',wave:'⌁',walk:'›',run:'»'};

export class MotionPanel{
  private panel:HTMLElement;
  private launchButton:HTMLButtonElement;
  private statusPill:HTMLButtonElement;
  private state=cloneMotionState(DEFAULT_MOTION_STATE);
  private open=false;
  private raf=0;
  private lastFrame=-Infinity;
  private readonly frameInterval=1000/30;

  constructor(private root:HTMLElement,private bridge:MotionEditorBridge){
    const preview=root.querySelector<HTMLElement>('.preview-panel');if(!preview)throw new Error('Motion preview host missing');
    const actions=root.querySelector('.top-actions');
    this.launchButton=document.createElement('button');this.launchButton.type='button';this.launchButton.dataset.motionOpen='1';this.launchButton.innerHTML='▶<small>MOTION</small>';actions?.prepend(this.launchButton);
    this.statusPill=document.createElement('button');this.statusPill.type='button';this.statusPill.className='motion-status-pill';this.statusPill.dataset.motionOpen='1';preview.append(this.statusPill);
    this.panel=document.createElement('section');this.panel.className='motion-studio';this.panel.hidden=true;this.panel.setAttribute('aria-label','Character Motion Studio');preview.append(this.panel);
    this.root.addEventListener('click',this.onClick);document.addEventListener('visibilitychange',this.onVisibilityChange);
    this.apply();this.render();this.raf=requestAnimationFrame(this.frame);
  }

  private onClick=(event:Event)=>{
    const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
    if(button.dataset.motionOpen){this.open=!this.open;this.render();return;}
    if(!this.panel.contains(button))return;
    if(button.dataset.motionClose){this.open=false;this.render();return;}
    const pose=button.dataset.motionPose as PoseId|undefined;
    if(pose&&POSE_ORDER.includes(pose)){this.state.pose=pose;this.apply();this.render();return;}
    const action=button.dataset.motionAction as MotionActionId|undefined;
    if(action&&ACTION_ORDER.includes(action as Exclude<MotionActionId,'none'>)){this.state.action=this.state.action===action?'none':action;this.state.playing=true;this.apply();this.render();return;}
    if(button.dataset.motionPlay){this.state.playing=!this.state.playing;this.apply();this.render();return;}
    if(button.dataset.motionBlink){this.state.autoBlink=!this.state.autoBlink;this.apply();this.render();return;}
    if(button.dataset.motionReset){this.state=cloneMotionState(DEFAULT_MOTION_STATE);this.apply();this.render();return;}
    if(button.dataset.motionSheet){downloadMotionSheet(this.bridge.getCharacter(),this.bridge.getExpressionSet());this.flash('SHEET EXPORTED');}
  };

  private onVisibilityChange=()=>{if(!document.hidden&&this.state.playing)this.bridge.setAnimationTime(performance.now());};

  private frame=(time:number)=>{
    if(!document.hidden&&this.state.playing&&time-this.lastFrame>=this.frameInterval){this.lastFrame=time;this.bridge.setAnimationTime(time);}
    this.raf=requestAnimationFrame(this.frame);
  };

  private apply(){
    const snapshot=cloneMotionState(this.state);
    this.bridge.setCompiledPreviewMutator((character,timeMs)=>{applyMotionInPlace(character,snapshot,timeMs);});
    this.bridge.setMotionExportState(snapshot);
    this.bridge.setAnimationTime(this.state.playing?performance.now():0);
  }

  private render(){
    this.launchButton.classList.toggle('selected',this.open);this.launchButton.setAttribute('aria-pressed',String(this.open));this.panel.hidden=!this.open;
    this.statusPill.textContent=`${motionPoseLabel(this.state.pose)} · ${motionActionLabel(this.state.action)}`;this.statusPill.classList.toggle('playing',this.state.playing);
    if(!this.open)return;
    this.panel.innerHTML=`
      <header class="motion-header"><div><span>CHARACTER MOTION STUDIO v1</span><strong>${motionPoseLabel(this.state.pose)} · ${motionActionLabel(this.state.action)}</strong></div><button type="button" data-motion-close="1" aria-label="Close Motion Studio">×</button></header>
      <div class="motion-row"><label>POSE</label><div class="motion-button-strip pose-strip" role="group" aria-label="Pose presets">${POSE_ORDER.map(id=>`<button type="button" data-motion-pose="${id}" class="${id===this.state.pose?'selected':''}" aria-pressed="${id===this.state.pose}" title="${POSE_PRESETS[id].description}"><span>${POSE_ICONS[id]}</span><small>${motionPoseLabel(id)}</small></button>`).join('')}</div></div>
      <div class="motion-row"><label>ACTION</label><div class="motion-button-strip action-strip" role="group" aria-label="Motion actions">${ACTION_ORDER.map(id=>`<button type="button" data-motion-action="${id}" class="${id===this.state.action?'selected':''}" aria-pressed="${id===this.state.action}"><span>${ACTION_ICONS[id]}</span><small>${motionActionLabel(id)}</small></button>`).join('')}</div></div>
      <footer class="motion-footer"><button type="button" data-motion-play="1" class="${this.state.playing?'selected':''}">${this.state.playing?'❚❚ PAUSE':'▶ PLAY'}</button><button type="button" data-motion-blink="1" class="${this.state.autoBlink?'selected':''}">⌒ AUTO BLINK</button><button type="button" data-motion-sheet="1">▦ SHEET</button><button type="button" data-motion-reset="1">↺ RESET</button><output role="status"></output></footer>`;
  }

  private flash(message:string){const output=this.panel.querySelector<HTMLOutputElement>('output');if(output){output.value=message;setTimeout(()=>{if(output.isConnected)output.value='';},1400);}}

  getMotionState(){return cloneMotionState(this.state);}
  applyMotionState(input:CharacterMotionState){this.state=normalizeMotionState(input);this.apply();this.render();}
  applyFactoryProfile(profile:{pose:PoseId;action:MotionActionId}){this.state={...this.state,pose:profile.pose,action:profile.action,playing:true,autoBlink:true};this.apply();this.render();}

  dispose(){cancelAnimationFrame(this.raf);this.root.removeEventListener('click',this.onClick);document.removeEventListener('visibilitychange',this.onVisibilityChange);this.bridge.setCompiledPreviewMutator(null);this.panel.remove();this.statusPill.remove();this.launchButton.remove();}
}
