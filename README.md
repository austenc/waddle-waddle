# Ducks — Mallard City

A small exploration adventure about bringing a lost flock home. Waddle through a waterfront city, paddle its canals, and land on rooftop gardens. The city contains twenty larger buildings, sixteen terraced houses, a park, four bridges, and distinctive garden, glasshouse, and beacon landmarks.

## Play

```sh
npm install
npm run dev
```

Pip needs a familiar voice on the water. Clover needs a rooftop landing. Miso needs a guide through the canal course. Peaches needs three golden feathers. Captain stays until the other four are safe. Return to the park nest for the homecoming, then explore eighteen feather locations and three timed trails with saved personal bests.

Guidance follows prerequisites and active checkpoints. Field notes let you choose a friend or trail to track. Honk at nearby pigeons to scatter them; the home nest fills with feathers and flowers as you make progress. Progress and preferences are saved on this browser. If browser storage is unavailable, the game remains playable and indicates that progress is temporary.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows | Camera-relative walking and swimming |
| Tap Space | Hop |
| Hold Space | Take flight and climb (double-tap also works) |
| Release Space in flight | Glide |
| W / S in flight | Accelerate / brake and descend |
| A / D in flight | Turn and bank |
| C | Dive |
| Shift | Sprint on land; spend wing power for a flight boost |
| Double-tap A / D | Barrel roll |
| H | Honk and interact |
| Drag / Q / E | Look around |
| J | Field notes and trail records |
| Tab | Track the next friend |
| Escape | Pause |

Holding the brake through a landing settles the duck in place; release it before walking backward. Swim clear of a low bridge before taking off. Touch devices expose a stick, fly/climb, descend, boost, roll, and honk buttons. The pause menu can also show these controls on a desktop, and offers separate music, sound, and reduced-motion preferences. Pausing clears held inputs; return-to-park provides recovery if needed.

## Development and verification

```sh
npm test
npm run build
npm run editor
```

Open `http://localhost:5173/?qa` in development for isolated playtest fixtures. **Full journey** drives normal movement from the nest through all rescue prerequisites and back home; it does not teleport between encounters or grant inventory. Other buttons set up individual test scenarios. QA saves stay in memory and cannot replace the player's saved adventure. QA modules are excluded from production builds.

- `src/player.js`: fixed-step movement simulation, flight, swimming, stamina, and landing transitions.
- `src/physics.js`, `src/camera.js`: collision queries and camera obstruction handling.
- `src/world.js`, `src/life.js`: seeded instanced architecture, animated water, and reactive city inhabitants.
- `src/adventure.js`, `src/mission.js`: objectives, prerequisites, races, collectibles, guidance, and homecoming.
- `src/save.js`: validated local persistence with a no-storage fallback.
- `src/audio.js`, `src/effects.js`: procedural audio and pooled visual feedback.
- `src/duck.js`: mallard geometry/animation shared with the character editor.

Physics tests cover walls, roofs, undersides, edges, swimming, and camera clearance. Movement tests cover sustained input and landing controls. Adventure tests cover prerequisites, swept checkpoints, timeout/retry, navigation, and malformed saves. The continuous journey regression uses the actual generated collision world and movement simulation.

Multiplayer remains a separate iteration. World generation is seeded, collision and player simulation are independent of rendering, and simulation runs at 60 Hz. Networking still needs authoritative state, input transport, interpolation, lobbies, and synchronized progress.

## Audio credit

Mallard call: [XC62258](https://xeno-canto.org/62258) by Jonathon Jongsma ([CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)).
