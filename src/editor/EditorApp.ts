import { CharacterRenderer } from '../render/CharacterRenderer';
import { renderPartThumbnail } from '../render/PartThumbnailRenderer';
import { exportCharacterBundle } from '../core/compileCharacter';
import type { CharacterDefinition, PartDefinition, PartTransform } from '../core/types';
import {
  ACCENT_OPTIONS,BASE_OPTIONS,BROW_OPTIONS,DEFAULT_CHARACTER,EYE_COLORS,EYE_OPTIONS,FACE_OPTIONS,HAIR_COLORS,HAIR_OPTIONS,HOOD_OPTIONS,JACKET_COLORS,MOUTH_OPTIONS,NOSE_OPTIONS,OUTFIT_OPTIONS,SHIRT_OPTIONS,SKIN_COLORS,STRAP_OPTIONS,
} from '../data/parts';
import { ACCENT_PARTS,BROW_PARTS,EYE_PARTS,FACE_PARTS,HAIR_PARTS,HOOD_PARTS,MOUTH_PARTS,NOSE_PARTS,OUTFIT_PARTS,SHIRT_PARTS,STRAP_PARTS } from '../data/partLibrary';

const clone=<T>(v:T):T=>structuredClone(v);
const pick=<T>(items:T[]):T=>items[Math.floor(Math.random()*items.length)];
const buttons=(kind:string,items:{id:string;label:string}[],selected:string)=>items.map(o=>`<button class="part-card ${o.id===selected?'selected':''}" data-kind="${kind}" data-id="${o.id}" aria-label="${o.label}"><canvas class="part-thumb" data-thumb-kind="${kind}" data-thumb-id="${o.id}"></canvas><small>${o.label}</small></button>`).join('');
const swatches=(kind:string,items:string[],selected:string)=>items.map(c=>`<button class="swatch ${c.toLowerCase()===selected.toLowerCase()?'selected':''}" data-color-kind="${kind}" data-color="${c}" style="--swatch:${c}" aria-label="${kind} ${c}"></button>`).join('');
const bases=(selected:string)=>BASE_OPTIONS.map(o=>`<button class="base-chip ${o.id===selected?'selected':''}" data-base="${o.id}">${o.label}</button>`).join('');

type TransformKey=keyof CharacterDefinition['transforms'];
type TransformProp='x'|'y'|'scaleX'|'scaleY'|'rotation'|'spacing';
const CONTROL_CONFIG:Record<TransformKey,{prop:TransformProp;label:string;min:number;max:number;step:number}[]>={
  eyes:[{prop:'y',label:'HEIGHT',min:-.22,max:.22,step:.01},{prop:'spacing',label:'SPACING',min:-.12,max:.18,step:.01},{prop:'scaleX',label:'WIDTH',min:.65,max:1.45,step:.01},{prop:'scaleY',label:'HEIGHT SIZE',min:.65,max:1.45,step:.01},{prop:'rotation',label:'ANGLE',min:-.35,max:.35,step:.01}],
  brows:[{prop:'y',label:'HEIGHT',min:-.22,max:.22,step:.01},{prop:'spacing',label:'SPACING',min:-.12,max:.18,step:.01},{prop:'scaleX',label:'WIDTH',min:.65,max:1.45,step:.01},{prop:'scaleY',label:'THICKNESS',min:.6,max:1.6,step:.01},{prop:'rotation',label:'ANGLE',min:-.35,max:.35,step:.01}],
  nose:[{prop:'x',label:'X',min:-.18,max:.18,step:.01},{prop:'y',label:'HEIGHT',min:-.18,max:.18,step:.01},{prop:'scaleX',label:'WIDTH',min:.65,max:1.45,step:.01},{prop:'scaleY',label:'HEIGHT SIZE',min:.65,max:1.45,step:.01}],
  mouth:[{prop:'x',label:'X',min:-.2,max:.2,step:.01},{prop:'y',label:'HEIGHT',min:-.22,max:.22,step:.01},{prop:'scaleX',label:'WIDTH',min:.6,max:1.55,step:.01},{prop:'scaleY',label:'HEIGHT SIZE',min:.6,max:1.55,step:.01},{prop:'rotation',label:'ANGLE',min:-.25,max:.25,step:.01}],
};

