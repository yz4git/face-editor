const clamp=(v,min=0,max=255)=>Math.max(min,Math.min(max,v));
export const rgbHex=({r,g,b})=>`#${[r,g,b].map(v=>clamp(Math.round(v)).toString(16).padStart(2,'0')).join('')}`;

const linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
export function rgbToLab({r,g,b}){
  const R=linear(r),G=linear(g),B=linear(b),x=(R*.4124564+G*.3575761+B*.1804375)/.95047,y=(R*.2126729+G*.7151522+B*.072175),z=(R*.0193339+G*.119192+B*.9503041)/1.08883;
  const f=t=>t>.008856?Math.cbrt(t):7.787*t+16/116,fx=f(x),fy=f(y),fz=f(z);return{l:116*fy-16,a:500*(fx-fy),b:200*(fy-fz)};
}
export function deltaE(a,b){const A=rgbToLab(a),B=rgbToLab(b);return Math.hypot(A.l-B.l,A.a-B.a,A.b-B.b);}
export const labChroma=rgb=>{const c=rgbToLab(rgb);return Math.hypot(c.a,c.b);};
export const luminance=rgb=>rgbToLab(rgb).l;
export const saturation=({r,g,b})=>{const max=Math.max(r,g,b),min=Math.min(r,g,b);return max===0?0:(max-min)/max;};

export function medianColor(raw,width,height){
  const samples=[];const px=(x,y)=>{const i=(y*width+x)*4;return{r:raw[i],g:raw[i+1],b:raw[i+2]};};
  const ring=Math.max(1,Math.floor(Math.min(width,height)*.04));
  for(let y=0;y<height;y+=Math.max(1,Math.floor(height/24)))for(let x=0;x<width;x+=Math.max(1,Math.floor(width/24)))if(x<ring||y<ring||x>=width-ring||y>=height-ring)samples.push(px(x,y));
  const median=key=>{const values=samples.map(v=>v[key]).sort((a,b)=>a-b);return values[Math.floor(values.length/2)]??255;};return{r:median('r'),g:median('g'),b:median('b')};
}

function weightedDominant(shapes,background){
  const groups=[];for(const shape of shapes){if(deltaE(shape.fill,background)<10)continue;const lab=rgbToLab(shape.fill);if(lab.l>92&&Math.hypot(lab.a,lab.b)<18)continue;let group=groups.find(g=>deltaE(g.color,shape.fill)<18);if(!group){group={color:shape.fill,weight:0,weightedLightness:0,weightedSaturation:0};groups.push(group);}group.weight+=shape.area;group.weightedLightness+=lab.l*shape.area;group.weightedSaturation+=saturation(shape.fill)*shape.area;}
  for(const group of groups){const lightness=group.weightedLightness/Math.max(1,group.weight),sat=group.weightedSaturation/Math.max(1,group.weight),darknessBoost=1+Math.max(0,88-lightness)/24,saturationBoost=1+Math.min(.45,sat)*.45;group.score=group.weight*darknessBoost*saturationBoost;}
  groups.sort((a,b)=>b.score-a.score);return groups[0]?.color??{r:70,g:50,b:35};
}

function explicitRoles(shapes,roleHints){
  if(!roleHints.roleColors)return null;const entries=[];for(const[role,values]of Object.entries(roleHints.roleColors)){for(const value of(Array.isArray(values)?values:[values]))entries.push({role,color:typeof value==='string'?hexToRgb(value):value});}const tolerance=roleHints.roleColorTolerance??24;
  return shapes.flatMap(shape=>{let best=null,bestD=Infinity;for(const entry of entries){const d=deltaE(shape.fill,entry.color);if(d<bestD){bestD=d;best=entry;}}return best&&bestD<=tolerance?[{...shape,role:best.role}]:[];});
}

export function classifyShapes(shapes,{kind,background,roleHints={}}){
  const filtered=shapes.filter(s=>deltaE(s.fill,background)>(roleHints.backgroundTolerance??9)),explicit=explicitRoles(filtered,roleHints);if(explicit)return explicit;
  if(kind==='hair'){
    const dominant=roleHints.hairColor?hexToRgb(roleHints.hairColor):weightedDominant(filtered,background),hairTolerance=roleHints.hairTolerance??32;
    return filtered.flatMap(shape=>{const d=deltaE(shape.fill,dominant),lab=rgbToLab(shape.fill),sat=saturation(shape.fill);if(d<=hairTolerance)return[{...shape,role:'hair'}];if(sat>.32&&shape.area<(roleHints.maxAccentArea??1800)&&lab.l<78)return[{...shape,role:'hairTie'}];return[];});
  }
  if(kind==='eye'){
    const candidates=filtered.filter(shape=>shape.area>(roleHints.minArea??1.5)),totalArea=candidates.reduce((s,v)=>s+v.area,0)||1;
    const dark=candidates.filter(s=>luminance(s.fill)<(roleHints.darkL??43)).sort((a,b)=>b.area-a.area),light=candidates.filter(s=>{const lab=rgbToLab(s.fill);return lab.l>(roleHints.lightL??83)&&Math.hypot(lab.a,lab.b)<(roleHints.lightChroma??22);}).sort((a,b)=>b.area-a.area);
    const outlineCut=dark.length?Math.max(dark[0].area*.34,totalArea*.012):Infinity,whiteCut=light.length?Math.max(light[0].area*.18,totalArea*.008):Infinity;
    return candidates.map(shape=>{const lab=rgbToLab(shape.fill),chroma=Math.hypot(lab.a,lab.b);let role='eyes';if(lab.l<(roleHints.darkL??43))role=shape.area>=outlineCut?'outline':'pupil';else if(lab.l>(roleHints.lightL??83)&&chroma<(roleHints.lightChroma??22))role=shape.area>=whiteCut?'white':'highlight';return{...shape,role};});
  }
  return filtered.map(shape=>({...shape,role:kind||'part'}));
}

export function hexToRgb(hex){const v=hex.replace('#','').trim();if(v.length===3)return{r:parseInt(v[0]+v[0],16),g:parseInt(v[1]+v[1],16),b:parseInt(v[2]+v[2],16)};if(v.length!==6)throw new Error(`Invalid hex color ${hex}`);return{r:parseInt(v.slice(0,2),16),g:parseInt(v.slice(2,4),16),b:parseInt(v.slice(4,6),16)};}
