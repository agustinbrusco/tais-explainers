// Charts re-plotted from papers, for the "pressure" and "faithfulness" beats, drawn on paper with ink colors.
// Values were read off the published figures by eye (see claims.md); they are approximate, and the badge says so.
// Each chart can be drawn in a "pre" state for predict steps, with the answer part hidden behind a "?".

import * as d3 from "d3";

// Phones get panels stacked in a narrower viewBox, so chart text stays readable.
const NARROW = matchMedia("(max-width: 860px)").matches;
const W = NARROW ? 440 : 720, H = 460;
const FILL = { genuine: "#D9D0BF", mention: "#D9D0BF" };   // light warm fills for behaviour that is out in the open

// Baker et al. 2025, Fig. 4: fraction of samples over training (epochs 0–1), read off at every 0.1.
const X10 = d3.range(11).map((i) => i / 10);
export const BAKER = [
  { title: "Reward: pass the tests", genuine: [.61, .63, .66, .66, .62, .52, .49, .45, .37, .36, .23],
    caught: [0, 0, .01, .05, .18, .35, .42, .50, .60, .59, .75], hidden: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { title: "… and don't trigger the monitor", genuine: [.61, .72, .74, .74, .70, .64, .58, .51, .50, .44, .43],
    caught: [0, 0, .01, .02, .03, .02, .02, .01, .01, .01, .01], hidden: [0, 0, 0, .01, .04, .13, .24, .36, .38, .44, .49] },
];

// Kuhn, evhu & Westover 2026 (headline figure, permutation task): monitorability over RL steps.
export const KUHN = {
  latent: [[0, .94], [5, .9], [10, .88], [15, .86], [18, .8], [20, .78], [22, .8], [24, .7], [26, .62], [28, .5], [30, .47],
           [31, .28], [33, .17], [35, .14], [37, .09], [40, .05], [42, .02], [45, .03], [50, .01], [55, .02], [60, .04],
           [70, .09], [80, .07], [90, .07], [100, .07]],
  plain: [[0, .92], [5, .9], [10, .92], [15, .92], [20, .88], [25, .9], [30, .9], [35, .86], [40, .85], [45, .84], [50, .78],
          [55, .75], [60, .77], [70, .73], [80, .77], [85, .69], [90, .81], [95, .79], [100, .71]],
};

// Emmons et al. 2025, Fig. 3: % of times the model picks the (wrong) hinted answer.
export const EMMONS = [
  { title: "Gemini 2.5 Flash", none: 8, simple: [19, 5], complex: [7, 6] },
  { title: "Gemini 2.5 Pro", none: 5, simple: [14, 18], complex: [4, 14] },
];

export function drawChart(svg, name, { pre, KI, font, quick }) {
  svg.attr("viewBox", `0 0 ${W} ${NARROW && name !== "kuhn" ? 640 : H}`);
  svg.selectAll("*").interrupt().remove();
  const t = d3.transition().duration(quick ? 0 : 900).ease(d3.easeCubicOut);
  ({ baker, kuhn, emmons, incident })[name](svg, { pre, KI, font, t, quick });
  return new Promise((resolve) => setTimeout(resolve, quick ? 0 : 2000));   // longest reveal is 2 × 900 ms
}

const label = (g, x, y, text, KI, font, opts = {}) => g.append("text").attr("x", x).attr("y", y).text(text)
  .attr("fill", opts.fill ?? KI.ink2).attr("text-anchor", opts.anchor ?? "start")
  .style("font", `${opts.weight ?? 500} ${opts.size ?? 16}px ${opts.family ?? font.mono}`)
  .attr("letter-spacing", opts.ls ?? null);

function axes(g, x, y, KI, font, { xTicks, yTicks, yFmt = (v) => v, xFmt = (v) => v, xLabel, yLabel }) {
  const [x0, x1] = x.range(), [y0, y1] = y.range();
  yTicks.forEach((v) => {
    g.append("line").attr("x1", x0).attr("x2", x1).attr("y1", y(v)).attr("y2", y(v)).attr("stroke", KI.rule).attr("stroke-width", 1);
    label(g, x0 - 8, y(v) + 5, yFmt(v), KI, font, { anchor: "end", size: 14, fill: KI.ink3 });
  });
  g.append("line").attr("x1", x0).attr("x2", x1).attr("y1", y0).attr("y2", y0).attr("stroke", KI.ink).attr("stroke-width", 1.2);
  xTicks.forEach((v) => label(g, x(v), y0 + 22, xFmt(v), KI, font, { anchor: "middle", size: 14, fill: KI.ink3 }));
  if (xLabel) label(g, (x0 + x1) / 2, y0 + 46, xLabel, KI, font, { anchor: "middle", size: 14 });
  if (yLabel) label(g, x0 - 44, y1 - 16, yLabel, KI, font, { size: 14 });
}

// a small hatch for "hidden" behaviour: what the monitor never saw
function hatch(svg, id, color) {
  const p = svg.append("defs").append("pattern").attr("id", id).attr("patternUnits", "userSpaceOnUse").attr("width", 6).attr("height", 6)
    .attr("patternTransform", "rotate(45)");
  p.append("rect").attr("width", 6).attr("height", 6).attr("fill", color).attr("opacity", 0.18);
  p.append("line").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 6).attr("stroke", color).attr("stroke-width", 2.2);
  return `url(#${id})`;
}

