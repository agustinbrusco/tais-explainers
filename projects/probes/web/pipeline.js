// The pipeline scene of "What a Probe Reads": how a statement becomes a data point, and which token a probe should
// read. It shares the stage's SVG with the probe figure (figure.js) and keeps the glass window in the same place.
//
// Visual grammar: glass = the model's interior. Each token has a column (its residual stream) and each layer a row;
// every dot is a hidden state (blue). Token chips are paper (visible text): subword pieces touch, words have gaps.
// Teal = attention, drawn only as causal arcs (a token's state reads the tokens before it, never after). Gold = reading:
// the tap that reads a state out, and the probe's scores on paper. h travels as a chip of glass with its 1,536 real
// numbers (blue positive, grey negative); on paper it becomes a row of X, with its label beside it (filled = true).
import * as d3 from "d3";

const ease = d3.easeCubicInOut;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();

export class Pipeline {
  constructor(svgEl, figL, { reduced = false, tip = null } = {}) {
    this.svg = d3.select(svgEl);
    const G0 = figL.glass, phone = !!figL.phone;
    const G = { x0: G0.x0, y0: G0.y0, x1: G0.x1, y1: phone ? 292 : 284, rx: 12 };
    this.L = { W: figL.W, H: figL.H, phone, glass: G, font: phone ? 23 : 20, small: phone ? 21 : 18 };
    this.L.chipY = G.y1 + 12;
    this.L.chipH = phone ? 38 : 34;
    this.L.band = this.L.chipY + this.L.chipH + 18;
    this.reduced = reduced;
    this.tipEl = tip;
    this.timer = null;
    this.cur = null;
    this.hidden = true;
    this.id = `p${Math.random().toString(36).slice(2, 7)}`;
    this.build();
  }

  dur(ms) { return this.reduced ? 0 : ms; }

  build() {
    const { glass: G } = this.L;
    const defs = this.svg.append("defs");
    defs.append("clipPath").attr("id", `${this.id}-glass`).append("rect")
      .attr("x", G.x0).attr("y", G.y0).attr("width", G.x1 - G.x0).attr("height", G.y1 - G.y0).attr("rx", G.rx);
    const grad = defs.append("linearGradient").attr("id", `${this.id}-gfill`).attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 1);
    grad.append("stop").attr("offset", 0).attr("stop-color", "#101723");
    grad.append("stop").attr("offset", 1).attr("stop-color", "#070a10");
    this.clipH = defs.append("clipPath").attr("id", `${this.id}-h`).append("rect");
    this.clipT = defs.append("clipPath").attr("id", `${this.id}-t`).append("rect");

