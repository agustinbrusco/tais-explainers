// "A word and 512 numbers": one real token and one of its real hidden states, side by side.
// The token is a card on paper; the state is a glass window holding all 512 numbers of gelu-4l's residual stream
// at layer 2 for that token. Then the first 64 of them fold into the 8x8 square every later figure uses.

import * as d3 from "d3";
import { TILES, META, rampCSS, tileURL } from "./tiles.js";

const NARROW = matchMedia("(max-width: 860px)").matches;
const W = NARROW ? 440 : 720, H = NARROW ? 660 : 520;
const fmt = (x) => (Math.abs(x) < 0.005 ? "0.00" : (x < 0 ? "−" : "") + Math.abs(x).toFixed(2));

export function drawAnatomy(svg, { K, KI, font, quick }) {
  svg.attr("viewBox", `0 0 ${W} ${H}`);
  svg.selectAll("*").interrupt().remove();
  const z = TILES.zoom, vals = z.values, sc = z.scale;
  const word = z.token.trim();
  const g = svg.append("g");
  const t0 = quick ? 0 : 1;          // multiplies every delay
  const fade = (sel, delay, dur = 400) => (quick ? sel : sel.attr("opacity", 0).transition().delay(delay).duration(dur).attr("opacity", 1));
  const cap = (x, y, text, opts = {}) => g.append("text").attr("x", x).attr("y", y).text(text)
    .attr("fill", opts.fill ?? KI.ink2).attr("text-anchor", opts.anchor ?? "start")
    .style("font", `${opts.weight ?? 400} ${opts.size ?? 15}px ${opts.family ?? font.sans}`)
    .attr("letter-spacing", opts.ls ?? null);

  // --- the token: a card on paper ---
  const tk = NARROW ? { x: 20, y: 40, w: 150, h: 58 } : { x: 28, y: 132, w: 176, h: 64 };
  const tokG = g.append("g");
  cap(tk.x, tk.y - 16, "A TOKEN", { size: 12, family: font.mono, fill: KI.ink2, ls: "0.14em", weight: 500 });
  tokG.append("rect").attr("x", tk.x).attr("y", tk.y).attr("width", tk.w).attr("height", tk.h).attr("rx", 8)
    .attr("fill", KI.card).attr("stroke", KI.rule).attr("filter", "url(#card-shadow)");
  tokG.append("text").attr("x", tk.x + tk.w / 2).attr("y", tk.y + tk.h / 2).attr("dy", "0.36em").attr("text-anchor", "middle")
    .attr("fill", KI.ink).style("font", `600 ${NARROW ? 26 : 30}px ${font.mono}`).text(word);
  const tokNote = NARROW
    ? [`one of ${d3.format(",")(META.d_vocab)} entries`, "in its vocabulary. Readable."]
    : [`one of ${d3.format(",")(META.d_vocab)} entries`, "in its vocabulary.", "Anyone can read it."];
  tokNote.forEach((line, j) => cap(NARROW ? tk.x + tk.w + 16 : tk.x, NARROW ? tk.y + 24 + j * 20 : tk.y + tk.h + 30 + j * 21, line,
    { size: 15, fill: j === tokNote.length - 1 ? KI.ink : KI.ink2, weight: j === tokNote.length - 1 ? 500 : 400 }));
  fade(tokG, 0);

  // --- its hidden state: all 512 numbers behind glass ---
  const cols = 32, rows = Math.ceil(vals.length / cols);
  const cell = NARROW ? 12.4 : 12.6;
  const win = NARROW ? { x: 14, y: 150, w: W - 28, h: rows * cell + 108 } : { x: 250, y: 60, w: 442, h: rows * cell + 112 };
  const gx = win.x + (win.w - cols * cell) / 2, gy = win.y + 30;
  cap(win.x, win.y - 16, `ITS HIDDEN STATE AT LAYER ${z.layer} OF ${META.n_layers}`, { size: 12, family: font.mono, ls: "0.14em", weight: 500 });
  const glass = g.append("g");
  glass.append("rect").attr("x", win.x).attr("y", win.y).attr("width", win.w).attr("height", win.h).attr("rx", 12)
    .attr("fill", "url(#glass-fill)").attr("stroke", "#1b2433");
  const cells = glass.append("g");
  cells.selectAll("rect").data(vals).join("rect")
    .attr("x", (_, i) => gx + (i % cols) * cell + 0.6).attr("y", (_, i) => gy + Math.floor(i / cols) * cell + 0.6)
    .attr("width", cell - 1.2).attr("height", cell - 1.2).attr("rx", 1.2)
    .attr("fill", (v) => rampCSS(Math.max(-1, Math.min(1, v / sc))))
    .attr("opacity", quick ? 1 : 0)
    .call((s) => quick || s.transition().delay((_, i) => 350 + (i % cols) * 14 + Math.floor(i / cols) * 22).duration(260).attr("opacity", 1));
  // the first numbers, as numbers
  const nShow = NARROW ? 6 : 8;
  const digits = glass.append("text").attr("x", gx).attr("y", gy + rows * cell + 30).attr("fill", K.text)
    .style("font", `500 ${NARROW ? 13 : 14}px ${font.mono}`)
    .text(vals.slice(0, nShow).map(fmt).join("  ") + "  …");
  fade(digits, 1100 * t0);
  const cnt = glass.append("text").attr("x", gx).attr("y", gy + rows * cell + 56).attr("fill", K.muted)
    .style("font", `500 ${NARROW ? 12 : 13}px ${font.mono}`).text(`${META.d_model} numbers · color = value`);
  fade(cnt, 1250 * t0);
  // color key: the layer's scale
  const kx = win.x + win.w - (NARROW ? 126 : 114), ky = gy + rows * cell + 47;
  const key = glass.append("g");
  d3.range(20).forEach((i) => key.append("rect").attr("x", kx + i * 3.4).attr("y", ky).attr("width", 3.6).attr("height", 9)
    .attr("fill", rampCSS(-1 + (2 * i) / 19)));
  key.append("text").attr("x", kx - 5).attr("y", ky + 8.5).attr("text-anchor", "end").attr("fill", K.muted).style("font", `500 11px ${font.mono}`).text(fmt(-sc));
  key.append("text").attr("x", kx + 73).attr("y", ky + 8.5).attr("fill", K.muted).style("font", `500 11px ${font.mono}`).text(`+${sc.toFixed(2)}`);
  fade(key, 1250 * t0);
  const stateNote = NARROW
    ? ["Thousands of numbers, in large models.", "Nobody can read these by eye."]
    : ["Thousands of numbers, in large models.", "Nobody can read these by eye."];
  stateNote.forEach((line, j) => fade(cap(win.x, win.y + win.h + 28 + j * 21, line,
    { size: 15, fill: j === 1 ? KI.ink : KI.ink2, weight: j === 1 ? 500 : 400 }), 1400 * t0));

  // --- the first 64 fold into the square used from here on ---
  const outline = glass.append("rect").attr("x", gx - 1.5).attr("y", gy - 1.5).attr("width", cols * cell + 3).attr("height", 2 * cell + 3)
    .attr("rx", 3).attr("fill", "none").attr("stroke", K.overseer).attr("stroke-width", 1.6).attr("stroke-dasharray", "4 3");
  fade(outline, 1900 * t0);
  const sq = NARROW ? { x: 300, y: 540, s: 64 } : { x: 110, y: 330, s: 72 };
  const tile = g.append("g").attr("transform", `translate(${sq.x},${sq.y})`);
  tile.append("rect").attr("x", -6).attr("y", -6).attr("width", sq.s + 12).attr("height", sq.s + 12).attr("rx", 8).attr("fill", "#070a10");
  tile.append("image").attr("href", tileURL(TILES.columns[z.layer - 1][6])).attr("width", sq.s).attr("height", sq.s)
    .attr("preserveAspectRatio", "none").style("image-rendering", "pixelated");
  const tNote = NARROW
    ? ["From here on, a hidden state", "is drawn as a square of", "64 of its numbers:"]
    : ["From here on, each hidden", "state is drawn as a square", "of 64 of its numbers."];
  tNote.forEach((line, j) => cap(NARROW ? 20 : 28, NARROW ? 556 + j * 20 : sq.y + sq.s + 32 + j * 19, line, { size: 14.5, fill: KI.ink2 }));
  const arrow = g.append("path").attr("fill", "none").attr("stroke", KI.overseer).attr("stroke-width", 1.6).attr("stroke-dasharray", "4 3")
    .attr("marker-end", "url(#arrow-ink)")
    .attr("d", NARROW ? `M${gx + 40},${gy + 2 * cell + 4} C${gx + 40},${sq.y - 90} ${sq.x + sq.s / 2},${sq.y - 80} ${sq.x + sq.s / 2},${sq.y - 12}`
                      : `M${gx - 4},${gy + cell} C${gx - 60},${gy + cell} ${sq.x + sq.s + 70},${sq.y + sq.s / 2} ${sq.x + sq.s + 12},${sq.y + sq.s / 2}`);
  [tile, arrow].forEach((s) => fade(s, 2100 * t0, 500));

  const foot = cap(NARROW ? 20 : 28, H - 12, `Real: ${META.model}, a 4-layer research model; the token "${word}" in a written-out version of the chain.`,
    { size: 12, fill: KI.ink3, family: font.mono });
  if (NARROW) foot.text(`Real: ${META.model}, the token "${word}".`);
  return new Promise((r) => setTimeout(r, quick ? 0 : 2700));
}
