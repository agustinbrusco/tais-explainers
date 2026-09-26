// How Many Steps Fit in the Dark? The core figure.
//
// The figure is a real DAG. The longest dark path is *computed* on the drawn graph (dynamic programming in
// topological order, with readable token nodes resetting the count), so every architecture is literally
// a graph edit, and the readouts follow from it.
//
// A task is then routed through the graph as a "story": a pulse climbs the route and numbers every hidden state
// it uses. Wherever the route has to cross a readable card, the card lights up gold, the monitor reads it, and
// the count starts again at 1. Two layers: the base graph (structure only) and the story drawn on top of it.

import * as d3 from "d3";
import { mountSteps } from "../../../kit/web/steps.js";
import { mountHero } from "./hero.js";
import { drawChart } from "./charts.js";
import { drawDiffusion } from "./diffusion.js";
import { drawReaders } from "./readers.js";

const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(`--${n}`).trim();
const K = Object.fromEntries(
  ["token", "residual", "overseer", "danger", "text", "muted", "faint", "grid", "surface", "raised", "bg"].map((n) => [n, css(n)]),
);
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
  { rel: "winner", value: "Walcott" },
  { rel: "day of birth", value: "23" },
  { rel: "Best Actress at that Oscars", value: "Holliday" },
  { rel: "day of birth", value: "21" },
];

const TASKS = {
  arith: { rows: 1, max: OPS.length, font: "font-mono", noun: "Chain length",
           value: (i) => String(VALUES[i]), answer: (k) => `=${VALUES[k]}` },
  hops: { rows: 2, max: HOPS.length, font: "font-sans", noun: "Hops",
          value: (i) => HOPS[i - 1].value, answer: (k) => HOPS[k - 1].value },
};

// ---------------- the model: graph construction (pure) ----------------
const T = NARROW ? 5 : 8; // token positions drawn
const L = 4;          // layers drawn per pass
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
      if (t > 0) edges.push({ id: `a${t}_${r}`, kind: "attn", s: `h${t - 1}_${r}`, t: `h${t}_${r + 1}` });
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

// ---------------- stories: what the pulse does ----------------
// A story is an ordered list of items: {node} (a hidden state used, with its running count), {edge} (a leg the
// pulse travels: "climb", "link" = dark link, "write" = into or out of a card), {card} (a forced write or the
// answer: the count resets) and {thought} (passing through a continuous-thought card: no reset).

// The dark path alone: the counter climbs with the pulse. With `zigzag`, a second route then tries to escape
// sideways through attention (one column right per layer) and tops out at the same count.
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
    const nodes = d3.range(L).map((r) => `h${r + 1}_${r}`);           // h1_0 → h2_1 → h3_2 → h4_3
    const edges = d3.range(L - 1).map((r) => `a${r + 2}_${r}`);
    items.push({ type: "jump", id: nodes[0] });
    walk(nodes, edges);
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
const W = NARROW ? 470 : 720, H = 520;
const M = { left: 64, right: 24, top: 56, bottom: 96 }; // top: room for the depth profile
const colW = (W - M.left - M.right) / T;
const colX = (t) => M.left + colW * t + colW / 2;
const cardY = H - M.bottom + 30;
const stackBottom = H - M.bottom - 24;
const stackSpan = stackBottom - (M.top + 10);
const rowGap = (R) => Math.min(95, stackSpan / (R - 1));
const rowY = (r, R) => stackBottom - r * rowGap(R);
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
  const top = rowY(g.R - 1, g.R) - 16;
  if (e.id.startsWith("out")) {           // up, right into the gutter, down to the next column's card
    const gx = s.x + colW / 2;
    return rounded([[s.x, s.y], [s.x, top], [gx, top], [gx, cardY], [t.x - CARD.w / 2, cardY]]);
  }
  if (e.id.startsWith("fb")) {            // up, right, down the gutter, straight into the next column's first layer
    const gx = s.x + colW / 2 + 7;
    return rounded([[s.x, s.y], [s.x, top - 8], [gx, top - 8], [gx, t.y], [t.x, t.y]]);
  }
  if (e.id.startsWith("in")) return `M${s.x},${s.y - CARD.h / 2}L${t.x},${t.y}`;
  return `M${s.x},${s.y}L${t.x},${t.y}`;
}

