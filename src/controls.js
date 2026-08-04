/** Keyboard + on-screen touch controls for waddle, fly, and honk. */
export function createControls() {
  const keys = new Set();
  let touchX = 0;
  let touchZ = 0;
  let touchActive = false;
  let touchHonkDown = false;
  let touchFlyToggle = false;
  let touchAscend = false;
  let touchDescend = false;
  let honkHeld = false;
  let flyToggleHeld = false;

  const onDown = (e) => {
    keys.add(e.code);
    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyF', 'KeyE', 'KeyQ'].includes(
        e.code,
      )
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

    /** Virtual stick: x right, z forward on screen-up (matches WASD: W => z=-1). */
    setTouchMove(x, z) {
      const len = Math.hypot(x, z);
      if (len < 0.12) {
        touchX = 0;
        touchZ = 0;
        touchActive = false;
        return;
      }
      const inv = 1 / Math.max(len, 1);
      touchX = x * inv;
      touchZ = z * inv;
      touchActive = true;
    },

    clearTouchMove() {
      touchX = 0;
      touchZ = 0;
      touchActive = false;
    },

    setTouchHonk(down) {
      touchHonkDown = down;
    },

    /** Edge-trigger request from the FLY pad. */
    requestTouchFlyToggle() {
      touchFlyToggle = true;
    },

    setTouchAscend(down) {
      touchAscend = down;
    },

    setTouchDescend(down) {
      touchDescend = down;
    },

    /** Normalized move vector in XZ (x right, z: W=-1). */
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

    /** +1 ascend, -1 descend, 0 none */
    getVertical() {
      let v = 0;
      if (keys.has('KeyE') || keys.has('Space') || touchAscend) v += 1;
      if (keys.has('KeyQ') || keys.has('ShiftLeft') || keys.has('ShiftRight') || touchDescend) {
        v -= 1;
      }
      return Math.max(-1, Math.min(1, v));
    },

    consumeFlyToggle() {
      const pressed = keys.has('KeyF') || touchFlyToggle;
      touchFlyToggle = false;
      if (pressed) {
        if (!flyToggleHeld) {
          flyToggleHeld = true;
          return true;
        }
        return false;
      }
      flyToggleHeld = keys.has('KeyF');
      return false;
    },

    consumeHonk() {
      // In air, Space is reserved for climb — H / HONK pad still quack
      const pressed = keys.has('KeyH') || touchHonkDown || keys.has('Space');
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

    /** Honk while flying ignores Space (used to climb). */
    consumeHonkFlying() {
      const pressed = keys.has('KeyH') || touchHonkDown;
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
