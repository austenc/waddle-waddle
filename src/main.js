import * as THREE from 'three';
import { createWorld } from './world.js';
import { createDuck } from './duck.js';
import { createControls } from './controls.js';
import { createHonk } from './honk.js';
import { createTouchControls } from './touch.js';

const versionEl = document.getElementById('build-version');
if (versionEl) {
  versionEl.textContent = `v${__APP_VERSION__}`;
}

const SPEED = 5.2;
const FLY_MAX_SPEED = 16;
const GLIDE_COAST = 11;
const THRUST_ACCEL = 28;
const BRAKE_DECEL = 36;
const IDLE_DECEL = 10;
const GLIDE_DECEL = 4;
const BANK_SPEED = 7;
const BANK_TURN = 1.8;
const RUDDER_SPEED = 2.2;
const ROLL_SHIFT_SPEED = 22;
const FLAP_CLIMB = 7;
const GLIDE_SINK = 3.2;
const IDLE_SINK = 5.5;
const MAX_ALTITUDE = 28;
const LAND_ALTITUDE = 0.85;
const JUMP_VELOCITY = 8.5;
const GRAVITY = 24;

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

duck.setPosition(14, 0, false);
duck.setFacing(-Math.PI / 2);

const controls = createControls();
const touch = createTouchControls(controls);
const honk = createHonk();
controls.onHonkGesture = () => {
  honk.unlock();
};

let playing = false;
let flying = false;
let hopVy = 0;
let airborne = false;
let airSpeed = 0;

const CAM_DIST = 9;
const CAM_HEIGHT = 5.5;
const CAM_LOOK_Y = 0.85;
const DUCK_TURN = 14;
const CAM_TURN = 2.4;

let duckYaw = duck.root.rotation.y;
let camYaw = duck.root.rotation.y;

const camLook = new THREE.Vector3();
const camPos = new THREE.Vector3();
const desiredCam = new THREE.Vector3();
const moveDir = new THREE.Vector3();

const clock = new THREE.Clock();

function groundY(x, z) {
  return world.isInWater(x, z) ? -0.12 : 0;
}

function shortestAngleDelta(from, to) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function lerpAngle(from, to, t) {
  return from + shortestAngleDelta(from, to) * t;
}

function setFlying(next) {
  flying = next;
  duck.setFlying(flying);
  touch.setFlying(flying);
  document.body.classList.toggle('is-flying', flying);
  if (flying) {
    airborne = true;
    hopVy = 0;
    airSpeed = Math.max(airSpeed, 6);
    const takeoff = Math.max(duck.getAltitude(), LAND_ALTITUDE + 1.2);
    duck.setAltitude(takeoff);
  } else {
    hopVy = 0;
    airborne = false;
    airSpeed = 0;
    const gy = groundY(duck.root.position.x, duck.root.position.z);
    duck.setAltitude(gy);
    duck.setPosition(
      duck.root.position.x,
      duck.root.position.z,
      world.isInWater(duck.root.position.x, duck.root.position.z),
    );
  }
}