// The pulse's way through a card: in at the left edge, to the middle, and (unless it's the answer) out the top.
function cardPath(col, last) {
  const x = colX(col);
  return `M${x - CARD.w / 2},${cardY}L${x},${cardY}` + (last ? "" : `L${x},${cardY - CARD.h / 2}`);
}

// ---------------- rendering ----------------
const svg = d3.select("#stage").attr("viewBox", `0 0 ${W} ${H}`);
// Shared filters live in their own always-rendered SVG: Chrome drops elements whose filter sits inside a
// display:none SVG, and #stage is hidden whenever another scene is showing.
const defs = d3.select("body").append("svg").attr("width", 0).attr("height", 0).attr("aria-hidden", "true")
  .style("position", "absolute").append("defs");
// userSpaceOnUse: a perfectly vertical line has a zero-width bounding box, which would collapse the filter region.
defs.append("filter").attr("id", "paper").attr("x", "-20%").attr("y", "-20%").attr("width", "140%").attr("height", "160%")
  .html(`<feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#000" flood-opacity="0.45"/>`);
defs.append("filter").attr("id", "glow").attr("filterUnits", "userSpaceOnUse")
  .attr("x", -20).attr("y", -20).attr("width", W + 40).attr("height", H + 40)
  .html(`<feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>`);
// z-order: structure below, the story's trail under the nodes, the pulse under the cards (it vanishes into text)
const [gBands, gEdges, gTrail, gNodes, gRoute, gPulse, gCards, gOver, gAnno] = d3.range(9).map(() => svg.append("g"));

// monitor: an eye reading the token row
const eye = gAnno.append("g").attr("transform", `translate(${M.left - 40},${cardY})`);
const eyeLid = eye.append("path").attr("d", "M-16,0 Q0,-12 16,0 Q0,12 -16,0Z").attr("fill", "none")
  .attr("stroke", K.overseer).attr("stroke-width", 2.5);
const pupil = eye.append("circle").attr("r", 4.5).attr("fill", K.overseer);
gAnno.append("text").attr("x", M.left - 40).attr("y", cardY + 42).attr("text-anchor", "middle")
  .attr("fill", K.overseer).style("font", `600 18px ${css("font-sans")}`).text("monitor");

const readDark = d3.select("#read-dark"), readForced = d3.select("#read-forced"), readNeed = d3.select("#read-need");
const chainStrip = d3.select("#chain");

// Depth profile: the longest dark path ending at the top of each column, i.e. how much serial work can reach
// that column's output without passing through text. Its maximum is the "longest dark path" readout.
const gProfile = gAnno.append("g");
gProfile.append("text").attr("class", "plabel").attr("x", M.left - 40).attr("y", 30).attr("dy", "0.36em")
  .attr("text-anchor", "middle").attr("fill", K.muted).style("font", `500 16px ${css("font-mono")}`).text("depth");

function stateFor(i) {
  const s = STEPS[i] ?? controlsState();
  return { task: "arith", path: true, profile: true, hold: false, ...s, loops: s.arch === "looped" ? s.loops : 1 };
}

let prevKey = null, lastDark = null, token = 0;

// Scenes other than the DAG draw into #chart (or show #board); the DAG's own readouts, strip and legend hide.
const FONT = { mono: css("font-mono"), display: css("font-display") };
const BADGE = { schematic: ["schematic", "schematic"], replot: ["real", "real · re-plotted, approx."],
                counts: ["real", "real · counts from the report"], sources: ["real", "real · quotes from sources"] };
