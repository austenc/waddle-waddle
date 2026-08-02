/** Simple keyboard state for waddle + honk. */
export function createControls() {
  const keys = new Set();

  const onDown = (e) => {
    keys.add(e.code);
    // Prevent page scroll on arrows/space once game has focus
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
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
    /** Normalized move vector in XZ (x right, z forward on keyboard up) */
    getMoveVector() {
      let x = 0;
      let z = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) z -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      const len = Math.hypot(x, z);
      if (len > 0) {
        x /= len;
        z /= len;
      }
      return { x, z, moving: len > 0 };
    },
    consumeHonk() {
      if (keys.has('Space') || keys.has('KeyH')) {
        // Edge-trigger: clear until release so one press = one honk
        if (!this._honkHeld) {
          this._honkHeld = true;
          return true;
        }
        return false;
      }
      this._honkHeld = false;
      return false;
    },
    _honkHeld: false,
  };
}
