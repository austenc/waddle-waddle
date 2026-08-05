import * as THREE from 'three';

const C = {
  head: 0x1f6b3a,
  body: 0xa86b2d,
  chest: 0xc9a06a,
  beak: 0xe8a020,
  eye: 0x1a1a1a,
  wing: 0x8a5520,
  wingTip: 0x2a2a2a,
  foot: 0xe07020,
  tail: 0x3a2a18,
  collar: 0xffffff,
};

function part(w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Voxel mallard.
 * root = position + yaw only
 * pose = pitch / bank / waddle tilt (avoids Euler coupling that made W look like a roll)
 */
export function createDuck() {
  const root = new THREE.Group();
  const pose = new THREE.Group();
  root.add(pose);

  // Body
  pose.add(part(0.9, 0.55, 1.15, C.body, 0, 0.55, 0));
  pose.add(part(0.7, 0.35, 0.55, C.chest, 0, 0.45, 0.35));

  // Head + neck
  const neck = part(0.35, 0.35, 0.35, C.head, 0, 0.95, 0.55);
  const head = part(0.55, 0.45, 0.5, C.head, 0, 1.2, 0.62);
  pose.add(neck);
  pose.add(head);
  pose.add(part(0.58, 0.08, 0.52, C.collar, 0, 0.95, 0.55));

  // Beak
  const beak = part(0.28, 0.14, 0.35, C.beak, 0, 1.12, 0.95);
  pose.add(beak);

  // Eyes
  pose.add(part(0.1, 0.1, 0.08, C.eye, 0.22, 1.28, 0.8));
  pose.add(part(0.1, 0.1, 0.08, C.eye, -0.22, 1.28, 0.8));

  // Wings
  const leftWing = part(0.18, 0.4, 0.7, C.wing, 0.52, 0.55, -0.05);
  const rightWing = part(0.18, 0.4, 0.7, C.wing, -0.52, 0.55, -0.05);
  pose.add(leftWing);
  pose.add(rightWing);
  pose.add(part(0.12, 0.22, 0.25, C.wingTip, 0.55, 0.48, -0.4));
  pose.add(part(0.12, 0.22, 0.25, C.wingTip, -0.55, 0.48, -0.4));

  // Tail
  pose.add(part(0.4, 0.25, 0.3, C.tail, 0, 0.65, -0.65));

  // Feet (pivoted for waddle)
  const leftFoot = new THREE.Group();
  leftFoot.position.set(0.28, 0.12, 0.1);
  leftFoot.add(part(0.22, 0.08, 0.35, C.foot, 0, 0, 0.05));
  pose.add(leftFoot);

  const rightFoot = new THREE.Group();
  rightFoot.position.set(-0.28, 0.12, 0.1);
  rightFoot.add(part(0.22, 0.08, 0.35, C.foot, 0, 0, 0.05));
  pose.add(rightFoot);

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

  const ROLL_DURATION = 0.55;

  function resetPoseTilt() {
    pose.rotation.x = 0;
    pose.rotation.z = 0;
  }

  return {
    root,
    pose,
    leftFoot,
    rightFoot,
    leftWing,
    rightWing,
    state,

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
        resetPoseTilt();
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
      state.moving = moving;
      state.flying = flying;
      let yOffset = 0;

      if (flying) {
        const flapRate = gliding ? 5 : 12 + Math.max(0, throttle) * 14;
        state.flapPhase += dt * flapRate;
        const flap = Math.sin(state.flapPhase);
        const flapAbs = Math.abs(flap);

        if (gliding) {
          leftWing.rotation.z = THREE.MathUtils.lerp(leftWing.rotation.z, 0.95, 1 - Math.exp(-8 * dt));
          rightWing.rotation.z = THREE.MathUtils.lerp(rightWing.rotation.z, -0.95, 1 - Math.exp(-8 * dt));
          leftWing.rotation.x = THREE.MathUtils.lerp(leftWing.rotation.x, 0.05, 1 - Math.exp(-8 * dt));
          rightWing.rotation.x = THREE.MathUtils.lerp(rightWing.rotation.x, 0.05, 1 - Math.exp(-8 * dt));
        } else {
          leftWing.rotation.z = 0.45 + flap * 0.75;
          rightWing.rotation.z = -0.45 - flap * 0.75;
          leftWing.rotation.x = flap * 0.18;
          rightWing.rotation.x = flap * 0.18;
        }

        if (state.rollT > 0) {
          state.rollT += dt / ROLL_DURATION;
          if (state.rollT >= 1) {
            state.rollT = 0;
            pose.rotation.z = 0;
          } else {
            const t = state.rollT;
            const eased = t * t * (3 - 2 * t);
            // +rollDir = right shove; −z dips right wing first
            pose.rotation.z = -eased * Math.PI * 2 * state.rollDir;
          }
          pose.rotation.x = THREE.MathUtils.lerp(pose.rotation.x, 0, 1 - Math.exp(-10 * dt));
        } else {
          // D (+bank) → right strafe → right wing down (−z)
          const targetBank = -bank * 0.5;
          // Nose up when climbing, down when sinking
          const targetPitch = THREE.MathUtils.clamp(-climbRate * 0.045, -0.35, 0.35);
          pose.rotation.z = THREE.MathUtils.lerp(pose.rotation.z, targetBank, 1 - Math.exp(-10 * dt));
          pose.rotation.x = THREE.MathUtils.lerp(pose.rotation.x, targetPitch, 1 - Math.exp(-8 * dt));
        }

        leftFoot.rotation.x = THREE.MathUtils.lerp(leftFoot.rotation.x, 0.9, 1 - Math.exp(-10 * dt));
        rightFoot.rotation.x = THREE.MathUtils.lerp(rightFoot.rotation.x, 0.9, 1 - Math.exp(-10 * dt));
        leftFoot.position.y = 0.18;
        rightFoot.position.y = 0.18;

        pose.scale.set(1, 1, 1);
        yOffset = gliding ? Math.sin(state.flapPhase * 0.35) * 0.03 : flapAbs * 0.05;
        head.position.x *= 0.9;
        neck.position.x *= 0.9;
        head.position.y = 1.2;
        neck.position.y = 0.95;
      } else if (hopping) {
        state.flapPhase += dt * 14;
        const flap = Math.sin(state.flapPhase);
        pose.rotation.x = THREE.MathUtils.lerp(pose.rotation.x, -0.2, 1 - Math.exp(-8 * dt));
        pose.rotation.z *= 0.9;
        leftWing.rotation.z = 0.35 + flap * 0.4;
        rightWing.rotation.z = -0.35 - flap * 0.4;
        leftFoot.rotation.x = 0.7;
        rightFoot.rotation.x = 0.7;
        leftFoot.position.y = 0.16;
        rightFoot.position.y = 0.16;
        pose.scale.set(1, 1, 1);
        head.position.y = 1.2;
        neck.position.y = 0.95;
      } else if (moving) {
        state.waddlePhase += dt * 13;
        const swing = Math.sin(state.waddlePhase);
        const hop = Math.abs(Math.sin(state.waddlePhase * 2));

        pose.rotation.z = swing * 0.32;
        pose.rotation.x = hop * 0.08;
        yOffset = hop * 0.16;

        const squash = 1 - hop * 0.12;
        pose.scale.set(1 + (1 - squash) * 0.2, squash, 1 + (1 - squash) * 0.08);

        leftFoot.rotation.x = swing * 1.05;
        rightFoot.rotation.x = -swing * 1.05;
        leftFoot.position.y = 0.12 + Math.max(0, swing) * 0.08;
        rightFoot.position.y = 0.12 + Math.max(0, -swing) * 0.08;

        leftWing.rotation.z = 0.25 + hop * 0.35;
        rightWing.rotation.z = -0.25 - hop * 0.35;
        leftWing.rotation.x *= 0.85;
        rightWing.rotation.x *= 0.85;

        head.position.y = 1.2 + hop * 0.05;
        head.position.x = -swing * 0.06;
        neck.position.y = 0.95 + hop * 0.03;
        neck.position.x = -swing * 0.03;
      } else {
        pose.rotation.z *= 0.82;
        pose.rotation.x *= 0.82;
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
        state.bob += dt * 2.2;
        yOffset = Math.sin(state.bob) * 0.025;
        head.position.y = 1.2 + Math.sin(state.bob) * 0.015;
        neck.position.y = 0.95;
      }

      if (state.honkTimer > 0) {
        state.honkTimer -= dt;
        const lift = Math.max(0, state.honkTimer) / 0.28;
        head.position.y = 1.2 + lift * 0.12;
        neck.position.y = 0.95 + lift * 0.06;
        beak.scale.set(1, 1 + lift * 0.35, 1 + lift * 0.15);
      } else {
        beak.scale.set(1, 1, 1);
      }

      root.position.y = state.altitude + yOffset;
    },

    triggerHonk() {
      state.honkTimer = 0.28;
    },
  };
}
