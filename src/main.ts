import './styles.css';
import './factory.css';
import './expression.css';
import './body-proportions.css';
import './motion.css';
import { EditorApp } from './editor/EditorApp';
import { FactoryPanel } from './editor/FactoryPanel';
import { ExpressionPanel } from './editor/ExpressionPanel';
import { MotionPanel } from './editor/MotionPanel';

const root=document.querySelector<HTMLElement>('#app');
if(!root) throw new Error('App root not found');
const editor=new EditorApp(root);

const expressionPanel=new ExpressionPanel(root,{
  getCharacter:()=>editor.getCharacterDefinition(),
  setPreviewTransformer:(transformer)=>editor.setPreviewTransformer(transformer),
  setExpressionExportState:(active,set)=>editor.setExpressionExportState(active,set),
});
editor.setExpressionRestoreHandler((active,set)=>expressionPanel.applyExpressionState(active,set));

const motionPanel=new MotionPanel(root,{
  getCharacter:()=>editor.getCharacterDefinition(),
  getExpressionSet:()=>expressionPanel.getExpressionSet(),
  setCompiledPreviewMutator:(mutator)=>editor.setCompiledPreviewMutator(mutator),
  setAnimationTime:(timeMs)=>editor.setAnimationTime(timeMs),
  setMotionExportState:(state)=>editor.setMotionExportState(state),
});
editor.setMotionRestoreHandler(state=>motionPanel.applyMotionState(state));

new FactoryPanel(root,{
  getCharacter:()=>editor.getCharacterDefinition(),
  applyCharacter:(definition,motion)=>{
    editor.applyCharacterDefinition(definition);
    expressionPanel.applyExpressionState(motion.expression,expressionPanel.getExpressionSet());
    motionPanel.applyFactoryProfile(motion);
  },
});
