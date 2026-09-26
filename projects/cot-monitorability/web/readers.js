// What latent reasoning does to interpretability tools.
// Each reader (probe, NLA/AO, J-lens) is an instrument on paper with two wires: one taps a hidden state inside the
// glass (the activations it reads), one comes from the transcript (what its labels, training targets or checks lean
// on). Make the reasoning latent: the transcript's cards turn to glass, the first wire survives, the second weakens.
// Outputs are drawn as formats (a score, a sentence, a few tokens), not invented content. Sources in claims.md.

import * as d3 from "d3";
import { poolState, tileURL } from "./tiles.js";

const NARROW = matchMedia("(max-width: 860px)").matches;
const W = NARROW ? 440 : 720, H = NARROW ? 690 : 480;
const COLS = 4, ROWS = 3;
const WIN = NARROW ? { x: 22, y: 26, w: 396, h: 214 } : { x: 22, y: 36, w: 292, h: 300 };
const cx = (c) => (NARROW ? 96 : 76) + c * (NARROW ? 82 : 62);
const cy = (r) => (NARROW ? 196 : 290) - r * (NARROW ? 62 : 86);
const TS = NARROW ? 30 : 28;
const cardY = NARROW ? 270 : 376;
// dir: which gap between rows the activations wire leaves by (+1 above the tapped row, -1 below, 0 straight out)
const READERS = [
  { name: "Probe", node: [3, 2], dir: 0, from: "picked via a transcript judge", out: "score", latent: "selection, checks: weaker?" },
  { name: "NLA · activation oracle", node: [2, 1], dir: 1, from: "outputs checked vs transcript", out: "sentence", latent: "checks: weaker?" },
  { name: "J-lens", node: [1, 1], dir: -1, from: "sees what drives the next token", out: "tokens", latent: "weaker? fewer thoughts become tokens" },
];
const BOX = NARROW ? { x: 22, w: 396, h: 104, y: (i) => 318 + i * 112 } : { x: 386, w: 314, h: 112, y: (i) => 36 + i * 136 };

