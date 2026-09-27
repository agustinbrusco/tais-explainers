// Card window for "What a Probe Reads": its hero's move, on toy data. Points in a 3D toy space (filled: true,
// hollow: false) are first seen in a view that ignores the probe's direction, where the classes overlap. The view turns
// (an honest rotation: every frame is an orthogonal projection) until that direction lies flat, the probe's threshold
// and level sets draw in, and each point's score lands on the paper as a histogram. Schematic: no real states here.

import { player, clamp01, ease, svgEl } from "./lib.js";

const W = 560, H = 340, N = 90;
const GLASS = { x0: 14, y0: 14, x1: 546, y1: 226 }, CX = 280, CY = 120, KX = 76, KY = 36;
const BASE = 316, BIN = 0.25, BAR = 4.2;       // paper histogram: baseline, bin width (score units), height per point

// deterministic toy data: axis 0 is the probe's direction
function rng(seed) { return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rand = rng(7);
const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
const POINTS = [];
for (const truth of [1, 0]) for (let i = 0; i < N; i++) {
  POINTS.push({ truth, p: [(truth ? 1.55 : -1.55) + 0.55 * gauss(), 1.15 * gauss(), (truth ? 0.25 : -0.2) + 0.85 * gauss()] });
}

export function mount(svg, { K }) {
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const g = svgEl(svg, "g");
  // the glass: a faint grid, like the piece's figures
  svgEl(g, "rect", { x: GLASS.x0, y: GLASS.y0, width: GLASS.x1 - GLASS.x0, height: GLASS.y1 - GLASS.y0, rx: 10, fill: "rgba(255,255,255,.02)", stroke: K.grid });
  for (let x = GLASS.x0 + 38; x < GLASS.x1; x += 38) svgEl(g, "line", { x1: x, x2: x, y1: GLASS.y0, y2: GLASS.y1, stroke: K.grid, "stroke-opacity": 0.5 });
  for (let y = GLASS.y0 + 38; y < GLASS.y1; y += 38) svgEl(g, "line", { x1: GLASS.x0, x2: GLASS.x1, y1: y, y2: y, stroke: K.grid, "stroke-opacity": 0.5 });

  // the probe: a threshold (score 0) and level sets, drawn once its direction lies flat
  const levels = [-2, -1, -0.5, 0.5, 1, 2].map((s) => svgEl(g, "line", { x1: CX + s * KX, x2: CX + s * KX, y1: GLASS.y0, y2: BASE, stroke: K.overseer, "stroke-opacity": 0.28, "stroke-width": 1 }));
  const thr = svgEl(g, "line", { x1: CX, x2: CX, y1: GLASS.y0, y2: GLASS.y1, stroke: K.overseer, "stroke-width": 2.6 });

  const dots = POINTS.map((d) => svgEl(g, "circle", { r: 4.2, fill: d.truth ? K.residual : "none", stroke: K.residual, "stroke-width": 1.5 }));

  // the paper strip and its histogram of scores (false: outlined, true: filled ink)
  svgEl(svg, "rect", { x: GLASS.x0, y: GLASS.y1 + 10, width: GLASS.x1 - GLASS.x0, height: H - GLASS.y1 - 22, rx: 10, fill: K.sheet });
  svgEl(svg, "line", { x1: GLASS.x0 + 14, x2: GLASS.x1 - 14, y1: BASE, y2: BASE, stroke: K["overseer-ink"], "stroke-width": 1.4 });
  const bins = new Map();
  for (const d of POINTS) {
    const k = `${d.truth}_${Math.floor(d.p[0] / BIN)}`;
    bins.set(k, (bins.get(k) || 0) + 1);
  }
  const bars = [...bins].map(([k, n]) => {
    const [truth, b] = k.split("_").map(Number);
    return { n, el: svgEl(svg, "rect", { x: CX + b * BIN * KX + 0.8, width: BIN * KX - 1.6,
      fill: truth ? K["overseer-ink"] : K.card, stroke: K["overseer-ink"], "stroke-width": truth ? 0 : 1.2, "fill-opacity": truth ? 0.9 : 1 }) };
  });
  // the threshold crosses onto the paper, above the bars, in its on-paper ink
  const thrInk = svgEl(svg, "line", { x1: CX, x2: CX, y1: GLASS.y1 + 10, y2: BASE, stroke: K["overseer-ink"], "stroke-width": 2.2 });

  const T_TURN = [0.7, 2.9], T_THR = [3.0, 3.5], T_FALL = [3.5, 4.7], END = 4.8;
  function render(t) {
    const th = (Math.PI / 2) * ease((t - T_TURN[0]) / (T_TURN[1] - T_TURN[0]));
    const u = [Math.sin(th), Math.cos(th), 0], v = [0, 0, 1];   // u turns from axis 1 onto the probe's axis 0
    POINTS.forEach((d, i) => {
      const x = d.p[0] * u[0] + d.p[1] * u[1], y = d.p[2] * v[2];
      dots[i].setAttribute("cx", Math.max(GLASS.x0 + 6, Math.min(GLASS.x1 - 6, CX + KX * x)));
      dots[i].setAttribute("cy", Math.max(GLASS.y0 + 6, Math.min(GLASS.y1 - 6, CY - KY * y)));
    });
    const a = ease((t - T_THR[0]) / (T_THR[1] - T_THR[0]));
    const yTip = GLASS.y0 + (BASE - GLASS.y0) * a;   // one line drawing down, glass then paper
    thr.setAttribute("y2", Math.min(yTip, GLASS.y1));
    thr.setAttribute("opacity", a > 0 ? 1 : 0);
    thrInk.setAttribute("y2", Math.max(yTip, GLASS.y1 + 10));
    thrInk.setAttribute("opacity", yTip > GLASS.y1 + 10 ? 1 : 0);
    levels.forEach((l) => l.setAttribute("opacity", a));
    const f = ease((t - T_FALL[0]) / (T_FALL[1] - T_FALL[0]));
    for (const b of bars) { const h = b.n * BAR * f; b.el.setAttribute("y", BASE - h); b.el.setAttribute("height", h); }
  }
  return player(render, END);
}
