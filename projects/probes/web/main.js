// A Ruler Through the Glass: prototype of the money shot (the ruler, fitting proves nothing, the flip, the fix).
// Every number on the stage is read from build/proto/cloud.json (data/export_prototype.py). render(i) is a pure
// function of the step index and the toggles' state.
import * as d3 from "d3";
import { mountSteps } from "../../../kit/web/steps.js";

const DATA = await fetch(new URL("../build/proto/cloud.json", import.meta.url)).then((r) => r.json());
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const dur = (ms) => (reduced ? 0 : ms);
const pct = (v) => `${(100 * v).toFixed(1)}%`;

// ---- geometry: a glass window over a paper band ----
const W = 720, H = 540;
const G = { x0: 14, x1: 706, y0: 14, y1: 352 };      // glass
const RULER_Y = G.y1 - 26;                             // the ruler lies along the bottom of the glass
const P = { y0: 382, y1: 512 };                        // paper: the readings' histogram
const svg = d3.select("#cloud");
const defs = svg.append("defs");
defs.append("clipPath").attr("id", "glass-clip").append("rect")
  .attr("x", G.x0).attr("y", G.y0).attr("width", G.x1 - G.x0).attr("height", G.y1 - G.y0).attr("rx", 14);
defs.append("marker").attr("id", "arrowhead").attr("viewBox", "0 0 10 10").attr("refX", 8).attr("refY", 5)
  .attr("markerWidth", 7).attr("markerHeight", 7).attr("orient", "auto-start-reverse")
  .append("path").attr("d", "M0,0 L10,5 L0,10 z").attr("fill", "var(--overseer)");

svg.append("rect").attr("class", "glass-bg").attr("x", G.x0).attr("y", G.y0)
  .attr("width", G.x1 - G.x0).attr("height", G.y1 - G.y0).attr("rx", 14);
const inGlass = svg.append("g").attr("clip-path", "url(#glass-clip)");
const gBoundary = inGlass.append("g");
const gDrops = inGlass.append("g");
const gPts = inGlass.append("g");
const gOverlay = inGlass.append("g");
const gRuler = inGlass.append("g");
const gGroupLabels = inGlass.append("g");
svg.append("rect").attr("class", "glass-edge").attr("x", G.x0).attr("y", G.y0)
  .attr("width", G.x1 - G.x0).attr("height", G.y1 - G.y0).attr("rx", 14);
const glassLabel = svg.append("text").attr("class", "glass-label").attr("x", G.x0 + 18).attr("y", G.y0 + 30);
const stretchNote = svg.append("text").attr("class", "glass-label stretch").attr("x", G.x0 + 18).attr("y", RULER_Y - 14);
const gHist = svg.append("g");
const paperLabel = svg.append("text").attr("class", "paper-label").attr("x", G.x0 + 4).attr("y", P.y1 + 22);
const sideLabels = svg.append("g");
sideLabels.append("text").attr("class", "axis-note").attr("id", "lab-false").attr("x", G.x0 + 8).attr("y", P.y0 - 8).text("← reads false");
sideLabels.append("text").attr("class", "axis-note").attr("id", "lab-true").attr("x", G.x1 - 8).attr("y", P.y0 - 8)
  .attr("text-anchor", "end").text("reads true →");

// the ruler: a gold bar with small graduations, a tall tick at the threshold, and a dashed boundary through the glass
const ruler = gRuler.append("g").attr("class", "ruler-g");
ruler.append("line").attr("class", "ruler").attr("x1", G.x0 + 22).attr("x2", G.x1 - 22).attr("y1", RULER_Y).attr("y2", RULER_Y);
const grads = ruler.append("g").attr("class", "ruler-ticks");
d3.range(G.x0 + 40, G.x1 - 30, 24).forEach((x) =>
  grads.append("line").attr("x1", x).attr("x2", x).attr("y1", RULER_Y - 5).attr("y2", RULER_Y + 5));
const tick = ruler.append("line").attr("class", "tick").attr("y1", RULER_Y - 20).attr("y2", RULER_Y + 20);
const boundary = gBoundary.append("line").attr("class", "boundary").attr("y1", G.y0).attr("y2", RULER_Y - 20);
const rulerLabel = ruler.append("text").attr("class", "ruler-label").attr("x", G.x1 - 30).attr("y", RULER_Y - 12).attr("text-anchor", "end");

// ---- UI state (toggles) ----
const ui = { fit: { labels: "coin", show: "train" }, flip: { layer: "12" }, fix: { layer: "16", set: "cities" } };
const guesses = {};

