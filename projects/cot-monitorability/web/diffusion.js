// Diffusion as a graph edit (DiffusionGemma, Engels et al. 2026), drawn in the same grammar as the main figure.
//
// Columns are canvas positions; each denoising pass is one trip up the stack, and the passes are stacked upward.
// Between passes, two things carry over per position: the sampled canvas token (a readable card) and the
// self-conditioning vector S (probability-weighted token embeddings). S is drawn as a wire that goes *around* the
// card. Whether S counts as readable decides the longest dark path, which is computed on the drawn graph.

import * as d3 from "d3";

const C = 4, L = 3, T = 3;          // canvas positions, layers per pass, passes
const W = 720, H = 520;
const X = (p) => 250 + p * 105;
const PASS_H = L * 38 + 40;          // one pass: L rows of nodes plus the card row above it
const Y0 = 470;                      // input cards
const nodeY = (t, r) => Y0 - 44 - (t * PASS_H) - r * 38;       // t = 0..T-1
const cardY = (t) => nodeY(t, L - 1) - 38;                     // the canvas after pass t (t = T-1: the output)

function buildGraph(sReadable) {
  const nodes = [], edges = [];
  const add = (id, kind, order, p, extra = {}) => nodes.push({ id, kind, order, p, ...extra });
  for (let p = 0; p < C; p++) add(`in${p}`, "tok", -1, p);
  for (let t = 0; t < T; t++) {
    for (let p = 0; p < C; p++) for (let r = 0; r < L; r++) add(`h${t}_${p}_${r}`, "h", t * (L + 1) + r, p, { t, r });
    for (let p = 0; p < C; p++) {
      add(`c${t}_${p}`, "tok", t * (L + 1) + L, p, { t });
      if (t < T - 1) add(`s${t}_${p}`, sReadable ? "tok" : "wire", t * (L + 1) + L, p, { t });
    }
  }
  const e = (s, t, kind) => edges.push({ s, t, kind });
  for (let t = 0; t < T; t++) for (let p = 0; p < C; p++) {
    e(t === 0 ? `in${p}` : `c${t - 1}_${p}`, `h${t}_${p}_0`, "in");
    if (t > 0) e(`s${t - 1}_${p}`, `h${t}_${p}_0`, "s");
    for (let r = 0; r < L - 1; r++) {
      e(`h${t}_${p}_${r}`, `h${t}_${p}_${r + 1}`, "res");
      for (const q of [p - 1, p + 1]) if (q >= 0 && q < C) e(`h${t}_${q}_${r}`, `h${t}_${p}_${r + 1}`, "attn"); // bidirectional
    }
    e(`h${t}_${p}_${L - 1}`, `c${t}_${p}`, "out");
    if (t < T - 1) e(`h${t}_${p}_${L - 1}`, `s${t}_${p}`, "s");
  }
  return { nodes, edges, byId: new Map(nodes.map((n) => [n.id, n])) };
}

// Longest path avoiding readable nodes; length = hidden states on it. Returns the path (ids) too.
function longestDark(g) {
  const preds = new Map(g.nodes.map((n) => [n.id, []]));
  g.edges.forEach((e) => preds.get(e.t).push(e));
  const order = [...g.nodes].sort((a, b) => a.order - b.order || a.p - b.p);
  const len = new Map(), back = new Map();
  for (const n of order) {
    if (n.kind === "tok") { len.set(n.id, 0); continue; }
    let best = 0, bestE = null;
    for (const e of preds.get(n.id)) {
      const v = len.get(e.s);
      if (v > best || (v === best && bestE && e.kind === "res" && bestE.kind !== "res")) { best = v; bestE = e; }
    }
    len.set(n.id, best + (n.kind === "h" ? 1 : 0));
    back.set(n.id, best > 0 ? bestE : null);
  }
  let end = order[0];
  for (const n of order) if (len.get(n.id) > len.get(end.id) || (len.get(n.id) === len.get(end.id) && n.p === 1 && end.p !== 1)) end = n;
  const path = [end.id];
  for (let e = back.get(end.id); e; e = back.get(e.s)) path.push(e.s);
  return { length: len.get(end.id), path: path.reverse() };
}

