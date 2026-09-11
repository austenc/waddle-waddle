export const FRIENDS = [
  { id: 0, name: 'Pip', title: 'A familiar voice', tip: 'Swim over to Pip and honk. A friend is the best place to begin.', reply: '“There you are! I saved you a spot at the nest.”', need: 'swim' },
  { id: 1, name: 'Clover', title: 'A rooftop kind of day', tip: 'Take flight above the market, then brake and descend into its rooftop garden.', reply: '“The view was lovely. The way down? Less lovely.”', need: 'land' },
  { id: 2, name: 'Miso', title: 'Follow the current', tip: 'Swim the blue canal trail, then find Miso beneath the bridge.', reply: '“You found the quiet way through! Race you home.”', need: 'canal' },
  { id: 3, name: 'Peaches', title: 'Something for the nest', tip: 'Collect three golden feathers, then bring them to Peaches at the Glasshouse.', reply: '“These will make the softest nest in the whole city.”', need: 'feathers' },
  { id: 4, name: 'Captain', title: 'The last lookout', tip: 'Reunite the other four friends, then land beside the North Beacon and honk.', reply: '“All accounted for. Let’s bring this flock home.”', need: 'flock' },
];
export const FEATHER_SPOTS = [
  [18, 16], [8, 17], [-8, 17], [-19, 4], [-12, -6], [3, 7],
  [-40, -36], [-40, 0], [40, 36], [40, 0], [-40, -84], [88, -36],
  [0, -35], [0, -45], [3, -76], [0, 36], [-5, 47], [3, 75],
];
export const TRIALS = [
  { id: 'pond', name: 'Pond paddler', kind: 'swim', color: '#8de7dc', gold: 8, limit: 55,
    points: [[8, -0.27, 4], [3, -0.27, -5], [-6, -0.27, -5], [-11, -0.27, 1], [-4, -0.27, 6]] },
  { id: 'canal', name: 'Under the bridges', kind: 'swim', color: '#8de7dc', gold: 11, limit: 65,
    points: [[0, -0.27, -34], [-5, -0.27, -43], [4, -0.27, -51], [0, -0.27, -61], [-4, -0.27, -73]] },
  { id: 'roofs', name: 'The scenic route', kind: 'fly', color: '#f9cb77', gold: 19, limit: 80,
    points: [[20, 10, -16], [18, 15, -40], [0, 20, -48], [-20, 21, -48], [-40, 15, -36], [-20, 12, -18], [0, 7, -16]] },
];
export function rescueRequirement(id, player, save) {
  if (save.rescued.includes(id)) return 'Already home';
  if (id === 0 && player.mode !== 'swim') return 'Pip is waiting on the water. Swim over to say hello.';
  if ([1, 4].includes(id) && player.mode !== 'ground') return 'Find your footing first. Brake and land on the roof.';
  if (id === 2 && !save.trials.canal) return 'Miso needs a guide. Swim the blue canal trail, starting north of the park.';
  if (id === 3 && save.feathers.length < 3) return `Peaches needs three golden feathers for the nest. ${save.feathers.length} / 3 found.`;
  if (id === 4 && save.rescued.length < 4) return 'Captain won’t leave anyone behind. Find the other four friends first.';
  return null;
}
// Swept proximity prevents fast flight from missing a checkpoint between frames.
export function segmentDistance(point, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const length = dx * dx + dy * dy + dz * dz;
  const t = length ? Math.max(0, Math.min(1, ((point[0] - a.x) * dx + (point[1] - a.y) * dy + (point[2] - a.z) * dz) / length)) : 0;
  return Math.hypot(point[0] - a.x - dx * t, point[1] - a.y - dy * t, point[2] - a.z - dz * t);
}
export function createTrialState() {
  let active = null;
  let cooldown = 0;
  return {
    get active() { return active; },
    reset() { active = null; cooldown = 1; },
    update(dt, before, player) {
      cooldown = Math.max(0, cooldown - dt);
      if (!active && !cooldown) {
        const trial = TRIALS.find(t => player.mode === t.kind && segmentDistance(t.points[0], before, player) < 2.2);
        if (trial) { active = { id: trial.id, index: 1, elapsed: 0 }; return { type: 'start', trial }; }
      }
      if (!active) return null;
      const trial = TRIALS.find(t => t.id === active.id);
      active.elapsed += dt;
      if (active.elapsed >= trial.limit) { active = null; cooldown = 3; return { type: 'timeout', trial }; }
      if (player.mode === trial.kind && segmentDistance(trial.points[active.index], before, player) < 2.5) {
        active.index++;
        if (active.index === trial.points.length) {
          const elapsed = active.elapsed; active = null; cooldown = 4;
          return { type: 'finish', trial, elapsed, gold: elapsed <= trial.gold };
        }
        return { type: 'checkpoint', trial };
      }
      return null;
    },
  };
}

/** The compass follows what the player needs next, including encounter prerequisites. */
export function objectiveFor(target, save, player, availableFeathers, activeTrial, selectedTrial = null) {
  if (activeTrial) {
    const trial = TRIALS.find(t => t.id === activeTrial.id);
    const point = trial.points[activeTrial.index];
    return { x: point[0], y: point[1], z: point[2], name: `Ring ${activeTrial.index + 1}`, kind: 'ring', trial: trial.id };
  }
  const trial = selectedTrial ?? (target?.id === 2 && !save.trials.canal ? 'canal' : null);
  if (trial) {
    const t = TRIALS.find(t => t.id === trial), p = t.points[0];
    return { x: p[0], y: p[1], z: p[2], name: t.name, kind: 'trail', trial: t.id };
  }
  if (target?.id === 3 && save.feathers.length < 3) {
    const feather = availableFeathers.filter(f => !save.feathers.includes(f.id)).sort((a, b) => {
      const cost = f => Math.hypot(f.x - player.x, f.z - player.z) + Math.abs(f.y - player.y) * 2;
      return cost(a) - cost(b);
    })[0];
    if (feather) return { ...feather, name: `Feather ${save.feathers.length + 1} of 3`, kind: 'feather' };
  }
  return target ? { ...target, kind: 'friend' } : { x: 22, y: 0, z: 7, name: 'Home', kind: 'home' };
}
