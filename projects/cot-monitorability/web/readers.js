// What latent reasoning does to interpretability tools.
// Each reader (probe, NLA/AO, J-lens) has two wires: one from the activations it reads, and one from the text
// it borrows meaning from (labels, training targets, verification). Make the reasoning latent and the first wire
// survives while the second is cut. Schematic; the sources for each "meaning from" label are in claims.md.

import * as d3 from "d3";

// Phones: the model on top, the readers stacked below it, in a narrow viewBox.
const NARROW = matchMedia("(max-width: 860px)").matches;
const W = NARROW ? 440 : 720, H = NARROW ? 640 : 470;
const COLS = 4, ROWS = 3;
const cx = (c) => (NARROW ? 110 : 70) + c * 70, cy = (r) => (NARROW ? 190 : 330) - r * (NARROW ? 60 : 80), cardY = NARROW ? 250 : 400;
const READERS = [
  { name: "Probe", y: NARROW ? 318 : 60, node: [3, 2], from: "picked via a transcript judge" },
  { name: "NLA · activation oracle", y: NARROW ? 420 : 190, node: [2, 1], from: "outputs checked vs transcript" },
  { name: "J-lens", y: NARROW ? 522 : 320, node: [1, 1], from: "reads what's about to be said" },
];

export function drawReaders(svg, { latent, K, font, quick }) {
  svg.attr("viewBox", `0 0 ${W} ${H}`);
  svg.selectAll("*").interrupt().remove();
  const t = d3.transition().duration(quick ? 0 : 800);
  const g = svg.append("g");

  // the little model
  for (let c = 0; c < COLS; c++) {
    g.append("line").attr("x1", cx(c)).attr("x2", cx(c)).attr("y1", cy(0)).attr("y2", cy(ROWS - 1)).attr("stroke", K.faint).attr("stroke-width", 1.6);
    g.append("line").attr("x1", cx(c)).attr("x2", cx(c)).attr("y1", cardY - 16).attr("y2", cy(0)).attr("stroke", latent ? K.residual : K.token)
      .attr("stroke-width", 1.4).attr("opacity", 0.5).attr("stroke-dasharray", latent ? "4 4" : null);
    if (c > 0) for (let r = 0; r < ROWS - 1; r++)
      g.append("line").attr("x1", cx(c - 1)).attr("y1", cy(r)).attr("x2", cx(c)).attr("y2", cy(r + 1)).attr("stroke", K.faint).attr("opacity", 0.5);
    for (let r = 0; r < ROWS; r++) g.append("circle").attr("cx", cx(c)).attr("cy", cy(r)).attr("r", 8).attr("fill", K.residual).attr("opacity", 0.6);
    const card = g.append("g").attr("transform", `translate(${cx(c)},${cardY})`);
    card.append("rect").attr("x", -26).attr("y", -16).attr("width", 52).attr("height", 32).attr("rx", 6)
      .attr("fill", latent ? "none" : K.token).attr("stroke", latent ? K.residual : "none").attr("stroke-width", 2)
      .attr("stroke-dasharray", latent ? "5 4" : null).attr("filter", latent ? null : "url(#paper)");
    card.append("text").attr("text-anchor", "middle").attr("dy", "0.36em").attr("fill", latent ? K.residual : K.bg)
      .style("font", latent ? `600 22px ${font.display}` : `600 15px ${font.mono}`).text(latent ? "∿" : c === 0 ? "Q" : "…");
  }
  g.append("text").attr("x", cx(0) - 30).attr("y", cardY + (NARROW ? 36 : 42)).attr("fill", K.muted).style("font", `500 15px ${font.mono}`)
    .text(latent ? "reasoning stays latent" : "reasoning written as text");

  // readers
  for (const rd of READERS) {
    const x0 = NARROW ? 36 : 400, w = NARROW ? 340 : 300, h = 92;
    const lane = 392 + READERS.indexOf(rd) * 14;   // phones: each activations wire gets its own lane down the right edge
    const [nc, nr] = rd.node;
    // wire 1: activations -> reader (always there)
    g.append("path").attr("d", NARROW
        ? `M${cx(nc)},${cy(nr)} L${lane - 8},${cy(nr)} Q${lane},${cy(nr)} ${lane},${cy(nr) + 8} L${lane},${rd.y + 22} Q${lane},${rd.y + 30} ${lane - 8},${rd.y + 30} L${x0 + w},${rd.y + 30}`
        : `M${cx(nc)},${cy(nr)} C${cx(nc) + 90},${cy(nr)} ${x0 - 80},${rd.y + 30} ${x0},${rd.y + 30}`)
      .attr("fill", "none").attr("stroke", K.residual).attr("stroke-width", 2.2).attr("opacity", 0.85);
    g.append("circle").attr("cx", cx(nc)).attr("cy", cy(nr)).attr("r", 10).attr("fill", "none").attr("stroke", K.overseer).attr("stroke-width", 2);
    // wire 2: text -> reader (meaning, labels, verification)
    const wire = g.append("path").attr("d", NARROW
        ? `M${cx(0) - 26},${cardY} C${10},${cardY} ${10},${rd.y + 66} ${x0},${rd.y + 66}`
        : `M${cx(COLS - 1) + 26},${cardY} C${360},${cardY} ${x0 - 60},${rd.y + 66} ${x0},${rd.y + 66}`)
      .attr("fill", "none").attr("stroke", K.token).attr("stroke-width", 2).attr("opacity", 0.8);
    wire.transition(t).attr("stroke", latent ? K.faint : K.token).attr("stroke-dasharray", latent ? "3 7" : null).attr("opacity", latent ? 0.6 : 0.8);

    const box = g.append("g").attr("transform", `translate(${x0},${rd.y})`);
    box.append("rect").attr("width", w).attr("height", h).attr("rx", 10).attr("fill", K.surface).attr("stroke", K.overseer).attr("stroke-width", 2);
    box.append("text").attr("x", 14).attr("y", 26).attr("fill", K.overseer).style("font", `600 18px ${font.display}`).text(rd.name);
    box.append("text").attr("x", 14).attr("y", 50).attr("fill", K.residual).style("font", `500 14px ${font.mono}`).text("reads: activations ✓");
    const m = box.append("text").attr("x", 14).attr("y", 72).style("font", `500 14px ${font.mono}`).attr("fill", K.muted).text(rd.from);
    if (latent) {
      m.transition(t).attr("opacity", 0.5);
      box.append("text").attr("x", w - 14).attr("y", 26).attr("text-anchor", "end").attr("fill", K.overseer)
        .style("font", `500 14px ${font.mono}`).text("weaker?").attr("opacity", 0).transition(t).attr("opacity", 1);
    }
  }
  g.append("text").attr("x", NARROW ? 40 : 400).attr("y", NARROW ? 636 : 448).attr("fill", K.muted).style("font", `500 14px ${font.mono}`)
    .text(latent ? "activations: still there · checks: weaker?" : "pale wire: checks that lean on the transcript");
  return new Promise((r) => setTimeout(r, quick ? 0 : 850));
}
