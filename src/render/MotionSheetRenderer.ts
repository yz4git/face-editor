import { compileCharacter } from '../core/compileCharacter';
import { applyExpression } from '../core/expressionSystem';
import { applyMotionInPlace } from '../core/motionSystem';
import type { CharacterDefinition, CharacterExpressionSet, CompiledPolygonCharacter, ExpressionId, PoseId } from '../core/types';

const SHEET_PROFILES:readonly {pose:PoseId;expression:ExpressionId;label:string}[]=[
  {pose:'idle',expression:'neutral',label:'IDLE · NEUTRAL'},
  {pose:'relax',expression:'smile',label:'RELAX · SMILE'},
  {pose:'confident',expression:'serious',label:'CONFIDENT · SERIOUS'},
  {pose:'cute',expression:'happy',label:'CUTE · HAPPY'},
  {pose:'fight',expression:'angry',label:'FIGHT · ANGRY'},
  {pose:'run',expression:'neutral',label:'RUN · NEUTRAL'},
];

function drawCharacter(ctx:CanvasRenderingContext2D,character:CompiledPolygonCharacter,x:number,y:number,width:number,height:number){
  const {minX,maxX,minY,maxY}=character.bounds,sourceW=Math.max(.001,maxX-minX),sourceH=Math.max(.001,maxY-minY),scale=Math.min(width/sourceW,height/sourceH)*.86,cx=(minX+maxX)/2,cy=(minY+maxY)/2,screenX=x+width/2,screenY=y+height/2;
  const point=(px:number,py:number)=>({x:screenX+(px-cx)*scale,y:screenY-(py-cy)*scale});
  for(const layer of character.layers){
    const {positions,colors,indices}=layer;
    for(let i=0;i<indices.length;i+=3){
      const ia=indices[i]*3,ib=indices[i+1]*3,ic=indices[i+2]*3,p0=point(positions[ia],positions[ia+1]),p1=point(positions[ib],positions[ib+1]),p2=point(positions[ic],positions[ic+1]),r=Math.round((colors[ia]+colors[ib]+colors[ic])/3*255),g=Math.round((colors[ia+1]+colors[ib+1]+colors[ic+1])/3*255),b=Math.round((colors[ia+2]+colors[ib+2]+colors[ic+2])/3*255),fill=`rgb(${r},${g},${b})`;
      ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=fill;ctx.lineWidth=.7;ctx.stroke();
    }
  }
}

export function createMotionSheetCanvas(definition:CharacterDefinition,set:CharacterExpressionSet){
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=800;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D unavailable');
  ctx.fillStyle='#edf3f7';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#123a59';ctx.font='900 30px system-ui,sans-serif';ctx.fillText('POLYGON CHARACTER · MOTION SHEET',42,52);
  ctx.fillStyle='#557184';ctx.font='700 13px system-ui,sans-serif';ctx.fillText('BODY PROPORTION + EXPRESSION + POSE · GENERATED FROM ONE NON-DESTRUCTIVE CHARACTER DEFINITION',44,78);
  const columns=3,rows=2,gap=18,left=36,top=108,cellW=(canvas.width-left*2-gap*(columns-1))/columns,cellH=(canvas.height-top-42-gap*(rows-1))/rows;
  SHEET_PROFILES.forEach((profile,index)=>{
    const column=index%columns,row=Math.floor(index/columns),x=left+column*(cellW+gap),y=top+row*(cellH+gap);
    ctx.fillStyle='#fffdf9';ctx.fillRect(x,y,cellW,cellH);ctx.strokeStyle='#b9c8d2';ctx.lineWidth=2;ctx.strokeRect(x,y,cellW,cellH);
    const expressed=applyExpression(definition,profile.expression,set),compiled=compileCharacter(expressed);
    applyMotionInPlace(compiled,{version:1,pose:profile.pose,action:'none',playing:false,autoBlink:false},0);
    drawCharacter(ctx,compiled,x+12,y+34,cellW-24,cellH-48);
    ctx.fillStyle='#126bd1';ctx.font='900 13px system-ui,sans-serif';ctx.fillText(profile.label,x+16,y+24);
  });
  return canvas;
}

export function downloadMotionSheet(definition:CharacterDefinition,set:CharacterExpressionSet){
  const canvas=createMotionSheetCanvas(definition,set),url=canvas.toDataURL('image/png'),anchor=document.createElement('a');
  anchor.href=url;anchor.download='polygon-character-motion-sheet.png';anchor.click();
}
