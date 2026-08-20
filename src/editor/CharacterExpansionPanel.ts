import { ACCENT_COLORS, EAR_ACCESSORY_OPTIONS, EYEWEAR_OPTIONS, FACE_DETAIL_OPTIONS, HAIR_BACK_OPTIONS, HAIR_EXTRA_OPTIONS, HARDWARE_COLORS, HEADWEAR_OPTIONS, SECONDARY_COLORS, SHIRT_COLORS, TRIM_COLORS, hardwareColor, normalizeAccessories, normalizeClothingLayers, normalizeHairModular, secondaryColor, setAccessories, setHairModular, shirtColor, trimColor } from '../core/characterExpansion';
import type { CharacterDefinition } from '../core/types';

interface CharacterExpansionBridge{
  getCharacter():CharacterDefinition;
  applyCharacter(definition:CharacterDefinition):void;
}

type AccessoryFamily='headwear'|'eyewear'|'faceDetail'|'earAccessory';
type ClothingColorKind='shirt'|'trim'|'secondary'|'hardware'|'accent';
const ACCESSORY_FAMILIES:readonly {id:AccessoryFamily;label:string;longLabel:string}[]=[
  {id:'headwear',label:'HEAD',longLabel:'HEADWEAR'},
  {id:'eyewear',label:'EYES',longLabel:'EYEWEAR'},
  {id:'faceDetail',label:'FACE',longLabel:'FACE DETAIL'},
  {id:'earAccessory',label:'EARS',longLabel:'EAR ACCESSORY'},
];

const clone=<T>(value:T):T=>structuredClone(value);
const swatches=(kind:ClothingColorKind,items:readonly string[],selected:string)=>items.map(color=>`<button type="button" class="expansion-swatch ${color.toLowerCase()===selected.toLowerCase()?'selected':''}" data-clothing-color="${kind}" data-color="${color}" style="--expansion-swatch:${color}" aria-label="${kind} ${color}"></button>`).join('');

export class CharacterExpansionPanel{
  private host:HTMLElement;
  private colorHost:HTMLElement;
  private hairHost:HTMLElement;
  private accessoryHost:HTMLElement;
  private accessoryButton:HTMLButtonElement;
  private activeAccessoryFamily:AccessoryFamily='headwear';

  constructor(private root:HTMLElement,private bridge:CharacterExpansionBridge){
    const outfit=root.querySelector<HTMLElement>('#outfit-section'),hair=root.querySelector<HTMLElement>('#hair-section'),right=root.querySelector<HTMLElement>('.right-panel'),rail=root.querySelector<HTMLElement>('.category-rail');
    if(!outfit||!hair||!right||!rail)throw new Error('Expansion editor host missing');
    this.host=document.createElement('section');this.host.id='minimal-layer-pack';this.host.className='expansion-card minimal-layer-pack';
    this.colorHost=document.createElement('section');this.colorHost.id='clothing-color-system-v3';this.colorHost.className='expansion-card clothing-color-system';
    this.hairHost=document.createElement('section');this.hairHost.id='hair-modular-v1';this.hairHost.className='expansion-card hair-modular-card';
    this.accessoryHost=document.createElement('section');this.accessoryHost.id='accessory-section';this.accessoryHost.className='feature accessory-feature';
    this.accessoryButton=document.createElement('button');this.accessoryButton.type='button';this.accessoryButton.dataset.focus='accessory';this.accessoryButton.innerHTML='<span>◇</span>ACCESSORY';this.accessoryButton.setAttribute('aria-label','Accessory Pack');
    outfit.prepend(this.colorHost);outfit.prepend(this.host);hair.append(this.hairHost);right.append(this.accessoryHost);rail.append(this.accessoryButton);
    this.root.addEventListener('click',this.onClick);this.render();
  }

