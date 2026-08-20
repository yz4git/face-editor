import './styles.css';
import './factory.css';
import './expression.css';
import './body-proportions.css';
import './motion.css';
import './cutscene.css';
import './ux-polish.css';
import './ux-focus-workspace.css';
import './preview-first-v2.css';
import './character-expansion.css';
import './accessory-pack.css';
import './iphone-portrait.css';
import { applyClothingFactoryBias } from './core/clothingFactoryBias';
import { EditorApp } from './editor/EditorApp';
import { FactoryPanel } from './editor/FactoryPanel';
import { ExpressionPanel } from './editor/ExpressionPanel';
import { MotionPanel } from './editor/MotionPanel';
import { CutscenePanel } from './editor/CutscenePanel';
import { UxPolishController } from './editor/UxPolishController';
import { CharacterExpansionPanel } from './editor/CharacterExpansionPanel';

applyClothingFactoryBias();
const root=document.querySelector<HTMLElement>('#app');
if(!root) throw new Error('App root not found');
const editor=new EditorApp(root);
new UxPolishController(root);
const expansionPanel=new CharacterExpansionPanel(root,{
  getCharacter:()=>editor.getCharacterDefinition(),
  applyCharacter:(definition)=>editor.applyCharacterDefinition(definition),
});

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

const cutscenePanel=new CutscenePanel(root,{
  getCharacter:()=>editor.getCharacterDefinition(),
  getExpressionSet:()=>expressionPanel.getExpressionSet(),
  getExpression:()=>expressionPanel.getActiveExpression(),
  driveExpression:(expression)=>expressionPanel.driveCutscene(expression),
  releaseExpression:()=>expressionPanel.releaseCutsceneDrive(),
  getMotion:()=>motionPanel.getMotionState(),
  driveMotion:(pose,action,timeMs,playing)=>motionPanel.driveCutscene(pose,action,timeMs,playing),
  releaseMotion:()=>motionPanel.releaseCutsceneDrive(),
  setProject:(project)=>editor.setCutsceneExportState(project),
});
editor.setCutsceneRestoreHandler(project=>cutscenePanel.applyProject(project));

new FactoryPanel(root,{
  getCharacter:()=>editor.getCharacterDefinition(),
  applyCharacter:(definition,motion)=>{
    const activeExpression=expressionPanel.getActiveExpression();
    editor.applyCharacterDefinition(definition);
    expansionPanel.refresh();
    if(activeExpression==='neutral')expressionPanel.applyExpressionState(motion.expression,expressionPanel.getExpressionSet());
    motionPanel.applyFactoryProfile(motion);
  },
});