function updateCamera(dt) {
  camYaw = lerpAngle(camYaw, duckYaw, 1 - Math.exp(-CAM_TURN * dt));

  const followY = duck.getFollowY();
  const camHeight = flying ? CAM_HEIGHT + 1.5 : CAM_HEIGHT;
  const camDist = flying ? CAM_DIST + 2.5 : CAM_DIST;

  desiredCam.set(
    duck.root.position.x - Math.sin(camYaw) * camDist,
    followY + camHeight,
    duck.root.position.z - Math.cos(camYaw) * camDist,
  );
  camPos.lerp(desiredCam, 1 - Math.exp(-6 * dt));
  camera.position.copy(camPos);

  const lookBlend = flying ? 3.2 : 1.4;
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

  world.update(clock.elapsedTime);

  let moving = false;
  let bank = 0;
  let throttle = 0;
  let gliding = false;
  let climbRate = 0;

  if (playing) {
    // Hop / double-jump takeoff (Space becomes glide once flying)
    if (!flying && controls.consumeJump()) {
      if (airborne) {
        setFlying(true);
      } else {
        hopVy = JUMP_VELOCITY;
        airborne = true;
      }
    }

    if (flying && controls.consumeLand()) {
      setFlying(false);
    }

    if (flying) {
      controls.syncJumpLatch();
      const axes = controls.getFlightAxes();
      bank = axes.bank;
      throttle = axes.throttle;
      gliding = controls.isGliding();

      // --- Simple duck flight sim ---
      // W thrusts along facing; S brakes; Space glides (coast + sink)
      // A/D bank (turn + tilt + light strafe); Q/E rudder; A/D×2 barrel roll
      if (throttle > 0 && !gliding) {
        airSpeed += THRUST_ACCEL * throttle * dt;
      } else if (throttle < 0) {
        airSpeed += BRAKE_DECEL * throttle * dt; // throttle negative → slow down
      } else if (gliding) {
        // Ease toward a gentle coast speed
        const delta = GLIDE_COAST - airSpeed;
        const step = Math.sign(delta) * Math.min(Math.abs(delta), GLIDE_DECEL * dt);
        airSpeed += step;
      } else {
        airSpeed -= IDLE_DECEL * dt;
      }
      airSpeed = THREE.MathUtils.clamp(airSpeed, 0, FLY_MAX_SPEED);

      const yawRate = axes.rudder * RUDDER_SPEED + bank * BANK_TURN;
      duckYaw += yawRate * dt;
      duck.setFacing(duckYaw);

      const fx = Math.sin(duckYaw);
      const fz = Math.cos(duckYaw);
      const rx = Math.cos(duckYaw);
      const rz = -Math.sin(duckYaw);

      let vx = fx * airSpeed + rx * bank * BANK_SPEED;
      let vz = fz * airSpeed + rz * bank * BANK_SPEED;

      const rollDir = controls.consumeBarrelRoll();
      if (rollDir !== 0) {
        duck.triggerBarrelRoll(rollDir);
      }
      if (duck.isBarrelRolling()) {
        const dir = duck.getRollDir();
        vx += rx * dir * ROLL_SHIFT_SPEED;
        vz += rz * dir * ROLL_SHIFT_SPEED;
      }

      const nx = duck.root.position.x + vx * dt;
      const nz = duck.root.position.z + vz * dt;
      duck.root.position.x = THREE.MathUtils.clamp(nx, -BOUNDS, BOUNDS);
      duck.root.position.z = THREE.MathUtils.clamp(nz, -BOUNDS, BOUNDS);

      // Lift from flapping; glide/idle sink
      if (throttle > 0 && !gliding) {
        climbRate = FLAP_CLIMB * throttle * (0.55 + 0.45 * (airSpeed / FLY_MAX_SPEED));
      } else if (gliding) {
        climbRate = -GLIDE_SINK;
      } else {
        climbRate = -IDLE_SINK;
      }

      let alt = duck.getAltitude() + climbRate * dt;
      alt = Math.min(alt, MAX_ALTITUDE);
      if (alt <= LAND_ALTITUDE) {
        setFlying(false);
      } else {
        duck.setAltitude(alt);
      }

      moving = airSpeed > 0.4 || Math.abs(bank) > 0.05 || Math.abs(throttle) > 0.05;
    } else {
      const input = controls.getMoveVector();

      if (input.moving) {
        const fx = Math.sin(camYaw);
        const fz = Math.cos(camYaw);
        const rx = Math.cos(camYaw);
        const rz = -Math.sin(camYaw);

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
          duck.root.position.x = clampedX;
          duck.root.position.z = clampedZ;
          if (!airborne) {
            duck.setPosition(clampedX, clampedZ, world.isInWater(clampedX, clampedZ));
          }
          moving = true;
        }
      } else if (!airborne) {
        duck.setPosition(
          duck.root.position.x,
          duck.root.position.z,
          world.isInWater(duck.root.position.x, duck.root.position.z),
        );
      }

      if (airborne) {
        hopVy -= GRAVITY * dt;
        let alt = duck.getAltitude() + hopVy * dt;
        const gy = groundY(duck.root.position.x, duck.root.position.z);
        if (alt <= gy) {
          alt = gy;
          hopVy = 0;
          airborne = false;
          duck.setAltitude(alt);
          duck.setPosition(
            duck.root.position.x,
            duck.root.position.z,
            world.isInWater(duck.root.position.x, duck.root.position.z),
          );
        } else {
          duck.setAltitude(alt);
        }
      }
    }

    duck.update(dt, moving, flying, throttle, airborne && !flying, bank, gliding, climbRate);

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
    duck.update(dt, false, false, 0, false, 0, false, 0);
  }

  updateCamera(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

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