export class EditorApp{
  private state:CharacterDefinition=clone(DEFAULT_CHARACTER);
  private history:CharacterDefinition[]=[];
  private redoHistory:CharacterDefinition[]=[];
  private renderer!:CharacterRenderer;
  private activeSlot=1;
  private activeAdjust:TransformKey='eyes';
  private sliderEditing=false;

  constructor(private root:HTMLElement){this.mount();}

  private mount(){
    this.root.innerHTML=`
      <div class="app-shell">
        <header class="topbar">
          <div class="brand"><span class="brand-mark">✦</span><span>POLYGON CHARACTER EDITOR</span></div>
          <div class="top-actions">
            <button data-action="randomize">⤨<small>RANDOMIZE</small></button>
            <button data-action="undo">↶<small>UNDO</small></button>
            <button data-action="redo">↷<small>REDO</small></button>
            <button data-action="export">✓<small>EXPORT</small></button>
          </div>
        </header>
        <main class="editor-grid">
          <nav class="category-rail" aria-label="Character part categories">
            ${['OUTFIT','HAIR','OUTLINE','EYES','EYEBROWS','NOSE','MOUTH','COLOR'].map((x,i)=>`<button class="${i===1?'active':''}" data-focus="${x.toLowerCase()}"><span>${['▣','◆','⬡','◉','⌃','◈','◡','●'][i]}</span>${x}</button>`).join('')}
          </nav>
          <section class="left-panel panel" id="left-section">
            <h2>BASE</h2><div id="base-options" class="base-options"></div>
            <div id="outfit-section">
              <h2>JACKET / SILHOUETTE</h2><div id="outfit-options" class="option-grid"></div>
              <h2>COLLAR / HOOD</h2><div id="hood-options" class="option-grid"></div>
              <h2>INNER SHIRT</h2><div id="shirt-options" class="option-grid"></div>
              <h2>STRAP / HARNESS</h2><div id="strap-options" class="option-grid"></div>
              <h2>ACCENT</h2><div id="accent-options" class="option-grid"></div>
            </div>
            <div id="hair-section"><h2>HAIRSTYLE</h2><div id="hair-options" class="option-grid hair-grid"></div></div>
            <h2>HAIR COLOR</h2><div id="hair-colors" class="swatch-grid"></div>
            <h2>BASE COLORS</h2><div class="color-group"><label>SKIN</label><div id="skin-colors" class="swatch-grid compact"></div></div>
            <div class="color-group"><label>JACKET</label><div id="jacket-colors" class="swatch-grid compact"></div></div>
          </section>
          <section class="preview-panel panel">
            <div class="preview-badge"><span>GENERATED SOURCE → TRIANGLE MESH</span><span id="renderer-mode">RENDERER</span></div>
            <div id="preview" class="preview-canvas-wrap"></div>
            <div class="preview-footer"><button class="view-button selected">FRONT</button><button class="view-button" disabled>3/4 VIEW</button><button class="view-button" disabled>PROFILE</button></div>
          </section>
          <section class="right-panel">
            <div class="feature panel" id="outline-section"><h2>OUTLINE / FACE SHAPE</h2><div id="face-options" class="option-row"></div></div>
            <div class="feature panel" id="eyes-section"><h2>EYES</h2><div id="eye-options" class="option-row"></div><h3>EYE COLOR</h3><div id="eye-colors" class="swatch-grid compact"></div></div>
            <div class="feature panel" id="eyebrows-section"><h2>EYEBROWS</h2><div id="brow-options" class="option-row"></div></div>
            <div class="feature panel" id="nose-section"><h2>NOSE</h2><div id="nose-options" class="option-row"></div></div>
            <div class="feature panel" id="mouth-section"><h2>MOUTH</h2><div id="mouth-options" class="option-row"></div></div>
            <div class="feature panel adjust-panel" id="adjust-section"><h2>MII-STYLE ADJUST</h2><div id="adjust-tabs" class="adjust-tabs"></div><div id="adjust-controls" class="adjust-controls"></div></div>
          </section>
        </main>
        <footer class="bottombar">
          <div><strong>Generated-source triangle character data</strong><small>Jacket, hood, shirt, harness and accent can now be mixed independently.</small></div>
          <div class="save-slots"><span>SAVE SLOT</span>${[1,2,3,4].map(n=>`<button data-slot="${n}" class="${n===1?'selected':''}">${n}</button>`).join('')}</div>
        </footer>
      </div>`;
    const preview=this.root.querySelector<HTMLElement>('#preview');if(!preview)throw new Error('Preview host missing');
    this.renderer=new CharacterRenderer(preview);this.updateRendererBadge();preview.addEventListener('renderer-mode',()=>this.updateRendererBadge());
    this.root.addEventListener('click',this.onClick);this.root.addEventListener('input',this.onInput);this.root.addEventListener('pointerdown',this.onPointerDown);this.root.addEventListener('change',this.onChange);
    this.renderUI();this.renderer.setCharacter(this.state);
  }