  private onClick=(event:Event)=>{
    const target=event.target as HTMLElement;
    const familyButton=target.closest<HTMLButtonElement>('button[data-accessory-family]');
    if(familyButton&&this.accessoryHost.contains(familyButton)){
      const family=familyButton.dataset.accessoryFamily as AccessoryFamily;
      if(ACCESSORY_FAMILIES.some(item=>item.id===family)){this.activeAccessoryFamily=family;this.render();}
      return;
    }
    const layerButton=target.closest<HTMLButtonElement>('button[data-minimal-layer]');
    if(layerButton&&this.host.contains(layerButton)){
      const definition=clone(this.bridge.getCharacter()),layers=normalizeClothingLayers(definition.clothingLayers),key=layerButton.dataset.minimalLayer;
      if(key==='outer')layers.outer=layers.outer==='outfit'?'shirt-only':'outfit';
      else if(key==='hood')layers.hood=!layers.hood;
      else if(key==='strap')layers.strap=!layers.strap;
      else if(key==='accent')layers.accent=!layers.accent;
      definition.clothingLayers=layers;this.bridge.applyCharacter(definition);this.render();return;
    }
    const colorButton=target.closest<HTMLButtonElement>('button[data-clothing-color][data-color]');
    if(colorButton&&this.colorHost.contains(colorButton)){
      const definition=clone(this.bridge.getCharacter()),kind=colorButton.dataset.clothingColor as ClothingColorKind,color=colorButton.dataset.color;
      if(!color)return;
      if(kind==='shirt')definition.colors.shirt=color;
      else if(kind==='trim')definition.colors.trim=color;
      else if(kind==='secondary')definition.colors.secondary=color;
      else if(kind==='hardware')definition.colors.hardware=color;
      else definition.colors.accent=color;
      this.bridge.applyCharacter(definition);this.render();return;
    }
    const hairButton=target.closest<HTMLButtonElement>('button[data-hair-modular][data-id]');
    if(hairButton&&this.hairHost.contains(hairButton)){
      const definition=clone(this.bridge.getCharacter()),state=normalizeHairModular(definition),kind=hairButton.dataset.hairModular,id=hairButton.dataset.id;
      if(kind==='back'&&HAIR_BACK_OPTIONS.some(item=>item.id===id))state.back=id as typeof state.back;
      if(kind==='extra'&&HAIR_EXTRA_OPTIONS.some(item=>item.id===id))state.extra=id as typeof state.extra;
      setHairModular(definition,state);this.bridge.applyCharacter(definition);this.render();return;
    }
    const accessoryButton=target.closest<HTMLButtonElement>('button[data-accessory-kind][data-id]');
    if(accessoryButton&&this.accessoryHost.contains(accessoryButton)){
      const definition=clone(this.bridge.getCharacter()),state=normalizeAccessories(definition),kind=accessoryButton.dataset.accessoryKind,id=accessoryButton.dataset.id;
      if(kind==='headwear'&&HEADWEAR_OPTIONS.some(item=>item.id===id))state.headwear=id as typeof state.headwear;
      if(kind==='eyewear'&&EYEWEAR_OPTIONS.some(item=>item.id===id))state.eyewear=id as typeof state.eyewear;
      if(kind==='faceDetail'&&FACE_DETAIL_OPTIONS.some(item=>item.id===id))state.faceDetail=id as typeof state.faceDetail;
      if(kind==='earAccessory'&&EAR_ACCESSORY_OPTIONS.some(item=>item.id===id))state.earAccessory=id as typeof state.earAccessory;
      setAccessories(definition,state);this.bridge.applyCharacter(definition);this.render();return;
    }
    queueMicrotask(()=>this.render());
  };

  refresh(){this.render();}

