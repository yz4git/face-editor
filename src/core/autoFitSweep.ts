import { getCharacterAutoFitReport } from './compileCharacter';
import type { CharacterDefinition } from './types';
import {
  ACCENT_OPTIONS,BROW_OPTIONS,DEFAULT_CHARACTER,EYE_OPTIONS,FACE_OPTIONS,HAIR_OPTIONS,HOOD_OPTIONS,MOUTH_OPTIONS,NOSE_OPTIONS,OUTFIT_OPTIONS,SHIRT_OPTIONS,STRAP_OPTIONS,
} from '../data/parts';

export type AuditFamily='outfit'|'hood'|'shirt'|'strap'|'accent'|'hair'|'face'|'eye'|'brow'|'nose'|'mouth';
interface FamilySpec { family:AuditFamily; ids:string[]; apply:(definition:CharacterDefinition,id:string)=>void }

const ids=(items:{id:string}[])=>items.map(item=>item.id);
export const AUDIT_FAMILIES:readonly FamilySpec[]=[
  {family:'outfit',ids:ids(OUTFIT_OPTIONS),apply:(c,id)=>{c.outfitStyle=id as CharacterDefinition['outfitStyle'];}},
  {family:'hood',ids:ids(HOOD_OPTIONS),apply:(c,id)=>{c.hoodStyle=id as CharacterDefinition['hoodStyle'];}},
  {family:'shirt',ids:ids(SHIRT_OPTIONS),apply:(c,id)=>{c.shirtStyle=id as CharacterDefinition['shirtStyle'];}},
  {family:'strap',ids:ids(STRAP_OPTIONS),apply:(c,id)=>{c.strapStyle=id as CharacterDefinition['strapStyle'];}},
  {family:'accent',ids:ids(ACCENT_OPTIONS),apply:(c,id)=>{c.accentStyle=id as CharacterDefinition['accentStyle'];}},
  {family:'hair',ids:ids(HAIR_OPTIONS),apply:(c,id)=>{c.hairStyle=id as CharacterDefinition['hairStyle'];}},
  {family:'face',ids:ids(FACE_OPTIONS),apply:(c,id)=>{c.faceShape=id as CharacterDefinition['faceShape'];}},
  {family:'eye',ids:ids(EYE_OPTIONS),apply:(c,id)=>{c.eyeStyle=id as CharacterDefinition['eyeStyle'];}},
  {family:'brow',ids:ids(BROW_OPTIONS),apply:(c,id)=>{c.browStyle=id as CharacterDefinition['browStyle'];}},
  {family:'nose',ids:ids(NOSE_OPTIONS),apply:(c,id)=>{c.noseStyle=id as CharacterDefinition['noseStyle'];}},
  {family:'mouth',ids:ids(MOUTH_OPTIONS),apply:(c,id)=>{c.mouthStyle=id as CharacterDefinition['mouthStyle'];}},
];

const hash=(...values:number[])=>values.reduce((h,v)=>Math.imul(h^((v+1)*0x45d9f3b),0x27d4eb2d)>>>0,0x811c9dc5);
const signature=(c:CharacterDefinition)=>[c.outfitStyle,c.hoodStyle,c.shirtStyle,c.strapStyle,c.accentStyle,c.hairStyle,c.faceShape,c.eyeStyle,c.browStyle,c.noseStyle,c.mouthStyle].join('|');

