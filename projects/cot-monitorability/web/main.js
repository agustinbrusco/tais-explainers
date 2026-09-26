// How Many Steps Fit in the Dark? The core figure.
//
// The figure is a real DAG. The longest dark path is *computed* on the drawn graph (dynamic programming in
// topological order, with readable token nodes resetting the count), so every architecture is literally
// a graph edit, and the readouts follow from it.
//
// Two materials. The model's interior is a dark glass window; every hidden state in it is a square of real numbers
// (tiles.js). The transcript lies outside the window, on the paper: cards the monitor can read. Where a route has to
// leave the glass, it lands on paper, the monitor highlights the card, and the count starts again at 1.
//
// A task is routed through the graph as a "story": a pulse climbs the route and numbers every hidden state it uses.

import * as d3 from "d3";
import { mountSteps } from "../../../kit/web/steps.js";
import { mountHero } from "./hero.js";
import { drawChart } from "./charts.js";
import { drawDiffusion } from "./diffusion.js";
import { drawReaders } from "./readers.js";
import { drawAnatomy } from "./anatomy.js";
import { stateAt, tileURL, META, TILES } from "./tiles.js";
import { installGlassDefs } from "../../../kit/web/glass.js";

const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(`--${n}`).trim();
// glass (inside the model) and ink (on paper) palettes
const K = Object.fromEntries(
  ["token", "residual", "overseer", "danger", "safe", "training", "text", "muted", "faint", "grid", "surface", "raised", "bg"].map((n) => [n, css(n)]),
);
Object.assign(K, { line: "#2a3a55", fan: "#2c4163", fanHi: "#5b86c9", win: "#1b2433" });
const KI = Object.fromEntries(["page", "sheet", "card", "rule", "ink", "ink2", "ink3", "highlight"].map((n) => [n, css(n)]));
["token", "residual", "overseer", "danger", "safe", "training"].forEach((n) => { KI[n] = css(`${n}-ink`); });
const FONT = { mono: css("font-mono"), display: css("font-display"), sans: css("font-sans") };
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
// Phones get fewer columns in a narrower viewBox, so the figure's text scales up instead of shrinking to ~7px.
// (Matches the breakpoint where base.css turns the stage into a sticky top band.)
const NARROW = matchMedia("(max-width: 860px)").matches;

// ---------------- two running examples ----------------
// Arithmetic: a chain of dependent steps, drawn one row per step.
const START = 7;
const OPS = [["×", 3], ["−", 4], ["×", 2], ["+", 5], ["−", 9], ["×", 2], ["+", 7], ["−", 3],
             ["×", 3], ["−", 11], ["+", 6], ["×", 2], ["−", 8], ["+", 4], ["×", 2], ["−", 5]];
const applyOp = (v, [o, n]) => (o === "×" ? v * n : o === "+" ? v + n : v - n);
const VALUES = OPS.reduce((acc, op) => (acc.push(applyOp(acc.at(-1), op)), acc), [START]); // VALUES[i]: after i steps

// Facts: an item from the 4-hop benchmark of Xu, Prasanna & Westover (2026), every hop checked on Wikipedia.
// Drawn two rows per hop: Nanda (2026) finds chained facts "approx 2x worse than arithmetic steps".
const HOP_START = "Nobel Lit. 1992";
const HOPS = [
  { rel: "winner", short: "winner", value: "Walcott" },
  { rel: "day of birth", short: "born", value: "23" },
  { rel: "Best Actress at that Oscars", short: "Best Actress", value: "Holliday" },
  { rel: "day of birth", short: "born", value: "21" },
];

const TASKS = {
  arith: { rows: 1, max: OPS.length, font: "font-mono", noun: "Chain length",
           value: (i) => String(VALUES[i]), answer: (k) => `=${VALUES[k]}` },
  hops: { rows: 2, max: HOPS.length, font: "font-sans", noun: "Hops",
          value: (i) => HOPS[i - 1].value, answer: (k) => HOPS[k - 1].value },
};

// ---------------- the model: graph construction (pure) ----------------
const T = NARROW ? 5 : 8; // token positions drawn
const L = 4;          // layers drawn per pass (= gelu-4l's layers, whose real states fill the squares)
const COCONUT_THOUGHTS = [1, 2]; // columns whose input is a continuous thought instead of a token

function buildGraph({ arch, loops }) {
  const R = L * (arch === "looped" ? loops : 1);
  const latentIn = (t) => arch === "coconut" && COCONUT_THOUGHTS.includes(t);
  const nodes = [], edges = [];
  for (let t = 0; t < T; t++) {
    nodes.push({ id: `x${t}`, kind: latentIn(t) ? "latent" : "tok", col: t, row: -1 });
    for (let r = 0; r < R; r++) nodes.push({ id: `h${t}_${r}`, kind: "h", col: t, row: r });
    edges.push({ id: `in${t}`, kind: latentIn(t) ? "dark-link" : "in", s: `x${t}`, t: `h${t}_0` });
    for (let r = 0; r < R - 1; r++) {
      edges.push({ id: `v${t}_${r}`, kind: "res", s: `h${t}_${r}`, t: `h${t}_${r + 1}` });
      // attention: a state reads every earlier position, one layer down (causal, global attention)
      for (let q = 0; q < t; q++) edges.push({ id: `a${q}_${t}_${r}`, kind: "attn", s: `h${q}_${r}`, t: `h${t}_${r + 1}` });
    }
    if (t < T - 1) {
      edges.push({ id: `out${t}`, kind: latentIn(t + 1) ? "dark-link" : "write", s: `h${t}_${R - 1}`, t: `x${t + 1}` });
      if (arch === "fullbw") edges.push({ id: `fb${t}`, kind: "dark-link", s: `h${t}_${R - 1}`, t: `h${t + 1}_0` });
    }
  }
  return { R, nodes, edges, latentIn, byId: new Map(nodes.map((n) => [n.id, n])), edgeById: new Map(edges.map((e) => [e.id, e])) };
}

// Longest path that never passes through a readable (token) node. Length = hidden states on the path.
function longestDarkPath(g) {
  const preds = new Map(g.nodes.map((n) => [n.id, []]));
  const rank = { res: 0, "dark-link": 1, attn: 2, in: 3, write: 4 }; // tie-break: prefer drawing vertical routes
  g.edges.forEach((e) => preds.get(e.t).push(e));
  preds.forEach((list) => list.sort((a, b) => rank[a.kind] - rank[b.kind]));
  const order = [...g.nodes].sort((a, b) => a.col - b.col || a.row - b.row);
  const len = new Map(), back = new Map();
  for (const n of order) {
    if (n.kind === "tok") { len.set(n.id, 0); continue; }
    let best = -1, bestE = null;
    for (const e of preds.get(n.id)) if (len.get(e.s) > best) { best = len.get(e.s); bestE = e; }
    len.set(n.id, Math.max(0, best) + (n.kind === "h" ? 1 : 0));
    back.set(n.id, bestE);
  }
  let end = null;
  for (const n of order) if (!end || len.get(n.id) > len.get(end.id)) end = n;
  // Walk back until the path would enter a readable token: the dark path starts just after it.
  const nodes = [end.id], edges = [];
  for (let id = end.id, e = back.get(id); e && g.byId.get(e.s).kind !== "tok"; e = back.get(id)) {
    edges.push(e.id); nodes.push(e.s); id = e.s;
  }
  return { length: len.get(end.id), nodes: nodes.reverse(), edges: edges.reverse(), depth: len };
}

