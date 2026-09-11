import * as THREE from 'three';
import { createDuck } from './duck.js';
import { RESCUE_SPOTS } from './world.js';
import { FRIENDS, FEATHER_SPOTS, TRIALS, rescueRequirement, createTrialState, segmentDistance, objectiveFor } from './adventure.js';
import { writeSave } from './save.js';

export function createMission(scene, world, save, feedback) {
  const map = document.getElementById('minimap');
  const toast = document.getElementById('toast');
  const waypoint = document.getElementById('waypoint');
  const trialUI = document.getElementById('trial');
  const journal = document.getElementById('journal-list');
  let targetId = [0, 2, 1, 3, 4].find(id => !save.rescued.includes(id)) ?? -1;
  let toastTime = 0, mapTime = 0, homeTime = 0, nearHome = false;
  let before = null, selectedTrial = null;
  const guidance = new THREE.Vector3(), cameraDirection = new THREE.Vector3();
  let currentObjective = null;
  const trialState = createTrialState();
  function persist() { if (!(feedback.persist ? feedback.persist() : writeSave(save))) document.getElementById('save-note').textContent = 'Progress is temporary: browser storage unavailable.'; }
  function announce(message, duration = 4) { toast.textContent = message; toastTime = duration; toast.classList.add('visible'); }
  const friends = RESCUE_SPOTS.map((spot, id) => {
    const duck = createDuck({ scale: 0.82, colors: { head: ['#527849', '#b48855', '#34776a', '#c39861', '#365b47'][id] } });
    const home = new THREE.Vector3(22 + Math.cos(id / 5 * Math.PI * 2) * 1.5, 0, 7 + Math.sin(id / 5 * Math.PI * 2) * 1.5);
    const origin = new THREE.Vector3(spot.x, spot.y, spot.z);
    const found = save.rescued.includes(id);
    duck.setPosition(found ? home.x : spot.x, found ? home.z : spot.z); duck.setAltitude(found ? 0 : spot.y); scene.add(duck.root);
    const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), new THREE.MeshStandardMaterial({ color: '#ffcf67', emissive: '#b58429', emissiveIntensity: 0.25 }));
    marker.position.set(spot.x, spot.y + 2.6, spot.z); marker.visible = !found; scene.add(marker);
    return { ...spot, ...FRIENDS[id], duck, marker, home, origin, found, departure: found ? 1 : 0 };
  });
  const featherGeometry = new THREE.OctahedronGeometry(0.28);
  featherGeometry.scale(0.55, 1.8, 0.65);
  const featherMaterial = new THREE.MeshStandardMaterial({ color: '#fbd17c', metalness: 0.28, roughness: 0.32, emissive: '#a36714', emissiveIntensity: 0.18 });
  const feathers = FEATHER_SPOTS.map(([x, z], id) => {
    const y = world.collision.surface(x, z) + 1;
    const mesh = new THREE.Mesh(featherGeometry, featherMaterial); mesh.position.set(x, y, z); mesh.visible = !save.feathers.includes(id); scene.add(mesh);
    return { id, x, y, z, mesh };
  });
  const rings = TRIALS.map(trial => trial.points.map((p, index) => {
    const material = new THREE.MeshStandardMaterial({ color: trial.color, emissive: trial.color, emissiveIntensity: 0.2, transparent: true, opacity: index ? 0.2 : 0.85, roughness: 0.4 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(trial.kind === 'swim' ? 1.6 : 2.6, 0.09, 5, 36), material);
    ring.position.set(p[0], trial.kind === 'swim' ? 0.22 : p[1] + 0.6, p[2]);
    if (trial.kind === 'swim') ring.rotation.x = Math.PI / 2;
    else { const next = trial.points[Math.min(index + 1, trial.points.length - 1)]; ring.rotation.y = Math.atan2(next[0] - p[0], next[2] - p[2]); }
    scene.add(ring); return ring;
  }));
  const landingRing = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.32, 48), new THREE.MeshBasicMaterial({ color: '#f4d288', transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
  landingRing.rotation.x = -Math.PI / 2; scene.add(landingRing);
  function refresh() {
    const target = friends[targetId];
    document.getElementById('flock-count').textContent = `${save.rescued.length} / 5`;
    document.getElementById('feather-count').textContent = `${save.feathers.length} / 18`;
    document.getElementById('mission-fill').style.width = `${save.rescued.length * 20}%`;
    document.getElementById('mission-title').textContent = target ? target.title : save.homecoming ? 'A city to call your own' : 'One last flight home';
    document.getElementById('mission-description').textContent = target ? target.tip : save.homecoming ? 'Chase gold times, gather feathers, or just watch the water with your flock.' : 'Everyone is on their way. Return to the nest in Willow Park for the reunion.';
    journal.replaceChildren();
    for (const f of friends) {
      const button = document.createElement('button'); button.className = `journal-entry${f.id === targetId ? ' selected' : ''}`;
      button.innerHTML = `<span>${f.found ? '✓' : '◇'} ${f.name}</span><small>${f.place}</small>`;
      button.disabled = f.found;
      button.addEventListener('click', () => { targetId = f.id; selectedTrial = null; refresh(); document.getElementById('journal-dialog').close(); }); journal.append(button);
    }
    const times = document.getElementById('trial-records'); times.replaceChildren();
    for (const trial of TRIALS) {
      const row = document.createElement('button'); row.className = 'record';
      row.addEventListener('click', () => { selectedTrial = trial.id; refresh(); document.getElementById('journal-dialog').close(); announce(`Follow the marker to ${trial.name}.`); });
      const best = save.trials[trial.id]; row.textContent = `${best && best <= trial.gold ? '★' : '○'} ${trial.name} — ${best ? `${best.toFixed(1)}s` : 'Unexplored'} · gold ${trial.gold}s`;
      times.append(row);
    }
  }
  refresh();
  function honk(player) {
    feedback.honk(player);
    const nearest = friends.filter(f => !f.found).sort((a,b) => Math.hypot(a.x-player.x,a.z-player.z) - Math.hypot(b.x-player.x,b.z-player.z))[0];
    if (!nearest || Math.hypot(nearest.x - player.x, nearest.z - player.z) > 4.5) return;
    if (Math.abs(nearest.y - player.y) > 1.7) { announce(nearest.y > player.y ? `${nearest.name} is above you. Look for the rooftop landing circle.` : `${nearest.name} is below you. Brake and descend to their level.`); return; }
    const requirement = rescueRequirement(nearest.id, player, save);
    if (requirement) { announce(requirement, 5); return; }
    nearest.found = true; nearest.marker.visible = false; nearest.duck.triggerHonk();
    save.rescued.push(nearest.id); persist(); feedback.cue('rescue'); feedback.burst(nearest.origin, '#f6ce83', 28);
    announce(`${nearest.name}: ${nearest.reply}`, 6);
    targetId = [0, 2, 1, 3, 4].find(id => !save.rescued.includes(id)) ?? -1; refresh();
  }
  function drawMap(player, yaw) {
    const ctx = map.getContext('2d'), scale = 0.89, origin = 120;
    ctx.fillStyle = '#e7e1cb'; ctx.fillRect(0,0,240,240);
    ctx.fillStyle = '#80b6b1'; ctx.fillRect(111,0,18,240); ctx.fillStyle = '#b5c59a'; ctx.fillRect(95,98,50,44);
    ctx.fillStyle = '#80b6b1'; ctx.beginPath(); ctx.ellipse(origin,origin,15,11,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#b6b19e';
    for (const b of world.collision.solids) if (b.top > 6 && b.w > 6) ctx.fillRect(origin+(b.x-b.w/2)*scale,origin+(b.z-b.d/2)*scale,b.w*scale,b.d*scale);
    for (const trial of TRIALS) {
      ctx.strokeStyle = '#4b9794'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(origin+trial.points[0][0]*scale,origin+trial.points[0][2]*scale,3,0,Math.PI*2); ctx.stroke();
    }
    if (currentObjective?.trial) {
      const trail = TRIALS.find(t => t.id === currentObjective.trial);
      ctx.strokeStyle = '#297d80'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath();
      trail.points.forEach((p, i) => { const x = origin + p[0] * scale, z = origin + p[2] * scale; if (i) ctx.lineTo(x,z); else ctx.moveTo(x,z); });
      ctx.stroke(); ctx.setLineDash([]);
    }
    if (currentObjective) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(origin + currentObjective.x * scale, origin + currentObjective.z * scale, 7, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#3e705a'; ctx.beginPath(); ctx.arc(origin+22*scale,origin+7*scale,3,0,Math.PI*2); ctx.fill();
    for (const f of friends) if (!f.found) {
      ctx.fillStyle = f.id === targetId ? '#dc9940' : '#f4d596'; ctx.strokeStyle = '#836532'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(origin+f.x*scale,origin+f.z*scale,f.id===targetId?5:3,0,Math.PI*2); ctx.fill();ctx.stroke();
    }
    ctx.save();ctx.translate(origin+player.x*scale,origin+player.z*scale);ctx.rotate(-yaw);
    ctx.fillStyle='#fffdf0';ctx.strokeStyle='#294e49';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(0,7);ctx.lineTo(-5,-5);ctx.lineTo(0,-2);ctx.lineTo(5,-5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    ctx.fillStyle='#50675d';ctx.font='600 11px sans-serif';ctx.fillText('N',116,15);
  }
  return {
    honk, announce, refresh, trialState,
    get objective() { return currentObjective; },
    cycleTarget() { const ids = friends.filter(f=>!f.found).map(f=>f.id); if (ids.length) { targetId = ids[(ids.indexOf(targetId)+1)%ids.length];selectedTrial = null;refresh(); } },
    resetPosition() { before = null; trialState.reset(); },
    update(dt, time, player, camera) {
      if (!before) before = {...player};
      for (const f of friends) {
        if (f.found && f.departure < 1) {
          f.departure = Math.min(1, f.departure + dt / 8);
          const t = f.departure;
          const clearingBridge = f.id === 2 && t < .18;
          let p;
          if (clearingBridge) {
            p = new THREE.Vector3(f.x, f.y, f.z - 8 * t / .18);
          } else {
            const origin = f.id === 2 ? new THREE.Vector3(f.x, f.y, f.z-8) : f.origin;
            const progress = f.id === 2 ? (t-.18)/.82 : t;
            p = new THREE.Vector3().lerpVectors(origin, f.home, progress);
            p.y += Math.sin(Math.PI * progress) * 52;
          }
          f.duck.setPosition(p.x,p.z);f.duck.setAltitude(p.y);
          f.duck.setFacing(clearingBridge ? Math.PI : Math.atan2(f.home.x-p.x,f.home.z-p.z));
          f.duck.state.swimming=clearingBridge;
          f.duck.update(dt,true,!clearingBridge,.6,false,0,t>.5,-1);
        } else {
          f.duck.state.swimming = !f.found && f.y < 0;
          f.duck.setFacing(f.found ? Math.sin(time*.3+f.id)*.5+f.id : Math.atan2(player.x-f.x,player.z-f.z));
          f.duck.update(dt,false);
        }
        f.marker.position.y=f.y+2.6+Math.sin(time*2+f.id)*.18;f.marker.rotation.y=time*.8;
      }
      for (const f of feathers) if (f.mesh.visible) {
        f.mesh.position.y=f.y+Math.sin(time*2+f.id)*.12;f.mesh.rotation.y=time;
        if (segmentDistance([f.x,f.y-.5,f.z],before,player)<1.15) {
          f.mesh.visible=false;save.feathers.push(f.id);persist();refresh();feedback.cue('pickup');feedback.burst(f.mesh.position,'#f7d680',12);
          if ([1,3,9,18].includes(save.feathers.length)) announce(save.feathers.length===18 ? 'Every golden feather. A little piece of the whole city.' : `Golden feathers · ${save.feathers.length} / 18${save.feathers.length===3?' — enough for Peaches’s nest!':''}`);
        }
      }
      const event=trialState.update(dt,before,player);
      if (event) {
        if (event.type==='start') {announce(`${event.trial.name} · follow the glowing rings`,3);feedback.cue('start');}
        if (event.type==='checkpoint') {feedback.cue('checkpoint');feedback.burst(new THREE.Vector3(player.x,player.y+.5,player.z),event.trial.color,10);}
        if (event.type==='timeout') announce('Take your time. Return to the first ring to try again.');
        if (event.type==='finish') {
          selectedTrial = null;
          const old=save.trials[event.trial.id];save.trials[event.trial.id]=Math.min(old??Infinity,event.elapsed);persist();refresh();feedback.cue('finish');
          announce(`${event.gold?'★ Gold!':'Trail complete!'} ${event.trial.name} · ${event.elapsed.toFixed(1)}s${!old||event.elapsed<old?' · personal best':''}`,6);
        }
      }
      const active=trialState.active;
      trialUI.classList.toggle('visible',!!active);trialUI.setAttribute('aria-hidden',String(!active));
      if(active) {const t=TRIALS.find(t=>t.id===active.id);trialUI.textContent=`${t.name}  ${active.index} / ${t.points.length-1}  ·  ${active.elapsed.toFixed(1)}s`;}
      TRIALS.forEach((trial,ti)=>rings[ti].forEach((ring,i)=>{
        const current=active?.id===trial.id?active.index===i:i===0;
        ring.material.opacity=current?.9:active?.id===trial.id&&i<active.index?.06:.15;
        ring.scale.setScalar(current?1+Math.sin(time*3)*.04:1);
      }));
      const friend = friends[targetId];
      const target = objectiveFor(friend, save, player, feathers, active, selectedTrial);
      currentObjective = target;
      const distance=Math.hypot(target.x-player.x,target.z-player.z);
      const height=target.y-player.y;
      const close=distance<4.5&&Math.abs(height)<1.7;
      const prompt=document.getElementById('interaction');
      prompt.classList.toggle('visible',close&&target.kind==='friend');
      prompt.textContent=close&&target.kind==='friend' ? `H / HONK · ${target.name}` : '';
      document.getElementById('next-friend').textContent=`${target.name} · ${Math.round(distance)}m${height>3?' · ↑ '+Math.round(height)+'m above':height< -3?' · ↓ '+Math.round(-height)+'m below':''}`;
      landingRing.visible=target.kind==='friend'&&target.y>2;
      landingRing.position.set(target.x,target.y+.04,target.z);
      // Edge compass remains readable when the next objective is behind the camera.
      guidance.set(target.x, target.y + (target.kind === 'ring' ? .6 : 2), target.z);
      camera.getWorldDirection(cameraDirection);
      const behind = cameraDirection.dot(guidance.clone().sub(camera.position)) < 0;
      const projected = guidance.project(camera);
      let sx = projected.x, sy = projected.y;
      if (behind) { sx = -sx; sy = -sy; if (Math.abs(sx) < .1) sx = .1; }
      const edge = behind || Math.abs(sx) > .82 || Math.abs(sy) > .68;
      const divisor = Math.max(Math.abs(sx) / .82, Math.abs(sy) / .68, 1);
      sx /= divisor; sy /= divisor;
      if (behind) { const factor = Math.max(Math.abs(sx) / .82, Math.abs(sy) / .68, .01); sx /= factor; sy /= factor; }
      waypoint.classList.toggle('visible', distance > 4 || Math.abs(height) > 2);
      waypoint.classList.toggle('edge', edge);
      waypoint.style.left = `${(sx * .5 + .5) * 100}%`;
      waypoint.style.top = `${(-sy * .5 + .5) * 100}%`;
      waypoint.textContent = `${edge ? '➤' : target.kind === 'ring' ? '◎' : '◇'} ${target.name} · ${Math.round(distance)}m`;
      nearHome=save.rescued.length===5&&Math.hypot(player.x-22,player.z-7)<4&&player.mode==='ground';
      if(nearHome&&!save.homecoming&&friends.every(f=>f.departure>=1)) {
        homeTime+=dt;
        if(homeTime>1) {save.homecoming=true;persist();refresh();feedback.cue('finish');feedback.burst(new THREE.Vector3(22,2,7),'#f5cf7c',60);document.getElementById('ending').showModal();}
      } else homeTime=0;
      toastTime-=dt;if(toastTime<=0)toast.classList.remove('visible');
      mapTime+=dt;if(mapTime>.1){drawMap(player,player.yaw);mapTime=0;}
      before={...player};
    },
  };
}
