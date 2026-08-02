/**
 * On-screen joystick (left) + HONK button (right) for phones / touch.
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
    <button type="button" class="honk-pad" id="honk-pad" aria-label="Honk">
      <span class="honk-pad-label">HONK</span>
    </button>
  `;
  document.body.appendChild(root);

  const joy = root.querySelector('#joy');
  const knob = root.querySelector('#joy-knob');
  const honkPad = root.querySelector('#honk-pad');

  const MAX = 46; // knob travel in px
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
      knob.style.transform = 'translate(-50%, -50%)';
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
    // Screen up = forward = keyboard W = z -1
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
  });

  const stopHonk = () => {
    honkPad.classList.remove('is-held');
    controls.setTouchHonk(false);
  };
  honkPad.addEventListener('pointerup', stopHonk);
  honkPad.addEventListener('pointercancel', stopHonk);
  honkPad.addEventListener('pointerleave', stopHonk);

  // Block page scroll / pinch while touching pads
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
    isTouchDevice,
  };
}
