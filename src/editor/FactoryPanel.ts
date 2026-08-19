import type { CharacterDefinition } from '../core/types';
import { FACTORY_STYLES, createVariationBatch, generateFactoryBatch, type FactoryCandidate, type FactoryLock, type FactoryStyleId } from '../core/characterFactory';
import { selectFactoryDisplayCandidates } from '../core/factoryDisplayGate';
import { renderFactoryThumbnail } from '../render/FactoryThumbnailRenderer';

interface FactoryBridge{getCharacter():CharacterDefinition;applyCharacter(definition:CharacterDefinition):void}
interface SavedFactoryCharacter{savedAt:string;seed:string;style:FactoryStyleId;scores:FactoryCandidate['scores'];definition:CharacterDefinition;signature:string}
const FAVORITES_KEY='face-editor:factory:favorites:v1';
const clone=<T>(value:T):T=>structuredClone(value);

export class FactoryPanel{
  private panel:HTMLElement;
  private launchButton:HTMLButtonElement;
  private candidates:FactoryCandidate[]=[];
  private selected=0;
  private style:FactoryStyleId='cool';
  private seed=`factory-${Date.now().toString(36)}`;
  private locks=new Set<FactoryLock>(['face']);
  private open=false;
  private variationAnchor:CharacterDefinition|null=null;

  constructor(private root:HTMLElement,private bridge:FactoryBridge){
    const actions=root.querySelector('.top-actions');
    this.launchButton=document.createElement('button');this.launchButton.type='button';this.launchButton.dataset.factoryOpen='1';this.launchButton.innerHTML='✦<small>FACTORY</small>';actions?.prepend(this.launchButton);
    this.panel=document.createElement('section');this.panel.className='factory-panel';this.panel.hidden=true;this.panel.setAttribute('aria-label','Character Factory');root.querySelector('.app-shell')?.append(this.panel);
    this.root.addEventListener('click',this.onClick);this.panel.addEventListener('change',this.onChange);
    this.render();
  }

  private onClick=(event:Event)=>{
    const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
    if(button.dataset.factoryOpen){this.show();return;}
    if(!this.panel.contains(button))return;
    const action=button.dataset.factoryAction;
    if(action==='close'){this.hide();return;}
    if(action==='generate'){this.variationAnchor=null;this.generate(false);return;}
    if(action==='variations'){this.generate(true);return;}
    if(action==='use'){this.useSelected();return;}
    if(action==='keep'){this.keepSelected();return;}
    if(action==='new-seed'){this.seed=`factory-${Date.now().toString(36)}-${Math.floor(Math.random()*1e6).toString(36)}`;this.variationAnchor=null;this.generate(false);return;}
    const style=button.dataset.factoryStyle as FactoryStyleId|undefined;if(style){this.style=style;this.variationAnchor=null;this.generate(false);return;}
    const lock=button.dataset.factoryLock as FactoryLock|undefined;if(lock){this.locks.has(lock)?this.locks.delete(lock):this.locks.add(lock);this.render();return;}
    const index=button.dataset.factoryIndex;if(index!==undefined){this.selected=Math.max(0,Math.min(this.candidates.length-1,Number(index)));this.render();}
  };
  private onChange=(event:Event)=>{const input=(event.target as HTMLElement).closest<HTMLInputElement>('[data-factory-seed]');if(input){this.seed=input.value.trim()||`factory-${Date.now().toString(36)}`;this.variationAnchor=null;this.generate(false);}};

  private show(){this.open=true;this.panel.hidden=false;if(!this.candidates.length)this.generate(false);else this.render();}
  private hide(){this.open=false;this.panel.hidden=true;}
  private buildSafeBatch(variation:boolean,anchor:CharacterDefinition|undefined,locks:FactoryLock[]){
    const make=(suffix:string)=>variation?createVariationBatch(anchor!,{seed:`${this.seed}:variation:${suffix}`,style:this.style,count:24,poolSize:160,locks,qualityFloor:72}):generateFactoryBatch({seed:`${this.seed}:${suffix}`,style:this.style,count:24,poolSize:160,qualityFloor:72});
    const first=selectFactoryDisplayCandidates(make('primary'),12);if(first.length>=12)return first;
    const signatures=new Set(first.map(candidate=>candidate.signature)),combined=[...first];
    for(const candidate of selectFactoryDisplayCandidates(make('refill'),24)){if(signatures.has(candidate.signature))continue;signatures.add(candidate.signature);combined.push(candidate);if(combined.length>=12)break;}
    return combined;
  }
  private generate(variation:boolean){
    const anchor=variation?(this.candidates[this.selected]?.definition??this.bridge.getCharacter()):undefined;
    if(variation)this.variationAnchor=clone(anchor!);else this.variationAnchor=null;
    const locks=variation?[...this.locks]:[];
    this.candidates=this.buildSafeBatch(variation,anchor,locks);
    this.selected=0;this.render();
  }
  private useSelected(){const candidate=this.candidates[this.selected];if(!candidate)return;this.bridge.applyCharacter(clone(candidate.definition));this.hide();}
  private readFavorites():SavedFactoryCharacter[]{try{const value=JSON.parse(localStorage.getItem(FAVORITES_KEY)??'[]');return Array.isArray(value)?value:[];}catch{return[];}}
  private keepSelected(){const candidate=this.candidates[this.selected];if(!candidate)return;const favorites=this.readFavorites().filter(item=>item.signature!==candidate.signature);favorites.unshift({savedAt:new Date().toISOString(),seed:candidate.seed,style:candidate.style,scores:candidate.scores,definition:clone(candidate.definition),signature:candidate.signature});localStorage.setItem(FAVORITES_KEY,JSON.stringify(favorites.slice(0,48)));this.render('KEPT — seed and CharacterDefinition saved locally');}

