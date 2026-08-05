/** Keyboard + on-screen touch controls for waddle, flight, and honk. */
export function createControls() {
  const keys = new Set();
  let touchX = 0;
  let touchZ = 0;
  let touchActive = false;
  let touchHonkDown = false;
  let touchJump = false;
  let touchLand = false;
  let touchGlide = false;
  let touchBank = 0;
  let touchThrottle = 0;
  let touchRudder = 0;
  let touchFlightActive = false;
  let honkHeld = false;
  let jumpHeld = false;
  let landHeld = false;

  /** Double-tap A/D → barrel roll */
  const DOUBLE_TAP_MS = 260;
  let lastTapA = 0;
  let lastTapD = 0;
  let pendingRoll = 0; // -1 left, +1 right

  const onDown = (e) => {
    if (!e.repeat) {
      const now = performance.now();
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        if (now - lastTapA < DOUBLE_TAP_MS) pendingRoll = -1;
        lastTapA = now;
      }
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        if (now - lastTapD < DOUBLE_TAP_MS) pendingRoll = 1;
        lastTapD = now;
      }
    }

    keys.add(e.code);
    if (
      [
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Space',
        'KeyW',
        'KeyA',
        'KeyS',
        'KeyD',
        'KeyE',
        'KeyQ',
        'KeyF',
        'ShiftLeft',
        'ShiftRight',
      ].includes(e.code)
    ) {
      e.preventDefault();
    }
  };
  const onUp = (e) => keys.delete(e.code);

  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);

  return {
    keys,
    dispose() {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    },
    isDown(code) {
      return keys.has(code);
    },

    setTouchMove(x, z) {
      const len = Math.hypot(x, z);
      if (len < 0.12) {
        touchX = 0;
        touchZ = 0;
        touchActive = false;
        touchBank = 0;
        touchThrottle = 0;
        touchFlightActive = false;
        return;
      }
      const inv = 1 / Math.max(len, 1);
      touchX = x * inv;
      touchZ = z * inv;
      touchActive = true;
      // Flight stick: X = bank, up = throttle
      touchBank = touchX;
      touchThrottle = -touchZ;
      touchFlightActive = true;
    },

    clearTouchMove() {
      touchX = 0;
      touchZ = 0;
      touchActive = false;
      touchBank = 0;
      touchThrottle = 0;
      touchFlightActive = false;
    },

    setTouchHonk(down) {
      touchHonkDown = down;
    },

    requestTouchJump() {
      touchJump = true;
    },

    requestTouchLand() {
      touchLand = true;
    },

    setTouchGlide(down) {
      touchGlide = down;
    },

    setTouchRudder(v) {
      touchRudder = Math.max(-1, Math.min(1, v));
    },

    requestTouchBarrelRoll(dir = 1) {
      pendingRoll = dir >= 0 ? 1 : -1;
    },

    /** Ground / hop: camera-relative WASD. */
    getMoveVector() {
      let x = 0;
      let z = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) z -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;

      if (touchActive) {
        x = touchX;
        z = touchZ;
      }

      const len = Math.hypot(x, z);
      if (len > 0) {
        x /= len;
        z /= len;
      }
      return { x, z, moving: len > 0 };
    },

    /**
     * Flight: bank (A/D), throttle (W/S), rudder (Q/E).
     * W = +throttle (thrust forward). S = −throttle (brake).
     */
    getFlightAxes() {
      let bank = 0;
      let throttle = 0;
      let rudder = 0;

      if (keys.has('KeyA') || keys.has('ArrowLeft')) bank -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) bank += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) throttle += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) throttle -= 1;
      if (keys.has('KeyQ')) rudder -= 1;
      if (keys.has('KeyE')) rudder += 1;

      if (touchFlightActive) {
        bank = touchBank;
        throttle = touchThrottle;
      }
      rudder += touchRudder;

      return {
        bank: Math.max(-1, Math.min(1, bank)),
        throttle: Math.max(-1, Math.min(1, throttle)),
        rudder: Math.max(-1, Math.min(1, rudder)),
      };
    },

    isGliding() {
      return keys.has('Space') || touchGlide;
    },

    syncJumpLatch() {
      jumpHeld = keys.has('Space') || touchGlide;
    },

    consumeJump() {
      const pressed = keys.has('Space') || touchJump;
      touchJump = false;
      if (pressed) {
        if (!jumpHeld) {
          jumpHeld = true;
          return true;
        }
        return false;
      }
      jumpHeld = keys.has('Space');
      return false;
    },

    consumeLand() {
      const pressed = touchLand || keys.has('KeyF');
      touchLand = false;
      if (pressed) {
        if (!landHeld) {
          landHeld = true;
          return true;
        }
        return false;
      }
      landHeld = keys.has('KeyF');
      return false;
    },

    consumeBarrelRoll() {
      const dir = pendingRoll;
      pendingRoll = 0;
      return dir;
    },

    consumeHonk() {
      const pressed = keys.has('KeyH') || keys.has('ShiftLeft') || touchHonkDown;
      if (pressed) {
        if (!honkHeld) {
          honkHeld = true;
          return true;
        }
        return false;
      }
      honkHeld = false;
      return false;
    },
  };
}