// A route that wanders far sideways through attention: one layer up per hop, but several columns at a time.
const ZIG = NARROW ? [0, 1, 3, 4] : [0, 2, 5, 7];
const zigNodes = () => ZIG.map((c, r) => `h${c}_${r}`);
const zigEdges = () => d3.range(L - 1).map((r) => `a${ZIG[r]}_${ZIG[r + 1]}_${r}`);

// ---------------- stories: what the pulse does ----------------
// A story is an ordered list of items: {node} (a hidden state used, with its running count), {edge} (a leg the
// pulse travels: "climb", "link" = dark link, "write" = into or out of a card), {card} (a forced write or the
// answer: the count resets) and {thought} (passing through a continuous-thought slot: no reset).

// The dark path alone: the counter climbs with the pulse. With `zigzag`, a second route then tries to escape
// sideways through attention and tops out at the same count.
function pathStory(g, dark, { zigzag = false } = {}) {
  const items = [];
  const walk = (nodes, edges) => {
    let count = 0;
    nodes.forEach((id, j) => {
      if (g.byId.get(id).kind === "h") items.push({ type: "node", id, count: ++count });
      if (j < edges.length) items.push({ type: "edge", id: edges[j], kind: g.edgeById.get(edges[j]).kind === "res" ? "climb" : "link" });
    });
  };
  walk(dark.nodes, dark.edges);
  if (zigzag) {
    items.push({ type: "jump", id: zigNodes()[0] });
    walk(zigNodes(), zigEdges());
  }
  return { items, writes: [], answer: null, ticks: true };
}

// Lay a task onto the graph: each step takes `task.rows` drawn rows (a drawing convention; see the caveats).
// At the top of a column the running value must cross to the next column. If a dark link exists it crosses
// silently; otherwise it is *forced* into a token, where the monitor can read it.
function chainStory(g, k, arch, task) {
  const items = [], writes = [];
  const total = k * task.rows;
  let col = 0, row = 0, count = 0;
  const cross = (step) => {
    if (arch === "fullbw") items.push({ type: "edge", id: `fb${col}`, kind: "link" });
    else if (g.latentIn(col + 1)) items.push({ type: "edge", id: `out${col}`, kind: "link" }, { type: "thought", col: col + 1 },
                                             { type: "edge", id: `in${col + 1}`, kind: "link" });
    else {
      const w = { col: col + 1, value: task.value(step), step };
      writes.push(w);
      items.push({ type: "edge", id: `out${col}`, kind: "write" }, { type: "card", ...w }, { type: "edge", id: `in${col + 1}`, kind: "write" });
      count = 0;
    }
    col++; row = 0;
  };
  for (let n = 1; n <= total; n++) {
    // hopEnd: the last row of a multi-row step, where a capsule groups the step's rows
    const hopEnd = task.rows > 1 && n % task.rows === 0 ? task.rows : 0;
    items.push({ type: "node", id: `h${col}_${row}`, count: ++count, hopEnd, label: hopEnd ? task.value(n / task.rows) : null });
    if (n === total) break;
    if (row < g.R - 1) { items.push({ type: "edge", id: `v${col}_${row}`, kind: "climb" }); row++; continue; }
    cross(n / task.rows); // R is a multiple of task.rows, so a column always ends on a whole step
  }
  // The finished value still rides the residual stream up to the top of its column to be emitted (no new work).
  for (; row < g.R - 1; row++) {
    items.push({ type: "edge", id: `v${col}_${row}`, kind: "climb" }, { type: "node", id: `h${col}_${row + 1}`, count: null });
  }
  // Coconut: if the next positions are continuous thoughts, the finished value rides through them (no new work).
  while (g.latentIn(col + 1)) {
    items.push({ type: "edge", id: `out${col}`, kind: "link" }, { type: "thought", col: col + 1 }, { type: "edge", id: `in${col + 1}`, kind: "link" });
    col++;
    for (let r = 0; r < g.R; r++) {
      items.push({ type: "node", id: `h${col}_${r}`, count: null });
      if (r < g.R - 1) items.push({ type: "edge", id: `v${col}_${r}`, kind: "climb" });
    }
  }
  const answer = { col: col + 1, value: task.answer(k), plain: task.value(k), step: k, answer: true };
  items.push({ type: "edge", id: `out${col}`, kind: "write" }, { type: "card", ...answer });
  return { items, writes, answer, ticks: false };
}

// ---------------- geometry ----------------
const W = NARROW ? 470 : 720, H = 548;
const M = { left: 70, right: 22 };
const WIN = { x0: M.left - 16, x1: W - M.right + 6, y0: 12, y1: 446 };   // the glass window
const colW = (W - M.left - M.right) / T;
const colX = (t) => M.left + colW * t + colW / 2;
const stackBottom = 404, stackTop = 96;
const rowGap = (R) => Math.min(100, (stackBottom - stackTop) / (R - 1));
const rowY = (r, R) => stackBottom - r * rowGap(R);
const tileSize = (R) => Math.min(40, colW * 0.54, rowGap(R) * 0.58);
const badgeR = (R) => Math.max(8.5, Math.min(11.5, tileSize(R) * 0.3));
const cardY = WIN.y1 + 40;
const CARD = { w: colW - 12, h: 40 };

function pos(n, R) {
  return n.row < 0 ? { x: colX(n.col), y: cardY } : { x: colX(n.col), y: rowY(n.row, R) };
}

// Orthogonal route with rounded corners, for edges that leave the top of a column.
function rounded(pts, r = 10) {
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
    const a = Math.min(r, Math.hypot(x1 - x0, y1 - y0) / 2), b = Math.min(r, Math.hypot(x2 - x1, y2 - y1) / 2);
    const u = [(x0 - x1) / Math.hypot(x0 - x1, y0 - y1), (y0 - y1) / Math.hypot(x0 - x1, y0 - y1)];
    const v = [(x2 - x1) / Math.hypot(x2 - x1, y2 - y1), (y2 - y1) / Math.hypot(x2 - x1, y2 - y1)];
    d += ` L${x1 + u[0] * a},${y1 + u[1] * a} Q${x1},${y1} ${x1 + v[0] * b},${y1 + v[1] * b}`;
  }
  const [xe, ye] = pts.at(-1);
  return d + ` L${xe},${ye}`;
}

function edgePath(e, g) {
  const s = pos(g.byId.get(e.s), g.R), t = pos(g.byId.get(e.t), g.R);
  const top = rowY(g.R - 1, g.R) - tileSize(g.R) / 2 - 12;
  if (e.id.startsWith("out")) {           // up, right into the gutter, down out of the glass to the next column's card
    const gx = s.x + colW / 2;
    return rounded([[s.x, s.y], [s.x, top], [gx, top], [gx, cardY], [t.x - CARD.w / 2, cardY]]);
  }
  if (e.id.startsWith("fb")) {            // up, right, down the gutter, straight into the next column's first layer
    const gx = s.x + colW / 2 + 7;
    return rounded([[s.x, s.y], [s.x, top - 8], [gx, top - 8], [gx, t.y], [t.x, t.y]]);
  }
  if (e.id.startsWith("in")) return `M${s.x},${s.y - CARD.h / 2}L${t.x},${t.y}`;
  if (e.kind === "attn") {                // a gentle S from a state to one a layer up and some columns right
    const k = (s.y - t.y) * 0.85;
    return `M${s.x},${s.y} C${s.x},${s.y - k} ${t.x},${t.y + k} ${t.x},${t.y}`;
  }
  return `M${s.x},${s.y}L${t.x},${t.y}`;
}

