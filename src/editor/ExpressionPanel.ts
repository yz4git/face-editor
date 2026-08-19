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
  private external:ExpressionId|null=null;
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
    this.external=null;
    this.active=id;
    this.apply();
    this.render();
  };

  private apply(){
    const previewExpression=this.external??this.active,set=this.set;
    this.bridge.setPreviewTransformer(definition=>applyExpression(definition,previewExpression,set));
    this.bridge.setExpressionExportState(this.active,set);
  }

  private render(){
    const previewExpression=this.external??this.active,selected=this.set.expressions[previewExpression];
    this.host.classList.toggle('cutscene-driven',this.external!==null);
    this.host.innerHTML=`
      <div class="expression-heading"><strong>EXPRESSION</strong><span>${selected.label}${this.external!==null?' · CUT':''}</span></div>
      <div class="expression-buttons" role="group" aria-label="Expression presets">
        ${EXPRESSION_ORDER.map(id=>{const item=this.set.expressions[id];return`<button type="button" data-expression="${id}" class="${id===previewExpression?'selected':''}" aria-pressed="${id===previewExpression?'true':'false'}" title="${item.description}"><span>${ICONS[id]}</span><small>${item.label}</small></button>`;}).join('')}
      </div>`;
  }

  getActiveExpression(){return this.active;}
  getPreviewExpression(){return this.external??this.active;}
  getExpressionSet(){return cloneExpressionSet(this.set);}
  driveCutscene(expression:ExpressionId){if(!EXPRESSION_ORDER.includes(expression))return;if(this.external===expression)return;this.external=expression;this.apply();this.render();}
  releaseCutsceneDrive(){if(this.external===null)return;this.external=null;this.apply();this.render();}
  applyExpressionState(active:ExpressionId,set:CharacterExpressionSet){
    if(!EXPRESSION_ORDER.includes(active))return;
    this.external=null;
    this.active=active;
    this.set=cloneExpressionSet(set);
    this.apply();
    this.render();
  }

  dispose(){
    this.host.removeEventListener('click',this.onClick);
    this.bridge.setPreviewTransformer(null);
    this.host.remove();
  }
}
