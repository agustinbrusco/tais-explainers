// Hidden states drawn as squares of real numbers (the kit's picture of "a hidden state").
//
//   import { loadStates, tileURL, rampCSS } from "../../../kit/web/states.js";
//   const data = await loadStates(new URL("./data/tiles.json", import.meta.url));
//   svg.append("image").attr("href", tileURL(values)).style("image-rendering", "pixelated");
//
// `values` are ints in -127..127 (see kit/interp.py `quantize`): one state's first N numbers, scaled per layer.
// Color is a signed ramp inside the residual-stream blue family, so a square reads as "numbers in the model", not as
// a new semantic color. Say on screen what the squares are (which model, which numbers, which scale) and where
// they are real vs reused: see kit/PLAYBOOK.md, "Real data under schematic wiring".

export const loadStates = (url) => fetch(url).then((r) => r.json());

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

// A square image: cols x rows cells with a hairline gap, as a data URL (cached). values are ints in -127..127.
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
