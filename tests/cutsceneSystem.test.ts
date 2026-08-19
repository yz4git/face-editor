import { describe,expect,it } from 'vitest';
import { CUTSCENE_TEMPLATES, DEFAULT_CUTSCENE_CAMERA, evaluateCutscene, normalizeCutsceneProject } from '../src/core/cutsceneSystem';
import type { CutsceneProject } from '../src/core/types';

describe('Cutscene Studio v1 timeline engine',()=>{
  it('ships three useful deterministic templates',()=>{
    expect(Object.keys(CUTSCENE_TEMPLATES)).toEqual(['intro','reaction','battle']);
    expect(CUTSCENE_TEMPLATES.intro.cues).toHaveLength(4);
    expect(CUTSCENE_TEMPLATES.reaction.durationMs).toBe(6000);
    expect(CUTSCENE_TEMPLATES.battle.cues.at(-1)?.pose).toBe('run');
  });

  it('sorts, clamps and de-duplicates malformed cues safely',()=>{
    const project=normalizeCutsceneProject({version:1,title:'  A very long test cutscene title that should still normalize cleanly  ',durationMs:999999,cues:[
      {id:'same',timeMs:5000,label:'later',camera:{zoom:99,panX:-99,panY:99}},
      {id:'same',timeMs:-100,label:'start',expression:'bad' as never,pose:'fight'},
    ]});
    expect(project.durationMs).toBe(30000);
    expect(project.cues.map(cue=>cue.timeMs)).toEqual([0,5000]);
    expect(new Set(project.cues.map(cue=>cue.id)).size).toBe(2);
    expect(project.cues[0].pose).toBe('fight');
    expect(project.cues[0].expression).toBeUndefined();
    expect(project.cues[1].camera).toEqual({zoom:1.8,panX:-1,panY:1});
    expect(project.title.length).toBeLessThanOrEqual(48);
  });

  it('holds discrete acting cues at boundaries',()=>{
    const project:CutsceneProject={version:1,title:'Boundary',durationMs:5000,cues:[
      {id:'a',timeMs:0,label:'A',expression:'neutral',pose:'idle',action:'breathe',dialogue:''},
      {id:'b',timeMs:2000,label:'B',expression:'angry',pose:'fight',action:'talk',dialogue:'Now.'},
      {id:'c',timeMs:4000,label:'C',action:'none',dialogue:''},
    ]};
    expect(evaluateCutscene(project,1999)).toMatchObject({expression:'neutral',pose:'idle',action:'breathe',dialogue:''});
    expect(evaluateCutscene(project,2000)).toMatchObject({expression:'angry',pose:'fight',action:'talk',dialogue:'Now.'});
    expect(evaluateCutscene(project,4500)).toMatchObject({expression:'angry',pose:'fight',action:'none',dialogue:''});
  });

  it('interpolates only authored camera cues and holds edge cameras',()=>{
    const project:CutsceneProject={version:1,title:'Camera',durationMs:6000,cues:[
      {id:'a',timeMs:1000,label:'Wide',camera:{zoom:.8,panX:-.2,panY:0}},
      {id:'b',timeMs:3000,label:'Act',expression:'happy'},
      {id:'c',timeMs:5000,label:'Close',camera:{zoom:1.6,panX:.2,panY:.4}},
    ]};
    expect(evaluateCutscene(project,0).camera).toEqual({zoom:.8,panX:-.2,panY:0});
    expect(evaluateCutscene(project,3000).camera).toEqual({zoom:1.2,panX:0,panY:.2});
    expect(evaluateCutscene(project,6000).camera).toEqual({zoom:1.6,panX:.2,panY:.4});
  });

  it('creates a safe default project when cues are missing',()=>{
    const project=normalizeCutsceneProject({version:1,title:'Empty',durationMs:8000,cues:[]});
    expect(project.cues).toHaveLength(1);
    expect(project.cues[0]).toMatchObject({timeMs:0,expression:'neutral',pose:'idle',action:'breathe'});
    expect(project.cues[0].camera).toEqual(DEFAULT_CUTSCENE_CAMERA);
  });
});