export function drawDiffusion(svg, { mode, K, font, quick }) {
  svg.attr("viewBox", `0 0 ${W} ${H}`);
  svg.selectAll("*").interrupt().remove();
  const sReadable = mode === "readable";
  const g = buildGraph(sReadable);
  const dark = longestDark(g);
  const pos = (id) => {
    const n = g.byId.get(id);
    if (n.id.startsWith("in")) return [X(n.p), Y0];
    if (n.kind === "h") return [X(n.p), nodeY(n.t, n.r)];
    if (n.id.startsWith("c")) return [X(n.p), cardY(n.t)];
    return [X(n.p) + 46, cardY(n.t)];            // S sits beside the card
  };
  const root = svg.append("g");

  // pass bands and labels
  for (let t = 0; t < T; t++) {
    root.append("rect").attr("x", X(0) - 44).attr("width", X(C - 1) - X(0) + 110).attr("y", nodeY(t, L - 1) - 17)
      .attr("height", (L - 1) * 38 + 34).attr("rx", 8).attr("fill", t % 2 ? K.surface : K.raised).attr("opacity", 0.55);
    root.append("text").attr("x", X(0) - 60).attr("y", nodeY(t, 1) + 6).attr("text-anchor", "end").attr("fill", K.muted)
      .style("font", `500 17px ${font.mono}`).text(`pass ${t + 1}`);
  }
  // edges
  const eg = root.append("g");
  for (const e of g.edges) {
    const [x1, y1] = pos(e.s), [x2, y2] = pos(e.t);
    if (e.kind === "attn") { eg.append("line").attr("x1", x1).attr("y1", y1).attr("x2", x2).attr("y2", y2).attr("stroke", K.faint).attr("stroke-width", 1).attr("opacity", 0.55); continue; }
    if (e.kind === "s") {
      const d = e.s.startsWith("h") ? `M${x1},${y1} C${x1 + 30},${y1 - 6} ${x2},${y2 + 22} ${x2},${y2 + 12}` : `M${x1},${y1 - 12} C${x1},${y1 - 26} ${x2 + 30},${y2 + 8} ${x2},${y2}`;
      eg.append("path").attr("d", d).attr("fill", "none").attr("stroke", sReadable ? K.overseer : K.residual)
        .attr("stroke-width", 1.8).attr("stroke-dasharray", sReadable ? null : "5 4").attr("opacity", sReadable ? 0.7 : 0.75);
      continue;
    }
    eg.append("line").attr("x1", x1).attr("y1", e.kind === "in" ? y1 - 13 : y1).attr("x2", x2).attr("y2", e.kind === "out" ? y2 + 13 : y2)
      .attr("stroke", e.kind === "res" ? K.faint : K.token).attr("stroke-width", e.kind === "res" ? 1.6 : 1.3).attr("opacity", e.kind === "res" ? 0.9 : 0.35);
  }
  // nodes, cards, S chips
  for (const n of g.nodes) {
    const [x, y] = pos(n.id);
    if (n.kind === "h") { root.append("circle").attr("cx", x).attr("cy", y).attr("r", 7).attr("fill", K.residual).attr("opacity", 0.45); continue; }
    if (n.id.startsWith("s")) {
      const chip = root.append("g").attr("transform", `translate(${x},${y})`);
      chip.append("rect").attr("x", -13).attr("y", -11).attr("width", 26).attr("height", 22).attr("rx", 5)
        .attr("fill", sReadable ? K.token : K.bg).attr("stroke", sReadable ? K.overseer : K.residual).attr("stroke-width", 2)
        .attr("stroke-dasharray", sReadable ? null : "4 3");
      chip.append("text").attr("text-anchor", "middle").attr("dy", "0.36em").attr("fill", sReadable ? K.bg : K.residual)
        .style("font", `italic 600 16px ${font.display}`).text("S");
      continue;
    }
    const last = n.id.startsWith("c") && n.t === T - 1;
    root.append("rect").attr("x", x - 26).attr("y", y - 13).attr("width", 52).attr("height", 26).attr("rx", 6).attr("fill", K.token)
      .attr("opacity", n.id.startsWith("in") ? 0.55 : 1).attr("filter", "url(#paper)");
    root.append("text").attr("x", x).attr("y", y).attr("dy", "0.36em").attr("text-anchor", "middle").attr("fill", K.bg)
      .style("font", `600 15px ${font.mono}`).text(n.id.startsWith("in") ? "?" : last ? "out" : "…");
  }
  // captions
  root.append("text").attr("x", X(C - 1) + 70).attr("y", Y0 + 5).attr("fill", K.muted).style("font", `500 15px ${font.mono}`).text("random start");
  root.append("text").attr("x", X(C - 1) + 70).attr("y", cardY(T - 1) + 5).attr("fill", K.muted).style("font", `500 15px ${font.mono}`).text("final text");

  // readout
  const ro = svg.append("g").attr("transform", "translate(24,40)");
  ro.append("text").attr("fill", K.muted).style("font", `500 13px ${font.mono}`).attr("letter-spacing", "0.12em").text("LONGEST DARK PATH");
  const big = ro.append("text").attr("y", 44).attr("fill", K.residual).style("font", `600 40px ${font.mono}`).text(mode === "hold" ? "?" : 0);
  ro.append("text").attr("y", 68).attr("fill", K.muted).style("font", `500 14px ${font.mono}`).text("hidden states");

  if (mode === "hold") return Promise.resolve();
  // the path: glow trail and numbered nodes, in order
  const route = svg.append("g");
  const pts = dark.path.map(pos);
  const trail = route.append("path").attr("d", d3.line().curve(d3.curveMonotoneY)(pts)).attr("fill", "none").attr("stroke", K.residual)
    .attr("stroke-width", 3.5).attr("filter", "url(#glow)");
  const len = trail.node().getTotalLength();
  const hs = dark.path.filter((id) => g.byId.get(id).kind === "h");
  const dur = quick ? 0 : 260 * hs.length;
  if (!quick) trail.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len).transition().duration(dur).ease(d3.easeLinear).attr("stroke-dashoffset", 0);
  hs.forEach((id, j) => {
    const [x, y] = pos(id);
    const n = route.append("g").attr("transform", `translate(${x},${y})`).attr("opacity", quick ? 1 : 0);
    n.append("circle").attr("r", 11).attr("fill", K.residual);
    n.append("text").attr("text-anchor", "middle").attr("dy", "0.36em").attr("fill", K.bg).style("font", `700 12px ${font.mono}`).text(j + 1);
    if (!quick) n.transition().delay((j + 0.5) * (dur / hs.length)).duration(150).attr("opacity", 1).on("start", () => big.text(j + 1));
  });
  if (quick) big.text(dark.length);
  return new Promise((r) => setTimeout(r, dur + 200));
}
