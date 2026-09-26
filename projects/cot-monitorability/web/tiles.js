// Real hidden states, drawn as small matrices of numbers.
//
// data/tiles.json comes from data/export_tiles.py: residual-stream vectors of gelu-4l, a real 4-layer research model,
// reading a written-out version of the arithmetic chain. A square shows 64 of a state's 512 numbers (dims 0-63) as
// an 8x8 grid, colored by value relative to that layer's scale. Every figure uses these squares as its picture of
// "a hidden state"; the wiring drawn around them is schematic (see the caveats and claims.md, C-VIZ-TILES).

export const TILES = await fetch(new URL("./data/tiles.json", import.meta.url)).then((r) => r.json());
export const META = TILES.meta;

// Signed value in [-1, 1] -> glass blue: deep indigo (negative), steel (near zero), ice (positive).
const STOPS = [[0, [3, 7, 18]], [0.3, [12, 32, 74]], [0.52, [30, 78, 168]], [0.72, [70, 140, 236]], [0.88, [150, 200, 252]], [1, [236, 246, 255]]];
export function ramp(v) {
  const u = Math.max(0, Math.min(1, (v + 1) / 2));
  for (let i = 1; i < STOPS.length; i++) {
    const [b, cb] = STOPS[i];
    if (u <= b) {
      const [a, ca] = STOPS[i - 1], t = (u - a) / (b - a);
      return ca.map((c, k) => Math.round(c + (cb[k] - c) * t));
    }
  }
  return STOPS.at(-1)[1];
}
export const rampCSS = (v) => `rgb(${ramp(v).join(",")})`;

// A tile image: cols x rows cells with a hairline gap, as a data URL (cached). values are ints in -127..127.
const cache = new Map();
export function tileURL(values, { cols = 8, cell = 10, gap = 1, key } = {}) {
  const k = key ?? values.join(",");
  if (cache.has(k)) return cache.get(k);
  const rows = Math.ceil(values.length / cols);
  const c = document.createElement("canvas");
  c.width = cols * cell; c.height = rows * cell;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#02050b";
  ctx.fillRect(0, 0, c.width, c.height);
  values.forEach((v, i) => {
    ctx.fillStyle = rampCSS(v / 127);
    ctx.fillRect((i % cols) * cell + gap / 2, Math.floor(i / cols) * cell + gap / 2, cell - gap, cell - gap);
  });
  const url = c.toDataURL();
  cache.set(k, url);
  return url;
}

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
