// The stage figure of "What a Probe Reads": a glass window onto the hidden states, and the paper where a probe's scores
// land. Everything is drawn from the per-layer basis coordinates, so every frame is an orthogonal projection of real
// states (lin.js), and every count on paper is computed from the dots it draws.
//
// Visual grammar (see script.md, "Visual grammar"):
//   glass = the model's interior; blue points = hidden states; filled = true, hollow = false; circle = affirmative,
//   square = negated; a gold ring = a statement the probe was fitted to.
//   gold = reading: a probe is drawn as its level sets (lines of equal score, one logit apart, perpendicular to w), the
//   heavy one its decision boundary, which crosses the glass edge onto paper. Dashed = another probe's boundary (a ghost).
//   paper = readable: each statement's score is one gold-ink dot, piled where it lands; counts come from those dots.
//   The grid is in the hidden state's own units: square cells = true proportions, wide cells = a stretched axis.
import * as d3 from "d3";
import { dot, frameAt, dodge, clamp } from "./lin.js";

const TAU = Math.PI * 2;
const ease = d3.easeCubicInOut;
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();

/** Circle-to-square morph as one 24-gon, so shapes interpolate smoothly (m = 0 circle, 1 square). */
function shapePath(r, m) {
  const n = 24, pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + Math.PI / 4;
    const cx = Math.cos(a), cy = Math.sin(a);
    const s = 0.9 / Math.max(Math.abs(cx), Math.abs(cy));      // square of half-side 0.9 r
    const k = (1 - m) + m * s;
    pts.push([(r * cx * k).toFixed(2), (r * cy * k).toFixed(2)]);
  }
  return `M${pts.map((p) => p.join(",")).join("L")}Z`;
}

export const LAYOUT = {
  desktop: { W: 720, H: 592, glass: { x0: 10, y0: 58, x1: 710, y1: 370, rx: 12 }, pileTop: 384, floor: 498,
             ptR: 3.4, dotR: 2.5, cardY: 10, font: 22 },
  phone:   { phone: true, W: 720, H: 612, glass: { x0: 8, y0: 62, x1: 712, y1: 382, rx: 12 }, pileTop: 396, floor: 512,
             ptR: 5.2, dotR: 4.2, cardY: 10, font: 24 },
};

export class Figure {
  constructor(svgEl, layout, { tip = null, readouts = null, reduced = false } = {}) {
    this.L = layout;
    this.svg = d3.select(svgEl).attr("viewBox", `0 0 ${layout.W} ${layout.H}`);
    this.tipEl = tip;
    this.readEl = readouts;
    this.reduced = reduced;
    this.cur = null;            // what is on screen now: {frame, lattice, sc, psc, probe, ...}
    this.pts = new Map();       // key -> point state
    this.timer = null;
    this.id = `f${Math.random().toString(36).slice(2, 7)}`;
    this.build();
  }

  dur(ms) { return this.reduced ? 0 : ms; }

  build() {
    const { W, H, glass: G } = this.L;
    const s = this.svg;
    const defs = s.append("defs");
    defs.append("clipPath").attr("id", `${this.id}-glass`).append("rect")
      .attr("x", G.x0).attr("y", G.y0).attr("width", G.x1 - G.x0).attr("height", G.y1 - G.y0).attr("rx", G.rx);
    defs.append("clipPath").attr("id", `${this.id}-paper`).append("path").attr("clip-rule", "evenodd")
      .attr("d", `M-50,-50H${W + 50}V${H + 50}H-50Z M${G.x0},${G.y0}h${G.x1 - G.x0}v${G.y1 - G.y0}h${G.x0 - G.x1}Z`);
    const grad = defs.append("linearGradient").attr("id", `${this.id}-gfill`).attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 1);
    grad.append("stop").attr("offset", 0).attr("stop-color", "#101723");
    grad.append("stop").attr("offset", 1).attr("stop-color", "#070a10");
    const vig = defs.append("radialGradient").attr("id", `${this.id}-vig`).attr("cx", "50%").attr("cy", "42%").attr("r", "75%");
    vig.append("stop").attr("offset", "60%").attr("stop-color", "#000").attr("stop-opacity", 0);
    vig.append("stop").attr("offset", "100%").attr("stop-color", "#000").attr("stop-opacity", 0.45);
    defs.append("filter").attr("id", `${this.id}-glow`).attr("filterUnits", "userSpaceOnUse")
      .attr("x", -50).attr("y", -50).attr("width", W + 100).attr("height", H + 100)
      .html(`<feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>`);
    defs.append("filter").attr("id", `${this.id}-card`).attr("x", "-10%").attr("y", "-30%").attr("width", "120%").attr("height", "170%")
      .html(`<feDropShadow dx="0" dy="1.5" stdDeviation="1.6" flood-color="#3c2d14" flood-opacity="0.22"/>`);

    const clipG = `url(#${this.id}-glass)`, clipP = `url(#${this.id}-paper)`;
    this.clip = { glass: clipG, paper: clipP };
    s.append("rect").attr("class", "glass-bg").attr("x", G.x0).attr("y", G.y0).attr("width", G.x1 - G.x0)
      .attr("height", G.y1 - G.y0).attr("rx", G.rx).attr("fill", `url(#${this.id}-gfill)`);
    const g = s.append("g").attr("clip-path", clipG);
    this.gGridA = g.append("g").attr("class", "grid");
    this.gGridB = g.append("g").attr("class", "grid");
    this.gLevelsOld = g.append("g").attr("class", "levels old");
    this.gLevels = g.append("g").attr("class", "levels");
    this.gGhosts = g.append("g").attr("class", "ghosts");
    this.gTrailsG = g.append("g").attr("class", "trails");
    this.gRings = g.append("g").attr("class", "rings");
    this.gPts = g.append("g").attr("class", "pts");
    this.gMeans = g.append("g").attr("class", "means");
    this.gArcs = g.append("g").attr("class", "arcs");
    this.gGroups = g.append("g").attr("class", "groups");
    this.gHiG = g.append("g").attr("class", "hilite");
    g.append("rect").attr("x", G.x0).attr("y", G.y0).attr("width", G.x1 - G.x0).attr("height", G.y1 - G.y0)
      .attr("fill", `url(#${this.id}-vig)`).attr("pointer-events", "none");
    s.append("rect").attr("class", "glass-edge").attr("x", G.x0 + 0.5).attr("y", G.y0 + 0.5).attr("width", G.x1 - G.x0 - 1)
      .attr("height", G.y1 - G.y0 - 1).attr("rx", G.rx);
    this.gGlassLab = s.append("g").attr("class", "glass-labels");
    this.labLayer = this.gGlassLab.append("text").attr("class", "glass-label").attr("x", G.x0 + 16).attr("y", G.y0 + 30);
    this.labGrid = this.gGlassLab.append("text").attr("class", "glass-label faint").attr("x", G.x0 + 16).attr("y", G.y1 - 14);
    this.labAxisX = this.gGlassLab.append("text").attr("class", "glass-label axis-x").attr("x", G.x1 - 16).attr("y", G.y1 - 14).attr("text-anchor", "end");
    this.gLegend = s.append("g").attr("class", "legend");
    this.gGauge = this.gGlassLab.append("g").attr("class", "gauge");
    const p = s.append("g").attr("class", "paper");
    this.gZeroP = p.append("g");
    this.gTrailsP = p.append("g").attr("class", "trails-p").attr("clip-path", clipP);
    this.gDots = p.append("g").attr("class", "dots");
    this.gAxis = p.append("g").attr("class", "paxis");
    this.gCounts = p.append("g").attr("class", "counts");
    this.gHiP = p.append("g").attr("class", "hilite-p");
    this.gCards = s.append("g").attr("class", "cards");

