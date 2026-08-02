/**
 * Short staccato mallard honk for the Space keybind.
 * Trimmed from XC62258 (Jonathon Jongsma, CC BY-SA 3.0).
 *
 * Full multi-quack recording kept at /audio/annoy-quack.mp3
 * for a later "peck / annoy" mechanic — not wired yet.
 */
export function createHonk(src = '/audio/honk.mp3') {
  const base = new Audio(src);
  base.preload = 'auto';

  return {
    /** Unlock audio on a user gesture (autoplay policy). */
    unlock() {
      const prev = base.volume;
      base.volume = 0;
      const p = base.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          base.pause();
          base.currentTime = 0;
          base.volume = prev || 1;
        }).catch(() => {
          base.volume = prev || 1;
        });
      } else {
        base.pause();
        base.currentTime = 0;
        base.volume = prev || 1;
      }
    },

    play() {
      const a = base.cloneNode();
      a.volume = 0.95;
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    },
  };
}