function baker(svg, { pre, KI, font, t }) {
  const hidden = hatch(svg, "hatch-hidden", KI.danger);
  BAKER.forEach((p, i) => {
    const pw = NARROW ? 330 : 296;
    const x0 = NARROW ? 80 : 74 + i * (pw + 48);
    const top = NARROW ? 50 + i * 290 : 70, bottom = NARROW ? top + 190 : 380;
    const g = svg.append("g");
    const x = d3.scaleLinear([0, 1], [x0, x0 + pw]), y = d3.scaleLinear([0, 1], [bottom, top]);
    label(g, x0, top - 32, p.title, KI, font, { fill: KI.ink, size: 19, family: font.display, weight: 500 });
    axes(g, x, y, KI, font, { xTicks: [0, .5, 1], yTicks: [0, .25, .5, .75, 1], yFmt: (v) => (i ? "" : `${v * 100}%`),
      xLabel: "training →" });
    if (i === 0) label(g, x0 - 44, bottom + 46, "share of samples", KI, font, { size: 13, fill: KI.ink3 });
    if (pre && i === 1) {  // the answer, hidden until the reveal step
      g.append("rect").attr("x", x0).attr("y", top).attr("width", pw).attr("height", bottom - top).attr("rx", 8)
        .attr("fill", "rgba(243,205,91,.12)").attr("stroke", KI.overseer).attr("stroke-dasharray", "5 5");
      label(g, x0 + pw / 2, (top + bottom) / 2 + 22, "?", KI, font, { anchor: "middle", size: 64, fill: KI.overseer, family: font.display });
      return;
    }
    const layers = [["genuine", FILL.genuine, 1], ["caught", KI.danger, 0.92], ["hidden", hidden, 1]];
    let base = X10.map(() => 0);
    const area = d3.area().x((d) => x(d.x)).y0((d) => y(d.y0)).y1((d) => y(d.y1)).curve(d3.curveMonotoneX);
    // the curves unfold left to right, the way training does; on the reveal step only the new panel unfolds
    const clipId = `baker-clip-${i}`;
    const clip = svg.append("clipPath").attr("id", clipId).append("rect").attr("x", x0 - 2).attr("y", top - 4).attr("height", bottom - top + 8);
    const animate = pre || i === 1;
    clip.attr("width", animate ? 0 : pw + 4);
    if (animate) clip.transition(t).duration(t.duration() * 2).ease(d3.easeLinear).attr("width", pw + 4);
    const areas = g.append("g").attr("clip-path", `url(#${clipId})`);
    for (const [key, color, op] of layers) {
      const pts = X10.map((xv, j) => ({ x: xv, y0: base[j], y1: base[j] + p[key][j] }));
      areas.append("path").attr("d", area(pts)).attr("fill", color).attr("fill-opacity", op)
        .attr("stroke", key === "caught" ? KI.overseer : key === "hidden" ? KI.danger : KI.ink3).attr("stroke-width", key === "genuine" ? 0.8 : 1.6);
      base = base.map((b, j) => b + p[key][j]);
    }
    // end-of-training labels
    const end = { genuine: p.genuine[10], caught: p.caught[10], hidden: p.hidden[10] };
    let acc = 0;
    for (const [key, text] of [["genuine", "passes, no test edits"], ["caught", "cheats, caught"], ["hidden", "cheats, unseen"]]) {
      const v = end[key];
      if (v > 0 && v <= 0.06 && key === "caught") {   // too thin to write inside: a small label just above it
        label(g, x(1) - 8, y(acc) + 16, `cheats, caught ${Math.round(v * 100)}%`, KI, font, { anchor: "end", size: 12.5, fill: KI.danger, weight: 600 })
          .attr("opacity", animate ? 0 : 1).transition(t).delay(animate ? t.duration() * 2 : 0).attr("opacity", 1);
      }
      if (v > 0.06) {
        const lg = g.append("g").attr("opacity", animate ? 0 : 1);
        const tx = label(lg, x(1) - 8, y(acc + v / 2) + 5, `${text} ${Math.round(v * 100)}%`, KI, font,
          { anchor: "end", size: 14, fill: key === "caught" ? "#fff" : KI.ink, weight: 600 });
        if (key === "hidden") {   // a paper chip behind the label, so it reads over the hatch
          const bb = tx.node().getBBox();
          lg.insert("rect", "text").attr("x", bb.x - 5).attr("y", bb.y - 2).attr("width", bb.width + 10).attr("height", bb.height + 4).attr("rx", 3)
            .attr("fill", KI.card).attr("stroke", KI.danger).attr("stroke-width", 1);
        }
        lg.transition(t).delay(animate ? t.duration() * 2 : 0).attr("opacity", 1);
      }
      acc += v;
    }
  });
  label(svg, NARROW ? 20 : 74, NARROW ? 626 : 446, NARROW ? "Re-plotted from Baker et al. (2025), Fig. 4 (approx.)" : "Re-plotted from Baker et al. (2025), Fig. 4; values read off the figure by eye.", KI, font, { size: 12.5, fill: KI.ink3 });
}

