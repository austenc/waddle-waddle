import * as THREE from 'three';
import {createDuck} from './duck.js';
import {createMischiefState,MARKET,PICNIC} from './mischief-state.js';

export function createMischief(scene,world,duck,save,feedback,announce){
  const game=createMischiefState(save),s=game.state;
  let tracking=s.carrying, vendorTimer=0, callCooldown=0, celebrated=game.complete, welcomeTime=s.picnic?3:0;
  const root=new THREE.Group();scene.add(root);
  const geometry=new THREE.BoxGeometry(1,1,1),materials=new Map();
  function box(parent,w,h,d,color,x,y,z){
    if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.85}));
    const mesh=new THREE.Mesh(geometry,materials.get(color));mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function label(text,parent,x,y,z,width=3){
    const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');
    ctx.fillStyle='#faf2dc';ctx.fillRect(0,0,512,128);ctx.fillStyle='#294c44';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 38px Georgia';ctx.fillText(text,256,64,480);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
    const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));m.position.set(x,y,z);parent.add(m);return m;
  }
  function sandwich(parent){
    const g=new THREE.Group();parent.add(g);
    for(const [y,h,color]of [[0,.10,'#d69e52'],[.075,.045,'#77a65b'],[.115,.04,'#d87559'],[.17,.09,'#f0cd89']])box(g,.55,h,.38,color,0,y,0);
    return g;
  }
  const cart=new THREE.Group();cart.position.set(MARKET.x,0,MARKET.z);root.add(cart);
  box(cart,2.4,.85,1.4,'#668d79',0,.55,0);box(cart,2.65,.12,1.65,'#f0d9ad',0,1.03,0);
  for(const x of [-1,1])box(cart,.25,.38,.38,'#3c4b46',x,.2,.4);
  for(const x of [-1.2,1.2])box(cart,.09,2.7,.09,'#ab7e50',x,1.35,.55);
  for(let i=0;i<8;i++)box(cart,.35,.13,2.1,i%2?'#f4dbb1':'#d67953',-1.225+i*.35,2.72,0);
  label('WILLOW & RYE',cart,0,2.36,.99,2.55);
  label('LUNCH • NO DUCKS',cart,0,.59,.713,2.1);
  const plate=box(cart,.85,.035,.7,'#fff3d9',-.6,1.11,0),lunch=sandwich(cart);lunch.position.set(-.6,1.14,0);
  // Include the counter and posts in physical and camera collision queries.
  world.collision.solids.push({x:24,z:-12,w:2.4,d:1.4,bottom:0,top:1.1});
  for(const x of [22.8,25.2])world.collision.solids.push({x,z:-11.45,w:.09,d:.09,bottom:0,top:2.8});
  const vendor=new THREE.Group();vendor.position.set(26,0,-12.3);root.add(vendor);
  box(vendor,.6,.8,.35,'#607f76',0,1,0);box(vendor,.48,.64,.06,'#f4e4bd',0,.96,.2);
  box(vendor,.4,.42,.38,'#ce9972',0,1.66,0);box(vendor,.64,.10,.6,'#d6af75',0,1.91,0);
  box(vendor,.40,.24,.4,'#d6af75',0,2.04,0);
  for(const sign of [-1,1]){box(vendor,.17,.6,.2,'#40554e',sign*.18,.35,0);box(vendor,.04,.04,.025,'#293e36',sign*.1,1.7,.2);}
  const arm=new THREE.Group();arm.position.set(.36,1.35,0);vendor.add(arm);box(arm,.16,.56,.18,'#ce9972',0,-.22,0);
  const other=box(vendor,.16,.56,.18,'#ce9972',-.36,1.1,0);
  const speech=label('HEY! THAT’S MY LUNCH!',root,24,3.3,-13.6,3.6);speech.visible=false;
  const carried=sandwich(duck.pose);carried.position.set(0,1.02,1.24);carried.scale.setScalar(.95);
  const rooftop=new THREE.Group();rooftop.position.set(PICNIC.x,PICNIC.y,PICNIC.z);root.add(rooftop);
  for(let x=-2;x<2;x++)for(let z=-2;z<2;z++)box(rooftop,1,.035,1,(x+z)%2?'#f6e6c4':'#c77f6b',x+.5,.025,z+.5);
  box(rooftop,.8,.4,.55,'#b68c55',1.25,.24,-1.2);box(rooftop,.9,.06,.62,'#ddbd81',1.25,.47,-1.2);
  const feast=sandwich(rooftop);feast.position.set(0,.13,0);
  for(const x of [-2.3,2.3])box(rooftop,.08,2.4,.08,'#648671',x,1.2,-2);
  box(rooftop,4.6,.025,.025,'#e8d8b0',0,2.32,-2);
  for(let i=0;i<7;i++)box(rooftop,.36,.4,.035,i%2?'#e2b958':'#75a79c',-1.8+i*.6,2.12,-2);
  label('THE PICNIC CLUB',rooftop,0,.85,-2.05,2.7);
  const guests=[-.9,.9].map((x,i)=>{const d=createDuck({scale:.65,colors:{head:i?'#7a704c':'#377a64'}});d.setPosition(PICNIC.x+x,PICNIC.z+.9);d.setAltitude(PICNIC.y);d.setFacing(Math.PI);scene.add(d.root);return d;});
  // Crumbs lead along the park path to the cart without creating another collectible counter.
  const crumbs=new THREE.Group();root.add(crumbs);
  for(let i=0;i<12;i++)box(crumbs,.1,.07,.12,'#e9c274',23+Math.sin(i*2)*.15,.09,5-i*1.25);
  const nestBasket=new THREE.Group();nestBasket.position.set(24,0,8.6);root.add(nestBasket);
  box(nestBasket,.8,.42,.6,'#b68c55',0,.24,0);box(nestBasket,.9,.06,.68,'#e9c274',0,.47,0);label('PICNIC CLUB',nestBasket,0,.3,.31,.7);
  const card=document.getElementById('mischief-card'),note=document.getElementById('mischief-note'),button=document.getElementById('mischief-track');
  function refresh(){
    const count=Number(s.stolen)+Number(s.picnic)+Number(s.splashed.length>=3);
    note.textContent=`${s.stolen?'✓':'○'} Borrow lunch · ${s.picnic?'✓':'○'} Share a rooftop picnic · ${s.splashed.length>=3?'✓':'○'} Splash pigeons (${Math.min(3,s.splashed.length)}/3)`;
    button.textContent=tracking?'Stop tracking mischief':game.complete?'Visit the Picnic Club ↗':'Follow the crumbs ↗';
    card.querySelector('strong').textContent=game.complete?'Picnic Club member ✦':s.carrying?'A sandwich. A getaway.':'Market mischief';
    card.querySelector('p').textContent=s.carrying?'Lunch is in your bill! Land on the checked rooftop blanket and honk to share.':s.picnic?game.complete?'A picnic, a splash, a very good day.':'Swim beside the east bank of the pond. Paddle fast or honk to splash three pigeons.':'Follow the crumbs down the park path. Honk beside the sandwich cart to borrow lunch.';
    card.querySelector('small').textContent=`OPTIONAL ADVENTURE · ${count} / 3`;
  }
  button.onclick=()=>{tracking=!tracking;refresh();document.getElementById('journal-dialog').close();};
  function persist(){if(!feedback.persist())document.getElementById('save-note').textContent='Progress is temporary: browser storage unavailable.';refresh();}
  function finish(){if(game.complete&&!celebrated){celebrated=true;feedback.cue('finish');announce('Picnic Club member! A basket is waiting beside your home nest.',7);feedback.burst(duck.root.position,'#efd58e',30);}}
  refresh();
  return {game,
    get objective(){return tracking?{...game.objective(),title:card.querySelector('strong').textContent,tip:card.querySelector('p').textContent,progress:Number(s.stolen)+Number(s.picnic)+Number(s.splashed.length>=3)}:null;},
    stopTracking(){tracking=false;refresh();},
    interact(p){
      if(callCooldown>0)return;
      const action=game.interact(p);if(!action)return;callCooldown=.8;
      if(action==='steal'){tracking=true;vendorTimer=7;feedback.cue('pickup');announce('Vendor: “Hey! That’s my lunch! …Well, at least share it.”',6);persist();}
      if(action==='share'){welcomeTime=0;feedback.cue('rescue');announce('A secret picnic! Two neighbors arrive for lunch. The vendor approves of sharing.',7);feedback.burst(new THREE.Vector3(PICNIC.x,PICNIC.y+1,PICNIC.z),'#f1cf8e',30);persist();finish();}
      if(action==='hungry')announce('Someone left a picnic blanket here. Bring a sandwich from Willow & Rye!',5);
      if(action==='picnic'){guests.forEach(d=>d.triggerHonk());announce('Picnic Club rule number one: there’s always room for one more duck.');}
    },
    splash(ids){if(!ids.length)return;const gained=game.splash(ids);feedback.burst(new THREE.Vector3(duck.root.position.x,.18,duck.root.position.z),'#cdeeee',20);feedback.cue('splash');if(gained){persist();announce(`Pigeon puddle party · ${Math.min(3,s.splashed.length)} / 3 — absolutely no dignity remaining.`,5);finish();}},
    update(dt,time,p,camera){
      callCooldown=Math.max(0,callCooldown-dt);vendorTimer=Math.max(0,vendorTimer-dt);
      carried.visible=s.carrying;lunch.visible=!s.carrying&&!s.picnic;feast.visible=s.picnic;crumbs.visible=!s.stolen;nestBasket.visible=game.complete;
      welcomeTime=Math.min(3,welcomeTime+(s.picnic?dt:0));
      guests.forEach((d,i)=>{const sign=i?1:-1;d.root.visible=s.picnic;d.setPosition(PICNIC.x+sign*(3.7-2.8*welcomeTime/3),PICNIC.z+.9);d.setAltitude(PICNIC.y);d.setFacing(welcomeTime<3?-sign*Math.PI/2:Math.PI+Math.sin(time*.5+i)*.25);d.update(dt,welcomeTime<3);});
      if(vendorTimer>0){vendor.rotation.y=Math.atan2(p.x-vendor.position.x,p.z-vendor.position.z);arm.rotation.z=-1+Math.sin(time*10)*.4;speech.visible=true;speech.quaternion.copy(camera.quaternion);}else{vendor.rotation.y*=Math.exp(-3*dt);arm.rotation.z=Math.sin(time*1.2)*.06;speech.visible=false;}
      other.rotation.z=Math.sin(time*1.2)*.04;
      card.hidden=tracking||!(s.carrying||Math.hypot(p.x-MARKET.x,p.z-MARKET.z)<10);
      const action=game.action(p);
      if(action){const el=document.getElementById('interaction');el.classList.add('visible');el.textContent=`H / HONK · ${action==='steal'?'Borrow a sandwich':action==='share'?'Share lunch':action==='hungry'?'A secret picnic?':'Say hello to the Picnic Club'}`;}
    },
  };
}
