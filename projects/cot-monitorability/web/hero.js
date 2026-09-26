// The hero figure: the whole argument in one loop, before any words.
// Left, a standard transformer: a pulse climbs each column and is forced into a gold card at the top, and its count
// restarts. Right, full bandwidth: the pulse crosses to the next column through a hidden link and the count keeps growing.
// The two run one after the other (one thing moves at a time). Under reduced motion both are drawn finished.

import * as d3 from "d3";

const COLS = 5, ROWS = 4;
const W = 640, H = 400;
const G = { colW: 50, rowGap: 50, top: 104, cardH: 30 };
const PANELS = [{ x0: 38, mode: "standard", label: "standard" }, { x0: 350, mode: "fullbw", label: "full bandwidth" }];

export function mountHero(el, K, font) {
  const svg = d3.select(el).attr("viewBox", `0 0 ${W} ${H}`);
  svg.append("defs").append("filter").attr("id", "hero-glow").attr("filterUnits", "userSpaceOnUse")
    .attr("x", -20).attr("y", -20).attr("width", W + 40).attr("height", H + 40)
    .html(`<feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>`);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const panels = PANELS.map((p) => drawPanel(svg, p, K, font));

  if (reduced) { panels.forEach((p) => p.finish()); return; }
  let alive = true;
  const loop = async () => {
    while (alive) {
      panels.forEach((p) => p.reset());
      await wait(700);
      for (const p of panels) { await p.play(); await wait(900); }
      await wait(2200);
    }
  };
  // start once visible; stop when the page is hidden to save battery
  new IntersectionObserver(([e], io) => { if (e.isIntersecting) { io.disconnect(); loop(); } }).observe(el);
  document.addEventListener("visibilitychange", () => { if (document.hidden) alive = false; });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function drawPanel(svg, { x0, mode, label }, K, font) {
  const g = svg.append("g");
  const cx = (c) => x0 + G.colW * c + G.colW / 2;
  const cy = (r) => G.top + (ROWS - 1 - r) * G.rowGap;
  const cardY = cy(0) + 52;
  const top = cy(ROWS - 1) - 14;

  // structure
  for (let c = 0; c < COLS; c++) {
    g.append("line").attr("x1", cx(c)).attr("x2", cx(c)).attr("y1", cy(0)).attr("y2", cy(ROWS - 1)).attr("stroke", K.faint).attr("stroke-width", 1.4);
    if (c > 0) for (let r = 0; r < ROWS - 1; r++)
      g.append("line").attr("x1", cx(c - 1)).attr("y1", cy(r)).attr("x2", cx(c)).attr("y2", cy(r + 1)).attr("stroke", K.faint).attr("stroke-width", 1).attr("opacity", 0.5);
    if (mode === "fullbw" && c < COLS - 1)
      g.append("path").attr("d", fbPath(c)).attr("fill", "none").attr("stroke", K.residual).attr("stroke-width", 1.6).attr("stroke-dasharray", "4 4").attr("opacity", 0.5);
    for (let r = 0; r < ROWS; r++) g.append("circle").attr("cx", cx(c)).attr("cy", cy(r)).attr("r", 6).attr("fill", K.residual).attr("opacity", 0.4);
    g.append("rect").attr("x", cx(c) - 20).attr("y", cardY - G.cardH / 2).attr("width", 40).attr("height", G.cardH).attr("rx", 6).attr("fill", K.token);
  }
  g.append("text").attr("x", cx(0) - 18).attr("y", G.top - 44).attr("fill", K.muted).style("font", `500 18px ${font.mono}`)
    .text(label);
  const readout = g.append("text").attr("x", cx(0) - 18).attr("y", cardY + 48)
    .attr("fill", K.residual).style("font", `600 18px ${font.mono}`);

  const story = g.append("g");
  const pulse = g.append("circle").attr("r", 6.5).attr("fill", K.text).attr("filter", "url(#hero-glow)").attr("opacity", 0);

  function fbPath(c) {  // up from the top node, right, down the gutter, into the next column's first node
    const gx = cx(c) + G.colW / 2;
    return `M${cx(c)},${cy(ROWS - 1)} L${cx(c)},${top} L${gx},${top} L${gx},${cy(0)} L${cx(c + 1)},${cy(0)}`;
  }
  function writePath(c) {  // up, right, down the gutter into the next card
    const gx = cx(c) + G.colW / 2;
    return `M${cx(c)},${cy(ROWS - 1)} L${cx(c)},${top} L${gx},${top} L${gx},${cardY} L${cx(c + 1) - 20},${cardY}`;
  }

  // the route as a list of legs; each leg ends at a node (count), a card (reset) or nothing
  function legs() {
    const out = [];
    let count = 0;
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        out.push({ node: [cx(c), cy(r)], count: ++count });
        if (r < ROWS - 1) out.push({ d: `M${cx(c)},${cy(r)} L${cx(c)},${cy(r + 1)}`, kind: "climb" });
      }
      if (c === COLS - 1) break;
      if (mode === "fullbw") out.push({ d: fbPath(c), kind: "link" });
      else { out.push({ d: writePath(c), kind: "write" }, { card: c + 1 }); count = 0; out.push({ d: `M${cx(c + 1)},${cardY - G.cardH / 2} L${cx(c + 1)},${cy(0)}`, kind: "write" }); }
    }
    return out;
  }

  let maxCount = 0;
  function lightNode([x, y], count, quick) {
    const n = story.append("g").attr("transform", `translate(${x},${y})`);
    n.append("circle").attr("r", 10).attr("fill", K.residual);
    n.append("text").attr("text-anchor", "middle").attr("dy", "0.36em").attr("fill", K.bg).style("font", `700 11px ${font.mono}`).text(count);
    if (!quick) n.attr("opacity", 0).transition().duration(140).attr("opacity", 1);
    maxCount = Math.max(maxCount, count);
    readout.text(`dark path ${maxCount}`);
  }
  function lightCard(c, quick) {
    const r = story.append("rect").attr("x", cx(c) - 20).attr("y", cardY - G.cardH / 2).attr("width", 40).attr("height", G.cardH).attr("rx", 6)
      .attr("fill", K.token).attr("stroke", K.overseer).attr("stroke-width", 3.5);
    if (quick) return;
    r.attr("opacity", 0).transition().duration(120).attr("opacity", 1);
    story.append("rect").attr("x", cx(c) - 20).attr("y", cardY - G.cardH / 2).attr("width", 40).attr("height", G.cardH).attr("rx", 8)
      .attr("fill", "none").attr("stroke", K.overseer).attr("stroke-width", 2.5)
      .transition().duration(600).attr("x", cx(c) - 32).attr("y", cardY - G.cardH).attr("width", 64).attr("height", G.cardH * 2).attr("opacity", 0).remove();
  }
  function drawLeg(leg, quick) {
    const p = story.append("path").attr("d", leg.d).attr("fill", "none")
      .attr("stroke", leg.kind === "write" ? K.overseer : K.residual).attr("stroke-width", leg.kind === "write" ? 2.4 : 3)
      .attr("filter", leg.kind === "write" ? null : "url(#hero-glow)");
    const len = p.node().getTotalLength();
    if (!quick) p.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len);
    return { p, len };
  }

  return {
    reset() { story.selectAll("*").interrupt().remove(); pulse.interrupt().attr("opacity", 0); maxCount = 0; readout.text(""); },
    finish() { for (const l of legs()) { if (l.node) lightNode(l.node, l.count, true); else if (l.card !== undefined) lightCard(l.card, true); else drawLeg(l, true); } },
    async play() {
      const list = legs();
      pulse.attr("transform", `translate(${list[0].node[0]},${list[0].node[1]})`).attr("fill", K.text).transition().duration(150).attr("opacity", 1);
      for (const l of list) {
        if (l.node) { lightNode(l.node, l.count); continue; }
        if (l.card !== undefined) { lightCard(l.card); await wait(380); continue; }
        const { p, len } = drawLeg(l);
        const dur = len / (l.kind === "climb" ? 0.22 : 0.55);
        p.transition().duration(dur).ease(d3.easeLinear).attr("stroke-dashoffset", 0);
        await pulse.transition().duration(dur).ease(d3.easeLinear).attr("fill", l.kind === "write" ? K.overseer : K.text)
          .attrTween("transform", () => (u) => { const q = p.node().getPointAtLength(u * len); return `translate(${q.x},${q.y})`; })
          .end().catch(() => {});
      }
      await pulse.transition().duration(250).attr("opacity", 0).end().catch(() => {});
    },
  };
}
