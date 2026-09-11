// Imported only by the development QA panel. It drives the same normalized input
// as keyboard/touch; the journey never changes position or mission prerequisites.
export function createTravelPilot(target, flight = false) {
  let phase = flight ? 'climb' : 'walk';
  const neutral = { x: 0, z: 0, jump: false, jumpPressed: false, boost: false, dive: false, roll: 0 };
  return player => {
    const dx = target.x - player.x, dz = target.z - player.z, distance = Math.hypot(dx, dz);
    const settled = ['ground', 'swim'].includes(player.mode);
    if (distance < (flight ? 2 : .65) && Math.abs(target.y-player.y) < .15 && settled) return { input: {...neutral}, arrived: true };
    if (!flight || phase === 'walk') {
      const len = Math.max(1, distance);
      return { input: { ...neutral, x: -dz / len, z: dx / len }, arrived: false };
    }
    const delta = Math.atan2(Math.sin(Math.atan2(dx,dz)-player.yaw),Math.cos(Math.atan2(dx,dz)-player.yaw));
    const input = { ...neutral, x: Math.max(-1,Math.min(1,-delta*1.5)) };
    if (phase === 'climb') {
      input.jump = true;input.z = 1;
      if(player.y > 45)phase='cross';
    } else if (phase === 'cross') {
      input.jump=player.y<45;input.z=distance>12?-1:1;
      input.boost=distance>30&&Math.abs(delta)<.3;
      if(distance<3.2)phase='land';
    } else {
      input.z=1;
      if (settled) phase='walk';
    }
    return {input,arrived:false};
  };
}

export function createJourney(player, mission, save) {
  const steps = [
    {name:'Swim to Pip',p:{x:-8,y:-.27,z:6},honk:true},
    {name:'Pond feather one',p:{x:3,y:-.27,z:7}},
    {name:'Pond feather two',p:{x:-12,y:-.27,z:-6}},
    {name:'Park feather',p:{x:18,y:0,z:16},flight:true},
    {name:'Fly to canal',p:{x:0,y:-.27,z:-31},flight:true},
    {name:'Canal start',p:{x:0,y:-.27,z:-34}},
    {name:'Canal ring 2',p:{x:-5,y:-.27,z:-43}},
    {name:'Canal ring 3',p:{x:4,y:-.27,z:-51}},
    {name:'Canal ring 4',p:{x:0,y:-.27,z:-61}},
    {name:'Canal finish',p:{x:-4,y:-.27,z:-73}},
    {name:'Call Miso',p:{x:6,y:-.27,z:-61},honk:true},
    {name:'Swim clear of the bridge',p:{x:6,y:-.27,z:-68}},
    {name:'Land at Clover',p:{x:-40,y:8.3,z:-36},flight:true,honk:true},
    {name:'Land at Peaches',p:{x:40,y:16.3,z:36},flight:true,honk:true},
    {name:'Land at Captain',p:{x:-40,y:28.3,z:-84},flight:true,honk:true},
    {name:'Bring everyone home',p:{x:22,y:0,z:7},flight:true},
  ];
  let index=0,pilot=createTravelPilot(steps[0].p),elapsed=0,total=0,failed=false;
  return {
    update(dt) {
      total+=dt;elapsed+=dt;
      if (failed) return {input:{x:0,z:0},status:`FAILED: ${steps[index].name} after ${elapsed.toFixed(1)}s`,done:true};
      if(index===steps.length)return {input:{x:0,z:0},status:`Journey ${save.rescued.length===5?'PASS':'FAIL'} · ${total.toFixed(1)}s · flock ${save.rescued.length}/5`,done:true};
      if(elapsed>65){failed=true;return this.update(0);}
      const result=pilot(player.state),step=steps[index];
      if(result.arrived){
        if(step.honk)mission.honk(player.state);
        index++;elapsed=0;
        if(index<steps.length)pilot=createTravelPilot(steps[index].p,steps[index].flight);
      }
      return {input:result.input,status:`JOURNEY ${index+1}/${steps.length} · ${steps[index]?.name??'home'} · ${total.toFixed(1)}s`,done:false};
    },
  };
}
