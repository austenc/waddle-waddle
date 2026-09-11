import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer } from '../src/player.js';
import { createCollisionWorld } from '../src/physics.js';
import { clipCamera } from '../src/camera.js';
const empty={x:0,z:0,jump:false,jumpPressed:false,boost:false,dive:false,roll:0};
const flat=createCollisionWorld([],()=>false,116);
function advance(player,seconds,input,cameraYaw=0){for(let i=0;i<seconds*60;i++)player.update(1/60,{...empty,...input},cameraYaw);}
test('ground sideways and backward motion stay straight with stable camera',()=>{
  const p=createPlayer(flat,()=>false,{x:0,y:0,z:0,yaw:0});advance(p,3,{x:1});assert.ok(p.state.x< -18);assert.ok(Math.abs(p.state.z)<.01);
  p.reset({x:0,y:0,z:0,yaw:0});advance(p,3,{z:1});assert.ok(p.state.z< -18);assert.ok(Math.abs(p.state.x)<.01);
});
test('holding Space takes off, releasing glides and still steers',()=>{
  const p=createPlayer(flat,()=>false,{x:0,y:0,z:0,yaw:0});advance(p,2,{jump:true,z:-1});assert.equal(p.state.mode,'fly');assert.ok(p.state.y>8);
  const y=p.state.y,yaw=p.state.yaw;advance(p,1,{x:1});assert.ok(p.state.y<y+1);assert.ok(p.state.yaw<yaw-.5);assert.equal(p.state.mode,'fly');
});
test('release/press double-jump retains flight shortcut',()=>{
  const p=createPlayer(flat,()=>false,{x:0,y:0,z:0,yaw:0});advance(p,.05,{jump:true});advance(p,.05,{});advance(p,.05,{jump:true});assert.equal(p.state.mode,'fly');
});
test('braking flight lands on roof and walking off falls naturally',()=>{
  const roof={x:0,z:0,w:15,d:15,bottom:0,top:8.3};const collision=createCollisionWorld([roof],()=>false,116);
  const p=createPlayer(collision,()=>false,{x:0,y:16,z:4,yaw:Math.PI});p.state.mode='fly';advance(p,4,{z:1});assert.equal(p.state.mode,'ground');assert.ok(Math.abs(p.state.y-8.3)<.001);
  advance(p,2,{x:1});assert.ok(p.state.y<8.3);
});
test('water entry supports paddling; shore exit does not trap player',()=>{
  const water=x=>x<0,collision=createCollisionWorld([],water,116);const p=createPlayer(collision,water,{x:1,y:0,z:0,yaw:0});advance(p,1,{x:1});assert.equal(p.state.mode,'swim');assert.equal(p.state.y,-.27);
  advance(p,2,{x:-1});assert.equal(p.state.mode,'ground');assert.equal(p.state.y,0);
});
test('ascending under bridge stops at ceiling and does not tunnel',()=>{
  const bridge={x:0,z:0,w:20,d:20,bottom:1.2,top:1.8};const water=()=>true;const p=createPlayer(createCollisionWorld([bridge],water,116),water,{x:0,y:-.27,z:0,yaw:0});p.state.mode='swim';advance(p,2,{jump:true});assert.ok(p.state.y<=-.15+.001);
});
test('camera final segment clips corners and thin walls',()=>{
  const clipped=clipCamera({x:0,y:2,z:0},{x:10,y:4,z:10},[{x:5,z:5,w:.2,d:10,bottom:0,top:10}]);assert.ok(clipped.x<4.7);assert.ok(clipped.x>0);
});

test('holding brake after landing stays put until released, then backward walking works',()=>{
  const roof={x:0,z:0,w:15,d:15,bottom:0,top:8.3};const collision=createCollisionWorld([roof],()=>false,116);
  const p=createPlayer(collision,()=>false,{x:0,y:10,z:0,yaw:0});p.state.mode='fly';
  advance(p,3,{z:1});const landed={...p.state};assert.equal(landed.mode,'ground');
  advance(p,3,{z:1});assert.ok(Math.hypot(p.state.x-landed.x,p.state.z-landed.z)<.01);
  advance(p,.1,{});advance(p,.5,{z:1});assert.ok(p.state.z<landed.z-1);
});

test('swimming camera keeps a useful boom beneath bridge decks',async()=>{
  const {swimmingBoom}=await import('../src/camera.js');
  const solids=[{x:0,z:0,w:28,d:6,bottom:1.2,top:1.8}];
  const p={x:0,y:-.27,z:0},look={x:0,y:.58,z:0};
  const low=swimmingBoom(p,{x:8,y:4,z:0},solids);assert.ok(low.y<.9);
  const clipped=clipCamera(look,low,solids);assert.ok(clipped.x>7.5);
});