// Create one deterministic character for every value-pair across every pair of families. Other
// families are filled by a stable hash so the same pair is exercised against varied neighbors.
// Duplicate full characters are removed; pair coverage is preserved because an identical character
// already contains the requested pair.
export function generatePairwiseAuditDefinitions():CharacterDefinition[]{
  const cases:CharacterDefinition[]=[],seen=new Set<string>();
  for(let a=0;a<AUDIT_FAMILIES.length;a++)for(let b=a+1;b<AUDIT_FAMILIES.length;b++){
    const fa=AUDIT_FAMILIES[a],fb=AUDIT_FAMILIES[b];
    for(let ai=0;ai<fa.ids.length;ai++)for(let bi=0;bi<fb.ids.length;bi++){
      const c=structuredClone(DEFAULT_CHARACTER);fa.apply(c,fa.ids[ai]);fb.apply(c,fb.ids[bi]);
      for(let k=0;k<AUDIT_FAMILIES.length;k++)if(k!==a&&k!==b){const f=AUDIT_FAMILIES[k],index=hash(a,b,ai,bi,k)%f.ids.length;f.apply(c,f.ids[index]);}
      const key=signature(c);if(seen.has(key))continue;seen.add(key);cases.push(c);
    }
  }
  return cases;
}

function pairKey(a:AuditFamily,ai:string,b:AuditFamily,bi:string){return`${a}:${ai}<>${b}:${bi}`;}
function expectedPairKeys(){const expected=new Set<string>();for(let a=0;a<AUDIT_FAMILIES.length;a++)for(let b=a+1;b<AUDIT_FAMILIES.length;b++)for(const ai of AUDIT_FAMILIES[a].ids)for(const bi of AUDIT_FAMILIES[b].ids)expected.add(pairKey(AUDIT_FAMILIES[a].family,ai,AUDIT_FAMILIES[b].family,bi));return expected;}
function selectedId(c:CharacterDefinition,family:AuditFamily):string{switch(family){case'outfit':return c.outfitStyle;case'hood':return c.hoodStyle;case'shirt':return c.shirtStyle;case'strap':return c.strapStyle;case'accent':return c.accentStyle;case'hair':return c.hairStyle;case'face':return c.faceShape;case'eye':return c.eyeStyle;case'brow':return c.browStyle;case'nose':return c.noseStyle;case'mouth':return c.mouthStyle;}}

export interface AutoFitSweepResult {
  version:1;
  caseCount:number;
  selectablePartCount:number;
  seenPartCount:number;
  pairCoverage:{covered:number;total:number;ratio:number};
  errorCount:number;
  worstFits:{caseIndex:number;family:string;id:string;score:number}[];
  errors:{caseIndex:number;code:string;family:string;id:string;value:number;limit:number}[];
}

export function evaluatePairwiseAutoFitSweep():AutoFitSweepResult{
  const definitions=generatePairwiseAuditDefinitions(),seenParts=new Set<string>(),coveredPairs=new Set<string>(),errors:AutoFitSweepResult['errors']=[],fits:AutoFitSweepResult['worstFits']=[];
  for(let caseIndex=0;caseIndex<definitions.length;caseIndex++){
    const definition=definitions[caseIndex],report=getCharacterAutoFitReport(definition);
    for(const entry of report.entries){seenParts.add(`${entry.family}:${entry.id.replace(/:(left|right)$/,'')}`);fits.push({caseIndex,family:entry.family,id:entry.id,score:entry.score});}
    for(const issue of report.issues??[])if(issue.severity==='error')errors.push({caseIndex,code:issue.code,family:issue.family,id:issue.id,value:issue.value,limit:issue.limit});
    for(let a=0;a<AUDIT_FAMILIES.length;a++)for(let b=a+1;b<AUDIT_FAMILIES.length;b++)coveredPairs.add(pairKey(AUDIT_FAMILIES[a].family,selectedId(definition,AUDIT_FAMILIES[a].family),AUDIT_FAMILIES[b].family,selectedId(definition,AUDIT_FAMILIES[b].family)));
  }
  const expected=expectedPairKeys(),covered=[...expected].filter(key=>coveredPairs.has(key)).length,total=expected.size,selectablePartCount=AUDIT_FAMILIES.reduce((sum,f)=>sum+f.ids.length,0);
  return{version:1,caseCount:definitions.length,selectablePartCount,seenPartCount:seenParts.size,pairCoverage:{covered,total,ratio:total?covered/total:1},errorCount:errors.length,worstFits:fits.sort((a,b)=>b.score-a.score).slice(0,50),errors:errors.slice(0,200)};
}
