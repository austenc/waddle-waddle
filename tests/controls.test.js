import test from 'node:test';
import assert from 'node:assert/strict';
import {createControls} from '../src/controls.js';
const listeners=new Map();
globalThis.window={addEventListener(name,fn){listeners.set(name,fn);},removeEventListener(name){listeners.delete(name);}};
globalThis.HTMLElement=class{matches(){return false;}closest(){return null;}};
function event(code,extra={}){return {code,repeat:false,target:new HTMLElement(),preventDefault(){this.prevented=true;},...extra};}

test('held movement is normalized and blur releases all keyboard and touch inputs',()=>{
  const c=createControls();listeners.get('keydown')(event('KeyW'));listeners.get('keydown')(event('KeyD'));
  const moving=c.read();assert.ok(Math.abs(Math.hypot(moving.x,moving.z)-1)<.001);
  c.setTouchGlide(true);c.setTouchDive(true);c.setTouchBoost(true);listeners.get('blur')();
  const stopped=c.read();assert.equal(stopped.x,0);assert.equal(stopped.z,0);assert.equal(stopped.jump,false);assert.equal(stopped.dive,false);assert.equal(stopped.boost,false);c.dispose();
});
test('jump presses are consumed once while the held signal persists',()=>{
  const c=createControls();listeners.get('keydown')(event('Space'));
  assert.equal(c.read().jumpPressed,true);const next=c.read();assert.equal(next.jumpPressed,false);assert.equal(next.jump,true);
  listeners.get('keyup')(event('Space'));assert.equal(c.read().jump,false);c.dispose();
});
test('Space remains a normal activation key for buttons in dialogs',()=>{
  const c=createControls(),target=new HTMLElement();target.closest=()=>({});const e=event('Space',{target});
  listeners.get('keydown')(e);assert.equal(e.prevented,undefined);assert.equal(c.read().jump,false);c.dispose();
});
test('touch honk is edge-triggered and shift is reserved for boost',()=>{
  const c=createControls();c.setTouchHonk(true);assert.equal(c.consumeHonk(),true);assert.equal(c.consumeHonk(),false);
  c.setTouchHonk(true);assert.equal(c.consumeHonk(),false);c.setTouchHonk(false);c.setTouchHonk(true);assert.equal(c.consumeHonk(),true);
  listeners.get('keydown')(event('ShiftLeft'));assert.equal(c.read().boost,true);assert.equal(c.consumeHonk(),false);c.dispose();
});
