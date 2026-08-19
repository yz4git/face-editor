import { exportCharacterBundle } from './compileCharacter';
import { DEFAULT_EXPRESSION_SET, EXPRESSION_ORDER, cloneExpressionSet } from './expressionSystem';
import { DEFAULT_MOTION_STATE, normalizeMotionState } from './motionSystem';
import type {
  CharacterBundle,
  CharacterDefinition,
  CharacterExpressionSet,
  CharacterMotionState,
  ExpressionId,
  ExpressionPresetDefinition,
  ExpressionTransformDelta,
  MotionActionId,
  PartTransform,
  PoseId,
} from './types';
import { normalizeCharacter } from '../data/parts';

type UnknownRecord = Record<string, unknown>;

const EXPRESSION_IDS = new Set<ExpressionId>(EXPRESSION_ORDER);
const MOTION_POSES = new Set<PoseId>(['idle','relax','confident','cute','cool','fight','run','jump']);
const MOTION_ACTIONS = new Set<MotionActionId>(['none','breathe','blink','talk','wave','walk','run']);
const STYLE_VALUES:Record<string,readonly string[]> = {
  baseStyle: ['female', 'male'],
  outfitStyle: ['hooded', 'high-collar', 'zip-collar', 'drawstring', 'short-sleeve', 'vest'],
  hoodStyle: ['folded', 'drawstring', 'sharp', 'high', 'wide', 'wing'],
  shirtStyle: ['tee', 'long-sleeve', 'tank', 'three-quarter', 'turtleneck', 'sleeveless-high'],
  strapStyle: ['simple', 'padded', 'single-pouch', 'double-pouch', 'cross', 'y-harness'],
  accentStyle: ['diamond', 'long-strip', 'point-strip', 'corner', 'chevron', 'slash', 'taper', 'triangle'],
  hairStyle: ['ponytail', 'bob', 'side-tail', 'twin-tail', 'braid', 'long', 'wavy', 'short-spike', 'bun', 'half-up'],
  faceShape: ['soft', 'oval', 'angular', 'round', 'square', 'pointed', 'long-oval', 'hex', 'diamond', 'tapered'],
  eyeStyle: ['bright', 'determined', 'sharp', 'round', 'soft', 'sleepy', 'sparkle', 'closed', 'narrow', 'side-glance'],
  browStyle: ['soft', 'straight', 'angled', 'thin', 'bold', 'arched', 'calm', 'raised', 'flat', 'worried'],
  noseStyle: ['diamond', 'small', 'line', 'soft', 'tall', 'tiny', 'faceted', 'profile', 'wide', 'button'],
  mouthStyle: ['smile-open', 'smile', 'neutral', 'soft-smile', 'o', 'surprised', 'smirk', 'frown', 'wide-open', 'curve'],
};

const isRecord=(value:unknown):value is UnknownRecord=>typeof value==='object'&&value!==null&&!Array.isArray(value);
const isFiniteNumber=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value);
const isHexColor=(value:unknown):value is string=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const fail=(message:string):never=>{throw new Error('Invalid Face Editor JSON: '+message);};
const assertRecord:(value:unknown,label:string)=>asserts value is UnknownRecord=(value,label)=>{if(!isRecord(value))fail(label+' must be an object');};
const assertArray:(value:unknown,label:string)=>asserts value is unknown[]=(value,label)=>{if(!Array.isArray(value))fail(label+' must be an array');};
const required=(record:UnknownRecord,key:string)=>{if(!(key in record))fail('missing '+key);return record[key];};
const validExpression=(value:unknown):value is ExpressionId=>typeof value==='string'&&EXPRESSION_IDS.has(value as ExpressionId);
const validStyle=(key:string,value:unknown)=>typeof value==='string'&&STYLE_VALUES[key]?.includes(value);

