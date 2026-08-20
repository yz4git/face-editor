type PreviewFocusMode='all'|'dim'|'solo';
type EditorCategory='outfit'|'hair'|'outline'|'eyes'|'eyebrows'|'nose'|'mouth'|'color'|'accessory';

type PreviewVisibilityDetail={hidden?:string[];dimmed?:string[]}|null;
type UxWindow=Window&{
  __FACE_EDITOR_PREVIEW_FOCUS__?:PreviewFocusMode;
  __FACE_EDITOR_EDITOR_FOCUS__?:boolean;
  __FACE_EDITOR_ACTIVE_CATEGORY__?:EditorCategory;
  __FACE_EDITOR_OUTLINE_INSPECT__?:boolean;
};

const ACCESSORY_LAYERS=['hood','strap','strap-metal','accent','headwear','eyewear','face-detail','ear-accessory'];
const OUTLINE_INSPECT_LAYERS=['hair-back','hair-front','hair-accent','headwear','eyewear','ear-accessory'];
const EDITOR_CATEGORIES:EditorCategory[]=['outfit','hair','outline','eyes','eyebrows','nose','mouth','color','accessory'];

export class UxPolishController{
  private previewHost:HTMLElement;
  private previewPanel:HTMLElement;
  private appShell:HTMLElement;
  private mode:PreviewFocusMode='all';
  private editorFocus=false;
  private activeCategory:EditorCategory='hair';
  private dimButton:HTMLButtonElement;
  private soloButton:HTMLButtonElement;
  private editorFocusButton:HTMLButtonElement;
  private resizeHandler=()=>this.syncViewportHeight();

  constructor(private root:HTMLElement){
    const previewHost=root.querySelector<HTMLElement>('#preview');
    const previewPanel=root.querySelector<HTMLElement>('.preview-panel');
    const footer=root.querySelector<HTMLElement>('.preview-footer');
    const appShell=root.querySelector<HTMLElement>('.app-shell');
    if(!previewHost||!previewPanel||!footer||!appShell)throw new Error('UX polish preview hosts missing');
    this.previewHost=previewHost;this.previewPanel=previewPanel;this.appShell=appShell;

    const tools=document.createElement('div');tools.className='preview-focus-tools';tools.setAttribute('role','group');tools.setAttribute('aria-label','Preview focus controls');
    this.editorFocusButton=document.createElement('button');this.editorFocusButton.type='button';this.editorFocusButton.className='view-button preview-focus-button editor-focus-button';this.editorFocusButton.dataset.editorFocus='toggle';this.editorFocusButton.textContent='FOCUS';this.editorFocusButton.title='Collapse both editor side panels and maximize the character preview';
    this.dimButton=document.createElement('button');this.dimButton.type='button';this.dimButton.className='view-button preview-focus-button';this.dimButton.dataset.previewFocus='dim';this.dimButton.textContent='DIM ACC.';this.dimButton.title='Fade hoods, straps, accents and accessories without changing character data';
    this.soloButton=document.createElement('button');this.soloButton.type='button';this.soloButton.className='view-button preview-focus-button';this.soloButton.dataset.previewFocus='solo';this.soloButton.textContent='SOLO';this.soloButton.title='Hide optional clothing/accessory layers to inspect the core character';
    tools.append(this.editorFocusButton,this.dimButton,this.soloButton);footer.prepend(tools);

    this.root.addEventListener('click',this.onClick);
    window.addEventListener('resize',this.resizeHandler,{passive:true});
    window.addEventListener('orientationchange',this.resizeHandler,{passive:true});
    window.visualViewport?.addEventListener('resize',this.resizeHandler,{passive:true});
    this.syncViewportHeight();this.applyMode();this.applyEditorFocus();this.applyCategoryContext(this.activeCategory);
  }

