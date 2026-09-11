import test from 'node:test';
import assert from 'node:assert/strict';
import { rescueRequirement,createTrialState,TRIALS,segmentDistance } from '../src/adventure.js';
import { freshSave,loadSave,writeSave } from '../src/save.js';
test('friends require their distinct encounter conditions',()=>{
  const save=freshSave();assert.ok(rescueRequirement(0,{mode:'fly'},save));assert.equal(rescueRequirement(0,{mode:'swim'},save),null);
  assert.ok(rescueRequirement(1,{mode:'fly'},save));assert.equal(rescueRequirement(1,{mode:'ground'},save),null);
  assert.ok(rescueRequirement(2,{mode:'swim'},save));save.trials.canal=40;assert.equal(rescueRequirement(2,{mode:'swim'},save),null);
  assert.ok(rescueRequirement(3,{mode:'ground'},save));save.feathers=[1,2,3];assert.equal(rescueRequirement(3,{mode:'ground'},save),null);
  assert.ok(rescueRequirement(4,{mode:'ground'},save));save.rescued=[0,1,2,3];assert.equal(rescueRequirement(4,{mode:'ground'},save),null);
});
test('trial only starts in correct traversal mode and requires every checkpoint',()=>{
  const state=createTrialState(),trial=TRIALS[1];let p={x:0,y:-.27,z:-34,mode:'fly'};assert.equal(state.update(.1,p,p),null);
  p.mode='swim';assert.equal(state.update(.1,p,p).type,'start');
  let last=p;
  for(const point of trial.points.slice(1)){p={x:point[0],y:point[1],z:point[2],mode:'swim'};const result=state.update(2,last,p);last=p;if(point===trial.points.at(-1))assert.equal(result.type,'finish');}
  assert.equal(state.active,null);
});
test('trial timeout allows clean retry',()=>{
  const state=createTrialState();const p={x:0,y:-.27,z:-34,mode:'swim'};state.update(.1,p,p);assert.equal(state.update(100,p,p).type,'timeout');assert.equal(state.active,null);assert.equal(state.update(.1,p,p),null);assert.equal(state.update(4,p,p).type,'start');
});
test('swept checkpoint works at high speeds',()=>{assert.equal(segmentDistance([0,5,0],{x:-10,y:5,z:0},{x:10,y:5,z:0}),0);});
test('save validates corrupt data and persists progress',()=>{
  let value='invalid';const storage={getItem:()=>value,setItem:(_,next)=>{value=next;}};assert.deepEqual(loadSave(storage),freshSave());
  const save=freshSave();save.rescued=[1];save.feathers=[3];save.trials.pond=12.3;assert.equal(writeSave(save,storage),true);assert.deepEqual(loadSave(storage),save);
  value=JSON.stringify({version:2,rescued:[1,1,-1,9,'x'],feathers:[2,2,null],trials:{pond:-1,roofs:25,unknown:2}});const valid=loadSave(storage);assert.deepEqual(valid.rescued,[1]);assert.deepEqual(valid.feathers,[2]);assert.deepEqual(valid.trials,{roofs:25});
});
test('storage denied still permits play',()=>{const storage={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};assert.deepEqual(loadSave(storage),freshSave());assert.equal(writeSave(freshSave(),storage),false);});

test('guidance follows prerequisites before the friend and active checkpoints override it', async()=>{
  const {objectiveFor,FRIENDS}=await import('../src/adventure.js');const save=freshSave(),player={x:0,y:0,z:0};
  assert.equal(objectiveFor(FRIENDS[2],save,player,[],null).trial,'canal');
  save.trials.canal=20;assert.equal(objectiveFor(FRIENDS[2],save,player,[],null).kind,'friend');
  const f=[{id:0,x:10,y:0,z:0},{id:1,x:2,y:0,z:0}];
  assert.equal(objectiveFor(FRIENDS[3],save,player,f,null).id,1);
  assert.equal(objectiveFor(FRIENDS[3],save,player,f,{id:'pond',index:2}).name,'Ring 3');
  assert.equal(objectiveFor(null,save,player,f,null,'roofs').kind,'trail');
  assert.equal(objectiveFor(null,save,player,f,null).kind,'home');
});

test('a blocked localStorage property cannot prevent startup or saving fallback',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw new Error('SecurityError');}});
  try {assert.deepEqual(loadSave(),freshSave());assert.equal(writeSave(freshSave()),false);}
  finally {if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete globalThis.localStorage;}
});