  private render(){
    if(!this.host.isConnected)return;
    const definition=this.bridge.getCharacter(),layers=normalizeClothingLayers(definition.clothingLayers),hair=normalizeHairModular(definition),accessories=normalizeAccessories(definition);
    const toggle=(key:string,label:string,on:boolean,onLabel:string,offLabel:string)=>`<button type="button" data-minimal-layer="${key}" class="${on?'selected minimal-on':'minimal-off'}" aria-pressed="${on}"><strong>${label}</strong><span>${on?onLabel:offLabel}</span></button>`;
    this.host.innerHTML=`<div class="expansion-card-heading"><div><strong>MINIMAL LAYER PACK</strong><small>REMOVE LAYERS WITHOUT LOSING THEIR STYLE CHOICE</small></div></div><div class="minimal-layer-grid">${toggle('outer','OUTER',layers.outer==='outfit','JACKET ON','SHIRT ONLY')}${toggle('hood','COLLAR / HOOD',layers.hood,'ON','NONE')}${toggle('strap','STRAP / HARNESS',layers.strap,'ON','NONE')}${toggle('accent','ACCENT',layers.accent,'ON','NONE')}</div>`;
    this.colorHost.innerHTML=`<div class="expansion-card-heading"><div><strong>CLOTHING COLOR SYSTEM v3</strong><small>PRIMARY / INNER / SECONDARY / HARDWARE / ACCENT</small></div></div><label class="expansion-color-row"><strong>INNER</strong><div>${swatches('shirt',SHIRT_COLORS,shirtColor(definition))}</div></label><label class="expansion-color-row"><strong>TRIM</strong><div>${swatches('trim',TRIM_COLORS,trimColor(definition))}</div></label><label class="expansion-color-row"><strong>SECONDARY</strong><div>${swatches('secondary',SECONDARY_COLORS,secondaryColor(definition))}</div></label><label class="expansion-color-row"><strong>HARDWARE</strong><div>${swatches('hardware',HARDWARE_COLORS,hardwareColor(definition))}</div></label><label class="expansion-color-row"><strong>ACCENT</strong><div>${swatches('accent',ACCENT_COLORS,definition.colors.accent)}</div></label>`;
    const hairOption=(kind:'back'|'extra',id:string,label:string,selected:boolean)=>`<button type="button" data-hair-modular="${kind}" data-id="${id}" class="${selected?'selected':''}" aria-pressed="${selected}">${label}</button>`;
    this.hairHost.innerHTML=`<div class="expansion-card-heading"><div><strong>HAIR MODULAR v1.1</strong><small>HAIRSTYLE ABOVE = FRONT / TOP PRESET</small></div></div><div class="hair-modular-row"><strong>BACK</strong><div>${HAIR_BACK_OPTIONS.map(item=>hairOption('back',item.id,item.label,item.id===hair.back)).join('')}</div></div><div class="hair-modular-row"><strong>EXTRA</strong><div>${HAIR_EXTRA_OPTIONS.map(item=>hairOption('extra',item.id,item.label,item.id===hair.extra)).join('')}</div></div>`;
    const accOption=(kind:AccessoryFamily,id:string,label:string,selected:boolean)=>`<button type="button" data-accessory-kind="${kind}" data-id="${id}" class="${selected?'selected':''}" aria-pressed="${selected}"><span>${label}</span></button>`;
    const family=ACCESSORY_FAMILIES.find(item=>item.id===this.activeAccessoryFamily)!;
    const options=this.activeAccessoryFamily==='headwear'?HEADWEAR_OPTIONS:this.activeAccessoryFamily==='eyewear'?EYEWEAR_OPTIONS:this.activeAccessoryFamily==='faceDetail'?FACE_DETAIL_OPTIONS:EAR_ACCESSORY_OPTIONS;
    const selected=this.activeAccessoryFamily==='headwear'?accessories.headwear:this.activeAccessoryFamily==='eyewear'?accessories.eyewear:this.activeAccessoryFamily==='faceDetail'?accessories.faceDetail:accessories.earAccessory;
    this.accessoryHost.innerHTML=`<div class="accessory-pack-heading"><div><h2>ACCESSORY PACK v1.1</h2><small>ONE FAMILY AT A TIME · PREVIEW FIRST</small></div></div><div class="accessory-family-tabs" role="tablist" aria-label="Accessory family">${ACCESSORY_FAMILIES.map(item=>`<button type="button" role="tab" data-accessory-family="${item.id}" class="${item.id===this.activeAccessoryFamily?'selected':''}" aria-selected="${item.id===this.activeAccessoryFamily}">${item.label}</button>`).join('')}</div><div class="accessory-pack-body"><div class="accessory-pack-row" data-family="${family.id}"><strong>${family.longLabel}</strong><div>${options.map(item=>accOption(this.activeAccessoryFamily,item.id,item.label,item.id===selected)).join('')}</div></div></div>`;
  }

  dispose(){this.root.removeEventListener('click',this.onClick);this.host.remove();this.colorHost.remove();this.hairHost.remove();this.accessoryHost.remove();this.accessoryButton.remove();}
}