// The pulse's way through a card: in at the left edge, to the middle, and (unless it's the answer) out the top.
function cardPath(col, last) {
  const x = colX(col);
  return `M${x - CARD.w / 2},${cardY}L${x},${cardY}` + (last ? "" : `L${x},${cardY - CARD.h / 2}`);
}

// ---------------- rendering ----------------
const svg = d3.select("#stage").attr("viewBox", `0 0 ${W} ${H}`);
// Shared defs (glass gradient, paper shadows, glows, arrowhead) live in their own always-rendered SVG: kit/web/glass.js.
installGlassDefs(d3, { overseerInk: KI.overseer });

// clip regions: inside the glass (window + any glass slots in the card row) and outside it, on paper
const sdefs = svg.append("defs");
const clipWin = sdefs.append("clipPath").attr("id", "clip-win");
const clipOut = sdefs.append("clipPath").attr("id", "clip-out").append("path").attr("clip-rule", "evenodd");
function setClips(slots) {
  const rects = [[WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0], ...slots.map((c) => [colX(c) - CARD.w / 2, cardY - CARD.h / 2, CARD.w, CARD.h])];
  clipWin.selectAll("rect").data(rects).join("rect").attr("x", (r) => r[0]).attr("y", (r) => r[1]).attr("width", (r) => r[2]).attr("height", (r) => r[3]);
  clipOut.attr("d", `M-50,-50H${W + 50}V${H + 50}H-50Z` + rects.map(([x, y, w, h]) => `M${x},${y}h${w}v${h}h${-w}Z`).join(""));
}

// camera (for the zoom out of one state), then z-order: glass, structure, the story's trail under the tiles,
// the pulse under the cards (it vanishes into text)
const gCam = svg.append("g");
const [gWin, gBands, gEdges, gTrail, gNodes, gRoute, gPulse, gCards, gOver, gAnno, gHover] = d3.range(11).map(() => gCam.append("g"));
gHover.style("pointer-events", "none");
gWin.append("rect").attr("x", WIN.x0).attr("y", WIN.y0).attr("width", WIN.x1 - WIN.x0).attr("height", WIN.y1 - WIN.y0).attr("rx", 14)
  .attr("fill", "url(#glass-fill)").attr("stroke", K.win);
// the paper transcript strip under the window: a faint baseline the cards sit on
gWin.append("line").attr("x1", WIN.x0).attr("x2", WIN.x1).attr("y1", cardY + CARD.h / 2 + 7).attr("y2", cardY + CARD.h / 2 + 7)
  .attr("stroke", KI.rule).attr("stroke-width", 1);
gWin.append("text").attr("x", WIN.x1).attr("y", cardY + CARD.h / 2 + 24).attr("text-anchor", "end").attr("fill", KI.ink3)
  .style("font", `500 13px ${FONT.mono}`).attr("letter-spacing", "0.1em").text("TRANSCRIPT");

// monitor: an eye on the paper, reading the token row
const eye = gAnno.append("g").attr("transform", `translate(${M.left - 44},${cardY})`);
const eyeLid = eye.append("path").attr("d", "M-16,0 Q0,-12 16,0 Q0,12 -16,0Z").attr("fill", KI.card)
  .attr("stroke", KI.overseer).attr("stroke-width", 2.4);
const pupil = eye.append("circle").attr("r", 4.5).attr("fill", KI.overseer);
gAnno.append("text").attr("x", M.left - 44).attr("y", cardY + 40).attr("text-anchor", "middle")
  .attr("fill", KI.overseer).style("font", `600 16px ${FONT.sans}`).text("monitor");

const readDark = d3.select("#read-dark"), readForced = d3.select("#read-forced"), readNeed = d3.select("#read-need");
const chainStrip = d3.select("#chain");

// Depth profile: the longest dark path ending at the top of each column, i.e. how much serial work can reach
// that column's output without passing through text. Its maximum is the "longest dark path" readout.
const gProfile = gAnno.append("g");
gProfile.append("text").attr("class", "plabel").attr("x", M.left - 44).attr("y", 38).attr("dy", "0.36em")
  .attr("text-anchor", "middle").attr("fill", KI.ink2).style("font", `500 14px ${FONT.mono}`).text("depth");

function stateFor(i) {
  const s = STEPS[i] ?? controlsState();
  return { task: "arith", path: true, profile: true, hold: false, ...s, loops: s.arch === "looped" ? s.loops : 1 };
}

let prevKey = null, lastDark = null, token = 0, cur = null;

// Scenes other than the DAG draw into #chart (or show #board); the DAG's own readouts, strip and legend hide.
// [class, head, detail, keep detail on phones]
const BADGE = {
  schematic: ["schematic", "schematic", "real states: gelu-4l"],
  reused: ["schematic", "schematic", "reused gelu-4l states"],
  plain: ["schematic", "schematic"],
  real: ["real", "real", `${META.model} · layer ${TILES.zoom.layer}`, true],
  replot: ["real", "real", "re-plotted, approx."],
  counts: ["real", "real", "counts from the report"],
  sources: ["real", "real", "quotes from sources"],
};
function setScene(scene) {
  const dag = scene === "dag";
  d3.selectAll("#stage, .readouts, #chain, .legend").style("display", dag ? null : "none");
  d3.select("#chart").style("display", ["chart", "diffusion", "readers", "anatomy"].includes(scene) ? null : "none");
  d3.select("#board").style("display", scene === "board" ? null : "none");
}

function render(i, prev, opts = {}) {
  const s0 = stateFor(i);
  const scene = s0.scene ?? "dag";
  // squares are the real states under them only in the standard arithmetic figures; elsewhere they are reused
  const defBadge = scene === "dag" ? (s0.arch === "standard" && s0.task !== "hops" ? "schematic" : "reused")
    : scene === "diffusion" || scene === "readers" ? "reused" : "plain";
  const [cls, head, detail, keep] = BADGE[s0.badge ?? defBadge];
  d3.select("#fig-badge").attr("class", `badge ${cls}`)
    .html(`${head}${detail ? `<span class="${keep ? "b-keep" : "b-detail"}"> · ${detail}</span>` : ""}`);
  d3.select("#fig-num").text(`Fig. ${i + 1}`);
  d3.select("#fig-title").text(s0.title ?? freeTitle(s0));
  setScene(scene);
  if (scene === "dag") return renderDag(i, s0, { ...opts, from: prev >= 0 ? stateFor(prev).scene ?? "dag" : null });
  ++token;                                  // cancel any DAG story still animating
  svg.selectAll("g.story").interrupt().remove();
  prevKey = null;                           // coming back to the DAG re-lays it out from scratch
  const quick = opts.instant || REDUCED;
  const chart = d3.select("#chart");
  const o = { K, KI, font: FONT, quick };
  if (scene === "chart") return drawChart(chart, s0.chart, { pre: s0.pre, ...o });
  if (scene === "diffusion") return drawDiffusion(chart, { mode: s0.mode, ...o });
  if (scene === "readers") return drawReaders(chart, { latent: s0.latent, ...o });
  if (scene === "anatomy") return drawAnatomy(chart, o);
  return Promise.resolve();
}

