// Simulation owns physical state; rendering and input devices adapt to it.
export function createPlayer(collision, isWater, initial = { x: 20, y: 0, z: 7, yaw: -Math.PI / 2 }) {
  const state = { ...initial, mode: 'ground', vx: 0, vz: 0, vy: 0, speed: 0, stamina: 1, bank: 0, climb: 0, roll: 0, rollTime: 0 };
  let heldJump = 0, jumpWasHeld = false, coyote = 0.12, landingBrake = false;
  const approach = (v, to, rate, dt) => v + (to - v) * (1 - Math.exp(-rate * dt));
  const turn = (a, b, blend) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * blend;
  function reset(position = initial) {
    Object.assign(state, position, { mode: 'ground', vx: 0, vz: 0, vy: 0, speed: 0, stamina: 1, bank: 0, climb: 0, roll: 0, rollTime: 0 });
    heldJump = 0; jumpWasHeld = false; coyote = 0.12; landingBrake = false;
  }
  function update(dt, input, cameraYaw) {
    const events = [];
    if (input.z <= 0.2) landingBrake = false;
    const grounded = state.mode === 'ground' || state.mode === 'swim';
    coyote = grounded ? 0.12 : Math.max(0, coyote - dt);
    const pressed = input.jumpPressed || (input.jump && !jumpWasHeld);
    heldJump = input.jump ? heldJump + dt : 0;
    jumpWasHeld = !!input.jump;
    if (pressed && state.mode !== 'fly') {
      if (grounded || coyote > 0) { state.vy = 7.5; state.mode = 'hop'; coyote = 0; events.push('jump'); }
      else takeoff();
    }
    // A single held button is enough to take flight; double-tap still works.
    if (heldJump > 0.24 && state.mode === 'hop' && state.vy > 0) takeoff();
    function takeoff() {
      state.mode = 'fly'; state.speed = Math.max(6, Math.hypot(state.vx, state.vz)); state.vy = 2;
      events.push('takeoff');
    }
    const oldY = state.y;
    if (state.mode === 'fly') {
      const boosting = input.boost && state.stamina > 0.05;
      const targetSpeed = input.z > 0.2 ? 1.4 : boosting ? 25 : input.z < -0.2 ? 15 : 10;
      state.speed = approach(state.speed, targetSpeed, input.z > 0.2 ? 6 : 2.5, dt);
      state.stamina = Math.max(0, Math.min(1, state.stamina + (boosting ? -0.3 : 0.18) * dt));
      state.bank = approach(state.bank, -input.x, 7, dt);
      state.yaw += -input.x * (1.35 + (1 - state.speed / 25) * 0.65) * dt;
      const lift = input.dive ? -7 : input.jump ? 7.5 : input.z > 0.2 ? -3.6 : -1.15;
      state.vy = approach(state.vy, lift, 4.5, dt);
      if (input.roll && state.rollTime <= 0 && state.stamina > 0.2) {
        state.roll = -Math.sign(input.roll); state.rollTime = 0.55; state.stamina -= 0.18; events.push('roll');
      }
      state.rollTime = Math.max(0, state.rollTime - dt);
      const side = state.rollTime > 0 ? state.roll * 9 : 0;
      state.vx = Math.sin(state.yaw) * state.speed + Math.cos(state.yaw) * side;
      state.vz = Math.cos(state.yaw) * state.speed - Math.sin(state.yaw) * side;
    } else {
      const speed = state.mode === 'swim' ? 5.2 : input.boost ? 9 : 6.5;
      // Braking should settle on a roof, not become backward walking at touchdown.
      const moveZ = landingBrake ? 0 : input.z;
      const mx = Math.sin(cameraYaw) * -moveZ - Math.cos(cameraYaw) * input.x;
      const mz = Math.cos(cameraYaw) * -moveZ + Math.sin(cameraYaw) * input.x;
      const magnitude = Math.min(1, Math.hypot(mx, mz));
      const response = state.mode === 'swim' ? 4 : state.mode === 'hop' ? 5 : 15;
      state.vx = approach(state.vx, mx * speed, response, dt);
      state.vz = approach(state.vz, mz * speed, response, dt);
      if (magnitude > 0.05) state.yaw = turn(state.yaw, Math.atan2(mx, mz), 1 - Math.exp(-14 * dt));
      state.speed = Math.hypot(state.vx, state.vz);
      state.bank = approach(state.bank, 0, 10, dt);
      state.stamina = Math.min(1, state.stamina + dt * 0.28);
      if (state.mode === 'hop') state.vy -= 22 * dt;
    }
    const moved = collision.move(state, state.vx * dt, state.vz * dt, oldY);
    const actualDistance = Math.hypot(moved.x - state.x, moved.z - state.z);
    const expectedDistance = Math.hypot(state.vx, state.vz) * dt;
    state.x = moved.x; state.z = moved.z;
    if (state.mode === 'fly' && expectedDistance > 0.05 && actualDistance < expectedDistance * 0.25) {
      state.speed *= Math.exp(-8 * dt);
    }
    if (state.mode === 'ground' || state.mode === 'swim') {
      const floor = collision.surface(state.x, state.z, oldY + 0.32);
      if (oldY - floor > 0.4) { state.mode = 'hop'; state.vy = 0; }
      else state.y = floor;
    }
    if (state.mode === 'hop' || state.mode === 'fly') {
      const targetY = Math.min(65, oldY + state.vy * dt);
      const vertical = collision.vertical(state.x, state.z, oldY, targetY);
      state.y = vertical.y;
      if (state.y >= 65) state.vy = Math.min(0, state.vy);
      if (vertical.landed) {
        events.push(isWater(state.x, state.z) && state.y < 0 ? 'splash' : 'land');
        landingBrake = state.mode === 'fly' && input.z > 0.2;
        if (landingBrake) { state.vx = 0; state.vz = 0; state.speed = 0; }
        state.mode = 'ground'; state.vy = 0; state.rollTime = 0;
      } else if (vertical.y < targetY - 0.001) state.vy = Math.min(state.vy, 0);
    }
    if (state.mode === 'ground' || state.mode === 'swim') {
      const next = isWater(state.x, state.z) && state.y < 0 ? 'swim' : 'ground';
      if (next !== state.mode && next === 'swim') events.push('splash');
      state.mode = next;
    }
    state.climb = state.vy;
    return events;
  }
  return { state, update, reset };
}
