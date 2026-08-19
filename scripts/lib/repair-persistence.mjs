import fs from 'node:fs/promises';

export const TRANSFORM_MARKERS={start:'/* AUTO_REPAIR_DATA_START */',end:'/* AUTO_REPAIR_DATA_END */'};
export const GEOMETRY_MARKERS={start:'/* AUTO_REPAIR_GEOMETRY_START */',end:'/* AUTO_REPAIR_GEOMETRY_END */'};
const IDENTITY={x:0,y:0,scaleX:1,scaleY:1,rotation:0,spacing:0};

const finite=value=>Number.isFinite(Number(value));
const round=value=>Math.round(Number(value)*1e8)/1e8;
const stable=value=>JSON.stringify(value,Object.keys(value??{}).sort());

export function readMarkedJson(source,markers){
  const start=source.indexOf(markers.start),end=source.indexOf(markers.end);
  if(start<0||end<0||end<=start)throw new Error(`Missing generated-data markers ${markers.start} / ${markers.end}`);
  const json=source.slice(start+markers.start.length,end).trim();
  return json?JSON.parse(json):{};
}

export function writeMarkedJson(source,markers,data){
  const start=source.indexOf(markers.start),end=source.indexOf(markers.end);
  if(start<0||end<0||end<=start)throw new Error(`Missing generated-data markers ${markers.start} / ${markers.end}`);
  const prefix=source.slice(0,start+markers.start.length),suffix=source.slice(end);
  return `${prefix}\n${JSON.stringify(data,null,2)}\n${suffix}`;
}

export async function readGeneratedData(filePath,markers){return readMarkedJson(await fs.readFile(filePath,'utf8'),markers);}
export async function writeGeneratedData(filePath,markers,data){const source=await fs.readFile(filePath,'utf8'),next=writeMarkedJson(source,markers,data);if(next!==source)await fs.writeFile(filePath,next);return next!==source;}

export function composeTransforms(first=IDENTITY,second=IDENTITY){return{
  x:round(Number(first.x??0)*Number(second.scaleX??1)+Number(second.x??0)),
  y:round(Number(first.y??0)*Number(second.scaleY??1)+Number(second.y??0)),
  scaleX:round(Number(first.scaleX??1)*Number(second.scaleX??1)),
  scaleY:round(Number(first.scaleY??1)*Number(second.scaleY??1)),
  rotation:round(Number(first.rotation??0)+Number(second.rotation??0)),
  spacing:round(Number(first.spacing??0)+Number(second.spacing??0)),
};}

export function validateTransform(transform,{maxTranslate=.06,minScale=.94,maxScale=1.06,maxRotation=.02,maxSpacing=.02}={}){
  const values=['x','y','scaleX','scaleY','rotation','spacing'].map(key=>transform?.[key]??(key.startsWith('scale')?1:0));
  if(!values.every(finite))return'non-finite transform';
  if(Math.abs(Number(transform.x??0))>maxTranslate||Math.abs(Number(transform.y??0))>maxTranslate)return`translation exceeds ±${maxTranslate}`;
  if(Number(transform.scaleX??1)<minScale||Number(transform.scaleX??1)>maxScale||Number(transform.scaleY??1)<minScale||Number(transform.scaleY??1)>maxScale)return`scale outside ${minScale}..${maxScale}`;
  if(Math.abs(Number(transform.rotation??0))>maxRotation)return`rotation exceeds ±${maxRotation}`;
  if(Math.abs(Number(transform.spacing??0))>maxSpacing)return`spacing exceeds ±${maxSpacing}`;
  return null;
}

export function mergeAcceptedVisualRepairs(current,report,{maxPerPartPasses=3,...limits}={}){
  const next=structuredClone(current??{}),applied=[],blocked=[],geometryRequests=[];
  for(const recommendation of report?.recommendations??[]){
    const key=`${recommendation.family}:${recommendation.id}`,selection=recommendation.selection,profiles=recommendation.plan?.revectorizeProfiles??[];
    if(profiles.length)geometryRequests.push({key,family:recommendation.family,id:recommendation.id,profiles:[...profiles],critical:Boolean(recommendation.plan?.critical)});
    if(!selection?.accepted||!selection?.candidate?.transform)continue;
    const before=next[key],passes=Number(before?.passes??0);
    if(passes>=maxPerPartPasses){blocked.push({key,reason:`pass limit ${maxPerPartPasses} reached`});continue;}
    const composed=composeTransforms(before?.transform??IDENTITY,selection.candidate.transform),reason=validateTransform(composed,limits);
    if(reason){blocked.push({key,reason});continue;}
    next[key]={transform:composed,passes:passes+1,baselineScore:round(Number(before?.baselineScore??selection.baselineScore??recommendation.plan?.baselineScore??0)),finalScore:round(Number(selection.bestScore??0))};
    applied.push({key,candidate:selection.candidate.id,transform:composed,beforeScore:Number(selection.baselineScore??recommendation.plan?.baselineScore??0),afterScore:Number(selection.bestScore??0)});
  }
  return{data:next,applied,blocked,geometryRequests,changed:stable(next)!==stable(current??{})};
}

function validTriangle(triangle){return typeof triangle?.role==='string'&&finite(triangle?.shade)&&Array.isArray(triangle?.points)&&triangle.points.length===3&&triangle.points.every(point=>Array.isArray(point)&&point.length===2&&point.every(finite));}

export function mergeAcceptedVectorRepairs(current,geometry,repairSummary){
  const next=structuredClone(current??{}),applied=[],blocked=[],decisions=new Map((repairSummary?.decisions??[]).map(item=>[item.id,item]));
  for(const id of repairSummary?.accepted??[]){
    const item=geometry?.[id],decision=decisions.get(id);if(!item){blocked.push({id,reason:'accepted repair geometry missing'});continue;}
    if(!item.kind||!Array.isArray(item.triangles)||!item.triangles.length||!item.triangles.every(validTriangle)){blocked.push({id,reason:'invalid repaired triangle payload'});continue;}
    const key=`${item.kind}:${id}`;next[key]={kind:item.kind,triangles:item.triangles.map(triangle=>({role:triangle.role,shade:Number(triangle.shade),points:triangle.points.map(point=>point.map(Number))})),profile:String(decision?.profile??'repair'),beforeScore:finite(decision?.beforeScore)?Number(decision.beforeScore):null,afterScore:finite(decision?.afterScore)?Number(decision.afterScore):null};applied.push({key,profile:next[key].profile,triangles:next[key].triangles.length});
  }
  return{data:next,applied,blocked,changed:stable(next)!==stable(current??{})};
}
