/**
 * On-screen joystick + HONK + FLY / UP / DOWN for phones.
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
        <button type="button" class="alt-pad" id="ascend-pad" aria-label="Fly up">UP</button>
        <button type="button" class="fly-pad" id="fly-pad" aria-label="Toggle fly">
          <span class="fly-pad-label">FLY</span>
        </button>
        <button type="button" class="alt-pad" id="descend-pad" aria-label="Fly down">DN</button>
        <button type="button" class="roll-pad" id="roll-pad" aria-label="Barrel roll">ROLL</button>
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
  const flyPad = root.querySelector('#fly-pad');
  const ascendPad = root.querySelector('#ascend-pad');
  const descendPad = root.querySelector('#descend-pad');
  const rollPad = root.querySelector('#roll-pad');
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
      controls.setTouchAscend(false);
      controls.setTouchDescend(false);
      knob.style.transform = 'translate(-50%, -50%)';
    }
  }

  function setFlying(flying) {
    flyStack.classList.toggle('is-flying', flying);
    flyStack.classList.toggle('is-grounded', !flying);
    flyPad.classList.toggle('is-on', flying);
    flyPad.querySelector('.fly-pad-label').textContent = flying ? 'LAND' : 'FLY';
    if (!flying) {
      controls.setTouchAscend(false);
      controls.setTouchDescend(false);
      ascendPad.classList.remove('is-held');
      descendPad.classList.remove('is-held');
    }
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

  flyPad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    flyPad.setPointerCapture(e.pointerId);
    flyPad.classList.add('is-held');
    controls.requestTouchFlyToggle();
  });
  const stopFlyPad = () => flyPad.classList.remove('is-held');
  flyPad.addEventListener('pointerup', stopFlyPad);
  flyPad.addEventListener('pointercancel', stopFlyPad);

  function bindHoldPad(el, setDown) {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-held');
      setDown(true);
    });
    const stop = () => {
      el.classList.remove('is-held');
      setDown(false);
    };
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
    el.addEventListener('pointerleave', stop);
  }

  bindHoldPad(ascendPad, (d) => controls.setTouchAscend(d));
  bindHoldPad(descendPad, (d) => controls.setTouchDescend(d));

  rollPad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    rollPad.setPointerCapture(e.pointerId);
    rollPad.classList.add('is-held');
    controls.requestTouchBarrelRoll();
  });
  const stopRoll = () => rollPad.classList.remove('is-held');
  rollPad.addEventListener('pointerup', stopRoll);
  rollPad.addEventListener('pointercancel', stopRoll);

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
