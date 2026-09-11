import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld, RESCUE_SPOTS } from '../src/world.js';
import { createPlayer } from '../src/player.js';
import { createJourney } from '../src/playtest.js';
import { createTrialState, FEATHER_SPOTS, rescueRequirement, segmentDistance } from '../src/adventure.js';
import { freshSave } from '../src/save.js';

test('continuous adventure can collect prerequisites, complete canal, land and rescue all friends',()=>{
  const world=createWorld(new THREE.Scene()),player=createPlayer(world.collision,world.isInWater),save=freshSave();
  const trail=createTrialState();
  const feathers=FEATHER_SPOTS.map(([x,z])=>[x,world.collision.surface(x,z)+.5,z]);
  const mission={honk(p){
    const id=RESCUE_SPOTS.findIndex(s=>Math.hypot(s.x-p.x,s.z-p.z)<4.5&&Math.abs(s.y-p.y)<1.7);
    if(id>=0&&!rescueRequirement(id,p,save))save.rescued.push(id);
  }};
  const journey=createJourney(player,mission,save);let result;
  for(let frame=0;frame<60*400;frame++) {
    result=journey.update(1/60);if(result.done)break;
    const before={...player.state};player.update(1/60,result.input,-Math.PI/2);
    feathers.forEach((f,id)=>{if(!save.feathers.includes(id)&&segmentDistance(f,before,player.state)<1.15)save.feathers.push(id);});
    const event=trail.update(1/60,before,player.state);if(event?.type==='finish')save.trials[event.trial.id]=event.elapsed;
  }
  assert.match(result.status,/Journey PASS/,JSON.stringify({result,state:player.state,save}));
  assert.equal(save.rescued.length,5);assert.ok(save.feathers.length>=3);assert.ok(save.trials.canal>0);
  assert.ok(Math.hypot(player.state.x-22,player.state.z-7)<3);
});
