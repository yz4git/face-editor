const finite=(value)=>Number.isFinite(Number(value));
const assert=(condition,message)=>{if(!condition)throw new Error(`Invalid vectorizer manifest: ${message}`);};

function validateTarget(target,label){
  if(!target)return;
  for(const key of ['minX','minY','maxX','maxY'])assert(finite(target[key]),`${label}.${key} must be a finite number`);
  assert(Number(target.maxX)>Number(target.minX),`${label}.maxX must be greater than minX`);
  assert(Number(target.maxY)>Number(target.minY),`${label}.maxY must be greater than minY`);
}

function validateQuality(quality,label){
  if(!quality)return;
  for(const key of ['minMaskIoU','minBoundaryF1'])if(quality[key]!==undefined){assert(finite(quality[key]),`${label}.${key} must be numeric`);assert(Number(quality[key])>=0&&Number(quality[key])<=1,`${label}.${key} must be between 0 and 1`);}
  if(quality.maxColorMae!==undefined){assert(finite(quality.maxColorMae),`${label}.maxColorMae must be numeric`);assert(Number(quality.maxColorMae)>=0,`${label}.maxColorMae must be >= 0`);}
  if(quality.maxTriangles!==undefined){assert(Number.isInteger(Number(quality.maxTriangles))&&Number(quality.maxTriangles)>0,`${label}.maxTriangles must be a positive integer`);}
}

function validateGrid(grid,label){
  if(!grid)return;
  for(const key of ['columns','rows'])assert(Number.isInteger(Number(grid[key]))&&Number(grid[key])>0,`${label}.${key} must be a positive integer`);
  for(const key of ['x','y','width','height','gapX','gapY'])if(grid[key]!==undefined)assert(finite(grid[key]),`${label}.${key} must be numeric`);
  if(grid.width!==undefined)assert(Number(grid.width)>0,`${label}.width must be > 0`);
  if(grid.height!==undefined)assert(Number(grid.height)>0,`${label}.height must be > 0`);
}

export function validateManifest(manifest){
  assert(manifest&&typeof manifest==='object','root must be an object');
  assert(manifest.schemaVersion===2,'schemaVersion must be 2');
  assert(typeof manifest.source==='string'&&manifest.source.trim(),'source is required');
  assert(Array.isArray(manifest.items)&&manifest.items.length>0,'items must contain at least one part');
  assert(manifest.concurrency===undefined||(Number.isInteger(Number(manifest.concurrency))&&Number(manifest.concurrency)>=1&&Number(manifest.concurrency)<=16),'concurrency must be an integer from 1 to 16');
  validateGrid(manifest.grid,'grid');for(const[kind,grid]of Object.entries(manifest.kindGrids??{}))validateGrid(grid,`kindGrids.${kind}`);
  validateTarget(manifest.target,'target');
  for(const[kind,target]of Object.entries(manifest.targetBoundsByKind??{}))validateTarget(target,`targetBoundsByKind.${kind}`);
  validateQuality(manifest.quality,'quality');
  const ids=new Set();
  for(const[index,item]of manifest.items.entries()){
    assert(item&&typeof item==='object',`items[${index}] must be an object`);
    assert(typeof item.id==='string'&&item.id.trim(),`items[${index}].id is required`);
    assert(!ids.has(item.id),`duplicate item id "${item.id}"`);ids.add(item.id);
    assert(typeof item.kind==='string'&&item.kind.trim(),`items[${index}].kind is required`);
    validateGrid(item.grid,`items[${index}].grid`);
    assert(item.rect||item.grid||manifest.kindGrids?.[item.kind]||manifest.grid,`items[${index}] requires rect, item.grid, kindGrids.${item.kind}, or a root grid`);
    if(item.rect){for(const key of ['x','y','width','height'])assert(finite(item.rect[key]),`items[${index}].rect.${key} must be numeric`);assert(Number(item.rect.width)>0&&Number(item.rect.height)>0,`items[${index}].rect width/height must be > 0`);}
    if(item.cell!==undefined)assert(Number.isInteger(Number(item.cell))&&Number(item.cell)>=0,`items[${index}].cell must be a non-negative integer`);
    if(item.row!==undefined)assert(Number.isInteger(Number(item.row))&&Number(item.row)>=0,`items[${index}].row must be a non-negative integer`);
    if(item.column!==undefined)assert(Number.isInteger(Number(item.column))&&Number(item.column)>=0,`items[${index}].column must be a non-negative integer`);
    validateTarget(item.target,`items[${index}].target`);validateQuality(item.quality,`items[${index}].quality`);
  }
  return manifest;
}
