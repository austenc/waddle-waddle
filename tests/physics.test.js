import test from 'node:test';
import assert from 'node:assert/strict';
import { createCollisionWorld } from '../src/physics.js';
const building = { x: 0, z: 0, w: 10, d: 10, bottom: 0, top: 12 };
const bridge = { x: 20, z: 0, w: 8, d: 4, bottom: 1, top: 1.6 };
const physics = createCollisionWorld([building, bridge], (x) => x > 14, 100);
test('fast flight cannot tunnel through a building', () => {
  const p = physics.move({ x: -20, z: 0 }, 40, 0, 5);
  assert.ok(p.x < -5.4);
});
test('diagonal motion slides along a wall', () => {
  const p = physics.move({ x: -6, z: 0 }, 3, 3, 0);
  assert.ok(p.x < -5.4); assert.ok(p.z > 2.9);
});
test('flight above roofs is unobstructed', () => {
  assert.ok(physics.move({ x: -20, z: 0 }, 40, 0, 14).x > 19.9);
});
test('descent lands on rooftop and keeps its elevation', () => {
  assert.deepEqual(physics.vertical(0, 0, 14, 10), { y: 12, landed: true });
  assert.equal(physics.surface(0, 0, 12), 12);
});
test('walking off roof exposes ground below', () => {
  assert.equal(physics.surface(6, 0, 12), 0);
  assert.deepEqual(physics.vertical(6, 0, 12, 11), { y: 11, landed: false });
});
test('cannot teleport from below a roof onto it', () => {
  assert.equal(physics.surface(0, 0, 2), 0);
});
test('water supports swimming below deck while bridge supports landing', () => {
  assert.equal(physics.surface(20, 0, 0), -0.27);
  assert.deepEqual(physics.vertical(20, 0, 4, 1), { y: 1.6, landed: true });
});
test('ascending into bridge underside stops at head clearance', () => {
  assert.deepEqual(physics.vertical(20, 0, -0.5, 0.5), { y: -0.3500000000000001, landed: false });
});
test('world edge clamps large movement', () => {
  assert.ok(physics.move({ x: -90, z: 20 }, -50, 0, 0).x >= -100);
});