function validateTransform(value:unknown,label:string):PartTransform{
  assertRecord(value,label);
  for(const key of ['x','y','scaleX','scaleY','rotation'] as const)if(!isFiniteNumber(value[key]))fail(label+'.'+key+' must be finite');
  if(value.spacing!==undefined&&!isFiniteNumber(value.spacing))fail(label+'.spacing must be finite');
  return{
    x:value.x as number,
    y:value.y as number,
    scaleX:value.scaleX as number,
    scaleY:value.scaleY as number,
    rotation:value.rotation as number,
    spacing:value.spacing as number|undefined,
  };
}

function validateDefinition(value:unknown):CharacterDefinition{
  assertRecord(value,'definition');
  if(value.version!==1)fail('definition.version must be 1');
  for(const key of Object.keys(STYLE_VALUES).slice(0,12))if(!validStyle(key,required(value,key)))fail('definition.'+key+' is not supported');
  const colors=required(value,'colors');
  assertRecord(colors,'definition.colors');
  for(const key of ['skin','hair','eyes','brows','jacket','accent'] as const)if(!isHexColor(required(colors,key)))fail('definition.colors.'+key+' must be a #RRGGBB color');
  const transforms=required(value,'transforms');
  assertRecord(transforms,'definition.transforms');
  for(const key of ['eyes','brows','nose','mouth'] as const)validateTransform(required(transforms,key),'definition.transforms.'+key);
  const body=value.bodyProportions;
  if(body!==undefined){
    assertRecord(body,'definition.bodyProportions');
    for(const key of ['height','build','shoulders'] as const)if(!isFiniteNumber(body[key]))fail('definition.bodyProportions.'+key+' must be finite');
  }
  return normalizeCharacter(value as Partial<CharacterDefinition>);
}

function validateDelta(value:unknown,label:string):ExpressionTransformDelta{
  assertRecord(value,label);
  for(const key of ['x','y','scaleX','scaleY','rotation','spacing'] as const)if(value[key]!==undefined&&!isFiniteNumber(value[key]))fail(label+'.'+key+' must be finite');
  return structuredClone(value) as ExpressionTransformDelta;
}

function validatePreset(value:unknown,id:ExpressionId):ExpressionPresetDefinition{
  assertRecord(value,'expressions.'+id);
  if(value.id!==id)fail('expressions.'+id+'.id must be '+id);
  if(typeof value.label!=='string'||typeof value.description!=='string')fail('expressions.'+id+' needs label and description');
  if(value.eyeStyle!==undefined&&!validStyle('eyeStyle',value.eyeStyle))fail('expressions.'+id+'.eyeStyle is not supported');
  if(value.browStyle!==undefined&&!validStyle('browStyle',value.browStyle))fail('expressions.'+id+'.browStyle is not supported');
  if(value.mouthStyle!==undefined&&!validStyle('mouthStyle',value.mouthStyle))fail('expressions.'+id+'.mouthStyle is not supported');
  if(value.transforms!==undefined){
    const transforms=value.transforms;
    assertRecord(transforms,'expressions.'+id+'.transforms');
    for(const key of ['eyes','brows','nose','mouth'] as const)if(transforms[key]!==undefined)validateDelta(transforms[key],'expressions.'+id+'.transforms.'+key);
  }
  return structuredClone(value) as unknown as ExpressionPresetDefinition;
}

function normalizeExpressions(value:unknown):{active:ExpressionId;set:CharacterExpressionSet}{
  const fallback=cloneExpressionSet(DEFAULT_EXPRESSION_SET);
  if(value===undefined)return{active:fallback.defaultExpression,set:fallback};
  assertRecord(value,'expressions');
  if(value.active!==undefined&&!validExpression(value.active))fail('expressions.active is not supported');
  const rawSet=value.set;
  assertRecord(rawSet,'expressions.set');
  if(rawSet.version!==1)fail('expressions.set.version must be 1');
  if(rawSet.defaultExpression!==undefined){
    if(!validExpression(rawSet.defaultExpression))fail('expressions.set.defaultExpression is not supported');
    fallback.defaultExpression=rawSet.defaultExpression as ExpressionId;
  }
  const rawExpressions=rawSet.expressions;
  assertRecord(rawExpressions,'expressions.set.expressions');
  for(const id of EXPRESSION_ORDER){
    const preset=rawExpressions[id];
    if(preset!==undefined)fallback.expressions[id]=validatePreset(preset,id);
  }
  return{
    active:(value.active as ExpressionId|undefined)??fallback.defaultExpression,
    set:fallback,
  };
}

