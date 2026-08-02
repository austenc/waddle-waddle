import * as THREE from 'three';

const COLORS = {
  grass: 0x5a9a45,
  grassDark: 0x4a8438,
  path: 0xc4a574,
  water: 0x3a8fc4,
  waterDeep: 0x2a6f9a,
  dirt: 0x8b6b4a,
  trunk: 0x6b4a2e,
  foliage: 0x2f7a32,
  foliageDark: 0x246028,
  bench: 0x8b5a2b,
  rock: 0x8a8a8a,
  flowerPink: 0xe07a9a,
  flowerYellow: 0xe8c84a,
  street: 0x5a5a5e,
  building: [0x7a8490, 0x8a9098, 0x6a7380, 0x9a9088, 0x5c6672, 0x8890a0],
  window: 0xc9d6e2,
  windowLit: 0xe8d9a0,
};

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeTree(x, z, scale = 1) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);

  group.add(box(0.5, 1.6, 0.5, COLORS.trunk, 0, 0.8, 0));
  group.add(box(1.8, 1.2, 1.8, COLORS.foliage, 0, 2.0, 0));
  group.add(box(1.2, 1.0, 1.2, COLORS.foliageDark, 0, 2.9, 0));
  return group;
}

function makeBench(x, z, rotY = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  group.add(box(1.6, 0.12, 0.45, COLORS.bench, 0, 0.45, 0));
  group.add(box(1.6, 0.4, 0.1, COLORS.bench, 0, 0.7, -0.18));
  group.add(box(0.12, 0.45, 0.12, COLORS.bench, -0.65, 0.225, 0.12));
  group.add(box(0.12, 0.45, 0.12, COLORS.bench, 0.65, 0.225, 0.12));
  group.add(box(0.12, 0.45, 0.12, COLORS.bench, -0.65, 0.225, -0.12));
  group.add(box(0.12, 0.45, 0.12, COLORS.bench, 0.65, 0.225, -0.12));
  return group;
}

function makeRock(x, z, s = 1) {
  return box(0.7 * s, 0.4 * s, 0.55 * s, COLORS.rock, x, 0.2 * s, z);
}

function makeBuilding(x, z, w, d, h, color) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const body = box(w, h, d, color, 0, h / 2, 0);
  body.castShadow = false;
  body.receiveShadow = false;
  group.add(body);

  // Simple window grid on the park-facing side (approx -radial later via rotation)
  const cols = Math.max(2, Math.floor(w / 1.4));
  const rows = Math.max(2, Math.floor(h / 2.2));
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (Math.random() < 0.18) continue;
      const lit = Math.random() > 0.72;
      const wx = -w / 2 + 0.7 + col * ((w - 1.2) / Math.max(cols - 1, 1));
      const wy = 1.2 + row * ((h - 2.2) / Math.max(rows - 1, 1));
      const win = box(0.45, 0.55, 0.08, lit ? COLORS.windowLit : COLORS.window, wx, wy, d / 2 + 0.02);
      win.castShadow = false;
      win.receiveShadow = false;
      group.add(win);
    }
  }

  // Slight roof lip
  const roof = box(w + 0.35, 0.35, d + 0.35, 0x4a5058, 0, h + 0.15, 0);
  roof.castShadow = false;
  group.add(roof);

  return group;
}

/** Ring of foggy city blocks around the park perimeter. */
function addCitySkyline(world, parkHalf) {
  const city = new THREE.Group();
  const count = 56;
  const innerR = parkHalf - 1;
  const outerR = parkHalf + 14;

  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.04;
    const r = innerR + 2 + Math.random() * (outerR - innerR - 2);
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    const w = 3.5 + Math.random() * 7;
    const d = 3.5 + Math.random() * 7;
    const h = 10 + Math.random() * 28 + (Math.random() > 0.8 ? 16 : 0);
    const color = COLORS.building[Math.floor(Math.random() * COLORS.building.length)];
    const b = makeBuilding(x, z, w, d, h, color);
    // Face windows toward park center (local +Z → inward)
    b.rotation.y = -a - Math.PI / 2;
    city.add(b);

    // Occasional second row deeper in fog
    if (i % 3 === 0) {
      const r2 = r + 8 + Math.random() * 6;
      const x2 = Math.cos(a) * r2;
      const z2 = Math.sin(a) * r2;
      const h2 = 10 + Math.random() * 28;
      const b2 = makeBuilding(
        x2,
        z2,
        4 + Math.random() * 8,
        4 + Math.random() * 8,
        h2,
        COLORS.building[Math.floor(Math.random() * COLORS.building.length)],
      );
      b2.rotation.y = -a - Math.PI / 2;
      city.add(b2);
    }
  }

  world.add(city);
}

