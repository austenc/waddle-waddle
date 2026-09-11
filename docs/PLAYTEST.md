# Mallard City playtest — September 10, 2026

Branch: `codex/mallard-city`.

## Verified

- Continuous rendered adventure: walked and swam to Pip, collected feathers, completed the canal course, rescued Miso, landed on Clover's market roof, visited Peaches and Captain, and returned to the nest. The development pilot used normal movement and honk inputs, without teleporting between encounters or granting inventory. Homecoming appeared after all five friends returned. The pilot reported completion at 167.3 seconds with six feathers.
- Dismissed homecoming, opened field notes, and selected Pond paddler. The journal closed, the destination marker changed, and the minimap showed the course.
- Preview reported 60 fps during the observed journey on this desktop. This is not a physical-phone performance benchmark.
- Checked portrait 390 × 844 and landscape 667 × 375 layouts, pause/settings, touch joystick movement and hop, and the device-specific flight guide.
- Swam the canal in the rendered game and inspected the camera below its bridge. The duck stays visible beneath the deck.
- Automated suite: 37 passing tests covering collision, movement, input release, camera clearance, prerequisites, persistence failure, course traversal, deterministic world generation, and a full adventure through the real collision world.
- Production build and whitespace checks pass. Development playtest code is excluded from production output.

## Iterations driven by testing

Landing brakes remain held through touchdown until released, preventing an unintended backward walk off the roof. The bridge camera now lowers its boom instead of collapsing into the duck. Miso swims out from beneath the bridge before flying home. Guidance directs the player to missing prerequisites and active course checkpoints. Keyboard input respects dialog buttons. Touch controls include boost and device-appropriate instructions. Water wakes are quieter, and gold course times require a more deliberate route. The duck's head details and wing tips follow their animated parents, with a wider flight silhouette.

## Remaining scope

Multiplayer is not implemented. Independent human playtesting is still needed to judge discovery, emotional appeal, long-term replayability, and difficulty. No critic score is asserted. Mobile hardware, gamepads, and a broad browser/device matrix have not been validated.

## Focused graphics pass

Addressed reported screen shake by keeping animation below the duck's world transform, fixing the sun and shadow projection in world space, interpolating rendered positions between physics ticks, easing camera distance transitions, and removing speed-driven field-of-view changes. Animation damping uses elapsed time and does not run while paused.

Rebuilt the mallard's compact folded wings and extended flight feathers, widened the yellow bill, exposed the narrow white collar and chestnut breast, reshaped the green head, and restored outward surface normals on thin beveled parts. Static pieces are merged per animated joint and color to control draw calls. Added clustered beveled foliage, brighter window glass colors, and softer daylight. Reference: [Ducks Unlimited mallards in flight](https://www.ducks.org/conservation/waterfowl-research-science/understanding-waterfowl-mallards-and-their-relatives); reference photography is not distributed as an asset.

Added four regression tests for a stable world anchor, fixed sunlight, render interpolation and respawn behavior, and outward thin-part normals. Total: 41 passing tests. Inspected side profile, idle/honk frame pairs, takeoff and glide in the browser; observed 60 fps at the 1280 × 800 test viewport.

## Market mischief iteration

Added the Willow & Rye sandwich cart and reacting vendor, visible carried lunch, an optional rooftop picnic with two arriving neighbors, six pondside pigeons that react to swimming splashes, and a Picnic Club reward at the nest. Field notes can track or stop tracking the activity; selecting a rescue or course switches the shared objective marker back.

The first browser route caught a dock obstruction. Moved the breadcrumb path and walking approach around the dock. The corrected real-input browser route completed theft, pigeon splashing, rooftop landing and picnic in 44.7 seconds, with all six pigeons splashed. The picnic scene and arriving guests were inspected in the rendered game. Added save migration/carrying tests, prerequisite and duplicate-reward tests, objective tests, and a continuous movement test using the actual world and pigeon simulation. Total: 47 passing tests. Production build passes with the existing large-chunk warning.
