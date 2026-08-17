import { CharacterRenderer } from '../render/CharacterRenderer';
import { exportCharacterBundle } from '../core/compileCharacter';
import type { CharacterDefinition } from '../core/types';
import {
  BROW_OPTIONS, DEFAULT_CHARACTER, EYE_COLORS, EYE_OPTIONS, FACE_OPTIONS,
  HAIR_COLORS, HAIR_OPTIONS, JACKET_COLORS, MOUTH_OPTIONS, NOSE_OPTIONS, SKIN_COLORS,
} from '../data/parts';

const clone=<T>(v:T):T=>structuredClone(v);
const pick=<T>(items:T[]):T=>items[Math.floor(Math.random()*items.length)];
const buttons=(kind:string,items:{id:string;label:string}[],selected:string)=>items.map((o,i)=>`<button class="part-card ${o.id===selected?'selected':''}" data-kind="${kind}" data-id="${o.id}" aria-label="${o.label}"><span class="mini-shape mini-${kind}" style="--variant:${i}"></span><small>${o.label}</small></button>`).join('');
const swatches=(kind:string,items:string[],selected:string)=>items.map(c=>`<button class="swatch ${c.toLowerCase()===selected.toLowerCase()?'selected':''}" data-color-kind="${kind}" data-color="${c}" style="--swatch:${c}" aria-label="${kind} ${c}"></button>`).join('');

export class EditorApp {
  private state:CharacterDefinition=clone(DEFAULT_CHARACTER);
  private history:CharacterDefinition[]=[];
  private renderer!:CharacterRenderer;
  private activeSlot=1;

  constructor(private root:HTMLElement){ this.mount(); }

  private mount(){
    this.root.innerHTML=`
      <div class="app-shell">
        <header class="topbar">
          <div class="brand"><span class="brand-mark">✦</span><span>POLYGON CHARACTER EDITOR</span></div>
          <div class="top-actions">
            <button data-action="randomize">⤨<small>RANDOMIZE</small></button>
            <button data-action="undo">↶<small>UNDO</small></button>
            <button data-action="export">✓<small>EXPORT</small></button>
          </div>
        </header>
        <main class="editor-grid">
          <nav class="category-rail" aria-label="Character part categories">
            ${['HAIR','OUTLINE','EYES','EYEBROWS','NOSE','MOUTH','COLOR'].map((x,i)=>`<button class="${i===0?'active':''}" data-focus="${x.toLowerCase()}"><span>${['◆','⬡','◉','⌃','◈','◡','●'][i]}</span>${x}</button>`).join('')}
          </nav>
          <section class="left-panel panel">
            <h2>HAIRSTYLE</h2><div id="hair-options" class="option-grid hair-grid"></div>
            <h2>HAIR COLOR</h2><div id="hair-colors" class="swatch-grid"></div>
            <h2>BASE COLORS</h2><div class="color-group"><label>SKIN</label><div id="skin-colors" class="swatch-grid compact"></div></div>
            <div class="color-group"><label>JACKET</label><div id="jacket-colors" class="swatch-grid compact"></div></div>
          </section>
          <section class="preview-panel panel">
            <div class="preview-badge">FLAT TRIANGLE MESH</div>
            <div id="preview" class="preview-canvas-wrap"></div>
            <div class="preview-footer">
              <button class="view-button selected">FRONT</button><button class="view-button" disabled>3/4 VIEW</button><button class="view-button" disabled>PROFILE</button>
            </div>
          </section>
          <section class="right-panel">
            <div class="feature panel" id="outline-section"><h2>OUTLINE / FACE SHAPE</h2><div id="face-options" class="option-row"></div></div>
            <div class="feature panel" id="eyes-section"><h2>EYES</h2><div id="eye-options" class="option-row"></div><h3>EYE COLOR</h3><div id="eye-colors" class="swatch-grid compact"></div></div>
            <div class="feature panel" id="eyebrows-section"><h2>EYEBROWS</h2><div id="brow-options" class="option-row"></div></div>
            <div class="feature panel" id="nose-section"><h2>NOSE</h2><div id="nose-options" class="option-row"></div></div>
            <div class="feature panel" id="mouth-section"><h2>MOUTH</h2><div id="mouth-options" class="option-row"></div></div>
          </section>
        </main>
        <footer class="bottombar">
          <div><strong>Triangle-first character data</strong><small>Every visible part is compiled to reusable flat polygon buffers.</small></div>
          <div class="save-slots"><span>SAVE SLOT</span>${[1,2,3,4].map(n=>`<button data-slot="${n}" class="${n===1?'selected':''}">${n}</button>`).join('')}</div>
        </footer>
      </div>`;
    const preview=this.root.querySelector<HTMLElement>('#preview'); if(!preview) throw new Error('Preview host missing');
    this.renderer=new CharacterRenderer(preview);
    this.root.addEventListener('click',this.onClick);
    this.renderUI(); this.renderer.setCharacter(this.state);
  }

