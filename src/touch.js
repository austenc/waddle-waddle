/**
 * On-screen joystick + JUMP / glide / bank rolls + HONK for phones.
 */
export function createTouchControls(controls) {
  const root = document.createElement('div');
  root.id = 'touch-controls';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <div class="joy" id="joy">
      <div class="joy-base" aria-hidden="true"></div>
      <div class="joy-knob" id="joy-knob"></div>
    </div>
    <div class="touch-actions">
      <div class="fly-stack is-grounded" id="fly-stack">
        <button type="button" class="fly-pad" id="jump-pad" aria-label="Jump or glide">
          <span class="fly-pad-label">JUMP</span>
        </button>
        <div class="roll-row">
          <button type="button" class="roll-pad" id="roll-left" aria-label="Barrel roll left">◀</button>
          <button type="button" class="roll-pad" id="roll-right" aria-label="Barrel roll right">▶</button>
        </div>
      </div>
      <button type="button" class="honk-pad" id="honk-pad" aria-label="Honk">
        <span class="honk-pad-label">HONK</span>
      </button>
    </div>
  `;
  document.body.appendChild(root);

  const joy = root.querySelector('#joy');
  const knob = root.querySelector('#joy-knob');
  const honkPad = root.querySelector('#honk-pad');
  const jumpPad = root.querySelector('#jump-pad');
  const rollLeft = root.querySelector('#roll-left');
  const rollRight = root.querySelector('#roll-right');
  const flyStack = root.querySelector('#fly-stack');

  const MAX = 46;
  let joyPointerId = null;

  function isTouchDevice() {
    return (
      window.matchMedia('(pointer: coarse)').matches ||
      window.matchMedia('(hover: none)').matches ||
      navigator.maxTouchPoints > 0
    );
  }

  function setActive(on) {
    if (on && isTouchDevice()) {
      root.classList.add('is-active');
      root.setAttribute('aria-hidden', 'false');
    } else {
      root.classList.remove('is-active');
      root.setAttribute('aria-hidden', 'true');
      controls.clearTouchMove();
      controls.setTouchHonk(false);
      controls.setTouchGlide(false);
      knob.style.transform = 'translate(-50%, -50%)';
    }
  }

  function setFlying(flying) {
    flyStack.classList.toggle('is-flying', flying);
    flyStack.classList.toggle('is-grounded', !flying);
    jumpPad.querySelector('.fly-pad-label').textContent = flying ? 'GLIDE' : 'JUMP';
    if (!flying) controls.setTouchGlide(false);
  }

  function readJoy(clientX, clientY) {
    const rect = joy.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const len = Math.hypot(dx, dy);
    if (len > MAX) {
      dx = (dx / len) * MAX;
      dy = (dy / len) * MAX;
    }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    controls.setTouchMove(dx / MAX, dy / MAX);
  }

  function endJoy() {
    joyPointerId = null;
    knob.style.transform = 'translate(-50%, -50%)';
    controls.clearTouchMove();
  }

  joy.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    joy.setPointerCapture(e.pointerId);
    joyPointerId = e.pointerId;
    joy.classList.add('is-held');
    readJoy(e.clientX, e.clientY);
  });

  joy.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joyPointerId) return;
    e.preventDefault();
    readJoy(e.clientX, e.clientY);
  });

  const stopJoy = (e) => {
    if (joyPointerId != null && e.pointerId !== joyPointerId) return;
    joy.classList.remove('is-held');
    endJoy();
  };
  joy.addEventListener('pointerup', stopJoy);
  joy.addEventListener('pointercancel', stopJoy);

  honkPad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    honkPad.setPointerCapture(e.pointerId);
    honkPad.classList.add('is-held');
    controls.setTouchHonk(true);
    if (typeof controls.onHonkGesture === 'function') controls.onHonkGesture();
  });

  const stopHonk = () => {
    honkPad.classList.remove('is-held');
    controls.setTouchHonk(false);
  };
  honkPad.addEventListener('pointerup', stopHonk);
  honkPad.addEventListener('pointercancel', stopHonk);
  honkPad.addEventListener('pointerleave', stopHonk);

  // Ground: tap JUMP. Air: hold GLIDE.
  jumpPad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    jumpPad.setPointerCapture(e.pointerId);
    jumpPad.classList.add('is-held');
    if (flyStack.classList.contains('is-flying')) {
      controls.setTouchGlide(true);
    } else {
      controls.requestTouchJump();
    }
  });
  const stopJump = () => {
    jumpPad.classList.remove('is-held');
    controls.setTouchGlide(false);
  };
  jumpPad.addEventListener('pointerup', stopJump);
  jumpPad.addEventListener('pointercancel', stopJump);

  function bindRoll(el, dir) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-held');
      controls.requestTouchBarrelRoll(dir);
    });
    const stop = () => el.classList.remove('is-held');
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
  }
  bindRoll(rollLeft, -1);
  bindRoll(rollRight, 1);

  root.addEventListener(
    'touchmove',
    (e) => {
      e.preventDefault();
    },
    { passive: false },
  );

  return {
    root,
    setActive,
    setFlying,
    isTouchDevice,
  };
}
