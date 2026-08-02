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

/** Voxel mallard — root at ground level, facing +Z. */
export function createDuck() {
  const root = new THREE.Group();

  // Body
  root.add(part(0.9, 0.55, 1.15, C.body, 0, 0.55, 0));
  root.add(part(0.7, 0.35, 0.55, C.chest, 0, 0.45, 0.35));

  // Head + neck
  const neck = part(0.35, 0.35, 0.35, C.head, 0, 0.95, 0.55);
  const head = part(0.55, 0.45, 0.5, C.head, 0, 1.2, 0.62);
  root.add(neck);
  root.add(head);
  root.add(part(0.58, 0.08, 0.52, C.collar, 0, 0.95, 0.55));

  // Beak
  const beak = part(0.28, 0.14, 0.35, C.beak, 0, 1.12, 0.95);
  root.add(beak);

  // Eyes
  root.add(part(0.1, 0.1, 0.08, C.eye, 0.22, 1.28, 0.8));
  root.add(part(0.1, 0.1, 0.08, C.eye, -0.22, 1.28, 0.8));

  // Wings
  const leftWing = part(0.18, 0.4, 0.7, C.wing, 0.52, 0.55, -0.05);
  const rightWing = part(0.18, 0.4, 0.7, C.wing, -0.52, 0.55, -0.05);
  root.add(leftWing);
  root.add(rightWing);
  root.add(part(0.12, 0.22, 0.25, C.wingTip, 0.55, 0.48, -0.4));
  root.add(part(0.12, 0.22, 0.25, C.wingTip, -0.55, 0.48, -0.4));

  // Tail
  root.add(part(0.4, 0.25, 0.3, C.tail, 0, 0.65, -0.65));

  // Feet (pivoted for waddle)
  const leftFoot = new THREE.Group();
  leftFoot.position.set(0.28, 0.12, 0.1);
  leftFoot.add(part(0.22, 0.08, 0.35, C.foot, 0, 0, 0.05));
  root.add(leftFoot);

  const rightFoot = new THREE.Group();
  rightFoot.position.set(-0.28, 0.12, 0.1);
  rightFoot.add(part(0.22, 0.08, 0.35, C.foot, 0, 0, 0.05));
  root.add(rightFoot);

  const state = {
    moving: false,
    waddlePhase: 0,
    honkTimer: 0,
    bob: 0,
    baseY: 0,
  };

  return {
    root,
    leftFoot,
    rightFoot,
    leftWing,
    rightWing,
    state,

    setPosition(x, z, inWater = false) {
      root.position.x = x;
      root.position.z = z;
      state.baseY = inWater ? -0.12 : 0;
    },

    /** Steady ground height for the camera — ignores hop / bob. */
    getFollowY() {
      return state.baseY;
    },

    setFacing(angle) {
      root.rotation.y = angle;
    },

    /** Extra cartoony side-lean, hop, and foot flap while moving */
    update(dt, moving) {
      state.moving = moving;
      let yOffset = 0;

      if (moving) {
        state.waddlePhase += dt * 13;
        const swing = Math.sin(state.waddlePhase);
        const hop = Math.abs(Math.sin(state.waddlePhase * 2));

        // Big side lean + tiny pitch tip
        root.rotation.z = swing * 0.32;
        root.rotation.x = hop * 0.08;

        // Bouncy hop
        yOffset = hop * 0.16;

        // Squash & stretch on each step
        const squash = 1 - hop * 0.12;
        root.scale.set(1 + (1 - squash) * 0.2, squash, 1 + (1 - squash) * 0.08);

        // Exaggerated feet
        leftFoot.rotation.x = swing * 1.05;
        rightFoot.rotation.x = -swing * 1.05;
        leftFoot.position.y = 0.12 + Math.max(0, swing) * 0.08;
        rightFoot.position.y = 0.12 + Math.max(0, -swing) * 0.08;

        // Wing flaps
        leftWing.rotation.z = 0.25 + hop * 0.35;
        rightWing.rotation.z = -0.25 - hop * 0.35;

        // Head counters the body lean (looks more alive)
        head.position.y = 1.2 + hop * 0.05;
        head.position.x = -swing * 0.06;
        neck.position.y = 0.95 + hop * 0.03;
        neck.position.x = -swing * 0.03;
      } else {
        root.rotation.z *= 0.82;
        root.rotation.x *= 0.82;
        root.scale.x += (1 - root.scale.x) * 0.2;
        root.scale.y += (1 - root.scale.y) * 0.2;
        root.scale.z += (1 - root.scale.z) * 0.2;
        leftFoot.rotation.x *= 0.82;
        rightFoot.rotation.x *= 0.82;
        leftFoot.position.y += (0.12 - leftFoot.position.y) * 0.2;
        rightFoot.position.y += (0.12 - rightFoot.position.y) * 0.2;
        leftWing.rotation.z *= 0.88;
        rightWing.rotation.z *= 0.88;
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

      root.position.y = state.baseY + yOffset;
    },

    triggerHonk() {
      state.honkTimer = 0.28;
    },
  };
}
