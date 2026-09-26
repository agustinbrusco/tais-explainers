// How Many Steps Fit in the Dark? The core figure (prototype).
//
// The figure is a real DAG. The longest dark path is *computed* on the drawn graph (dynamic programming in
// topological order, with readable token nodes resetting the count), so every architecture is literally
// a graph edit, and the readouts follow from it.

import * as d3 from "d3";
import { mountSteps } from "../../../kit/web/steps.js";

const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(`--${n}`).trim();
const K = Object.fromEntries(
  ["token", "residual", "overseer", "text", "muted", "faint", "grid", "surface", "raised", "bg"].map((n) => [n, css(n)]),
);

// ---------------- running example: a chain of dependent arithmetic steps ----------------
const START = 7;
const OPS = [["×", 3], ["−", 4], ["×", 2], ["+", 5], ["−", 9], ["×", 2], ["+", 7], ["−", 3],
             ["×", 3], ["−", 11], ["+", 6], ["×", 2], ["−", 8], ["+", 4], ["×", 2], ["−", 5]];
const applyOp = (v, [o, n]) => (o === "×" ? v * n : o === "+" ? v + n : v - n);
const VALUES = OPS.reduce((acc, op) => (acc.push(applyOp(acc.at(-1), op)), acc), [START]); // VALUES[i]: after i steps
const MAX_K = OPS.length;

// ---------------- the model: graph construction (pure) ----------------
const T = 8;          // token positions drawn
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
  return { R, nodes, edges, latentIn };
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
  const kindOf = new Map(g.nodes.map((n) => [n.id, n.kind]));
  const edgeIds = new Set(), nodeIds = new Set([end.id]);
  for (let id = end.id, e = back.get(id); e && kindOf.get(e.s) !== "tok"; e = back.get(id)) {
    edgeIds.add(e.id); nodeIds.add(e.s); id = e.s;
  }
  return { length: len.get(end.id), edgeIds, nodeIds };
}

// Lay the chain onto the graph: one drawn layer = one dependent step (a drawing convention; see caveat).
// At the top of a column the running value must cross to the next column. If a dark link exists it
// crosses silently; otherwise it is *forced* into a token, where the monitor can read it.
function layChain(g, k, arch) {
  const darkLink = (c) => arch === "fullbw" || g.latentIn(c + 1);
  const route = [], darkEdges = [], writeEdges = [], writes = [];
  let col = 0, row = 0;
  for (let step = 1; step <= k && col < T; step++) {
    route.push(`h${col}_${row}`);
    if (step === k) break;
    if (row < g.R - 1) { darkEdges.push(`v${col}_${row}`); row++; continue; }
    if (darkLink(col)) darkEdges.push(...(arch === "fullbw" ? [`fb${col}`] : [`out${col}`, `in${col + 1}`]));
    else { writes.push({ col: col + 1, value: VALUES[step], step }); writeEdges.push(`out${col}`, `in${col + 1}`); }
    col++; row = 0;
  }
  const answerCol = Math.min(col + 1, T - 1);
  if (k) writeEdges.push(`out${col}`);
  return { route: new Set(route), darkEdges: new Set(darkEdges), writeEdges: new Set(writeEdges), writes,
           answer: k ? { col: answerCol, value: VALUES[k] } : null };
}

// ---------------- geometry ----------------
const W = 720, H = 520;
const M = { left: 64, right: 24, top: 30, bottom: 96 };
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
  const byId = (id) => g.nodes.find((n) => n.id === id);
  const s = pos(byId(e.s), g.R), t = pos(byId(e.t), g.R);
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

// ---------------- rendering ----------------
const svg = d3.select("#stage").attr("viewBox", `0 0 ${W} ${H}`);
const defs = svg.append("defs");
// userSpaceOnUse: a perfectly vertical line has a zero-width bounding box, which would collapse the filter region.
defs.append("filter").attr("id", "glow").attr("filterUnits", "userSpaceOnUse")
  .attr("x", -20).attr("y", -20).attr("width", W + 40).attr("height", H + 40)
  .html(`<feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>`);
const gBands = svg.append("g"), gEdges = svg.append("g"), gNodes = svg.append("g"), gCards = svg.append("g"), gAnno = svg.append("g");

