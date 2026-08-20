type PreviewFocusMode='all'|'dim'|'solo';

type PreviewVisibilityDetail={hidden?:string[];dimmed?:string[]}|null;
type UxWindow=Window&{__FACE_EDITOR_PREVIEW_FOCUS__?:PreviewFocusMode};

const ACCESSORY_LAYERS=['hood','strap','strap-metal','accent'];

export class UxPolishController{
  private previewHost:HTMLElement;
  private previewPanel:HTMLElement;
  private mode:PreviewFocusMode='all';
  private dimButton:HTMLButtonElement;
  private soloButton:HTMLButtonElement;
  private resizeHandler=()=>this.syncViewportHeight();

  constructor(private root:HTMLElement){
    const previewHost=root.querySelector<HTMLElement>('#preview');
    const previewPanel=root.querySelector<HTMLElement>('.preview-panel');
    const footer=root.querySelector<HTMLElement>('.preview-footer');
    if(!previewHost||!previewPanel||!footer)throw new Error('UX polish preview hosts missing');
    this.previewHost=previewHost;this.previewPanel=previewPanel;

    const tools=document.createElement('div');tools.className='preview-focus-tools';tools.setAttribute('role','group');tools.setAttribute('aria-label','Clothing preview focus');
    this.dimButton=document.createElement('button');this.dimButton.type='button';this.dimButton.className='view-button preview-focus-button';this.dimButton.dataset.previewFocus='dim';this.dimButton.textContent='DIM ACC.';this.dimButton.title='Fade hood, straps and accents without changing character data';
    this.soloButton=document.createElement('button');this.soloButton.type='button';this.soloButton.className='view-button preview-focus-button';this.soloButton.dataset.previewFocus='solo';this.soloButton.textContent='SOLO CLOTHES';this.soloButton.title='Hide hood, straps and accents to inspect jacket and inner shirt';
    tools.append(this.dimButton,this.soloButton);footer.prepend(tools);

    this.root.addEventListener('click',this.onClick);
    window.addEventListener('resize',this.resizeHandler,{passive:true});
    window.addEventListener('orientationchange',this.resizeHandler,{passive:true});
    window.visualViewport?.addEventListener('resize',this.resizeHandler,{passive:true});
    this.syncViewportHeight();this.applyMode();
  }

  private onClick=(event:Event)=>{
    const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button[data-preview-focus]');if(!button)return;
    const requested=button.dataset.previewFocus as Exclude<PreviewFocusMode,'all'>;
    this.mode=this.mode===requested?'all':requested;this.applyMode();
  };

  private applyMode(){
    this.dimButton.classList.toggle('selected',this.mode==='dim');this.soloButton.classList.toggle('selected',this.mode==='solo');
    this.dimButton.setAttribute('aria-pressed',String(this.mode==='dim'));this.soloButton.setAttribute('aria-pressed',String(this.mode==='solo'));
    this.previewPanel.dataset.previewFocus=this.mode;(window as UxWindow).__FACE_EDITOR_PREVIEW_FOCUS__=this.mode;
    let detail:PreviewVisibilityDetail=null;
    if(this.mode==='dim')detail={dimmed:[...ACCESSORY_LAYERS]};
    if(this.mode==='solo')detail={hidden:[...ACCESSORY_LAYERS]};
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
