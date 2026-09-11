import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWorld} from '../src/world.js';
import {createPlayer} from '../src/player.js';
import {createTrialState,TRIALS} from '../src/adventure.js';
for(const id of ['pond','roofs'])test(`${id} course can be completed using normal movement without bypassing scenery`,()=>{
  const world=createWorld(new THREE.Scene()),trial=TRIALS.find(t=>t.id===id),first=trial.points[0];
  const p=createPlayer(world.collision,world.isInWater,{x:first[0],y:first[1],z:first[2],yaw:Math.PI});p.state.mode=trial.kind;
  const state=createTrialState();let completed;
  state.update(1/60,p.state,p.state);
  for(let frame=0;frame<trial.limit*60;frame++){
    const target=trial.points[state.active?.index??0],dx=target[0]-p.state.x,dz=target[2]-p.state.z,len=Math.max(1,Math.hypot(dx,dz));
    let input={x:-dz/len,z:dx/len,jump:false};
    if(id==='roofs'){
      const delta=Math.atan2(Math.sin(Math.atan2(dx,dz)-p.state.yaw),Math.cos(Math.atan2(dx,dz)-p.state.yaw));
      input={x:Math.max(-1,Math.min(1,-delta*1.4)),z:len>6?-1:1,jump:p.state.y<target[1]+.3,dive:p.state.y>target[1]+2};
    }
    const before={...p.state};p.update(1/60,input,-Math.PI/2);const event=state.update(1/60,before,p.state);
    if(event?.type==='finish'){completed=event;break;}
  }
  assert.ok(completed,JSON.stringify({p:p.state,active:state.active}));
  console.log(`${id} normal-input completion: ${completed.elapsed.toFixed(1)}s`);
});
