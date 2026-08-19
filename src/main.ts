import './styles.css';
import { EditorApp } from './editor/EditorApp';
import { FactoryPanel } from './editor/FactoryPanel';
import type { CharacterDefinition } from './core/types';

const root=document.querySelector<HTMLElement>('#app');
if(!root) throw new Error('App root not found');
const editor=new EditorApp(root);

// EditorApp predates Factory mode. Keep Factory v1 as an overlay instead of coupling
// generation logic into the manual editor; this small bridge can become a public
// EditorApp API when the advanced editing pass is introduced.
type FactoryEditorBridge={state:CharacterDefinition;pushHistory():void;commit():void};
const bridge=editor as unknown as FactoryEditorBridge;
new FactoryPanel(root,{
  getCharacter:()=>structuredClone(bridge.state),
  applyCharacter:(definition)=>{bridge.pushHistory();bridge.state=structuredClone(definition);bridge.commit();},
});
