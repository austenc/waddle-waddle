import * as THREE from 'three';
import { createWorld } from './world.js';
import { createDuck } from './duck.js';
import { createControls } from './controls.js';
import { createHonk } from './honk.js';
import { createTouchControls } from './touch.js';
import { createMission } from './mission.js';
import { createPlayer } from './player.js';
import { createAudio } from './audio.js';
import { createCityLife } from './life.js';
import { createEffects } from './effects.js';
import { clipCamera, swimmingBoom, interpolatePose } from './camera.js';
import { loadSave, writeSave, freshSave } from './save.js';

const qaMode = import.meta.env.DEV && new URLSearchParams(location.search).has('qa');
const save = qaMode ? freshSave() : loadSave();
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled = true;renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;renderer.toneMappingExposure = 0.98;
renderer.domElement.setAttribute('aria-label','Mallard City game view. Drag to look around.');
renderer.domElement.tabIndex = 0;
document.getElementById('app').append(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(54,innerWidth/innerHeight,.08,380);
const world = createWorld(scene);
const player = createPlayer(world.collision,world.isInWater);
const previousPose={...player.state};
const duck = createDuck();scene.add(duck.root);
const controls = createControls();const touch = createTouchControls(controls);const honk = createHonk();
const audio = createAudio();const effects = createEffects(scene);const life = createCityLife(scene);
const feedback = {
  persist(){return qaMode?true:writeSave(save);},
  cue(name){audio.cue(({checkpoint:'pickup',start:'flap',splash:'landing',land:'landing',takeoff:'flap'})[name]??name);},
  burst(position,color,count){if(!save.reducedMotion)effects.burst(position,color,count);},
  honk(position){life.honk(position);if(!save.muted)honk.play();duck.triggerHonk();if(!save.reducedMotion)effects.honk(position);},
};
const mission = createMission(scene,world,save,feedback);
let playing = false, paused = false, accumulator = 0, gameTime = 0;
let lastInput = {jump:false};
let followDistance=10.5;
let camYaw = player.state.yaw, pitch = .32, lastOrbit = -10, pointer = null;
let qa = null;
const cameraPosition = new THREE.Vector3(30,5,9), desired = new THREE.Vector3(), look = new THREE.Vector3();
const clock = new THREE.Clock();
const angle = (a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
const pauseDialog = document.getElementById('pause-dialog'), journalDialog = document.getElementById('journal-dialog'), ending = document.getElementById('ending');
const dialogs = [pauseDialog,journalDialog,ending];
function persist(){if(!qaMode)writeSave(save);}
const flightGuide=document.getElementById('flight-guide'), keyboardGuide=flightGuide.textContent;
function updateControlGuide(){flightGuide.textContent=touch.isTouchDevice()?'Use the stick to waddle and paddle. Hold FLY to take off; hold CLIMB to gain height, and release to glide. Push left or right to turn. Pull the stick back to brake and land. DOWN dives, BOOST gives a burst of speed, and the arrow buttons roll. Drag the view to look around. HONK calls a friend. Tap the pause button to take a break.':keyboardGuide;}
function applySettings(){touch.setForced(save.touchControls);updateControlGuide();document.getElementById('touch-setting').checked=save.touchControls;audio.setMuted(save.muted);audio.setMusic(save.music);document.getElementById('music-setting').checked=save.music;document.body.classList.toggle('reduced-motion',save.reducedMotion);document.getElementById('sound-setting').checked=!save.muted;document.getElementById('motion-setting').checked=save.reducedMotion;}
applySettings();
if(save.rescued.length||save.feathers.length)document.getElementById('start-btn').innerHTML='Continue your adventure <span>↗</span>';
document.getElementById('build-version').textContent=`MALLARD CITY · v${__APP_VERSION__}`;
function unlock(){audio.unlock();if(!save.muted)honk.unlock();}
controls.onHonkGesture=unlock;
function start(){if(playing)return;playing=true;camYaw=player.state.yaw;document.getElementById('splash').classList.add('is-gone');document.getElementById('hud').classList.remove('hud-hidden');document.getElementById('hud').setAttribute('aria-hidden','false');touch.setActive(true);controls.clear();unlock();renderer.domElement.focus();}
function syncPaused(){Object.assign(previousPose,player.state);paused=dialogs.some(d=>d.open)||document.hidden;controls.clear();touch.setActive(playing&&!paused);audio.setPaused(document.hidden || (paused && !ending.open));accumulator=0;}
function openDialog(dialog){if(!playing)return;if(!dialog.open)dialog.showModal();syncPaused();}
for(const dialog of dialogs){dialog.addEventListener('close',()=>{syncPaused();if(!paused)renderer.domElement.focus();});}
const observer=new MutationObserver(()=>{if(playing)syncPaused();});dialogs.forEach(d=>observer.observe(d,{attributes:true,attributeFilter:['open']}));
document.getElementById('start-btn').addEventListener('click',start);
document.getElementById('pause-btn').addEventListener('click',()=>openDialog(pauseDialog));
document.getElementById('resume-btn').addEventListener('click',()=>pauseDialog.close());
document.getElementById('journal-btn').addEventListener('click',()=>openDialog(journalDialog));
document.getElementById('journal-close').addEventListener('click',()=>journalDialog.close());
document.getElementById('ending-close').addEventListener('click',()=>ending.close());
document.getElementById('home-btn').addEventListener('click',()=>{player.reset();mission.resetPosition();camYaw=player.state.yaw;pauseDialog.close();mission.announce('Back where the adventure began.');});
document.getElementById('sound-setting').addEventListener('change',e=>{save.muted=!e.target.checked;applySettings();persist();if(!save.muted)unlock();});
document.getElementById('music-setting').addEventListener('change',e=>{save.music=e.target.checked;audio.setMusic(save.music);persist();});
document.getElementById('touch-setting').addEventListener('change',e=>{save.touchControls=e.target.checked;touch.setForced(save.touchControls);updateControlGuide();persist();});
document.getElementById('motion-setting').addEventListener('change',e=>{save.reducedMotion=e.target.checked;applySettings();persist();});
document.getElementById('reset-btn').addEventListener('click',()=>{Object.assign(save,freshSave());persist();location.reload();});
window.addEventListener('keydown',e=>{
  if(!playing&&(e.code==='Enter'||e.code==='Space')){e.preventDefault();start();return;}
  if(!playing)return;
  if(e.code==='Escape'&&!dialogs.some(d=>d.open)){e.preventDefault();openDialog(pauseDialog);}
  if(e.code==='KeyJ'&&!e.repeat){if(journalDialog.open)journalDialog.close();else if(!paused)openDialog(journalDialog);}
  if(e.code==='Tab'&&!paused){e.preventDefault();mission.cycleTarget();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing&&!dialogs.some(d=>d.open))openDialog(pauseDialog);syncPaused();});
window.addEventListener('blur',()=>{if(playing&&!dialogs.some(d=>d.open))openDialog(pauseDialog);});
renderer.domElement.addEventListener('pointerdown',e=>{if(!playing||paused)return;pointer={id:e.pointerId,x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!pointer||pointer.id!==e.pointerId)return;camYaw-=(e.clientX-pointer.x)*.005;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-pointer.y)*.003,.08,.8);lastOrbit=gameTime;pointer.x=e.clientX;pointer.y=e.clientY;});
const stopOrbit=()=>{pointer=null;};renderer.domElement.addEventListener('pointerup',stopOrbit);renderer.domElement.addEventListener('pointercancel',stopOrbit);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function updateHint(p){
  const el=document.getElementById('context-hint');
  let text='';
  if(save.tutorial===0){text='Try the water. Hold W to waddle toward the pond.';if(p.mode==='swim'){save.tutorial=1;persist();}}
  else if(save.tutorial===1){text='Hold Space. Little wings can take you a long way.';if(p.mode==='fly'&&p.y>5){save.tutorial=2;persist();}}
  else if(save.tutorial===2){text='Release Space to glide. S slows you down for a gentle landing.';if(p.mode==='ground'&&p.y>3){save.tutorial=3;persist();}}
  else if(p.mode==='fly')text='Space climb · S brake & land · C dive · Shift boost';
  else if(p.mode==='swim')text='Follow blue rings to discover a swimming trail.';
  else text='H honk · Hold Space to fly · J field notes';
  if(p.mode==='swim' && swimmingBoom(p,{x:p.x,y:p.y+6,z:p.z},world.collision.solids).y<p.y+5) text='A low bridge. Paddle into open water before taking flight.';
  if(touch.isTouchDevice()){text=text.replace('Hold W to waddle', 'Push the stick forward to waddle').replaceAll('Hold Space', 'Hold FLY').replaceAll('Release Space', 'Release FLY').replace('S slows you down', 'Pull the stick back to slow down').replace('Space climb · S brake & land · C dive · Shift boost', 'FLY climb · Stick back to land · DOWN dive · BOOST').replace('H honk · Hold FLY to fly · J field notes', 'HONK calls friends · Hold FLY to fly · Tap Field notes');}
  el.textContent=text;
}
function tick(){
  const frameDt=Math.min(clock.getDelta(),.1);
  let dt=playing&&!paused?frameDt:0;
  if(dt){
    accumulator+=dt;
    while(accumulator>=1/60){
      const input=qa?.input??controls.read();
      lastInput=input;
      Object.assign(previousPose,player.state);
      const events=player.update(1/60,input,camYaw);
      if(qa?.input)qa.input.jumpPressed=false;
      gameTime+=1/60;accumulator-=1/60;
      for(const event of events){
        feedback.cue(event);
        if(event==='land'||event==='splash')feedback.burst(new THREE.Vector3(player.state.x,player.state.y+.1,player.state.z),event==='splash'?'#d8f0dc':'#dbc69c',event==='splash'?20:10);
        if(event==='roll')duck.triggerBarrelRoll(player.state.roll);
      }
    }
    if(controls.consumeHonk())mission.honk(player.state);
    if(controls.isDown('KeyQ')||controls.isDown('KeyE')){camYaw+=((controls.isDown('KeyQ')?1:0)-(controls.isDown('KeyE')?1:0))*dt*1.5;lastOrbit=gameTime;}
  }
  const p=player.state,flying=p.mode==='fly',swimming=p.mode==='swim';
  const visual=interpolatePose(previousPose,p,dt?accumulator/(1/60):1);
  duck.setFlying(flying);duck.setAltitude(visual.y);duck.root.position.x=visual.x;duck.root.position.z=visual.z;duck.setFacing(visual.yaw);duck.state.swimming=swimming;
  duck.update(dt||(!playing?frameDt:0),p.speed>.2,flying,flying&&lastInput.jump?.8:0,p.mode==='hop',p.bank,flying&&p.vy<1,p.climb);
  touch.setFlying(flying);document.body.classList.toggle('is-flying',flying);
  if(!playing){gameTime+=frameDt*.2;camYaw=-1.15;pitch=.27;}
  else if(flying&&gameTime-lastOrbit>2.5&&!pointer)camYaw=angle(camYaw,p.yaw,1-Math.exp(-(save.reducedMotion?1.2:2)*dt));
  followDistance=THREE.MathUtils.lerp(followDistance,!playing?10.5:flying?10:8.5,1-Math.exp(-3*frameDt));
  const dist=followDistance;
  look.set(visual.x,visual.y+.85,visual.z);
  desired.set(visual.x-Math.sin(camYaw)*dist,visual.y+1.2+Math.tan(pitch)*dist,visual.z-Math.cos(camYaw)*dist);
  // Keep a useful low boom beneath bridges instead of pushing inside the duck.
  if (swimming) desired.copy(swimmingBoom(p, desired, world.collision.solids));
  const clipped=clipCamera(look,desired,world.collision.solids);desired.set(clipped.x,clipped.y,clipped.z);
  cameraPosition.lerp(desired,1-Math.exp(-8*frameDt));
  const safe=clipCamera(look,cameraPosition,world.collision.solids);cameraPosition.set(safe.x,safe.y,safe.z);
  camera.position.copy(cameraPosition);camera.lookAt(look);
  const targetFov=54;
  camera.fov=THREE.MathUtils.lerp(camera.fov,targetFov,1-Math.exp(-3*frameDt));camera.updateProjectionMatrix();
  if(dt){
    mission.update(dt,gameTime,p,camera);effects.update(dt);audio.update(dt,{flying,swimming,speed:p.speed});
    document.getElementById('location').textContent=`${world.district(p.x,p.z)} / ${flying?'in the clouds':swimming?'on the water':p.y>3?'above it all':'a little wandering'}`;
    document.getElementById('stamina-fill').style.width=`${p.stamina*100}%`;updateHint(p);
  }
  world.update(gameTime+accumulator,dt,visual,swimming,p.speed>.1);
  life.update(playing?dt:frameDt,gameTime,p,save);
  renderer.render(scene,camera);
  qa?.update(frameDt,{...p,paused,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
  requestAnimationFrame(tick);
}
if(qaMode){const {createQA}=await import('./qa.js');qa=createQA({player,mission,start,save,setCamera:y=>{camYaw=y;},resume:()=>dialogs.forEach(d=>d.close()),feedback});}
tick();
