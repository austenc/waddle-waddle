import * as THREE from 'three';
import { createWorld } from './world.js';
import { createDuck } from './duck.js';
import { createControls } from './controls.js';
import { createHonk } from './honk.js';
import { createTouchControls } from './touch.js';

const SPEED = 5.2;

const container = document.getElementById('app');
const splash = document.getElementById('splash');
const startBtn = document.getElementById('start-btn');
const hud = document.getElementById('hud');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 180);

const world = createWorld(scene);
const BOUNDS = world.bounds;
const duck = createDuck();
scene.add(duck.root);

// Start on the path east of the pond, facing into the park (-X toward water)
duck.setPosition(14, 0, false);
duck.setFacing(-Math.PI / 2);

const controls = createControls();
const touch = createTouchControls(controls);
const honk = createHonk();

let playing = false;

const CAM_DIST = 9;
const CAM_HEIGHT = 5.5;
const CAM_LOOK_Y = 0.85;
/** Duck snaps toward move heading quickly; camera yaw trails so you see the side. */
const DUCK_TURN = 14;
const CAM_TURN = 2.4;

let duckYaw = duck.root.rotation.y;
let camYaw = duck.root.rotation.y;

const camLook = new THREE.Vector3();
const camPos = new THREE.Vector3();
const desiredCam = new THREE.Vector3();
const moveDir = new THREE.Vector3();

const clock = new THREE.Clock();

function shortestAngleDelta(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function lerpAngle(from, to, t) {
  return from + shortestAngleDelta(from, to) * t;
}

function updateCamera(dt) {
  // Camera yaw lazily follows the duck — lag lets you see the mallard's side
  camYaw = lerpAngle(camYaw, duckYaw, 1 - Math.exp(-CAM_TURN * dt));

  // Follow a stable height so the waddle hop doesn't shake the camera
  const followY = duck.getFollowY();

  desiredCam.set(
    duck.root.position.x - Math.sin(camYaw) * CAM_DIST,
    followY + CAM_HEIGHT,
    duck.root.position.z - Math.cos(camYaw) * CAM_DIST,
  );
  camPos.lerp(desiredCam, 1 - Math.exp(-6 * dt));
  camera.position.copy(camPos);

  // Look at the duck, biased a little along duck facing (not cam) for side profile
  const lookBlend = 1.4;
  camLook.set(
    duck.root.position.x + Math.sin(duckYaw) * lookBlend,
    followY + CAM_LOOK_Y,
    duck.root.position.z + Math.cos(duckYaw) * lookBlend,
  );
  camera.lookAt(camLook);
}

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);

function startGame() {
  if (playing) return;
  playing = true;
  splash.classList.add('is-gone');
  hud.classList.remove('hud-hidden');
  hud.setAttribute('aria-hidden', 'false');
  touch.setActive(true);
  honk.unlock();
}

startBtn.addEventListener('click', startGame);
window.addEventListener('keydown', (e) => {
  if (!playing && (e.code === 'Enter' || e.code === 'Space')) {
    e.preventDefault();
    startGame();
  }
});

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  world.update(t);

  let moving = false;

  if (playing) {
    const input = controls.getMoveVector();

    if (input.moving) {
      // Move relative to camera yaw (stable), not raw camera matrix
      const fx = Math.sin(camYaw);
      const fz = Math.cos(camYaw);
      const rx = Math.cos(camYaw);
      const rz = -Math.sin(camYaw);

      // input.z: W=-1 (forward), S=+1; input.x: A=-1, D=+1
      // Strafe uses camera-right; negate x so A/D match screen left/right
      moveDir.set(fx * -input.z - rx * input.x, 0, fz * -input.z - rz * input.x);

      if (moveDir.lengthSq() > 1e-6) {
        moveDir.normalize();
        const targetYaw = Math.atan2(moveDir.x, moveDir.z);
        duckYaw = lerpAngle(duckYaw, targetYaw, 1 - Math.exp(-DUCK_TURN * dt));
        duck.setFacing(duckYaw);

        const nx = duck.root.position.x + moveDir.x * SPEED * dt;
        const nz = duck.root.position.z + moveDir.z * SPEED * dt;
        const clampedX = THREE.MathUtils.clamp(nx, -BOUNDS, BOUNDS);
        const clampedZ = THREE.MathUtils.clamp(nz, -BOUNDS, BOUNDS);
        duck.setPosition(clampedX, clampedZ, world.isInWater(clampedX, clampedZ));
        moving = true;
      }
    } else {
      duck.setPosition(
        duck.root.position.x,
        duck.root.position.z,
        world.isInWater(duck.root.position.x, duck.root.position.z),
      );
    }

    duck.update(dt, moving);

    if (controls.consumeHonk()) {
      duck.triggerHonk();
      honk.play();
    }
  } else {
    duckYaw = -Math.PI / 2;
    camYaw = lerpAngle(camYaw, duckYaw, 1 - Math.exp(-3 * dt));
    duck.setFacing(duckYaw);
    duck.setPosition(
      duck.root.position.x,
      duck.root.position.z,
      world.isInWater(duck.root.position.x, duck.root.position.z),
    );
    duck.update(dt, false);
  }

  updateCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

// Seed third-person camera behind the duck
{
  camYaw = duckYaw;
  camPos.set(
    duck.root.position.x - Math.sin(camYaw) * CAM_DIST,
    duck.root.position.y + CAM_HEIGHT,
    duck.root.position.z - Math.cos(camYaw) * CAM_DIST,
  );
  camera.position.copy(camPos);
  camLook.set(
    duck.root.position.x + Math.sin(duckYaw) * 1.4,
    CAM_LOOK_Y,
    duck.root.position.z + Math.cos(duckYaw) * 1.4,
  );
  camera.lookAt(camLook);
}

tick();