// monitor: an eye reading the token row
const eye = gAnno.append("g").attr("transform", `translate(${M.left - 40},${cardY})`);
eye.append("path").attr("d", "M-16,0 Q0,-12 16,0 Q0,12 -16,0Z").attr("fill", "none").attr("stroke", K.overseer).attr("stroke-width", 2.5);
eye.append("circle").attr("r", 4.5).attr("fill", K.overseer);
gAnno.append("text").attr("x", M.left - 40).attr("y", cardY + 42).attr("text-anchor", "middle")
  .attr("fill", K.overseer).style("font", `600 18px ${css("font-sans")}`).text("monitor");
const loopLabel = gAnno.append("text").attr("x", M.left - 40).attr("text-anchor", "middle")
  .attr("fill", K.muted).style("font", `500 18px ${css("font-mono")}`);

const readDark = d3.select("#read-dark"), readForced = d3.select("#read-forced"), chainStrip = d3.select("#chain");

function stateFor(i) {
  const s = STEPS[i] ?? controlsState();
  return { ...s, loops: s.arch === "looped" ? s.loops : 1 };
}

function render(i) {
  const s = stateFor(i);
  const g = buildGraph(s);
  const dark = longestDarkPath(g);
  const chain = layChain(g, s.k, s.arch);
  const showPath = s.path && !s.k;
  const t = svg.transition().duration(750).ease(d3.easeCubicInOut);

  // edges
  const edgeStyle = (e) => {
    if (chain.darkEdges.has(e.id) || (showPath && dark.edgeIds.has(e.id))) return { stroke: K.residual, w: 3.5, o: 1, glow: true, dash: null };
    if (chain.writeEdges.has(e.id)) return { stroke: K.overseer, w: 3, o: 1, glow: false, dash: null };
    if (e.kind === "dark-link") return { stroke: K.residual, w: 2, o: 0.55, glow: false, dash: "5 4" };
    if (e.kind === "write" || e.kind === "in") return { stroke: K.token, w: 1.5, o: 0.35, glow: false, dash: null };
    if (e.kind === "attn") return { stroke: K.faint, w: 1.2, o: 0.5, glow: false, dash: null };
    return { stroke: K.faint, w: 1.6, o: 0.9, glow: false, dash: null };
  };
  gEdges.selectAll("path").data(g.edges, (e) => e.id).join(
    (enter) => enter.append("path").attr("fill", "none").attr("d", (e) => edgePath(e, g)).attr("opacity", 0),
    (update) => update,
    (exit) => exit.transition(t).attr("opacity", 0).remove(),
  ).each(function (e) {
    const st = edgeStyle(e);
    d3.select(this).attr("stroke-dasharray", st.dash).attr("filter", st.glow ? "url(#glow)" : null)
      .transition(t).attr("d", edgePath(e, g)).attr("stroke", st.stroke).attr("stroke-width", st.w).attr("opacity", st.o);
  });

  // hidden states
  const hs = g.nodes.filter((n) => n.kind === "h");
  const r = Math.min(9, rowGap(g.R) / 4.2);
  gNodes.selectAll("circle").data(hs, (n) => n.id).join(
    (enter) => enter.append("circle").attr("cx", (n) => pos(n, g.R).x).attr("cy", (n) => pos(n, g.R).y).attr("r", 0),
    (update) => update,
    (exit) => exit.transition(t).attr("r", 0).remove(),
  ).transition(t)
    .attr("cx", (n) => pos(n, g.R).x).attr("cy", (n) => pos(n, g.R).y).attr("r", r)
    .attr("fill", (n) => (chain.route.has(n.id) ? K.text : K.residual))
    .attr("opacity", (n) => (chain.route.has(n.id) || (showPath && dark.nodeIds.has(n.id)) ? 1 : 0.5));

  // token cards / latent thoughts
  const writeAt = new Map(chain.writes.map((w) => [w.col, w]));
  const cards = gCards.selectAll("g.card").data(g.nodes.filter((n) => n.row < 0), (n) => n.id).join((enter) => {
    const c = enter.append("g").attr("class", "card").attr("transform", (n) => `translate(${colX(n.col)},${cardY})`);
    c.append("rect").attr("x", -CARD.w / 2).attr("y", -CARD.h / 2).attr("width", CARD.w).attr("height", CARD.h).attr("rx", 7);
    c.append("text").attr("text-anchor", "middle").attr("dy", "0.36em");
    return c;
  });
  cards.select("rect").transition(t)
    .attr("fill", (n) => (n.kind === "latent" ? "none" : K.token))
    .attr("stroke", (n) => (n.kind === "latent" ? K.residual : writeAt.has(n.col) || chain.answer?.col === n.col ? K.overseer : "none"))
    .attr("stroke-width", (n) => (n.kind === "latent" ? 2 : 4))
    .attr("stroke-dasharray", (n) => (n.kind === "latent" ? "5 4" : null));
  cards.select("text")
    .style("font", (n) => (n.kind === "latent" ? `600 28px ${css("font-sans")}` : `600 21px ${css("font-mono")}`))
    .attr("fill", (n) => (n.kind === "latent" ? K.residual : K.bg))
    .text((n) => {
      if (n.kind === "latent") return "∿";
      if (n.col === 0) return "Q";
      if (writeAt.has(n.col)) return String(writeAt.get(n.col).value);
      if (chain.answer?.col === n.col) return `=${chain.answer.value}`;
      return "…";
    });

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
  loopLabel.text("");

  // readouts
  readDark.text(dark.length);
  if (!s.k) readForced.html(`<span class="muted">no task yet</span>`);
  else if (!chain.writes.length) readForced.html(`<b class="c-danger">nothing</b> <span class="muted">but the answer, ${chain.answer.value}</span>`);
  else readForced.html(chain.writes.map((w) => `<b class="c-overseer">${w.value}</b>`).join(", ") +
    ` <span class="muted">then the answer, ${chain.answer.value}</span>`);
  chainStrip.html(!s.k ? "" : chainHTML(s.k, chain));

  syncControls(s, i);
  return t.end().catch(() => {});
}