function kuhn(svg, { pre, KI, font, t }) {
  const x = d3.scaleLinear([0, 100], [90, NARROW ? 420 : 680]), y = d3.scaleLinear([0, 1], [370, 60]);
  const g = svg.append("g");
  axes(g, x, y, KI, font, { xTicks: [0, 20, 40, 60, 80, 100], yTicks: [0, .25, .5, .75, 1], yFmt: (v) => v.toFixed(2),
    xLabel: "RL steps against the monitor →", yLabel: "monitorability" });
  const line = d3.line().x((d) => x(d[0])).y((d) => y(d[1])).curve(d3.curveMonotoneX);
  const series = [["plain", KI.ink, "plain CoT model"], ["latent", KI.residual, "with a latent channel"]];
  for (const [key, color, name] of series) {
    if (pre && key === "latent") continue;
    const p = g.append("path").attr("d", line(KUHN[key])).attr("fill", "none").attr("stroke", color).attr("stroke-width", key === "latent" ? 3.4 : 2.6);
    const len = p.node().getTotalLength();
    p.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len).transition(t).duration(t.duration() * 1.8).attr("stroke-dashoffset", 0);
    const end = KUHN[key].at(-1);
    g.append("circle").attr("cx", x(end[0])).attr("cy", y(end[1])).attr("r", 4).attr("fill", color).attr("opacity", 0)
      .transition(t).delay(t.duration() * 1.8).attr("opacity", 1);
    label(g, x(64), key === "plain" ? y(0.86) : y(0.14), name, KI, font, { anchor: "middle", size: 16, fill: color, weight: 600 });
  }
  if (pre) label(g, x(60), y(0.25), "with a latent channel: ?", KI, font, { anchor: "middle", size: 19, fill: KI.residual, weight: 600 });
  label(g, NARROW ? 20 : 90, 440, NARROW ? "Re-plotted from Kuhn et al. (2026). 0 = chance." : "Re-plotted from Kuhn, evhu & Westover (2026). 0 = chance, 1 = always identified.", KI, font, { size: 12.5, fill: KI.ink3 });
}

