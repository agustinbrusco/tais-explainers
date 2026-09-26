// Real hidden states, drawn as small matrices of numbers (drawing: kit/web/states.js).
//
// data/tiles.json comes from data/export_tiles.py: residual-stream vectors of gelu-4l, a real 4-layer research model,
// reading a written-out version of the arithmetic chain. A square shows 64 of a state's 512 numbers (dims 0-63) as
// an 8x8 grid, colored by value relative to that layer's scale. They are the real states under the cards only in
// the standard arithmetic figures; everywhere else they are reused (see the step-2 caveat and claims.md, C-VIZ-TILES).

import { loadStates } from "../../../kit/web/states.js";
export { ramp, rampCSS, tileURL } from "../../../kit/web/states.js";

export const TILES = await loadStates(new URL("./data/tiles.json", import.meta.url));
export const META = TILES.meta;

// The state at a drawn column and layer of the standard figure (the real run), or a stand-in from the pool for
// positions and layers the real run doesn't have (extra passes, other scenes). `seed` picks deterministically.
const L = META.n_layers;
export function stateAt(col, row) {
  if (row < L && col < TILES.columns[0].length) return TILES.columns[row][col];
  return poolState(col * 7 + row * 13 + 5, row % L);
}
export function poolState(seed, layer) {
  const p = TILES.pool;
  return p[((seed % p.length) + p.length) % p.length][layer % L];
}
