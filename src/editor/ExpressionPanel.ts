import type { CharacterDefinition, CharacterExpressionSet, ExpressionId } from '../core/types';
import { applyExpression, cloneExpressionSet, DEFAULT_EXPRESSION_SET, EXPRESSION_ORDER } from '../core/expressionSystem';

export interface ExpressionEditorBridge{
  getCharacter():CharacterDefinition;
  setPreviewTransformer(transformer:((definition:CharacterDefinition)=>CharacterDefinition)|null):void;
  setExpressionExportState(active:ExpressionId,set:CharacterExpressionSet):void;
}

const ICONS:Record<ExpressionId,string>={neutral:'•',smile:'⌣',happy:'✦',angry:'⌁',sad:'⌢',surprised:'○',serious:'—',blink:'⌒'};

export class ExpressionPanel{
  private active:ExpressionId='neutral';
  private host:HTMLElement;
  private set=cloneExpressionSet(DEFAULT_EXPRESSION_SET);

  constructor(root:HTMLElement,private bridge:ExpressionEditorBridge){
    const preview=root.querySelector<HTMLElement>('.preview-panel');
    if(!preview)throw new Error('Expression preview host missing');
    this.host=document.createElement('section');
    this.host.className='expression-bar';
    this.host.setAttribute('aria-label','Expression System');
    preview.append(this.host);
    this.host.addEventListener('click',this.onClick);
    this.apply();
    this.render();
  }

  private onClick=(event:Event)=>{
    const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-expression]');
    if(!button)return;
    const id=button.dataset.expression as ExpressionId;
    if(!EXPRESSION_ORDER.includes(id))return;
    this.active=id;
    this.apply();
    this.render();
  };

  private apply(){
    const active=this.active,set=this.set;
    this.bridge.setPreviewTransformer(definition=>applyExpression(definition,active,set));
    this.bridge.setExpressionExportState(active,set);
  }

  private render(){
    const selected=this.set.expressions[this.active];
    this.host.innerHTML=`
      <div class="expression-heading"><strong>EXPRESSION</strong><span>${selected.label}</span></div>
      <div class="expression-buttons" role="group" aria-label="Expression presets">
        ${EXPRESSION_ORDER.map(id=>{const item=this.set.expressions[id];return`<button type="button" data-expression="${id}" class="${id===this.active?'selected':''}" aria-pressed="${id===this.active?'true':'false'}" title="${item.description}"><span>${ICONS[id]}</span><small>${item.label}</small></button>`;}).join('')}
      </div>`;
  }

  getActiveExpression(){return this.active;}
  getExpressionSet(){return cloneExpressionSet(this.set);}

  dispose(){
    this.host.removeEventListener('click',this.onClick);
    this.bridge.setPreviewTransformer(null);
    this.host.remove();
  }
}