function renderDag(i, s, { instant = false, from = null } = {}) {
  const task = TASKS[s.task];
  const g = buildGraph(s);
  const dark = longestDarkPath(g);
  const key = `${s.arch}|${s.loops}`;
  const relayout = prevKey !== null && key !== prevKey;
  prevKey = key;
  const quick = instant || REDUCED;
  const t = svg.transition().duration(quick ? 0 : 750).ease(d3.easeCubicInOut);

  // camera: arriving from the anatomy scene, start zoomed in on the state it showed, then pull back
  let camDelay = 0;
  gCam.interrupt();
  if (s.zoomFrom && from === "anatomy" && !quick && s.zoomFrom[0] < T) {
    const [c, r] = s.zoomFrom, p = { x: colX(c), y: rowY(r, g.R) }, k = 3.4;
    gCam.attr("transform", `translate(${W / 2 - k * p.x},${H / 2 - k * p.y}) scale(${k})`)
      .transition().delay(250).duration(1500).ease(d3.easeCubicInOut).attr("transform", "translate(0,0) scale(1)");
    camDelay = 1500;
  } else gCam.attr("transform", null);

  cur = { g, dark, auto: null, noHover: !!s.darkHidden };
  hidePast();
  drawGraph(g, s, t, { fresh: camDelay > 0 });
  drawProfile(g, dark, s, t);
  const chain = s.k ? chainStory(g, s.k, s.arch, task) : null;
  // hold: a "predict first" step. The task is posed (strip, needs) but the route isn't played until the next step.
  const story = s.hold ? null : chain ?? (s.path ? pathStory(g, dark, { zigzag: s.zigzag }) : null);

  // readouts: the dark path is a property of the architecture (it ticks up with the pulse only on the steps
  // that introduce it); "forced into text" fills in as the pulse reaches each card
  readNeed.text(s.k ? s.k * task.rows : "—");
  d3.select("#ro-need .unit").text(s.task === "hops" ? `rows (${s.k} lookups × 2)` : "in a row");
  if (story && s.darkHidden) story.ticks = false;   // predict step: don't show the answer in the readout
  d3.select("#ro-need").classed("idle", !s.k);
  d3.select("#ro-dark").classed("idle", !story && !s.hold);
  readDark.interrupt();
  if (s.darkHidden) { readDark.text("?"); lastDark = null; }
  else if (s.hold) { readDark.text(dark.length); lastDark = dark.length; }
  else if (!story) { readDark.text("?"); lastDark = null; }
  else if (story.ticks) { readDark.text(quick ? dark.length : 0); lastDark = dark.length; }
  else {
    const from0 = lastDark;
    lastDark = dark.length;
    if (quick || from0 === null || from0 === dark.length) readDark.text(dark.length);
    else readDark.transition().duration(750).textTween(() => d3.interpolateRound(from0, dark.length));
  }
  chainStrip.html(!s.k ? "" : (s.task === "hops" ? stripHops : stripArith)(s.k, chain, quick && !s.hold, s.hold));

  const done = playStory(story, g, s, task, { delay: quick ? 0 : camDelay + (relayout ? 800 : 300), quick, my: ++token });
  // legend: only what this step actually draws
  const shown = { tok: true, h: true, forced: !!story?.writes?.length, carry: !!story?.items?.some((it) => it.count === null),
                  lat: s.arch === "coconut", dark: !!story, attn: !!s.showAttn || !!s.zigzag || !!s.fanFocus, write: !!s.explainWrite,
                  hover: !!s.zigzag || i === FREE || !!s.autoPast };   // where the prose invites it
  d3.selectAll(".legend [data-key]").style("display", function () { return shown[this.dataset.key] ? null : "none"; });
  if (s.hold) readForced.html(`<span class="muted">predict first</span>`);
  syncControls(s, i);
  return Promise.all([t.end().catch(() => {}), done]);
}