function chainHTML(k, chain) {
  const forced = new Set(chain.writes.map((w) => w.step));
  let h = `<span class="v">${START}</span>`;
  for (let i = 1; i <= k; i++) {
    const [o, n] = OPS[i - 1];
    h += ` <span class="op">${o}${n}</span>`;
    if (forced.has(i)) h += ` <span class="chip w">${VALUES[i]}</span>`;
  }
  return h + ` <span class="chip a">=${VALUES[k]}</span>`;
}

// ---------------- steps and controls ----------------
const STEPS = [
  { arch: "standard", loops: 1, k: 0, path: false },
  { arch: "standard", loops: 1, k: 0, path: true },
  { arch: "standard", loops: 1, k: 10, path: true },
  { arch: "looped", loops: 2, k: 10, path: true },
  { arch: "coconut", loops: 1, k: 10, path: true },
  { arch: "fullbw", loops: 1, k: 10, path: true },
  null, // free play
];

const ctl = { arch: "standard", loops: 2, k: 12 };
function controlsState() { return { ...ctl, path: true }; }
const archButtons = d3.selectAll("#controls [data-arch]");
const loopsInput = d3.select("#loops"), kInput = d3.select("#k");
const free = () => window.explainer?.current === STEPS.length - 1;

archButtons.on("click", function () { ctl.arch = this.dataset.arch; if (free()) render(STEPS.length - 1); });
loopsInput.attr("max", 3).on("input", function () { ctl.loops = +this.value; if (free()) render(STEPS.length - 1); });
kInput.attr("max", MAX_K).on("input", function () { ctl.k = +this.value; if (free()) render(STEPS.length - 1); });

function syncControls(s, i) {
  const live = i === STEPS.length - 1;
  d3.select("#controls").classed("live", live);
  archButtons.classed("on", function () { return this.dataset.arch === s.arch; }).attr("disabled", live ? null : "");
  loopsInput.property("value", s.arch === "looped" ? s.loops : ctl.loops).attr("disabled", live && s.arch === "looped" ? null : "");
  kInput.property("value", s.k).attr("disabled", live ? null : "");
  d3.select("#loops-val").text(s.arch === "looped" ? `×${s.loops}` : "—");
  d3.select("#k-val").text(s.k);
}

mountSteps({ render });
