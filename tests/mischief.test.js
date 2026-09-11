import test from 'node:test';
import assert from 'node:assert/strict';
import {createMischiefState,sanitizeMischief,MARKET,PICNIC} from '../src/mischief-state.js';
import {freshSave,loadSave,writeSave} from '../src/save.js';

test('sandwich must be taken nearby and picnic requires a rooftop landing with lunch',()=>{
  const save=freshSave(),g=createMischiefState(save);
  assert.equal(g.interact({...MARKET,x:10,mode:'ground'}),null);
  assert.equal(g.interact({...MARKET,mode:'fly'}),null);
  assert.equal(g.interact({...PICNIC,mode:'ground'}),'hungry');
  assert.equal(g.interact({...MARKET,x:21.5,mode:'ground'}),'steal');
  assert.equal(g.state.carrying,true);
  assert.equal(g.interact({...PICNIC,y:0,mode:'ground'}),null);
  assert.equal(g.interact({...PICNIC,mode:'fly'}),null);
  assert.equal(g.interact({...PICNIC,mode:'ground'}),'share');
  assert.equal(g.state.carrying,false);assert.equal(g.state.picnic,true);
  assert.equal(g.interact({...PICNIC,mode:'ground'}),'picnic');
  assert.equal(g.interact({...MARKET,mode:'ground'}),null);
});
test('three distinct pondside pigeons earn the club badge only after sharing lunch',()=>{
  const g=createMischiefState(freshSave());
  assert.equal(g.splash([24,24,2,99]),1);assert.equal(g.splash([24]),0);
  g.splash([25,26]);assert.equal(g.complete,false);
  g.interact({...MARKET,mode:'ground'});g.interact({...PICNIC,mode:'ground'});
  assert.equal(g.complete,true);
});
test('old saves gain mischief defaults and carrying progress survives reload',()=>{
  let stored=JSON.stringify({version:2,rescued:[0],feathers:[2]});
  const storage={getItem:()=>stored,setItem:(k,v)=>stored=v};
  const save=loadSave(storage);assert.deepEqual(save.rescued,[0]);assert.equal(save.mischief.picnic,false);
  createMischiefState(save).interact({...MARKET,mode:'ground'});writeSave(save,storage);
  assert.equal(loadSave(storage).mischief.carrying,true);
  assert.deepEqual(sanitizeMischief({picnic:true,carrying:true,splashed:[24,24,'25',200]}),{picnic:true,stolen:true,carrying:false,splashed:[24]});
});
test('mischief guidance follows the unfinished activity',()=>{
  const g=createMischiefState(freshSave());assert.equal(g.objective().x,MARKET.x);
  g.interact({...MARKET,mode:'ground'});assert.equal(g.objective().y,PICNIC.y);
  g.interact({...PICNIC,mode:'ground'});assert.match(g.objective().name,/Splash/);
});

test('continuous market route works with real movement, swimming pigeons and rooftop collision',async()=>{
  const THREE=await import('three');
  const {createWorld}=await import('../src/world.js');
  const {createPlayer}=await import('../src/player.js');
  const {createCityLife}=await import('../src/life.js');
  const {createMischiefJourney}=await import('../src/playtest.js');
  const scene=new THREE.Scene(),world=createWorld(scene),player=createPlayer(world.collision,world.isInWater),save=freshSave();
  world.collision.solids.push({x:24,z:-12,w:2.4,d:1.4,bottom:0,top:1.1});
  const game=createMischiefState(save),life=createCityLife(scene);
  const mission={honk(p){game.interact(p);game.splash(life.splash(p));life.honk(p);}};
  const journey=createMischiefJourney(player,mission,game);let result;
  for(let i=0;i<60*180;i++){
    result=journey.update(1/60);if(result.done)break;
    player.update(1/60,result.input,-Math.PI/2);
    life.update(1/60,i/60,player.state,save);
    if(player.state.mode==='swim'&&player.state.speed>3)game.splash(life.splash(player.state));
  }
  assert.match(result.status,/MISCHIEF PASS/,JSON.stringify({result,p:player.state,s:game.state}));
  assert.equal(game.complete,true);assert.equal(player.state.mode,'ground');
});