  private onClick=(event:Event)=>{
    const source=event.target as HTMLElement;
    const editorFocusButton=source.closest<HTMLButtonElement>('button[data-editor-focus]');
    if(editorFocusButton){this.editorFocus=!this.editorFocus;this.applyEditorFocus();return;}

    const previewButton=source.closest<HTMLButtonElement>('button[data-preview-focus]');
    if(previewButton){const requested=previewButton.dataset.previewFocus as Exclude<PreviewFocusMode,'all'>;this.mode=this.mode===requested?'all':requested;this.applyMode();return;}

    const categoryButton=source.closest<HTMLButtonElement>('.category-rail button[data-focus]');
    const requestedCategory=categoryButton?.dataset.focus as EditorCategory|undefined;
    if(requestedCategory&&EDITOR_CATEGORIES.includes(requestedCategory))this.applyCategoryContext(requestedCategory);
  };

  private applyCategoryContext(category:EditorCategory){
    this.activeCategory=category;
    this.appShell.dataset.activeCategory=category;
    const outlineInspect=category==='outline';
    this.previewPanel.dataset.outlineInspect=String(outlineInspect);
    (window as UxWindow).__FACE_EDITOR_ACTIVE_CATEGORY__=category;
    (window as UxWindow).__FACE_EDITOR_OUTLINE_INSPECT__=outlineInspect;
    this.root.querySelector<HTMLElement>('.left-panel')?.scrollTo({top:0,behavior:'auto'});
    this.root.querySelector<HTMLElement>('.right-panel')?.scrollTo({top:0,behavior:'auto'});
    this.applyMode();
  }

  private applyEditorFocus(){
    this.appShell.dataset.editorFocus=String(this.editorFocus);
    this.editorFocusButton.classList.toggle('selected',this.editorFocus);
    this.editorFocusButton.setAttribute('aria-pressed',String(this.editorFocus));
    this.editorFocusButton.textContent=this.editorFocus?'EDIT':'FOCUS';
    this.editorFocusButton.title=this.editorFocus?'Restore category-linked editor side panels':'Collapse both editor side panels and maximize the character preview';
    (window as UxWindow).__FACE_EDITOR_EDITOR_FOCUS__=this.editorFocus;
  }

  private applyMode(){
    this.dimButton.classList.toggle('selected',this.mode==='dim');this.soloButton.classList.toggle('selected',this.mode==='solo');
    this.dimButton.setAttribute('aria-pressed',String(this.mode==='dim'));this.soloButton.setAttribute('aria-pressed',String(this.mode==='solo'));
    this.previewPanel.dataset.previewFocus=this.mode;(window as UxWindow).__FACE_EDITOR_PREVIEW_FOCUS__=this.mode;
    const hidden=new Set<string>(),dimmed=new Set<string>();
    if(this.mode==='dim')for(const layer of ACCESSORY_LAYERS)dimmed.add(layer);
    if(this.mode==='solo')for(const layer of ACCESSORY_LAYERS)hidden.add(layer);
    if(this.activeCategory==='outline')for(const layer of OUTLINE_INSPECT_LAYERS)if(!hidden.has(layer))dimmed.add(layer);
    const detail:PreviewVisibilityDetail=hidden.size||dimmed.size?{hidden:[...hidden],dimmed:[...dimmed]}:null;
    this.previewHost.dispatchEvent(new CustomEvent<PreviewVisibilityDetail>('preview-layer-visibility',{detail}));
  }

  private syncViewportHeight(){
    const height=Math.max(240,Math.round(window.visualViewport?.height??window.innerHeight));
    document.documentElement.style.setProperty('--face-editor-app-height',`${height}px`);
    document.documentElement.dataset.compactLandscape=height<=520&&window.innerWidth>height?'1':'0';
  }

  dispose(){
    this.root.removeEventListener('click',this.onClick);window.removeEventListener('resize',this.resizeHandler);window.removeEventListener('orientationchange',this.resizeHandler);window.visualViewport?.removeEventListener('resize',this.resizeHandler);
  }
}
