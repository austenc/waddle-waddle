# Character Editor

Standalone mallard look / animation lab for local development.

```bash
npm run editor
```

Opens `http://localhost:5173/tools/character-editor/`.

- Drag to orbit, scroll to zoom
- Preview Idle / Waddle / Hop / Fly / Glide / Roll
- Live color, scale, pivot, and animation knobs
- **Copy JSON** exports the current `duckParams` blob (paste into overrides or keep as reference)

Params live in `src/duckParams.js` and are consumed by `createDuck()` in the game.