/** Build a Central-Park-ish voxel park with a pond and walking paths. */
export function createWorld(scene) {
  const world = new THREE.Group();
  scene.add(world);

  const PARK = 140;
  const HALF = PARK / 2;

  scene.background = new THREE.Color(0x87b8d8);
  // Fog softens the skyline without erasing it
  scene.fog = new THREE.Fog(0x87b8d8, 52, 115);

  const hemi = new THREE.HemisphereLight(0xd8ecff, 0x6b8f4e, 0.85);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff2d6, 1.15);
  sun.position.set(28, 42, 16);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 160;
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  scene.add(sun);

  // Outer city pad under the skyline
  const cityPad = box(PARK + 50, 0.3, PARK + 50, COLORS.street, 0, -0.28, 0);
  cityPad.castShadow = false;
  cityPad.receiveShadow = true;
  world.add(cityPad);

  const ground = box(PARK, 0.4, PARK, COLORS.grass, 0, -0.2, 0);
  ground.receiveShadow = true;
  ground.castShadow = false;
  world.add(ground);

  for (let i = 0; i < 90; i++) {
    const gx = (Math.random() - 0.5) * (PARK - 10);
    const gz = (Math.random() - 0.5) * (PARK - 10);
    if (Math.hypot(gx, gz) < 12) continue;
    const patch = box(
      1.5 + Math.random() * 2,
      0.05,
      1.5 + Math.random() * 2,
      Math.random() > 0.5 ? COLORS.grassDark : COLORS.grass,
      gx,
      0.02,
      gz,
    );
    patch.castShadow = false;
    world.add(patch);
  }

  // Larger pond
  const pond = new THREE.Group();
  const pondTiles = [];
  for (let px = -5; px <= 5; px++) {
    for (let pz = -4; pz <= 4; pz++) {
      const rx = px / 5;
      const rz = pz / 4;
      if (rx * rx + rz * rz <= 1.05) pondTiles.push([px, pz]);
    }
  }
  for (const [px, pz] of pondTiles) {
    const deep = Math.hypot(px, pz) < 2.2;
    const water = box(1.05, 0.15, 1.05, deep ? COLORS.waterDeep : COLORS.water, px, 0.05, pz);
    water.castShadow = false;
    pond.add(water);
  }

  const shore = [];
  for (let px = -7; px <= 7; px++) {
    for (let pz = -6; pz <= 6; pz++) {
      const rx = px / 6.2;
      const rz = pz / 5.2;
      const outer = rx * rx + rz * rz;
      const inner = (px / 5.2) ** 2 + (pz / 4.2) ** 2;
      if (outer <= 1.05 && inner > 1.0) shore.push([px, pz]);
    }
  }
  for (const [px, pz] of shore) {
    const s = box(1.05, 0.08, 1.05, COLORS.dirt, px, 0.03, pz);
    s.castShadow = false;
    pond.add(s);
  }
  world.add(pond);

  const pathGroup = new THREE.Group();
  const pathW = 1.6;

  function addPathSegment(x1, z1, x2, z2) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const seg = box(pathW, 0.06, len + 0.25, COLORS.path, midX, 0.04, midZ);
    seg.rotation.y = Math.atan2(dx, dz);
    seg.castShadow = false;
    pathGroup.add(seg);
  }

  // Oval path around pond
  const ovalPts = [];
  const ovalSteps = 32;
  for (let i = 0; i < ovalSteps; i++) {
    const a = (i / ovalSteps) * Math.PI * 2;
    ovalPts.push([Math.cos(a) * 12, Math.sin(a) * 9]);
  }
  for (let i = 0; i < ovalPts.length; i++) {
    const [x1, z1] = ovalPts[i];
    const [x2, z2] = ovalPts[(i + 1) % ovalPts.length];
    addPathSegment(x1, z1, x2, z2);
  }

  // Outer ring path
  const ringPts = [];
  const ringSteps = 40;
  for (let i = 0; i < ringSteps; i++) {
    const a = (i / ringSteps) * Math.PI * 2;
    ringPts.push([Math.cos(a) * 32, Math.sin(a) * 26]);
  }
  for (let i = 0; i < ringPts.length; i++) {
    const [x1, z1] = ringPts[i];
    const [x2, z2] = ringPts[(i + 1) % ringPts.length];
    addPathSegment(x1, z1, x2, z2);
  }

  // Spokes to edges
  addPathSegment(12, 0, 55, 0);
  addPathSegment(-12, 0, -55, 0);
  addPathSegment(0, 9, 0, 55);
  addPathSegment(0, -9, 0, -55);
  addPathSegment(8, 7, 40, 36);
  addPathSegment(-8, 7, -40, 36);
  addPathSegment(8, -7, 40, -36);
  addPathSegment(-8, -7, -40, -36);
  // Connect oval to outer ring
  addPathSegment(12, 0, 32, 0);
  addPathSegment(-12, 0, -32, 0);
  addPathSegment(0, 9, 0, 26);
  addPathSegment(0, -9, 0, -26);

  world.add(pathGroup);

  const treeSpots = [
    [14, 6, 1], [14, -6, 0.9], [18, 12, 1.1], [20, -14, 0.85],
    [-14, 6, 1], [-14, -8, 1.05], [-18, 14, 0.9], [-20, -12, 1.1],
    [6, 16, 1], [-6, 15, 0.95], [8, -16, 1.05], [-8, -15, 0.9],
    [28, 8, 1.2], [30, -10, 1], [-28, 10, 1.15], [-30, -6, 0.95],
    [12, 28, 1], [-14, 30, 1.1], [14, -28, 0.9], [-12, -30, 1],
    [36, 22, 1.05], [-34, 24, 0.9], [34, -24, 1.1], [-36, -22, 1],
    [45, 4, 1.3], [-45, 6, 1.2], [4, 48, 1.25], [-6, -48, 1.15],
    [42, 38, 1.1], [-40, 40, 0.95], [40, -40, 1.05], [-42, -38, 1],
    [22, 40, 1], [-24, 42, 1.15], [24, -42, 0.9], [-22, -40, 1.05],
    [50, -18, 1.2], [-50, 16, 1], [18, 50, 1.1], [-16, -52, 0.95],
    [38, 0, 1.15], [-38, 2, 1], [0, 38, 1.2], [2, -38, 1.05],
    [48, 28, 0.9], [-46, -30, 1.1], [26, -48, 1], [-28, 48, 0.95],
  ];
  for (const [tx, tz, sc] of treeSpots) {
    world.add(makeTree(tx, tz, sc));
  }

  world.add(makeBench(13.5, 3, Math.PI / 2));
  world.add(makeBench(-13.5, -3, -Math.PI / 2));
  world.add(makeBench(3, 11, 0));
  world.add(makeBench(-4, -11, Math.PI));
  world.add(makeBench(33, 4, Math.PI / 2));
  world.add(makeBench(-33, -4, -Math.PI / 2));

  world.add(makeRock(6.2, 3.5, 1));
  world.add(makeRock(7.1, 2.4, 0.7));
  world.add(makeRock(-6.5, -3.2, 0.9));
  world.add(makeRock(-5.8, 3.8, 0.6));
  world.add(makeRock(5.5, -4.2, 0.8));

  for (let i = 0; i < 45; i++) {
    const fx = (Math.random() - 0.5) * (PARK - 20);
    const fz = (Math.random() - 0.5) * (PARK - 20);
    if (Math.hypot(fx, fz) < 14) continue;
    const color = Math.random() > 0.5 ? COLORS.flowerPink : COLORS.flowerYellow;
    const flower = box(0.2, 0.35, 0.2, color, fx, 0.2, fz);
    flower.castShadow = false;
    world.add(flower);
  }

  addCitySkyline(world, HALF);

  const waterMeshes = [];
  pond.traverse((obj) => {
    if (
      obj.isMesh &&
      (obj.material.color.getHex() === COLORS.water ||
        obj.material.color.getHex() === COLORS.waterDeep)
    ) {
      waterMeshes.push({ mesh: obj, baseY: obj.position.y, phase: Math.random() * Math.PI * 2 });
    }
  });

  return {
    group: world,
    bounds: HALF - 5,
    update(t) {
      for (const w of waterMeshes) {
        w.mesh.position.y = w.baseY + Math.sin(t * 1.4 + w.phase) * 0.02;
      }
    },
    isInWater(x, z) {
      return (x / 5.2) ** 2 + (z / 4.2) ** 2 <= 1;
    },
  };
}
