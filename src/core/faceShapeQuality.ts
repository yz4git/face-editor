import type { FaceShapeId,Vec2 } from './types';

type FaceProfile={width:number;height:number;cheek:number;jaw:number;forehead:number};
const PROFILES:Record<FaceShapeId,FaceProfile>={
  soft:{width:1,height:1,cheek:.025,jaw:-.025,forehead:0},
  oval:{width:.97,height:1.045,cheek:.015,jaw:-.045,forehead:0},
  angular:{width:.985,height:1.025,cheek:.065,jaw:-.105,forehead:-.015},
  round:{width:1.075,height:.94,cheek:.075,jaw:.04,forehead:.02},
  square:{width:1.045,height:1.005,cheek:.025,jaw:.09,forehead:.025},
  pointed:{width:.985,height:1.04,cheek:.055,jaw:-.19,forehead:.01},
  'long-oval':{width:.925,height:1.115,cheek:.015,jaw:-.06,forehead:0},
  hex:{width:1.025,height:1.02,cheek:.105,jaw:.035,forehead:-.025},
  diamond:{width:.96,height:1.055,cheek:.135,jaw:-.13,forehead:-.07},
  tapered:{width:.95,height:.99,cheek:.035,jaw:-.155,forehead:.015},
};

const CENTER_Y=.72;
const clamp01=(value:number)=>Math.max(0,Math.min(1,value));

/** Adds a second, semantic contour pass after source-sheet auto-fit. */
export function refineFaceShapePoint(id:FaceShapeId,point:Vec2):Vec2{
  const profile=PROFILES[id],relativeY=(point[1]-CENTER_Y)*profile.height,y=CENTER_Y+relativeY;
  const lower=clamp01((CENTER_Y-y)/.62),upper=clamp01((y-CENTER_Y)/.64),cheek=1-clamp01(Math.abs(y-CENTER_Y)/.48);
  const widthScale=profile.width+profile.cheek*cheek+profile.jaw*lower+profile.forehead*upper;
  return[point[0]*Math.max(.72,widthScale),y];
}

export function faceShapeProfile(id:FaceShapeId){return structuredClone(PROFILES[id]);}