  private onClick=(ev:Event)=>{
    const target=(ev.target as HTMLElement).closest<HTMLElement>('button');if(!target)return;
    const action=target.dataset.action;
    if(action==='randomize'){this.randomize();return;}if(action==='undo'){this.undo();return;}if(action==='redo'){this.redo();return;}if(action==='export'){this.export();return;}if(action==='reset-transform'){this.resetTransform();return;}
    const slot=target.dataset.slot;if(slot){this.saveToSlot(Number(slot));return;}
    const base=target.dataset.base;if(base){this.pushHistory();this.state.baseStyle=base as CharacterDefinition['baseStyle'];this.commit();return;}
    const adjust=target.dataset.adjust as TransformKey|undefined;if(adjust){this.activeAdjust=adjust;this.renderAdjustControls();return;}
    const focus=target.dataset.focus;if(focus){this.focusSection(focus,target);return;}
    const kind=target.dataset.kind,id=target.dataset.id;if(kind&&id){this.pushHistory();this.applySelection(kind,id);this.commit();return;}
    const colorKind=target.dataset.colorKind,color=target.dataset.color;if(colorKind&&color){this.pushHistory();this.applyColor(colorKind,color);this.commit();}
  };
  private onPointerDown=(ev:Event)=>{const input=(ev.target as HTMLElement).closest<HTMLInputElement>('input[type="range"][data-transform-prop]');if(input&&!this.sliderEditing){this.pushHistory();this.sliderEditing=true;}};
  private onInput=(ev:Event)=>{const input=(ev.target as HTMLElement).closest<HTMLInputElement>('input[type="range"][data-transform-prop]');if(!input)return;if(!this.sliderEditing){this.pushHistory();this.sliderEditing=true;}const key=input.dataset.transformKey as TransformKey,prop=input.dataset.transformProp as TransformProp,value=Number(input.value);(this.state.transforms[key] as PartTransform&Record<TransformProp,number>)[prop]=value;const output=input.parentElement?.querySelector<HTMLOutputElement>('output');if(output)output.value=this.formatControl(prop,value);this.renderer.setCharacter(this.state);};
  private onChange=(ev:Event)=>{const input=(ev.target as HTMLElement).closest<HTMLInputElement>('input[type="range"][data-transform-prop]');if(input)this.sliderEditing=false;};