function setScene(scene) {
  const dag = scene === "dag";
  d3.selectAll("#stage, .readouts, #chain, .legend").style("display", dag ? null : "none");
  d3.select("#chart").style("display", ["chart", "diffusion", "readers"].includes(scene) ? null : "none");
  d3.select("#board").style("display", scene === "board" ? null : "none");
}

function render(i, _prev, opts = {}) {
  const s0 = stateFor(i);
  const scene = s0.scene ?? "dag";
  const [cls, text] = BADGE[s0.badge ?? "schematic"];
  const [main, ...rest] = text.split(" · ");
  d3.select("#fig-badge").attr("class", `badge ${cls}`)
    .html(`${main}${rest.length ? `<span class="b-detail"> · ${rest.join(" · ")}</span>` : ""}`);
  d3.select("#fig-num").text(`Fig. ${i + 1}`);
  d3.select("#fig-title").text(s0.title ?? freeTitle(s0));
  setScene(scene);
  if (scene === "dag") return renderDag(i, s0, opts);
  ++token;                                  // cancel any DAG story still animating
  svg.selectAll("g.story").interrupt().remove();
  prevKey = null;                           // coming back to the DAG re-lays it out from scratch
  const quick = opts.instant || REDUCED;
  const chart = d3.select("#chart");
  if (scene === "chart") return drawChart(chart, s0.chart, { pre: s0.pre, K, font: FONT, quick });
  if (scene === "diffusion") return drawDiffusion(chart, { mode: s0.mode, K, font: FONT, quick });
  if (scene === "readers") return drawReaders(chart, { latent: s0.latent, K, font: FONT, quick });
  return Promise.resolve();
}

function renderDag(i, s, { instant = false } = {}) {
  const task = TASKS[s.task];
  const g = buildGraph(s);
  const dark = longestDarkPath(g);
  const key = `${s.arch}|${s.loops}`;
  const relayout = prevKey !== null && key !== prevKey;
  prevKey = key;
  const quick = instant || REDUCED;
  const t = svg.transition().duration(quick ? 0 : 750).ease(d3.easeCubicInOut);

  drawGraph(g, s, t);
  drawProfile(g, dark, s, t);
  const chain = s.k ? chainStory(g, s.k, s.arch, task) : null;
  // hold: a "predict first" step. The task is posed (strip, needs) but the route isn't played until the next step.
  const story = s.hold ? null : chain ?? (s.path ? pathStory(g, dark, { zigzag: s.zigzag }) : null);

  // readouts: the dark path is a property of the architecture (it ticks up with the pulse only on the steps
  // that introduce it); "forced into text" fills in as the pulse reaches each card
  readNeed.text(s.k ? s.k * task.rows : "—");
  d3.select("#ro-need").classed("idle", !s.k);
  d3.select("#ro-dark").classed("idle", !story && !s.hold);
  readDark.interrupt();
  if (s.hold) { readDark.text(dark.length); lastDark = dark.length; }
  else if (!story) { readDark.text("?"); lastDark = null; }
  else if (story.ticks) { readDark.text(quick ? dark.length : 0); lastDark = dark.length; }
  else {
    const from = lastDark;
    lastDark = dark.length;
    if (quick || from === null || from === dark.length) readDark.text(dark.length);
    else readDark.transition().duration(750).textTween(() => d3.interpolateRound(from, dark.length));
  }
  chainStrip.html(!s.k ? "" : (s.task === "hops" ? stripHops : stripArith)(s.k, chain, quick && !s.hold, s.hold));

  const done = playStory(story, g, s, task, { delay: quick ? 0 : relayout ? 800 : 300, quick, my: ++token });
  if (s.hold) readForced.html(`<span class="muted">predict first</span>`);
  syncControls(s, i);
  return Promise.all([t.end().catch(() => {}), done]);
}

