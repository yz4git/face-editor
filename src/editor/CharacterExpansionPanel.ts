import { normalizeClothingLayers } from '../core/characterExpansion';
import type { CharacterDefinition } from '../core/types';

interface CharacterExpansionBridge{
  getCharacter():CharacterDefinition;
  applyCharacter(definition:CharacterDefinition):void;
}

const clone=<T>(value:T):T=>structuredClone(value);

export class CharacterExpansionPanel{
  private host:HTMLElement;

  constructor(private root:HTMLElement,private bridge:CharacterExpansionBridge){
    const outfit=root.querySelector<HTMLElement>('#outfit-section');
    if(!outfit)throw new Error('Expansion outfit host missing');
    this.host=document.createElement('section');
    this.host.id='minimal-layer-pack';
    this.host.className='expansion-card minimal-layer-pack';
    outfit.prepend(this.host);
    this.root.addEventListener('click',this.onClick);
    this.render();
  }

  private onClick=(event:Event)=>{
    const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-minimal-layer]');
    if(button&&this.host.contains(button)){
      const definition=clone(this.bridge.getCharacter()),layers=normalizeClothingLayers(definition.clothingLayers),key=button.dataset.minimalLayer;
      if(key==='outer')layers.outer=layers.outer==='outfit'?'shirt-only':'outfit';
      else if(key==='hood')layers.hood=!layers.hood;
      else if(key==='strap')layers.strap=!layers.strap;
      else if(key==='accent')layers.accent=!layers.accent;
      definition.clothingLayers=layers;
      this.bridge.applyCharacter(definition);
      this.render();
      return;
    }
    queueMicrotask(()=>this.render());
  };

  refresh(){this.render();}

  private render(){
    if(!this.host.isConnected)return;
    const layers=normalizeClothingLayers(this.bridge.getCharacter().clothingLayers);
    const toggle=(key:string,label:string,on:boolean,onLabel:string,offLabel:string)=>`<button type="button" data-minimal-layer="${key}" class="${on?'selected minimal-on':'minimal-off'}" aria-pressed="${on}"><strong>${label}</strong><span>${on?onLabel:offLabel}</span></button>`;
    this.host.innerHTML=`
      <div class="expansion-card-heading"><div><strong>MINIMAL LAYER PACK</strong><small>REMOVE LAYERS WITHOUT LOSING THEIR STYLE CHOICE</small></div></div>
      <div class="minimal-layer-grid">
        ${toggle('outer','OUTER',layers.outer==='outfit','JACKET ON','SHIRT ONLY')}
        ${toggle('hood','COLLAR / HOOD',layers.hood,'ON','NONE')}
        ${toggle('strap','STRAP / HARNESS',layers.strap,'ON','NONE')}
        ${toggle('accent','ACCENT',layers.accent,'ON','NONE')}
      </div>`;
  }

  dispose(){this.root.removeEventListener('click',this.onClick);this.host.remove();}
}
