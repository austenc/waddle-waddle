import { createJourney, createMischiefJourney } from './playtest.js';
// Development-only fixtures exercise the real input/simulation/render/mission loop.
// This module is tree-shaken out of production; QA uses an isolated in-memory save.
export function createQA({player,mission,start,save,setCamera,resume,feedback,mischief}) {
  const panel=document.createElement('aside');panel.id='qa-panel';
  panel.style.cssText='position:fixed;right:8px;bottom:8px;z-index:100;background:#172c29ed;color:white;padding:10px;font:10px monospace;width:265px;border-radius:6px;pointer-events:auto';
  panel.innerHTML='<b>DEV PLAYTEST · isolated save</b><div id="qa-buttons"></div><pre id="qa-status" style="white-space:pre-wrap"></pre>';
  document.body.append(panel);
  const api={input:null,update};let timer=0,run=null,output='Ready',samples=[],journey=null;
  const neutral=()=>({x:0,z:0,jump:false,jumpPressed:false,boost:false,dive:false,roll:0});
  function fixture(p,mode='ground'){start();resume();player.reset(p);player.state.mode=mode;mission.resetPosition();setCamera(-Math.PI/2);api.input=neutral();timer=0;run=null;}
  function button(label,action){const b=document.createElement('button');b.textContent=label;b.style.cssText='font:10px monospace;margin:4px 3px 0 0;padding:5px;border-radius:3px';b.onclick=action;if(label==='Collapse QA'){b.onclick=()=>{panel.classList.toggle('collapsed');b.textContent=panel.classList.contains('collapsed')?'Expand QA':'Collapse QA';};panel.prepend(b);}else panel.querySelector('#qa-buttons').append(b);}
  button('Collapse QA',()=>{panel.classList.toggle('collapsed');});
  button('Full journey',()=>{fixture({x:20,y:0,z:7,yaw:-Math.PI/2});journey=createJourney(player,mission,save);run='journey';output='Full journey with real movement and pickups';});
  button('Market mischief',()=>{fixture({x:20,y:0,z:7,yaw:-Math.PI/2});journey=createMischiefJourney(player,mission,mischief.game);run='journey';output='Real-input market mischief playthrough';});
  button('Sandwich cart',()=>{fixture({x:23,y:0,z:-9.5,yaw:2.7});setCamera(3.4);output='Cart interaction · honk to borrow lunch';});
  button('Mallard portrait',()=>{fixture({x:20,y:0,z:7,yaw:.35});setCamera(-1.1);output='Mallard silhouette · idle and honk';});
  button('Launch + glide',()=>{fixture({x:20,y:0,z:7,yaw:-Math.PI/2});api.input={...neutral(),z:-1,jump:true};run='launch';output='Launching via held input…';});
  button('Rooftop landing',()=>{fixture({x:-40,y:16,z:-29,yaw:Math.PI},'fly');player.state.speed=3;api.input={...neutral(),z:1};run='roof';output='Braking toward market roof…';});
  button('Pip rescue',()=>{fixture({x:-4,y:-.27,z:6,yaw:-Math.PI/2},'swim');api.input={...neutral(),z:-1};run='pip';output='Swimming to Pip…';});
  button('Canal trail',()=>{fixture({x:0,y:-.27,z:-31,yaw:Math.PI},'swim');run='canal';output='Swimming full canal course…';});
  button('Peaches + feathers',()=>{fixture({x:40,y:16.3,z:36,yaw:0});if(save.feathers.length<3)save.feathers=[0,1,2];mission.honk(player.state);output='Peaches rescue fixture';});
  button('Captain + reunion',()=>{fixture({x:-40,y:28.3,z:-84,yaw:0});if(save.rescued.length===4)mission.honk(player.state);run='home';output='Captain → homecoming';});
  button('Honk',()=>{mission.honk(player.state);});
  button('Free play',()=>{api.input=null;run=null;resume();output='Manual controls active';});
  button('Overlook',()=>{fixture({x:20,y:38,z:48,yaw:Math.PI},'fly');api.input=neutral();player.state.vy=0;run='view';output='City overlook';});
  function update(dt,status){
    samples.push(dt);if(samples.length>120)samples.shift();
    if(!status.paused){
      timer+=dt;
      if(run==='journey'){setCamera(-Math.PI/2);const result=journey.update(dt);api.input=result.input;output=result.status;if(result.done)run=null;}
      if(run==='launch'&&timer>3){api.input=neutral();if(timer>5){output=`Launch/glide: ${player.state.mode}, altitude ${player.state.y.toFixed(1)}`;run=null;}}
      if(run==='roof'&&player.state.mode==='ground'){api.input=neutral();mission.honk(player.state);output=`Landed at ${player.state.y.toFixed(2)}m · Clover ${save.rescued.includes(1)?'rescued':'pending'}`;run=null;}
      if(run==='pip'&&timer>.6){api.input=neutral();if(timer>1){mission.honk(player.state);output=`Swim/honk: Pip ${save.rescued.includes(0)?'rescued':'pending'}`;run=null;}}
      if(run==='canal'){
        const course=[[0,-34],[-5,-43],[4,-51],[0,-61],[-4,-73]];
        const active=mission.trialState.active;
        if(save.trials.canal){api.input=neutral();output=`Canal complete ${save.trials.canal.toFixed(1)}s`;run='miso';timer=0;}
        else {const target=course[active?.index??0];steer(target);}
      }
      if(run==='miso'){
        steer([6,-61]);if(Math.hypot(player.state.x-6,player.state.z+61)<2){api.input=neutral();mission.honk(player.state);output=`Canal & Miso ${save.rescued.includes(2)?'rescued':'pending'}`;run=null;}
      }
      if(run==='home'&&timer>1){fixture({x:22,y:0,z:7,yaw:0});output='Waiting at the nest for everybody to return.';}
      if(run==='view'){player.state.x=20;player.state.y=38;player.state.z=48;player.state.vy=0;setCamera(Math.PI+.3);}
    }
    panel.querySelector('#qa-status').textContent=`${output}\n${status.mode} (${status.x.toFixed(1)}, ${status.y.toFixed(1)}, ${status.z.toFixed(1)})\n${Math.round(samples.length/samples.reduce((a,b)=>a+b,0))} fps · ${status.drawCalls} calls\nFlock ${save.rescued.length}/5 · feathers ${save.feathers.length}/18\n${save.homecoming?'HOMECOMING COMPLETE':''}`;
  }
  function steer([x,z]){const dx=x-player.state.x,dz=z-player.state.z,len=Math.max(.5,Math.hypot(dx,dz));setCamera(-Math.PI/2);api.input={...neutral(),x:-dz/len,z:dx/len};}
  return api;
}