// The base graph: structure only, no task.
function drawGraph(g, s, t, { fresh = false } = {}) {
  const R = g.R, ts = tileSize(R);
  const slots = g.nodes.filter((n) => n.kind === "latent").map((n) => n.col);
  setClips(slots);
  const lit = s.path === false;     // the first look at the graph: the states themselves are the subject

  // edges. Each is a pair of paths with the same shape: the part inside the glass and the part on paper.
  const edgeStyle = (e) => {
    if (e.kind === "dark-link") return { glass: K.residual, ink: KI.residual, w: 1.8, o: 0.6, dash: "5 4" };
    if (e.kind === "write") return s.explainWrite ? { glass: "#8d9ab0", ink: KI.ink3, w: 1.5, o: 1, dash: null }
                                                  : { glass: "#2e3a4f", ink: KI.rule, w: 1.2, o: 1, dash: "2 4" };
    if (e.kind === "in") return { glass: "#3b4a60", ink: KI.rule, w: 1.3, o: 1, dash: null };
    if (e.kind === "attn") {
      if (s.fanFocus) return e.t === `h${s.fanFocus[0]}_${s.fanFocus[1]}` ? { glass: "#9cc0f5", ink: KI.rule, w: 1.5, o: 1, dash: null }
                                                                         : { glass: K.fan, ink: KI.rule, w: 0.9, o: 0.32, dash: null };
      return s.showAttn ? { glass: K.fanHi, ink: KI.rule, w: 1.05, o: 0.62, dash: null } : { glass: K.fan, ink: KI.rule, w: 0.9, o: lit ? 0.55 : 0.4, dash: null };
    }
    return { glass: K.line, ink: KI.rule, w: 1.6, o: 1, dash: null };
  };
  gEdges.selectAll("g.edge").data(g.edges, (e) => e.id).join(
    (enter) => {
      const eg = enter.append("g").attr("class", "edge").attr("opacity", 0);
      eg.append("path").attr("class", "in-glass").attr("fill", "none").attr("clip-path", "url(#clip-win)").attr("d", (e) => edgePath(e, g));
      eg.append("path").attr("class", "on-paper").attr("fill", "none").attr("clip-path", "url(#clip-out)").attr("d", (e) => edgePath(e, g));
      return eg;
    },
    (update) => update,
    (exit) => exit.transition(t).attr("opacity", 0).remove(),
  ).each(function (e) {
    const st = edgeStyle(e), sel = d3.select(this);
    sel.transition(t).attr("opacity", st.o);
    sel.select(".in-glass").attr("stroke-dasharray", st.dash).transition(t).attr("d", edgePath(e, g)).attr("stroke", st.glass).attr("stroke-width", st.w);
    sel.select(".on-paper").attr("stroke-dasharray", st.dash).transition(t).attr("d", edgePath(e, g)).attr("stroke", st.ink).attr("stroke-width", st.w);
  });

  // hidden states: squares of real numbers
  const tiles = gNodes.selectAll("g.tile").data(g.nodes.filter((n) => n.kind === "h"), (n) => n.id).join((enter) => {
    const tg = enter.append("g").attr("class", "tile").attr("opacity", 0)
      .attr("transform", (n) => `translate(${pos(n, R).x},${pos(n, R).y})`);
    tg.append("rect").attr("class", "back").attr("rx", 3).attr("fill", "#02050b");
    tg.append("image").attr("preserveAspectRatio", "none").style("image-rendering", "pixelated")
      .attr("href", (n) => tileURL(stateAt(n.col, n.row)));
    tg.append("rect").attr("class", "edge").attr("rx", 3).attr("fill", "none").attr("stroke", "#3d5a86").attr("stroke-width", 1);
    return tg;
  }, (update) => update, (exit) => exit.transition(t).attr("opacity", 0).remove());
  tiles.style("cursor", "crosshair")
    .on("pointerenter", (ev, n) => showPast(n)).on("pointerleave", hidePast)
    .on("click", (ev, n) => { ev.stopPropagation(); showPast(n); });
  // arriving by camera, the states are already there when the shot opens; otherwise they fade into place
  if (fresh) tiles.interrupt().attr("transform", (n) => `translate(${pos(n, R).x},${pos(n, R).y})`).attr("opacity", lit ? 0.92 : 0.5);
  else tiles.transition(t).attr("transform", (n) => `translate(${pos(n, R).x},${pos(n, R).y})`).attr("opacity", lit ? 0.92 : 0.5);
  tiles.select("image").transition(t).attr("x", -ts / 2).attr("y", -ts / 2).attr("width", ts).attr("height", ts);
  tiles.selectAll("rect").transition(t).attr("x", -ts / 2 - 1).attr("y", -ts / 2 - 1).attr("width", ts + 2).attr("height", ts + 2);

  // the transcript: cards on paper; a continuous thought is a glass slot holding the state fed back
  const cards = gCards.selectAll("g.card").data(g.nodes.filter((n) => n.row < 0), (n) => n.id).join((enter) => {
    const c = enter.append("g").attr("class", "card").attr("transform", (n) => `translate(${colX(n.col)},${cardY})`);
    c.append("rect").attr("class", "face").attr("x", -CARD.w / 2).attr("y", -CARD.h / 2).attr("width", CARD.w).attr("height", CARD.h).attr("rx", 6);
    c.append("image").attr("preserveAspectRatio", "none").style("image-rendering", "pixelated").attr("opacity", 0);
    c.append("text").attr("text-anchor", "middle").attr("dy", "0.36em");
    return c;
  });
  const slotTs = Math.min(CARD.h - 10, 30);
  cards.select("rect.face").attr("filter", (n) => (n.kind === "latent" ? null : "url(#card-shadow)"))
    .transition(t)
    .attr("fill", (n) => (n.kind === "latent" ? "#070a10" : KI.card))
    .attr("stroke", (n) => (n.kind === "latent" ? K.residual : KI.rule))
    .attr("stroke-width", (n) => (n.kind === "latent" ? 1.6 : 1))
    .attr("stroke-dasharray", (n) => (n.kind === "latent" ? "4 3" : null));
  // the slot shows the state it receives: the top state of the previous column, fed back as input
  cards.select("image").attr("href", (n) => (n.col > 0 ? tileURL(stateAt(n.col - 1, R - 1)) : null))
    .attr("x", -slotTs / 2).attr("y", -slotTs / 2).attr("width", slotTs).attr("height", slotTs)
    .transition(t).attr("opacity", (n) => (n.kind === "latent" ? 1 : 0));
  cards.select("text")
    .style("font", `600 20px ${FONT.mono}`).attr("fill", KI.ink)
    .text((n) => (n.kind === "latent" ? "" : n.col === 0 ? "Q" : "…"));

  // where the prose explains it, name the edge every later architecture edits: top of a column -> the next card
  gAnno.selectAll("g.write-label").remove();
  if (s.explainWrite) {
    const x = colX(0) + colW / 2, y = rowY(R - 1, R) - ts / 2 - 12;
    const lab = pill(gAnno.append("g").attr("class", "write-label"), x + 8, y - 16, "the sampled token becomes the next column's input",
      { color: "#c9d3e2", anchor: "start" });
    lab.select("text").style("font", `500 ${NARROW ? 14 : 13}px ${FONT.sans}`);
    const bb = lab.select("text").node().getBBox();
    lab.select("rect").attr("x", bb.x - 6).attr("y", bb.y - 3).attr("width", bb.width + 12).attr("height", bb.height + 6);
  }
  // with one state's fan in focus, ring that state
  gAnno.selectAll("g.fan-focus").remove();
  if (s.fanFocus) {
    const p = pos(g.byId.get(`h${s.fanFocus[0]}_${s.fanFocus[1]}`), R);
    gAnno.append("g").attr("class", "fan-focus").append("rect").attr("x", p.x - ts / 2 - 5).attr("y", p.y - ts / 2 - 5)
      .attr("width", ts + 10).attr("height", ts + 10).attr("rx", 6).attr("fill", "none").attr("stroke", "#9cc0f5").attr("stroke-width", 1.6);
  }

  // one band per pass of the same L layers, so "looped" reads as the same stack reused
  const passes = s.arch === "looped" ? d3.range(s.loops) : [];
  const gap = rowGap(R);
  const bands = gBands.selectAll("g.band").data(passes, (p) => p).join((enter) => {
    const b = enter.append("g").attr("class", "band").attr("opacity", 0);
    b.append("rect").attr("rx", 8);
    b.append("text").attr("text-anchor", "middle").style("font", `500 14px ${FONT.mono}`).attr("fill", KI.ink2);
    return b;
  }, (u) => u, (exit) => exit.transition(t).attr("opacity", 0).remove());
  bands.transition(t).attr("opacity", 1);
  bands.select("rect").transition(t)
    .attr("x", WIN.x0 + 6).attr("width", WIN.x1 - WIN.x0 - 12)
    .attr("y", (p) => rowY((p + 1) * L - 1, R) - gap * 0.44)
    .attr("height", (L - 1) * gap + gap * 0.88)
    .attr("fill", (p) => (p % 2 ? "#0f1726" : "#131d30")).attr("opacity", 0.9);
  bands.select("text").text((p) => `pass ${p + 1}`)
    .attr("transform", (p) => `translate(${M.left - 44},${(rowY(p * L, R) + rowY((p + 1) * L - 1, R)) / 2}) rotate(-90)`);
}

function drawProfile(g, dark, s, t) {
  const cols = s.profile ? d3.range(T) : [];
  gProfile.select(".plabel").transition(t).attr("opacity", s.profile ? 1 : 0);
  gProfile.selectAll("text.p").data(cols, (c) => c).join(
    (enter) => enter.append("text").attr("class", "p").attr("x", colX).attr("y", 38).attr("dy", "0.36em")
      .attr("text-anchor", "middle").style("font", `600 17px ${FONT.mono}`).attr("opacity", 0),
    (update) => update,
    (exit) => exit.transition(t).attr("opacity", 0).remove(),
  ).text((c) => dark.depth.get(`h${c}_${g.R - 1}`))
    .attr("fill", (c) => (dark.depth.get(`h${c}_${g.R - 1}`) === dark.length ? K.residual : K.muted))
    .transition(t).attr("opacity", 1);
}

// ---------------- the story, animated ----------------
const SPEED = { climb: 0.3, link: 0.85, write: 1.05 }; // viewBox units per ms
const DWELL = { card: 520, answer: 560, thought: 280 }; // ms spent passing through a card

