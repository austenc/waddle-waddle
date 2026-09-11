/** Procedural audio. Call unlock() directly from a click/key/touch gesture.
 * dt is seconds; speed is world units/second (roughly 0–19).
 * Importing/creating this controller installs no listeners and creates no audio.
 */
export function createAudio() {
  let context, master, wind, water, noise;
  let muted = false, paused = false, disposed = false, unlocked = false;
  let transition = null;
  let motion = 0, wet = 0, phase = 0;
  let music = true, musicClock = 0, musicBeat = 0;
  const beds = [], voices = new Set(), lastCue = new Map();
  const clamp = (n, max = 1) => Math.max(0, Math.min(max, Number.isFinite(n) ? n : 0));
  const smooth = (param, value, seconds = 0.15) => {
    param.setTargetAtTime(value, context.currentTime, seconds);
  };

  function clearVoices() {
    for (const voice of voices) {
      voice.source.onended = null;
      try { voice.source.stop(); } catch { /* Already stopped. */ }
      for (const node of voice.nodes) node.disconnect();
    }
    voices.clear();
  }

  function build() {
    master = context.createGain();
    master.gain.value = muted || paused ? 0 : 0.55;
    master.connect(context.destination);
    // Smooth the loop boundary so the noise bed has no repeating click.
    noise = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const data = noise.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      brown = (brown + (Math.random() * 2 - 1) * 0.045) / 1.025;
      const edge = Math.min(1, i / 512, (data.length - 1 - i) / 512);
      data[i] = brown * 3.5 * edge;
    }
    function bed(frequency, type, offset) {
      const source = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const gain = context.createGain();
      beds.push(source, filter, gain);
      source.buffer = noise; source.loop = true;
      filter.type = type; filter.frequency.value = frequency; filter.Q.value = 0.45;
      gain.gain.value = 0;
      source.connect(filter); filter.connect(gain); gain.connect(master);
      source.start(0, offset);
      return { filter, gain };
    }
    wind = bed(420, 'lowpass', 0);
    water = bed(850, 'bandpass', 1.3);
    smooth(wind.gain.gain, 0.035, 0.6);
  }

  // Reconcile the latest intent after any pending browser suspend/resume.
  // Calling resume synchronously here preserves the unlock gesture on WebKit.
  function syncState() {
    if (!context || disposed || !unlocked) return Promise.resolve(false);
    if (transition) return transition;
    const shouldRun = !paused;
    if (context.state === 'closed') return Promise.resolve(false);
    if (shouldRun && context.state === 'running') return Promise.resolve(true);
    if (!shouldRun && context.state === 'suspended') return Promise.resolve(false);
    try {
      const operation = shouldRun ? context.resume() : context.suspend();
      transition = Promise.resolve(operation).then(() => {
        transition = null;
        if (disposed) return false;
        if (shouldRun !== !paused) return syncState();
        return context.state === 'running';
      }, () => { transition = null; return false; });
      return transition;
    } catch { return Promise.resolve(false); }
  }

  function unlock() {
    if (disposed) return Promise.resolve(false);
    if (!context) {
      const AudioContext = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContext) return Promise.resolve(false);
      // Where supported, reject calls made before any real user interaction.
      if (globalThis.navigator?.userActivation?.hasBeenActive === false) return Promise.resolve(false);
      try { context = new AudioContext(); build(); }
      catch {
        for (const node of beds.splice(0)) { try { node.disconnect(); } catch { /* Partial setup. */ } }
        try { Promise.resolve(context?.close()).catch(() => {}); } catch { /* Unavailable. */ }
        context = master = wind = water = noise = undefined;
        return Promise.resolve(false);
      }
    }
    unlocked = true;
    return syncState();
  }

  function voice(frequency, delay, duration, volume, type = 'sine', endFrequency = frequency) {
    if (voices.size >= 32) return;
    const source = context.createOscillator(), gain = context.createGain();
    const time = context.currentTime + delay;
    source.type = type;
    source.frequency.setValueAtTime(frequency, time);
    source.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(volume, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(gain); gain.connect(master);
    const entry = { source, nodes: [source, gain] };
    voices.add(entry);
    source.onended = () => {
      source.disconnect(); gain.disconnect(); voices.delete(entry);
    };
    source.start(time); source.stop(time + duration + 0.02);
  }

  function cue(name) {
    if (disposed || !unlocked || muted || paused || context?.state !== 'running') return;
    const now = context.currentTime;
    const cooldown = name === 'flap' ? 0.12 : name === 'finish' ? 1 : 0.08;
    if (now - (lastCue.get(name) ?? -Infinity) < cooldown) return;
    switch (name) {
      case 'pickup':
        voice(784, 0, 0.18, 0.12); voice(1174.66, 0.075, 0.28, 0.09); break;
      case 'rescue':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => voice(f, i * 0.085, 0.38, 0.10)); break;
      case 'finish':
        [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => voice(f, i * 0.11, 0.65, 0.085));
        voice(261.63, 0, 0.85, 0.06); break;
      case 'flap':
        voice(140, 0, 0.105, 0.07, 'triangle', 65);
        voice(105, 0.055, 0.10, 0.035, 'sine', 50); break;
      case 'land':
      case 'landing':
        voice(110, 0, 0.17, 0.13, 'sine', 42);
        voice(300, 0.015, 0.09, 0.025, 'triangle', 95); break;
      default: return;
    }
    lastCue.set(name, now);
  }

  function update(dt, { flying = false, swimming = false, speed = 0 } = {}) {
    if (disposed || paused || !context || !wind) return;
    const step = clamp(dt, 0.1), blend = 1 - Math.exp(-step * 3);
    motion += ((flying ? 0.4 : 0) + clamp(speed / 19) * 0.6 - motion) * blend;
    wet += ((swimming ? 1 : 0) - wet) * blend;
    // An original, quiet four-phrase score; motion changes its register and weight.
    if (music && !muted && context.state === 'running') {
      musicClock += step;
      if (musicClock >= .72) {
        musicClock -= .72;
        const chords = [[60,64,67,72], [57,60,64,69], [53,57,60,65], [55,59,62,67]];
        const chord = chords[Math.floor(musicBeat / 16) % 4];
        const sequence = [0,2,1,3,2,1,0,2];
        const midi = chord[sequence[musicBeat % 8]] + 12;
        if (musicBeat % 8 !== 7) voice(440 * 2 ** ((midi - 69) / 12), 0, 1.35, .038, 'sine');
        if (musicBeat % 4 === 0) voice(440 * 2 ** ((chord[0] - 81) / 12), 0, 2.1, .024, 'triangle');
        musicBeat++;
      }
    }
    phase = (phase + step) % (Math.PI * 200);
    smooth(wind.gain.gain, (0.035 + motion * 0.11) * (0.9 + Math.sin(phase * 0.45) * 0.1));
    smooth(wind.filter.frequency, 320 + motion * 950);
    smooth(water.gain.gain, wet * (0.07 + clamp(speed / 8) * 0.075) * (0.85 + Math.sin(phase * 1.7) * 0.15));
    smooth(water.filter.frequency, 650 + clamp(speed / 8) * 650);
  }

  return {
    unlock, cue, update,
    setMusic(value) { music = Boolean(value); if (!music) clearVoices(); },
    setMuted(value) {
      if (disposed) return;
      muted = Boolean(value);
      if (muted) clearVoices();
      if (master) smooth(master.gain, muted || paused ? 0 : 0.55, 0.025);
    },
    setPaused(value) {
      if (disposed) return Promise.resolve(false);
      paused = Boolean(value);
      if (paused) clearVoices();
      if (master) smooth(master.gain, muted || paused ? 0 : 0.55, 0.025);
      return syncState();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearVoices(); lastCue.clear();
      for (const node of beds.splice(0)) {
        try { if (node.stop) node.stop(); node.disconnect(); } catch { /* Closed context. */ }
      }
      master?.disconnect(); noise = null;
      try { Promise.resolve(context?.close()).catch(() => {}); } catch { /* Already closed. */ }
    },
  };
}