    // hover: the nearest point or paper dot shows its statement
    this.svg.on("pointermove", (e) => this.hover(e)).on("pointerleave", () => this.unhover());
  }

  // ---- geometry ----
  glassCenter() { const G = this.L.glass; return [(G.x0 + G.x1) / 2, (G.y0 + 40 + G.y1 - 22) / 2]; }
  toScreen(c, st) {
    const [GX, GY] = this.glassCenter();
    const x = dot(c, st.frame.u), y = dot(c, st.frame.v);
    return [GX + (x - st.sc.cx) * st.sc.kx, GY - (y - st.sc.cy) * st.sc.ky];
  }
  planeToScreen(x, y, st) {
    const [GX, GY] = this.glassCenter();
    return [GX + (x - st.sc.cx) * st.sc.kx, GY - (y - st.sc.cy) * st.sc.ky];
  }
  paperX(score, st) { return st.psc.x0 + score * st.psc.k; }

  /** Glass scale for a view: fit the given coordinate rows (quantiles) into the glass, equal aspect or stretched. */
  fitScale(view, rows) {
    const G = this.L.glass;
    const f = view.frame;
    const xs = rows.map((c) => dot(c, f.u)), ys = rows.map((c) => dot(c, f.v));
    const q = (a, p) => d3.quantile(a.slice().sort(d3.ascending), p);
    const centreX = view.centreX ?? (view.probe ? view.probe.thr * dot(view.probe.coef, f.u) : (q(xs, 0.5)));
    const halfX = Math.max(Math.abs(q(xs, 0.004) - centreX), Math.abs(q(xs, 0.996) - centreX)) * 1.05;
    const [ylo, yhi] = [q(ys, 0.004), q(ys, 0.996)];
    const gw = G.x1 - G.x0 - 60, gh = G.y1 - G.y0 - 92;
    let kx = gw / (2 * halfX), ky = gh / ((yhi - ylo) * 1.08);
    if (view.aspect === "equal") kx = ky = Math.min(kx, ky);
    return { kx, ky, cx: centreX, cy: (ylo + yhi) / 2 };
  }

  gridStep(sc) {
    const m = Math.min(sc.kx, sc.ky);
    for (const g of [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 50]) if (g * m >= 30) return g;
    return 100;
  }

  // ---- the main entry: move to a new view ----
  /**
   * view = { key, layer, pts: [{key, c, truth, shape, ring, text}], frame, lattice?, sc (glass scale), psc (paper scale),
   *          probe: {coef, thr, norm?, kind}, ghosts: [...], means: [...], cards: [...], groups: [...],
   *          paperLabel, glassLabel, gridNote, readouts (html), choreo: "cut"|"move"|"read"|"flip"|"rotate" }
   * Returns a promise that settles when the choreography has landed (d3.timeout follows the page clock).
   */
  show(view) {
    if (this.timer) { this.timer.stop(); this.timer = null; this.settle(); }
    const L = this.L;
    const prev = this.cur;
    const choreo = !prev || this.reduced ? "cut" : (view.choreo ?? "move");
    const tgt = { ...view, lattice: view.lattice ?? view.frame };
    // --- points: match by key ---
    const next = new Map();
    for (const p of view.pts) {
      const old = this.pts.get(p.key);
      const s = old ? { ...old } : { key: p.key, c0: p.c, c: p.c, op0: 0, op: 0, fill0: p.truth, m0: p.shape === "s" ? 1 : 0, ring0: 0, el: null };
      s.c0 = old ? old.c : p.c;
      s.c1 = p.c;
      s.op0 = old ? old.op : 0;
      s.fill0 = old ? old.fillNow : p.truth;
      s.fill1 = p.truth;
      s.m0 = old ? old.mNow : (p.shape === "s" ? 1 : 0);
      s.m1 = p.shape === "s" ? 1 : 0;
      s.ring0 = old ? old.ringNow : 0;
      s.ring1 = p.ring ? 1 : 0;
      s.text = p.text; s.truth = p.truth; s.shape = p.shape; s.set = p.set; s.isNew = !old;
      next.set(p.key, s);
    }
    const leaving = [...this.pts.values()].filter((s) => !next.has(s.key));
    for (const s of leaving) { s.c0 = s.c; s.c1 = s.c; s.op0 = s.op; s.leaving = true; }

    // --- scores and piles at the target ---
    const dotR = L.dotR, floor = L.floor, maxH = L.floor - L.pileTop;
    const tProbe = view.probe;
    const list = [...next.values()];
    const kS = view.paperUnits ? 1 : (tProbe?.norm ?? 1);
    const sc1 = (s) => (tProbe ? kS * (dot(s.c1, tProbe.coef) - tProbe.thr) : 0);
    list.forEach((s) => { s.score1 = sc1(s); });
    const xs1 = list.map((s) => this.paperX(s.score1, tgt));
    const hs = view.paper === false ? list.map(() => 0) : dodge(xs1, dotR, maxH);
    list.forEach((s, i) => { s.px1 = xs1[i]; s.py1 = floor - dotR - hs[i]; });
    list.forEach((s) => {
      const old = this.pts.get(s.key);
      s.px0 = old?.pxNow ?? s.px1; s.py0 = old?.pyNow ?? s.py1;
      s.dop0 = old ? old.dopNow : 0;
      s.dop1 = view.paper === false ? 0 : 1;
    });

    // --- the timeline ---
    const T = timeline(choreo, view, this.dur.bind(this));
    // a different space (another layer's basis, or another dataset's plane) can't be interpolated: cross-fade instead
    const sameSpace = !!prev && prev.space === view.space;
    const st0 = sameSpace ? prev : { frame: tgt.frame, lattice: tgt.lattice, sc: tgt.sc, psc: tgt.psc };
    const planeSame = sameSpace ? Math.abs(detPlane(prev.frame, tgt.frame)) > 0.999 : false;
    this.prevState = prev && !sameSpace ? { frame: prev.frame, sc: prev.sc } : null;
    for (const s of leaving) s.oldSpace = !sameSpace;
    this.pts = new Map([...next, ...leaving.map((s) => [s.key, s])]);
    // what doesn't change stays put: the same probe keeps its level sets, the same paper scale keeps its axis
    const sameProbe = sameSpace && !!prev.probe && !!view.probe && prev.probe.thr === view.probe.thr &&
      prev.probe.coef.every((x, i) => x === view.probe.coef[i]);
    const samePaper = sameSpace && Math.abs(prev.psc.k - tgt.psc.k) < 1e-9 && Math.abs(prev.psc.x0 - tgt.psc.x0) < 1e-6 &&
      prev.paperLabel === view.paperLabel && prev.paper !== false && view.paper !== false;
    this.renderStatic(view, T);
    const start = performance.now();
    const step = (elapsed) => {
      const ph = (name) => T.phase(name, elapsed);
      const pm = ease(ph("move"));
      const st = {
        frame: frameAt(st0.frame, tgt.frame, pm),
        sc: lerpSc(st0.sc, tgt.sc, pm),
        psc: { x0: lerpN(st0.psc.x0, tgt.psc.x0, pm), k: lerpN(st0.psc.k, tgt.psc.k, pm) },
      };
      this.now = st;
      this.drawGrid(st0, tgt, st, planeSame, pm, ph("grid"));
      this.drawLevels(view, st, sameProbe ? 1 : ph("probe"), prev);
      // a retrained probe: the old level sets turn with the view, then give way to the new ones
      this.drawOldLevels(sameSpace && !sameProbe ? prev.probe : null, st, 1 - ph("probe"));
      this.drawGhosts(view, st, ph("probe"));
      this.drawMeans(view, st, ph("probe"));
      this.drawPoints(st, T, elapsed);
      this.drawDots(st, T, elapsed, view);
      this.drawCards(view, st, ph("cards"));
      this.drawGroups(view, st, ph("cards"));
      return elapsed >= T.total;
    };
    step(this.reduced || choreo === "cut" ? T.total : 0);
    this.cur = { ...tgt, frame: tgt.frame, sc: tgt.sc, psc: tgt.psc };
    // readouts land last; until then the old ones stay, dimmed, so the panel never goes blank
    if (this.readEl) {
      const r = d3.select(this.readEl).interrupt();
      const html = view.readouts ?? "";
      if (T.readout > 0 && r.html()) {
        r.transition().duration(this.dur(250)).style("opacity", 0.3)
          .transition().delay(Math.max(0, T.readout - 250)).duration(0).on("start", function () { d3.select(this).html(html); })
          .transition().duration(this.dur(450)).style("opacity", 1);
      } else if (T.readout > 0) {
        r.html(html).style("opacity", 0).transition().delay(T.readout).duration(this.dur(450)).style("opacity", 1);
      } else r.html(html).style("opacity", 1);
    }
    this.drawAxis(view, T, samePaper);
    this.drawCounts(view, T);
    if (this.reduced || choreo === "cut") { this.finish(); return Promise.resolve(); }
    return new Promise((res) => {
      this.timer = d3.timer((el) => {
        if (step(Math.min(el, T.total))) { this.timer.stop(); this.timer = null; this.finish(); res(); }
      });
      void start;
    });
  }

  settle() { /* the next show() starts from the current interpolated state (kept in each point's *Now fields) */ }

  finish() {
    for (const s of [...this.pts.values()]) {
      if (s.leaving) { s.el?.remove(); s.dotEl?.remove(); s.ringEl?.remove(); this.pts.delete(s.key); continue; }
      s.c = s.c1; s.op = 1; s.fillNow = s.fill1; s.mNow = s.m1; s.ringNow = s.ring1;
      s.pxNow = s.px1; s.pyNow = s.py1; s.dopNow = s.dop1;
    }
    this.gTrailsG.selectAll("*").remove();
    this.gTrailsP.selectAll("*").remove();
    this.gLevelsOld.selectAll("*").remove();
  }

  // ---- drawing pieces (called every frame of a transition) ----
  drawGrid(st0, tgt, st, planeSame, pm, pg) {
    const G = this.L.glass;
    const draw = (gSel, lattice, sc, alpha) => {
      const a = alpha * Math.abs(detPlane(lattice, st.frame));
      if (a < 0.02) { gSel.selectAll("*").remove(); return; }
      const step = this.gridStep(sc);
      const lines = [];
      // lattice coordinates visible in the glass: invert roughly by sampling the corners
      const span = Math.max((G.x1 - G.x0) / Math.min(st.sc.kx, st.sc.ky), (G.y1 - G.y0) / Math.min(st.sc.kx, st.sc.ky)) * 0.75;
      const cU = st.sc.cx * dot(st.frame.u, lattice.u) + st.sc.cy * dot(st.frame.v, lattice.u);
      const cV = st.sc.cx * dot(st.frame.u, lattice.v) + st.sc.cy * dot(st.frame.v, lattice.v);
      const n = Math.ceil(span / step) + 1;
      if (n > 80) { gSel.selectAll("*").remove(); return; }
      const toS = (a1, b1) => {
        const x = a1 * dot(lattice.u, st.frame.u) + b1 * dot(lattice.v, st.frame.u);
        const y = a1 * dot(lattice.u, st.frame.v) + b1 * dot(lattice.v, st.frame.v);
        return this.planeToScreen(x, y, st);
      };
      const i0 = Math.floor((cU - span) / step), i1 = Math.ceil((cU + span) / step);
      const j0 = Math.floor((cV - span) / step), j1 = Math.ceil((cV + span) / step);
      for (let i = i0; i <= i1; i++) lines.push([toS(i * step, cV - span), toS(i * step, cV + span), i === 0]);
      for (let j = j0; j <= j1; j++) lines.push([toS(cU - span, j * step), toS(cU + span, j * step), j === 0]);
      gSel.selectAll("line").data(lines).join("line")
        .attr("x1", (d) => d[0][0]).attr("y1", (d) => d[0][1]).attr("x2", (d) => d[1][0]).attr("y2", (d) => d[1][1])
        .attr("class", (d) => (d[2] ? "gl origin" : "gl")).style("opacity", a);
      return step;
    };
    if (!this.cur && !planeSame) {
      draw(this.gGridA, tgt.lattice, st.sc, 1); this.gGridB.selectAll("*").remove();
    } else if (planeSame && st0.lattice === tgt.lattice) {
      draw(this.gGridA, tgt.lattice, st.sc, 1); this.gGridB.selectAll("*").remove();
    } else if (planeSame && Math.abs(detPlane(st0.lattice, tgt.lattice)) > 0.999) {
      // same plane, lattice rotates rigidly with the view (an in-plane rotation)
      draw(this.gGridA, st0.lattice, st.sc, 1); this.gGridB.selectAll("*").remove();
      if (pm >= 1) { draw(this.gGridA, st0.lattice, st.sc, 1); }
    } else {
      draw(this.gGridA, st0.lattice ?? tgt.lattice, st.sc, 1 - pm);
      draw(this.gGridB, tgt.lattice, st.sc, pm);
    }
    const stepNow = this.gridStep(st.sc);
    const stretch = st.sc.kx / st.sc.ky;
    const units = stepNow >= 1 ? `${stepNow} unit${stepNow === 1 ? "" : "s"}` : `${stepNow} units`;
    this.labGrid.text(`grid ${units} · ${stretch > 1.25 ? `↔ ×${stretch < 9.5 ? stretch.toFixed(1) : Math.round(stretch)}` : "1:1"}`);
    void pg;
  }

  levelLines(probe, st, js) {
    const pu = dot(probe.coef, st.frame.u), pv = dot(probe.coef, st.frame.v);
    const n2 = pu * pu + pv * pv;
    if (n2 < 1e-6) return [];
    const L = 4000;
    return js.map((j) => {
      const val = probe.thr + (probe.norm ? j / probe.norm : 0);
      const x0 = (pu * val) / n2, y0 = (pv * val) / n2;
      const a = this.planeToScreen(x0 - pv * L, y0 + pu * L, st), b = this.planeToScreen(x0 + pv * L, y0 - pu * L, st);
      return { j, a, b, inPlane: Math.sqrt(n2) };
    });
  }

  drawLevels(view, st, p) {
    const probe = view.probe;
    if (!probe) { this.gLevels.selectAll("*").remove(); this.gZeroP.selectAll("*").remove(); return; }
    const js = probe.norm && view.levels !== false ? [-3, -2, -1, 0, 1, 2, 3] : [0];
    const lines = this.levelLines(probe, st, js);
    const alpha = (j) => (j === 0 ? 1 : [0, 0.42, 0.26, 0.15][Math.abs(j)]);
    this.gLevels.selectAll("line").data(lines, (d) => d.j).join("line")
      .attr("class", (d) => (d.j === 0 ? "lvl zero" : "lvl"))
      .attr("x1", (d) => d.a[0]).attr("y1", (d) => d.a[1]).attr("x2", (d) => d.b[0]).attr("y2", (d) => d.b[1])
      .style("opacity", (d) => alpha(d.j) * clamp(p * 1.4 - Math.abs(d.j) * 0.12, 0, 1));
    // the boundary crosses the glass edge onto paper: from the glass bottom to the score-0 tick of the paper axis
    const z = lines.find((d) => d.j === 0);
    const G = this.L.glass;
    if (!z || view.paper === false) { this.gZeroP.selectAll("*").remove(); return; }
    const comb = view.psc?.matched ? lines.filter((d) => d.j !== 0 && Math.abs(d.a[0] - d.b[0]) < 1) : [];
    this.gZeroP.selectAll("line.comb").data(comb, (d) => d.j).join("line").attr("class", "comb")
      .attr("x1", (d) => d.a[0]).attr("x2", (d) => d.a[0]).attr("y1", G.y1).attr("y2", G.y1 + 7)
      .style("opacity", (d) => (Math.abs(d.j) === 1 ? 0.9 : Math.abs(d.j) === 2 ? 0.6 : 0.4) * clamp(p * 1.4, 0, 1));
    const t = (G.y1 - z.a[1]) / (z.b[1] - z.a[1]);
    const xe = z.a[0] + t * (z.b[0] - z.a[0]);
    const x0 = this.paperX(0, st);
    const d = [[xe, G.y1], [xe, G.y1 + 8], [x0, this.L.pileTop - 4], [x0, this.L.floor + 6]];
    this.gZeroP.selectAll("path.zero-paper").data([d]).join("path").attr("class", "zero-paper")
      .attr("d", (d) => d3.line()(d)).style("opacity", clamp(p * 1.4, 0, 1));
  }

  drawOldLevels(probe, st, a) {
    if (!probe || a <= 0.01) { this.gLevelsOld.selectAll("*").remove(); return; }
    const js = probe.norm ? [-3, -2, -1, 0, 1, 2, 3] : [0];
    const alpha = (j) => (j === 0 ? 1 : [0, 0.42, 0.26, 0.15][Math.abs(j)]);
    this.gLevelsOld.selectAll("line").data(this.levelLines(probe, st, js), (d) => d.j).join("line")
      .attr("class", (d) => (d.j === 0 ? "lvl zero" : "lvl"))
      .attr("x1", (d) => d.a[0]).attr("y1", (d) => d.a[1]).attr("x2", (d) => d.b[0]).attr("y2", (d) => d.b[1])
      .style("opacity", (d) => alpha(d.j) * a);
  }

  drawGhosts(view, st, p) {
    const gh = (view.ghosts ?? []).map((g, i) => ({ ...g, i, line: this.levelLines(g, st, [0])[0] })).filter((g) => g.line);
    const sel = this.gGhosts.selectAll("g.ghost").data(gh, (d) => d.id ?? d.i);
    sel.exit().remove();
    const en = sel.enter().append("g").attr("class", "ghost");
    en.append("line");
    const G = this.L.glass;
    const m = en.merge(sel).style("opacity", Math.min(1, p * 1.3));
    m.select("line").attr("x1", (d) => d.line.a[0]).attr("y1", (d) => d.line.a[1]).attr("x2", (d) => d.line.b[0]).attr("y2", (d) => d.line.b[1]);
    const labs = this.gArcs.selectAll("text.ghost-label").data(gh, (d) => d.id ?? d.i);
    labs.exit().remove();
    const lm = labs.enter().append("text").attr("class", "ghost-label").merge(labs).style("opacity", Math.min(1, p * 1.3));
    // label at whichever end of the line (top or bottom of the glass) is more central, kept inside the glass
    lm.each(function (d) {
      const { a, b } = d.line;
      const at = (yT) => a[0] + ((yT - a[1]) / (b[1] - a[1])) * (b[0] - a[0]);
      const mid = (G.x0 + G.x1) / 2;
      const cands = [G.y1 - 44 - (d.i ?? 0) * 28, G.y0 + 60 + (d.i ?? 0) * 28];
      const yT = cands.sort((p, q) => Math.abs(at(p) - mid) - Math.abs(at(q) - mid))[0];
      const x = at(yT);
      const el = d3.select(this).text(d.label ?? "");
      const w = el.node().getComputedTextLength?.() ?? 160;
      const right = x < mid;
      const xx = right ? clamp(x + 10, G.x0 + 12, G.x1 - 12 - w) : clamp(x - 10, G.x0 + 12 + w, G.x1 - 12);
      el.attr("x", xx).attr("y", yT).attr("text-anchor", right ? "start" : "end");
    });
    // the angle between the active boundary and each ghost (only when both lie in the plane and the view is true to scale)
    const probe = view.probe;
    const arcs = [];
    if (probe && Math.abs(st.sc.kx / st.sc.ky - 1) < 0.02) {
      for (const g of gh) {
        if (!g.angle || g.line.inPlane < 0.99) continue;
        const z = this.levelLines(probe, st, [0])[0];
        if (!z || z.inPlane < 0.99) continue;
        const X = intersect(z.a, z.b, g.line.a, g.line.b);
        if (!X) continue;
        // the arc between the two boundaries' upward rays (screen y grows downward)
        const upRay = (p, q) => { let d = [q[0] - p[0], q[1] - p[1]]; if (d[1] > 0) d = [-d[0], -d[1]]; return Math.atan2(d[1], d[0]); };
        const a1 = upRay(z.a, z.b), a2 = upRay(g.line.a, g.line.b);
        arcs.push({ X, a1: Math.min(a1, a2), a2: Math.max(a1, a2), text: g.angle, id: g.id ?? g.i });
      }
    }
    const R = 70;
    const as = this.gArcs.selectAll("g.arc").data(arcs, (d) => d.id);
    as.exit().remove();
    const ae = as.enter().append("g").attr("class", "arc");
    ae.append("path"); ae.append("text").attr("class", "angle-label");
    const am = ae.merge(as).style("opacity", clamp(p * 1.4 - 0.4, 0, 1));
    am.select("path").attr("d", (d) => d3.arc()({ innerRadius: R, outerRadius: R, startAngle: d.a1 + Math.PI / 2, endAngle: d.a2 + Math.PI / 2 }))
      .attr("transform", (d) => `translate(${d.X[0]},${d.X[1]})`);
    am.select("text").attr("x", (d) => d.X[0] + (R + 26) * Math.cos((d.a1 + d.a2) / 2))
      .attr("y", (d) => d.X[1] + (R + 26) * Math.sin((d.a1 + d.a2) / 2) + 8).attr("text-anchor", "middle").text((d) => d.text);
  }

  drawMeans(view, st, p) {
    const ms = (view.means ?? []).map((m) => ({ ...m, xy: this.toScreen(m.c, st) }));
    const seg = view.meanSegment && ms.length === 2 ? [ms] : [];
    this.gMeans.selectAll("line.mseg").data(seg).join("line").attr("class", "mseg")
      .attr("x1", (d) => d[0].xy[0]).attr("y1", (d) => d[0].xy[1]).attr("x2", (d) => d[1].xy[0]).attr("y2", (d) => d[1].xy[1])
      .style("opacity", p);
    const g = this.gMeans.selectAll("g.mean").data(ms, (d) => d.label);
    g.exit().remove();
    const en = g.enter().append("g").attr("class", "mean");
    en.append("circle").attr("r", 7); en.append("path").attr("d", "M-4,0H4M0,-4V4");
    en.append("text").attr("class", "mean-label");
    const m = en.merge(g).attr("transform", (d) => `translate(${d.xy[0]},${d.xy[1]})`).style("opacity", p);
    m.select("text").attr("x", (d) => d.dx ?? 12).attr("y", (d) => d.dy ?? -12).attr("text-anchor", (d) => d.anchor ?? "start").text((d) => d.label);
  }

  drawPoints(st, T, elapsed) {
    const r = this.L.ptR;
    const residual = css("residual"), bg = "#0b1019";
    const fillC = (f) => (f == null ? "rgba(91,156,245,.45)" : f ? residual : bg);
    const all = [...this.pts.values()];
    let ringsNeeded = false;
    for (const s of all) {
      if (!s.el) {
        s.el = this.gPts.append("path").attr("class", "pt").node();
      }
      const pm = ease(T.phase("move", elapsed));
      const pd = T.phase(s.leaving ? "exit" : s.isNew ? "enter" : "stay", elapsed);
      const fillP = T.stagger("fill", elapsed, s);
      const c = s.fill0 === s.fill1 && s.m0 === s.m1 ? null : fillP;
      const cNow = T.phase("travel", elapsed) >= 0 ? lerpVec(s.c0, s.c1, ease(T.phase("travel", elapsed))) : s.c0;
      s.c = cNow;
      const [X, Y] = s.oldSpace && this.prevState ? this.toScreen(cNow, this.prevState) : this.toScreen(cNow, st);
      s.X = X; s.Y = Y;
      s.op = s.leaving ? s.op0 * (1 - pd) : s.isNew ? pd : 1;
      s.fillNow = c == null ? s.fill1 : c < 0.5 ? s.fill0 : s.fill1;
      s.mNow = c == null ? s.m1 : s.m0 + (s.m1 - s.m0) * ease(c);
      const fillCol = c == null ? fillC(s.fill1) : d3.interpolateRgb(fillC(s.fill0), fillC(s.fill1))(ease(c));
      const el = d3.select(s.el).attr("transform", `translate(${X.toFixed(1)},${Y.toFixed(1)})`)
        .attr("d", shapePath(r, s.mNow)).style("fill", fillCol).style("opacity", s.op)
        .style("stroke", s.fill1 == null && c == null ? "none" : residual);
      void pm; void el;
      s.ringNow = s.ring0 + (s.ring1 - s.ring0) * T.phase("rings", elapsed);
      if (s.ringNow > 0.01 || s.ringEl) ringsNeeded = true;
    }
    if (ringsNeeded) {
      for (const s of all) {
        if (s.ringNow > 0.01 && !s.ringEl) s.ringEl = this.gRings.append("circle").attr("class", "ring").attr("r", r + 3.2).node();
        if (s.ringEl) d3.select(s.ringEl).attr("cx", s.X).attr("cy", s.Y).style("opacity", s.ringNow * s.op);
      }
    }
  }

  drawDots(st, T, elapsed, view) {
    const r = this.L.dotR, G = this.L.glass;
    const ink = css("overseer-ink");
    const all = [...this.pts.values()];
    const trailsG = [], trailsP = [];
    const drops = T.drops;     // a "read": each dot falls from its point, in score order
    for (const s of all) {
      if (view.paper === false && !s.dotEl) continue;
      if (!s.dotEl) s.dotEl = this.gDots.append("path").attr("class", "dot").node();
      let x, y, op;
      if (drops && s.dop0 === 0 && !s.leaving) {
        const q = T.dropProgress(elapsed, s);          // 0 before its turn, 1 when landed
        if (q <= 0) { x = s.px1; y = s.py1; op = 0; }
        else {
          // fall along the level set to the glass edge, then slide to the pile
          const p0 = [s.X, s.Y], p1 = [s.X, G.y1], p2 = [s.px1, s.py1];
          const l1 = Math.hypot(p1[1] - p0[1], 0), l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
          const e = d3.easeQuadIn(Math.min(1, q));
          const dAlong = e * (l1 + l2);
          if (dAlong <= l1) { x = p0[0]; y = p0[1] + dAlong; }
          else { const u = (dAlong - l1) / Math.max(1e-6, l2); x = p1[0] + (p2[0] - p1[0]) * u; y = p1[1] + (p2[1] - p1[1]) * u; }
          op = 1;
          if (q < 1) {
            trailsG.push([p0, [x, Math.min(y, G.y1)]]);
            if (y > G.y1) trailsP.push([[p1[0], G.y1], [x, y]]);
          }
        }
      } else {
        const pp = ease(T.phase("paper", elapsed));
        x = s.px0 + (s.px1 - s.px0) * pp; y = s.py0 + (s.py1 - s.py0) * pp;
        op = s.leaving ? s.dop0 * (1 - T.phase("exit", elapsed)) : s.dop0 + (s.dop1 - s.dop0) * T.phase(s.isNew ? "dotsIn" : "paper", elapsed);
      }
      s.pxNow = x; s.pyNow = y; s.dopNow = op;
      const fill = s.fillNow ? ink : "#FAF8F2";
      d3.select(s.dotEl).attr("transform", `translate(${x.toFixed(1)},${y.toFixed(1)})`)
        .attr("d", shapePath(r, s.mNow ?? 0)).style("fill", s.fillNow == null ? "rgba(133,90,0,.45)" : fill)
        .style("stroke", ink).style("opacity", op);
    }
    this.gTrailsG.selectAll("line").data(trailsG).join("line").attr("class", "trail")
      .attr("x1", (d) => d[0][0]).attr("y1", (d) => d[0][1]).attr("x2", (d) => d[1][0]).attr("y2", (d) => d[1][1]);
    this.gTrailsP.selectAll("line").data(trailsP).join("line").attr("class", "trail-p")
      .attr("x1", (d) => d[0][0]).attr("y1", (d) => d[0][1]).attr("x2", (d) => d[1][0]).attr("y2", (d) => d[1][1]);
  }

  drawAxis(view, T, keep = false) {
    const { floor, glass: G } = this.L;
    const st = this.cur;
    this.gAxis.selectAll("*").remove();
    if (view.paper === false) return;
    const x0 = this.paperX(0, st);
    const lo = (G.x0 + 8 - st.psc.x0) / st.psc.k, hi = (G.x1 - 8 - st.psc.x0) / st.psc.k;
    const ticks = d3.ticks(lo, hi, 7);
    const ax = this.gAxis.style("opacity", 0);
    ax.append("line").attr("class", "floor").attr("x1", G.x0).attr("x2", G.x1).attr("y1", floor).attr("y2", floor);
    for (const t of ticks) {
      const x = this.paperX(t, st);
      ax.append("line").attr("class", t === 0 ? "tick zero" : "tick").attr("x1", x).attr("x2", x).attr("y1", floor).attr("y2", floor + 7);
      ax.append("text").attr("class", t === 0 ? "tick-label zero" : "tick-label").attr("x", x).attr("y", floor + 30)
        .attr("text-anchor", "middle").text(t > 0 ? `+${fmtTick(t)}` : fmtTick(t));
    }
    ax.append("text").attr("class", "axis-title").attr("x", (G.x0 + G.x1) / 2).attr("y", floor + 58).attr("text-anchor", "middle")
      .text(view.paperLabel ?? "");
    void x0;
    if (keep) ax.interrupt().style("opacity", 1);
    else ax.transition().delay(T.axis).duration(this.dur(400)).style("opacity", 1);
  }

  drawCounts(view, T) {
    const { glass: G, pileTop } = this.L;
    const old = this.gCounts.selectChildren();
    if (T.readout > 0 && !old.empty()) {
      const ghost = this.gCounts.append("g").attr("class", "counts-old").style("opacity", 1);
      old.each(function () { ghost.node().appendChild(this); });
      ghost.transition().duration(this.dur(250)).style("opacity", 0.3).transition().delay(Math.max(0, T.readout - 250)).remove();
    } else old.remove();
    if (view.paper === false || view.counts === false) return;
    const live = [...this.pts.values()].filter((s) => !s.leaving && s.fill1 != null);
    const right = live.filter((s) => s.score1 > 0), left = live.filter((s) => s.score1 <= 0);
    const cnt = (arr, f) => arr.filter((s) => s.fill1 === f).length;
    const g = this.gCounts.append("g").attr("class", "counts-new").style("opacity", 0);
    const yRow = this.L.floor + 86;
    const row = (x, anchor, head, a, b) => {
      const t = g.append("text").attr("class", "count").attr("x", x).attr("y", yRow).attr("text-anchor", anchor);
      if (anchor === "start") { t.append("tspan").attr("class", "count-head").text(`${head}  `); t.append("tspan").text(`● ${a}  ○ ${b}`); }
      else { t.append("tspan").text(`● ${a}  ○ ${b}`); t.append("tspan").attr("class", "count-head").text(`  ${head}`); }
    };
    row(G.x1 - 4, "end", "reads true →", cnt(right, 1), cnt(right, 0));
    row(G.x0 + 4, "start", "← reads false", cnt(left, 1), cnt(left, 0));
    void pileTop;
    g.transition().delay(T.readout).duration(this.dur(400)).style("opacity", 1);
    this.gCounts.style("opacity", 1);
    this.counts = { rightTrue: cnt(right, 1), rightFalse: cnt(right, 0), leftTrue: cnt(left, 1), leftFalse: cnt(left, 0) };
  }

  drawCards(view, st, p) {
    const { glass: G, cardY } = this.L;
    const cards = (view.cards ?? []).map((c) => ({ ...c, s: this.pts.get(c.key) })).filter((c) => c.s);
    const sel = this.gCards.selectAll("g.card").data(cards, (d) => d.id ?? d.key);
    sel.exit().remove();
    const en = sel.enter().append("g").attr("class", "card");
    en.append("path").attr("class", "leader-ink");
    en.append("path").attr("class", "leader-glass").attr("clip-path", this.clip.glass);
    en.append("rect").attr("class", "card-bg").attr("rx", 5).attr("filter", `url(#${this.id}-card)`);
    en.append("text").attr("class", "card-text");
    const m = en.merge(sel).style("opacity", p);
    m.each(function (d) {
      const gg = d3.select(this);
      const t = gg.select("text").text(d.text);
      const w = (t.node().getComputedTextLength?.() ?? d.text.length * 11) + 20;
      const left = d.x == null ? d.s.X < (G.x0 + G.x1) / 2 : d.anchor !== "end";
      const x0 = d.x ?? (left ? G.x0 + 4 : G.x1 - 4);
      const x = left ? x0 : x0 - w;
      t.attr("x", x + 10).attr("y", cardY + 26);
      gg.select("rect").attr("x", x).attr("y", cardY).attr("width", w).attr("height", 36)
        .classed("pending", !!d.pending);
      const sx = d.s.X, sy = d.s.Y;
      const bx = clamp(sx, x + 12, x + w - 12);
      const path = `M${bx},${cardY + 36} L${bx},${G.y0 + 10} L${sx},${sy - 8}`;
      gg.select(".leader-ink").attr("d", `M${bx},${cardY + 36} L${bx},${G.y0}`);
      gg.select(".leader-glass").attr("d", path).style("opacity", d.s.op);
    });
  }

  drawGroups(view, st, p) {
    const groups = (view.groups ?? []).map((g) => {
      const mem = [...this.pts.values()].filter((s) => !s.leaving && g.test(s));
      if (!mem.length) return null;
      const X = d3.median(mem, (s) => s.X), Y = d3.median(mem, (s) => s.Y);
      return { ...g, X, Y };
    }).filter(Boolean);
    const G = this.L.glass;
    const cx = (d) => (d.corner ? (d.corner[1] === "l" ? G.x0 + 18 : G.x1 - 18) : clamp(d.X + (d.dx ?? 0), G.x0 + 14, G.x1 - 14));
    const cy = (d) => (d.corner ? (d.corner[0] === "t" ? G.y0 + 66 : G.y1 - 44) : clamp(d.Y + (d.dy ?? 0), G.y0 + 60, G.y1 - 40));
    const an = (d) => (d.corner ? (d.corner[1] === "l" ? "start" : "end") : d.anchor ?? "middle");
    this.gGroups.selectAll("text").data(groups, (d) => d.label).join("text").attr("class", "group-label")
      .attr("x", cx).attr("y", cy).attr("text-anchor", an).text((d) => d.label).style("opacity", p);
  }

  renderStatic(view, T) {
    const G = this.L.glass;
    this.labLayer.text(this.L === undefined || this.L.phone ? "" : view.axes?.y ?? "");
    this.labAxisX.text(view.axes?.x ?? "");
    this.drawLegend(view);
    // a gauge of the model's depth: 28 ticks, the read layer in gold
    const n = 28, x1 = G.x1 - 18, w = 4.2;
    const lay = Number(view.layer ?? 0);
    const ticks = d3.range(1, n + 1).map((l) => ({ l, x: x1 - (n - l) * w }));
    this.gGauge.selectAll("line").data(ticks).join("line")
      .attr("x1", (d) => d.x).attr("x2", (d) => d.x).attr("y1", (d) => G.y0 + (d.l === lay ? 14 : 20)).attr("y2", G.y0 + 30)
      .attr("class", (d) => (d.l === lay ? "gauge-tick on" : "gauge-tick"));
    this.gGauge.selectAll("text").data(lay ? [lay] : []).join("text").attr("class", "glass-label gauge-label")
      .attr("x", x1 - n * w - 8).attr("y", G.y0 + 30).attr("text-anchor", "end").text((d) => `layer ${d} of 28`);
    void T;
  }

  drawLegend(view) {
    const items = view.cards?.length ? [] : (view.legend ?? []);
    const r = 6, y = this.L.cardY + 24;
    const g = this.gLegend;
    g.selectAll("*").remove();
    let x = this.L.glass.x0 + 6;
    for (const it of items) {
      const gi = g.append("g").attr("transform", `translate(${x},${y})`);
      const k = it.glyph;
      if (k === "true" || k === "false") gi.append("circle").attr("r", r).attr("class", `lg-pt ${k}`);
      else if (k === "sq-true" || k === "sq-false") gi.append("rect").attr("x", -r * 0.9).attr("y", -r * 0.9).attr("width", r * 1.8).attr("height", r * 1.8).attr("class", `lg-pt ${k.slice(3)}`);
      else if (k === "ring") { gi.append("circle").attr("r", r - 1.5).attr("class", "lg-pt true"); gi.append("circle").attr("r", r + 2.5).attr("class", "lg-ring"); }
      else if (k === "lvl") { [-6, -2, 2, 6].forEach((dx, j) => gi.append("line").attr("x1", dx).attr("x2", dx).attr("y1", -9).attr("y2", 9).attr("class", j === 1 ? "lg-lvl zero" : "lg-lvl")); }
      else if (k === "ghost") gi.append("line").attr("x1", -10).attr("x2", 10).attr("y1", 8).attr("y2", -8).attr("class", "lg-ghost");
      else if (k === "mean") { gi.append("circle").attr("r", 6).attr("class", "lg-mean"); gi.append("path").attr("d", "M-3.5,0H3.5M0,-3.5V3.5").attr("class", "lg-mean-x"); }
      const t = gi.append("text").attr("class", "lg-text").attr("x", 14).attr("y", 7).text(it.text);
      x += 14 + (t.node().getComputedTextLength?.() ?? it.text.length * 11) + 22;
    }
    const span = x - 22 - (this.L.glass.x0 + 6), room = this.L.glass.x1 - this.L.glass.x0 - 12;
    if (span > room) g.attr("transform", `translate(${this.L.glass.x0 + 6},0) scale(${room / span},1) translate(${-(this.L.glass.x0 + 6)},0)`);
    else g.attr("transform", null);
  }

  // ---- hover ----
  hover(e) {
    if (!this.tipEl || !this.cur) return;
    const pt = this.svg.node().createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const m = this.svg.node().getScreenCTM();
    if (!m) return;
    const p = pt.matrixTransform(m.inverse());
    let best = null, bd = 12 * 12;
    for (const s of this.pts.values()) {
      if (s.leaving || !s.op) continue;
      for (const [x, y] of [[s.X, s.Y], [s.pxNow, s.pyNow]]) {
        const d = (x - p.x) ** 2 + (y - p.y) ** 2;
        if (d < bd) { bd = d; best = s; }
      }
    }
    if (!best || !best.text) return this.unhover();
    const st = this.cur;
    const kS = st.paperUnits ? 1 : (st.probe?.norm ?? 1);
    const score = st.probe ? kS * (dot(best.c1, st.probe.coef) - st.probe.thr) : null;
    this.tipEl.hidden = false;
    this.tipEl.innerHTML = `<span class="tip-text">${best.text}</span><span class="tip-meta">${best.fill1 ? "true" : "false"}${
      score == null ? "" : ` · score ${score > 0 ? "+" : ""}${score.toFixed(1)}${kS === 1 && !st.probe.norm || st.paperUnits ? " units" : ""}`}</span>`;
    const box = this.svg.node().getBoundingClientRect();
    const k = box.width / this.L.W;
    const left = clamp(best.X * k, 90, box.width - 90);
    this.tipEl.style.left = `${left}px`;
    this.tipEl.style.top = `${best.Y * k - 14}px`;
    const r = this.L.ptR + 4;
    this.gHiG.selectAll("circle").data([best]).join("circle").attr("class", "hi").attr("r", r).attr("cx", best.X).attr("cy", best.Y);
    this.gHiP.selectAll("circle").data(best.pxNow != null ? [best] : []).join("circle").attr("class", "hi-p").attr("r", this.L.dotR + 3.5)
      .attr("cx", best.pxNow).attr("cy", best.pyNow);
  }
  unhover() {
    if (this.tipEl) this.tipEl.hidden = true;
    this.gHiG.selectAll("*").remove(); this.gHiP.selectAll("*").remove();
  }
}