function playStory(story, g, s, task, { delay, quick, my }) {
  svg.selectAll("g.story").interrupt().transition().duration(quick ? 0 : 200).attr("opacity", 0).remove();
  pupil.interrupt().attr("cx", 0);
  const layer = (parent) => parent.append("g").attr("class", "story");
  const trail = layer(gTrail), route = layer(gRoute), over = layer(gOver), pulseG = layer(gPulse);
  const R = g.R, ts = tileSize(R), rb = badgeR(R);
  const P = (id) => pos(g.byId.get(id), R);

  if (s.ghostZig) {  // a route that wanders sideways, drawn but not counted: the predict asks how long it is
    const ids = zigNodes();
    const d = ids.slice(1).map((id, j) => edgePath(g.edgeById.get(zigEdges()[j]), g)).join(" ");
    trail.append("path").attr("d", d).attr("fill", "none").attr("stroke", K.residual).attr("stroke-width", 2.6)
      .attr("stroke-dasharray", "7 6").attr("opacity", 0.95);
    ids.forEach((id) => { const p = P(id);
      route.append("rect").attr("x", p.x - ts / 2 - 4).attr("y", p.y - ts / 2 - 4).attr("width", ts + 8).attr("height", ts + 8).attr("rx", 5)
        .attr("fill", "none").attr("stroke", K.residual).attr("stroke-width", 2).attr("stroke-dasharray", "4 3"); });
    const e = P(ids.at(-1));
    const lab = over.append("g").attr("transform", `translate(${e.x - ts / 2 - 10},${e.y + ts / 2 + 22})`);
    lab.append("text").attr("text-anchor", "end").attr("fill", K.residual).style("font", `italic 500 21px ${FONT.display}`).text("length?");
  }
  if (s.emptyCapsules) {  // two lookups fit in one trip: show their slots before asking
    const x = colX(0);
    [[0, 1], [2, 3]].forEach(([r0, r1]) => {
      const yTop = rowY(r1, R), yLow = rowY(r0, R);
      trail.append("rect").attr("x", x - ts / 2 - 7).attr("width", ts + 14).attr("y", yTop - ts / 2 - 7).attr("height", yLow - yTop + ts + 14)
        .attr("rx", 10).attr("fill", "none").attr("stroke", K.residual).attr("stroke-width", 1.5).attr("stroke-dasharray", "5 4");
      pill(over, x + ts / 2 + 12, (yTop + yLow) / 2, "lookup", { color: K.muted, anchor: "start" });
    });
  }
  if (!story) { readForced.html(`<span class="muted">no task yet</span>`); return Promise.resolve(); }
  const at = (ms, fn) => (quick ? fn() : d3.timeout(() => my === token && fn(), ms));
  const seen = [];
  let longest = 0;  // the dark-path readout ticks up to the longest route shown so far, never back down
  const showForced = (final) => {
    if (!story.answer) return readForced.html(`<span class="muted">no task yet</span>`);
    const vals = seen.map((w) => `<b class="hl">${w.value}</b>`).join(", ");
    if (!final) return readForced.html(vals ? `${vals} <span class="muted">…</span>` : `<span class="muted">…</span>`);
    readForced.html(!story.writes.length
      ? `<b>nothing</b> <span class="muted">but the answer, ${story.answer.plain}</span>`
      : `${vals} <span class="muted">then the answer, ${story.answer.plain}</span>`);
  };
  showForced(false);

  // build the legs and a timeline
  const legs = [];
  let clock = delay;
  for (const it of story.items) {
    if (it.type === "node") { const t0 = clock; at(t0, () => lightNode(it)); continue; }
    if (it.type === "jump") { legs.push({ jump: P(it.id), dur: 500 }); clock += 500; continue; }
    const d = it.type === "edge" ? edgePath(g.edgeById.get(it.id), g) : cardPath(it.col, it.answer);
    const kind = it.type === "edge" ? it.kind : it.type === "thought" ? "link" : "write";
    const probe = trail.append("path").attr("d", d).attr("fill", "none").attr("stroke", "none");
    const len = probe.node().getTotalLength();
    const dur = it.type === "edge" ? len / SPEED[kind] : DWELL[it.answer ? "answer" : it.type];
    if (it.type !== "card") {
      // light trails: blue in the glass; a write is gold, glass gold inside the window and ink gold on paper
      const parts = kind === "write"
        ? [[K.overseer, "url(#clip-win)", 3], [KI.overseer, "url(#clip-out)", 2.6]]
        : [[K.residual, "url(#clip-win)", 3.4], [KI.residual, "url(#clip-out)", 2.6]];
      for (const [color, clip, w] of parts) {
        const p = trail.append("path").attr("d", d).attr("fill", "none").attr("stroke", color).attr("stroke-width", w)
          .attr("clip-path", clip).attr("filter", kind !== "write" && clip === "url(#clip-win)" ? "url(#glow)" : null);
        if (!quick) p.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len)
          .transition().delay(clock).duration(dur).ease(d3.easeLinear).attr("stroke-dashoffset", 0);
      }
    }
    if (it.type === "card") { const t0 = clock; at(t0, () => lightCard(it)); }
    legs.push({ path: probe.node(), len, dur, kind });
    clock += dur;
  }
  at(clock, () => showForced(true));
  if (s.autoPast) at(clock + 250, () => { if (cur) { cur.auto = g.byId.get(`h${s.autoPast === "last" ? T - 1 : s.autoPast[0]}_${R - 1}`); showPast(cur.auto); } });

  function lightNode(it) {
    const n = g.byId.get(it.id), { x, y } = P(it.id);
    const tg = route.append("g").attr("transform", `translate(${x},${y})`);
    const face = () => {
      tg.append("image").attr("href", tileURL(stateAt(n.col, n.row))).attr("x", -ts / 2).attr("y", -ts / 2).attr("width", ts).attr("height", ts)
        .attr("preserveAspectRatio", "none").style("image-rendering", "pixelated");
    };
    if (it.count === null) {  // carried to the top (or through a continuous thought), no new work
      face();
      tg.append("rect").attr("x", -ts / 2 - 3).attr("y", -ts / 2 - 3).attr("width", ts + 6).attr("height", ts + 6).attr("rx", 4)
        .attr("fill", "none").attr("stroke", K.residual).attr("stroke-width", 1.6).attr("stroke-dasharray", "3 3");
      if (!quick) tg.attr("opacity", 0).transition().duration(160).attr("opacity", 1);
      return;
    }
    if (it.hopEnd) {  // one capsule per hop, around the rows it used
      const yLow = rowY(n.row - (it.hopEnd - 1), R);
      const cap = trail.append("rect").attr("x", x - ts / 2 - 8).attr("width", ts + 16).attr("y", y - ts / 2 - 8)
        .attr("height", yLow - y + ts + 16).attr("rx", 11)
        .attr("fill", "rgba(91,156,245,0.07)").attr("stroke", K.residual).attr("stroke-width", 1.4).attr("opacity", 0.9);
      if (!quick) cap.attr("opacity", 0).transition().duration(260).attr("opacity", 0.9);
      // what this hop found, in the gap between its two rows (blue italic: it exists only in the dark)
      const tag = pill(over, x, (y + yLow) / 2, it.label, { color: K.residual, italic: true });
      if (!quick) tag.attr("opacity", 0).transition().duration(260).attr("opacity", 1);
    }
    tg.append("rect").attr("x", -ts / 2 - 2).attr("y", -ts / 2 - 2).attr("width", ts + 4).attr("height", ts + 4).attr("rx", 4)
      .attr("fill", "#0a1322").attr("filter", "url(#tile-glow)");
    face();
    tg.append("rect").attr("x", -ts / 2 - 2).attr("y", -ts / 2 - 2).attr("width", ts + 4).attr("height", ts + 4).attr("rx", 4)
      .attr("fill", "none").attr("stroke", "#a9cbff").attr("stroke-width", 1.6);
    const b = tg.append("g").attr("transform", `translate(${ts / 2 + 1},${-ts / 2 - 1})`);
    b.append("circle").attr("r", rb).attr("fill", K.residual).attr("stroke", "#060910").attr("stroke-width", 2);
    b.append("text").attr("class", "count").attr("text-anchor", "middle").attr("dy", "0.36em").attr("fill", "#060910")
      .style("font", `700 ${Math.round(rb * 1.12)}px ${FONT.mono}`).text(it.count);
    if (story.ticks && it.count > longest) readDark.text((longest = it.count));
    if (!quick) {
      tg.attr("opacity", 0).transition().duration(170).attr("opacity", 1);
      // a flash as the pulse passes through the state
      tg.append("rect").attr("x", -ts / 2).attr("y", -ts / 2).attr("width", ts).attr("height", ts).attr("fill", "#dcecff").attr("opacity", 0.75)
        .transition().duration(420).attr("opacity", 0).remove();
    }
  }

  function lightCard(it) {
    const c = over.append("g").attr("transform", `translate(${colX(it.col)},${cardY})`);
    c.append("rect").attr("x", -CARD.w / 2).attr("y", -CARD.h / 2).attr("width", CARD.w).attr("height", CARD.h).attr("rx", 6)
      .attr("fill", KI.card).attr("stroke", it.answer ? KI.ink2 : KI.overseer).attr("stroke-width", it.answer ? 1.2 : 2)
      .attr("filter", "url(#card-shadow)");
    // forced: the monitor's highlighter swipes across the value
    let hl = null;
    if (!it.answer) hl = c.append("rect").attr("x", -CARD.w / 2 + 5).attr("y", -11).attr("height", 22).attr("rx", 3)
      .attr("fill", KI.highlight).attr("opacity", 0.85).attr("transform", "rotate(-1.5)").attr("width", quick ? CARD.w - 10 : 0);
    const label = c.append("text").attr("text-anchor", "middle").attr("dy", "0.36em").attr("fill", KI.ink)
      .style("font", `600 20px ${css(task.font)}`).text(it.value);
    const room = CARD.w - 10;
    if (label.node().getComputedTextLength() > room) label.attr("textLength", room).attr("lengthAdjust", "spacingAndGlyphs");
    if (!it.answer) { seen.push(it); showForced(false); }
    chainStrip.select(`[data-at="${it.answer ? "ans" : it.step}"]`).classed("off", false);
    if (quick) return;
    c.attr("opacity", 0).transition().duration(140).attr("opacity", 1);
    if (hl) hl.transition().delay(80).duration(380).ease(d3.easeCubicOut).attr("width", CARD.w - 10);
    pupil.interrupt().transition().duration(160).attr("cx", 5).transition().delay(300).duration(260).attr("cx", 0);
    eyeLid.interrupt().transition().duration(160).attr("stroke-width", 4).transition().duration(400).attr("stroke-width", 2.4);
  }

  if (quick) return Promise.resolve();
  // the pulse rides the legs in order
  const first = story.items.find((it) => it.type === "node");
  const p0 = P(first.id);
  const pulse = pulseG.append("circle").attr("r", 6).attr("fill", "#ffffff").attr("filter", "url(#glow)")
    .attr("transform", `translate(${p0.x},${p0.y})`).attr("opacity", 0);
  let tr = pulse.transition("pulse").delay(delay).duration(120).attr("opacity", 1);
  for (const leg of legs) {
    if (leg.jump) {  // start a new route: fade out, move, fade in
      tr = tr.transition().duration(200).attr("opacity", 0)
        .transition().duration(100).attr("transform", `translate(${leg.jump.x},${leg.jump.y})`)
        .transition().duration(200).attr("fill", "#ffffff").attr("opacity", 1);
      continue;
    }
    tr = tr.transition().duration(leg.dur).ease(d3.easeLinear)
      .attr("fill", leg.kind === "write" ? K.overseer : "#ffffff")
      .attrTween("transform", () => (u) => {
        const q = leg.path.getPointAtLength(u * leg.len);
        return `translate(${q.x},${q.y})`;
      });
  }
  tr.transition().duration(300).attr("opacity", 0);
  return new Promise((resolve) => d3.timeout(resolve, clock + 350));
}

