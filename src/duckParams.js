/** Default mallard look + animation knobs (shared by game + character editor). */

export const DUCK_COLOR_KEYS = [
  'head',
  'body',
  'chest',
  'beak',
  'eye',
  'wing',
  'wingTip',
  'foot',
  'tail',
  'collar',
];

export const DEFAULT_DUCK_PARAMS = {
  colors: {
    head: '#1f6b3a',
    body: '#a86b2d',
    chest: '#c9a06a',
    beak: '#e8a020',
    eye: '#1a1a1a',
    wing: '#8a5520',
    wingTip: '#2a2a2a',
    foot: '#e07020',
    tail: '#3a2a18',
    collar: '#ffffff',
  },

  /** Uniform scale of the whole model */
  scale: 1,

  /** Height of bank/pitch pivot (chest center) */
  bodyCenterY: 0.55,

  anim: {
    rollDuration: 0.55,

    // Idle
    idleBobSpeed: 2.2,
    idleBobAmount: 0.025,
    idleHeadBob: 0.015,

    // Waddle
    waddleSpeed: 13,
    waddleTilt: 0.32,
    waddlePitch: 0.08,
    waddleHop: 0.16,
    waddleSquash: 0.12,
    waddleFootSwing: 1.05,
    waddleWingBase: 0.25,
    waddleWingHop: 0.35,
    waddleHeadSway: 0.06,

    // Hop
    hopFlapRate: 14,
    hopWingBase: 0.35,
    hopWingFlap: 0.4,
    hopLean: -0.2,

    // Flight flap
    flapBaseRate: 12,
    flapThrottleRate: 14,
    flapWingBase: 0.45,
    flapWingAmp: 0.75,
    flapWingPitch: 0.18,
    flapBob: 0.05,

    // Glide
    glideFlapRate: 5,
    glideWingSpread: 0.95,
    glideWingPitch: 0.05,
    glideBob: 0.03,
    glideBankAmount: 0.28,

    // Thrust bank / pitch attitude
    thrustBankAmount: 0.5,
    pitchFromClimb: 0.045,

    // Honk
    honkDuration: 0.28,
    honkHeadLift: 0.12,
    honkBeakOpen: 0.35,
  },
};

export function hexToInt(hex) {
  const h = String(hex).replace('#', '');
  return parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
}

export function intToHex(n) {
  return `#${(n >>> 0).toString(16).padStart(6, '0')}`;
}

/** Deep-ish merge for duck params (colors + anim objects). */
export function mergeDuckParams(overrides = {}) {
  const base = structuredClone(DEFAULT_DUCK_PARAMS);
  if (!overrides || typeof overrides !== 'object') return base;

  if (overrides.colors) Object.assign(base.colors, overrides.colors);
  if (overrides.anim) Object.assign(base.anim, overrides.anim);
  if (overrides.scale != null) base.scale = overrides.scale;
  if (overrides.bodyCenterY != null) base.bodyCenterY = overrides.bodyCenterY;

  return base;
}

export function paramsToJson(params) {
  return `${JSON.stringify(params, null, 2)}\n`;
}
