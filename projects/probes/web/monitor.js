// Drawings for chapters IV–VI (the probe as a monitor, the direction as a handle, limits), for the paper scene (paper.js).
// Same materials as diagrams.js: paper cards for published facts (ink), gold for reading, violet for writing, magenta for
// optimization pressure, red / green for behaviour classes. Every published number is passed in by main.js or quoted
// here from the claims-backed sources; illustrative shapes say so in their badge.
import * as d3 from "d3";
import { probeGlyph } from "./diagrams.js";

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------------------------------------------------
// The dial (chapter IV): a monitor is a threshold on other data. Three score distributions on one axis, each a normalized
// histogram of 1,000 drawn quantile samples: ordinary chat (ink outline), honest and deceptive responses of the monitored
// task (green outline, red fill). The gold line is the alarm's threshold. Every readout is computed from the drawn
// samples. The shapes are ours (data/export_monitor.py fits them so that at the published threshold the samples reproduce
// the published rows); only those rows are data.
const qSamples = (() => {
  // standard normal quantiles at (i - 0.5) / n, by the Acklam approximation (accurate to ~1e-9, plenty for drawing)
  const inv = (p) => {
    const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2, -3.066479806614716e1, 2.506628277459239];
    const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
    const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
    const pl = 0.02425;
    if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    const q = p - 0.5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  };
  return d3.range(1000).map((i) => inv((i + 0.5) / 1000));
})();
export const drawnSamples = ({ mu, sd }) => qSamples.map((z) => mu + sd * z);
export function shareAbove(xs, t) { let n = 0; for (const x of xs) if (x > t) n++; return n / xs.length; }
export function aurocOf(pos, neg) {
  const ns = neg.slice().sort((a, b) => a - b);
  let s = 0;
  for (const x of pos) { const lo = d3.bisectLeft(ns, x), hi = d3.bisectRight(ns, x); s += lo + (hi - lo) / 2; }
  return s / (pos.length * ns.length);
}

/** The dial's state → the three classes' parameters (M = monitor.json). */
export function dialClasses(M, { probe, traffic }) {
  if (traffic === "aware" || traffic === "feedback") return { chat: null, honest: M.das[traffic].control, deceptive: M.das[traffic].collusion, das: true };
  if (traffic === "bd") return { chat: M.chat, honest: M.backdoors.honest, deceptive: M.backdoors.deceptive };
  if (traffic === "none") return { chat: M.chat, honest: null, deceptive: null };
  const P = M.insider[probe];
  return { chat: M.chat, honest: P.honest, deceptive: P.deceptive };
}

