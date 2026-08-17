import * as THREE from 'three';
import { compileCharacter } from '../core/compileCharacter';
import type { CharacterDefinition, CompiledPolygonCharacter } from '../core/types';

export class CharacterRenderer {
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-2,2,2,-2,0.1,100);
  private renderer: THREE.WebGLRenderer | null = null;
  private fallbackCanvas: HTMLCanvasElement | null = null;
  private fallbackContext: CanvasRenderingContext2D | null = null;
  private current: CompiledPolygonCharacter | null = null;
  private root = new THREE.Group();
  private observer: ResizeObserver;

  constructor(private host: HTMLElement) {
    try {
      this.renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.setClearColor(0x000000,0);
      this.renderer.domElement.className='character-canvas';
      this.host.append(this.renderer.domElement);
    } catch {
      this.fallbackCanvas = document.createElement('canvas');
      this.fallbackCanvas.className = 'character-canvas';
      this.fallbackContext = this.fallbackCanvas.getContext('2d');
      this.host.append(this.fallbackCanvas);
    }
    this.camera.position.set(0,0,10);
    this.camera.lookAt(0,0,0);
    this.scene.add(this.root);
    this.observer = new ResizeObserver(()=>this.resize());
    this.observer.observe(this.host);
    this.resize();
  }

  setCharacter(definition: CharacterDefinition): CompiledPolygonCharacter {
    const compiled=compileCharacter(definition);
    this.current = compiled;
    this.disposeMeshes();
    if (this.renderer) {
      for(const layer of compiled.layers){
        const geometry=new THREE.BufferGeometry();
        geometry.setAttribute('position',new THREE.BufferAttribute(layer.positions,3));
        geometry.setAttribute('color',new THREE.BufferAttribute(layer.colors,3));
        geometry.setIndex(new THREE.BufferAttribute(layer.indices,1));
        const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false});
        const mesh=new THREE.Mesh(geometry,material);
        mesh.renderOrder=layer.zIndex;
        mesh.position.z=layer.zIndex*0.002;
        mesh.name=layer.id;
        this.root.add(mesh);
      }
    }
    this.frame(compiled);
    this.render();
    return compiled;
  }

  private frame(c: CompiledPolygonCharacter){
    const {minX,maxX,minY,maxY}=c.bounds;
    const aspect=Math.max(this.host.clientWidth,1)/Math.max(this.host.clientHeight,1);
    const half=Math.max(maxX-minX,maxY-minY)*0.58;
    this.camera.left=-half*aspect; this.camera.right=half*aspect; this.camera.top=half; this.camera.bottom=-half;
    this.camera.position.x=(minX+maxX)/2; this.camera.position.y=(minY+maxY)/2;
    this.camera.updateProjectionMatrix();
  }

  private resize(){
    const width = Math.max(1,this.host.clientWidth);
    const height = Math.max(1,this.host.clientHeight);
    if (this.renderer) {
      this.renderer.setSize(width,height,false);
    } else if (this.fallbackCanvas) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.fallbackCanvas.width = Math.max(1,Math.floor(width*dpr));
      this.fallbackCanvas.height = Math.max(1,Math.floor(height*dpr));
    }
    this.render();
  }

  private render(){
    if (this.renderer) {
      this.renderer.render(this.scene,this.camera);
      return;
    }
    const canvas = this.fallbackCanvas;
    const context = this.fallbackContext;
    const character = this.current;
    if (!canvas || !context || !character) return;
    const width = canvas.width;
    const height = canvas.height;
    const {minX,maxX,minY,maxY} = character.bounds;
    const centerX = (minX+maxX)/2;
    const centerY = (minY+maxY)/2;
    const half = Math.max(maxX-minX,maxY-minY)*0.58;
    const aspect = width/Math.max(height,1);
    const toCanvas = (x:number,y:number) => ({
      x: ((x-centerX)+half*aspect)/(2*half*aspect)*width,
      y: (centerY+half-y)/(2*half)*height,
    });
    context.clearRect(0,0,width,height);
    for (const layer of character.layers) {
      const {positions,colors,indices} = layer;
      for (let i=0;i<indices.length;i+=3) {
        const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
        const p0=toCanvas(positions[a],positions[a+1]);
        const p1=toCanvas(positions[b],positions[b+1]);
        const p2=toCanvas(positions[c],positions[c+1]);
        const r=Math.round((colors[a]+colors[b]+colors[c])/3*255);
        const g=Math.round((colors[a+1]+colors[b+1]+colors[c+1])/3*255);
        const bColor=Math.round((colors[a+2]+colors[b+2]+colors[c+2])/3*255);
        context.beginPath();
        context.moveTo(p0.x,p0.y); context.lineTo(p1.x,p1.y); context.lineTo(p2.x,p2.y);
        context.closePath();
        context.fillStyle=`rgb(${r},${g},${bColor})`;
        context.fill();
      }
    }
  }

  private disposeMeshes(){ while(this.root.children.length){ const child=this.root.children.pop(); if(child instanceof THREE.Mesh){ child.geometry.dispose(); const m=child.material; Array.isArray(m)?m.forEach(x=>x.dispose()):m.dispose(); } } }
  dispose(){
    this.observer.disconnect();
    this.disposeMeshes();
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
    this.fallbackCanvas?.remove();
  }
}