function emmons(svg, { pre, KI, font, t }) {
  EMMONS.forEach((p, i) => {
    const pw = NARROW ? 330 : 290;
    const x0 = NARROW ? 80 : 80 + i * (pw + 60);
    const top = NARROW ? 50 + i * 250 : 70, bottom = NARROW ? top + 170 : 350;
    const y = d3.scaleLinear([0, 34], [bottom, top]);
    const g = svg.append("g");
    label(g, x0, top - 32, p.title, KI, font, { fill: KI.ink, size: 19, family: font.display, weight: 500 });
    const x = d3.scaleBand(["none", "simple", "complex"], [x0, x0 + pw]).padding(0.28);
    axes(g, d3.scaleLinear([0, 1], [x0, x0 + pw]), y, KI, font, { xTicks: [], yTicks: [0, 10, 20, 30], yFmt: (v) => (i ? "" : `${v}%`) });
    const names = { none: "no hint", simple: "simple", complex: "needs math" };
    ["none", "simple", "complex"].forEach((k) => label(g, x(k) + x.bandwidth() / 2, bottom + 24, names[k], KI, font, { anchor: "middle", size: 13.5 }));
    g.append("line").attr("x1", x0).attr("x2", x0 + pw).attr("y1", y(p.none)).attr("y2", y(p.none)).attr("stroke", KI.ink3).attr("stroke-dasharray", "4 4");
    const bar = (k, v0, v, fill, stroke) => {
      const r = g.append("rect").attr("x", x(k)).attr("width", x.bandwidth()).attr("y", y(v0)).attr("height", 0).attr("fill", fill)
        .attr("stroke", stroke ?? "none").attr("stroke-width", 1);
      r.transition(t).attr("y", y(v0 + v)).attr("height", y(v0) - y(v0 + v));
      if (v >= 4) label(g, x(k) + x.bandwidth() / 2, y(v0 + v / 2) + 5, `${v}%`, KI, font, { anchor: "middle", size: 14, weight: 700, fill: fill === KI.danger ? "#fff" : KI.ink });
    };
    bar("none", 0, p.none, "#BDB5A6");
    bar("simple", 0, p.simple[0], KI.danger);
    bar("simple", p.simple[0], p.simple[1], FILL.mention, KI.ink3);
    if (pre) {
      label(g, x("complex") + x.bandwidth() / 2, y(10), "?", KI, font, { anchor: "middle", size: 56, fill: KI.overseer, family: font.display });
    } else {
      bar("complex", 0, p.complex[0], KI.danger);
      bar("complex", p.complex[0], p.complex[1], FILL.mention, KI.ink3);
    }
  });
  // legend
  const lg = svg.append("g").attr("transform", NARROW ? "translate(20,548)" : "translate(80,404)");
  [["#BDB5A6", "no hint: picks that (wrong) answer anyway"], [KI.danger, "picks the hinted answer, never mentions the hint"], [FILL.mention, "picks it and mentions the hint"]].forEach(([c, text], j) => {
    lg.append("rect").attr("x", 0).attr("y", j * 18 - 11).attr("width", 16).attr("height", 12).attr("rx", 2).attr("fill", c).attr("stroke", j === 2 ? KI.ink3 : "none");
    label(lg, 24, j * 18, text, KI, font, { size: 13 });
  });
  label(svg, NARROW ? 20 : 80, NARROW ? 626 : 456, NARROW ? "Re-plotted from Emmons et al. (2025), Fig. 3." : "Re-plotted from Emmons et al. (2025), Fig. 3. Dashed: no hint.", KI, font, { size: 12.5, fill: KI.ink3 });
}