// ---- views: what each step draws, as data ----
const L = (l) => DATA.layers[l];
function pointsFrom(set, keyPrefix, labels, shape = "c") {
  return set.x.map((x, i) => ({ key: `${keyPrefix}${i}`, x, y: set.y[i], truth: labels[i], shape }));
}
const view = [
  // 0: a ruler through the glass
  () => ({
    fig: "Fig. 1", title: "240 new statements, one ruler (layer 12)", badge: "real · Qwen2.5-1.5B · layer 12 · plane contains the ruler",
    pts: pointsFrom(L(12).aff, "a", DATA.label.aff), thr: L(12).thr, ruler: true, hist: true, drops: true,
    readouts: [`<span>held-out cities read correctly: <b class="gold">${pct(L(12).acc.aff_heldout)}</b></span>`, `<span>748 statements the probe never saw</span>`],
    six: {}, glass: "layer 12 of 28", rulerText: "the probe's reading",
  }),
  // 1: fitting proves nothing
  () => {
    const f = DATA.fit16[ui.fit.labels];
    const part = ui.fit.show === "train" ? f.train : f.held;
    return {
      fig: "Fig. 2", title: ui.fit.labels === "coin" ? "coin-flip labels (layer 16)" : "true labels (layer 16)",
      badge: `real · layer 16 · 300 training statements · C = ${f.C}`,
      pts: pointsFrom(part, ui.fit.show === "train" ? "t" : "h", part.label), thr: f.thr, ruler: true, hist: true, scaleFrom: [f.train, f.held],
      readouts: [`<span>training: <b>${pct(f.acc.train)}</b></span>`,
        `<span>new statements: <b class="${ui.fit.labels === "coin" ? "bad" : "gold"}">${pct(f.acc.held)}</b></span>`,
        `<span>${ui.fit.show === "train" ? "showing training statements" : "showing new statements"}</span>`],
      six: { 1: "now" }, glass: ui.fit.labels === "coin" ? "labels: coin flips" : "labels: true / false", rulerText: "reading",
      legend: ui.fit.labels === "coin" ? "readings · filled = heads · outlined = tails" : undefined,
    };
  },
  // 2: a second ruler
  () => ({
    fig: "Fig. 3", title: "two rulers, both accurate (layer 12)", badge: "real · layer 12 · the plane of the two rulers, true angles",
    pts: pointsFrom(L(12).rulers, "a", DATA.label.aff), thr: L(12).rulers.thr, ruler: true, hist: false, arrow: L(12).rulers.means, aspect: "equal",
    readouts: [`<span>logistic regression: <b>${pct(L(12).acc.aff_heldout)}</b></span>`,
      `<span>difference of means: <b>${pct(L(12).acc.dim_aff_heldout)}</b></span>`,
      `<span>angle in 1,536 dimensions: <b class="gold">${Math.round((Math.acos(L(12).cos_ruler_dmu) * 180) / Math.PI)}°</b></span>`],
    six: { 1: "done" }, glass: "layer 12", rulerText: "logistic regression",
    angle: Math.round((Math.acos(L(12).cos_ruler_dmu) * 180) / Math.PI),
  }),
  // 3: predict: say "not"
  () => ({
    fig: "Fig. 4", title: "the layer-12 ruler, about to read negations", badge: "real · layer 12",
    pts: pointsFrom(L(12).aff, "a", DATA.label.aff), thr: L(12).thr, ruler: true, hist: true,
    readouts: [`<span>affirmative, held out: <b>${pct(L(12).acc.aff_heldout)}</b></span>`, `<span>negated: <b>?</b></span>`],
    six: { 1: "done", 2: "now" }, glass: "layer 12", rulerText: "the probe's reading",
  }),
  // 4: upside down
  () => {
    const l = ui.flip.layer, d = L(l);
    return {
      fig: "Fig. 5", title: `the same ruler, on "is not in" (layer ${l})`, badge: `real · layer ${l} · ruler trained on "is in" only`,
      pts: pointsFrom(d.neg, "a", DATA.label.neg, "c"), flip: true, thr: d.thr, ruler: true, hist: true,
      scaleFrom: [d.aff, d.neg],
      readouts: [`<span>affirmative, held out: <b>${pct(d.acc.aff_heldout)}</b></span>`,
        `<span>negated, read correctly: <b class="bad">${pct(d.acc.neg)}</b></span>`,
        `<span>ranking of negations (AUROC): <b class="bad">${d.acc.neg_auroc.toFixed(3)}</b></span>`,
        `<span>read as false: <b>${pct(d.acc.neg_called_false)}</b></span>`,
        `<span>difference of means: ${pct(d.acc.dim_neg_acc)}, AUROC ${d.acc.dim_neg_auroc.toFixed(2)}</span>`],
      six: { 1: "done", 2: "now" }, glass: `layer ${l} · "is not in"`, rulerText: "the same ruler",
    };
  },
  // 5: the fix, and its limit
  () => {
    const l = ui.fix.layer, f = L(l).fix;
    const cities = ui.fix.set === "cities";
    const pts = cities
      ? [...pointsFrom(f.aff, "a", DATA.label.aff), ...pointsFrom(f.neg, "n", DATA.label.neg, "s")]
      : [...pointsFrom(f.sp, "s", f.sp.label), ...pointsFrom(f.negsp, "z", f.negsp.label, "s")];
    return {
      fig: "Fig. 6", title: cities ? `ruler trained on both, cities (layer ${l})` : `the same ruler, Spanish words (layer ${l})`,
      badge: `real · layer ${l} · trained on "is in" and "is not in"`,
      pts, thr: f.thr, ruler: true, hist: true, scaleFrom: [f.aff, f.neg, f.sp, f.negsp],
      readouts: cities
        ? [`<span>"is in": <b class="gold">${pct(f.acc.aff_heldout)}</b></span>`, `<span>"is not in": <b class="gold">${pct(f.acc.neg_heldout)}</b></span>`, `<span>● affirmative ■ negated</span>`]
        : [`<span>Spanish words: <b class="${f.acc.sp < 0.6 ? "bad" : ""}">${pct(f.acc.sp)}</b></span>`, `<span>their negations: <b class="${f.acc.negsp < 0.6 ? "bad" : ""}">${pct(f.acc.negsp)}</b></span>`,
           `<span>before the fix: ${pct(L(l).acc.sp)} and ${pct(L(l).acc.negsp)}</span>`, `<span>● affirmative ■ negated</span>`],
      six: { 1: "done", 2: "now" }, glass: cities ? `layer ${l} · cities` : `layer ${l} · Spanish-English words`, rulerText: "retrained ruler",
    };
  },
  // 6: truth has two directions
  () => {
    const t = L(16).tgtp;
    const mk = (arr, k, lab, shape) => arr.map((p, i) => ({ key: `${k}${i}`, x: p[0], y: p[1], truth: lab[i], shape }));
    return {
      fig: "Fig. 7", title: "general truth vs the direction that flips with \"not\" (layer 16)", badge: "real · layer 16 · plane of the two difference-of-means directions",
      pts: [...mk(t.aff, "a", DATA.label.aff, "c"), ...mk(t.neg, "n", DATA.label.neg, "s")], thr: t.thr, ruler: true, hist: true, groups: true, aspect: "equal",
      readouts: [`<span>a ruler along general truth reads "is in" <b class="gold">${pct(t.acc.aff)}</b></span>`, `<span>and "is not in" <b class="gold">${pct(t.acc.neg)}</b></span>`],
      six: { 1: "done", 2: "done" }, glass: "layer 16", rulerText: "general truth",
    };
  },
];

