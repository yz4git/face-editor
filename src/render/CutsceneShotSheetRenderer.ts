import { compileCharacter } from '../core/compileCharacter';
import { evaluateCutscene, normalizeCutsceneProject } from '../core/cutsceneSystem';
import { applyExpression } from '../core/expressionSystem';
import { applyMotionInPlace } from '../core/motionSystem';
import type { CharacterDefinition, CharacterExpressionSet, CompiledPolygonCharacter, CutsceneCameraState, CutsceneProject } from '../core/types';

function drawCharacter(ctx:CanvasRenderingContext2D,character:CompiledPolygonCharacter,camera:CutsceneCameraState,x:number,y:number,width:number,height:number){
  const {minX,maxX,minY,maxY}=character.bounds,baseHalf=Math.max(maxX-minX,maxY-minY)*.62,half=baseHalf/camera.zoom,centerX=(minX+maxX)/2+camera.panX*baseHalf*.55,centerY=(minY+maxY)/2+camera.panY*baseHalf*.55,aspect=width/Math.max(height,1);
  const point=(px:number,py:number)=>({x:x+((px-centerX)+half*aspect)/(2*half*aspect)*width,y:y+(centerY+half-py)/(2*half)*height});
  for(const layer of character.layers){
    const {positions,colors,indices}=layer;
    for(let i=0;i<indices.length;i+=3){
      const ia=indices[i]*3,ib=indices[i+1]*3,ic=indices[i+2]*3,p0=point(positions[ia],positions[ia+1]),p1=point(positions[ib],positions[ib+1]),p2=point(positions[ic],positions[ic+1]),r=Math.round((colors[ia]+colors[ib]+colors[ic])/3*255),g=Math.round((colors[ia+1]+colors[ib+1]+colors[ic+1])/3*255),b=Math.round((colors[ia+2]+colors[ib+2]+colors[ic+2])/3*255),fill=`rgb(${r},${g},${b})`;
      ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=fill;ctx.lineWidth=.7;ctx.stroke();
    }
  }
}

function timecode(ms:number){const total=Math.max(0,ms)/1000,minutes=Math.floor(total/60),seconds=Math.floor(total%60),tenths=Math.floor(total*10)%10;return`${minutes}:${String(seconds).padStart(2,'0')}.${tenths}`;}

export function createCutsceneShotSheetCanvas(definition:CharacterDefinition,set:CharacterExpressionSet,projectInput:CutsceneProject){
  const project=normalizeCutsceneProject(projectInput),columns=3,cellW=390,cellH=300,gap=18,left=36,top=112,rows=Math.max(1,Math.ceil(project.cues.length/columns));
  const canvas=document.createElement('canvas');canvas.width=left*2+columns*cellW+(columns-1)*gap;canvas.height=top+rows*cellH+(rows-1)*gap+42;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D unavailable');
  ctx.fillStyle='#edf3f7';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#37285e';ctx.font='900 30px system-ui,sans-serif';ctx.fillText(`CUTSCENE SHOT SHEET · ${project.title}`,42,52);
  ctx.fillStyle='#647386';ctx.font='700 13px system-ui,sans-serif';ctx.fillText(`${project.cues.length} CUES · ${timecode(project.durationMs)} · EXPRESSION + MOTION + CAMERA`,44,78);
  project.cues.forEach((cue,index)=>{
    const column=index%columns,row=Math.floor(index/columns),x=left+column*(cellW+gap),y=top+row*(cellH+gap),state=evaluateCutscene(project,cue.timeMs),expressed=applyExpression(definition,state.expression,set),compiled=compileCharacter(expressed);
    applyMotionInPlace(compiled,{version:1,pose:state.pose,action:state.action,playing:true,autoBlink:false},state.timeMs);
    ctx.fillStyle='#fffdf9';ctx.fillRect(x,y,cellW,cellH);ctx.strokeStyle='#b9c8d2';ctx.lineWidth=2;ctx.strokeRect(x,y,cellW,cellH);
    ctx.save();ctx.beginPath();ctx.rect(x+1,y+34,cellW-2,cellH-86);ctx.clip();ctx.fillStyle='#c9e9ff';ctx.fillRect(x+1,y+34,cellW-2,cellH-86);drawCharacter(ctx,compiled,state.camera,x+1,y+34,cellW-2,cellH-86);ctx.restore();
    ctx.fillStyle='#6944b3';ctx.font='900 13px system-ui,sans-serif';ctx.fillText(`${String(index+1).padStart(2,'0')} · ${cue.label}`,x+14,y+23);
    ctx.fillStyle='#5e6876';ctx.font='700 10px system-ui,sans-serif';ctx.fillText(`${timecode(cue.timeMs)} · ${state.expression.toUpperCase()} · ${state.pose.toUpperCase()} · ${state.action.toUpperCase()}`,x+14,y+cellH-36);
    if(state.dialogue){ctx.fillStyle='#222a37';ctx.font='700 11px system-ui,sans-serif';const dialogue=state.dialogue.length>52?state.dialogue.slice(0,49)+'…':state.dialogue;ctx.fillText(dialogue,x+14,y+cellH-16);}
  });
  return canvas;
}

export function downloadCutsceneShotSheet(definition:CharacterDefinition,set:CharacterExpressionSet,project:CutsceneProject){
  const canvas=createCutsceneShotSheetCanvas(definition,set,project),anchor=document.createElement('a');anchor.href=canvas.toDataURL('image/png');anchor.download='polygon-character-cutscene-shot-sheet.png';anchor.click();
}

export function downloadCutsceneJson(projectInput:CutsceneProject){
  const project=normalizeCutsceneProject(projectInput),blob=new Blob([JSON.stringify(project,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='polygon-character-cutscene.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),0);
}
