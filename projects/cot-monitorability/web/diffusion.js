// Diffusion as a graph edit (DiffusionGemma, Engels et al. 2026), drawn in the same grammar as the main figure.
//
// Columns are canvas positions. Each denoising pass is one trip up the stack: a glass band. Between passes, the
// sampled canvas is readable: a strip of paper with a card per position. The self-conditioning vector S (probability-
// weighted token embeddings, per position) also carries over, and it is drawn as a wire that crosses the paper
// *beside* each card, through a chip. Opaque S: the chip is glass. Readable S (replaced by a few likely tokens): the
// chip is paper. The longest dark path is computed on the drawn graph.

import * as d3 from "d3";
import { poolState, tileURL } from "./tiles.js";

const C = 4, L = 3, T = 3;          // canvas positions, layers per pass, passes
const NARROW = matchMedia("(max-width: 860px)").matches;
const W = NARROW ? 440 : 720, H = NARROW ? 700 : 680;
const X = (p) => (NARROW ? 118 : 222) + p * (NARROW ? 80 : 108);
const ROW = NARROW ? 36 : 40, TS = NARROW ? 26 : 29, STRIP = 48, BANDPAD = 12;
const BAND = (L - 1) * ROW + TS + 2 * BANDPAD;
const Y0 = H - 34;                                              // input strip center
const bandBottom = (t) => Y0 - STRIP / 2 - 8 - t * (BAND + STRIP + 16);
const nodeY = (t, r) => bandBottom(t) - BANDPAD - TS / 2 - r * ROW;
const stripY = (t) => bandBottom(t) - BAND - 8 - STRIP / 2;    // the canvas after pass t
const SX = 40;                                                  // S sits this far right of its card

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
      for (let q = 0; q < C; q++) if (q !== p) e(`h${t}_${q}_${r}`, `h${t}_${p}_${r + 1}`, "attn"); // bidirectional, all positions
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

