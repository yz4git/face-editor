import * as THREE from 'three';
import { compileCharacter } from '../core/compileCharacter';
import type { CharacterDefinition, CompiledPolygonCharacter } from '../core/types';

export class CharacterRenderer {
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-2,2,2,-2,0.1,100);
  private renderer: THREE.WebGLRenderer;
  private root = new THREE.Group();
  private observer: ResizeObserver;

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000,0);
    this.renderer.domElement.className='character-canvas';
    this.host.append(this.renderer.domElement);
    this.camera.position.set(0,0,10);
    this.camera.lookAt(0,0,0);
    this.scene.add(this.root);
    this.observer = new ResizeObserver(()=>this.resize());
    this.observer.observe(this.host);
    this.resize();
  }

  setCharacter(definition: CharacterDefinition): CompiledPolygonCharacter {
    const compiled=compileCharacter(definition);
    this.disposeMeshes();
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

  private resize(){ this.renderer.setSize(Math.max(1,this.host.clientWidth),Math.max(1,this.host.clientHeight),false); this.render(); }
  private render(){ this.renderer.render(this.scene,this.camera); }
  private disposeMeshes(){ while(this.root.children.length){ const child=this.root.children.pop(); if(child instanceof THREE.Mesh){ child.geometry.dispose(); const m=child.material; Array.isArray(m)?m.forEach(x=>x.dispose()):m.dispose(); } } }
  dispose(){ this.observer.disconnect(); this.disposeMeshes(); this.renderer.dispose(); this.renderer.domElement.remove(); }
}
