import * as THREE from 'three';
import { mergeDuckParams, hexToInt } from './duckParams.js';

function part(w, h, d, color, x, y, z, key) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
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

    // Body
    add(part(0.9, 0.55, 1.15, c('body'), 0, 0.55, 0, 'body'));
    add(part(0.7, 0.35, 0.55, c('chest'), 0, 0.45, 0.35, 'chest'));

    neck = add(part(0.35, 0.35, 0.35, c('head'), 0, 0.95, 0.55, 'head'));
    head = add(part(0.55, 0.45, 0.5, c('head'), 0, 1.2, 0.62, 'head'));
    add(part(0.58, 0.08, 0.52, c('collar'), 0, 0.95, 0.55, 'collar'));

    beak = add(part(0.28, 0.14, 0.35, c('beak'), 0, 1.12, 0.95, 'beak'));

    add(part(0.1, 0.1, 0.08, c('eye'), 0.22, 1.28, 0.8, 'eye'));
    add(part(0.1, 0.1, 0.08, c('eye'), -0.22, 1.28, 0.8, 'eye'));

    leftWing = add(part(0.18, 0.4, 0.7, c('wing'), 0.52, 0.55, -0.05, 'wing'));
    rightWing = add(part(0.18, 0.4, 0.7, c('wing'), -0.52, 0.55, -0.05, 'wing'));
    add(part(0.12, 0.22, 0.25, c('wingTip'), 0.55, 0.48, -0.4, 'wingTip'));
    add(part(0.12, 0.22, 0.25, c('wingTip'), -0.55, 0.48, -0.4, 'wingTip'));

    add(part(0.4, 0.25, 0.3, c('tail'), 0, 0.65, -0.65, 'tail'));

    leftFoot = new THREE.Group();
    leftFoot.position.set(0.28, 0.12, 0.1);
    leftFoot.add(track(part(0.22, 0.08, 0.35, c('foot'), 0, 0, 0.05, 'foot')));
    pose.add(leftFoot);

    rightFoot = new THREE.Group();
    rightFoot.position.set(-0.28, 0.12, 0.1);
    rightFoot.add(track(part(0.22, 0.08, 0.35, c('foot'), 0, 0, 0.05, 'foot')));
    pose.add(rightFoot);
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

  function resetTilt() {
    tilt.rotation.x = 0;
    tilt.rotation.z = 0;
  }

  function applyColors() {
    for (const [key, meshes] of colorMeshes) {
      const color = hexToInt(params.colors[key]);
      for (const mesh of meshes) {
        mesh.material.color.setHex(color);
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
      if (!flying) {
        state.altitude = Math.min(state.altitude, 0);
        state.rollT = 0;
        resetTilt();
      }
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
      const A = params.anim;
      state.moving = moving;
      state.flying = flying;
      let yOffset = 0;

      if (flying) {
        const flapRate = gliding ? A.glideFlapRate : A.flapBaseRate + Math.max(0, throttle) * A.flapThrottleRate;
        state.flapPhase += dt * flapRate;
        const flap = Math.sin(state.flapPhase);
        const flapAbs = Math.abs(flap);

        if (gliding) {
          leftWing.rotation.z = THREE.MathUtils.lerp(leftWing.rotation.z, A.glideWingSpread, 1 - Math.exp(-8 * dt));
          rightWing.rotation.z = THREE.MathUtils.lerp(rightWing.rotation.z, -A.glideWingSpread, 1 - Math.exp(-8 * dt));
          leftWing.rotation.x = THREE.MathUtils.lerp(leftWing.rotation.x, A.glideWingPitch, 1 - Math.exp(-8 * dt));
          rightWing.rotation.x = THREE.MathUtils.lerp(rightWing.rotation.x, A.glideWingPitch, 1 - Math.exp(-8 * dt));
        } else {
          leftWing.rotation.z = A.flapWingBase + flap * A.flapWingAmp;
          rightWing.rotation.z = -A.flapWingBase - flap * A.flapWingAmp;
          leftWing.rotation.x = flap * A.flapWingPitch;
          rightWing.rotation.x = flap * A.flapWingPitch;
        }

        if (state.rollT > 0) {
          state.rollT += dt / A.rollDuration;
          if (state.rollT >= 1) {
            state.rollT = 0;
            tilt.rotation.z = 0;
          } else {
            const t = state.rollT;
            const eased = t * t * (3 - 2 * t);
            tilt.rotation.z = -eased * Math.PI * 2 * state.rollDir;
          }
          tilt.rotation.x = THREE.MathUtils.lerp(tilt.rotation.x, 0, 1 - Math.exp(-10 * dt));
        } else {
          const targetBank = -bank * (gliding ? A.glideBankAmount : A.thrustBankAmount);
          const targetPitch = THREE.MathUtils.clamp(-climbRate * A.pitchFromClimb, -0.35, 0.35);
          tilt.rotation.z = THREE.MathUtils.lerp(tilt.rotation.z, targetBank, 1 - Math.exp(-10 * dt));
          tilt.rotation.x = THREE.MathUtils.lerp(tilt.rotation.x, targetPitch, 1 - Math.exp(-8 * dt));
        }

        leftFoot.rotation.x = THREE.MathUtils.lerp(leftFoot.rotation.x, 0.9, 1 - Math.exp(-10 * dt));
        rightFoot.rotation.x = THREE.MathUtils.lerp(rightFoot.rotation.x, 0.9, 1 - Math.exp(-10 * dt));
        leftFoot.position.y = 0.18;
        rightFoot.position.y = 0.18;

        pose.scale.set(1, 1, 1);
        yOffset = gliding
          ? Math.sin(state.flapPhase * 0.35) * A.glideBob
          : flapAbs * A.flapBob;
        head.position.x *= 0.9;
        neck.position.x *= 0.9;
        head.position.y = 1.2;
        neck.position.y = 0.95;
      } else if (hopping) {
        state.flapPhase += dt * A.hopFlapRate;
        const flap = Math.sin(state.flapPhase);
        tilt.rotation.x = THREE.MathUtils.lerp(tilt.rotation.x, A.hopLean, 1 - Math.exp(-8 * dt));
        tilt.rotation.z *= 0.9;
        leftWing.rotation.z = A.hopWingBase + flap * A.hopWingFlap;
        rightWing.rotation.z = -A.hopWingBase - flap * A.hopWingFlap;
        leftFoot.rotation.x = 0.7;
        rightFoot.rotation.x = 0.7;
        leftFoot.position.y = 0.16;
        rightFoot.position.y = 0.16;
        pose.scale.set(1, 1, 1);
        head.position.y = 1.2;
        neck.position.y = 0.95;
      } else if (moving) {
        state.waddlePhase += dt * A.waddleSpeed;
        const swing = Math.sin(state.waddlePhase);
        const hop = Math.abs(Math.sin(state.waddlePhase * 2));

        tilt.rotation.z = swing * A.waddleTilt;
        tilt.rotation.x = hop * A.waddlePitch;
        yOffset = hop * A.waddleHop;

        const squash = 1 - hop * A.waddleSquash;
        pose.scale.set(1 + (1 - squash) * 0.2, squash, 1 + (1 - squash) * 0.08);

        leftFoot.rotation.x = swing * A.waddleFootSwing;
        rightFoot.rotation.x = -swing * A.waddleFootSwing;
        leftFoot.position.y = 0.12 + Math.max(0, swing) * 0.08;
        rightFoot.position.y = 0.12 + Math.max(0, -swing) * 0.08;

        leftWing.rotation.z = A.waddleWingBase + hop * A.waddleWingHop;
        rightWing.rotation.z = -A.waddleWingBase - hop * A.waddleWingHop;
        leftWing.rotation.x *= 0.85;
        rightWing.rotation.x *= 0.85;

        head.position.y = 1.2 + hop * 0.05;
        head.position.x = -swing * A.waddleHeadSway;
        neck.position.y = 0.95 + hop * 0.03;
        neck.position.x = -swing * A.waddleHeadSway * 0.5;
      } else {
        tilt.rotation.z *= 0.82;
        tilt.rotation.x *= 0.82;
        pose.scale.x += (1 - pose.scale.x) * 0.2;
        pose.scale.y += (1 - pose.scale.y) * 0.2;
        pose.scale.z += (1 - pose.scale.z) * 0.2;
        leftFoot.rotation.x *= 0.82;
        rightFoot.rotation.x *= 0.82;
        leftFoot.position.y += (0.12 - leftFoot.position.y) * 0.2;
        rightFoot.position.y += (0.12 - rightFoot.position.y) * 0.2;
        leftWing.rotation.z *= 0.88;
        rightWing.rotation.z *= 0.88;
        leftWing.rotation.x *= 0.88;
        rightWing.rotation.x *= 0.88;
        head.position.x *= 0.85;
        neck.position.x *= 0.85;
        state.bob += dt * A.idleBobSpeed;
        yOffset = Math.sin(state.bob) * A.idleBobAmount;
        head.position.y = 1.2 + Math.sin(state.bob) * A.idleHeadBob;
        neck.position.y = 0.95;
      }

      if (state.honkTimer > 0) {
        state.honkTimer -= dt;
        const lift = Math.max(0, state.honkTimer) / A.honkDuration;
        head.position.y = 1.2 + lift * A.honkHeadLift;
        neck.position.y = 0.95 + lift * A.honkHeadLift * 0.5;
        beak.scale.set(1, 1 + lift * A.honkBeakOpen, 1 + lift * A.honkBeakOpen * 0.43);
      } else {
        beak.scale.set(1, 1, 1);
      }

      root.position.y = state.altitude + yOffset;
    },

    triggerHonk() {
      state.honkTimer = params.anim.honkDuration;
    },

    dispose() {
      clearPose();
    },
  };
}
