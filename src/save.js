import {freshMischief,sanitizeMischief} from './mischief-state.js';
const KEY = 'mallard-city-save-v2';
export function freshSave() { return { version: 2, mischief: freshMischief(), rescued: [], feathers: [], trials: {}, homecoming: false, muted: false, music: true, touchControls: false, reducedMotion: false, tutorial: 0 }; }
export function loadSave(storage) {
  try {
    const data = JSON.parse((storage ?? globalThis.localStorage).getItem(KEY));
    if (data?.version !== 2) return freshSave();
    return {
      ...freshSave(),
      mischief: sanitizeMischief(data.mischief),
      rescued: Array.isArray(data.rescued) ? [...new Set(data.rescued.filter(x => Number.isInteger(x) && x >= 0 && x < 5))] : [],
      feathers: Array.isArray(data.feathers) ? [...new Set(data.feathers.filter(x => Number.isInteger(x) && x >= 0 && x < 18))] : [],
      trials: Object.fromEntries(Object.entries(data.trials ?? {}).filter(([key, value]) => ['pond', 'roofs', 'canal'].includes(key) && Number.isFinite(value) && value > 0)),
      homecoming: data.homecoming === true, muted: data.muted === true, music: data.music !== false, touchControls: data.touchControls === true, reducedMotion: data.reducedMotion === true,
      tutorial: Number.isInteger(data.tutorial) ? Math.max(0, Math.min(3, data.tutorial)) : 0,
    };
  } catch { return freshSave(); }
}
export function writeSave(data, storage) {
  try { (storage ?? globalThis.localStorage).setItem(KEY, JSON.stringify(data)); return true; } catch { return false; }
}