// ---- drawing ----
function draw(i, prev) {
  const v = view[i]();
  const all = (v.scaleFrom ?? [{ x: v.pts.map((p) => p.x), y: v.pts.map((p) => p.y) }]);
  const xs = all.flatMap((s) => s.x), ys = all.flatMap((s) => s.y);
  // Equal aspect: one unit of the hidden state is the same length across and up, so distances and angles in the plane
  // are drawn true. Centred on the ruler's threshold, so "reads false | reads true" sits in the middle.
  const q = (a, p) => d3.quantile(a.slice().sort(d3.ascending), p);
  const halfX = Math.max(Math.abs(q(xs, 0.005) - v.thr), Math.abs(q(xs, 0.995) - v.thr)) * 1.06;
  const [ylo, yhi] = [q(ys, 0.005), q(ys, 0.995)];
  const gw = (G.x1 - G.x0) - 68, gh = (RULER_Y - 40) - (G.y0 + 46);
  // Views where 2-D geometry matters (angles between directions) use equal aspect. The others show readings along the
  // ruler, so they fill the glass and say how much left-right is stretched relative to up-down.
  const kx0 = gw / (2 * halfX), ky0 = gh / ((yhi - ylo) * 1.1);
  const [kx, ky] = v.aspect === "equal" ? [Math.min(kx0, ky0), Math.min(kx0, ky0)] : [kx0, ky0];
  const cx = (G.x0 + G.x1) / 2, cy = (G.y0 + 46 + RULER_Y - 40) / 2, ym = (ylo + yhi) / 2;
  const x = d3.scaleLinear().domain([v.thr - gw / (2 * kx), v.thr + gw / (2 * kx)]).range([cx - gw / 2, cx + gw / 2]).clamp(true);
  const y = d3.scaleLinear().domain([ym - gh / (2 * ky), ym + gh / (2 * ky)]).range([cy + gh / 2, cy - gh / 2]).clamp(true);
  const stretch = kx / ky;
  stretchNote.text(stretch > 1.2 ? `↔ stretched ×${stretch < 10 ? stretch.toFixed(1) : Math.round(stretch)}` : v.aspect === "equal" ? "true proportions" : "");
  const t = svg.transition().duration(dur(prev === -1 ? 0 : 1100)).ease(d3.easeCubicInOut);

  // captions
  d3.select("#fig-num").text(v.fig);
  d3.select("#fig-title").text(v.title);
  d3.select("#fig-badge").text(v.badge);
  glassLabel.text(v.glass);
  d3.select("#readouts").html(v.readouts.join(""));
  d3.selectAll("#six li").attr("class", function () { return v.six[this.dataset.q] ?? ""; });

  // ruler, tick at the threshold (reading 0), boundary through the glass
  ruler.transition(t).style("opacity", v.ruler ? 1 : 0);
  tick.transition(t).attr("x1", x(v.thr)).attr("x2", x(v.thr));
  boundary.transition(t).attr("x1", x(v.thr)).attr("x2", x(v.thr)).style("opacity", v.ruler ? 0.55 : 0);
  rulerLabel.text(v.rulerText ? `${v.rulerText} →` : "");

  // points: keyed by statement pair, so in the flip each dot becomes its negated twin.
  // Reads (flip, from step 3): ruler highlights 0-0.8 s; fills swap 0.8-2.0 s (the truth changed); dots drift to their
  // new readings 2.0-3.2 s (the ruler barely moves them); histogram and readouts land 3.2-3.8 s.
  const flipping = v.flip && prev === i - 1;
  const T0 = flipping ? 800 : 0, TF = flipping ? 1200 : 0, TM = flipping ? 1200 : 1100;
  const fillOf = (d) => (d.truth ? "var(--residual)" : "var(--bg)");
  const r = 5;
  const sel = gPts.selectAll(".pt").data(v.pts, (d) => d.key);
  sel.exit().transition(t).style("opacity", 0).remove();
  const enter = sel.enter().append("path").attr("class", "pt").style("opacity", 0).style("stroke", "var(--residual)")
    .style("fill", fillOf).attr("transform", (d) => `translate(${x(d.x)},${y(d.y)})`);
  const merged = enter.merge(sel).attr("d", (d) => shapePath(d.shape, r));
  merged.transition("fill").delay((d, j) => dur(T0 + (flipping ? (j % 240) * 3 : 0))).duration(dur(flipping ? 500 : 600))
    .style("opacity", 1).style("fill", fillOf);
  merged.transition("move").delay(dur(T0 + TF)).duration(dur(TM)).ease(d3.easeCubicInOut)
    .attr("transform", (d) => `translate(${x(d.x)},${y(d.y)})`);
  if (flipping) {
    ruler.select(".ruler").transition("hl").duration(dur(400)).style("stroke-width", 6).transition().duration(dur(400)).style("stroke-width", 3);
  }
  const landAt = T0 + TF + TM;
  d3.select("#readouts").style("opacity", flipping ? 0 : 1);
  if (flipping) d3.timeout(() => d3.select("#readouts").transition().duration(dur(500)).style("opacity", 1), dur(landAt));
  // drop lines from a subset of points to the ruler (step 0 only), staggered left to right
  const drops = v.drops ? v.pts.filter((_, j) => j % 6 === 0).sort((a, b) => a.x - b.x) : [];
  gDrops.selectAll("line").interrupt().remove();
  gDrops.selectAll("line").data(drops).enter().append("line").attr("class", "drop")
    .attr("x1", (d) => x(d.x)).attr("x2", (d) => x(d.x)).attr("y1", (d) => y(d.y)).attr("y2", (d) => y(d.y))
    .transition().delay((d, j) => dur(1200 + j * 25)).duration(dur(500)).attr("y2", RULER_Y)
    .transition().delay(dur(1400)).duration(dur(600)).style("opacity", 0);

  // the difference-of-means arrow (step 2)
  const ar = gOverlay.selectAll("g.dm").data(v.arrow ? [v.arrow] : []);
  ar.exit().transition(t).style("opacity", 0).remove();
  const ae = ar.enter().append("g").attr("class", "dm").style("opacity", 0);
  ae.append("line").attr("class", "arrow").attr("marker-end", "url(#arrowhead)");
  ae.append("circle").attr("class", "mean mf").attr("r", 6);
  ae.append("circle").attr("class", "mean mt").attr("r", 6);
  ae.append("text").attr("class", "angle-label");
  const am = ae.merge(ar);
  am.transition(t).delay(dur(600)).style("opacity", 1);
  am.select("line").attr("x1", (d) => x(d.false[0])).attr("y1", (d) => y(d.false[1]))
    .attr("x2", (d) => x(d.true[0])).attr("y2", (d) => y(d.true[1]));
  am.select(".mf").attr("cx", (d) => x(d.false[0])).attr("cy", (d) => y(d.false[1]));
  am.select(".mt").attr("cx", (d) => x(d.true[0])).attr("cy", (d) => y(d.true[1]));
  am.select("text").attr("class", "legend").attr("x", G.x1 - 18).attr("y", G.y0 + 30).attr("text-anchor", "end")
    .text(`→ difference of means, ${v.angle}° off`);

  // group labels for the truth/polarity plane (step 6)
  const groups = v.groups ? groupCentroids(v.pts) : [];
  const gl = gGroupLabels.selectAll("text").data(groups, (d) => d.name);
  gl.exit().transition(t).style("opacity", 0).remove();
  const mid = (G.y0 + RULER_Y) / 2;
  gl.enter().append("text").attr("class", "group-label").style("opacity", 0).merge(gl)
    .attr("x", (d) => (x(d.x) < (G.x0 + G.x1) / 2 ? G.x0 + 22 : G.x1 - 22))
    .attr("y", (d) => Math.max(G.y0 + 60, Math.min(RULER_Y - 40, y(d.cy) + (y(d.cy) < mid ? -18 : 30))))
    .attr("text-anchor", (d) => (x(d.x) < (G.x0 + G.x1) / 2 ? "start" : "end"))
    .text((d) => d.name).transition(t).delay(dur(900)).style("opacity", 1);

  // the readings on paper: a histogram over the same x scale, true filled and false outlined
  drawHist(v.hist ? v.pts : [], x, t, v.thr, flipping ? landAt - 600 : 0);
  sideLabels.transition(t).style("opacity", v.hist ? 1 : 0);
  paperLabel.text(v.hist ? (v.legend ?? "readings · filled = true · outlined = false") : "");

  // echo the guess at the reveal
  document.querySelectorAll("[data-echo]").forEach((el) => {
    const g = guesses[el.dataset.echo];
    el.textContent = g ? `You said: “${g.text}”. ${g.right ? "Right." : "Not quite."}` : "";
    el.classList.toggle("right", !!g?.right);
  });
  // Settle when the whole choreography has landed (d3.timeout follows the page clock, so --clock frames stay exact).
  const total = flipping ? landAt + 1000 : 1300;
  return new Promise((res) => d3.timeout(res, dur(total)));
}