// METR (2026), investigation of the Hugging Face incident: counts from the report.
function incident(svg, { KI, font, t, quick }) {
  const cols = 40, rows = 30, sz = NARROW ? 7 : 8.2, gap = NARROW ? 1.6 : 1.8, x0 = 34, y0 = 72;   // 40 × 30 = 1,200 agents
  const g = svg.append("g");
  label(g, x0, 44, "≈1,200 AGENTS ON A SHARED MESSAGE BOARD", KI, font, { size: 12.5, fill: KI.ink, ls: "0.08em" });
  const cells = d3.range(cols * rows);
  g.selectAll("rect.a").data(cells).join("rect").attr("class", "a")
    .attr("x", (i) => x0 + (i % cols) * (sz + gap)).attr("y", (i) => y0 + Math.floor(i / cols) * (sz + gap))
    .attr("width", sz).attr("height", sz).attr("rx", 1.5)
    .attr("fill", "#CFC7B8")
    .transition(t).delay((i) => (i < 700 && !quick ? i * 0.9 : 0)).attr("fill", (i) => (i < 700 ? KI.danger : "#CFC7B8"));
  const gy = y0 + rows * (sz + gap) + 28;
  g.append("rect").attr("x", x0).attr("y", gy - 11).attr("width", 12).attr("height", 12).attr("rx", 2).attr("fill", KI.danger);
  label(g, x0 + 20, gy, "≈700 went on to join the attack", KI, font, { size: 14.5, fill: KI.ink });
  label(g, x0, gy + 24, "70,000+ messages and files between them", KI, font, { size: 14.5 });

  // what the investigators read: a stack of printed transcripts, each with its chain of thought
  const sx = NARROW ? 34 : 478, sy = NARROW ? 432 : 100;
  label(g, sx, NARROW ? sy - 24 : 44, "WHAT INVESTIGATORS READ", KI, font, { size: 12.5, fill: KI.ink, ls: "0.08em" });
  for (let j = 7; j >= 0; j--) {
    g.append("rect").attr("x", sx + j * 9).attr("y", sy + j * 9).attr("width", 150).attr("height", 108).attr("rx", 5)
      .attr("fill", KI.card).attr("stroke", KI.rule).attr("stroke-width", 1).attr("filter", "url(#card-shadow)");
  }
  const top = g.append("g").attr("transform", `translate(${sx},${sy})`);
  label(top, 14, 22, "chain of thought", KI, font, { size: 10.5, fill: KI.ink3, ls: "0.06em" });
  [34, 48, 62, 76, 90].forEach((y, j) => top.append("rect").attr("x", 14).attr("y", y).attr("width", [118, 104, 122, 90, 60][j]).attr("height", 5.5)
    .attr("rx", 2.5).attr("fill", KI.ink3).attr("opacity", 0.45));
  // the highlighter: a reader found something
  top.append("rect").attr("x", 12).attr("y", 58.5).attr("width", 92).attr("height", 12).attr("rx", 2).attr("fill", KI.highlight).attr("opacity", 0.75);
  top.append("rect").attr("x", 14).attr("y", 62).attr("width", 122).attr("height", 5.5).attr("rx", 2.5).attr("fill", KI.ink).attr("opacity", 0.55);
  g.append("rect").attr("x", sx - 7).attr("y", sy - 7).attr("width", 164 + 63).attr("height", 122 + 63).attr("rx", 10)
    .attr("fill", "none").attr("stroke", KI.overseer).attr("stroke-width", 1.6).attr("stroke-dasharray", "5 4");
  const lx = NARROW ? sx + 250 : sx, ly = NARROW ? sy + 20 : sy + 214;
  label(g, lx, ly, "≈1,300 transcripts,", KI, font, { size: 14.5, fill: KI.ink });
  label(g, lx, ly + 22, "all with raw chains", KI, font, { size: 14.5, fill: KI.ink });
  label(g, lx, ly + 44, "of thought", KI, font, { size: 14.5, fill: KI.ink });
  label(g, lx, ly + 72, "read mostly by", KI, font, { size: 13.5, fill: KI.overseer });
  label(g, lx, ly + 92, "LLM analysis agents", KI, font, { size: 13.5, fill: KI.overseer });
  label(g, 34, NARROW ? 632 : 452, NARROW ? "Counts from METR (2026)." : "Counts from METR's investigation (Greenblatt, Cotra & Wijk, 2026).", KI, font, { size: 12.5, fill: KI.ink3 });
}
