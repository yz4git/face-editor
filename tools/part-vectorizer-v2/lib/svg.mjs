const NUMBER=/[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/;
const TOKEN=new RegExp(`[MLHVZmlhvz]|${NUMBER.source}`,'g');

export function parseColor(value){
  if(!value||value==='none')return null;
  const v=value.trim().toLowerCase();
  if(/^#[0-9a-f]{6}$/.test(v))return{r:parseInt(v.slice(1,3),16),g:parseInt(v.slice(3,5),16),b:parseInt(v.slice(5,7),16),hex:v};
  if(/^#[0-9a-f]{3}$/.test(v)){const r=v[1]+v[1],g=v[2]+v[2],b=v[3]+v[3];return{r:parseInt(r,16),g:parseInt(g,16),b:parseInt(b,16),hex:`#${r}${g}${b}`};}
  const rgb=v.match(/^rgb\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)\s*\)$/);if(rgb){const r=+rgb[1],g=+rgb[2],b=+rgb[3];return{r,g,b,hex:`#${[r,g,b].map(n=>Math.max(0,Math.min(255,n)).toString(16).padStart(2,'0')).join('')}`};}
  return null;
}

function attrs(tag){
  const result={};for(const match of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/g))result[match[1]]=match[3];
  if(result.style)for(const entry of result.style.split(';')){const i=entry.indexOf(':');if(i>0&&!result[entry.slice(0,i).trim()])result[entry.slice(0,i).trim()]=entry.slice(i+1).trim();}
  return result;
}

function parsePathData(d){
  const tokens=d.match(TOKEN)||[],paths=[];let i=0,cmd='',x=0,y=0,startX=0,startY=0,current=[];
  const number=()=>{const token=tokens[i++];if(token===undefined||/[a-z]/i.test(token))throw new Error(`Expected number in polygon path, got ${token??'EOF'}`);return Number(token);};
  const push=()=>{if(current.length>=3)paths.push(current);current=[];};
  while(i<tokens.length){
    if(/[a-z]/i.test(tokens[i]))cmd=tokens[i++];if(!cmd)throw new Error('SVG path is missing an initial command');
    const relative=cmd===cmd.toLowerCase(),upper=cmd.toUpperCase();
    if(upper==='Z'){if(current.length&&((current.at(-1)[0]!==startX)||(current.at(-1)[1]!==startY)))current.push([startX,startY]);if(current.length>1&&current.at(-1)[0]===current[0][0]&&current.at(-1)[1]===current[0][1])current.pop();push();x=startX;y=startY;cmd='';continue;}
    if(!['M','L','H','V'].includes(upper))throw new Error(`Unsupported SVG command ${cmd}; VTracer must run in polygon mode`);
    if(upper==='H'){const nx=number();x=relative?x+nx:nx;current.push([x,y]);continue;}
    if(upper==='V'){const ny=number();y=relative?y+ny:ny;current.push([x,y]);continue;}
    const nx=number(),ny=number();x=relative?x+nx:nx;y=relative?y+ny:ny;
    if(upper==='M'){if(current.length)push();startX=x;startY=y;current.push([x,y]);cmd=relative?'l':'L';}else current.push([x,y]);
  }
  if(current.length>=3)push();return paths;
}

export function polygonArea(points){let area=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a[0]*b[1]-b[0]*a[1];}return area/2;}
export function polygonBounds(points){let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const[x,y]of points){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}return{minX,minY,maxX,maxY,width:maxX-minX,height:maxY-minY};}
export function polygonCentroid(points){let a=0,cx=0,cy=0;for(let i=0;i<points.length;i++){const[x0,y0]=points[i],[x1,y1]=points[(i+1)%points.length],cross=x0*y1-x1*y0;a+=cross;cx+=(x0+x1)*cross;cy+=(y0+y1)*cross;}if(Math.abs(a)<1e-8)return[points.reduce((s,p)=>s+p[0],0)/points.length,points.reduce((s,p)=>s+p[1],0)/points.length];return[cx/(3*a),cy/(3*a)];}

export function parseVTracerSvg(svg){
  const root=svg.match(/<svg\b[^>]*>/i),rootAttrs=root?attrs(root[0]):{};let width=Number(rootAttrs.width)||0,height=Number(rootAttrs.height)||0;
  if(rootAttrs.viewBox){const v=rootAttrs.viewBox.trim().split(/[ ,]+/).map(Number);if(v.length===4){width=v[2];height=v[3];}}
  const shapes=[];for(const match of svg.matchAll(/<path\b[^>]*>/gi)){const a=attrs(match[0]),fill=parseColor(a.fill);if(!fill||!a.d)continue;for(const points of parsePathData(a.d)){const area=Math.abs(polygonArea(points));if(area<.25)continue;shapes.push({fill,points,area,bounds:polygonBounds(points),centroid:polygonCentroid(points)});}}
  return{width,height,shapes};
}

export function shapesToSvg(width,height,shapes,{background=null}={}){
  const bg=background?`<rect width="${width}" height="${height}" fill="${background}"/>`:'';
  const paths=shapes.map(shape=>`<path d="M${shape.points.map(([x,y])=>`${x.toFixed(3)} ${y.toFixed(3)}`).join('L')}Z" fill="${shape.fill.hex}"/>`).join('');
  return`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${bg}${paths}</svg>`;
}