// The base graph: structure only, no task.
function drawGraph(g, s, t) {
  const edgeStyle = (e) => {
    if (e.kind === "dark-link") return { stroke: K.residual, w: 2, o: 0.55, dash: "5 4" };
    if (e.kind === "write" || e.kind === "in") return { stroke: K.token, w: 1.5, o: 0.35, dash: null };
    if (e.kind === "attn") return s.showAttn ? { stroke: K.muted, w: 1.8, o: 1, dash: null } : { stroke: K.faint, w: 1.2, o: 0.5, dash: null };
    return { stroke: K.faint, w: 1.6, o: 0.9, dash: null };
  };
  gEdges.selectAll("path").data(g.edges, (e) => e.id).join(
    (enter) => enter.append("path").attr("fill", "none").attr("d", (e) => edgePath(e, g)).attr("opacity", 0),
    (update) => update,
    (exit) => exit.transition(t).attr("opacity", 0).remove(),
  ).each(function (e) {
    const st = edgeStyle(e);
    d3.select(this).attr("stroke-dasharray", st.dash)
      .transition(t).attr("d", edgePath(e, g)).attr("stroke", st.stroke).attr("stroke-width", st.w).attr("opacity", st.o);
  });

  const r = Math.min(9, rowGap(g.R) / 4.2);
  gNodes.selectAll("circle").data(g.nodes.filter((n) => n.kind === "h"), (n) => n.id).join(
    (enter) => enter.append("circle").attr("cx", (n) => pos(n, g.R).x).attr("cy", (n) => pos(n, g.R).y).attr("r", 0),
    (update) => update,
    (exit) => exit.transition(t).attr("r", 0).remove(),
  ).transition(t)
    .attr("cx", (n) => pos(n, g.R).x).attr("cy", (n) => pos(n, g.R).y).attr("r", r)
    .attr("fill", K.residual).attr("opacity", 0.45);

  const cards = gCards.selectAll("g.card").data(g.nodes.filter((n) => n.row < 0), (n) => n.id).join((enter) => {
    const c = enter.append("g").attr("class", "card").attr("transform", (n) => `translate(${colX(n.col)},${cardY})`);
    c.append("rect").attr("x", -CARD.w / 2).attr("y", -CARD.h / 2).attr("width", CARD.w).attr("height", CARD.h).attr("rx", 7);
    c.append("text").attr("text-anchor", "middle").attr("dy", "0.36em");
    return c;
  });
  cards.select("rect").attr("filter", (n) => (n.kind === "latent" ? null : "url(#paper)"));
  cards.select("rect").transition(t)
    .attr("fill", (n) => (n.kind === "latent" ? "none" : K.token))
    .attr("stroke", (n) => (n.kind === "latent" ? K.residual : "none"))
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", (n) => (n.kind === "latent" ? "5 4" : null));
  cards.select("text")
    .style("font", (n) => (n.kind === "latent" ? `600 28px ${css("font-sans")}` : `600 21px ${css("font-mono")}`))
    .attr("fill", (n) => (n.kind === "latent" ? K.residual : K.bg))
    .text((n) => (n.kind === "latent" ? "∿" : n.col === 0 ? "Q" : "…"));

  // one band per pass of the same L layers, so "looped" reads as the same stack reused
  const passes = s.arch === "looped" ? d3.range(s.loops) : [];
  const gap = rowGap(g.R);
  const bands = gBands.selectAll("g.band").data(passes, (p) => p).join((enter) => {
    const b = enter.append("g").attr("class", "band").attr("opacity", 0);
    b.append("rect").attr("rx", 8);
    b.append("text").attr("text-anchor", "middle").style("font", `500 17px ${css("font-mono")}`).attr("fill", K.muted);
    return b;
  }, (u) => u, (exit) => exit.transition(t).attr("opacity", 0).remove());
  bands.transition(t).attr("opacity", 1);
  bands.select("rect").transition(t)
    .attr("x", M.left - 6).attr("width", W - M.left - M.right + 12)
    .attr("y", (p) => rowY((p + 1) * L - 1, g.R) - gap * 0.42)
    .attr("height", (L - 1) * gap + gap * 0.84)
    .attr("fill", (p) => (p % 2 ? K.surface : K.raised)).attr("opacity", 0.55);
  bands.select("text").text((p) => `pass ${p + 1}`)
    .transition(t).attr("x", M.left - 36).attr("y", (p) => (rowY(p * L, g.R) + rowY((p + 1) * L - 1, g.R)) / 2 + 6);
}