  private pushHistory(){this.history.push(clone(this.state));if(this.history.length>80)this.history.shift();this.redoHistory=[];}
  private commit(){this.renderUI();this.renderer.setCharacter(this.state);}
  private applySelection(kind:string,id:string){if(kind==='outfit')this.state.outfitStyle=id as CharacterDefinition['outfitStyle'];else if(kind==='hood')this.state.hoodStyle=id as CharacterDefinition['hoodStyle'];else if(kind==='shirt')this.state.shirtStyle=id as CharacterDefinition['shirtStyle'];else if(kind==='strap')this.state.strapStyle=id as CharacterDefinition['strapStyle'];else if(kind==='accent')this.state.accentStyle=id as CharacterDefinition['accentStyle'];else if(kind==='hair')this.state.hairStyle=id as CharacterDefinition['hairStyle'];else if(kind==='face')this.state.faceShape=id as CharacterDefinition['faceShape'];else if(kind==='eye')this.state.eyeStyle=id as CharacterDefinition['eyeStyle'];else if(kind==='brow')this.state.browStyle=id as CharacterDefinition['browStyle'];else if(kind==='nose')this.state.noseStyle=id as CharacterDefinition['noseStyle'];else if(kind==='mouth')this.state.mouthStyle=id as CharacterDefinition['mouthStyle'];}
  private applyColor(kind:string,color:string){if(kind==='hair'){this.state.colors.hair=color;this.state.colors.brows=color;}else if(kind==='eyes')this.state.colors.eyes=color;else if(kind==='skin')this.state.colors.skin=color;else if(kind==='jacket')this.state.colors.jacket=color;}
  private randomize(){this.pushHistory();this.state.baseStyle=pick(BASE_OPTIONS).id;this.state.outfitStyle=pick(OUTFIT_OPTIONS).id;this.state.hoodStyle=pick(HOOD_OPTIONS).id;this.state.shirtStyle=pick(SHIRT_OPTIONS).id;this.state.strapStyle=pick(STRAP_OPTIONS).id;this.state.accentStyle=pick(ACCENT_OPTIONS).id;this.state.hairStyle=pick(HAIR_OPTIONS).id;this.state.faceShape=pick(FACE_OPTIONS).id;this.state.eyeStyle=pick(EYE_OPTIONS).id;this.state.browStyle=pick(BROW_OPTIONS).id;this.state.noseStyle=pick(NOSE_OPTIONS).id;this.state.mouthStyle=pick(MOUTH_OPTIONS).id;this.state.colors.hair=pick(HAIR_COLORS);this.state.colors.brows=this.state.colors.hair;this.state.colors.eyes=pick(EYE_COLORS);this.state.colors.skin=pick(SKIN_COLORS);this.state.colors.jacket=pick(JACKET_COLORS);this.commit();}
  private undo(){const prev=this.history.pop();if(prev){this.redoHistory.push(clone(this.state));this.state=prev;this.commit();}}
  private redo(){const next=this.redoHistory.pop();if(next){this.history.push(clone(this.state));this.state=next;this.commit();}}
  private resetTransform(){this.pushHistory();this.state.transforms[this.activeAdjust]={x:0,y:0,scaleX:1,scaleY:1,rotation:0,spacing:0};this.commit();}
  private export(){const bundle=exportCharacterBundle(this.state),blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='polygon-character.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),0);}
  private saveToSlot(slot:number){this.activeSlot=slot;localStorage.setItem(`face-editor:slot:${slot}`,JSON.stringify(this.state));this.renderUI();}
  private focusSection(name:string,button:HTMLElement){this.root.querySelectorAll('.category-rail button').forEach(x=>x.classList.remove('active'));button.classList.add('active');const adjustMap:Record<string,TransformKey|undefined>={eyes:'eyes',eyebrows:'brows',nose:'nose',mouth:'mouth'};if(adjustMap[name])this.activeAdjust=adjustMap[name]!;const id=name==='outline'?'outline-section':name==='color'?'left-section':`${name}-section`;this.root.querySelector(`#${id}`)?.scrollIntoView({behavior:'smooth',block:'nearest'});this.renderAdjustControls();}

  private renderUI(){
    this.setHTML('#base-options',bases(this.state.baseStyle));this.setHTML('#outfit-options',buttons('outfit',OUTFIT_OPTIONS,this.state.outfitStyle));this.setHTML('#hood-options',buttons('hood',HOOD_OPTIONS,this.state.hoodStyle));this.setHTML('#shirt-options',buttons('shirt',SHIRT_OPTIONS,this.state.shirtStyle));this.setHTML('#strap-options',buttons('strap',STRAP_OPTIONS,this.state.strapStyle));this.setHTML('#accent-options',buttons('accent',ACCENT_OPTIONS,this.state.accentStyle));this.setHTML('#hair-options',buttons('hair',HAIR_OPTIONS,this.state.hairStyle));this.setHTML('#hair-colors',swatches('hair',HAIR_COLORS,this.state.colors.hair));this.setHTML('#skin-colors',swatches('skin',SKIN_COLORS,this.state.colors.skin));this.setHTML('#jacket-colors',swatches('jacket',JACKET_COLORS,this.state.colors.jacket));
    this.setHTML('#face-options',buttons('face',FACE_OPTIONS,this.state.faceShape));this.setHTML('#eye-options',buttons('eye',EYE_OPTIONS,this.state.eyeStyle));this.setHTML('#eye-colors',swatches('eyes',EYE_COLORS,this.state.colors.eyes));this.setHTML('#brow-options',buttons('brow',BROW_OPTIONS,this.state.browStyle));this.setHTML('#nose-options',buttons('nose',NOSE_OPTIONS,this.state.noseStyle));this.setHTML('#mouth-options',buttons('mouth',MOUTH_OPTIONS,this.state.mouthStyle));
    this.root.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.slot)===this.activeSlot));
    this.renderPartThumbnails();this.renderAdjustControls();
  }
  private renderPartThumbnails(){
    const defs:Record<string,Record<string,PartDefinition>>={outfit:OUTFIT_PARTS,hood:HOOD_PARTS,shirt:SHIRT_PARTS,strap:STRAP_PARTS,accent:ACCENT_PARTS,hair:HAIR_PARTS,face:FACE_PARTS,eye:EYE_PARTS,brow:BROW_PARTS,nose:NOSE_PARTS,mouth:MOUTH_PARTS};
    this.root.querySelectorAll<HTMLCanvasElement>('canvas[data-thumb-kind]').forEach(canvas=>{const kind=canvas.dataset.thumbKind??'',id=canvas.dataset.thumbId??'',def=defs[kind]?.[id];if(def)renderPartThumbnail(canvas,def,this.state);});
  }
  private renderAdjustControls(){
    this.setHTML('#adjust-tabs',(['eyes','brows','nose','mouth'] as TransformKey[]).map(k=>`<button data-adjust="${k}" class="${k===this.activeAdjust?'selected':''}">${k.toUpperCase()}</button>`).join(''));
    const t=this.state.transforms[this.activeAdjust],controls=CONTROL_CONFIG[this.activeAdjust].map(c=>{const value=(t[c.prop]??(c.prop==='spacing'?0:1)) as number;return`<label class="adjust-row"><span>${c.label}</span><input type="range" data-transform-key="${this.activeAdjust}" data-transform-prop="${c.prop}" min="${c.min}" max="${c.max}" step="${c.step}" value="${value}"><output>${this.formatControl(c.prop,value)}</output></label>`;}).join('');
    this.setHTML('#adjust-controls',`${controls}<button class="reset-transform" data-action="reset-transform">RESET ${this.activeAdjust.toUpperCase()}</button>`);
  }
  private formatControl(prop:TransformProp,value:number){return prop==='rotation'?`${Math.round(value*180/Math.PI)}°`:value.toFixed(2);}
  private updateRendererBadge(){const badge=this.root.querySelector('#renderer-mode');if(badge)badge.textContent=this.renderer?this.renderer.getMode().toUpperCase():'RENDERER';}
  private setHTML(selector:string,html:string){const el=this.root.querySelector(selector);if(el)el.innerHTML=html;}
  dispose(){this.root.removeEventListener('click',this.onClick);this.root.removeEventListener('input',this.onInput);this.root.removeEventListener('pointerdown',this.onPointerDown);this.root.removeEventListener('change',this.onChange);this.renderer.dispose();}
}