// ---------------- the dark past of one state (hover or tap) ----------------
// Everything that can influence this state without passing through a readable card: walk the graph backwards and
// stop at tokens. In a standard transformer it's a wide band a few layers deep (attention adds width, not depth);
// with a dark link from the top of one column to the next, it reaches back through the whole transcript.
function showPast(n) {
  if (!cur || cur.noHover) return;
  const { g, dark } = cur, R = g.R, ts = tileSize(R);
  const preds = new Map();
  g.edges.forEach((e) => { if (!preds.has(e.t)) preds.set(e.t, []); preds.get(e.t).push(e.s); });
  const seen = new Set([n.id]), stack = [n.id];
  while (stack.length) {
    for (const src of preds.get(stack.pop()) ?? []) {
      if (seen.has(src) || g.byId.get(src).kind === "tok") continue;
      seen.add(src); stack.push(src);
    }
  }
  gHover.selectAll("*").remove();
  gHover.append("rect").attr("x", WIN.x0).attr("y", WIN.y0).attr("width", WIN.x1 - WIN.x0).attr("height", WIN.y1 - WIN.y0).attr("rx", 14)
    .attr("fill", "#02040a").attr("opacity", 0.66);
  let count = 0;
  for (const id of seen) {
    const m = g.byId.get(id), p = pos(m, R);
    if (m.kind === "latent") {   // a continuous thought on the way: its slot lights up too
      gHover.append("rect").attr("x", p.x - CARD.w / 2 - 3).attr("y", p.y - CARD.h / 2 - 3).attr("width", CARD.w + 6).attr("height", CARD.h + 6)
        .attr("rx", 8).attr("fill", "none").attr("stroke", K.residual).attr("stroke-width", 2);
      continue;
    }
    if (id !== n.id) count++;
    gHover.append("image").attr("href", tileURL(stateAt(m.col, m.row))).attr("x", p.x - ts / 2).attr("y", p.y - ts / 2).attr("width", ts).attr("height", ts)
      .attr("preserveAspectRatio", "none").style("image-rendering", "pixelated");
    gHover.append("rect").attr("x", p.x - ts / 2 - 1.5).attr("y", p.y - ts / 2 - 1.5).attr("width", ts + 3).attr("height", ts + 3).attr("rx", 3)
      .attr("fill", "none").attr("stroke", id === n.id ? "#ffffff" : K.residual).attr("stroke-width", id === n.id ? 2.4 : 1.2);
  }
  const p = pos(n, R), above = p.y > (WIN.y0 + WIN.y1) / 2, y = above ? p.y - ts / 2 - 22 : p.y + ts / 2 + 22;
  const tag = pill(gHover, p.x, y, `${count} drawn states reach it in the dark · longest route: ${dark.depth.get(n.id)}`, { color: K.text });
  tag.select("text").style("font", `500 ${NARROW ? 13.5 : 14}px ${FONT.sans}`);
  const bb = tag.select("text").node().getBBox();
  tag.select("rect").attr("x", bb.x - 8).attr("y", bb.y - 4).attr("width", bb.width + 16).attr("height", bb.height + 8).attr("fill", "#0b1220").attr("stroke", K.residual);
  // keep the label inside the glass, whatever its length
  const half = bb.width / 2 + 10, x = Math.max(WIN.x0 + half, Math.min(WIN.x1 - half, p.x));
  tag.attr("transform", `translate(${x},${y})`);
}
function hidePast() { gHover.selectAll("*").remove(); if (cur?.auto) showPast(cur.auto); }
svg.on("click", () => hidePast());

// a label on a dark pill, inside the glass
function pill(parent, x, y, text, { color, anchor = "middle", italic = false }) {
  const tag = parent.append("g").attr("transform", `translate(${x},${y})`);
  const txt = tag.append("text").attr("text-anchor", anchor).attr("dy", "0.34em").attr("fill", color)
    .style("font", `${italic ? "italic " : ""}500 ${NARROW ? 18 : 17}px ${FONT.display}`).text(text);
  const bb = txt.node().getBBox();
  tag.insert("rect", "text").attr("x", bb.x - 6).attr("y", bb.y - 1).attr("width", bb.width + 12).attr("height", bb.height + 2)
    .attr("rx", 5).attr("fill", "#070b12").attr("stroke", color).attr("stroke-width", 1).attr("stroke-opacity", 0.45);
  return tag;
}

