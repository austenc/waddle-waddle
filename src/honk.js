/**
 * Short staccato mallard honk for the Space keybind.
 * Trimmed from XC62258 (Jonathon Jongsma, CC BY-SA 3.0).
 *
 * Uses Web Audio so iOS Safari can play after a user gesture.
 * Full multi-quack recording kept at public/audio/annoy-quack.mp3
 * for a later "peck / annoy" mechanic — not wired yet.
 */
export function createHonk(src = `${import.meta.env.BASE_URL}audio/honk.mp3`) {
  let ctx = null;
  let buffer = null;
  let loading = null;
  let unlocked = false;

  // HTMLAudio fallback / secondary unlock path for stubborn WebKit
  const element = new Audio(src);
  element.preload = 'auto';
  element.setAttribute('playsinline', '');
  element.playsInline = true;

  function ensureContext() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    return ctx;
  }

  async function loadBuffer(audio) {
    if (buffer) return buffer;
    if (loading) return loading;
    loading = fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`Honk fetch failed: ${r.status}`);
        return r.arrayBuffer();
      })
      .then((data) => audio.decodeAudioData(data.slice(0)))
      .then((decoded) => {
        buffer = decoded;
        return buffer;
      })
      .catch((err) => {
        loading = null;
        console.warn('Honk buffer load failed', err);
        return null;
      });
    return loading;
  }

  async function unlock() {
    const audio = ensureContext();
    if (audio && audio.state === 'suspended') {
      try {
        await audio.resume();
      } catch {
        /* ignore */
      }
    }

    // Kick HTMLAudio inside the gesture (required on some iOS versions)
    try {
      element.muted = true;
      element.currentTime = 0;
      await element.play();
      element.pause();
      element.currentTime = 0;
      element.muted = false;
    } catch {
      element.muted = false;
    }

    if (audio) await loadBuffer(audio);
    unlocked = true;
  }

  function playViaElement() {
    try {
      element.pause();
      element.currentTime = 0;
      element.volume = 0.95;
      const p = element.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {
      /* ignore */
    }
  }

  function playViaBuffer() {
    if (!ctx || !buffer) return false;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.95;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
    return true;
  }

  return {
    unlock() {
      return unlock();
    },

    play() {
      // If somehow locked (e.g. Start didn't unlock), try again on this gesture
      if (!unlocked) {
        unlock().then(() => {
          if (!playViaBuffer()) playViaElement();
        });
        return;
      }

      if (ctx && ctx.state === 'suspended') {
        ctx.resume().then(() => {
          if (!playViaBuffer()) playViaElement();
        }).catch(() => playViaElement());
        return;
      }

      if (!playViaBuffer()) playViaElement();
    },
  };
}
