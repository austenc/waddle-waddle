import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mergeDuckParams, hexToInt } from './duckParams.js';

function part(w, h, d, color, x, y, z, key) {
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(1, 1, 1, 2, key === 'head' ? 0.20 : 0.075).scale(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: key === 'head' ? 0.48 : 0.82, metalness: 0, emissive: key === 'head' ? color : 0, emissiveIntensity: 0.07 }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (key) mesh.userData.colorKey = key;
  return mesh;
}

/**
 * Voxel mallard.
 * root = world position + yaw
 * tilt = bank / pitch / roll about body center
 * pose = mesh parts + squash
 *
 * @param {Partial<typeof import('./duckParams.js').DEFAULT_DUCK_PARAMS>} [overrides]
 */
export function createDuck(overrides = {}) {
  let params = mergeDuckParams(overrides);

  const root = new THREE.Group();
  const tilt = new THREE.Group();
  const pose = new THREE.Group();
  root.add(tilt);
  tilt.add(pose);

  /** @type {Map<string, THREE.Mesh[]>} */
  const colorMeshes = new Map();

  function track(mesh) {
    const key = mesh.userData.colorKey;
    if (!key) return mesh;
    if (!colorMeshes.has(key)) colorMeshes.set(key, []);
    colorMeshes.get(key).push(mesh);
    return mesh;
  }

  function clearPose() {
    while (pose.children.length) {
      const child = pose.children[0];
      pose.remove(child);
      child.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    }
    colorMeshes.clear();
  }

  let neck;
  let head;
  let beak;
  let leftWing;
  let rightWing;
  let leftFoot;
  let rightFoot;
  let foldedWings;
  let flightBlend=0;

  function buildMeshes() {
    clearPose();
    const C = params.colors;
    const s = params.scale;
    const cy = params.bodyCenterY;

    tilt.position.y = cy;
    pose.position.y = -cy;
    root.scale.setScalar(s);

    const c = (key) => hexToInt(C[key]);

    const add = (mesh) => {
      pose.add(mesh);
      track(mesh);
      return mesh;
    };

    // Stepped, boat-shaped body; the breast reaches the neck rather than sitting below it.
    add(part(.84, .53, 1.08, c('body'), 0, .53, -.15, 'body'));
    add(part(.68, .22, .91, c('body'), 0, .82, -.18, 'body'));
    add(part(.66, .19, .98, c('body'), 0, .25, -.08, 'body'));
    add(part(.74, .50, .49, c('chest'), 0, .60, .43, 'chest'));
    add(part(.49, .23, .34, c('chest'), 0, .85, .48, 'chest'));

    neck = add(part(.32, .33, .33, c('head'), 0, .98, .53, 'head'));
    const collar = part(.345, .055, .35, c('collar'), 0, .015, 0, 'collar');
    neck.add(track(collar));
    head = add(part(.50, .43, .53, c('head'), 0, 1.24, .60, 'head'));
    // Broad bevels soften the head while retaining a deliberately block-built profile.
    beak = part(.34, .09, .41, c('beak'), 0, -.09, .39, 'beak');
    head.add(track(beak));
    beak.add(track(part(.27, .045, .13, c('beak'), 0, -.012, .20, 'beak')));
    beak.add(track(part(.085, .026, .045, c('tail'), 0, .035, .251, 'tail')));
    for (const sign of [-1, 1]) {
      head.add(track(part(.035, .075, .08, c('eye'), sign*.25, .035, .155, 'eye')));
      head.add(part(.013, .022, .025, 0xfff7dc, sign*.271, .051, .168));
      beak.add(part(.035, .012, .047, 0x776126, sign*.085, .048, .035));
    }
    function wing(sign) {
      const joint = new THREE.Group(); joint.position.set(sign*.37, .73, -.08); pose.add(joint);
      const feather = (w,h,d,color,x,y,z,key) => joint.add(track(part(w,h,d,color,sign*x,y,z,key)));
      feather(.49,.13,.75,c('wing'),.23,0,-.09,'wing');
      feather(.47,.105,.63,c('wing'),.66,-.018,-.13,'wing');
      // White-bordered blue speculum sits on the upper surface, visible in flight.
      feather(.36,.025,.24,0x364f9c,.55,.06,-.29);
      for(const z of [-.445,-.135]) feather(.36,.025,.055,c('collar'),.55,.06,z,'collar');
      for(let i=0;i<5;i++) {
        const length=.38-i*.035;
        feather(length,.07,.108,c('wingTip'),.86+length/2,-.04,.12-i*.12,'wingTip');
      }
      joint.rotation.set(0,sign*1.3,-sign*.22);
      return joint;
    }
    leftWing=wing(1);rightWing=wing(-1);
    foldedWings=new THREE.Group();pose.add(foldedWings);
    for(const sign of [-1,1]) {
      const feather=part(.14,.34,.88,c('wing'),sign*.43,.56,-.12,'wing');
      feather.rotation.x=-.10;foldedWings.add(track(feather));
      foldedWings.add(track(part(.13,.20,.45,c('wingTip'),sign*.43,.49,-.54,'wingTip')));
      foldedWings.add(part(.018,.105,.26,0x364f9c,sign*.509,.52,-.26));
      for(const z of [-.425,-.095]) foldedWings.add(track(part(.022,.11,.045,c('collar'),sign*.509,.52,z,'collar')));
    }
    leftWing.visible=rightWing.visible=false;flightBlend=0;
    add(part(.47,.13,.37,c('collar'),0,.59,-.77,'collar'));
    add(part(.34,.16,.33,c('tail'),0,.70,-.81,'tail'));
    // The drake's little curled tail, built as three stepped feather blocks.
    add(part(.13,.08,.21,c('tail'),0,.83,-.88,'tail'));
    add(part(.13,.14,.07,c('tail'),0,.91,-.96,'tail'));
    add(part(.13,.06,.12,c('tail'),0,.97,-.925,'tail'));

    leftFoot = new THREE.Group();
    leftFoot.position.set(0.25, 0.06, 0.05);
    leftFoot.add(track(part(0.22, 0.08, 0.35, c('foot'), 0, 0, 0.05, 'foot')));
    leftFoot.add(track(part(.055,.15,.06,c('foot'),0,.08,-.03,'foot')));
    pose.add(leftFoot);

    rightFoot = new THREE.Group();
    rightFoot.position.set(-0.25, 0.06, 0.05);
    rightFoot.add(track(part(0.22, 0.08, 0.35, c('foot'), 0, 0, 0.05, 'foot')));
    rightFoot.add(track(part(.055,.15,.06,c('foot'),0,.08,-.03,'foot')));
    pose.add(rightFoot);
    // Merge rigid pieces within each joint; colors remain editable and joints stay independent.
    colorMeshes.clear();
    const joints=[pose,head,beak,neck,leftWing,rightWing,foldedWings,leftFoot,rightFoot];
    for(const joint of joints) {
      const batches=new Map();
      for(const mesh of [...joint.children]) {
        if(!mesh.isMesh || mesh===head || mesh===beak || mesh===neck) continue;
        const key=`${mesh.userData.colorKey??''}:${mesh.material.color.getHex()}`;
        if(!batches.has(key))batches.set(key,[]);batches.get(key).push(mesh);
      }
      for(const meshes of batches.values()) {
        if(meshes.length===1){track(meshes[0]);continue;}
        const geometries=meshes.map(mesh=>{mesh.updateMatrix();return mesh.geometry.clone().applyMatrix4(mesh.matrix);});
        const merged=new THREE.Mesh(mergeGeometries(geometries),meshes[0].material.clone());
        merged.userData={...meshes[0].userData};merged.castShadow=true;merged.receiveShadow=true;
        for(const mesh of meshes){joint.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}
        geometries.forEach(g=>g.dispose());joint.add(track(merged));
      }
    }
    for(const mesh of [head,beak,neck])track(mesh);

  }

  buildMeshes();

  const state = {
    moving: false,
    flying: false,
    waddlePhase: 0,
    flapPhase: 0,
    honkTimer: 0,
    bob: 0,
    baseY: 0,
    altitude: 0,
    rollT: 0,
    rollDir: 1,
  };

  function applyColors() {
    for (const [key, meshes] of colorMeshes) {
      const color = hexToInt(params.colors[key]);
      for (const mesh of meshes) {
        mesh.material.color.setHex(color);
        if(key==='head')mesh.material.emissive.setHex(color);
      }
    }
  }

  return {
    root,
    tilt,
    pose,
    get leftFoot() {
      return leftFoot;
    },
    get rightFoot() {
      return rightFoot;
    },
    get leftWing() {
      return leftWing;
    },
    get rightWing() {
      return rightWing;
    },
    state,

    getParams() {
      return structuredClone(params);
    },

    /** Live-update colors / anim / scale. Rebuilds meshes if scale or pivot changes. */
    setParams(next) {
      const prevScale = params.scale;
      const prevCenter = params.bodyCenterY;
      params = mergeDuckParams({ ...params, ...next, colors: { ...params.colors, ...next?.colors }, anim: { ...params.anim, ...next?.anim } });
      if (next?.colors) applyColors();
      if (params.scale !== prevScale || params.bodyCenterY !== prevCenter || next?.rebuild) {
        buildMeshes();
      } else {
        root.scale.setScalar(params.scale);
      }
      return params;
    },

    setPosition(x, z, inWater = false) {
      root.position.x = x;
      root.position.z = z;
      if (!state.flying) {
        state.baseY = inWater ? -0.12 : 0;
        state.altitude = state.baseY;
      }
    },

    setAltitude(y) {
      state.altitude = y;
      state.baseY = y;
    },

    setFlying(flying) {
      state.flying = flying;
      if (!flying) state.rollT = 0;
    },

    isFlying() {
      return state.flying;
    },

    isBarrelRolling() {
      return state.rollT > 0;
    },

    getAltitude() {
      return state.altitude;
    },

    getFollowY() {
      return state.altitude;
    },

    setFacing(angle) {
      root.rotation.y = angle;
    },

    triggerBarrelRoll(dir = 1) {
      if (!state.flying || state.rollT > 0) return false;
      state.rollT = 0.0001;
      state.rollDir = dir >= 0 ? 1 : -1;
      return true;
    },

    getRollDir() {
      return state.rollDir;
    },

    /**
     * @param {number} throttle - W forward / S brake (-1..1)
     * @param {number} bank - A/D (-1..1)
     * @param {number} climbRate - vertical speed for nose attitude
     */
    update(dt, moving, flying = false, throttle = 0, hopping = false, bank = 0, gliding = false, climbRate = 0) {
      if (dt <= 0) return;
      const A = params.anim;
      const walking = moving && !flying && !hopping && !state.swimming;
      const blend = 1 - Math.exp(-(walking ? 24 : 10) * dt);
      const damp = (v, target) => THREE.MathUtils.lerp(v, target, blend);
      state.moving = moving; state.flying = flying;
      state.waddlePhase += dt * (state.swimming ? (moving ? 7 : 1.6) : A.waddleSpeed);
      state.bob += dt * A.idleBobSpeed;
      const step = Math.sin(state.waddlePhase), lift = (1-Math.cos(state.waddlePhase*2))*.5;
      let bankPose=0, pitchPose=0, bob=0, headY=1.24, headX=0;
      let wingZ=-.22, wingY=1.3, footSwing=0, footY=.06;
      if (flying || hopping) {
        state.flapPhase += dt * (hopping ? A.hopFlapRate : A.flapBaseRate + Math.max(0, throttle)*A.flapThrottleRate);
        wingY=0;
        wingZ=gliding ? A.glideWingSpread : A.flapWingBase+Math.sin(state.flapPhase)*A.flapWingAmp;
        pitchPose=THREE.MathUtils.clamp(-climbRate*A.pitchFromClimb,-.22,.22);
        bankPose=-bank*(gliding ? A.glideBankAmount : A.thrustBankAmount);
        footSwing=.95;footY=.20;
        bob=gliding ? 0 : Math.sin(state.flapPhase)*A.flapBob;
      } else if (state.swimming) {
        bankPose=step*.012;pitchPose=.025;footY=.025;
        bob=Math.sin(state.bob)*.014;footSwing=step*.48;
      } else if (moving) {
        bankPose=step*A.waddleTilt; pitchPose=lift*A.waddlePitch;
        bob=lift*A.waddleHop;footSwing=step*A.waddleFootSwing;
        headY+=lift*.05;headX=-step*A.waddleHeadSway;
      } else {
        headY+=Math.sin(state.bob)*A.idleHeadBob;
        bob=Math.sin(state.bob)*A.idleBobAmount;
      }
      flightBlend=damp(flightBlend,flying||hopping?1:0);
      leftWing.visible=rightWing.visible=flightBlend>.01;
      foldedWings.visible=flightBlend<.99;
      leftWing.scale.setScalar(Math.max(.001,flightBlend));rightWing.scale.copy(leftWing.scale);
      foldedWings.scale.setScalar(Math.max(.001,1-flightBlend));
      leftWing.rotation.y=damp(leftWing.rotation.y,wingY);
      rightWing.rotation.y=-leftWing.rotation.y;
      leftWing.rotation.z=damp(leftWing.rotation.z,wingZ);
      rightWing.rotation.z=-leftWing.rotation.z;
      leftFoot.rotation.x=damp(leftFoot.rotation.x,footSwing);
      rightFoot.rotation.x=damp(rightFoot.rotation.x,flying||hopping ? footSwing : -footSwing);
      leftFoot.position.y=damp(leftFoot.position.y,footY+(!flying&&!state.swimming&&moving?Math.max(0,step)*.06:0));
      rightFoot.position.y=damp(rightFoot.position.y,footY+(!flying&&!state.swimming&&moving?Math.max(0,-step)*.06:0));
      if (state.rollT > 0) {
        state.rollT += dt/A.rollDuration;
        if(state.rollT>=1){state.rollT=0;tilt.rotation.z=bankPose;}
        else {const t=state.rollT;tilt.rotation.z=-t*t*(3-2*t)*Math.PI*2*state.rollDir;}
      } else tilt.rotation.z=damp(tilt.rotation.z,bankPose);
      tilt.rotation.x=damp(tilt.rotation.x,pitchPose);
      if(state.honkTimer>0){
        state.honkTimer=Math.max(0,state.honkTimer-dt);
        const call=Math.sin((1-state.honkTimer/A.honkDuration)*Math.PI);
        headY+=call*A.honkHeadLift;
        beak.scale.y=1+call*A.honkBeakOpen;
      } else beak.scale.y=damp(beak.scale.y,1);
      head.position.y=damp(head.position.y,headY);head.position.x=damp(head.position.x,headX);
      // The springy gait belongs to the character, never the follow camera.
      const squash=walking ? 1-lift*A.waddleSquash : 1;
      pose.scale.x=damp(pose.scale.x,1+(1-squash)*.2);
      pose.scale.y=damp(pose.scale.y,squash);
      pose.scale.z=damp(pose.scale.z,1+(1-squash)*.08);
      pose.position.x=damp(pose.position.x,walking ? step*.035 : 0);
      foldedWings.rotation.z=damp(foldedWings.rotation.z,walking ? -step*.035 : 0);
      // Animation is local. World position, camera and lighting never inherit the bob.
      pose.position.y=damp(pose.position.y,-params.bodyCenterY+bob);
      root.position.y=state.altitude;
    },

    triggerHonk() {
      state.honkTimer = params.anim.honkDuration;
    },

    dispose() {
      clearPose();
    },
  };
}
