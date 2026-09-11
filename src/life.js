import * as THREE from 'three';

/** Small, reactive city inhabitants, batched into two draw calls. */
export function createCityLife(scene) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const material = new THREE.MeshStandardMaterial({ roughness: .85 });
  const mesh = new THREE.InstancedMesh(geometry, material, 360);
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);
  const matrix = new THREE.Object3D(), tint = new THREE.Color();
  const birds = Array.from({ length: 30 }, (_, i) => {
    const cluster = [[-22,17],[-31,-18],[18,-42],[22,39],[19,6]][Math.floor(i/6)];
    return { id:i, x: i>=24?18.2+(i%2)*.6:cluster[0]+Math.sin(i*7)*3, z: i>=24?3.5+(i-24)*.7:cluster[1]+Math.cos(i*3)*2, y: 0, yaw: i*2.4, home: cluster, flight: 0, seed: i*.73 };
  });
  let count = 0, scared = 0, cooldown = 0;
  function part(x,y,z,w,h,d,color,ry=0,rz=0) {
    matrix.position.set(x,y,z); matrix.scale.set(w,h,d);matrix.rotation.set(0,ry,rz);matrix.updateMatrix();
    mesh.setMatrixAt(count,matrix.matrix);mesh.setColorAt(count++,tint.set(color));
  }
  function honk(player) {
    if (cooldown > 0) return 0;
    let n = 0;
    for (const bird of birds) if (Math.hypot(player.x-bird.x,player.z-bird.z)<9 && Math.abs(player.y-bird.y)<4) {
      bird.flight = 4; bird.yaw = Math.atan2(bird.x-player.x,bird.z-player.z);n++;
    }
    if(n){scared+=n;cooldown=2;}return n;
  }
  return {
    honk,
    splash(player) {
      if(player.mode!=='swim')return [];
      const ids=[];
      for(const b of birds)if(b.id>=24&&b.flight<=0&&Math.hypot(player.x-b.x,player.z-b.z)<4.8) {
        b.flight=4;b.yaw=Math.atan2(b.x-player.x,b.z-player.z);ids.push(b.id);
      }
      return ids;
    },
    update(dt,time,player,save) {
      count=0;cooldown=Math.max(0,cooldown-dt);
      for (const b of birds) {
        b.flight=Math.max(0,b.flight-dt);
        if (b.flight > 0) {
          b.x+=Math.sin(b.yaw)*dt*3;b.z+=Math.cos(b.yaw)*dt*3;
          b.y=2.5*Math.sin(Math.PI*b.flight/4);
        } else {
          b.y=0;
          const dx=b.home[0]-b.x,dz=b.home[1]-b.z;
          if(Math.hypot(dx,dz)>(b.id>=24?.7:4)){b.yaw=Math.atan2(dx,dz);b.x+=Math.sin(b.yaw)*dt*.6;b.z+=Math.cos(b.yaw)*dt*.6;}
          else b.yaw+=Math.sin(time*.4+b.seed)*dt*.2;
        }
        const fx=Math.sin(b.yaw),fz=Math.cos(b.yaw),peck=b.flight?0:Math.max(0,Math.sin(time*2+b.seed))*.08;
        part(b.x,b.y+.25,b.z,.28,.25,.45,'#88989b',b.yaw);
        part(b.x+fx*.19,b.y+.42-peck,b.z+fz*.19,.19,.22,.2,'#576d76',b.yaw);
        part(b.x+fx*.31,b.y+.4-peck,b.z+fz*.31,.09,.06,.12,'#e1b67e',b.yaw);
        for(const side of [-1,1]) {
          const flap=b.flight?Math.sin(time*23+b.seed)*.8:0;
          part(b.x+Math.cos(b.yaw)*side*.2,b.y+.26,b.z-Math.sin(b.yaw)*side*.2,b.flight?.55:.1,.07,.33,'#64777f',b.yaw,flap*side);
        }
      }
      // Butterflies linger over the park and catch the low afternoon light.
      for(let i=0;i<12;i++) {
        const x=19+Math.sin(time*.35+i*3)*4,z=16+Math.cos(time*.3+i*2)*3,y=.9+Math.sin(time*1.3+i)*.3;
        for(const side of [-1,1])part(x+side*.07,y,z,.16,.025,.16,i%2?'#f5d496':'#fff0d5',time*.3,Math.sin(time*16+i)*side);
      }
      // Paper boats are playful, non-solid details outside the timed racing line.
      for(let i=0;i<4;i++) {
        const z=-27-((time*.45+i*21)%76),x=8+Math.sin(time*.3+i)*.45;
        part(x,.2,z,.6,.12,1,'#eaddb9',.12);
        part(x,.4,z,.04,.35,.5,'#f6ecd4',.12,-.6);
      }
      // The home nest visibly fills out as the adventure progresses.
      for(let i=0;i<save.feathers.length;i++) {
        const a=i*2.4,r=.35+(i%4)*.28;
        part(22+Math.sin(a)*r,.11,7+Math.cos(a)*r,.1,.055,.5,'#f1d798',a);
      }
      for(let i=0;i<save.rescued.length;i++) {
        const x=24.9,z=4.5+i;
        part(x,.18,z,.65,.36,.65,'#c2936a');part(x,.7,z,.08,.75,.08,'#719768');
        part(x,.99,z,.5,.14,.5,['#edb98c','#e7d498','#d8a1a0','#b7cfa2','#c6b1d3'][i]);
      }
      mesh.count=count;mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;
    },
  };
}
