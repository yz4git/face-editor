import type { BodyProportions, Vec2 } from './types';

export const DEFAULT_BODY_PROPORTIONS:BodyProportions={height:1,build:1,shoulders:1};
export const BODY_PROPORTION_LIMITS={
  height:{min:.78,max:1.25,step:.01},
  build:{min:.80,max:1.25,step:.01},
  shoulders:{min:.80,max:1.35,step:.01},
} as const;

export const BODY_NECK_PIVOT_Y=.18;
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

export function normalizeBodyProportions(input?:Partial<BodyProportions>|null):BodyProportions{
  return{
    height:clamp(Number.isFinite(input?.height)?input!.height!:1,BODY_PROPORTION_LIMITS.height.min,BODY_PROPORTION_LIMITS.height.max),
    build:clamp(Number.isFinite(input?.build)?input!.build!:1,BODY_PROPORTION_LIMITS.build.min,BODY_PROPORTION_LIMITS.build.max),
    shoulders:clamp(Number.isFinite(input?.shoulders)?input!.shoulders!:1,BODY_PROPORTION_LIMITS.shoulders.min,BODY_PROPORTION_LIMITS.shoulders.max),
  };
}

function createWidthMapper(body:BodyProportions,buildGain:number,shoulderGain:number){
  return(point:Vec2):Vec2=>{
    const belowNeck=Math.max(0,BODY_NECK_PIVOT_Y-point[1]);
    const torsoInfluence=clamp(belowNeck/.42,0,1);
    const shoulderRise=clamp(belowNeck/.72,0,1);
    const lowerFade=1-.58*clamp((-point[1]-.78)/1.25,0,1);
    const shoulderInfluence=shoulderRise*lowerFade;
    const widthScale=1+(body.build-1)*buildGain*torsoInfluence+(body.shoulders-1)*shoulderGain*shoulderInfluence;
    return[
      point[0]*widthScale,
      BODY_NECK_PIVOT_Y+(point[1]-BODY_NECK_PIVOT_Y)*body.height,
    ];
  };
}

export function createBodyProportionMapper(input?:Partial<BodyProportions>|null){
  return createWidthMapper(normalizeBodyProportions(input),1,1);
}

/**
 * Clothing follows the same height as the body but deliberately under-reacts to width extremes.
 * This keeps collars, lapels and shoulder panels readable at BUILD/SHOULDERS limits instead of
 * simply multiplying garment width until the head looks undersized.
 */
export function createClothingProportionMapper(input?:Partial<BodyProportions>|null){
  return createWidthMapper(normalizeBodyProportions(input),.82,.70);
}

export function bodyProportionsAreDefault(input?:Partial<BodyProportions>|null){
  const body=normalizeBodyProportions(input);
  return body.height===1&&body.build===1&&body.shoulders===1;
}
