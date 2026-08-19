import { performance } from 'node:perf_hooks';
import sharp from 'sharp';
import vtracerPackage from '@visioncortex/vtracer';
import { classifyShapes, hexToRgb, medianColor, rgbHex } from './color.mjs';
import { parseVTracerSvg, shapesToSvg } from './svg.mjs';
import { alphaMask, boundaryF1, foregroundColorMae, maskIoU, qualityScore, semanticSourceMask } from './metrics.mjs';
import { triangulateSemanticShapes } from './geometry.mjs';

const vtracer=vtracerPackage?.default??vtracerPackage;

function roleBaseColors(manifest,item){
  const roles={...manifest.roleBaseColors,...manifest.kindRoleBaseColors?.[item.kind],...item.roleBaseColors};
  return Object.fromEntries(Object.entries(roles).map(([key,value])=>[key,typeof value==='string'?hexToRgb(value):value]));
}

async function rawRgba(buffer){
  const{data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  return{raw:data,width:info.width,height:info.height};
}

export async function traceCandidate(crop,source,profile,item,manifest){
  const started=performance.now();
  const svg=vtracer.convertBuffer(crop,profile.options);
  const parsed=parseVTracerSvg(svg);
  const background=source.background??medianColor(source.raw,source.width,source.height);
  const semantic=classifyShapes(parsed.shapes,{kind:item.kind,background,roleHints:{...manifest.roleHints?.[item.kind],...item.roleHints}});
  if(!semantic.length)throw new Error(`${profile.name}: no semantic foreground shapes`);
  const vectorSvg=shapesToSvg(source.width,source.height,semantic);
  const rendered=await rawRgba(await sharp(Buffer.from(vectorSvg)).png().toBuffer());
  const sourceMask=semanticSourceMask(source.raw,source.width,source.height,semantic,{colorTolerance:item.sourceColorTolerance??manifest.sourceColorTolerance??26});
  const candidateMask=alphaMask(rendered.raw,rendered.width,rendered.height);
  const iou=maskIoU(sourceMask,candidateMask);
  const edge=boundaryF1(sourceMask,candidateMask,source.width,source.height,item.boundaryTolerance??manifest.boundaryTolerance??1);
  const mae=foregroundColorMae(source.raw,rendered.raw,sourceMask,candidateMask);
  const geometry=triangulateSemanticShapes(semantic,{target:item.target??manifest.targetBoundsByKind?.[item.kind]??manifest.target,roleBaseColors:roleBaseColors(manifest,item)});
  const metrics={maskIoU:iou,boundaryF1:edge,colorMae:mae,triangles:geometry.triangles.length,shapeCount:semantic.length,traceMs:performance.now()-started};
  metrics.score=qualityScore(metrics,item.quality??manifest.quality);
  return{profile:profile.name,profileOptions:profile.options,svg:vectorSvg,semantic,geometry,metrics,background:rgbHex(background)};
}
