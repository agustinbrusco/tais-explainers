// Card window for "How Many Steps Fit in the Dark?": its hero's first act, flattened. A wall of real gelu-4l hidden
// states (columns = positions, rows = the 4 layers) over a paper transcript. A counted route climbs a column in the
// dark, has to surface as a written word (gold: where the monitor can read it), and the count restarts from there.
// Same states and same route as the piece's hero (projects/cot-monitorability/web/hero.js, act 1).

import { stateAt, tileURL } from "../projects/cot-monitorability/web/tiles.js";
import { player, clamp01, ease, svgEl } from "./lib.js";

const W = 560, H = 340, COLS = 5, LAYERS = 4, T = 38;
const colX = (c) => 96 + c * 96;
const rowY = (r) => 212 - r * 46;             // tile centres, layer 1 at the bottom
const CARD_Y = 262, CARD_W = 60, CARD_H = 40;

export function mount(svg, { K }) {
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const defs = svgEl(svg, "defs");
  const glow = svgEl(defs, "filter", { id: "cot-glow", x: "-50%", y: "-50%", width: "200%", height: "200%" });
  svgEl(glow, "feGaussianBlur", { stdDeviation: 3, result: "b" });
  const m = svgEl(glow, "feMerge");
  svgEl(m, "feMergeNode", { in: "b" }); svgEl(m, "feMergeNode", { in: "SourceGraphic" });

  // the paper transcript on the floor, and the monitor's eye at its start
  svgEl(svg, "rect", { x: 14, y: CARD_Y - 16, width: W - 28, height: CARD_H + 32, rx: 10, fill: K.sheet, opacity: 0.96 });
  const eye = svgEl(svg, "g", { transform: `translate(38 ${CARD_Y + CARD_H / 2})` });
  const lid = svgEl(eye, "path", { d: "M-15 0 Q0 -11 15 0 Q0 11 -15 0 Z", fill: "none", stroke: K["overseer-ink"], "stroke-width": 2.2 });
  const pupil = svgEl(eye, "circle", { r: 4.6, fill: K["overseer-ink"] });

  // the wall: faint wiring up each column, then the squares of real numbers
  for (let c = 0; c < COLS; c++) svgEl(svg, "line", { x1: colX(c), x2: colX(c), y1: CARD_Y, y2: rowY(LAYERS - 1), stroke: K.residual, "stroke-opacity": 0.18, "stroke-width": 1.5 });
  const tiles = [];
  for (let c = 0; c < COLS; c++) for (let r = 0; r < LAYERS; r++) {
    const g = svgEl(svg, "g");
    svgEl(g, "image", { href: tileURL(stateAt(c, r)), x: colX(c) - T / 2, y: rowY(r) - T / 2, width: T, height: T, style: "image-rendering: pixelated" });
    const ring = svgEl(g, "rect", { x: colX(c) - T / 2 - 1.5, y: rowY(r) - T / 2 - 1.5, width: T + 3, height: T + 3, rx: 3, fill: "none", stroke: K.residual, "stroke-width": 2.2, filter: "url(#cot-glow)" });
    tiles.push({ c, r, g, ring });
  }

  // the transcript's cards: the question, then the words the chain writes
  const cards = [];
  for (let c = 0; c < COLS; c++) {
    const g = svgEl(svg, "g", { transform: `translate(${colX(c)} ${CARD_Y + CARD_H / 2})` });
    const box = svgEl(g, "rect", { x: -CARD_W / 2, y: -CARD_H / 2, width: CARD_W, height: CARD_H, rx: 5, "stroke-width": 1.4 });
    const txt = svgEl(g, "text", { "text-anchor": "middle", dy: "0.36em", fill: K["token-ink"], style: `font: 600 22px ${K["font-sans"]}` });
    cards.push({ box, txt });
  }

  // the route (hero act 1): climb 4 layers, write "39"; climb 4, write "64"; then the chain needs only 2 more steps, so
  // the count stops at 2 and the state is carried up the rest of the stack (every word is written from the top layer),
  // and the answer comes out unforced
  const TOP = rowY(LAYERS - 1) - T / 2;
  const legs = [], badges = [], carried = [];
  let t = 0.5;
  const climbs = [[0, 4, "39", true], [1, 4, "64", true], [2, 2, "181", false]];
  for (const [c, n, word, forced] of climbs) {
    const x = colX(c), yEnd = n < LAYERS ? rowY(n - 1) : TOP;
    const dur = 0.34 * n + 0.1;
    legs.push({ d: `M${x} ${CARD_Y} L${x} ${yEnd}`, kind: "climb", t0: t, dur });
    for (let r = 0; r < n; r++) badges.push({ c, r, count: r + 1, at: t + (dur * (CARD_Y - rowY(r))) / (CARD_Y - yEnd) });
    t += dur;
    if (n < LAYERS) {
      const cdur = 0.22 * (LAYERS - n);
      legs.push({ d: `M${x} ${yEnd} L${x} ${TOP}`, kind: "carry", t0: t, dur: cdur });
      for (let r = n; r < LAYERS; r++) carried.push({ c, r, at: t + (cdur * (yEnd - rowY(r))) / (yEnd - TOP) });
      t += cdur;
    }
    t += 0.12;
    const x1 = colX(c + 1), peak = TOP - 34;
    legs.push({ d: `M${x} ${TOP} C${x + 10} ${peak}, ${x1 - 6} ${peak}, ${x1} ${CARD_Y - 2}`, kind: "write", t0: t, dur: 0.62, card: c + 1, word, forced });
    t += 0.62 + 0.45;
  }
  const END = t + 0.2;
  const layer = svgEl(svg, "g");
  for (const L of legs) {
    L.el = svgEl(layer, "path", { d: L.d, fill: "none", "stroke-linecap": "round",
      stroke: L.kind === "write" ? K.overseer : K.residual,
      "stroke-width": L.kind === "climb" ? 3.2 : L.kind === "carry" ? 2.2 : 2.4, "stroke-opacity": L.kind === "carry" ? 0.75 : 1,
      filter: L.kind === "write" ? null : "url(#cot-glow)" });
    L.len = L.el.getTotalLength();
    L.el.setAttribute("stroke-dasharray", `${L.len} ${L.len}`);
  }
  for (const b of badges) {
    b.g = svgEl(svg, "g", { transform: `translate(${colX(b.c) + T / 2 + 2} ${rowY(b.r) - T / 2 - 1})` });
    svgEl(b.g, "circle", { r: 11, fill: K.residual, stroke: K.bg, "stroke-width": 2 });
    const tx = svgEl(b.g, "text", { "text-anchor": "middle", dy: "0.36em", fill: K.bg, style: `font: 700 13px ${K["font-sans"]}` });
    tx.textContent = b.count;
  }

  // the monitor reacts as each word lands, as in the piece: the pupil glances along the transcript and the lid tightens
  const writes = legs.filter((L) => L.kind === "write").map((L) => L.t0 + L.dur);
  const glance = (dt) => (dt < 0 ? 0 : dt < 0.16 ? ease(dt / 0.16) : dt < 0.46 ? 1 : 1 - ease((dt - 0.46) / 0.26));
  const squint = (dt) => (dt < 0 ? 0 : dt < 0.16 ? ease(dt / 0.16) : 1 - ease((dt - 0.16) / 0.4));

  function render(time) {
    for (const L of legs) L.el.setAttribute("stroke-dashoffset", L.len * (1 - ease((time - L.t0) / L.dur)));
    const lit = new Map();   // counted states glow with a solid ring; carried ones (passed up, no new step) a dashed one
    for (const b of badges) {
      const on = clamp01((time - b.at) / 0.15);
      b.g.setAttribute("opacity", on);
      if (on > 0) lit.set(`${b.c}_${b.r}`, "counted");
    }
    for (const k of carried) if (time >= k.at) lit.set(`${k.c}_${k.r}`, "carried");
    for (const s of tiles) {
      const how = lit.get(`${s.c}_${s.r}`);
      s.ring.setAttribute("opacity", how ? 1 : 0);
      s.ring.setAttribute("stroke-dasharray", how === "carried" ? "4 3" : "none");
    }
    const g = Math.max(0, ...writes.map((at) => glance(time - at))), q = Math.max(0, ...writes.map((at) => squint(time - at)));
    pupil.setAttribute("cx", 4.7 * g);
    lid.setAttribute("stroke-width", 2.2 + 1.5 * q);
    cards.forEach((card, c) => {
      const w = legs.find((L) => L.card === c);
      const written = c === 0 || (w && time >= w.t0 + w.dur);
      const hl = w && w.forced && written;
      card.box.setAttribute("fill", hl ? K.highlight : written ? K.card : "none");
      card.box.setAttribute("stroke", hl ? K["overseer-ink"] : K.rule);
      card.box.setAttribute("stroke-dasharray", written ? "none" : "4 4");
      card.txt.textContent = c === 0 ? "Q" : written ? w.word : "";
    });
  }
  return player(render, END);
}
