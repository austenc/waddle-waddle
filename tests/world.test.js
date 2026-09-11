import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createWorld, RESCUE_SPOTS } from '../src/world.js';
import { createDuck } from '../src/duck.js';
const world = createWorld(new THREE.Scene());
test('every mission duck is on a reachable supporting surface', () => {
  for (const spot of RESCUE_SPOTS) {
    assert.ok(Math.abs(world.collision.surface(spot.x, spot.z, spot.y + 0.01) - spot.y) < 0.001, spot.name);
    assert.ok(spot.y < 65, spot.name);
    const p = world.collision.move(spot, 0.1, 0, spot.y);
    assert.ok(p.x > spot.x, `${spot.name} must not be inside a solid`);
  }
});
test('canal bridges have enough clearance for swimming mallards', () => {
  const p = world.collision.move({x: 0, z: -54}, 0, -12, -0.27);
  assert.ok(p.z < -65.9);
});
test('world generation has identical collisions for each client', () => {
  assert.deepEqual(world.collision.solids, createWorld(new THREE.Scene()).collision.solids);
});
test('duck landing animation retains rooftop altitude', () => {
  const duck = createDuck(); duck.setFlying(true); duck.setAltitude(28.3);
  duck.setFlying(false); duck.update(1 / 60, false);
  assert.equal(duck.getAltitude(), 28.3);
  assert.ok(duck.root.position.y > 28);
});
