import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createDuck } from '../../src/duck.js';
import {
  DEFAULT_DUCK_PARAMS,
  DUCK_COLOR_KEYS,
  mergeDuckParams,
  paramsToJson,
} from '../../src/duckParams.js';

const MODES = [
  { id: 'idle', label: 'Idle' },
  { id: 'waddle', label: 'Waddle' },
  { id: 'hop', label: 'Hop' },
  { id: 'fly', label: 'Fly' },
  { id: 'glide', label: 'Glide' },
  { id: 'roll', label: 'Roll' },
];

const ANIM_FIELDS = [
  { key: 'waddleSpeed', label: 'Waddle speed', min: 4, max: 24, step: 0.1 },
  { key: 'waddleTilt', label: 'Waddle tilt', min: 0, max: 0.8, step: 0.01 },
  { key: 'waddleHop', label: 'Waddle hop', min: 0, max: 0.4, step: 0.01 },
  { key: 'waddleSquash', label: 'Waddle squash', min: 0, max: 0.3, step: 0.01 },
  { key: 'flapBaseRate', label: 'Flap rate', min: 4, max: 28, step: 0.1 },
  { key: 'flapWingAmp', label: 'Flap amp', min: 0.1, max: 1.4, step: 0.01 },
  { key: 'glideWingSpread', label: 'Glide spread', min: 0.2, max: 1.4, step: 0.01 },
  { key: 'glideBankAmount', label: 'Glide bank', min: 0, max: 0.8, step: 0.01 },
  { key: 'thrustBankAmount', label: 'Thrust bank', min: 0, max: 1, step: 0.01 },
  { key: 'rollDuration', label: 'Roll time', min: 0.2, max: 1.5, step: 0.01 },
  { key: 'idleBobAmount', label: 'Idle bob', min: 0, max: 0.08, step: 0.001 },
  { key: 'honkBeakOpen', label: 'Honk beak', min: 0, max: 0.8, step: 0.01 },
];

const viewport = document.getElementById('viewport');
const modeGrid = document.getElementById('mode-grid');
const colorGrid = document.getElementById('color-grid');
const animGrid = document.getElementById('anim-grid');
const flightSliders = document.getElementById('flight-sliders');
const autoOrbitEl = document.getElementById('auto-orbit');
const bankEl = document.getElementById('bank');
const throttleEl = document.getElementById('throttle');
const climbEl = document.getElementById('climb');
const scaleEl = document.getElementById('scale');
const scaleOut = document.getElementById('scale-out');
const centerEl = document.getElementById('bodyCenterY');
const centerOut = document.getElementById('bodyCenterY-out');

let params = mergeDuckParams();
let mode = 'waddle';
let duck = null;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x243024);
scene.fog = new THREE.Fog(0x243024, 12, 36);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
camera.position.set(3.2, 2.4, 4.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.7, 0);
controls.enableDamping = true;
controls.minDistance = 2;
controls.maxDistance = 14;