export function drawDiffusion(svg, { mode, K, KI, font, quick }) {
  svg.attr("viewBox", `0 0 ${W} ${H}`);
  svg.selectAll("*").interrupt().remove();
  const sReadable = mode === "readable";
  const g = buildGraph(sReadable);
  const dark = longestDark(g);
  const pos = (id) => {
    const n = g.byId.get(id);
    if (n.id.startsWith("in")) return [X(n.p), Y0];
    if (n.kind === "h") return [X(n.p), nodeY(n.t, n.r)];
    if (n.id.startsWith("c")) return [X(n.p), stripY(n.t)];
    return [X(n.p) + SX, stripY(n.t)];            // S sits beside the card
  };
  const tex = (n) => tileURL(poolState(n.t * 17 + n.p * 5 + n.r * 3 + 11, n.r));
  const defs = svg.append("defs");
  const bandRect = (t) => [X(0) - 38, bandBottom(t) - BAND, X(C - 1) - X(0) + 38 + SX + 26, BAND];
  const chip = (t, p) => [X(p) + SX - 13, stripY(t) - 13, 26, 26];
  const glassRects = [...d3.range(T).map(bandRect), ...(sReadable ? [] : d3.range(T - 1).flatMap((t) => d3.range(C).map((p) => chip(t, p))))];
  defs.append("clipPath").attr("id", "dif-glass").selectAll("rect").data(glassRects).join("rect")
    .attr("x", (r) => r[0]).attr("y", (r) => r[1]).attr("width", (r) => r[2]).attr("height", (r) => r[3]);
  defs.append("clipPath").attr("id", "dif-paper").append("path").attr("clip-rule", "evenodd")
    .attr("d", `M-10,-10H${W + 10}V${H + 10}H-10Z` + glassRects.map(([x, y, w, h]) => `M${x},${y}h${w}v${h}h${-w}Z`).join(""));
  const root = svg.append("g");

  // paper strips (the canvas between passes) and glass bands (the passes)
  const stripLabel = (y, text) => root.append("text").attr("x", X(C - 1) + SX + 36).attr("y", y + 5).attr("fill", KI.ink2)
    .style("font", `500 12px ${font.mono}`).text(text);
  if (!NARROW) {
    stripLabel(Y0, "random start");
    d3.range(T - 1).forEach((t) => stripLabel(stripY(t), "canvas"));
    stripLabel(stripY(T - 1), "final text");
  }
  for (let t = 0; t < T; t++) {
    const [x, y, w, h] = bandRect(t);
    root.append("rect").attr("x", x).attr("y", y).attr("width", w).attr("height", h).attr("rx", 10).attr("fill", "url(#glass-fill)").attr("stroke", K.win ?? "#1b2433");
    root.append("text").attr("transform", `translate(${x - 14},${y + h / 2}) rotate(-90)`).attr("text-anchor", "middle")
      .attr("fill", KI.ink2).style("font", `500 ${NARROW ? 12 : 13}px ${font.mono}`).text(`pass ${t + 1}`);
  }
  // edges: in the glass they are faint light; on paper, ink
  const eg = root.append("g");
  const dual = (d, glass, ink, w, opts = {}) => {
    for (const [color, clip] of [[glass, "url(#dif-glass)"], [ink, "url(#dif-paper)"]])
      eg.append("path").attr("d", d).attr("fill", "none").attr("stroke", color).attr("stroke-width", w).attr("clip-path", clip)
        .attr("stroke-dasharray", opts.dash ?? null).attr("opacity", opts.o ?? 1);
  };
  const sPath = (e) => {
    const [x1, y1] = pos(e.s), [x2, y2] = pos(e.t);
    return e.s.startsWith("h") ? `M${x1},${y1} C${x1},${y1 - 22} ${x2},${y2 + 26} ${x2},${y2 + 13}`   // top of pass -> chip
                               : `M${x1},${y1 - 13} C${x1},${y1 - 28} ${x2},${y2 + 22} ${x2},${y2}`; // chip -> next pass
  };
  for (const e of g.edges) {
    const [x1, y1] = pos(e.s), [x2, y2] = pos(e.t);
    if (e.kind === "attn") { dual(`M${x1},${y1} C${x1},${y1 - 26} ${x2},${y2 + 26} ${x2},${y2}`, "#2c4163", KI.rule, 0.9, { o: 0.7 }); continue; }
    if (e.kind === "s") { dual(sPath(e), sReadable ? K.overseer : K.residual, sReadable ? KI.overseer : KI.residual, 1.6, { dash: sReadable ? null : "4 3", o: 0.85 }); continue; }
    if (e.kind === "res") { dual(`M${x1},${y1}L${x2},${y2}`, "#2a3a55", KI.rule, 1.5); continue; }
    dual(`M${x1},${e.kind === "in" ? y1 - 14 : y1}L${x2},${e.kind === "out" ? y2 + 14 : y2}`, "#3b4a60", KI.ink3, 1.1, { o: 0.9 });
  }
  // squares (real states), cards (paper), S chips
  for (const n of g.nodes) {
    const [x, y] = pos(n.id);
    if (n.kind === "h") {
      root.append("rect").attr("x", x - TS / 2 - 1).attr("y", y - TS / 2 - 1).attr("width", TS + 2).attr("height", TS + 2).attr("rx", 2.5).attr("fill", "#02050b");
      root.append("image").attr("href", tex(n)).attr("x", x - TS / 2).attr("y", y - TS / 2).attr("width", TS).attr("height", TS)
        .attr("preserveAspectRatio", "none").style("image-rendering", "pixelated").attr("opacity", 0.55);
      continue;
    }
    if (n.id.startsWith("s")) {
      const c = root.append("g").attr("transform", `translate(${x},${y})`);
      if (sReadable) {   // replaced by a few likely tokens: a paper chip with a tiny probability list
        c.append("rect").attr("x", -13).attr("y", -13).attr("width", 26).attr("height", 26).attr("rx", 4).attr("fill", KI.card)
          .attr("stroke", KI.overseer).attr("stroke-width", 1.4).attr("filter", "url(#card-shadow)");
        [14, 9, 6].forEach((w, j) => c.append("rect").attr("x", -8).attr("y", -7 + j * 5.5).attr("width", w).attr("height", 3).attr("rx", 1).attr("fill", KI.ink2));
      } else {           // opaque: a glass chip holding a vector
        c.append("rect").attr("x", -13).attr("y", -13).attr("width", 26).attr("height", 26).attr("rx", 4).attr("fill", "#070a10")
          .attr("stroke", K.residual).attr("stroke-width", 1.4).attr("stroke-dasharray", "3 2");
        c.append("image").attr("href", tileURL(poolState(n.t * 7 + n.p * 3 + 29, 3))).attr("x", -9).attr("y", -9).attr("width", 18).attr("height", 18)
          .attr("preserveAspectRatio", "none").style("image-rendering", "pixelated");
      }
      c.append("text").attr("x", 0).attr("y", 26).attr("text-anchor", "middle").attr("fill", sReadable ? KI.overseer : KI.residual).style("font", `italic 600 13px ${font.display}`).text("S");
      continue;
    }
    const last = n.id.startsWith("c") && n.t === T - 1;
    root.append("rect").attr("x", x - 24).attr("y", y - 14).attr("width", 48).attr("height", 28).attr("rx", 5).attr("fill", KI.card)
      .attr("stroke", KI.rule).attr("filter", "url(#card-shadow)");
    root.append("text").attr("x", x).attr("y", y).attr("dy", "0.36em").attr("text-anchor", "middle").attr("fill", n.id.startsWith("in") ? KI.ink3 : KI.ink)
      .style("font", `600 ${last ? 14 : 15}px ${font.mono}`).text(n.id.startsWith("in") ? "?" : last ? "out" : "…");
  }

  // readout
  const ro = svg.append("g").attr("transform", NARROW ? "translate(18,24)" : "translate(26,46)");
  ro.append("text").attr("fill", KI.ink3).style("font", `500 11px ${font.mono}`).attr("letter-spacing", "0.14em").text("LONGEST DARK PATH");
  const big = ro.append("text").attr("x", 0).attr("y", NARROW ? 34 : 44).attr("fill", KI.residual)
    .style("font", `600 ${NARROW ? 30 : 40}px ${font.mono}`).text(mode === "hold" ? "?" : 0);
  ro.append("text").attr("x", NARROW ? 40 : 0).attr("y", NARROW ? 32 : 68).attr("fill", KI.ink2).style("font", `400 13px ${font.sans}`).text("hidden states");
  if (NARROW) ro.append("text").attr("x", 190).attr("y", 32).attr("fill", KI.ink3).style("font", `500 11px ${font.mono}`).text("bottom row: random start");
  if (mode === "hold") return Promise.resolve();
  // the path: glow trail and numbered squares, in order
  const route = svg.append("g");
  const pts = dark.path.map(pos);
  const d = d3.line().curve(d3.curveMonotoneY)(pts);
  const trails = [[K.residual, "url(#dif-glass)", 3.2, "url(#glow)"], [KI.residual, "url(#dif-paper)", 2.4, null]].map(([c, clip, w, f]) =>
    route.append("path").attr("d", d).attr("fill", "none").attr("stroke", c).attr("stroke-width", w).attr("clip-path", clip).attr("filter", f));
  const len = trails[0].node().getTotalLength();
  const hs = dark.path.filter((id) => g.byId.get(id).kind === "h");
  const dur = quick ? 0 : 280 * hs.length;
  if (!quick) trails.forEach((tr) => tr.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len)
    .transition().duration(dur).ease(d3.easeLinear).attr("stroke-dashoffset", 0));
  hs.forEach((id, j) => {
    const [x, y] = pos(id), n = g.byId.get(id);
    const tg = route.append("g").attr("transform", `translate(${x},${y})`).attr("opacity", quick ? 1 : 0);
    tg.append("rect").attr("x", -TS / 2 - 2).attr("y", -TS / 2 - 2).attr("width", TS + 4).attr("height", TS + 4).attr("rx", 3).attr("fill", "#0a1322").attr("filter", "url(#tile-glow)");
    tg.append("image").attr("href", tex(n)).attr("x", -TS / 2).attr("y", -TS / 2).attr("width", TS).attr("height", TS)
      .attr("preserveAspectRatio", "none").style("image-rendering", "pixelated");
    tg.append("rect").attr("x", -TS / 2 - 2).attr("y", -TS / 2 - 2).attr("width", TS + 4).attr("height", TS + 4).attr("rx", 3).attr("fill", "none").attr("stroke", "#a9cbff").attr("stroke-width", 1.4);
    const b = tg.append("g").attr("transform", `translate(${TS / 2 + 1},${-TS / 2 - 1})`);
    b.append("circle").attr("r", 9).attr("fill", K.residual).attr("stroke", "#060910").attr("stroke-width", 2);
    b.append("text").attr("text-anchor", "middle").attr("dy", "0.36em").attr("fill", "#060910").style("font", `700 11px ${font.mono}`).text(j + 1);
    if (!quick) tg.transition().delay((j + 0.5) * (dur / hs.length)).duration(160).attr("opacity", 1).on("start", () => big.text(j + 1));
  });
  if (quick) big.text(dark.length);
  return new Promise((r) => setTimeout(r, dur + 200));
}
