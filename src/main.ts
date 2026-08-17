import './styles.css';
import { EditorApp } from './editor/EditorApp';

const root=document.querySelector<HTMLElement>('#app');
if(!root) throw new Error('App root not found');
new EditorApp(root);