export function dialView(M, state, onTick) {
  const key = (st) => `${st.probe}|${st.traffic}`;
  const S = { x0: 40, x1: 690, y0: 118, floor: 436 };
  const X = d3.scaleLinear().domain([-4, 7.6]).range([S.x0, S.x1]);
  const bw = 0.22;
  const edge0 = M.meta.tick;                                         // a bin edge at the published threshold
  function hist(xs) {
    const i0 = Math.floor((-4 - edge0) / bw), i1 = Math.ceil((7.6 - edge0) / bw);
    const h = new Float64Array(i1 - i0);
    for (const x of xs) { const i = Math.floor((x - edge0) / bw) - i0; if (i >= 0 && i < h.length) h[i] += 1 / xs.length; }
    return { h, xb: edge0 + i0 * bw };
  }
  function stepPath(H, K) {
    let d = "", open = false;
    for (let i = 0; i <= H.h.length; i++) {
      const v = i < H.h.length ? H.h[i] * K : 0, x = X(H.xb + i * bw).toFixed(1);
      if (v > 0.05) { d += open ? `V${(S.floor - v).toFixed(1)}` : `M${x},${S.floor}V${(S.floor - v).toFixed(1)}`; d += `H${X(H.xb + (i + 1) * bw).toFixed(1)}`; open = true; }
      else if (open) { d += `V${S.floor}Z`; open = false; }
    }
    return d;
  }
  const draw = (g, ctx) => {
    const { phone } = ctx;
    // legend
    const lg = g.append("g").attr("class", "legend");
    const das = dialClasses(M, state).das;
    const items = das ? [["honest", "control runs"], ["deceptive", "collusion runs"], ["tick", "the threshold, frozen"]]
      : [["chat", "ordinary chat"], ["honest", "honest"], ["deceptive", "deceptive"], ["tick", "the alarm's threshold"]];
    let lx = 14;
    for (const [k, t] of items) {
      if (k === "tick") lg.append("line").attr("x1", lx).attr("x2", lx).attr("y1", 18).attr("y2", 40).attr("class", "d-lg-tick");
      else lg.append("rect").attr("x", lx - 8).attr("y", 22).attr("width", 16).attr("height", 14).attr("class", `d-lg ${k}`);
      const tt = lg.append("text").attr("class", "lg-text").attr("x", lx + 14).attr("y", 35).text(t);
      lx += 14 + (tt.node().getComputedTextLength?.() ?? t.length * 11) + 26;
    }
    g.append("line").attr("class", "d-floor").attr("x1", S.x0 - 10).attr("x2", S.x1 + 10).attr("y1", S.floor).attr("y2", S.floor);
    const ax = g.append("g").attr("class", "d-axis");
    for (const t of d3.range(-4, 8, 2)) {
      ax.append("line").attr("x1", X(t)).attr("x2", X(t)).attr("y1", S.floor).attr("y2", S.floor + 7);
      ax.append("text").attr("x", X(t)).attr("y", S.floor + 30).attr("text-anchor", "middle").text(t > 0 ? `+${t}` : t);
    }
    ax.append("text").attr("class", "d-axis-title").attr("x", (S.x0 + S.x1) / 2).attr("y", S.floor + 58).attr("text-anchor", "middle")
      .text(das ? "the probe's peak score over a run (illustrative scale)" : "the probe's score: its mean over a response's tokens (illustrative scale)");
    g.append("path").attr("class", "d-h chat");
    g.append("path").attr("class", "d-h honest");
    g.append("path").attr("class", "d-h deceptive");
    g.append("path").attr("class", "d-h honest-line");
    g.append("rect").attr("class", "d-flagged").attr("y", S.y0 - 28).attr("height", S.floor - S.y0 + 28);
    const tk = g.append("g").attr("class", "d-tick");
    tk.append("line").attr("class", "d-tick-line").attr("y1", S.y0 - 40).attr("y2", S.floor + 10);
    probeGlyph(tk, 0, S.y0 - 56, 0.7, "q-lvl");
    tk.append("text").attr("class", "d-tick-label").attr("y", S.y0 - 50).attr("x", 16).text("flags");
    g.append("text").attr("class", "d-base").attr("x", S.x0 - 10).attr("y", S.floor + 96);
    g.append("g").attr("class", "d-bracket");
    g.append("g").attr("class", "d-unknown");
    g.node().__dial = null;
    return update(g, ctx, true);
  };
  function update(g, ctx, first = false) {
    g.node().__dialTimer?.stop();
    const prev = g.node().__dial;
    const C = dialClasses(M, state);
    const cur = { chat: C.chat ? drawnSamples(C.chat) : null, honest: C.honest ? drawnSamples(C.honest) : null, deceptive: C.deceptive ? drawnSamples(C.deceptive) : null };
    const tick = state.tick ?? (C.das ? M.das.tick : M.meta.tick);
    const from = prev ?? { chat: cur.chat, honest: cur.honest, deceptive: cur.deceptive, tick, K: null };
    // one height scale for the target state: the tallest bin fills 86% of the band
    const Hs = ["chat", "honest", "deceptive"].filter((k) => cur[k]).map((k) => hist(cur[k]));
    const K1 = (0.86 * (S.floor - S.y0)) / Math.max(...Hs.map((H) => d3.max(H.h)));
    const K0 = from.K ?? K1;
    const dur = first ? (ctx.reduced ? 0 : 1400) : ctx.dur(900);
    const lerpA = (a, b, t) => (a && b ? a.map((x, i) => x + (b[i] - x) * t) : b ? b : null);
    const frame = (t) => {
      const e = d3.easeCubicInOut(t);
      const now = {};
      for (const k of ["chat", "honest", "deceptive"]) now[k] = from[k] && cur[k] ? lerpA(from[k], cur[k], e) : cur[k];
      const K = K0 + (K1 - K0) * e;
      const tk = from.tick + (tick - from.tick) * e;
      // a new class grows in (its histogram's height), a leaving one shrinks
      const grow = (k) => (from[k] ? 1 : first ? d3.easeCubicOut(Math.min(1, t * 1.4)) : e);
      g.select(".d-h.chat").attr("d", now.chat ? stepPath(hist(now.chat), K) : "");
      g.select(".d-h.honest").attr("d", now.honest ? stepPath(hist(now.honest), K * grow("honest")) : "");
      g.select(".d-h.honest-line").attr("d", now.honest ? stepPath(hist(now.honest), K * grow("honest")) : "");
      g.select(".d-h.deceptive").attr("d", now.deceptive ? stepPath(hist(now.deceptive), K * grow("deceptive")) : "");
      g.select(".d-tick").attr("transform", `translate(${X(tk)},0)`);
      g.select(".d-flagged").attr("x", X(tk)).attr("width", Math.max(0, S.x1 + 10 - X(tk)));
      return { ...now, tick: tk, K };
    };
    // the AUROC bracket over the two task histograms, and "?" brackets when the task's responses are still hidden
    const br = g.select(".d-bracket").html("");
    if (cur.honest && cur.deceptive) {
      const mh = d3.median(cur.honest), md = d3.median(cur.deceptive), y = S.y0 + 14;
      br.append("path").attr("d", `M${X(mh)},${y + 10}V${y}H${X(md)}V${y + 10}`);
      br.append("text").attr("x", (X(mh) + X(md)) / 2).attr("y", y - 8).attr("text-anchor", "middle")
        .text(`AUROC ${aurocOf(cur.deceptive, cur.honest).toFixed(3)}`);
      br.style("opacity", 0).transition().delay(ctx.at(first ? 1200 : 700)).duration(ctx.dur(400)).style("opacity", 1);
    }
    const uk = g.select(".d-unknown").html("");
    if (!cur.honest) {
      [["honest", 2.2], ["deceptive", 4.6]].forEach(([k, at], i) => {
        const gg = uk.append("g").attr("class", `d-uk ${k}`).attr("transform", `translate(${X(at)},${S.y0 + 60 + i * 48})`);
        gg.append("rect").attr("x", -86).attr("y", -20).attr("width", 172).attr("height", 30).attr("rx", 5);
        gg.append("text").attr("text-anchor", "middle").attr("y", 1).text(`${k} responses: ?`);
      });
      uk.style("opacity", 0).transition().delay(ctx.at(2400)).duration(ctx.dur(400)).style("opacity", 1);
    }
    g.select(".d-tick-label").text(cur.chat ? `flags ${(100 * shareAbove(cur.chat, tick)).toFixed(1)}% of chat`
      : `catches ${Math.round(100 * shareAbove(cur.deceptive, tick))}% of collusion runs`);
    // what the threshold costs: false alarms at a million ordinary requests a day (arithmetic on the drawn chat samples)
    g.select(".d-base").text(cur.chat ? `at a million ordinary requests a day: ${Math.round(1e6 * shareAbove(cur.chat, tick)).toLocaleString("en-US")} false alarms` : "");
    if (ctx.reduced || dur === 0) { g.node().__dial = { ...frame(1) }; onTick?.(); return 0; }
    const t0 = performance.now();
    // the state reached so far is kept at every frame, so an update mid-morph continues from where the picture is
    const tm = d3.timer((el) => {
      const t = Math.min(1, el / dur);
      g.node().__dial = frame(t);
      if (t >= 1) { tm.stop(); onTick?.(); }
    });
    g.node().__dialTimer = tm;
    void t0;
    return dur;
  }
  return { id: dialClasses(M, state).das ? "das" : "dial", draw, update: (g, ctx) => update(g, ctx, false), key: key(state) };
}