function drawProfile(g, dark, s, t) {
  const cols = s.profile ? d3.range(T) : [];
  gProfile.select(".plabel").transition(t).attr("opacity", s.profile ? 1 : 0);
  gProfile.selectAll("text.p").data(cols, (c) => c).join(
    (enter) => enter.append("text").attr("class", "p").attr("x", colX).attr("y", 30).attr("dy", "0.36em")
      .attr("text-anchor", "middle").attr("fill", K.residual).style("font", `600 18px ${css("font-mono")}`).attr("opacity", 0),
    (update) => update,
    (exit) => exit.transition(t).attr("opacity", 0).remove(),
  ).text((c) => dark.depth.get(`h${c}_${g.R - 1}`))
    .transition(t).attr("opacity", (c) => (dark.depth.get(`h${c}_${g.R - 1}`) === dark.length ? 1 : 0.55));
}

// ---------------- the story, animated ----------------
const SPEED = { climb: 0.34, link: 0.9, write: 1.1 }; // viewBox units per ms
const DWELL = { card: 460, answer: 520, thought: 260 }; // ms spent passing through a card

function playStory(story, g, s, task, { delay, quick, my }) {
  svg.selectAll("g.story").interrupt().transition().duration(quick ? 0 : 200).attr("opacity", 0).remove();
  pupil.interrupt().attr("cx", 0);
  if (!story) { readForced.html(`<span class="muted">no task yet</span>`); return Promise.resolve(); }

  const layer = (parent) => parent.append("g").attr("class", "story");
  const trail = layer(gTrail), route = layer(gRoute), over = layer(gOver), pulseG = layer(gPulse);
  const rr = Math.min(13, rowGap(g.R) / 2.6);
  const at = (ms, fn) => (quick ? fn() : d3.timeout(() => my === token && fn(), ms));
  const seen = [];
  let longest = 0;  // the dark-path readout ticks up to the longest route shown so far, never back down
  const showForced = (final) => {
    if (!story.answer) return readForced.html(`<span class="muted">no task yet</span>`);
    const vals = seen.map((w) => `<b class="c-overseer">${w.value}</b>`).join(", ");
    if (!final) return readForced.html(vals ? `${vals} <span class="muted">…</span>` : `<span class="muted">…</span>`);
    readForced.html(!story.writes.length
      ? `<b class="c-danger">nothing</b> <span class="muted">but the answer, ${story.answer.plain}</span>`
      : `${vals} <span class="muted">then the answer, ${story.answer.plain}</span>`);
  };
  showForced(false);

  // build the legs and a timeline
  const legs = [];
  let clock = delay;
  for (const it of story.items) {
    if (it.type === "node") { const t0 = clock; at(t0, () => lightNode(it)); continue; }
    if (it.type === "jump") { legs.push({ jump: pos(g.byId.get(it.id), g.R), dur: 500 }); clock += 500; continue; }
    const d = it.type === "edge" ? edgePath(g.edgeById.get(it.id), g) : cardPath(it.col, it.answer);
    const kind = it.type === "edge" ? it.kind : it.type === "thought" ? "link" : "write";
    const path = trail.append("path").attr("d", d).attr("fill", "none");
    const len = path.node().getTotalLength();
    const dur = it.type === "edge" ? len / SPEED[kind] : DWELL[it.answer ? "answer" : it.type];
    if (it.type !== "card") {
      path.attr("stroke", kind === "write" ? K.overseer : K.residual).attr("stroke-width", kind === "write" ? 3 : 3.5)
        .attr("filter", kind === "write" ? null : "url(#glow)");
      if (quick) path.attr("stroke-dasharray", null);
      else path.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len)
        .transition().delay(clock).duration(dur).ease(d3.easeLinear).attr("stroke-dashoffset", 0);
    }
    if (it.type === "card") { const t0 = clock; at(t0, () => lightCard(it)); }
    legs.push({ path: path.node(), len, dur, kind });
    clock += dur;
  }
  at(clock, () => showForced(true));

  function lightNode(it) {
    const { x, y } = pos(g.byId.get(it.id), g.R);
    const n = route.append("g").attr("transform", `translate(${x},${y})`);
    if (it.count === null) {  // carried through a continuous thought, no new work
      n.append("circle").attr("r", rr * 0.7).attr("fill", "none").attr("stroke", K.residual).attr("stroke-width", 2);
      return;
    }
    if (it.hopEnd) {  // one capsule per hop, around the rows it used
      const yLow = rowY(g.byId.get(it.id).row - (it.hopEnd - 1), g.R);
      const cap = trail.append("rect").attr("x", x - rr - 6).attr("width", 2 * rr + 12).attr("y", y - rr - 6)
        .attr("height", yLow - y + 2 * rr + 12).attr("rx", rr + 6)
        .attr("fill", "none").attr("stroke", K.residual).attr("stroke-width", 1.5).attr("opacity", 0.8);
      if (!quick) cap.attr("opacity", 0).transition().duration(260).attr("opacity", 0.8);
      // what this hop found, written in the gap between its two rows (blue italic: it exists only in the dark)
      const tag = over.append("g").attr("transform", `translate(${x},${(y + yLow) / 2})`);
      const txt = tag.append("text").attr("text-anchor", "middle").attr("dy", "0.34em").attr("fill", K.residual)
        .style("font", `italic 500 ${NARROW ? 21 : 21}px ${css("font-display")}`).text(it.label);
      const bb = txt.node().getBBox();
      tag.insert("rect", "text").attr("x", bb.x - 5).attr("y", bb.y - 1).attr("width", bb.width + 10).attr("height", bb.height + 2)
        .attr("rx", 5).attr("fill", K.bg).attr("stroke", K.residual).attr("stroke-width", 1).attr("stroke-opacity", 0.5);
      if (!quick) tag.attr("opacity", 0).transition().duration(260).attr("opacity", 1);
    }
    n.append("circle").attr("r", rr + 3).attr("fill", K.residual).attr("opacity", 0.35).attr("filter", "url(#glow)");
    n.append("circle").attr("r", rr).attr("fill", K.residual);
    n.append("text").attr("class", "count").attr("text-anchor", "middle").attr("dy", "0.36em").attr("fill", K.bg)
      .style("font", `700 ${Math.round(rr * 1.15)}px ${css("font-mono")}`).text(it.count);
    if (story.ticks && it.count > longest) readDark.text((longest = it.count));
    if (!quick) n.attr("opacity", 0).transition().duration(160).attr("opacity", 1);
  }

  function lightCard(it) {
    const c = over.append("g").attr("transform", `translate(${colX(it.col)},${cardY})`);
    c.append("rect").attr("x", -CARD.w / 2).attr("y", -CARD.h / 2).attr("width", CARD.w).attr("height", CARD.h).attr("rx", 7)
      .attr("fill", K.token).attr("stroke", it.answer ? "none" : K.overseer).attr("stroke-width", 4); // gold = forced only
    const label = c.append("text").attr("text-anchor", "middle").attr("dy", "0.36em").attr("fill", K.bg)
      .style("font", `600 21px ${css(task.font)}`).text(it.value);
    const room = CARD.w - 10;
    if (label.node().getComputedTextLength() > room) label.attr("textLength", room).attr("lengthAdjust", "spacingAndGlyphs");
    if (!it.answer) { seen.push(it); showForced(false); }
    chainStrip.select(`[data-at="${it.answer ? "ans" : it.step}"]`).classed("off", false);
    if (quick) return;
    c.attr("opacity", 0).transition().duration(140).attr("opacity", 1);
    over.append("rect").attr("x", colX(it.col) - CARD.w / 2).attr("y", cardY - CARD.h / 2).attr("width", CARD.w).attr("height", CARD.h)
      .attr("rx", 9).attr("fill", "none").attr("stroke", it.answer ? K.token : K.overseer).attr("stroke-width", 3)
      .transition().duration(620).ease(d3.easeCubicOut)
      .attr("x", colX(it.col) - CARD.w * 0.8).attr("y", cardY - CARD.h).attr("width", CARD.w * 1.6).attr("height", CARD.h * 2)
      .attr("opacity", 0).remove();
    pupil.interrupt().transition().duration(160).attr("cx", 5).transition().delay(260).duration(260).attr("cx", 0);
    eyeLid.interrupt().transition().duration(160).attr("stroke-width", 4.5).transition().duration(400).attr("stroke-width", 2.5);
  }

  if (quick) return Promise.resolve();
  // the pulse rides the legs in order
  const first = story.items.find((it) => it.type === "node");
  const p0 = pos(g.byId.get(first.id), g.R);
  const pulse = pulseG.append("circle").attr("r", 7).attr("fill", K.text).attr("filter", "url(#glow)")
    .attr("transform", `translate(${p0.x},${p0.y})`).attr("opacity", 0);
  let tr = pulse.transition("pulse").delay(delay).duration(120).attr("opacity", 1);
  for (const leg of legs) {
    if (leg.jump) {  // start a new route: fade out, move, fade in
      tr = tr.transition().duration(200).attr("opacity", 0)
        .transition().duration(100).attr("transform", `translate(${leg.jump.x},${leg.jump.y})`)
        .transition().duration(200).attr("fill", K.text).attr("opacity", 1);
      continue;
    }
    tr = tr.transition().duration(leg.dur).ease(d3.easeLinear)
      .attr("fill", leg.kind === "write" ? K.overseer : K.text)
      .attrTween("transform", () => (u) => {
        const q = leg.path.getPointAtLength(u * leg.len);
        return `translate(${q.x},${q.y})`;
      });
  }
  tr.transition().duration(300).attr("opacity", 0);
  return new Promise((resolve) => d3.timeout(resolve, clock + 350));
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
  let h = `<span class="v">${HOP_START}</span>`;
  for (let i = 1; i <= k; i++) {
    const hop = HOPS[i - 1];
    h += ` <span class="op">→ ${hop.rel}</span> `;
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
  { title: "An unrolled transformer", arch: "standard", k: 0, path: false, profile: false },
  { title: "Counting a dark path", arch: "standard", k: 0, profile: false, showAttn: true },   // predict: can a zig-zag beat 4?
  { title: "Sideways doesn't help", arch: "standard", k: 0, zigzag: true },                  // every hop climbs a layer
  { title: "A 10-step chain", arch: "standard", k: 10, hold: true },                         // predict
  { title: "Forced into text", arch: "standard", k: 10 },                                    // two are forced
  { title: "A 4-hop question", arch: "standard", k: 4, task: "hops", hold: true },           // predict
  { title: "Whatever lands at the top", arch: "standard", k: 4, task: "hops" },              // only 23
  { title: "Looped ×2", arch: "looped", loops: 2, k: 10 },
  { title: "Coconut: two continuous thoughts", arch: "coconut", k: 10 },
  { title: "Full bandwidth", arch: "fullbw", k: 10 },
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
  { title: "Check yourself", arch: "fullbw", k: 10 },
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
mountHero(document.getElementById("hero"), K, { mono: css("font-mono"), display: css("font-display") });
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
