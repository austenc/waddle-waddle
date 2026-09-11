/** Input adapter; simulation receives the same normalized input on all devices. */
export function createControls() {
  const keys = new Set();
  let touchX = 0, touchZ = 0, touchHonk = false, touchJump = false, touchGlide = false;
  let honkPending = false, jumpPending = false, pendingRoll = 0;
  let touchBoost = false, touchDive = false;
  const taps = { left: -Infinity, right: -Infinity };
  const codes = new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD','ShiftLeft','ShiftRight','KeyQ','KeyE']);
  function onDown(e) {
    if (e.target instanceof HTMLElement && (e.target.matches('input, textarea, select') || e.target.closest('dialog') || e.target.isContentEditable)) return;
    if (codes.has(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.repeat) return;
    if (e.code === 'Space') jumpPending = true;
    if (e.code === 'KeyH') honkPending = true;
    const side = ['KeyA', 'ArrowLeft'].includes(e.code) ? 'left' : ['KeyD', 'ArrowRight'].includes(e.code) ? 'right' : null;
    if (side) { const now = performance.now(); if (now - taps[side] < 260) pendingRoll = side === 'left' ? -1 : 1; taps[side] = now; }
  }
  const onUp = e => keys.delete(e.code);
  function clear() {
    keys.clear(); touchX = touchZ = 0; touchHonk = touchJump = touchGlide = touchBoost = touchDive = false;
    honkPending = jumpPending = false; pendingRoll = 0; taps.left = taps.right = -Infinity;
  }
  window.addEventListener('keydown', onDown); window.addEventListener('keyup', onUp); window.addEventListener('blur', clear);
  return {
    keys, clear,
    isDown: code => keys.has(code),
    dispose() { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); window.removeEventListener('blur', clear); },
    setTouchMove(x, z) { const length = Math.max(1, Math.hypot(x, z)); touchX = x / length; touchZ = z / length; },
    clearTouchMove() { touchX = touchZ = 0; },
    setTouchHonk(on) { if (on && !touchHonk) honkPending = true; touchHonk = on; },
    requestTouchJump() { jumpPending = true; touchJump = true; },
    setTouchGlide(on) { touchGlide = on; if (!on) touchJump = false; },
    setTouchBoost(on) { touchBoost = on; },
    setTouchDive(on) { touchDive = on; },
    requestTouchBarrelRoll(dir) { pendingRoll = dir; },
    consumeHonk() { const value = honkPending; honkPending = false; return value; },
    read() {
      let x = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      let z = (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0);
      if (Math.hypot(touchX, touchZ) > 0.08) { x = touchX; z = touchZ; }
      const length = Math.max(1, Math.hypot(x, z));
      const input = { x: x / length, z: z / length, jump: keys.has('Space') || touchJump || touchGlide, jumpPressed: jumpPending, boost: keys.has('ShiftLeft') || keys.has('ShiftRight') || touchBoost, dive: keys.has('KeyC') || touchDive, roll: pendingRoll };
      jumpPending = false; pendingRoll = 0; return input;
    },
  };
}