export function drawReaders(svg, { latent, K, KI, font, quick }) {
  svg.attr("viewBox", `0 0 ${W} ${H}`);
  svg.selectAll("*").interrupt().remove();
  const t = d3.transition().duration(quick ? 0 : 800);
  const g = svg.append("g");
  const tex = (c, r) => tileURL(poolState(c * 11 + r * 5 + 3, r));

  // the model, behind glass
  g.append("rect").attr("x", WIN.x).attr("y", WIN.y).attr("width", WIN.w).attr("height", WIN.h).attr("rx", 12).attr("fill", "url(#glass-fill)").attr("stroke", "#1b2433");
  for (let c = 0; c < COLS; c++) {
    g.append("line").attr("x1", cx(c)).attr("x2", cx(c)).attr("y1", cy(0)).attr("y2", cy(ROWS - 1)).attr("stroke", "#2a3a55").attr("stroke-width", 1.5);
    if (c > 0) for (let r = 0; r < ROWS - 1; r++) for (let q = 0; q < c; q++)
      g.append("path").attr("d", `M${cx(q)},${cy(r)} C${cx(q)},${cy(r) - 30} ${cx(c)},${cy(r + 1) + 30} ${cx(c)},${cy(r + 1)}`)
        .attr("fill", "none").attr("stroke", "#2c4163").attr("stroke-width", 0.9).attr("opacity", 0.6);
    for (let r = 0; r < ROWS; r++) {
      g.append("rect").attr("x", cx(c) - TS / 2 - 1).attr("y", cy(r) - TS / 2 - 1).attr("width", TS + 2).attr("height", TS + 2).attr("rx", 2.5).attr("fill", "#02050b");
      g.append("image").attr("href", tex(c, r)).attr("x", cx(c) - TS / 2).attr("y", cy(r) - TS / 2).attr("width", TS).attr("height", TS)
        .attr("preserveAspectRatio", "none").style("image-rendering", "pixelated").attr("opacity", 0.7);
    }
    // the transcript: cards on paper; when the reasoning stays latent, glass slots holding a state instead
    g.append("line").attr("x1", cx(c)).attr("x2", cx(c)).attr("y1", cardY - 16).attr("y2", WIN.y + WIN.h).attr("stroke", KI.rule).attr("stroke-width", 1.2);
    const card = g.append("g").attr("transform", `translate(${cx(c)},${cardY})`);
    const glassy = latent && c > 0;
    card.append("rect").attr("x", -24).attr("y", -16).attr("width", 48).attr("height", 32).attr("rx", 5)
      .attr("fill", glassy ? "#070a10" : KI.card).attr("stroke", glassy ? K.residual : KI.rule).attr("stroke-width", glassy ? 1.4 : 1)
      .attr("stroke-dasharray", glassy ? "4 3" : null).attr("filter", glassy ? null : "url(#card-shadow)");
    if (glassy) card.append("image").attr("href", tex(c - 1, ROWS - 1)).attr("x", -11).attr("y", -11).attr("width", 22).attr("height", 22)
      .attr("preserveAspectRatio", "none").style("image-rendering", "pixelated");
    else card.append("text").attr("text-anchor", "middle").attr("dy", "0.36em").attr("fill", KI.ink).style("font", `600 15px ${font.mono}`).text(c === 0 ? "Q" : "…");
  }
  g.append("text").attr("x", WIN.x).attr("y", cardY + (NARROW ? 32 : 38)).attr("fill", KI.ink2).style("font", `500 13px ${font.mono}`)
    .text(latent ? "reasoning stays latent: little to read" : "reasoning written out: the transcript");

  // readers
  READERS.forEach((rd, i) => {
    const bx = BOX.x, by = BOX.y(i), bw = BOX.w, bh = BOX.h;
    const [nc, nr] = rd.node;
    // wire 1: activations -> reader (always there). It leaves the tapped square through the gap between rows, so it never
    // crosses another square, then runs to the reader: blue light inside the glass, blue ink on paper.
    const x0 = cx(nc) + TS / 2 + 3, y0 = cy(nr), gx = cx(nc) + (cx(1) - cx(0)) / 2;
    const gy = rd.dir ? (cy(nr) + cy(nr + rd.dir)) / 2 : y0, winR = WIN.x + WIN.w;
    const start = rd.dir ? `M${x0},${y0} L${gx - 6},${y0} Q${gx},${y0} ${gx},${y0 - 6 * rd.dir} L${gx},${gy + 6 * rd.dir} Q${gx},${gy} ${gx + 6},${gy}`
                         : `M${x0},${y0}`;
    const lane = W - 6 - i * 6;                         // phones: each wire drops down its own lane, outside the cards
    const d1 = NARROW
      ? `${start} L${lane - 6},${gy} Q${lane},${gy} ${lane},${gy + 6} L${lane},${by + 24} Q${lane},${by + 30} ${lane - 6},${by + 30} L${bx + bw},${by + 30}`
      : `${start} L${winR},${gy} C${winR + 40},${gy} ${bx - 40},${by + 34} ${bx},${by + 34}`;
    g.append("path").attr("d", d1).attr("fill", "none").attr("stroke", KI.residual).attr("stroke-width", 2.2);
    g.append("path").attr("d", d1).attr("fill", "none").attr("stroke", K.residual).attr("stroke-width", 2.4).attr("clip-path", "url(#readers-glass)");
    g.append("rect").attr("x", cx(nc) - TS / 2 - 4).attr("y", cy(nr) - TS / 2 - 4).attr("width", TS + 8).attr("height", TS + 8).attr("rx", 4)
      .attr("fill", "none").attr("stroke", K.overseer).attr("stroke-width", 2);
    // wire 2: transcript -> reader (labels, targets, checks)
    const d2 = NARROW
      ? `M${WIN.x + 6},${cardY + 16} C${WIN.x - 14},${cardY + 40} ${WIN.x - 14},${by + 50} ${bx},${by + bh - 18}`
      : `M${cx(COLS - 1) + 26},${cardY} C${cx(COLS - 1) + 110},${cardY} ${bx - 70},${by + 78} ${bx},${by + 78}`;
    const w2 = g.append("path").attr("d", d2).attr("fill", "none").attr("stroke", KI.ink2).attr("stroke-width", 1.8);
    w2.transition(t).attr("stroke", latent ? KI.ink3 : KI.ink2).attr("stroke-dasharray", latent ? "3 6" : null).attr("opacity", latent ? 0.7 : 1);

    // the instrument
    const box = g.append("g").attr("transform", `translate(${bx},${by})`);
    box.append("rect").attr("width", bw).attr("height", bh).attr("rx", 10).attr("fill", KI.card).attr("stroke", KI.rule).attr("filter", "url(#card-shadow)");
    box.append("rect").attr("width", 4).attr("height", bh - 20).attr("y", 10).attr("rx", 2).attr("fill", KI.overseer);
    box.append("text").attr("x", 16).attr("y", 28).attr("fill", KI.ink).style("font", `500 18px ${font.display}`).text(rd.name);
    box.append("text").attr("x", 16).attr("y", 54).attr("fill", KI.residual).style("font", `500 12.5px ${font.mono}`).text("reads: activations");
    const m = box.append("text").attr("x", 16).attr("y", 78).attr("fill", KI.ink2).style("font", `500 12.5px ${font.mono}`).text(rd.from);
    if (latent) {
      m.transition(t).attr("opacity", 0.5);
      box.append("text").attr("x", 16).attr("y", 98).attr("fill", KI.overseer).style("font", `600 12px ${font.mono}`).text(rd.latent)
        .attr("opacity", 0).transition(t).attr("opacity", 1);
    }
    // what it outputs, as a format: a score, a sentence, a few tokens
    const ox = bw - (NARROW ? 94 : 92), oy = 18, og = box.append("g").attr("transform", `translate(${ox},${oy})`);
    og.append("rect").attr("x", -8).attr("y", -8).attr("width", 86).attr("height", 52).attr("rx", 6).attr("fill", KI.sheet).attr("stroke", KI.rule);
    if (rd.out === "score") {
      og.append("rect").attr("x", 2).attr("y", 18).attr("width", 64).attr("height", 5).attr("rx", 2.5).attr("fill", KI.rule);
      og.append("rect").attr("x", 2).attr("y", 18).attr("width", 44).attr("height", 5).attr("rx", 2.5).attr("fill", KI.overseer);
      og.append("line").attr("x1", 46).attr("x2", 46).attr("y1", 11).attr("y2", 30).attr("stroke", KI.ink).attr("stroke-width", 1.6);
      og.append("text").attr("x", 2).attr("y", 38).attr("fill", KI.ink3).style("font", `500 10px ${font.mono}`).text("0");
      og.append("text").attr("x", 66).attr("y", 38).attr("text-anchor", "end").attr("fill", KI.ink3).style("font", `500 10px ${font.mono}`).text("1");
      og.append("text").attr("x", 35).attr("y", 5).attr("text-anchor", "middle").attr("fill", KI.ink2).style("font", `500 10px ${font.mono}`).text("a score");
    } else if (rd.out === "sentence") {
      og.append("text").attr("x", 35).attr("y", 5).attr("text-anchor", "middle").attr("fill", KI.ink2).style("font", `500 10px ${font.mono}`).text("a sentence");
      [62, 52, 58].forEach((w, j) => og.append("rect").attr("x", 3).attr("y", 13 + j * 8.5).attr("width", w).attr("height", 4).attr("rx", 2).attr("fill", KI.ink3).attr("opacity", 0.7));
    } else {
      og.append("text").attr("x", 35).attr("y", 5).attr("text-anchor", "middle").attr("fill", KI.ink2).style("font", `500 10px ${font.mono}`).text("tokens");
      [44, 26, 14].forEach((w, j) => {
        og.append("rect").attr("x", 2).attr("y", 11 + j * 10).attr("width", 18).attr("height", 8).attr("rx", 2).attr("fill", KI.card).attr("stroke", KI.ink3).attr("stroke-width", 0.8);
        og.append("rect").attr("x", 24).attr("y", 13 + j * 10).attr("width", w).attr("height", 5).attr("rx", 2).attr("fill", KI.overseer).attr("opacity", 0.8);
      });
    }
  });
  svg.append("defs").append("clipPath").attr("id", "readers-glass").append("rect")
    .attr("x", WIN.x).attr("y", WIN.y).attr("width", WIN.w).attr("height", WIN.h);
  g.append("text").attr("x", NARROW ? 22 : W - 20).attr("y", H - 10).attr("text-anchor", NARROW ? "start" : "end").attr("fill", KI.ink2).style("font", `500 12.5px ${font.mono}`)
    .text(latent ? "activations: still there · what leans on text: weaker?" : "gray wire: what each tool leans on the transcript for");
  return new Promise((r) => setTimeout(r, quick ? 0 : 850));
}