  private render(message=''){
    if(!this.open&&this.panel.hidden)return;
    const selected=this.candidates[this.selected],favoriteCount=this.readFavorites().length,lockOrder:FactoryLock[]=['face','hair','outfit','colors'];
    this.panel.innerHTML=`
      <div class="factory-shell">
        <header class="factory-header">
          <div><span class="factory-kicker">CHARACTER FACTORY v1</span><h1>QUALITY-GATED CHARACTER GENERATOR</h1><p>Generate many internally, then show only the strongest and most different candidates.</p></div>
          <button class="factory-close" data-factory-action="close" aria-label="Close factory">×</button>
        </header>
        <div class="factory-controls">
          <div class="factory-control-group"><label>STYLE RECIPE</label><div class="factory-style-row">${FACTORY_STYLES.map(recipe=>`<button data-factory-style="${recipe.id}" class="${recipe.id===this.style?'selected':''}" title="${recipe.description}">${recipe.label}</button>`).join('')}</div></div>
          <div class="factory-control-group seed-group"><label>SEED</label><div><input data-factory-seed value="${this.escape(this.seed)}" aria-label="Factory seed"><button data-factory-action="new-seed">NEW SEED</button></div></div>
          <div class="factory-control-group"><label>VARIATION LOCKS</label><div class="factory-lock-row">${lockOrder.map(lock=>`<button data-factory-lock="${lock}" class="${this.locks.has(lock)?'selected':''}">${lock.toUpperCase()}</button>`).join('')}</div></div>
          <button class="factory-generate" data-factory-action="generate">GENERATE 12</button>
        </div>
        <div class="factory-status"><span>POOL 160×2 → SAFE TOP 12</span><span>QUALITY FLOOR 72</span><span>DISPLAY SAFETY GATE ON</span><span>DIVERSITY RANKING ON</span><span>★ ${favoriteCount} KEPT</span>${this.variationAnchor?'<strong>VARIATION MODE</strong>':''}${message?`<strong>${message}</strong>`:''}</div>
        <div class="factory-grid">${this.candidates.map((candidate,index)=>`<button class="factory-card ${index===this.selected?'selected':''}" data-factory-index="${index}" aria-label="Candidate ${index+1}"><canvas class="factory-thumb" data-factory-thumb="${index}"></canvas><div class="factory-card-meta"><strong>#${String(index+1).padStart(2,'0')}</strong><span>Q ${Math.round(candidate.scores.quality)}</span><span>H ${Math.round(candidate.scores.harmony)}</span><span>U ${Math.round(candidate.scores.diversity)}</span></div></button>`).join('')}</div>
        <footer class="factory-footer">
          <div class="factory-selected">${selected?`<strong>SELECTED #${String(this.selected+1).padStart(2,'0')}</strong><span>${selected.style.toUpperCase()} · seed ${this.escape(selected.seed.slice(-24))}</span><span>Quality ${selected.scores.quality.toFixed(1)} · Harmony ${selected.scores.harmony.toFixed(1)} · Diversity ${selected.scores.diversity.toFixed(1)}</span>`:'<strong>NO SAFE CANDIDATES — loosen locks or use a new seed</strong>'}</div>
          <div class="factory-footer-actions"><button data-factory-action="keep" ${selected?'':'disabled'}>★ KEEP</button><button data-factory-action="variations" ${selected?'':'disabled'}>VARIATIONS</button><button class="factory-use" data-factory-action="use" ${selected?'':'disabled'}>USE THIS CHARACTER</button></div>
        </footer>
      </div>`;
    requestAnimationFrame(()=>this.renderThumbnails());
  }
  private renderThumbnails(){this.panel.querySelectorAll<HTMLCanvasElement>('[data-factory-thumb]').forEach(canvas=>{const candidate=this.candidates[Number(canvas.dataset.factoryThumb)];if(candidate)renderFactoryThumbnail(canvas,candidate.definition);});}
  private escape(value:string){return value.replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]??char));}
  dispose(){this.root.removeEventListener('click',this.onClick);this.panel.removeEventListener('change',this.onChange);this.panel.remove();this.launchButton.remove();}
}