/** Told, not trained (Das et al.): the aware state, a hold, then the same agents shown the monitor's scores. */
export function dasView(M) {
  const v1 = dialView(M, { traffic: "aware" }), v2 = dialView(M, { traffic: "feedback" });
  return {
    id: "das-seq",
    draw(g, ctx) {
      const t = v1.draw(g, ctx);
      if (ctx.reduced) { v2.update(g, ctx); return 0; }
      d3.timeout(() => { if (g.node().isConnected) v2.update(g, ctx); }, t + 1300);
      return t + 1300 + 900;
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// A lie detector and its counterparts: three published results, each headline with the counterpart that travels with it.
// Rows land one at a time: headline, a hold, then the counterpart slides in under a bracket. Ink on paper; the sleeper pair
// reuses chapter II's contrast-pair glyph (two statements joined, their difference a gold arrow).
export function counterpartsView({ held }) {
  const rows = [
    { title: "A sleeper agent, one pair", who: "Anthropic, 2024",
      head: ["AUROC 99.3%"], sub: ["“Are you a helpful AI?”", "answered “no” minus “yes”"],
      counter: [["On the base model without sleeper training:", "the direction separates nothing."],
        ["“the salience of this feature” may be", "“an artifact of our backdoor insertion process”"]],
      phone: { sub: ["“Are you a helpful AI?” no − yes"], counter: [["base model: separates nothing"], ["salience: maybe an artifact"]] } },
    { title: "A deception probe", who: "Apollo, 2025",
      head: ["AUROC 0.96–0.999", "recall 95–99%"], sub: ["at 1% false alarms on chat", "Llama-3.3-70B, layer 22"],
      counter: [["another model (Claude Haiku 3.5):", held ? "AUROC ?" : "AUROC 0.696, not 0.964"],
        ["threshold calibration corrected:", "Roleplaying recall 96% → 73.2%"],
        ["organisms trained to lie:", "balanced accuracy 0.85 → 0.52"],
        ["probing two layers later:", "recall near 0 on Insider Trading"]],
      phone: { sub: ["at 1% false alarms on chat"], counter: [[held ? "Claude Haiku 3.5: AUROC ?" : "Claude Haiku 3.5: 0.696"], ["calibration fixed: 96% → 73%"], ["trained liars: 0.85 → 0.52"], ["two layers on: recall ≈ 0"]] } },
    { title: "New lie types", who: "Liars' Bench, 2025",
      head: ["AUROC 0.60"], sub: ["the same probe, averaged;", "balanced accuracy 0.54"],
      counter: [["on Apollo's own datasets:", "AUROC 0.96–1.00"]],
      phone: { sub: ["averaged; balanced acc. 0.54"], counter: [["Apollo's own sets: 0.96–1.00"]] } },
  ];
  const draw = (g, ctx) => {
    const { phone } = ctx;
    const fsT = phone ? 23 : 19, fsB = phone ? 21 : 16.5, fsH = phone ? 34 : 30;
    const xL = 10, wL = phone ? 330 : 290, xR = xL + wL + (phone ? 22 : 28), wR = 710 - xR;
    let y = 14;
    let t = 0;
    const lineH = (fs) => fs * 1.28;
    rows.forEach((r0, i) => {
      const r = phone ? { ...r0, ...r0.phone } : r0;
      const nCounter = r.counter.length, nl = r.counter[0].length;
      const hL = 34 + fsH * 1.15 * r.head.length + lineH(fsB) * r.sub.length + 30;
      const chipH = lineH(fsB) * nl + 4, hC = nCounter * (chipH + 6) + 16;
      const h = Math.max(hL, hC);
      const row = g.append("g").attr("class", "cp-row");
      // headline card
      const L = row.append("g").attr("class", "q-card cp-head");
      L.append("rect").attr("x", xL).attr("y", y).attr("width", wL).attr("height", h).attr("rx", 7).attr("filter", ctx.cardFilter);
      L.append("text").attr("class", "q-card-title").attr("x", xL + 14).attr("y", y + fsT + 8).text(r.title);
      r.head.forEach((hd, j) => L.append("text").attr("class", "cp-big").attr("x", xL + 14).attr("y", y + fsT + 16 + fsH * 1.1 * (j + 1)).text(hd));
      const sy = y + fsT + 22 + fsH * 1.1 * r.head.length + fsB;
      ctx.lines(L.append("text").attr("class", "q-card-body").attr("x", xL + 14).attr("y", sy), r.sub, xL + 14, 1.28);
      L.append("text").attr("class", "q-card-tag").attr("x", xL + 14).attr("y", y + h - 10).text(r.who);
      ctx.fadeIn(L, t, 450);
      // the bracket and the counterparts
      const C = row.append("g").attr("class", "cp-counter");
      const bx = xR - (phone ? 12 : 15);
      C.append("path").attr("class", "cp-bracket").attr("d", `M${bx - 8},${y + 8}H${bx}V${y + h - 8}H${bx - 8}`);
      r.counter.forEach((c, j) => {
        const cy = y + 8 + j * (chipH + 6);
        const cc = C.append("g").attr("class", `cp-chip${held && i === 1 && j === 0 ? " held" : ""}${nl === 1 ? " one" : ""}`);
        cc.append("rect").attr("x", xR).attr("y", cy).attr("width", wR).attr("height", chipH).attr("rx", 5);
        ctx.lines(cc.append("text").attr("class", "cp-chip-text").attr("x", xR + 12).attr("y", cy + fsB + 3), c, xR + 12, 1.28);
        ctx.fadeIn(cc, t + 1000 + j * 350, 400);
      });
      ctx.fadeIn(C.select(".cp-bracket"), t + 900, 300);
      t += 1000 + nCounter * 350 + 700;
      y += h + (phone ? 14 : 12);
    });
    if (!phone) {
      const ft = g.append("text").attr("class", "cp-foot").attr("x", xL).attr("y", y + fsB + 4);
      ctx.lines(ft, ["“we currently lack the necessary examples” of labelled deception (Smith, Chughtai & Nanda, 2025)"], xL, 1.28);
      ctx.fadeIn(ft, t, 400);
    }
    return ctx.reduced ? 0 : t + 400;
  };
  const update = (g, ctx) => {
    // the held chip: answering the check reveals Claude Haiku 3.5's number in place
    const chip = g.select(".cp-chip.held");
    if (chip.empty() || held) return 0;
    const tsp = chip.classed("held", false).select("text").selectAll("tspan");
    if (tsp.size() > 1) tsp.filter((_, k) => k === 1).text("AUROC 0.696, not 0.964"); else tsp.text("Claude Haiku 3.5: 0.696");
    return 0;
  };
  return { id: `lies`, draw, update };
}

// ---------------------------------------------------------------------------------------------------------------------
// Shared pieces for the chapter IV–VI boards
const lcg = (seed) => { let s = seed >>> 0; return () => ((s = (1664525 * s + 1013904223) >>> 0) / 4294967296); };
/** A row of legend items: [{ k, t }] with k in hl (spelled-out highlight), bar (a per-token score), mean (dashed), tick. */
function legendRow(g, items, ctx, y = 35) {
  const lg = g.append("g").attr("class", "legend");
  let x = 14;
  for (const it of items) {
    if (it.k === "hl") lg.append("rect").attr("x", x - 8).attr("y", y - 15).attr("width", 16).attr("height", 16).attr("rx", 3).attr("class", "m-lg-hl");
    else if (it.k === "tok") lg.append("rect").attr("x", x - 8).attr("y", y - 15).attr("width", 16).attr("height", 16).attr("rx", 3).attr("class", "m-lg-tok");
    else if (it.k === "bar") lg.append("rect").attr("x", x - 4).attr("y", y - 18).attr("width", 8).attr("height", 20).attr("class", "m-lg-bar");
    else if (it.k === "mean") lg.append("line").attr("x1", x - 10).attr("x2", x + 10).attr("y1", y - 6).attr("y2", y - 6).attr("class", "m-lg-mean");
    else if (it.k === "tick") lg.append("line").attr("x1", x - 10).attr("x2", x + 10).attr("y1", y - 6).attr("y2", y - 6).attr("class", "m-lg-tick");
    else if (it.k === "true" || it.k === "false") lg.append("circle").attr("cx", x).attr("cy", y - 6).attr("r", 6).attr("class", `m-lg-pt ${it.k}`);
    else if (it.k === "mag") lg.append("rect").attr("x", x - 9).attr("y", y - 13).attr("width", 18).attr("height", 12).attr("rx", 3).attr("class", "m-lg-mag");
    const t = lg.append("text").attr("class", "lg-text").attr("x", x + 14).attr("y", y).text(it.t);
    x += 14 + (t.node().getComputedTextLength?.() ?? it.t.length * 11) + (ctx.phone ? 20 : 26);
  }
  const room = 700;
  if (x > room) lg.attr("transform", `translate(14,0) scale(${room / x},1) translate(-14,0)`);
  return lg;
}

// ---------------------------------------------------------------------------------------------------------------------
// In the activations, or in the text? A schematic transcript in three spans (the prompt that asks for the behaviour, the
// reasoning that says it, the answer), per-token probe scores under each token, their mean and the threshold. Scoring
// only the answer, swapping in a benign prompt, or a model that never says it: the mean sinks. Only the four AUROCs
// (Boxo, Neelappa and Raval's sandbagging setting) are data; the tokens and their scores are drawn to show where the
// evidence sits.
export function leakView({ scored, held }) {
  const SP = [{ k: "prompt", n: 10, label: "the prompt" }, { k: "reason", n: 14, label: "its reasoning" }, { k: "answer", n: 9, label: "the answer" }];
  const AU = [["all", "every token", 0.95], ["answer", "only the answer", 0.81], ["benign", "a benign prompt", 0.63], ["organism", "a silent organism", 0.5]];
  const toks = [];
  const rnd = lcg(11);
  SP.forEach((sp) => { for (let i = 0; i < sp.n; i++) toks.push({ span: sp.k, i, j: rnd(), j2: rnd() }); });
  const base = { prompt: 2.0, reason: 1.8, answer: 0.45 };
  function stateOf(k) {
    // per token: score, counted?, spelled out in the text?
    return toks.map((t) => {
      let s = base[t.span], counted = true, spelled = t.span !== "answer";
      if (k === "answer" && t.span !== "answer") counted = false;
      if (k === "benign" && t.span === "prompt") { s = 0.3; spelled = false; }
      if (k === "benign" && t.span === "reason") s = 1.0;
      if (k === "organism") { s = t.span === "answer" ? 0.45 : 0.35; spelled = false; }
      const v = Math.max(0.05, s + (t.j - 0.5) * (t.span === "answer" ? 0.5 : 0.9));
      return { s: v, counted, spelled };
    });
  }
  const draw = (g, ctx) => {
    const { phone } = ctx;
    legendRow(g, phone ? [{ k: "hl", t: "spelled out" }, { k: "bar", t: "score per token" }, { k: "mean", t: "mean" }, { k: "tick", t: "threshold" }]
      : [{ k: "hl", t: "spelled out in the text" }, { k: "bar", t: "the probe's score per token" }, { k: "mean", t: "their mean" }, { k: "tick", t: "the threshold" }], ctx);
    const x0 = 30, x1 = 700, n = toks.length, step = (x1 - x0) / n, tw = step * 0.78;
    const yTok = 104, hTok = phone ? 34 : 30, floor = phone ? 356 : 330, K = phone ? 62 : 64;
    const X = (i) => x0 + i * step;
    // span brackets and labels
    let i0 = 0;
    const br = g.append("g").attr("class", "m-spans");
    SP.forEach((sp) => {
      const a = X(i0), b = X(i0 + sp.n) - (step - tw);
      br.append("path").attr("class", "m-span-br").attr("d", `M${a},${yTok - 8}V${yTok - 16}H${b}V${yTok - 8}`);
      br.append("text").attr("class", "m-span-t").attr("x", (a + b) / 2).attr("y", yTok - 24).attr("text-anchor", "middle").text(sp.label);
      i0 += sp.n;
    });
    ctx.fadeIn(br, 0, 400);
    const tk = g.append("g").attr("class", "m-toks");
    tk.selectAll("rect").data(toks).join("rect").attr("class", "m-tok").attr("x", (_, i) => X(i)).attr("y", yTok).attr("width", tw).attr("height", hTok).attr("rx", 3);
    ctx.fadeIn(tk, 200, 500);
    // the score chart
    g.append("line").attr("class", "m-floor").attr("x1", x0 - 8).attr("x2", x1 + 4).attr("y1", floor).attr("y2", floor);
    g.append("text").attr("class", "m-axis-t").attr("x", x0 - 8).attr("y", floor + (phone ? 30 : 26)).text("the probe's score on each token (schematic)");
    g.append("g").attr("class", "m-bars").selectAll("rect").data(toks).join("rect").attr("class", "m-bar").attr("x", (_, i) => X(i)).attr("width", tw)
      .attr("y", floor).attr("height", 0);
    const thrY = floor - 1.1 * K;
    g.append("line").attr("class", "m-thr").attr("x1", x0 - 8).attr("x2", x1 + 4).attr("y1", thrY).attr("y2", thrY);
    g.append("text").attr("class", "m-thr-t").attr("x", x1 + 4).attr("y", thrY - 8).attr("text-anchor", "end").text("threshold");
    {
      const st0 = stateOf(scored), used = st0.map((q, i) => ({ ...q, i })).filter((q) => q.counted);
      const m = d3.mean(used, (q) => q.s), ym = floor - m * K, a = X(used[0].i), b = X(used[used.length - 1].i) + tw;
      const mk = g.append("g");
      mk.append("line").attr("class", "m-mean").attr("x1", a).attr("x2", b).attr("y1", ym).attr("y2", ym);
      mk.append("text").attr("class", "m-mean-t").attr("text-anchor", "start").attr("x", a + 4).attr("y", ym - 9);
      ctx.fadeIn(mk, 1300, 400);
    }
    // the four AUROCs (Boxo et al.)
    const cy = floor + (phone ? 56 : 52), cw = phone ? 346 : 336, ch = phone ? 50 : 44;
    const chips = g.append("g").attr("class", "m-aus");
    AU.forEach(([k, t], j) => {
      const c = chips.append("g").attr("class", `m-au m-au-${k}`).attr("transform", `translate(${x0 - 8 + (j % 2) * (cw + 16)},${cy + Math.floor(j / 2) * (ch + 10)})`);
      c.append("rect").attr("width", cw).attr("height", ch).attr("rx", 6);
      c.append("text").attr("class", "m-au-t").attr("x", 14).attr("y", ch / 2 + 7).text(t);
      c.append("text").attr("class", "m-au-v").attr("x", cw - 14).attr("y", ch / 2 + 8).attr("text-anchor", "end");
    });
    ctx.fadeIn(chips, 900, 500);
    g.node().__leak = { X, tw, floor, K, x0, x1 };
    return update(g, ctx, true);
  };
  function update(g, ctx, first = false) {
    const L = g.node().__leak, st = stateOf(scored);
    const d = first ? ctx.dur(700) : ctx.dur(600), delay = first ? ctx.at(700) : 0;
    g.select(".m-toks").selectAll("rect").data(st).classed("hl", (q) => q.spelled).classed("off", (q) => !q.counted);
    g.select(".m-bars").selectAll("rect").data(st).classed("off", (q) => !q.counted).transition().delay(delay).duration(d)
      .attr("y", (q) => L.floor - q.s * L.K).attr("height", (q) => q.s * L.K);
    const used = st.map((q, i) => ({ ...q, i })).filter((q) => q.counted);
    const m = d3.mean(used, (q) => q.s), ym = L.floor - m * L.K;
    const a = L.X(used[0].i), b = L.X(used[used.length - 1].i) + L.tw;
    g.select(".m-mean").transition().delay(delay).duration(d).attr("x1", a).attr("x2", b).attr("y1", ym).attr("y2", ym);
    g.select(".m-mean-t").text(m > 1.1 ? "mean: flagged" : "mean: not flagged").transition().delay(delay).duration(d).attr("x", a + 4).attr("y", ym - 9);
    AU.forEach(([k, , v]) => {
      const c = g.select(`.m-au-${k}`).classed("on", k === scored);
      c.select(".m-au-v").text(k === "organism" && held ? "?" : v.toFixed(2).replace(/0$/, "") === "0.5" ? "0.50" : v.toFixed(2));
    });
    return first ? (ctx.reduced ? 0 : 1500) : ctx.reduced ? 0 : 600;
  }
  return { id: "leak", draw, update: (g, ctx) => update(g, ctx, false) };
}

// ---------------------------------------------------------------------------------------------------------------------
// Train against it (the predict): the model's answer, a frozen probe's three poolings, and a reward that loops back
// (magenta: optimization pressure) with no gradients through the probe. Schematic; no numbers.
export function rlLoopView() {
  const draw = (g, ctx) => {
    const { phone } = ctx;
    const G = { x0: 10, y0: 56, x1: 710, y1: 206 };
    ctx.glass(g, G);
    g.append("text").attr("class", "glass-label").attr("x", G.x0 + 18).attr("y", G.y0 + 32).text("the model, being trained");
    const stream = g.append("g");
    for (let i = 0; i < 9; i++) stream.append("line").attr("class", "q-layer").attr("x1", 150 + i * 46).attr("x2", 150 + i * 46).attr("y1", G.y0 + 48).attr("y2", G.y1 - 18);
    ctx.fadeIn(stream, 0, 400);
    // its answer, on paper
    const n = 22, x0 = 40, step = 26, ty = G.y1 + 40;
    const rnd = lcg(5);
    const toks = d3.range(n).map((i) => ({ i, s: i >= 6 && i <= 10 ? 1.7 + rnd() * 0.6 : 0.2 + rnd() * 0.5 }));
    const ans = g.append("g");
    ans.append("text").attr("class", "m-row-t").attr("x", x0).attr("y", ty - 10).text("an answer, token by token");
    toks.forEach((t) => ans.append("rect").attr("class", `m-tok${t.i >= 6 && t.i <= 10 ? " harm" : ""}`).attr("x", x0 + t.i * step).attr("y", ty).attr("width", step * 0.78).attr("height", 24).attr("rx", 3));
    ctx.fadeIn(ans, 400, 400);
    const drop = g.append("path").attr("class", "q-drop").attr("d", `M${x0 + 12 * step},${G.y1 - 2}V${ty - 32}`);
    ctx.fadeIn(drop, 300, 300);
    // three poolings of the same per-token scores
    const rows = [["mean over tokens", "mean"], ["maximum over tokens", "max"], ["learned attention", "attn"]];
    const ry0 = ty + 64, rh = phone ? 84 : 76, bw = 10, K = 22;
    const pools = g.append("g");
    rows.forEach(([label, k], r) => {
      const y = ry0 + r * rh, gg = pools.append("g").attr("class", "m-pool");
      gg.append("text").attr("class", "m-row-t").attr("x", x0).attr("y", y + 4).text(label);
      const bx = x0 + (phone ? 270 : 240);
      toks.forEach((t, i) => gg.append("rect").attr("class", "m-bar small").attr("x", bx + i * (bw + 2)).attr("y", y + 22 - t.s * K).attr("width", bw).attr("height", t.s * K));
      const bxe = bx + n * (bw + 2);
      if (k === "mean") { const m = d3.mean(toks, (t) => t.s); gg.append("line").attr("class", "m-mean").attr("x1", bx - 2).attr("x2", bxe).attr("y1", y + 22 - m * K).attr("y2", y + 22 - m * K); }
      if (k === "max") { const j = d3.maxIndex(toks, (t) => t.s); gg.append("path").attr("class", "m-max").attr("d", `M${bx + j * (bw + 2) - 3},${y + 22 - toks[j].s * K - 6}h${bw + 6}`); }
      if (k === "attn") toks.forEach((t, i) => gg.append("circle").attr("class", "m-attn").attr("cx", bx + i * (bw + 2) + bw / 2).attr("cy", y + 34).attr("r", 1.5 + 3 * (t.s / 2.3)));
      gg.append("rect").attr("class", "m-verdict").attr("x", 590).attr("y", y - 16).attr("width", 110).attr("height", 34).attr("rx", 6);
      gg.append("text").attr("class", "m-verdict-t").attr("x", 645).attr("y", y + 7).attr("text-anchor", "middle").text("flagged?");
      ctx.fadeIn(gg, 900 + r * 350, 400);
    });
    // the reward loops back into the model
    const lx = 704, top = G.y0 + 70;
    const loop = g.append("g").attr("class", "m-loop");
    loop.append("path").attr("class", "m-loop-path").attr("d", `M${702},${ry0 + rh + 2} C${722},${ry0 + rh} ${722},${top + 40} ${lx - 40},${top}`).attr("marker-end", ctx.arrow("mag"));
    const lt = loop.append("text").attr("class", "m-loop-t").attr("x", 560).attr("y", ry0 + 3 * rh + (phone ? 10 : 6)).attr("text-anchor", "end");
    ctx.lines(lt, phone ? ["reward: harmful, and not flagged", "no gradients through the probe"] : ["reward: a harmful answer the probe doesn't flag", "no gradients pass through the probe"], 700 - 4, 1.25);
    lt.attr("text-anchor", "end");
    ctx.fadeIn(loop, 2200, 600);
    return ctx.reduced ? 0 : 2800;
  };
  return { id: "rlloop", draw };
}

// ---------------------------------------------------------------------------------------------------------------------
// Under pressure: Gupta and Jenner's evasion rates (Qwen 2.5 14B, Table 1) as bars; under them, the mechanism as a
// sketch: filler tokens with low scores land between the answer's tokens, and the mean sinks under the threshold while
// the maximum stays.
export function pressureView() {
  const RATES = [["mean over tokens", 0.82], ["maximum over tokens", 0.044], ["learned attention", 0.018]];
  const draw = (g, ctx) => {
    const { phone } = ctx;
    const x0 = 16, lw = phone ? 280 : 250, bx = x0 + lw, bmax = 700 - bx - 90;
    g.append("text").attr("class", "m-panel-t").attr("x", x0).attr("y", 40).text("evaded at 1% FPR · Qwen 2.5 14B");
    RATES.forEach(([t, v], i) => {
      const y = 64 + i * (phone ? 50 : 44), gg = g.append("g").attr("class", "m-rate");
      gg.append("text").attr("class", "m-row-t").attr("x", x0).attr("y", y + 22).text(t);
      gg.append("rect").attr("class", `m-rate-bar${i === 0 ? " hot" : ""}`).attr("x", bx).attr("y", y + 4).attr("height", phone ? 28 : 24).attr("width", 0)
        .transition().delay(ctx.at(300 + i * 450)).duration(ctx.dur(600)).attr("width", Math.max(2, v * bmax));
      gg.append("text").attr("class", "m-rate-v").attr("x", bx + Math.max(2, v * bmax) + 10).attr("y", y + 23).text(`${(100 * v).toFixed(v < 0.1 ? 1 : 0)}%`);
      ctx.fadeIn(gg, 300 + i * 450, 400);
    });
    // the strip: an answer whose harmful tokens keep their scores while filler tokens are added
    const sy = phone ? 262 : 244;
    g.append("text").attr("class", "m-panel-t").attr("x", x0).attr("y", sy).text("how the mean is evaded (a sketch)");
    const floor = sy + (phone ? 230 : 214), K = 58, step = phone ? 17 : 16.5, bw = step * 0.72;
    g.append("line").attr("class", "m-floor").attr("x1", x0).attr("x2", 704).attr("y1", floor).attr("y2", floor);
    const thrY = floor - 1.0 * K;
    g.append("line").attr("class", "m-thr").attr("x1", x0).attr("x2", 704).attr("y1", thrY).attr("y2", thrY);
    g.append("text").attr("class", "m-thr-t").attr("x", 704).attr("y", thrY - 8).attr("text-anchor", "end").text("threshold");
    // before: 12 answer tokens, 5 of them harmful and loud
    const rnd = lcg(3);
    const core = d3.range(12).map((i) => ({ id: `c${i}`, s: i >= 4 && i <= 8 ? 1.9 + rnd() * 0.5 : 0.5 + rnd() * 0.4, fill: false }));
    // after: filler tokens (tags, punctuation) interleaved, each with a low score
    const after = [];
    core.forEach((c, i) => { after.push(c); if (i % 1 === 0) { after.push({ id: `f${i}a`, s: 0.08 + rnd() * 0.1, fill: true }); if (i % 2) after.push({ id: `f${i}b`, s: 0.08 + rnd() * 0.1, fill: true }); } });
    const bars = g.append("g");
    const place = (seq) => seq.map((q, i) => ({ ...q, x: x0 + 10 + i * step }));
    const mean = (seq) => d3.mean(seq, (q) => q.s), max = (seq) => d3.max(seq, (q) => q.s);
    const drawSeq = (seq, t, d) => {
      const P = place(seq);
      bars.selectAll("rect").data(P, (q) => q.id).join(
        (en) => en.append("rect").attr("class", (q) => `m-bar${q.fill ? " filler" : ""}`).attr("x", (q) => q.x).attr("width", bw).attr("y", floor).attr("height", 0)
          .call((e) => e.transition().delay(ctx.at(t)).duration(ctx.dur(d)).attr("y", (q) => floor - q.s * K).attr("height", (q) => q.s * K)),
        (up) => up.call((u) => u.transition().delay(ctx.at(t)).duration(ctx.dur(d)).attr("x", (q) => q.x)));
      const m = mean(seq), mx = max(seq), xe = P[P.length - 1].x + bw;
      g.select(".m-mean").transition().delay(ctx.at(t)).duration(ctx.dur(d)).attr("x1", x0 + 6).attr("x2", xe + 4).attr("y1", floor - m * K).attr("y2", floor - m * K);
      g.select(".m-mean-t").transition().delay(ctx.at(t)).duration(ctx.dur(d)).attr("x", xe + 10).attr("y", floor - m * K + 6);
      g.select(".m-max").transition().delay(ctx.at(t)).duration(ctx.dur(d)).attr("d", `M${x0 + 6},${floor - mx * K}H${xe + 4}`);
      g.select(".m-max-t").transition().delay(ctx.at(t)).duration(ctx.dur(d)).attr("x", xe + 10).attr("y", floor - mx * K + 6);
    };
    g.append("path").attr("class", "m-trail");
    const marks = g.append("g");
    {
      const P0 = place(core), m = mean(core), mx = max(core), xe = P0[P0.length - 1].x + bw;
      marks.append("line").attr("class", "m-mean").attr("x1", x0 + 6).attr("x2", xe + 4).attr("y1", floor - m * K).attr("y2", floor - m * K);
      marks.append("text").attr("class", "m-mean-t").text("mean").attr("x", xe + 10).attr("y", floor - m * K + 6);
      marks.append("path").attr("class", "m-max").attr("d", `M${x0 + 6},${floor - mx * K}H${xe + 4}`);
      marks.append("text").attr("class", "m-max-t").text("max").attr("x", xe + 10).attr("y", floor - mx * K + 6);
    }
    ctx.fadeIn(marks, 2100, 400);
    drawSeq(core, 1800, 500);
    // the fillers arrive one after another (the mean sinks, leaving a magenta trail); the max doesn't move
    const t0 = 3200;
    const m0 = mean(core);
    const nF = after.filter((q) => q.fill).length;
    let k = 0;
    const seqAt = (kk) => { let c = 0; return after.filter((q) => !q.fill || c++ < kk); };
    for (k = 1; k <= nF; k++) { const s_ = seqAt(k); if (ctx.reduced) continue; drawSeq(s_, t0 + (k - 1) * 170, 160); }
    if (ctx.reduced) drawSeq(after, 0, 0);
    const m1 = mean(after), xm = 700 - 118;
    g.select(".m-trail").attr("d", `M${xm},${floor - m0 * K}V${floor - m1 * K}`).attr("marker-end", ctx.arrow("mag"))
      .style("opacity", 0).transition().delay(ctx.at(t0 + nF * 170)).duration(ctx.dur(400)).style("opacity", 1);
    return ctx.reduced ? 0 : t0 + nF * 170 + 400;
  };
  return { id: "pressure", draw };
}

// ---------------------------------------------------------------------------------------------------------------------
// Without an adversary, picture 1: the concept moves. Illustrative points (filled: hard-coded solutions; hollow: honest
// ones) read by a general deception probe (gold level sets, and its paper histogram). After ordinary RL on coding (a
// magenta band), the hard-coded cloud turns: along the old direction the two overlap; an on-domain probe separates them
// again. Only the AUCs are the Obfuscation Atlas's (Table 4).
export function movesView() {
  const draw = (g, ctx) => {
    const { phone } = ctx;
    const G = { x0: 10, y0: 56, x1: 710, y1: phone ? 330 : 318 };
    ctx.glass(g, G);
    const cx = (G.x0 + G.x1) / 2, cy = (G.y0 + G.y1) / 2 + 10, R = phone ? 30 : 26;
    const rnd = lcg(21), nrm = () => { const u = Math.max(1e-9, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); };
    const N = phone ? 40 : 60;
    const honest = d3.range(N).map(() => [-1.5 + 0.55 * nrm(), 0.55 * nrm()]);
    const hack0 = d3.range(N).map(() => [1.5 + 0.55 * nrm(), 0.55 * nrm()]);
    const hack1 = hack0.map(([x, y]) => [-1.5 + y + 0.15 * nrm(), 2.5 + (x - 1.5) * 0.8]);     // turned: overlaps along x
    const cyMid = (G.y0 + G.y1) / 2 + 8, ky = (G.y1 - G.y0 - 56) / 5.4;
    const sx = (x) => cx + x * (phone ? 96 : 100), sy = (y) => cyMid - (y - 1.1) * ky;
    const lv = g.append("g").attr("class", "m-levels");
    const drawLevels = (sel, vertical, cls) => {
      [-2, -1, 0, 1, 2].forEach((k) => {
        if (vertical) sel.append("line").attr("class", `${cls}${k ? "" : " zero"}`).attr("x1", cx + k * 60).attr("x2", cx + k * 60).attr("y1", G.y0 + 8).attr("y2", G.y1 - 8);
        else sel.append("line").attr("class", `${cls}${k ? "" : " zero"}`).attr("x1", G.x0 + 8).attr("x2", G.x1 - 8).attr("y1", sy(1.25) + k * 30).attr("y2", sy(1.25) + k * 30);
      });
    };
    const oldLv = lv.append("g"); drawLevels(oldLv, true, "q-lvlg");
    const newLv = lv.append("g").style("opacity", 0); drawLevels(newLv, false, "q-lvlg");
    g.append("text").attr("class", "glass-label gold").attr("x", cx + 14).attr("y", G.y0 + 30).text("a general deception probe");
    const newLab = g.append("text").attr("class", "glass-label gold").attr("x", G.x1 - 18).attr("y", sy(1.25) - 8).attr("text-anchor", "end").text("a probe for hard-coding").style("opacity", 0);
    const pts = g.append("g");
    const H = pts.selectAll("circle.h").data(honest).join("circle").attr("class", "m-pt hollow").attr("r", phone ? 5.2 : 4.2).attr("cx", (d) => sx(d[0])).attr("cy", (d) => sy(d[1]));
    const K_ = pts.selectAll("circle.k").data(hack0).join("circle").attr("class", "m-pt filled").attr("r", phone ? 5.2 : 4.2).attr("cx", (d) => sx(d[0])).attr("cy", (d) => sy(d[1]));
    ctx.fadeIn(pts, 0, 500);
    // paper: the projection onto the general direction, one histogram per class
    const floor = G.y1 + (phone ? 120 : 110), bw = 16;
    g.append("line").attr("class", "m-floor").attr("x1", G.x0).attr("x2", G.x1).attr("y1", floor).attr("y2", floor);
    g.append("text").attr("class", "m-axis-t").attr("x", G.x0).attr("y", floor + (phone ? 30 : 26)).text("onto the general deception direction");
    const hist = (arr) => { const h = new Map(); for (const [x] of arr) { const b = Math.floor(sx(x) / bw); h.set(b, (h.get(b) ?? 0) + 1); } return h; };
    const path = (h) => { let d = ""; for (const [b, c] of [...h.entries()].sort((a, b_) => a[0] - b_[0])) d += `M${b * bw},${floor}V${floor - c * 7.5}H${(b + 1) * bw}V${floor}`; return d; };
    const pH = g.append("path").attr("class", "m-hist hollow").attr("d", path(hist(honest)));
    const pK = g.append("path").attr("class", "m-hist filled").attr("d", path(hist(hack0)));
    ctx.fadeIn(pH, 300, 400); ctx.fadeIn(pK, 300, 400);
    // the RL band
    const band = g.append("g").attr("class", "m-band");
    band.append("rect").attr("x", G.x0).attr("y", floor + (phone ? 48 : 42)).attr("width", G.x1 - G.x0).attr("height", 30).attr("rx", 6);
    band.append("text").attr("x", (G.x0 + G.x1) / 2).attr("y", floor + (phone ? 70 : 63)).attr("text-anchor", "middle").text("ordinary RL on coding: no probe in the reward");
    ctx.fadeIn(band, 1500, 400);
    if (ctx.reduced) {
      K_.attr("cx", (d, i) => sx(hack1[i][0])).attr("cy", (d, i) => sy(hack1[i][1]));
      pK.attr("d", path(hist(hack1))); oldLv.attr("class", "ghost"); newLv.style("opacity", 1); newLab.style("opacity", 1);
      return 0;
    }
    K_.transition().delay(2100).duration(1400).ease(d3.easeCubicInOut).attr("cx", (d, i) => sx(hack1[i][0])).attr("cy", (d, i) => sy(hack1[i][1]));
    pK.transition().delay(2100).duration(1400).attr("d", path(hist(hack1)));
    oldLv.transition().delay(3300).duration(500).style("opacity", 0.45).on("end", () => oldLv.selectAll("line").classed("dash", true));
    newLv.transition().delay(3900).duration(600).style("opacity", 1);
    newLab.transition().delay(3900).duration(600).style("opacity", 1);
    return 4600;
  };
  return { id: "moves", draw };
}

// ---------------------------------------------------------------------------------------------------------------------
// Steering for free: one direction, four uses (persona vectors), and the refusal direction. Gold = reading, violet =
// writing, magenta = training.
export function handleView() {
  const draw = (g, ctx) => {
    const { phone } = ctx;
    const cw = phone ? 340 : 336, ch = phone ? 124 : 104, gx = 16, gap = 16;
    const uses = [
      { t: "read a stream", b: ["monitor personality shifts", "at deployment"], k: "read" },
      { t: "flag training data", b: ["project each sample before", "fine-tuning on it"], k: "read" },
      { t: "steer at inference", b: ["subtract it: the trait fades,", "at some cost to capabilities"], k: "write" },
      { t: "steer while fine-tuning", b: ["add it during training: limits", "the drift, keeps capabilities"], k: "train" },
    ];
    g.append("text").attr("class", "m-panel-t").attr("x", gx).attr("y", 40).text("one persona vector, four jobs (Chen et al., 2025)");
    uses.forEach((u, i) => {
      const x = gx + (i % 2) * (cw + gap), y = 58 + Math.floor(i / 2) * (ch + 12);
      const c = g.append("g").attr("class", `q-card m-use ${u.k}`);
      c.append("rect").attr("x", x).attr("y", y).attr("width", cw).attr("height", ch).attr("rx", 7).attr("filter", ctx.cardFilter);
      if (u.k === "read") probeGlyph(c, x + 26, y + 28, 0.8, "q-lvl");
      else {
        if (u.k === "train") c.append("rect").attr("class", "m-trainband").attr("x", x + 8).attr("y", y + 17).attr("width", 38).attr("height", 22).attr("rx", 4);
        c.append("line").attr("class", "m-write").attr("x1", x + 13).attr("x2", x + 40).attr("y1", y + 28).attr("y2", y + 28).attr("marker-end", ctx.arrow("violet"));
      }
      c.append("text").attr("class", "q-card-title").attr("x", x + 56).attr("y", y + 34).text(u.t);
      ctx.lines(c.append("text").attr("class", "q-card-body").attr("x", x + 16).attr("y", y + (phone ? 70 : 64)), u.b, x + 16, 1.25);
      ctx.fadeIn(c, 300 + i * 400, 400);
    });
    const ry = 58 + 2 * (ch + 12) + 14, rh = phone ? 176 : 164;
    const r = g.append("g").attr("class", "q-card m-refusal");
    r.append("rect").attr("x", gx).attr("y", ry).attr("width", 2 * cw + gap).attr("height", rh).attr("rx", 7).attr("filter", ctx.cardFilter);
    r.append("line").attr("class", "m-write").attr("x1", gx + 13).attr("x2", gx + 40).attr("y1", ry + 28).attr("y2", ry + 28).attr("marker-end", ctx.arrow("violet"));
    r.append("text").attr("class", "q-card-title").attr("x", gx + 56).attr("y", ry + 34).text("the refusal direction (Arditi et al., 2024)");
    ctx.lines(r.append("text").attr("class", "q-card-body").attr("x", gx + 16).attr("y", ry + (phone ? 70 : 64)),
      phone ? ["one difference of means, in 13 chat models up to 72B", "erase it: Llama-3 8B Instruct's refusal 0.95 → 0.01", "add it: it refuses harmless requests", "the same edit is a white-box jailbreak"]
        : ["one difference-of-means direction, in 13 open chat models up to 72B parameters", "erase it: Llama-3 8B Instruct's refusal score falls from 0.95 to 0.01", "add it: the model refuses harmless requests", "the same edit is a white-box jailbreak: a handle is dual use"], gx + 16, 1.3);
    ctx.fadeIn(r, 2000, 500);
    return ctx.reduced ? 0 : 2500;
  };
  return { id: "handle", draw };
}

// ---------------------------------------------------------------------------------------------------------------------
// Contested: the highest misaligned-action rate each steering vector reached, as its source reports it. Two panels,
// two models and two scenarios, on one 0–100% scale. The control that settles most of it is held back until the check.
export function contestedView({ held }) {
  const A = [["unsteered", 0, ""], ["awareness vectors inhibited", 0.09, "up to 8–9% (most 1–5% or 0)"], ["10 random SAE vectors, same norm", 0, "0%"]];
  const B = [["“fiction vs real” (Anthropic's)", 0.6, "up to 60%"], ["Hua et al.'s pairs", 0.4, "about 40%"], ["two other awareness pairs", 0, "no rise above baseline"],
    ["a control: book on top / bottom shelf", 0.8, "up to 80%"]];
  const draw = (g, ctx) => {
    const { phone } = ctx;
    const x0 = 16, bx = phone ? 16 : 360, bmax = phone ? 560 : 320, rowH = phone ? 58 : 36;
    const panel = (title, sub, rows, y0, tag, delay) => {
      const p = g.append("g").attr("class", "m-cpanel");
      p.append("text").attr("class", "m-panel-t").attr("x", x0).attr("y", y0).text(title);
      p.append("text").attr("class", "m-panel-sub").attr("x", x0).attr("y", y0 + (phone ? 28 : 24)).text(sub);
      rows.forEach(([t, v, lab], i) => {
        const y = y0 + (phone ? 44 : 38) + i * rowH;
        const isHeld = held && tag === "B" && i === 3;
        p.append("text").attr("class", "m-row-t").attr("x", x0).attr("y", y + (phone ? 20 : 19)).text(t);
        const yb = phone ? y + 28 : y + 4;
        p.append("rect").attr("class", `m-crate${tag === "B" && i === 3 ? " control" : ""}${isHeld ? " held" : ""}`).attr("x", bx).attr("y", yb).attr("height", phone ? 20 : 22)
          .attr("width", 0).transition().delay(ctx.at(delay + i * 300)).duration(ctx.dur(500)).attr("width", isHeld ? 0 : Math.max(2, v * bmax));
        p.append("text").attr("class", "m-rate-v small").attr("x", bx + (isHeld ? 0 : Math.max(2, v * bmax)) + 10).attr("y", yb + 17).text(isHeld ? "?" : lab);
      });
      ctx.fadeIn(p, delay, 400);
      return y0 + (phone ? 44 : 38) + rows.length * rowH;
    };
    const yA = panel("Claude Sonnet 4.5 · Anthropic's system card", "synthetic scenarios · misaligned actions", A, 36, "A", 200);
    // Claude Sonnet 4's unsteered rate, as a dashed reference on panel A
    const ref = g.append("g").attr("class", "m-ref");
    const xr = bx + 0.11 * bmax;
    ref.append("line").attr("x1", xr).attr("x2", xr).attr("y1", 62).attr("y2", yA - 6);
    ref.append("text").attr("x", xr + 6).attr("y", yA + 12).text("Claude Sonnet 4, unsteered: ≈ 11%");
    ctx.fadeIn(ref, 1300, 400);
    const yB0 = yA + (phone ? 44 : 40);
    const yB = panel("GLM-5 · Read, Schoen, Aranguri and Bloom (2026)", phone ? "one blackmail scenario · highest rate reached" : "one blackmail scenario · misaligned actions, the highest rate reached", B, yB0, "B", 1700);
    // the shared scale
    const ax = g.append("g").attr("class", "d-axis");
    [0, 0.25, 0.5, 0.75, 1].forEach((v) => { ax.append("line").attr("x1", bx + v * bmax).attr("x2", bx + v * bmax).attr("y1", yB + 4).attr("y2", yB + 11);
      ax.append("text").attr("x", bx + v * bmax).attr("y", yB + 32).attr("text-anchor", "middle").text(`${Math.round(v * 100)}%`); });
    ctx.fadeIn(ax, 1700, 400);
    return ctx.reduced ? 0 : 3200;
  };
  const update = (g, ctx) => {
    if (held) return 0;
    const bar = g.select(".m-crate.held");
    if (bar.empty()) return 0;
    const bmax = ctx.phone ? 560 : 320, bx = ctx.phone ? 16 : 360;
    bar.classed("held", false).transition().duration(ctx.dur(600)).attr("width", 0.8 * bmax);
    g.selectAll(".m-rate-v").filter(function () { return this.textContent === "?"; }).text("up to 80%").transition().duration(ctx.dur(600)).attr("x", bx + 0.8 * bmax + 10);
    return 600;
  };
  return { id: "contested", draw, update };
}

// ---------------------------------------------------------------------------------------------------------------------
// The six questions, all answered (limits) or as a checklist to carry to any probe (check yourself).
export function sixView({ answers, mode }) {
  const Q = ["representation or probe?", "concept or dataset?", "activations or text?", "read or used?", "at deployment?", "under pressure?"];
  const draw = (g, ctx) => {
    const { phone } = ctx;
    g.append("text").attr("class", "m-panel-t").attr("x", 16).attr("y", 40).text(mode === "limits" ? "What accuracy doesn't tell you, answered" : "Six questions to ask of any probe");
    const rh = phone ? 88 : 84;
    Q.forEach((q, i) => {
      const y = 62 + i * rh, c = g.append("g").attr("class", "m-six");
      c.append("circle").attr("class", "m-six-dot").attr("cx", 30).attr("cy", y + 18).attr("r", 12);
      c.append("text").attr("class", "m-six-n").attr("x", 30).attr("y", y + 24).attr("text-anchor", "middle").text(i + 1);
      c.append("text").attr("class", "q-card-title").attr("x", 56).attr("y", y + 25).text(q);
      ctx.lines(c.append("text").attr("class", "q-card-body").attr("x", 56).attr("y", y + (phone ? 54 : 50)), answers[i], 56, 1.2);
      ctx.fadeIn(c, 200 + i * 250, 400);
    });
    return ctx.reduced ? 0 : 200 + 6 * 250 + 400;
  };
  return { id: `six-${mode}`, draw };
}
