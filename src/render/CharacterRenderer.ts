import * as THREE from 'three';
import { compileCharacter, type CompileCharacterOptions } from '../core/compileCharacter';
import type { CharacterDefinition, CompiledPolygonCharacter, PartTransform } from '../core/types';

export type RendererMode='webgl'|'canvas2d';
export type CompiledPreviewMutator=(character:CompiledPolygonCharacter,timeMs:number)=>void;
type AuditWindow=Window&{__FACE_EDITOR_RENDERER_MODE__?:RendererMode;__FACE_EDITOR_REPAIR_TRANSFORMS__?:Record<string,PartTransform>};

const cloneCompiled=(source:CompiledPolygonCharacter):CompiledPolygonCharacter=>({
  version:1,
  bounds:{...source.bounds},
  layers:source.layers.map(layer=>({id:layer.id,zIndex:layer.zIndex,positions:new Float32Array(layer.positions),colors:layer.colors,indices:layer.indices})),
});

export class CharacterRenderer{
  private scene=new THREE.Scene();
  private camera=new THREE.OrthographicCamera(-2,2,2,-2,.1,100);
  private renderer:THREE.WebGLRenderer|null=null;
  private fallbackCanvas:HTMLCanvasElement|null=null;
  private fallbackContext:CanvasRenderingContext2D|null=null;
  private sourceCurrent:CompiledPolygonCharacter|null=null;
  private current:CompiledPolygonCharacter|null=null;
  private compiledMutator:CompiledPreviewMutator|null=null;
  private animationTime=0;
  private root=new THREE.Group();
  private meshByLayer=new Map<string,THREE.Mesh>();
  private observer:ResizeObserver;
  private mode:RendererMode='canvas2d';
  private auditMode=false;