// ---------------- the chain strip under the figure ----------------
function stripArith(k, story, quick, hold) {
  const forced = new Set(hold ? [] : story.writes.map((w) => w.step));
  const off = quick ? "" : " off";
  let h = `<span class="v">${START}</span>`;
  for (let i = 1; i <= k; i++) {
    const [o, n] = OPS[i - 1];
    h += ` <span class="op">${o}${n}</span>`;
    if (forced.has(i)) h += ` <span class="chip w${off}" data-at="${i}">${VALUES[i]}</span>`;
  }
  return h + (hold ? ` <span class="op">= ?</span>` : ` <span class="chip a${off}" data-at="ans">=${VALUES[k]}</span>`);
}

// Hops: every intermediate answer is shown, in blue where it stays in the dark and as a chip where it's forced out.
function stripHops(k, story, quick, hold) {
  const forced = new Set(hold ? [] : story.writes.map((w) => w.step));
  const off = quick ? "" : " off";
  let h = `<span class="v">${NARROW ? "Nobel '92" : HOP_START}</span>`;
  for (let i = 1; i <= k; i++) {
    const hop = HOPS[i - 1];
    h += ` <span class="op">→ ${NARROW ? hop.short : hop.rel}</span> `;
    if (i === k) h += hold ? `<span class="op">?</span>` : `<span class="chip a${off}" data-at="ans">${hop.value}</span>`;
    else if (forced.has(i)) h += `<span class="chip w${off}" data-at="${i}">${hop.value}</span>`;
    else h += `<span class="hid">${hop.value}</span>`;
  }
  return h;
}

// ---------------- steps and controls ----------------
const ARCH_NAME = { standard: "Standard", looped: "Looped", coconut: "Coconut", fullbw: "Full bandwidth" };
const freeTitle = (s) => `${ARCH_NAME[s.arch]}${s.arch === "looped" ? ` ×${s.loops}` : ""} · ${s.task === "hops" ? "4-hop question" : `${s.k}-step chain`}`;
const STEPS = [
  { title: "A word and 512 numbers", scene: "anatomy", badge: "real" },
  { title: "An unrolled transformer", arch: "standard", k: 0, path: false, profile: false, zoomFrom: [6, 1], explainWrite: true },
  { title: "Counting a dark path", arch: "standard", k: 0, profile: false, fanFocus: [ZIG[2], 2], darkHidden: true, ghostZig: true }, // predict
  { title: "Sideways doesn't help", arch: "standard", k: 0, zigzag: true, autoPast: "last" },  // every hop climbs a layer
  { title: "A 10-step chain", arch: "standard", k: 10, hold: true },                         // predict
  { title: "Forced into text", arch: "standard", k: 10 },                                    // two are forced
  { title: "A 4-hop question", arch: "standard", k: 4, task: "hops", hold: true, emptyCapsules: true }, // predict
  { title: "Whatever lands at the top", arch: "standard", k: 4, task: "hops" },              // only 23
  { title: "Looped ×2", arch: "looped", loops: 2, k: 10 },
  { title: "Coconut: two continuous thoughts", arch: "coconut", k: 10 },
  { title: "Full bandwidth", arch: "fullbw", k: 10, autoPast: "last" },
  null, // free play
  // Chapter IV: pressure
  { title: "Train against the monitor", scene: "chart", chart: "baker", pre: true, badge: "replot" },
  { title: "Two ways to earn the reward", scene: "chart", chart: "baker", badge: "replot" },
  { title: "Pressure finds the dark path", scene: "chart", chart: "kuhn", badge: "replot" },
  { title: "When the hint needs math", scene: "chart", chart: "emmons", pre: true, badge: "replot" },
  { title: "Unfaithful, but only when it's easy", scene: "chart", chart: "emmons", badge: "replot" },
  // Chapter V: diffusion
  { title: "One canvas, many passes", scene: "diffusion", mode: "hold" },
  { title: "A wire around the cards", scene: "diffusion", mode: "opaque" },
  { title: "Label the wire readable", scene: "diffusion", mode: "readable" },
  // Chapter VI: what's left
  { title: "Readers of hidden states", scene: "readers", latent: false },
  { title: "When the text goes away", scene: "readers", latent: true },
  { title: "The evidence board: GPT-6 Astra", scene: "board", badge: "sources" },
  { title: "Check yourself", arch: "standard", k: 0, zigzag: true },
  { title: "What this doesn't show", arch: "standard", k: 10 },
];
// the prologue (step 0) is the hook; it comes before everything else
STEPS.unshift({ title: "Why reading thoughts matters", scene: "chart", chart: "incident", badge: "counts" });

const ctl = { arch: "standard", loops: 2, task: "arith", k: { arith: 12, hops: 4 } };
function controlsState() { return { arch: ctl.arch, loops: ctl.loops, task: ctl.task, k: ctl.k[ctl.task], path: true }; }
const archButtons = d3.selectAll("#controls [data-arch]"), taskButtons = d3.selectAll("#controls [data-task]");
const loopsInput = d3.select("#loops"), kInput = d3.select("#k");
const FREE = STEPS.indexOf(null);
const free = () => window.explainer?.current === FREE;

archButtons.on("click", function () { ctl.arch = this.dataset.arch; if (free()) render(FREE); });
taskButtons.on("click", function () { ctl.task = this.dataset.task; if (free()) render(FREE); });
loopsInput.attr("max", 3).on("input", function () { ctl.loops = +this.value; if (free()) render(FREE, null, { instant: true }); });
kInput.on("input", function () { ctl.k[ctl.task] = +this.value; if (free()) render(FREE, null, { instant: true }); });

function syncControls(s, i) {
  const live = i === FREE;
  d3.select("#controls").classed("live", live);
  archButtons.classed("on", function () { return this.dataset.arch === s.arch; }).attr("disabled", live ? null : "");
  taskButtons.classed("on", function () { return this.dataset.task === s.task; }).attr("disabled", live ? null : "");
  loopsInput.property("value", s.arch === "looped" ? s.loops : ctl.loops).attr("disabled", live && s.arch === "looped" ? null : "");
  kInput.attr("max", TASKS[s.task].max).property("value", s.k).attr("disabled", live ? null : "");
  d3.select("#k-label").text(TASKS[s.task].noun);
  d3.select("#loops-val").text(s.arch === "looped" ? `×${s.loops}` : "—");
  d3.select("#k-val").text(s.k);
}

// the prose quotes the size of the drawn graph, which is smaller on phones
document.querySelectorAll(".n-hidden").forEach((el) => { el.textContent = T * L; });
document.querySelectorAll(".n-cols").forEach((el) => { el.textContent = T; });
// the legend's hidden-state swatch is a real state too
document.querySelectorAll(".legend .sw-h").forEach((el) => { el.style.backgroundImage = `url(${tileURL(stateAt(2, 1))})`; });
mountHero(document.getElementById("hero-scene"), { K, KI, font: FONT });
mountSteps({ render });

// "Predict first" boxes: clicking a guess records it in the next step's answer and moves on to the reveal.
document.querySelectorAll(".guess").forEach((box) => box.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  e.stopPropagation();
  box.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
  const right = b.hasAttribute("data-correct"), echo = document.getElementById(box.dataset.echo);
  echo.textContent = `You said “${b.textContent}”. ${right ? "Right." : "Not quite."}`;
  echo.classList.toggle("right", right);
  window.explainer.goto(window.explainer.current + 1, { scroll: true });
}));
