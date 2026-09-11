export const MARKET={x:24,y:0,z:-12};
export const PICNIC={x:40,y:28.3,z:3};
export const SPLASH_SPOT={x:15,y:-.27,z:5};
export function freshMischief(){return {stolen:false,carrying:false,picnic:false,splashed:[]};}
export function sanitizeMischief(data={}){
  const picnic=data?.picnic===true,stolen=picnic||data?.stolen===true;
  return {stolen,carrying:stolen&&!picnic&&data?.carrying===true,picnic,splashed:Array.isArray(data?.splashed)?[...new Set(data.splashed.filter(n=>Number.isInteger(n)&&n>=24&&n<30))]:[]};
}
export function createMischiefState(save){
  save.mischief=sanitizeMischief(save.mischief);
  const state=save.mischief;
  const near=(p,t,r)=>Math.hypot(p.x-t.x,p.z-t.z)<r&&Math.abs(p.y-t.y)<1.4;
  return {state,
    get complete(){return state.picnic&&state.splashed.length>=3;},
    action(p){
      if(near(p,MARKET,3.3)&&p.mode==='ground'&&!state.picnic&&!state.carrying)return 'steal';
      if(near(p,PICNIC,3)&&p.mode==='ground')return state.carrying?'share':state.picnic?'picnic':'hungry';
      return null;
    },
    interact(p){const action=this.action(p);
      if(action==='steal'){state.stolen=true;state.carrying=true;}
      if(action==='share'){state.carrying=false;state.picnic=true;}
      return action;
    },
    splash(ids){const before=state.splashed.length;state.splashed=[...new Set([...state.splashed,...ids.filter(id=>id>=24&&id<30)])];return state.splashed.length-before;},
    objective(){
      if(state.carrying)return {...PICNIC,kind:'mischief',name:'Secret rooftop picnic'};
      if(!state.picnic)return {...MARKET,kind:'mischief',name:'Willow & Rye sandwich cart'};
      if(state.splashed.length<3)return {...SPLASH_SPOT,kind:'mischief',name:'Splash the pondside pigeons'};
      return {...PICNIC,kind:'mischief',name:'Picnic Club'};
    },
  };
}