  private onClick=(ev:Event)=>{
    const target=(ev.target as HTMLElement).closest<HTMLElement>('button'); if(!target) return;
    const action=target.dataset.action; if(action==='randomize'){this.randomize();return;} if(action==='undo'){this.undo();return;} if(action==='export'){this.export();return;}
    const slot=target.dataset.slot; if(slot){this.saveToSlot(Number(slot));return;}
    const focus=target.dataset.focus; if(focus){this.focusSection(focus,target);return;}
    const kind=target.dataset.kind,id=target.dataset.id; if(kind&&id){this.pushHistory(); this.applySelection(kind,id); this.commit();return;}
    const colorKind=target.dataset.colorKind,color=target.dataset.color; if(colorKind&&color){this.pushHistory(); this.applyColor(colorKind,color); this.commit();}
  };

  private pushHistory(){ this.history.push(clone(this.state)); if(this.history.length>40)this.history.shift(); }
  private commit(){ this.renderUI(); this.renderer.setCharacter(this.state); }
  private applySelection(kind:string,id:string){
    if(kind==='hair')this.state.hairStyle=id as CharacterDefinition['hairStyle'];
    else if(kind==='face')this.state.faceShape=id as CharacterDefinition['faceShape'];
    else if(kind==='eye')this.state.eyeStyle=id as CharacterDefinition['eyeStyle'];
    else if(kind==='brow')this.state.browStyle=id as CharacterDefinition['browStyle'];
    else if(kind==='nose')this.state.noseStyle=id as CharacterDefinition['noseStyle'];
    else if(kind==='mouth')this.state.mouthStyle=id as CharacterDefinition['mouthStyle'];
  }
  private applyColor(kind:string,color:string){ if(kind==='hair'){this.state.colors.hair=color;this.state.colors.brows=color;} else if(kind==='eyes')this.state.colors.eyes=color; else if(kind==='skin')this.state.colors.skin=color; else if(kind==='jacket')this.state.colors.jacket=color; }
  private randomize(){ this.pushHistory(); this.state.hairStyle=pick(HAIR_OPTIONS).id; this.state.faceShape=pick(FACE_OPTIONS).id; this.state.eyeStyle=pick(EYE_OPTIONS).id; this.state.browStyle=pick(BROW_OPTIONS).id; this.state.noseStyle=pick(NOSE_OPTIONS).id; this.state.mouthStyle=pick(MOUTH_OPTIONS).id; this.state.colors.hair=pick(HAIR_COLORS); this.state.colors.brows=this.state.colors.hair; this.state.colors.eyes=pick(EYE_COLORS); this.state.colors.skin=pick(SKIN_COLORS); this.state.colors.jacket=pick(JACKET_COLORS); this.commit(); }
  private undo(){ const prev=this.history.pop(); if(prev){this.state=prev;this.commit();} }
  private export(){ const bundle=exportCharacterBundle(this.state); const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url;a.download='polygon-character.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),0); }
  private saveToSlot(slot:number){ this.activeSlot=slot; localStorage.setItem(`face-editor:slot:${slot}`,JSON.stringify(this.state)); this.renderUI(); }
  private focusSection(name:string,button:HTMLElement){ this.root.querySelectorAll('.category-rail button').forEach(x=>x.classList.remove('active'));button.classList.add('active'); const id=name==='outline'?'outline-section':`${name}-section`; this.root.querySelector(`#${id}`)?.scrollIntoView({behavior:'smooth',block:'nearest'}); }

  private renderUI(){
    this.setHTML('#hair-options',buttons('hair',HAIR_OPTIONS,this.state.hairStyle)); this.setHTML('#hair-colors',swatches('hair',HAIR_COLORS,this.state.colors.hair));
    this.setHTML('#skin-colors',swatches('skin',SKIN_COLORS,this.state.colors.skin)); this.setHTML('#jacket-colors',swatches('jacket',JACKET_COLORS,this.state.colors.jacket));
    this.setHTML('#face-options',buttons('face',FACE_OPTIONS,this.state.faceShape)); this.setHTML('#eye-options',buttons('eye',EYE_OPTIONS,this.state.eyeStyle)); this.setHTML('#eye-colors',swatches('eyes',EYE_COLORS,this.state.colors.eyes));
    this.setHTML('#brow-options',buttons('brow',BROW_OPTIONS,this.state.browStyle)); this.setHTML('#nose-options',buttons('nose',NOSE_OPTIONS,this.state.noseStyle)); this.setHTML('#mouth-options',buttons('mouth',MOUTH_OPTIONS,this.state.mouthStyle));
    this.root.querySelectorAll<HTMLButtonElement>('[data-slot]').forEach(b=>b.classList.toggle('selected',Number(b.dataset.slot)===this.activeSlot));
  }
  private setHTML(selector:string,html:string){ const el=this.root.querySelector(selector); if(el)el.innerHTML=html; }
  dispose(){ this.root.removeEventListener('click',this.onClick);this.renderer.dispose(); }
}
