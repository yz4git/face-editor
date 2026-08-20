import { ACCENT_COLORS, SHIRT_COLORS, TRIM_COLORS, normalizeClothingLayers, shirtColor, trimColor } from '../core/characterExpansion';
import type { CharacterDefinition } from '../core/types';

interface CharacterExpansionBridge{
  getCharacter():CharacterDefinition;
  applyCharacter(definition:CharacterDefinition):void;
}

const clone=<T>(value:T):T=>structuredClone(value);
const swatches=(kind:'shirt'|'trim'|'accent',items:readonly string[],selected:string)=>items.map(color=>`<button type="button" class="expansion-swatch ${color.toLowerCase()===selected.toLowerCase()?'selected':''}" data-clothing-color="${kind}" data-color="${color}" style="--expansion-swatch:${color}" aria-label="${kind} ${color}"></button>`).join('');

export class CharacterExpansionPanel{
  private host:HTMLElement;
  private colorHost:HTMLElement;

  constructor(private root:HTMLElement,private bridge:CharacterExpansionBridge){
    const outfit=root.querySelector<HTMLElement>('#outfit-section');
    if(!outfit)throw new Error('Expansion outfit host missing');
    this.host=document.createElement('section');
    this.host.id='minimal-layer-pack';
    this.host.className='expansion-card minimal-layer-pack';
    this.colorHost=document.createElement('section');
    this.colorHost.id='clothing-color-system-v2';
    this.colorHost.className='expansion-card clothing-color-system';
    outfit.prepend(this.colorHost);
    outfit.prepend(this.host);
    this.root.addEventListener('click',this.onClick);
    this.render();
  }

  private onClick=(event:Event)=>{
    const target=event.target as HTMLElement;
    const layerButton=target.closest<HTMLButtonElement>('button[data-minimal-layer]');
    if(layerButton&&this.host.contains(layerButton)){
      const definition=clone(this.bridge.getCharacter()),layers=normalizeClothingLayers(definition.clothingLayers),key=layerButton.dataset.minimalLayer;
      if(key==='outer')layers.outer=layers.outer==='outfit'?'shirt-only':'outfit';
      else if(key==='hood')layers.hood=!layers.hood;
      else if(key==='strap')layers.strap=!layers.strap;
      else if(key==='accent')layers.accent=!layers.accent;
      definition.clothingLayers=layers;
      this.bridge.applyCharacter(definition);
      this.render();
      return;
    }
    const colorButton=target.closest<HTMLButtonElement>('button[data-clothing-color][data-color]');
    if(colorButton&&this.colorHost.contains(colorButton)){
      const definition=clone(this.bridge.getCharacter()),kind=colorButton.dataset.clothingColor as 'shirt'|'trim'|'accent',color=colorButton.dataset.color;
      if(!color)return;
      if(kind==='shirt')definition.colors.shirt=color;
      else if(kind==='trim')definition.colors.trim=color;
      else definition.colors.accent=color;
      this.bridge.applyCharacter(definition);
      this.render();
      return;
    }
    queueMicrotask(()=>this.render());
  };

  refresh(){this.render();}

  private render(){
    if(!this.host.isConnected)return;
    const definition=this.bridge.getCharacter(),layers=normalizeClothingLayers(definition.clothingLayers);
    const toggle=(key:string,label:string,on:boolean,onLabel:string,offLabel:string)=>`<button type="button" data-minimal-layer="${key}" class="${on?'selected minimal-on':'minimal-off'}" aria-pressed="${on}"><strong>${label}</strong><span>${on?onLabel:offLabel}</span></button>`;
    this.host.innerHTML=`
      <div class="expansion-card-heading"><div><strong>MINIMAL LAYER PACK</strong><small>REMOVE LAYERS WITHOUT LOSING THEIR STYLE CHOICE</small></div></div>
      <div class="minimal-layer-grid">
        ${toggle('outer','OUTER',layers.outer==='outfit','JACKET ON','SHIRT ONLY')}
        ${toggle('hood','COLLAR / HOOD',layers.hood,'ON','NONE')}
        ${toggle('strap','STRAP / HARNESS',layers.strap,'ON','NONE')}
        ${toggle('accent','ACCENT',layers.accent,'ON','NONE')}
      </div>`;
    this.colorHost.innerHTML=`
      <div class="expansion-card-heading"><div><strong>CLOTHING COLOR SYSTEM v2</strong><small>INDEPENDENT INNER / TRIM / ACCENT COLOR</small></div></div>
      <label class="expansion-color-row"><strong>INNER</strong><div>${swatches('shirt',SHIRT_COLORS,shirtColor(definition))}</div></label>
      <label class="expansion-color-row"><strong>TRIM</strong><div>${swatches('trim',TRIM_COLORS,trimColor(definition))}</div></label>
      <label class="expansion-color-row"><strong>ACCENT</strong><div>${swatches('accent',ACCENT_COLORS,definition.colors.accent)}</div></label>`;
  }

  dispose(){this.root.removeEventListener('click',this.onClick);this.host.remove();this.colorHost.remove();}
}