const hemi = new THREE.HemisphereLight(0xdde8ff, 0x3a4a30, 0.85);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d0, 1.15);
sun.position.set(4, 8, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(6, 48),
  new THREE.MeshLambertMaterial({ color: 0x3f5a38 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(8, 16, 0x6a8058, 0x4a6040);
grid.position.y = 0.01;
scene.add(grid);

function spawnDuck() {
  if (duck) {
    scene.remove(duck.root);
    duck.dispose();
  }
  duck = createDuck(params);
  duck.setPosition(0, 0, false);
  duck.setAltitude(0);
  scene.add(duck.root);
}

function setMode(next) {
  mode = next;
  for (const btn of modeGrid.querySelectorAll('.mode-btn')) {
    btn.classList.toggle('is-active', btn.dataset.mode === mode);
  }
  const flighty = mode === 'fly' || mode === 'glide' || mode === 'roll';
  flightSliders.classList.toggle('is-hidden', !flighty);
  if (duck) {
    duck.setFlying(flighty);
    if (flighty) duck.setAltitude(0.35);
    else duck.setAltitude(0);
    if (mode === 'roll') duck.triggerBarrelRoll(1);
  }
}

function buildModeButtons() {
  modeGrid.innerHTML = '';
  for (const m of MODES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mode-btn';
    btn.dataset.mode = m.id;
    btn.textContent = m.label;
    btn.addEventListener('click', () => setMode(m.id));
    modeGrid.appendChild(btn);
  }
}

function buildColorInputs() {
  colorGrid.innerHTML = '';
  for (const key of DUCK_COLOR_KEYS) {
    const wrap = document.createElement('label');
    wrap.className = 'color-item';
    const input = document.createElement('input');
    input.type = 'color';
    input.value = params.colors[key];
    input.addEventListener('input', () => {
      params.colors[key] = input.value;
      duck.setParams({ colors: { [key]: input.value } });
    });
    wrap.append(input, document.createTextNode(key));
    colorGrid.appendChild(wrap);
  }
}

function buildAnimInputs() {
  animGrid.innerHTML = '';
  for (const field of ANIM_FIELDS) {
    const row = document.createElement('label');
    row.className = 'row';
    const span = document.createElement('span');
    span.textContent = field.label;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(field.min);
    input.max = String(field.max);
    input.step = String(field.step);
    input.value = String(params.anim[field.key]);
    const out = document.createElement('output');
    out.textContent = Number(input.value).toFixed(field.step < 0.01 ? 3 : 2);
    input.addEventListener('input', () => {
      const v = Number(input.value);
      out.textContent = v.toFixed(field.step < 0.01 ? 3 : 2);
      params.anim[field.key] = v;
      duck.setParams({ anim: { [field.key]: v } });
    });
    row.append(span, input, out);
    animGrid.appendChild(row);
  }
}

function syncModelSliders() {
  scaleEl.value = String(params.scale);
  scaleOut.textContent = params.scale.toFixed(2);
  centerEl.value = String(params.bodyCenterY);
  centerOut.textContent = params.bodyCenterY.toFixed(2);
}

scaleEl.addEventListener('input', () => {
  params.scale = Number(scaleEl.value);
  scaleOut.textContent = params.scale.toFixed(2);
  duck.setParams({ scale: params.scale });
});

centerEl.addEventListener('input', () => {
  params.bodyCenterY = Number(centerEl.value);
  centerOut.textContent = params.bodyCenterY.toFixed(2);
  duck.setParams({ bodyCenterY: params.bodyCenterY });
});

document.getElementById('honk-btn').addEventListener('click', () => duck.triggerHonk());

document.getElementById('reset-btn').addEventListener('click', () => {
  params = mergeDuckParams();
  spawnDuck();
  buildColorInputs();
  buildAnimInputs();
  syncModelSliders();
  setMode(mode);
});

document.getElementById('copy-btn').addEventListener('click', async () => {
  const text = paramsToJson(duck.getParams());
  try {
    await navigator.clipboard.writeText(text);
    const btn = document.getElementById('copy-btn');
    const prev = btn.textContent;
    btn.textContent = 'Copied!';
    setTimeout(() => {
      btn.textContent = prev;
    }, 1000);
  } catch {
    console.log(text);
    alert('Copied to console (clipboard blocked).');
  }
});

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);

const clock = new THREE.Clock();

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);

  if (autoOrbitEl.checked) {
    duck.root.rotation.y += dt * 0.45;
  }

  let moving = false;
  let flying = false;
  let hopping = false;
  let gliding = false;
  let throttle = 0;
  let bank = 0;
  let climb = 0;

  if (mode === 'waddle') {
    moving = true;
  } else if (mode === 'hop') {
    hopping = true;
    duck.setAltitude(0.55 + Math.sin(clock.elapsedTime * 3) * 0.08);
  } else if (mode === 'fly' || mode === 'glide' || mode === 'roll') {
    flying = true;
    gliding = mode === 'glide';
    throttle = Number(throttleEl.value);
    bank = Number(bankEl.value);
    climb = Number(climbEl.value);
    if (mode === 'roll' && !duck.isBarrelRolling()) {
      // keep occasional rolls while in roll preview
      if (Math.floor(clock.elapsedTime * 0.55) !== Math.floor((clock.elapsedTime - dt) * 0.55)) {
        duck.triggerBarrelRoll(Math.random() > 0.5 ? 1 : -1);
      }
    }
  } else {
    duck.setAltitude(0);
  }

  duck.update(dt, moving, flying, throttle, hopping, bank, gliding, climb);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

buildModeButtons();
spawnDuck();
buildColorInputs();
buildAnimInputs();
syncModelSliders();
setMode('waddle');
resize();
tick();
