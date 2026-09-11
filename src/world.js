import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createCollisionWorld } from './physics.js';

export const RESCUE_SPOTS = [
  { name: 'Pip', place: 'Willow Pond', x: -8, z: 6, y: -0.27 },
  { name: 'Clover', place: 'Market Garden', x: -40, z: -36, y: 8.3 },
  { name: 'Miso', place: 'Canal Walk', x: 6, z: -61, y: -0.27 },
  { name: 'Peaches', place: 'The Glasshouse', x: 40, z: 36, y: 16.3 },
  { name: 'Captain', place: 'North Beacon', x: -40, z: -84, y: 28.3 },
];

export function createWorld(scene) {
  const bounds = 116;
  const solids = [];
  const group = new THREE.Group();
  scene.add(group);
  scene.background = new THREE.Color('#c5dde4');
  scene.fog = new THREE.Fog('#c5dde4', 130, 310);
  scene.add(new THREE.HemisphereLight(0xe4f1ff, 0x6d785c, 1.65));
  const sun = new THREE.DirectionalLight(0xffe8c8, 2.5);
  sun.position.set(-85, 130, 70);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -168, right: 168, top: 168, bottom: -168, near: 1, far: 330 });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  // Static architecture is instanced by material: a large city without thousands of draw calls.
  const batches = new Map();
  function box(w, h, d, color, x, y, z, solid = false) {
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push({ w, h, d, x, y, z });
    if (solid) solids.push({ x, z, w, d, bottom: y - h / 2, top: y + h / 2 });
  }
  const cream = '#f5e6c8', timber = '#7f6249', copper = '#426c65';
  // One shared sign atlas keeps browser-only lettering to a single material.
  // Geometry and collision generation are identical in headless clients.
  const shopNames = ['WILLOW & RYE', 'THE SEED LIBRARY', 'CANAL POST', 'HONEY & FIG',
    'MORNING LOAF', 'THE BOATWRIGHT', 'MARKET GARDEN', 'THE GLASSHOUSE', 'NORTH BEACON'];
  let signMaterial;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 128 * shopNames.length;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      shopNames.forEach((name, i) => {
        const top = i * 128;
        ctx.fillStyle = copper; ctx.fillRect(0, top, 1024, 128);
        ctx.strokeStyle = '#dfc790'; ctx.lineWidth = 3; ctx.strokeRect(12, top + 10, 1000, 108);
        ctx.fillStyle = cream; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '600 48px Georgia, serif'; ctx.fillText(name, 512, top + 57);
        ctx.font = '16px Georgia, serif'; ctx.fillText('•   W I L L O W   W A T E R F R O N T   •', 512, top + 98);
      });
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      signMaterial = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9 });
    }
  }
  function sign(index, x, y, z, width = 6) {
    box(width + 0.2, 0.95, 0.16, cream, x, y, z);
    box(width, 0.75, 0.18, copper, x, y, z + 0.015);
    if (!signMaterial) return;
    const geo = new THREE.PlaneGeometry(width, 0.75);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, (shopNames.length - index - 1 + uv.getY(i)) / shopNames.length);
    const mesh = new THREE.Mesh(geo, signMaterial);
    mesh.position.set(x, y, z + 0.115); group.add(mesh);
  }
  function planter(x, z, y = 0, flower = '#d77759', width = 1.2) {
    box(width, 0.55, 1, '#b79270', x, y + 0.275, z, true);
    box(width + 0.12, 0.12, 1.12, cream, x, y + 0.52, z);
    box(width - 0.12, 0.25, 0.8, '#4e8b65', x, y + 0.65, z);
    for (const dx of [-0.28, 0.28]) {
      box(0.12, 0.35, 0.12, '#718858', x + dx, y + 0.88, z);
      box(0.3, 0.22, 0.3, flower, x + dx, y + 1.08, z);
    }
  }
  function bench(x, z, facing = 1) {
    solids.push({x, z, w:2.7, d:.75, bottom:0, top:.71});
    solids.push({x, z:z+facing*.4, w:2.7, d:.12, bottom:.71, top:1.36});
    for (const dx of [-1, 1]) box(0.16, 0.6, 0.8, copper, x + dx, 0.3, z);
    for (const dz of [-0.26, 0, 0.26]) box(2.7, 0.12, 0.2, timber, x, 0.65, z + dz);
    for (const y of [0.98, 1.26]) box(2.7, 0.2, 0.12, timber, x, y, z + facing * 0.4);
    for (const dx of [-1.15, 1.15]) box(0.12, 0.7, 0.12, copper, x + dx, 0.98, z + facing * 0.4);
  }
  function stall(x, z, y = 0, accent = '#d77759') {
    for (const dx of [-1.8, 1.8]) for (const dz of [-0.9, 0.9])
      box(0.12, 2.8, 0.12, timber, x + dx, y + 1.4, z + dz, true);
    box(3.8, 0.85, 1.6, timber, x, y + 0.425, z, true);
    box(4, 0.14, 1.85, cream, x, y + 0.92, z);
    for (let i = 0; i < 6; i++) {
      box(0.7, 0.18, 2.5, i % 2 ? cream : accent, x - 1.75 + i * 0.7, y + 2.8, z);
      box(0.7, 0.3, 0.12, i % 2 ? cream : accent, x - 1.75 + i * 0.7, y + 2.6, z + 1.2);
    }
    for (let i = -1; i <= 1; i++) {
      box(0.9, 0.15, 1.1, '#b79270', x + i * 1.15, y + 1.05, z);
      box(0.65, 0.25, 0.7, ['#d77759', '#f1ce7b', '#73a66c'][i + 1], x + i * 1.15, y + 1.2, z);
    }
  }
  let seed = 73;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const waterAt = (x, z) => (Math.abs(x) < 10 && Math.abs(z) > 24) || (x / 17) ** 2 + (z / 12) ** 2 < 1;
  box(244, 0.5, 244, '#687c79', 0, -0.65, 0);
  box(56, 0.35, 48, '#8cba73', 0, -0.18, 0);
  // Promenades, canal embankments, and a connected street grid.
  for (const x of [-13, 13]) for (const sign of [-1, 1]) box(5, 0.15, 98, '#d5c9aa', x, 0.01, sign * 73);
  for (const z of [-24, 24, -60, 60, -108, 108]) {
    // Leave the canal exposed below bridges, even at wave troughs.
    for (const side of [-1, 1]) box(112, 0.08, 6, '#52696a', side * 66, 0.015, z);
    for (let x = -112; x < 116; x += 8) {
      if (Math.abs(x) > 16) box(3, 0.025, 0.16, '#f2d7a1', x, 0.065, z);
    }
  }
  for (const x of [-64, 64, -108, 108]) {
    box(6, 0.08, 244, '#52696a', x, 0.015, 0);
    for (let z = -112; z < 116; z += 8) box(0.16, 0.025, 3, '#f2d7a1', x, 0.065, z);
  }
  // Bridges are solid decks, including their undersides.
  for (const z of [-60, 60, -108, 108]) {
    box(28, 0.6, 6, '#d5c9aa', 0, 1.5, z, true);
    for (const side of [-1, 1]) box(28, 0.35, 0.25, '#426c65', 0, 2.15, z + side * 2.9, true);
    // Broad stepped approaches are hop-accessible.
    for (const sign of [-1, 1]) for (let i = 0; i < 4; i++) box(1.1, (4 - i) * 0.4, 6, '#d5c9aa', sign * (14.5 + i), (4 - i) * 0.2, z, true);
  }
  function tree(x, z, scale = 1, y = 0) {
    if (y === 0 && Math.hypot(x - 22, z - 7) < 12) return;
    box(0.5, 2.4 * scale, 0.5, '#7f6249', x, y + 1.2 * scale, z, true);
    box(2.8*scale,2*scale,2.8*scale,'#4e8b65',x,y+3*scale,z,true);
    box(2.2*scale,1.6*scale,2.2*scale,'#6ea879',x-.22*scale,y+4.1*scale,z,true);
    for(const side of [-1,1]) {
      box(1.6*scale,1.5*scale,1.9*scale,'#659866',x+side*1.05*scale,y+3.0*scale,z+side*.28*scale);
      box(.9*scale,.6*scale,1.2*scale,'#94b77e',x+side*.64*scale,y+4.76*scale,z-.1*scale);
    }
  }
  const palette = ['#e0b999', '#cfdfd8', '#e5d4b2', '#b7c8c4', '#c88f79', '#a1bdc1'];
  function building(x, z, w, d, h, color, shopIndex, special) {
    box(w + 3, 0.14, d + 3, '#c4bea9', x, 0, z);
    box(w, h, d, color, x, h / 2, z, true);
    box(w + 0.5, 0.3, d + 0.5, '#f5e6c8', x, h + 0.15, z, true);
    box(w - 0.8, 0.04, d - 0.8, '#6d827a', x, h + 0.32, z);
    for (let y = 2.3; y < h - 0.6; y += 3) {
      for (let offset = -w / 2 + 1.3; offset < w / 2 - 0.5; offset += 2.7) {
        for (const sign of [-1, 1]) box(1.35, 1.65, 0.1, '#416b73', x + offset, y, z + sign * (d / 2 + 0.03));
      }
      for (let offset = -d / 2 + 1.3; offset < d / 2 - 0.5; offset += 2.7) {
        for (const sign of [-1, 1]) box(0.1, 1.65, 1.35, '#416b73', x + sign * (w / 2 + 0.03), y, z + offset);
      }
      box(w + 0.12, 0.15, d + 0.12, '#f5e6c8', x, y + 1.05, z);
    }
    // Tall shopfronts, painted shutters, and cornices give the repeated grid a human scale.
    box(w + 0.3, 0.35, d + 0.3, '#b79270', x, 0.25, z);
    for (const side of [-1, 1]) {
      box(2.4, 1.6, 0.12, copper, x + side * 3.2, 1.1, z + d / 2 + 0.07);
      box(0.08, 1.6, 0.14, cream, x + side * 3.2, 1.1, z + d / 2 + 0.15);
      box(0.28, h - 0.3, 0.18, cream, x + side * (w / 2 - 0.3), h / 2, z + d / 2 + 0.07);
      if (h > 10) {
        box(0.4, 1.7, 0.16, copper, x + side * 3.2 + 0.95, 5.3, z + d / 2 + 0.12);
        planter(x + side * 3.2, z + d / 2 + 0.35, 4.05, '#d77759');
      }
    }
    sign(shopIndex, x, 3, z + d / 2 + 0.15);
    // Street-facing shop awnings and rooftop gardens.
    for (let j = -1; j <= 1; j++) box(2.1, 0.18, 1.5, j === 0 ? '#f5e6c8' : '#d77759', x + j * 2.1, 2, z + d / 2 + 0.6);
    box(1.5, 2, 0.12, '#2e555a', x, 1, z + d / 2 + 0.06);
    if (special) return;
    box(2.3, 0.5, 2.3, '#b79270', x - w / 2 + 2, h + 0.55, z - d / 2 + 2, true);
    box(2, 0.7, 2, '#73a66c', x - w / 2 + 2, h + 1.1, z - d / 2 + 2);
    box(2, 1, 1.5, '#96a8a4', x + w / 2 - 2, h + 0.8, z - d / 2 + 2, true);
  }
  function landmark(spot, w, d) {
    const { x, z, y } = spot;
    // All large additions are behind or beside the open central rescue terrace.
    for (const dx of [-3.5, 3.5]) box(0.12, 1.35, 0.12, copper, x + dx, y + 0.675, z + d / 2 + 0.2);
    if (spot.name === 'Clover') {
      for (const dx of [-w / 2 + 2, w / 2 - 2]) for (const dz of [-5, 0, 5])
        planter(x + dx, z + dz, y, '#f1ce7b', 2.3);
      stall(x - 3, z - 6, y);
      stall(x + 3, z - 6, y, copper);
      box(7, 0.03, 6, '#e1ceaa', x, y + 0.015, z + 1);
      sign(6, x, y + 1, z + d / 2 + 0.2, 8);
      // Terrace corners read as a garden pavilion from a distance.
      for (const dx of [-w / 2, w / 2]) {
        box(0.3, 2.8, 0.3, cream, x + dx, y + 1.4, z - 7, true);
        box(1.5, 0.2, 1.5, copper, x + dx, y + 2.85, z - 7);
      }
    } else if (spot.name === 'Peaches') {
      const glass = new THREE.MeshStandardMaterial({ color: '#b7e1cf', transparent: true,
        opacity: 0.38, roughness: 0.22, metalness: 0.15, depthWrite: false, side: THREE.DoubleSide });
      // Glasshouse occupies the rear third; the rescue remains outdoors with clear overhead space.
      const greenhouse = new THREE.Mesh(new THREE.BoxGeometry(w - 3, 4, 5.5), glass);
      greenhouse.position.set(x, y + 2, z - 5.5); group.add(greenhouse);
      solids.push({ x, z: z - 5.5, w: w - 3, d: 5.5, bottom: y, top: y + 4 });
      for (let dx = -w / 2 + 1.5; dx <= w / 2 - 1.4; dx += (w - 3) / 6) {
        for (const dz of [-8.25, -2.75]) box(0.12, 4.1, 0.12, copper, x + dx, y + 2, z + dz);
        box(0.12, 0.12, 5.6, copper, x + dx, y + 4, z - 5.5);
      }
      for (const dz of [-8.25, -2.75]) for (const dy of [0.2, 2, 4])
        box(w - 2.8, 0.12, 0.12, copper, x, y + dy, z + dz);
      // Stepped clerestory roof keeps the silhouette voxel-built.
      box(w - 2.6, 0.18, 5.9, copper, x, y + 4.12, z - 5.5, true);
      box(w - 4, 0.55, 2.5, '#b7c8c4', x, y + 4.47, z - 5.5, true);
      box(w - 3.7, 0.16, 2.8, copper, x, y + 4.83, z - 5.5, true);
      for (const dx of [-5, 0, 5]) planter(x + dx, z - 5.5, y, '#f1ce7b', 2);
      for (const dx of [-w / 2 + 2, w / 2 - 2]) for (const dz of [1.5, 5.5]) planter(x + dx, z + dz, y, '#d77759', 2);
      sign(7, x, y + 1, z + d / 2 + 0.2, 8);
    } else {
      // An offset, striped lantern tower leaves Captain's landing pad unobstructed.
      const bz = z - 5.5;
      box(6, 0.4, 6, cream, x, y + 0.2, bz, true);
      for (let i = 0; i < 4; i++) box(4, 1.6, 4, i % 2 ? '#d77759' : cream, x, y + 1.2 + i * 1.6, bz, true);
      box(5.4, 0.3, 5.4, copper, x, y + 6.65, bz, true);
      box(3, 2.1, 3, '#fff1bd', x, y + 7.85, bz, true);
      for (const dx of [-1.65, 1.65]) for (const dz of [-1.65, 1.65]) box(0.18, 2.4, 0.18, copper, x + dx, y + 7.9, bz + dz);
      for (let i = 0; i < 3; i++) box(4.5 - i, 0.4, 4.5 - i, copper, x, y + 9.2 + i * 0.4, bz, true);
      box(0.16, 2, 0.16, copper, x, y + 10.6, bz);
      box(1.5, 0.65, 0.08, '#d77759', x + 0.8, y + 11.15, bz);
      sign(8, x, y + 1, z + d / 2 + 0.2, 8);
      for (const dx of [-6, 6]) box(1.4, 0.7, 1.4, cream, x + dx, y + 0.35, z + 5, true);
    }
  }
  let buildingIndex = 0;
  for (const x of [-88, -40, 40, 88]) for (const z of [-84, -36, 0, 36, 84]) {
    const special = RESCUE_SPOTS.find(p => p.x === x && p.z === z);
    const h = special ? special.y - 0.3 : 7 + Math.floor(random() * 8) * 3;
    const w = 15 + random() * 8, d = z === 0 ? 15 : 19;
    const color = palette[Math.floor(random() * palette.length)];
    building(x, z, w, d, h, special ? (special.name === 'Captain' ? '#e5d4b2' : '#cfdfd8') : color, buildingIndex++ % 6, special);
    if (special) landmark(special, w, d);
    if (z !== 0) {
      bench(x - 5, z + d / 2 + 3);
      planter(x + 5, z + d / 2 + 2.8);
    }
    tree(x - 14, z + 8, 0.8);
    tree(x + 14, z - 8, 1);
  }
  // Smaller terraced homes give the streets a human scale beneath the skyline.
  for (const side of [-1, 1]) for (const z of [-92,-80,-44,-32,28,40,80,92]) {
    const x=side*56, h=6+Math.abs(z)%3;
    const wall=palette[Math.abs(z)%palette.length];
    box(8, .12, 10, '#c4bea9',x,0,z);
    box(7,h,8,wall,x,h/2,z,true);
    for(let level=0;level<3;level++)box(7.4-level*1.5,.6,8.4,'#426c65',x,h+.3+level*.6,z,true);
    for(const dx of [-2,2]) for(const y of [1.7,4.3]) {
      box(1.2,1.55,.12,'#416b73',x+dx,y,z+4.04);
      box(1.45,.15,.3,cream,x+dx,y-.8,z+4.15);
    }
    box(1.1,2,.15,'#426c65',x,1,z+4.05);
    box(1.6,.2,1.1,cream,x,2.15,z+4.5);
    planter(x-2,z+4.7,0,'#d77759',1.2);
    box(.6,1.6,.6,'#c88f79',x+2,h+2,z-2);
  }
  for (let i = 0; i < 45; i++) {
    const x = (random() - 0.5) * 52, z = (random() - 0.5) * 43;
    if (waterAt(x, z) || Math.abs(x - 20) < 3 || Math.abs(z) < 2) continue;
    tree(x, z, 0.65 + random() * 0.5);
  }
  box(2.5, 0.06, 48, '#e1ceaa', 20, 0.04, 0);
  box(56, 0.06, 2.5, '#e1ceaa', 0, 0.04, 17);
  // Landing dock and home nest.
  box(9, 0.35, 4, '#a77b57', 17, 0.2, 0, true);
  for (let i = 0; i < 12; i++) box(0.05, 0.02, 4, '#785e48', 12.7 + i * 0.75, 0.385, 0);
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2;
    box(0.6, 0.3, 0.6, '#d2aa63', 22 + Math.cos(a) * 2, 0.17, 7 + Math.sin(a) * 2);
  }
  for (const x of [-17, 17]) for (let z = -100; z <= 100; z += 16) {
    if (Math.abs(z) < 25) continue;
    box(0.16, 3.8, 0.16, '#365c59', x, 1.9, z, true);
    box(0.55, 0.55, 0.55, '#fff1bd', x, 3.8, z);
  }
  // Reeds, flowers, and lily pads.
  for (let i = 0; i < 55; i++) {
    const a = random() * Math.PI * 2;
    const x = Math.cos(a) * 18, z = Math.sin(a) * 13;
    box(0.12, 0.7 + random() * 0.5, 0.12, '#718858', x, 0.35, z);
    if (i % 2 === 0) box(0.3, 0.22, 0.3, '#f1ce7b', x + 1, 0.2, z + 1);
  }
  for (let i = 0; i < 14; i++) {
    const x = -12 + random() * 12, z = -6 + random() * 12;
    box(0.8, 0.04, 0.65, '#6baf81', x, 0.14, z);
  }
  // Quiet waterside furniture clusters, with generous promenade and bridge approaches.
  for (const side of [-1, 1]) for (const z of [-88, -40, 40, 88]) {
    bench(side * 19.5, z);
    planter(side * 19.5, z + 3.4, 0, '#f1ce7b');
    box(0.45, 0.7, 0.45, copper, side * 10.8, 0.35, z);
    box(0.65, 0.12, 0.65, cream, side * 10.8, 0.75, z);
  }
  stall(-31, -20); stall(-37, -20, 0, copper);
  bench(-22, 17, -1); planter(-25, 17);
  // Pale capstones trace the canal without creating impassable collision fences.
  for (const side of [-1, 1]) for (const half of [-1, 1]) {
    box(0.65, 0.6, 98, '#b7c8c4', side * 10.32, -0.15, half * 73);
    box(0.85, 0.12, 98, '#e1ceaa', side * 10.42, 0.16, half * 73);
    for (let z = 28; z < 120; z += 4) box(0.88, 0.015, 0.045, '#b79270', side * 10.42, 0.227, half * z);
  }
  // Stepped bank stones sit outside the ellipse; gaps preserve the landing dock.
  for (let i = 0; i < 64; i++) {
    const a = i / 64 * Math.PI * 2;
    const x = Math.cos(a) * 17.8, z = Math.sin(a) * 12.8;
    if (x > 11 && Math.abs(z) < 3) continue;
    box(1.15, 0.32, 0.9, '#c4bea9', x, -0.02, z);
    if (i % 8 === 0) box(1.5, 0.2, 1.1, '#8cba73', x * 1.04, 0.03, z * 1.04);
  }
  // A restrained, layered silhouette outside the playable bounds frames the town.
  // These distant masses intentionally have no collision or per-object animation.
  for (let i = 0; i < 19; i++) {
    const x = -171 + i * 19, z = -155 - (i % 3) * 10;
    const height = 12 + (i * 7 % 17);
    box(17, height, 16, '#91b8b2', x, height / 2 - 1, z);
    box(13, 3, 12, '#91b8b2', x, height + 0.5, z);
    if (i % 4 === 0) box(3, 7, 3, '#91b8b2', x + 4, height + 3, z);
  }
  for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
    box(22, 10 + i % 3 * 5, 25, '#a5c7bb', side * (148 + i % 2 * 15), 3, -100 + i * 38);
    box(15, 7, 20, '#a5c7bb', side * (148 + i % 2 * 15), 11, -100 + i * 38);
  }
  for (let i = 0; i < 9; i++) {
    const x = -150 + i * 38, z = -135 + (i % 3) * 83, y = 62 + (i % 4) * 7;
    box(22, 3, 9, '#edf0df', x, y, z);
    box(13, 4, 8, '#edf0df', x - 2, y + 2, z);
    box(7, 3, 7, '#edf0df', x + 6, y + 1, z);
  }
  const foliageGeometry=new RoundedBoxGeometry(1,1,1,1,.08);
  const dummy = new THREE.Object3D();
  for (const [color, entries] of batches) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    if(color==='#416b73'){mat.color.set('#729ca6');mat.emissive.set('#476877');mat.emissiveIntensity=.22;mat.roughness=.4;}
    const mesh = new THREE.InstancedMesh(['#4e8b65','#6ea879','#659866','#94b77e'].includes(color)?foliageGeometry:geometry, mat, entries.length);
    entries.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z); dummy.scale.set(b.w, b.h, b.d); dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.castShadow = !['#91b8b2', '#a5c7bb', '#edf0df'].includes(color);
    mesh.receiveShadow = mesh.castShadow; group.add(mesh);
  }
  // Continuous animated water surface with sunlight bands and small intersecting waves.
  const waterMaterial = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    // A level surface agrees with the swim height (-0.27 feet + body offset).
    // Animate normals/color rather than coarse vertices, so banks and pads never flicker.
    vertexShader: `varying vec3 p;
      void main(){ p = (modelMatrix * vec4(position,1.)).xyz;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 p; uniform float time;
      void main(){
        float canal = step(23.9, abs(p.z));
        float pondEdge = (1. - length(p.xz / vec2(17.,12.))) * 12.;
        float edge = mix(pondEdge, 10. - abs(p.x), canal);
        float swell = sin(p.x*.34+p.z*.23+time*.45);
        float ripple = sin(p.x*1.7+p.z*.6+time*.9)*sin(p.z*2.2-time*.7);
        float foam = (1.-smoothstep(.08,.65,edge)) * (.65+.15*swell);
        float lace = (1.-smoothstep(.03,.12,abs(edge-.85-.12*swell))) * .22;
        float glint = pow(max(0.,ripple),20.) * (.35+.65*pow(max(0.,sin(p.x*.12-p.z*.08+time*.15)),4.));
        vec3 c = mix(vec3(.018,.16,.19),vec3(.045,.29,.28),.5+.18*swell+.12*ripple);
        c = mix(c,vec3(.42,.65,.53),clamp(foam+lace,0.,1.));
        c += glint*vec3(.22,.25,.19);
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const pond = new THREE.Mesh(new THREE.CircleGeometry(1, 64), waterMaterial);
  pond.rotation.x = -Math.PI / 2; pond.scale.set(17, 12, 1); pond.position.y = 0.09; group.add(pond);
  for (const sign of [-1, 1]) {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(20, 98, 24, 100), waterMaterial);
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0.09, sign * 73); group.add(water);
  }
  const ripples = Array.from({ length: 12 }, () => {
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.87, 32), new THREE.MeshBasicMaterial({ color: '#d5f6d9', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    mesh.rotation.x = -Math.PI / 2; group.add(mesh); return { mesh, age: 10 };
  });
  let rippleClock = 0, rippleIndex = 0;
  const collision = createCollisionWorld(solids, waterAt, bounds);
  return {
    bounds, collision, isInWater: waterAt,
    district(x, z) { return Math.abs(x) < 28 && Math.abs(z) < 24 ? 'Willow Park' : Math.abs(x) < 20 ? 'The Canals' : z < -60 ? 'North Quarter' : x < 0 ? 'Old Town' : 'Garden District'; },
    update(time, dt = 0, player, swimming = false, moving = false) {
      waterMaterial.uniforms.time.value = time;
      // Fixed sunlight and shadow projection: character animation cannot shimmer the city.
      rippleClock += dt;
      if (player && swimming && rippleClock > (moving ? 0.32 : 0.85)) {
        const r = ripples[rippleIndex++ % ripples.length];
        r.age = 0; r.mesh.position.set(player.x, 0.18, player.z); rippleClock = 0;
      }
      for (const r of ripples) {
        r.age += dt; r.mesh.scale.setScalar(0.3 + r.age * 1.7);
        r.mesh.material.opacity = Math.max(0, 0.2 * (1 - r.age / 1.5));
      }
    },
  };
}