    const r = this.root = this.svg.append("g").attr("class", "pipe-root").style("opacity", 0).style("pointer-events", "none");
    r.append("rect").attr("class", "glass-bg").attr("x", G.x0).attr("y", G.y0).attr("width", G.x1 - G.x0)
      .attr("height", G.y1 - G.y0).attr("rx", G.rx).attr("fill", `url(#${this.id}-gfill)`);
    const g = r.append("g").attr("clip-path", `url(#${this.id}-glass)`);
    this.gShade = g.append("g").attr("class", "p-shade");
    this.gRows = g.append("g").attr("class", "p-rows");
    this.gStreams = g.append("g").attr("class", "p-streams");
    this.gArcs = g.append("g").attr("class", "p-arcs");
    this.gNodes = g.append("g").attr("class", "p-nodes");
    this.gTaps = g.append("g").attr("class", "p-taps");
    r.append("rect").attr("class", "glass-edge").attr("x", G.x0 + 0.5).attr("y", G.y0 + 0.5).attr("width", G.x1 - G.x0 - 1)
      .attr("height", G.y1 - G.y0 - 1).attr("rx", G.rx);
    this.gLab = r.append("g").attr("class", "p-labels");
    this.gLegend = r.append("g").attr("class", "legend");
    this.gLeader = r.append("g").attr("class", "p-leader");
    this.gChips = r.append("g").attr("class", "p-chips");
    this.gH = r.append("g").attr("class", "p-h");
    this.gY = r.append("g").attr("class", "p-y");
    this.gTable = r.append("g").attr("class", "p-table");
    this.gChart = r.append("g").attr("class", "p-chart");
    this.gCap = r.append("g").attr("class", "p-cap");
    this.svg.on("pointermove.pipe", (e) => this.hover(e)).on("pointerleave.pipe", () => this.unhover());
  }

  setVisible(on, ms = 450) {
    this.hidden = !on;
    this.root.interrupt().style("pointer-events", on ? null : "none")
      .transition().duration(this.dur(ms)).style("opacity", on ? 1 : 0);
    if (!on) { this.unhover(); if (this.timer) { this.timer.stop(); this.timer = null; } }
  }

  // ---- geometry ----
  yL(l) { const G = this.L.glass; return G.y1 - 18 - (l * (G.y1 - G.y0 - 58)) / 28; }

  /** Chips for tokens: widths from the monospace advance; words separated by a gap, subword pieces touching. */
  layoutChips(tokens) {
    const f = this.L.font, cw = 0.6 * f, pad = this.L.phone ? 6 : 7, gapWord = this.L.phone ? 9 : 11, gapSub = 2;
    const items = tokens.map((t, i) => {
      const text = t.replace(/^ /, "");
      return { t, text, i, w: Math.max(1, text.length) * cw + 2 * pad, word: i === 0 || t.startsWith(" ") };
    });
    let total = 0;
    items.forEach((it, i) => { if (i) total += it.word ? gapWord : gapSub; total += it.w; });
    const G = this.L.glass;
    let x = (G.x0 + G.x1) / 2 - total / 2;
    items.forEach((it, i) => { if (i) x += it.word ? gapWord : gapSub; it.x = x; it.cx = x + it.w / 2; x += it.w; });
    return items;
  }

  // ---- the main entry ----
  /**
   * view = { mode: "collect", tokens, alt (the other statement's differing tokens), which: "true"|"false", h, hscale,
   *          table: {x, y}, nTrain, layer, choreo }
   *      | { mode: "position", tokens: {true, false}, scores: {true, false}, how: "final"|"mean"|"max", layer, choreo }
   */
  show(view) {
    if (this.timer) { this.timer.stop(); this.timer = null; }
    const prev = this.cur;
    this.cur = view;
    const same = prev && prev.mode === view.mode;
    let choreo = this.reduced || view.choreo === "cut" ? "cut" : view.choreo ?? "play";
    if (choreo === "play" && same && view.mode === "collect" && prev.which !== view.which) choreo = "swap";
    if (choreo === "play" && same && view.mode === "position") choreo = "mode";
    const T = this.timeline(view.mode, choreo);
    this.prepare(view, prev, choreo);
    const frame = (t) => { this.draw(view, T, t); return t >= T.total; };
    frame(choreo === "cut" ? T.total : 0);
    if (choreo === "cut") return Promise.resolve();
    return new Promise((res) => {
      this.timer = d3.timer((el) => { if (frame(Math.min(el, T.total))) { this.timer.stop(); this.timer = null; res(); } });
    });
  }

  timeline(mode, choreo) {
    const P = {};
    const set = (n, t0, d) => { P[n] = [this.dur(t0), Math.max(1, this.dur(d))]; };
    let total;
    if (mode === "collect") {
      if (choreo === "swap") {
        // only the columns from the country on are computed again: the prefix is the same input, so the same states
        set("chips", 0, 1); set("country", 0, 500); set("forward", 350, 900); set("tap", 0, 1); set("arcs", 1100, 700);
        set("leader", 0, 1); set("h", 1250, 900); set("y", 1400, 500); set("row", 0, 1); set("stream", 0, 1); set("cap", 0, 1);
        total = 2400;
      } else {
        set("chips", 0, 900); set("country", 0, 1); set("forward", 900, 1800); set("tap", 2700, 500); set("arcs", 2700, 900);
        set("leader", 3300, 500); set("h", 3500, 1000); set("y", 4500, 400); set("row", 4900, 1000); set("stream", 5900, 1700);
        set("cap", 7400, 500);
        total = 8000;
      }
    } else {
      if (choreo === "mode") { set("chips", 0, 1); set("forward", 0, 1); set("dots", 0, 1); set("mode", 0, 700); total = 800; }
      else { set("chips", 0, 600); set("forward", 0, 700); set("dots", 700, 1800); set("mode", 2500, 700); total = 3300; }
    }
    total = this.dur(total);
    const cut = choreo === "cut";
    const phase = (n, t) => { const p = P[n]; if (!p || cut) return 1; return clamp((t - p[0]) / p[1], 0, 1); };
    return { phase, total, choreo };
  }

  /** Static parts of a view (chips, nodes, images); the per-frame draw only moves opacities and reveals. */
  prepare(view, prev, choreo) {
    const G = this.L.glass;
    const toks = view.mode === "collect" ? view.tokens : view.tokens.true;
    const chips = this.chips = this.layoutChips(toks);
    const ci = this.countryIndex = chips.length - 2;          // the country's (last) token; the period is last
    // glass: layer rows, streams, nodes
    const layers = d3.range(29);
    this.gRows.selectAll("line").data(layers).join("line").attr("class", (l) => (l === view.layer ? "p-row on" : "p-row"))
      .attr("x1", G.x0).attr("x2", G.x1).attr("y1", (l) => this.yL(l)).attr("y2", (l) => this.yL(l));
    this.gStreams.selectAll("line").data(chips).join("line").attr("class", "p-stream")
      .attr("x1", (d) => d.cx).attr("x2", (d) => d.cx).attr("y1", this.yL(0) + 8).attr("y2", this.yL(28) - 6);
    const nodes = [];
    chips.forEach((c) => layers.forEach((l) => nodes.push({ c, l, id: `${c.i}:${l}` })));
    this.nodes = this.gNodes.selectAll("circle").data(nodes, (d) => d.id).join("circle").attr("class", "p-node")
      .attr("r", this.L.phone ? 2.4 : 1.9).attr("cx", (d) => d.c.cx).attr("cy", (d) => this.yL(d.l));
    // labels: the layer axis and the read layer
    this.drawLegend(view);
    const lab = [
      { x: G.x0 + 14, y: this.yL(view.layer) + 6, text: `${view.layer}`, cls: "glass-label p-layer" },
      { x: G.x0 + 14, y: this.yL(0) + 6, text: "0", cls: "glass-label faint" },
      { x: G.x0 + 14, y: this.yL(28) + 6, text: "28", cls: "glass-label faint" },
    ];
    this.gLab.selectAll("text").data(lab).join("text").attr("class", (d) => d.cls)
      .attr("x", (d) => d.x).attr("y", (d) => d.y).attr("text-anchor", (d) => (d.cls.includes("end") ? "end" : "start")).text((d) => d.text);
    // chips (for "position", the country slot holds both countries: filled = in the true statement, hollow = false)
    const Y = this.L.chipY, H = this.L.chipH;
    const cdata = chips.map((c) => ({ ...c, alt: null }));
    if (view.mode === "position") {
      const f = view.tokens.false;
      cdata.forEach((c, i) => { if (f[i] !== c.t) c.alt = f[i].replace(/^ /, ""); });
    } else if (view.alt) cdata[ci].alt = null;
    const cg = this.gChips.selectAll("g.p-chip").data(cdata, (d) => d.i).join((en) => {
      const g = en.append("g").attr("class", "p-chip");
      g.append("rect").attr("rx", 5);
      g.append("text").attr("class", "p-chip-t");
      g.append("text").attr("class", "p-chip-alt");
      return g;
    });
    cg.select("rect").attr("x", (d) => d.x).attr("y", Y).attr("width", (d) => d.w).attr("height", (d) => (d.alt ? H * 2 + 4 : H))
      .classed("country", (d) => d.i === ci).classed("period", (d) => d.i === chips.length - 1);
    cg.select(".p-chip-t").attr("x", (d) => d.cx).attr("y", Y + H * 0.68).attr("text-anchor", "middle").text((d) => d.text);
    cg.select(".p-chip-alt").attr("x", (d) => d.cx).attr("y", Y + H + 4 + H * 0.68).attr("text-anchor", "middle").text((d) => d.alt ?? "");
    // widen a chip whose alternative is longer
    cg.each(function (d) {
      if (!d.alt) return;
      const w = Math.max(d.w, d.alt.length * 0.6 * parseFloat(getComputedStyle(this).fontSize || 20) + 14);
      d3.select(this).select("rect").attr("x", d.cx - w / 2).attr("width", w);
    });
    this.gH.selectAll("*").remove(); this.gY.selectAll("*").remove(); this.gTable.selectAll("*").remove();
    this.gChart.selectAll("*").remove(); this.gCap.selectAll("*").remove(); this.gLeader.selectAll("*").remove();
    this.gTaps.selectAll("*").remove(); this.gArcs.selectAll("*").remove();
    if (view.mode === "collect") this.prepareCollect(view, prev, choreo);
    else this.preparePosition(view);
  }

  prepareCollect(view, prev, choreo) {
    const { band, glass: G, phone } = this.L;
    const per = this.chips[this.chips.length - 1];
    // h: a chip of glass holding all 1,536 numbers (128 × 12; cell (r, c) = number c·12 + r)
    const cols = 128, rows = 12, cw = phone ? 3.7 : 3.6, ch = phone ? 4.4 : 3.6;
    const hw = cols * cw, hh = rows * ch;
    const hx = phone ? G.x0 + 8 : G.x0 + 16, hy = band + 30;
    this.hBox = { x: hx, y: hy, w: hw, h: hh };
    const img = (v, pal) => this.image(v, cols, rows, (i) => (i % cols) * rows + Math.floor(i / cols), view.hscale, pal);
    this.gH.append("rect").attr("class", "p-hchip").attr("x", hx - 6).attr("y", hy - 6).attr("width", hw + 12).attr("height", hh + 12).attr("rx", 6);
    if (choreo === "swap" && prev?.h) {
      this.hOld = this.gH.append("image").attr("href", img(prev.h, "glass")).attr("x", hx).attr("y", hy).attr("width", hw).attr("height", hh)
        .attr("preserveAspectRatio", "none").attr("class", "px");
    } else this.hOld = null;
    this.hImg = this.gH.append("image").attr("href", img(view.h, "glass")).attr("x", hx).attr("y", hy).attr("width", hw).attr("height", hh)
      .attr("preserveAspectRatio", "none").attr("class", "px").attr("clip-path", `url(#${this.id}-h)`);
    this.gH.append("text").attr("class", "p-note").attr("x", hx - 6).attr("y", hy - 14)
      .text(`h: layer ${view.layer}, over “.”: 1,536 numbers`);
    // the label, beside h
    const yx = hx + hw + (phone ? 14 : 24), yw = phone ? 180 : 150;
    const yg = this.gY.append("g").attr("class", "p-ychip");
    yg.append("rect").attr("x", yx).attr("y", hy - 6).attr("width", yw).attr("height", hh + 12).attr("rx", 6);
    yg.append("text").attr("class", "p-ytext").attr("x", yx + 14).attr("y", hy + hh / 2 + 8).text(`y = ${view.which === "true" ? 1 : 0}`);
    yg.append("circle").attr("class", `p-ydot ${view.which === "true" ? "t" : "f"}`).attr("cx", yx + yw - 22).attr("cy", hy + hh / 2).attr("r", 7);
    this.gY.append("text").attr("class", "p-note").attr("x", yx).attr("y", hy - 14).text(view.which === "true" ? "label: true" : "label: false");
    // the leader: from the tapped state down through its token to h
    const ty = this.yL(view.layer);
    const ly = this.L.chipY + this.L.chipH + 8;
    this.leaderPts = [[per.cx, ty + 7], [per.cx, ly], [hx + hw - 24, ly], [hx + hw - 24, hy - 6]];
    this.gLeader.append("path").attr("class", "p-lead").attr("d", d3.line()(this.leaderPts));
    this.gTaps.append("circle").attr("class", "p-tap").attr("cx", per.cx).attr("cy", ty).attr("r", phone ? 7 : 6);
    // arcs into the tapped state from every earlier token (causal attention), one layer below the read layer
    const arcs = this.chips.slice(0, -1).map((c) => ({ c, d: `M${c.cx},${this.yL(view.layer - 1)} Q${(c.cx + per.cx) / 2},${this.yL(view.layer - 1) - 26 - (per.cx - c.cx) * 0.07} ${per.cx},${ty}` }));
    this.gArcs.selectAll("path").data(arcs).join("path").attr("class", "p-arc").attr("d", (d) => d.d);
    // X: rows of training statements, every 12th number (a crop of the real matrix), and y beside it
    const trows = phone ? 36 : view.table.x.length;               // phones draw fewer rows
    const tx = hx, ty0 = hy + hh + (phone ? 50 : 46), rh = phone ? 1.8 : 1.8;
    const tw = hw, th = trows * rh;
    this.tBox = { x: tx, y: ty0, w: tw, h: th, rh };
    const flat = view.table.x.slice(0, trows).flat();
    this.gTable.append("image").attr("href", this.image(flat, cols, trows, (i) => i, view.hscale, "paper"))
      .attr("x", tx).attr("y", ty0).attr("width", tw).attr("height", th).attr("preserveAspectRatio", "none").attr("class", "px")
      .attr("clip-path", `url(#${this.id}-t)`);
    const yv = view.table.y.slice(0, trows);
    this.trows = trows;
    const ycol = this.gTable.append("g").attr("clip-path", `url(#${this.id}-t2)`);
    ycol.selectAll("rect").data(yv).join("rect").attr("class", (v) => (v ? "p-ycell t" : "p-ycell f"))
      .attr("x", tx + tw + 8).attr("y", (v, i) => ty0 + i * rh).attr("width", 12).attr("height", rh + 0.05);
    this.gTable.append("rect").attr("class", "p-tframe").attr("x", tx - 0.5).attr("y", ty0 - 0.5).attr("width", tw + 1).attr("height", th + 1);
    this.gTable.append("rect").attr("class", "p-tframe").attr("x", tx + tw + 7.5).attr("y", ty0 - 0.5).attr("width", 13).attr("height", th + 1);
    this.gTable.append("text").attr("class", "p-note").attr("x", tx).attr("y", ty0 - 10).text("X: one row per statement");
    this.gTable.append("text").attr("class", "p-note").attr("x", tx + tw + 8).attr("y", ty0 - 10).text("y");
    // the new row: h's top row (numbers 0, 12, 24, …) is what the table draws of it
    this.rowImg = this.gTable.append("image").attr("href", this.image(view.h.filter((_, i) => i % 12 === 0), cols, 1, (i) => i, view.hscale, "paper"))
      .attr("x", tx).attr("width", tw).attr("height", rh).attr("preserveAspectRatio", "none").attr("class", "px");
    const capX = tx + tw + 34;
    const cap = this.gCap.append("text").attr("class", "p-note cap").attr("x", phone ? tx : capX).attr("y", phone ? ty0 + th + 26 : ty0 + 14);
    const lines = phone
      ? [`${view.nTrain.toLocaleString("en-US")} statements × 1,536 numbers`, `drawn: ${trows} rows, every 12th column`]
      : [`${view.nTrain.toLocaleString("en-US")} rows,`, "one per training", "statement,", "× 1,536 columns", "", `drawn: ${trows} rows,`, "every 12th column"];
    lines.forEach((t, i) => cap.append("tspan").attr("x", phone ? tx : capX).attr("dy", i ? "1.25em" : 0).text(t));
  }

  preparePosition(view) {
    const { band, glass: G, phone } = this.L;
    const sT = view.scores.true, sF = view.scores.false, n = sT.length;
    // below the chips, whose country slot is two chips tall here
    const top = this.L.chipY + 2 * this.L.chipH + 4 + 16;
    const y0 = top + 30, y1 = y0 + (phone ? 140 : 130);
    void band;
    const ext = d3.extent([...sT, ...sF, 0]);
    const pad = (ext[1] - ext[0]) * 0.12;
    const ys = d3.scaleLinear().domain([ext[0] - pad, ext[1] + pad]).range([y1, y0]);
    this.chart = { ys, y0, y1 };
    const g = this.gChart;
    g.append("line").attr("class", "p-zero").attr("x1", G.x0 + 40).attr("x2", G.x1 - 6).attr("y1", ys(0)).attr("y2", ys(0));
    const ticks = ys.ticks(4);
    g.selectAll("text.p-tick").data(ticks).join("text").attr("class", (t) => (t === 0 ? "p-tick zero" : "p-tick")).attr("x", G.x0 + 32).attr("y", (t) => ys(t) + 6)
      .attr("text-anchor", "end").text((t) => (t > 0 ? `+${t}` : `${t}`));
    g.append("text").attr("class", "p-note").attr("x", G.x0 + 4).attr("y", y1 + (phone ? 30 : 28))
      .text(phone ? "each token's score (logits)" : "each token's score, from a probe trained on every token (logits)");
    // the part the two statements share: the same input so far, so the same states and the same scores
    const lastSame = d3.max(d3.range(n).filter((i) => sT[i] === sF[i] && (i === 0 || sT[i - 1] === sF[i - 1])));
    this.lastSame = lastSame;
    const cx = (i) => this.chips[i].cx;
    g.append("path").attr("class", "p-brace").attr("d", `M${cx(0) - 8},${y0 - 2}V${y0 - 8}H${cx(lastSame) + 8}V${y0 - 2}`);
    g.append("text").attr("class", "p-note").attr("x", (cx(0) + cx(lastSame)) / 2).attr("y", y0 - 14).attr("text-anchor", "middle")
      .text(phone ? "same input so far: identical states" : "the same input so far: identical states, identical scores");
    const line = d3.line().x((d) => cx(d[0])).y((d) => ys(d[1]));
    this.gSerT = g.append("path").attr("class", "p-ser t").attr("d", line(sT.map((v, i) => [i, v])));
    this.gSerF = g.append("path").attr("class", "p-ser f").attr("d", line(sF.map((v, i) => [i, v])));
    this.dots = g.selectAll("g.p-dot").data(d3.range(n)).join((en) => {
      const q = en.append("g").attr("class", "p-dot");
      q.append("circle").attr("class", "f").attr("r", phone ? 7.5 : 6.5);
      q.append("circle").attr("class", "t").attr("r", phone ? 4.6 : 4);
      return q;
    });
    this.dots.select("circle.t").attr("cx", (i) => cx(i)).attr("cy", (i) => ys(sT[i]));
    this.dots.select("circle.f").attr("cx", (i) => cx(i)).attr("cy", (i) => ys(sF[i]));
    // the reductions each way of reading makes of those scores
    this.gMode = g.append("g").attr("class", "p-mode");
  }

  /** The legend band above the glass: what the marks are, for this scene. */
  drawLegend(view) {
    const items = view.mode === "collect"
      ? [{ k: "node", text: "a state: 1,536 numbers" }, { k: "tap", text: "the state read out" }, { k: "arc", text: "attention (causal)" }]
      : [{ k: "t", text: "true statement" }, { k: "f", text: "false statement" }, { k: "tap", text: "where the probe reads" }];
    const g = this.gLegend;
    g.selectAll("*").remove();
    let x = this.L.glass.x0 + 6;
    const y = 34;
    for (const it of items) {
      const gi = g.append("g").attr("transform", `translate(${x},${y})`);
      if (it.k === "node") gi.append("circle").attr("r", 3.2).attr("class", "lg-node");
      else if (it.k === "tap") gi.append("circle").attr("r", 6).attr("class", "lg-tap");
      else if (it.k === "arc") gi.append("path").attr("d", "M-9,5 Q0,-9 9,5").attr("class", "lg-arc");
      else gi.append("circle").attr("r", 5).attr("class", `lg-score ${it.k}`);
      const t = gi.append("text").attr("class", "lg-text").attr("x", 14).attr("y", 7).text(it.text);
      x += 14 + (t.node().getComputedTextLength?.() ?? it.text.length * 11) + 24;
    }
  }

  /** A small raster of values: blue for positive, grey for negative, strength by magnitude (square root). */
  image(values, w, h, index, scale, pal) {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const cx = cv.getContext("2d");
    const im = cx.createImageData(w, h);
    const glass = pal === "glass";
    const bg = glass ? [11, 16, 25] : [250, 248, 242];
    const pos = glass ? [91, 156, 245] : [43, 97, 196], neg = glass ? [154, 163, 181] : [87, 84, 78];
    for (let i = 0; i < w * h; i++) {
      const v = values[index(i)] ?? 0;
      const t = Math.sqrt(clamp(Math.abs(v) / scale, 0, 1));
      const c = v >= 0 ? pos : neg;
      for (let k = 0; k < 3; k++) im.data[4 * i + k] = Math.round(bg[k] + (c[k] - bg[k]) * t);
      im.data[4 * i + 3] = 255;
    }
    cx.putImageData(im, 0, 0);
    return cv.toDataURL();
  }

  // ---- per frame ----
  draw(view, T, t) {
    const ph = (n) => T.phase(n, t);
    const chips = this.chips, n = chips.length, ci = this.countryIndex;
    // chips type in, left to right
    const pc = ph("chips");
    this.gChips.selectAll("g.p-chip").style("opacity", (d) => clamp(pc * (n + 2) - d.i, 0, 1));
    if (view.mode === "collect" && T.choreo === "swap") {
      const pk = ph("country");
      this.gChips.selectAll("g.p-chip").filter((d) => d.i === ci).style("opacity", clamp(Math.abs(pk * 2 - 1), 0, 1));
    }
    // the forward pass lights states layer by layer; on a swap only the columns from the country on
    const pf = ph("forward");
    const lit = pf * 30 - 1;
    const recompute = (d) => T.choreo === "swap" && d.c.i >= ci;
    this.nodes.attr("class", (d) => {
      const on = recompute(d) ? d.l <= lit : T.choreo === "swap" ? true : d.l <= lit;
      return on ? (d.l === view.layer ? "p-node on row" : "p-node on") : "p-node";
    });
    this.gStreams.selectAll("line").style("opacity", (d) => (T.choreo === "swap" && d.i >= ci ? 0.25 + 0.35 * pf : 0.25 + 0.35 * pf));
    if (view.mode === "collect") this.drawCollect(view, ph);
    else this.drawPosition(view, ph);
  }

  drawCollect(view, ph) {
    const pt = ph("tap"), pa = ph("arcs"), pl = ph("leader"), phh = ph("h"), py = ph("y"), pr = ph("row"), ps = ph("stream");
    this.gTaps.style("opacity", pt);
    this.gArcs.selectAll("path").style("opacity", (d) => (pa < 0.5 ? 0.9 * pa * 2 : 0.9 - 0.62 * (pa - 0.5) * 2)).attr("stroke-dasharray", "400")
      .attr("stroke-dashoffset", 400 * (1 - clamp(pa * 1.6, 0, 1)));
    const path = this.gLeader.select("path");
    const len = path.node()?.getTotalLength?.() ?? 400;
    path.attr("stroke-dasharray", `${len}`).attr("stroke-dashoffset", len * (1 - ease(pl)));
    const B = this.hBox;
    this.clipH.attr("x", B.x).attr("y", B.y).attr("height", B.h).attr("width", B.w * ease(phh));
    if (this.hOld) this.hOld.style("opacity", 1);
    this.gH.style("opacity", Math.min(1, phh * 3 + (this.hOld ? 1 : 0)));
    this.gY.style("opacity", py);
    this.gY.select(".p-ydot").attr("transform", `scale(1)`);
    // the new row slides from h's top row into the table's first row; then the other statements' rows stream in
    const TB = this.tBox;
    const e = ease(pr);
    this.rowImg.attr("y", B.y + (TB.y - B.y) * e).attr("height", B.h / 12 + (TB.rh - B.h / 12) * e).style("opacity", pr > 0 && ps < 0.02 ? 1 : 0);
    this.clipT.attr("x", TB.x - 2).attr("y", TB.y).attr("width", TB.w + 30).attr("height", pr >= 1 ? TB.rh * (1 + (this.trows - 1) * ease(ps)) : 0);
    this.gTable.style("opacity", Math.min(1, pr * 4));
    this.gTable.selectAll("rect.p-ycell").style("opacity", (v, i) => (pr >= 1 && i <= (this.trows - 1) * ease(ps) ? 1 : 0));
    this.gCap.style("opacity", ph("cap"));
  }

  drawPosition(view, ph) {
    const pd = ph("dots"), pm = ph("mode");
    const n = this.chips.length;
    this.dots.style("opacity", (i) => clamp(pd * (n + 1) - i, 0, 1));
    this.gSerT.style("opacity", pd); this.gSerF.style("opacity", pd);
    const sT = view.scores.true, sF = view.scores.false;
    const { ys } = this.chart;
    const G = this.L.glass;
    const cx = (i) => this.chips[i].cx;
    const how = view.how;
    const red = (s) => (how === "mean" ? d3.mean(s) : how === "max" ? d3.max(s) : s[s.length - 1]);
    const lines = how === "final" ? [] : [{ k: "t", v: red(sT) }, { k: "f", v: red(sF) }];
    this.gMode.style("opacity", pm);
    this.gMode.selectAll("rect.p-band").data(how === "final" ? [n - 1] : []).join("rect").attr("class", "p-band")
      .attr("x", (i) => cx(i) - 16).attr("width", 32).attr("y", this.chart.y0 - 4).attr("height", this.chart.y1 - this.chart.y0 + 8);
    this.gMode.selectAll("line.p-red").data(lines, (d) => d.k).join("line").attr("class", (d) => `p-red ${d.k}`)
      .attr("x1", cx(0) - 12).attr("x2", cx(n - 1) + 12).attr("y1", (d) => ys(d.v)).attr("y2", (d) => ys(d.v));
    this.gMode.selectAll("text.p-redlab").data(lines, (d) => d.k).join("text").attr("class", "p-redlab p-note")
      .attr("x", G.x1 - 8).attr("y", (d) => ys(d.v) + (d.k === "t" ? -8 : 20)).attr("text-anchor", "end")
      .text((d) => `${how}, ${d.k === "t" ? "true" : "false"} statement`);
    // the maximum needs a threshold of its own (set on the training statements): drawn dashed in gold
    const own = how === "max" && view.thrMax != null ? [view.thrMax] : [];
    this.gMode.selectAll("line.p-own").data(own).join("line").attr("class", "p-own")
      .attr("x1", G.x0 + 40).attr("x2", G.x1 - 6).attr("y1", (v) => ys(v)).attr("y2", (v) => ys(v));
    this.gMode.selectAll("text.p-ownlab").data(own).join("text").attr("class", "p-ownlab p-note gold")
      .attr("x", G.x0 + 44).attr("y", (v) => ys(v) - 8).text("the maximum's own threshold");
    // taps in the glass: the period alone, or every token of the read layer
    const taps = how === "final" ? [n - 1] : d3.range(n);
    this.gTaps.selectAll("circle").data(taps, (i) => i).join("circle").attr("class", "p-tap")
      .attr("cx", (i) => cx(i)).attr("cy", this.yL(view.layer)).attr("r", this.L.phone ? 7 : 6);
    this.gTaps.style("opacity", 0.25 + 0.75 * pm);
  }

  // ---- hover: what a state has seen ----
  hover(e) {
    if (this.hidden || !this.chips || !this.tipEl) return;
    const pt = this.svg.node().createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const m = this.svg.node().getScreenCTM();
    if (!m) return;
    const p = pt.matrixTransform(m.inverse());
    const G = this.L.glass;
    if (p.y < G.y0 || p.y > this.L.chipY + this.L.chipH * 2 + 6) return this.unhover();
    let best = null, bd = 26;
    for (const c of this.chips) { const d = Math.abs(c.cx - p.x); if (d < bd) { bd = d; best = c; } }
    if (!best) return this.unhover();
    const l = clamp(Math.round(((G.y1 - 18 - p.y) * 28) / (G.y1 - G.y0 - 58)), 0, 28);
    const seen = this.chips.filter((c) => c.i <= best.i);
    const text = seen.map((c, j) => (j && c.word ? " " : "") + c.text).join("");
    const last = this.chips[this.chips.length - 1];
    this.gShade.selectAll("rect").data([0]).join("rect").attr("class", "p-cone")
      .attr("x", this.chips[0].x - 6).attr("width", best.x + best.w + 6 - (this.chips[0].x - 6))
      .attr("y", this.yL(p.y > G.y1 ? 28 : l) - 5).attr("height", this.yL(0) + 12 - this.yL(p.y > G.y1 ? 28 : l) + 5);
    const box = this.svg.node().getBoundingClientRect(), k = box.width / this.L.W;
    this.tipEl.hidden = false;
    this.tipEl.innerHTML = `<span class="tip-text">${text}${best.i < last.i ? " …" : ""}</span><span class="tip-meta">what the state over “${best.text}” has seen${
      p.y <= G.y1 ? ` · layer ${l}` : ""}: this token and the ones before it</span>`;
    this.tipEl.style.left = `${clamp(best.cx * k, 110, box.width - 110)}px`;
    this.tipEl.style.top = `${(G.y0 + 12) * k}px`;
  }
  unhover() {
    this.gShade?.selectAll("*").remove();
    if (this.tipEl && !this.hidden) this.tipEl.hidden = true;
  }
}