// ---- choreography: named phases on one clock ----
function timeline(choreo, view, dur) {
  const P = {};
  let total, readout, axis, drops = false;
  const set = (name, t0, d) => { P[name] = [dur(t0), Math.max(1, dur(d))]; };
  if (choreo === "cut") {
    ["move", "travel", "enter", "exit", "stay", "fill", "probe", "paper", "dotsIn", "cards", "rings", "grid"].forEach((n) => set(n, 0, 0));
    total = 0; readout = 0; axis = 0;
  } else if (choreo === "read") {
    // points appear; the probe's level sets draw in; each score falls in score order; counts and readouts land
    set("exit", 0, 400); set("enter", 0, 700); set("stay", 0, 1); set("move", 0, 900); set("travel", 0, 900); set("grid", 0, 700);
    set("fill", 0, 600); set("rings", 300, 600);
    set("probe", 700, 900);
    set("paper", 0, 900); set("dotsIn", 0, 1);
    set("cards", 3900, 600);
    drops = { t0: dur(1700), span: dur(2000), each: dur(520) };
    total = dur(4600); readout = dur(3900); axis = dur(3500);
  } else if (choreo === "flip") {
    // the probe holds; truth flips in place (fills and shapes); then each point travels to its twin; scores follow
    set("exit", 0, 500); set("enter", 0, 500); set("stay", 0, 1); set("move", 0, 1); set("grid", 0, 1); set("probe", 0, 400);
    set("fill", 700, 1100); set("rings", 0, 1);
    set("travel", 2000, 1300); set("paper", 2000, 1300); set("dotsIn", 2000, 1300);
    set("cards", 3300, 500);
    total = dur(4400); readout = dur(3400); axis = dur(3300);
  } else if (choreo === "rotate") {
    // the view turns rigidly (grid and ghost with it); the new probe draws in; scores re-sort on paper
    set("exit", 0, 500); set("enter", 0, 500); set("stay", 0, 1); set("move", 200, 1700); set("travel", 200, 1700); set("grid", 0, 1);
    set("fill", 0, 400); set("rings", 0, 400);
    set("probe", 1500, 800); set("paper", 1900, 900); set("dotsIn", 1900, 600);
    set("cards", 2600, 500);
    total = dur(3300); readout = dur(2800); axis = dur(2700);
  } else {
    // "move": one eased transition of everything
    set("exit", 0, 500); set("enter", 250, 650); set("stay", 0, 1); set("move", 0, 1100); set("travel", 0, 1100); set("grid", 0, 1100);
    set("fill", 300, 700); set("rings", 400, 500);
    set("probe", 500, 700); set("paper", 300, 900); set("dotsIn", 500, 600);
    set("cards", 1100, 400);
    total = dur(1500); readout = dur(1100); axis = dur(900);
  }
  const cut = choreo === "cut";
  const phase = (name, t) => { const p = P[name]; if (!p || cut) return 1; return clamp((t - p[0]) / p[1], 0, 1); };
  // per-point stagger for the fill swap (by screen x, so it sweeps across)
  const stagger = (name, t, s) => {
    const p = P[name]; if (!p || cut) return 1;
    const off = choreo === "flip" ? clamp(((s.X ?? 0) - 10) / 700, 0, 1) * p[1] * 0.45 : 0;
    return clamp((t - p[0] - off) / (p[1] * 0.55), 0, 1);
  };
  let rank = null;
  const dropProgress = (t, s) => {
    if (!drops || cut) return 1;
    if (!rank) {
      rank = new Map();
      const order = view.pts.map((p) => p.key);
      view._order?.forEach((k, i) => rank.set(k, i));
      if (!view._order) order.forEach((k, i) => rank.set(k, i));
    }
    const i = rank.get(s.key) ?? 0, n = Math.max(1, rank.size - 1);
    const t0 = drops.t0 + (i / n) * drops.span;
    return clamp((t - t0) / Math.max(1, drops.each), 0, 1);
  };
  return { phase, stagger, total, readout, axis, drops, dropProgress };
}

// ---- helpers ----
function detPlane(a, b) {
  // |det| of the 2x2 matrix of inner products between two orthonormal frames: 1 = same plane
  return dot(a.u, b.u) * dot(a.v, b.v) - dot(a.u, b.v) * dot(a.v, b.u);
}
const lerpN = (a, b, t) => a + (b - a) * t;
function lerpSc(a, b, t) {
  const g = (x, y) => Math.exp(Math.log(x) + (Math.log(y) - Math.log(x)) * t);
  return { kx: g(a.kx, b.kx), ky: g(a.ky, b.ky), cx: lerpN(a.cx, b.cx, t), cy: lerpN(a.cy, b.cy, t) };
}
const lerpVec = (a, b, t) => (a === b || t >= 1 ? b : a.map((x, i) => x + (b[i] - x) * t));
function intersect(a, b, c, d) {
  const x1 = a[0], y1 = a[1], x2 = b[0], y2 = b[1], x3 = c[0], y3 = c[1], x4 = d[0], y4 = d[1];
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(den) < 1e-9) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
}
function fmtTick(t) {
  const a = Math.abs(t);
  if (a === 0) return "0";
  if (a >= 1) return d3.format("~g")(t);
  return d3.format("~r")(t);
}
