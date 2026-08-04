/** Keyboard + on-screen touch controls for waddle, jump/fly, and honk. */
export function createControls() {
  const keys = new Set();
  let touchX = 0;
  let touchZ = 0;
  let touchActive = false;
  let touchHonkDown = false;
  let touchJump = false;
  let touchLand = false;
  let touchAscend = false;
  let touchDescend = false;
  let touchBarrelRoll = false;
  let honkHeld = false;
  let jumpHeld = false;
  let landHeld = false;
  let barrelHeld = false;

  const onDown = (e) => {
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

    requestTouchJump() {
      touchJump = true;
    },

    requestTouchLand() {
      touchLand = true;
    },

    setTouchAscend(down) {
      touchAscend = down;
    },

    setTouchDescend(down) {
      touchDescend = down;
    },

    requestTouchBarrelRoll() {
      touchBarrelRoll = true;
    },

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

    /** +1 ascend, -1 descend. Left Shift is honk — Right Shift still descends. */
    getVertical() {
      let v = 0;
      if (keys.has('KeyE') || touchAscend) v += 1;
      if (keys.has('KeyQ') || keys.has('ShiftRight') || touchDescend) v -= 1;
      return Math.max(-1, Math.min(1, v));
    },

    /** Space / JUMP pad — hop, double-jump to fly, or roll while flying (handled by caller). */
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
      const pressed = touchBarrelRoll;
      touchBarrelRoll = false;
      if (pressed) {
        if (!barrelHeld) {
          barrelHeld = true;
          return true;
        }
        return false;
      }
      barrelHeld = false;
      return false;
    },

    /** H or Left Shift (Space is jump). */
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