function shapePath(shape, r) {
  return shape === "s" ? `M${-r * 0.9},${-r * 0.9}h${1.8 * r}v${1.8 * r}h${-1.8 * r}z`
    : `M${-r},0a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;
}

function groupCentroids(pts) {
  const out = [];
  for (const [shape, sname] of [["c", "is in"], ["s", "is not in"]])
    for (const [truth, tname] of [[1, "true"], [0, "false"]]) {
      const g = pts.filter((p) => p.shape === shape && p.truth === truth);
      out.push({ name: `${shape === "c" ? "●" : "■"} "${sname}" · ${tname}`, x: d3.median(g, (p) => p.x), cy: d3.median(g, (p) => p.y) });
    }
  return out;
}

function drawHist(pts, x, t, thr, delay = 0) {
  const [a, b] = x.domain(), half = (b - a) / 2;
  const bins = d3.bin().domain([a, b]).thresholds(d3.range(-1, 1.0001, 1 / 22).map((u) => thr + u * half));
  const bt = bins(pts.filter((p) => p.truth).map((p) => p.x));
  const bf = bins(pts.filter((p) => !p.truth).map((p) => p.x));
  const ymax = Math.max(1, d3.max([...bt, ...bf], (b) => b.length));
  const hy = d3.scaleLinear().domain([0, ymax]).range([0, P.y1 - P.y0 - 8]);
  for (const [cls, data] of [["hist-true", bt], ["hist-false", bf]]) {
    const s = gHist.selectAll(`rect.${cls}`).data(data);
    s.exit().remove();
    s.enter().append("rect").attr("class", cls).attr("y", P.y1).attr("height", 0).merge(s)
      .attr("x", (b) => x(b.x0) + 1).attr("width", (b) => Math.max(0, x(b.x1) - x(b.x0) - 2))
      .transition("hist").delay(dur(delay)).duration(dur(900)).attr("y", (b) => P.y1 - hy(b.length)).attr("height", (b) => hy(b.length));
  }
  gHist.selectAll("line.base").data([0]).join("line").attr("class", "base").attr("x1", G.x0).attr("x2", G.x1)
    .attr("y1", P.y1).attr("y2", P.y1).attr("stroke", "var(--rule)");
}

// ---- toggles and guesses ----
document.querySelectorAll(".toggles").forEach((box) => {
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    ui[box.dataset.for][b.dataset.k] = b.dataset.v;
    box.querySelectorAll(`button[data-k="${b.dataset.k}"]`).forEach((o) => o.classList.toggle("on", o === b));
    draw(window.explainer.current, window.explainer.current);
  });
});
document.querySelectorAll(".guess").forEach((box) => {
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    box.querySelectorAll("button").forEach((o) => o.classList.toggle("on", o === b));
    guesses[box.dataset.q] = { text: b.textContent.trim(), right: b.hasAttribute("data-correct") };
  });
});

// ---- side-dish: Cover's capacity curve, for d = 5, 50 and 1,536 ----
(function coverCurve() {
  const s = d3.select("#sd-cover");
  const w = 420, h = 190, m = { l: 44, r: 14, t: 12, b: 34 };
  const xa = d3.scaleLinear().domain([0, 4]).range([m.l, w - m.r]);
  const ya = d3.scaleLinear().domain([0, 1]).range([h - m.b, m.t]);
  const lf = new Float64Array(4 * 1536 + 2);  // log n!, cumulative
  for (let n = 2; n < lf.length; n++) lf[n] = lf[n - 1] + Math.log(n);
  const logC = (n) => lf[n];
  // share of the 2^n labellings of n points in general position that a hyperplane through the origin in d dims can split:
  // P(Binomial(n-1, 1/2) <= d-1)  (Cover 1965)
  const share = (n, d) => {
    if (n <= d) return 1;
    let acc = 0;
    for (let k = 0; k <= d - 1; k++) acc += Math.exp(logC(n - 1) - logC(k) - logC(n - 1 - k) - (n - 1) * Math.LN2);
    return Math.min(1, acc);
  };
  const dims = [[5, 0.35], [50, 0.6], [1536, 1]];
  for (const [d, op] of dims) {
    const pts = d3.range(0.02, 4.0001, d > 500 ? 0.01 : 0.02).map((a) => [a, share(Math.max(1, Math.round(a * d)), d)]);
    s.append("path").attr("class", "curve").attr("opacity", op)
      .attr("d", d3.line().x((p) => xa(p[0])).y((p) => ya(p[1]))(pts));
    const lab = d === 1536 ? "d = 1,536" : `d = ${d}`;
    const [at, dy] = d === 5 ? [3.2, -6] : d === 50 ? [1.55, -8] : [2.06, 34];
    s.append("text").attr("class", "note").attr("x", xa(at) + 5).attr("y", ya(share(Math.max(1, Math.round(at * d)), d)) + dy).text(lab);
  }
  s.append("g").attr("class", "axis").attr("transform", `translate(0,${h - m.b})`).call(d3.axisBottom(xa).ticks(4).tickFormat((v) => `${v}`));
  s.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(ya).ticks(2).tickFormat(d3.format(".0%")));
  s.append("text").attr("class", "note").attr("x", (m.l + w - m.r) / 2).attr("y", h - 4).attr("text-anchor", "middle").text("points per dimension, n / d");
  s.append("line").attr("class", "mark").attr("x1", xa(300 / 1536)).attr("x2", xa(300 / 1536)).attr("y1", ya(0)).attr("y2", ya(1));
  s.append("text").attr("class", "mark-label").attr("x", xa(300 / 1536) + 5).attr("y", ya(0.55)).text("our 300");
})();

mountSteps({ render: (i, prev) => draw(i, prev) });
