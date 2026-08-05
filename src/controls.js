/** Keyboard + on-screen touch controls for waddle, jump/fly, and honk. */
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
  let touchPitch = 0;
  let touchRudder = 0;
  let touchFlightActive = false;
  let honkHeld = false;
  let jumpHeld = false;
  let landHeld = false;

  /** Double-tap A/D → Star Fox barrel roll */
  const DOUBLE_TAP_MS = 260;
  let lastTapA = 0;
  let lastTapD = 0;
  let pendingRoll = 0; // -1 left, +1 right

  const onDown = (e) => {
    // Ignore OS key-repeat so holding A/D to bank doesn't spam rolls
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
        'KeyE',
        'KeyQ',
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
        touchPitch = 0;
        touchFlightActive = false;
        return;
      }
      const inv = 1 / Math.max(len, 1);
      touchX = x * inv;
      touchZ = z * inv;
      touchActive = true;
      // While flying the stick is bank (x) + pitch (y): up on stick = climb
      touchBank = touchX;
      touchPitch = -touchZ;
      touchFlightActive = true;
    },

    clearTouchMove() {
      touchX = 0;
      touchZ = 0;
      touchActive = false;
      touchBank = 0;
      touchPitch = 0;
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

    /** Ground / hop movement (camera-relative WASD). */
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
     * Flight inputs: constant forward is handled in main.
     * bank -1..1 (A/D), pitch -1..1 (W up / S down), rudder -1..1 (Q/E).
     */
    getFlightAxes() {
      let bank = 0;
      let pitch = 0;
      let rudder = 0;

      if (keys.has('KeyA') || keys.has('ArrowLeft')) bank -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) bank += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) pitch += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) pitch -= 1;
      if (keys.has('KeyQ')) rudder -= 1;
      if (keys.has('KeyE')) rudder += 1;

      if (touchFlightActive) {
        bank = touchBank;
        pitch = touchPitch;
      }
      rudder += touchRudder;

      bank = Math.max(-1, Math.min(1, bank));
      pitch = Math.max(-1, Math.min(1, pitch));
      rudder = Math.max(-1, Math.min(1, rudder));

      return { bank, pitch, rudder };
    },

    isGliding() {
      return keys.has('Space') || touchGlide;
    },

    /** Call each frame while flying so Space-as-glide doesn't eat the next hop. */
    syncJumpLatch() {
      jumpHeld = keys.has('Space') || touchGlide;
    },

    /** Space / JUMP — hop & double-jump only (not used as edge while gliding in air). */
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

    /** -1 left roll, +1 right roll, 0 none. Double-tap A/D or touch roll pads. */
    consumeBarrelRoll() {
      const dir = pendingRoll;
      pendingRoll = 0;
      return dir;
    },

    /** H or Left Shift. */
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
