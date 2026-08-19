import { cloneCutsceneProject, createCutsceneCue, CUTSCENE_TEMPLATES, evaluateCutscene, normalizeCutsceneProject } from '../core/cutsceneSystem';
import type { CharacterMotionState, CutsceneCameraState, CutsceneProject, CutsceneTemplateId, ExpressionId, MotionActionId, PoseId } from '../core/types';

export interface CutsceneEditorBridge{
  getExpression():ExpressionId;
  applyExpression(expression:ExpressionId):void;
  getMotion():CharacterMotionState;
  driveMotion(pose:PoseId,action:MotionActionId,timeMs:number,playing:boolean):void;
  releaseMotion():void;
}

const TEMPLATE_ORDER:readonly CutsceneTemplateId[]=['intro','reaction','battle'];
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const escapeHtml=(value:string)=>value.replace(/[&<>'\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[char]??char));
const cameraKey=(camera:CutsceneCameraState)=>`${camera.zoom.toFixed(4)}:${camera.panX.toFixed(4)}:${camera.panY.toFixed(4)}`;

export class CutscenePanel{
  private panel:HTMLElement;
  private launchButton:HTMLButtonElement;
  private statusPill:HTMLButtonElement;
  private overlay:HTMLElement;
  private timecode:HTMLElement;
  private dialogue:HTMLElement;
  private previewHost:HTMLElement;
  private project=cloneCutsceneProject(CUTSCENE_TEMPLATES.intro);
  private template:CutsceneTemplateId|null='intro';
  private selectedCueId=this.project.cues[0].id;
  private open=false;
  private playing=false;
  private currentMs=0;
  private raf=0;
  private startClock=0;
  private lastFrame=-Infinity;
  private lastExpression:ExpressionId|null=null;
  private lastCameraKey='';
  private restoreExpression:ExpressionId|null=null;
  private driving=false;
  private readonly frameInterval=1000/30;

  constructor(private root:HTMLElement,private bridge:CutsceneEditorBridge){
    const preview=root.querySelector<HTMLElement>('.preview-panel'),previewHost=root.querySelector<HTMLElement>('#preview');if(!preview||!previewHost)throw new Error('Cutscene preview host missing');this.previewHost=previewHost;
    const actions=root.querySelector('.top-actions');
    this.launchButton=document.createElement('button');this.launchButton.type='button';this.launchButton.dataset.cutsceneOpen='1';this.launchButton.innerHTML='▤<small>CUTSCENE</small>';actions?.prepend(this.launchButton);
    this.statusPill=document.createElement('button');this.statusPill.type='button';this.statusPill.className='cutscene-status-pill';this.statusPill.dataset.cutsceneOpen='1';preview.append(this.statusPill);
    this.overlay=document.createElement('div');this.overlay.className='cutscene-overlay';this.timecode=document.createElement('span');this.timecode.className='cutscene-timecode';this.dialogue=document.createElement('div');this.dialogue.className='cutscene-dialogue';this.overlay.append(this.timecode,this.dialogue);preview.append(this.overlay);
    this.panel=document.createElement('section');this.panel.className='cutscene-studio';this.panel.hidden=true;this.panel.setAttribute('aria-label','Cutscene Studio');preview.append(this.panel);
    this.root.addEventListener('click',this.onClick);this.root.addEventListener('input',this.onInput);this.root.addEventListener('change',this.onChange);document.addEventListener('visibilitychange',this.onVisibilityChange);
    this.render();this.updateOverlay(evaluateCutscene(this.project,0));this.raf=requestAnimationFrame(this.frame);
  }

  private onClick=(event:Event)=>{
    const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
    if(button.dataset.cutsceneOpen){this.open=!this.open;if(this.open){this.beginDrive();this.applyFrame(true);}else this.releaseDrive();this.render();return;}
    if(!this.panel.contains(button))return;
    if(button.dataset.cutsceneClose){this.open=false;this.releaseDrive();this.render();return;}
    const template=button.dataset.cutsceneTemplate as CutsceneTemplateId|undefined;if(template&&TEMPLATE_ORDER.includes(template)){this.useTemplate(template);return;}
    const cueId=button.dataset.cutsceneCue;if(cueId){this.selectedCueId=cueId;const cue=this.project.cues.find(item=>item.id===cueId);if(cue)this.seek(cue.timeMs);this.render();return;}
    if(button.dataset.cutscenePlay!==undefined){this.playing?this.pause():this.play();return;}
    if(button.dataset.cutsceneRestart!==undefined){this.seek(0);return;}
    if(button.dataset.cutscenePrev!==undefined){this.jumpCue(-1);return;}
    if(button.dataset.cutsceneNext!==undefined){this.jumpCue(1);return;}
    if(button.dataset.cutsceneAdd!==undefined){this.addCue();return;}
    if(button.dataset.cutsceneDelete!==undefined){this.deleteCue();return;}
  };

  private onInput=(event:Event)=>{
    const input=(event.target as HTMLElement).closest<HTMLInputElement>('[data-cutscene-scrub]');if(!input)return;
    this.pause(false);this.currentMs=clamp(Number(input.value)||0,0,this.project.durationMs);this.applyFrame();this.updatePlayhead();
  };

  private onChange=(event:Event)=>{
    const dialogue=(event.target as HTMLElement).closest<HTMLInputElement>('[data-cutscene-dialogue]');if(!dialogue)return;
    const cue=this.project.cues.find(item=>item.id===this.selectedCueId);if(!cue)return;cue.dialogue=dialogue.value.slice(0,160);this.project=normalizeCutsceneProject(this.project);this.template=null;this.applyFrame(true);this.render();
  };

  private onVisibilityChange=()=>{if(this.playing&&!document.hidden)this.startClock=performance.now()-this.currentMs;};

  private frame=(time:number)=>{
    if(this.playing&&!document.hidden&&time-this.lastFrame>=this.frameInterval){this.lastFrame=time;this.currentMs=Math.min(this.project.durationMs,time-this.startClock);if(this.currentMs>=this.project.durationMs)this.playing=false;this.applyFrame();this.updatePlayhead();if(!this.playing)this.renderTransport();}
    this.raf=requestAnimationFrame(this.frame);
  };

  private beginDrive(){if(this.driving)return;this.driving=true;this.restoreExpression=this.bridge.getExpression();this.lastExpression=null;this.lastCameraKey='';}
  private releaseDrive(){
    this.playing=false;if(!this.driving)return;this.driving=false;this.bridge.releaseMotion();this.previewHost.dispatchEvent(new CustomEvent('preview-camera',{detail:null}));if(this.restoreExpression!==null&&this.bridge.getExpression()!==this.restoreExpression)this.bridge.applyExpression(this.restoreExpression);this.restoreExpression=null;this.lastExpression=null;this.lastCameraKey='';this.dialogue.textContent='';this.timecode.textContent='';
  }

  private applyFrame(force=false){
    if(!this.driving)this.beginDrive();const state=evaluateCutscene(this.project,this.currentMs);
    if(force||state.expression!==this.lastExpression){this.lastExpression=state.expression;this.bridge.applyExpression(state.expression);}
    const nextCameraKey=cameraKey(state.camera);if(force||nextCameraKey!==this.lastCameraKey){this.lastCameraKey=nextCameraKey;this.previewHost.dispatchEvent(new CustomEvent('preview-camera',{detail:state.camera}));}
    this.bridge.driveMotion(state.pose,state.action,state.timeMs,this.playing);this.updateOverlay(state);this.statusPill.textContent=`CUT · ${state.activeCue.label}`;this.statusPill.classList.toggle('playing',this.playing);
  }

  private updateOverlay(state:ReturnType<typeof evaluateCutscene>){this.timecode.textContent=this.formatTime(state.timeMs)+' / '+this.formatTime(this.project.durationMs);this.dialogue.textContent=state.dialogue;}
  private updatePlayhead(){const percent=this.project.durationMs?this.currentMs/this.project.durationMs*100:0;this.panel.querySelector<HTMLElement>('.cutscene-track')?.style.setProperty('--playhead',`${percent}%`);const scrub=this.panel.querySelector<HTMLInputElement>('[data-cutscene-scrub]');if(scrub)scrub.value=String(Math.round(this.currentMs));const output=this.panel.querySelector<HTMLOutputElement>('[data-cutscene-clock]');if(output)output.value=this.formatTime(this.currentMs);}
  private renderTransport(){const button=this.panel.querySelector<HTMLButtonElement>('[data-cutscene-play]');if(button){button.classList.toggle('selected',this.playing);button.textContent=this.playing?'❚❚ PAUSE':'▶ PLAY';}this.statusPill.classList.toggle('playing',this.playing);}

  private play(){if(this.currentMs>=this.project.durationMs)this.currentMs=0;this.beginDrive();this.playing=true;this.startClock=performance.now()-this.currentMs;this.applyFrame(true);this.renderTransport();}
  private pause(render=true){if(!this.playing)return;this.playing=false;this.applyFrame(true);if(render)this.renderTransport();}
  private seek(timeMs:number){this.pause(false);this.currentMs=clamp(timeMs,0,this.project.durationMs);this.applyFrame(true);this.updatePlayhead();this.renderTransport();}
  private jumpCue(direction:-1|1){const cues=this.project.cues;if(!cues.length)return;let index=cues.findIndex(item=>item.id===this.selectedCueId);if(index<0)index=0;index=clamp(index+direction,0,cues.length-1);this.selectedCueId=cues[index].id;this.seek(cues[index].timeMs);this.render();}
  private useTemplate(id:CutsceneTemplateId){this.pause(false);this.project=cloneCutsceneProject(CUTSCENE_TEMPLATES[id]);this.template=id;this.selectedCueId=this.project.cues[0].id;this.currentMs=0;this.applyFrame(true);this.render();}
  private addCue(){
    const state=evaluateCutscene(this.project,this.currentMs),motion=this.bridge.getMotion(),newCue=createCutsceneCue(this.currentMs,this.bridge.getExpression(),motion,state.camera,this.project.cues.length);newCue.label=`BEAT ${this.project.cues.length+1}`;newCue.dialogue='';this.project=normalizeCutsceneProject({...this.project,cues:[...this.project.cues,newCue]});this.selectedCueId=newCue.id;this.template=null;this.applyFrame(true);this.render();
  }
  private deleteCue(){if(this.project.cues.length<=1)return;const index=this.project.cues.findIndex(item=>item.id===this.selectedCueId);this.project=normalizeCutsceneProject({...this.project,cues:this.project.cues.filter(item=>item.id!==this.selectedCueId)});this.selectedCueId=this.project.cues[Math.max(0,Math.min(index,this.project.cues.length-1))].id;this.template=null;this.seek(Math.min(this.currentMs,this.project.durationMs));this.render();}

  private render(){
    this.launchButton.classList.toggle('selected',this.open);this.launchButton.setAttribute('aria-pressed',String(this.open));this.panel.hidden=!this.open;this.statusPill.textContent=this.open?`CUT · ${evaluateCutscene(this.project,this.currentMs).activeCue.label}`:`CUTSCENE · ${this.project.title}`;this.statusPill.classList.toggle('playing',this.playing);if(!this.open)return;
    const selected=this.project.cues.find(item=>item.id===this.selectedCueId)??this.project.cues[0],percent=this.project.durationMs?this.currentMs/this.project.durationMs*100:0;
    this.panel.innerHTML=`
      <header class="cutscene-header"><div><span>CUTSCENE STUDIO v1</span><strong>${escapeHtml(this.project.title)} · ${this.project.cues.length} CUES</strong></div><button type="button" data-cutscene-close="1" aria-label="Close Cutscene Studio">×</button></header>
      <div class="cutscene-template-row" role="group" aria-label="Cutscene templates">${TEMPLATE_ORDER.map(id=>`<button type="button" data-cutscene-template="${id}" class="${id===this.template?'selected':''}">${id.toUpperCase()}</button>`).join('')}</div>
      <div class="cutscene-timeline"><div class="cutscene-track" style="--playhead:${percent}%">${this.project.cues.map(cue=>`<button type="button" class="cutscene-cue ${cue.id===this.selectedCueId?'selected':''}" data-cutscene-cue="${escapeHtml(cue.id)}" style="left:${cue.timeMs/this.project.durationMs*100}%" title="${escapeHtml(cue.label)} · ${this.formatTime(cue.timeMs)}">${escapeHtml(cue.label)}</button>`).join('')}</div><input class="cutscene-scrub" type="range" min="0" max="${this.project.durationMs}" step="33" value="${Math.round(this.currentMs)}" data-cutscene-scrub aria-label="Cutscene playhead"><div class="cutscene-meta"><span>0:00.0</span><span>${this.formatTime(this.project.durationMs)}</span></div></div>
      <div class="cutscene-bottom"><div class="cutscene-transport"><button type="button" data-cutscene-restart>↺ START</button><button type="button" data-cutscene-prev>‹ CUE</button><button type="button" data-cutscene-play class="${this.playing?'selected':''}">${this.playing?'❚❚ PAUSE':'▶ PLAY'}</button><button type="button" data-cutscene-next>CUE ›</button><output data-cutscene-clock>${this.formatTime(this.currentMs)}</output></div><div class="cutscene-inspector"><strong>${escapeHtml(selected.label)} · ${this.formatTime(selected.timeMs)}</strong><small>${(selected.expression??'—').toUpperCase()} · ${(selected.pose??'—').toUpperCase()} · ${(selected.action??'—').toUpperCase()}</small><input type="text" maxlength="160" value="${escapeHtml(selected.dialogue??'')}" placeholder="Dialogue / subtitle" data-cutscene-dialogue aria-label="Cue dialogue"><div class="cutscene-inspector-actions"><button type="button" data-cutscene-add>＋ ADD CURRENT BEAT</button><button type="button" data-cutscene-delete ${this.project.cues.length<=1?'disabled':''}>− DELETE</button></div></div></div>`;
    this.updatePlayhead();
  }

  getProject(){return cloneCutsceneProject(this.project);}
  applyProject(project:CutsceneProject){this.project=normalizeCutsceneProject(project);this.template=null;this.selectedCueId=this.project.cues[0].id;this.currentMs=0;if(this.open){this.beginDrive();this.applyFrame(true);}this.render();}
  private formatTime(timeMs:number){const total=Math.max(0,timeMs)/1000,minutes=Math.floor(total/60),seconds=Math.floor(total%60),tenths=Math.floor(total*10)%10;return`${minutes}:${String(seconds).padStart(2,'0')}.${tenths}`;}

  dispose(){cancelAnimationFrame(this.raf);this.releaseDrive();this.root.removeEventListener('click',this.onClick);this.root.removeEventListener('input',this.onInput);this.root.removeEventListener('change',this.onChange);document.removeEventListener('visibilitychange',this.onVisibilityChange);this.panel.remove();this.overlay.remove();this.statusPill.remove();this.launchButton.remove();}
}