  constructor(private host:HTMLElement){
    const params=new URLSearchParams(location.search),forceCanvas=params.get('renderer')==='canvas2d'||params.get('visualAudit')==='1';this.auditMode=params.get('visualAudit')==='1';
    if(!forceCanvas)this.tryWebGL();if(!this.renderer)this.enableCanvasFallback();
    this.camera.position.set(0,0,10);this.camera.lookAt(0,0,0);this.scene.add(this.root);
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(this.host);this.resize();this.publishMode();
  }
  getMode():RendererMode{return this.mode;}
  private tryWebGL(){
    try{
      const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x000000,0);renderer.domElement.className='character-canvas';
      renderer.domElement.addEventListener('webglcontextlost',(event:Event)=>{event.preventDefault();this.renderer?.dispose();this.renderer?.domElement.remove();this.renderer=null;this.enableCanvasFallback();this.resize();this.render();},{once:true});
      this.renderer=renderer;this.mode='webgl';this.host.append(renderer.domElement);
    }catch{this.renderer=null;}
  }
  private enableCanvasFallback(){if(this.fallbackCanvas)return;const canvas=document.createElement('canvas');canvas.className='character-canvas canvas2d-fallback';canvas.dataset.renderer='canvas2d';this.fallbackCanvas=canvas;this.fallbackContext=canvas.getContext('2d');this.host.append(canvas);this.mode='canvas2d';this.publishMode();}
  private publishMode(){this.host.dataset.rendererMode=this.mode;(window as AuditWindow).__FACE_EDITOR_RENDERER_MODE__=this.mode;this.host.dispatchEvent(new CustomEvent('renderer-mode',{detail:{mode:this.mode}}));}
  setCharacter(definition:CharacterDefinition):CompiledPolygonCharacter{
    const auditRepairs=this.auditMode?(window as AuditWindow).__FACE_EDITOR_REPAIR_TRANSFORMS__:undefined,options:CompileCharacterOptions|undefined=auditRepairs?{repairTransforms:auditRepairs}:undefined;
    this.sourceCurrent=compileCharacter(definition,options);this.current=cloneCompiled(this.sourceCurrent);this.applyCompiledMutation();this.disposeMeshes();
    if(this.renderer)for(const layer of this.current.layers){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(layer.positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(layer.colors,3));geometry.setIndex(new THREE.BufferAttribute(layer.indices,1));const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false});const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=layer.zIndex;mesh.position.z=layer.zIndex*.002;mesh.name=layer.id;this.root.add(mesh);this.meshByLayer.set(layer.id,mesh);}
    this.frame(this.current);this.render();return this.current;
  }
  setCompiledPreviewMutator(mutator:CompiledPreviewMutator|null){this.compiledMutator=mutator;this.refreshCurrent(true);}
  setAnimationTime(timeMs:number){if(!Number.isFinite(timeMs))return;this.animationTime=timeMs;this.refreshCurrent(false);}
  private applyCompiledMutation(){if(this.current&&this.compiledMutator)this.compiledMutator(this.current,this.animationTime);}
  private refreshCurrent(reframe:boolean){
    if(!this.sourceCurrent||!this.current)return;
    for(let index=0;index<this.current.layers.length;index++)this.current.layers[index]?.positions.set(this.sourceCurrent.layers[index]?.positions??[]);
    this.current.bounds={...this.sourceCurrent.bounds};this.applyCompiledMutation();
    if(this.renderer)for(const layer of this.current.layers){const mesh=this.meshByLayer.get(layer.id),attribute=mesh?.geometry.getAttribute('position');if(attribute)attribute.needsUpdate=true;}
    if(reframe)this.frame(this.current);this.render();
  }
  private frameScale(){return this.auditMode?.58:.62;}
  private frame(c:CompiledPolygonCharacter){const{minX,maxX,minY,maxY}=c.bounds,aspect=Math.max(this.host.clientWidth,1)/Math.max(this.host.clientHeight,1),half=Math.max(maxX-minX,maxY-minY)*this.frameScale();this.camera.left=-half*aspect;this.camera.right=half*aspect;this.camera.top=half;this.camera.bottom=-half;this.camera.position.x=(minX+maxX)/2;this.camera.position.y=(minY+maxY)/2;this.camera.updateProjectionMatrix();}
  private resize(){const width=Math.max(1,this.host.clientWidth),height=Math.max(1,this.host.clientHeight);if(this.renderer)this.renderer.setSize(width,height,false);else if(this.fallbackCanvas){const dpr=Math.min(window.devicePixelRatio||1,2);this.fallbackCanvas.width=Math.max(1,Math.floor(width*dpr));this.fallbackCanvas.height=Math.max(1,Math.floor(height*dpr));}this.render();}
  private render(){
    if(this.renderer){this.renderer.render(this.scene,this.camera);return;}
    const canvas=this.fallbackCanvas,ctx=this.fallbackContext,character=this.current;if(!canvas||!ctx||!character)return;
    const width=canvas.width,height=canvas.height,{minX,maxX,minY,maxY}=character.bounds,centerX=(minX+maxX)/2,centerY=(minY+maxY)/2,half=Math.max(maxX-minX,maxY-minY)*this.frameScale(),aspect=width/Math.max(height,1);
    const toCanvas=(x:number,y:number)=>({x:((x-centerX)+half*aspect)/(2*half*aspect)*width,y:(centerY+half-y)/(2*half)*height});ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=true;ctx.lineJoin='round';ctx.lineCap='round';
    for(const layer of character.layers){const{positions,colors,indices}=layer;for(let i=0;i<indices.length;i+=3){const ia=indices[i]*3,ib=indices[i+1]*3,ic=indices[i+2]*3,p0=toCanvas(positions[ia],positions[ia+1]),p1=toCanvas(positions[ib],positions[ib+1]),p2=toCanvas(positions[ic],positions[ic+1]);const r=Math.round((colors[ia]+colors[ib]+colors[ic])/3*255),g=Math.round((colors[ia+1]+colors[ib+1]+colors[ic+1])/3*255),b=Math.round((colors[ia+2]+colors[ib+2]+colors[ic+2])/3*255),fill=`rgb(${r},${g},${b})`;ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=fill;ctx.lineWidth=.9;ctx.stroke();}}
  }
  private disposeMeshes(){this.meshByLayer.clear();while(this.root.children.length){const child=this.root.children.pop();if(child instanceof THREE.Mesh){child.geometry.dispose();const m=child.material;Array.isArray(m)?m.forEach(x=>x.dispose()):m.dispose();}}}
  dispose(){this.observer.disconnect();this.disposeMeshes();this.renderer?.dispose();this.renderer?.domElement.remove();this.fallbackCanvas?.remove();}
}