function normalizeMotion(value:unknown):CharacterMotionState{
  if(value===undefined)return structuredClone(DEFAULT_MOTION_STATE);
  assertRecord(value,'motion');
  if(value.version!==1)fail('motion.version must be 1');
  if(typeof value.pose!=='string'||!MOTION_POSES.has(value.pose as PoseId))fail('motion.pose is not supported');
  if(typeof value.action!=='string'||!MOTION_ACTIONS.has(value.action as MotionActionId))fail('motion.action is not supported');
  if(typeof value.playing!=='boolean')fail('motion.playing must be boolean');
  if(typeof value.autoBlink!=='boolean')fail('motion.autoBlink must be boolean');
  return normalizeMotionState(value as unknown as CharacterMotionState);
}

function validateMesh(value:unknown){
  assertRecord(value,'mesh');
  if(value.version!==1)fail('mesh.version must be 1');
  const layers=value.layers;
  assertArray(layers,'mesh.layers');
  if(layers.length===0)fail('mesh.layers must be a non-empty array');
  for(const [index,layerValue] of layers.entries()){
    assertRecord(layerValue,'mesh.layers['+index+']');
    if(typeof layerValue.id!=='string'||!isFiniteNumber(layerValue.zIndex))fail('mesh.layers['+index+'] has invalid id or zIndex');
    const positions=layerValue.positions,colors=layerValue.colors,indices=layerValue.indices;
    assertArray(positions,'mesh.layers['+index+'].positions');
    assertArray(colors,'mesh.layers['+index+'].colors');
    assertArray(indices,'mesh.layers['+index+'].indices');
    if(positions.length%3!==0||colors.length!==positions.length||indices.length%3!==0)fail('mesh.layers['+index+'] buffers have inconsistent lengths');
    if(!positions.every(isFiniteNumber)||!colors.every(isFiniteNumber)||!indices.every((item:unknown)=>typeof item==='number'&&Number.isInteger(item)&&item>=0))fail('mesh.layers['+index+'] contains invalid buffer values');
  }
  const bounds=value.bounds;
  if(!isRecord(bounds)||!['minX','minY','maxX','maxY'].every(key=>isFiniteNumber(bounds[key])))fail('mesh.bounds is invalid');
}

export function parseCharacterBundle(input:unknown):CharacterBundle{
  assertRecord(input,'root');
  if(input.format==='face-editor-polygon-character'){
    if(input.formatVersion!==1)fail('formatVersion must be 1');
    const definition=validateDefinition(required(input,'definition'));
    validateMesh(required(input,'mesh'));
    const expressions=normalizeExpressions(input.expressions),motion=normalizeMotion(input.motion);
    return{
      format:'face-editor-polygon-character',
      formatVersion:1,
      definition,
      mesh:structuredClone(input.mesh) as CharacterBundle['mesh'],
      expressions,
      motion,
    };
  }
  if('baseStyle' in input&&'colors' in input&&'transforms' in input){
    const definition=validateDefinition(input),bundle=exportCharacterBundle(definition,{activeExpression:'neutral',expressionSet:DEFAULT_EXPRESSION_SET});bundle.motion=structuredClone(DEFAULT_MOTION_STATE);return bundle;
  }
  return fail('expected a face-editor-polygon-character bundle');
}

export function serializeCharacterBundle(bundle:CharacterBundle):string{
  return JSON.stringify(bundle,null,2);
}

export function expressionStateForBundle(bundle:CharacterBundle){
  return{
    active:bundle.expressions?.active??'neutral',
    set:cloneExpressionSet(bundle.expressions?.set??DEFAULT_EXPRESSION_SET),
  };
}

export function motionStateForBundle(bundle:CharacterBundle){return normalizeMotionState(bundle.motion??DEFAULT_MOTION_STATE);}
