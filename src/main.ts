import './styles.css';
import './factory.css';
import './expression.css';
import './body-proportions.css';
import { EditorApp } from './editor/EditorApp';
import { FactoryPanel } from './editor/FactoryPanel';
import { ExpressionPanel } from './editor/ExpressionPanel';

const root=document.querySelector<HTMLElement>('#app');
if(!root) throw new Error('App root not found');
const editor=new EditorApp(root);

new FactoryPanel(root,{
  getCharacter:()=>editor.getCharacterDefinition(),
  applyCharacter:(definition)=>editor.applyCharacterDefinition(definition),
});

const expressionPanel=new ExpressionPanel(root,{
  getCharacter:()=>editor.getCharacterDefinition(),
  setPreviewTransformer:(transformer)=>editor.setPreviewTransformer(transformer),
  setExpressionExportState:(active,set)=>editor.setExpressionExportState(active,set),
});
editor.setExpressionRestoreHandler((active,set)=>expressionPanel.applyExpressionState(active,set));
