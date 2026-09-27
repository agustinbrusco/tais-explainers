// What a Probe Reads: the style frame (7 steps of the core sequence). Every number on the page is computed here from
// build/data/probes.json (data/export.py), from the same coordinates the figure draws; prose numbers are filled from
// the same table. render(i) is a pure function of the step index and the controls' state.
import * as d3 from "d3";
import { mountSteps } from "../../../kit/web/steps.js";
import { Figure, LAYOUT } from "./figure.js";
import { dot, orthTo, unit, scores, accuracy, auroc, deg, fmt } from "./lin.js";
import { startHero } from "./hero.js";

const DATA = await fetch(new URL("../build/data/probes.json", import.meta.url)).then((r) => r.json());
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const narrow = matchMedia("(max-width: 860px)").matches;
const layout = narrow ? LAYOUT.phone : LAYOUT.desktop;
const fig = new Figure(document.getElementById("fig"), layout,
  { tip: document.getElementById("tip"), readouts: document.getElementById("readouts"), reduced });

const Ls = (l) => DATA.layers[String(l)];
const N_ALL = DATA.label.aff.length;
const IDX = narrow ? DATA.show : d3.range(N_ALL);               // phones draw a lighter subset
const K = DATA.krasnodar;
const lab = DATA.label, txt = DATA.text;

// ---- numbers: computed from the coordinates the figure draws ----
function evalProbe(l, probeName, set, probe = Ls(l).probes[probeName]) {
  const rows = Ls(l).coords[set], y = lab[set];
  const s = scores(rows, probe);
  const a = accuracy(s, y);
  return { ...a, auroc: auroc(s, y), calledFalse: s.filter((v) => v <= 0).length / s.length, s };
}
const cosOf = (l, a, b) => dot(Ls(l).probes[a].coef, Ls(l).probes[b].coef);
const E = {};
for (const l of [8, 12, 16]) {
  E[l] = {};
  for (const p of ["w", "dmu", "w2", "tG"]) {
    E[l][p] = {};
    for (const set of ["aff", "neg", "sp", "negsp"]) E[l][p][set] = evalProbe(l, p, set);
  }
}
const path = Ls(12).regpath;
const pathEval = path.map((q) => ({ ...q, ev: evalProbe(12, null, "aff", q), angle: deg(dot(q.coef, Ls(12).probes.dmu.coef)) }));
const sameSide = (() => {
  const a = E[12].w.aff.s, b = E[12].w.neg.s;
  return a.filter((v, i) => (v > 0) === (b[i] > 0)).length / a.length;
})();
const F = DATA.fit16;
const NUM = {
  aff12: fmt.pct1(E[12].w.aff.acc), aff12_count: `${E[12].w.aff.right}`,
  coin_held: fmt.pct1(F.coin.acc.held), coin_score: fmt.int(F.coin.held_score_median),
  coin_dist: fmt.f2(F.coin.held_dist_median), real_dist: F.real.held_dist_median.toFixed(1),
  coin_norm: fmt.int(F.coin.norm), real_norm: F.real.norm.toFixed(1),
  real_train: fmt.pct0(F.real.acc.train), real_held: fmt.pct1(F.real.acc.held),
  dmu12: fmt.pct1(E[12].dmu.aff.acc), angle12: fmt.deg(deg(cosOf(12, "w", "dmu"))),
  path_min: fmt.pct1(d3.min(pathEval, (q) => q.ev.acc)), path_max: fmt.pct1(d3.max(pathEval, (q) => q.ev.acc)),
  path_angle: fmt.deg(d3.max(pathEval, (q) => q.angle)),
  same_side: fmt.pct1(sameSide), neg12_wrong: fmt.pct1(1 - E[12].w.neg.acc), neg12_auroc: fmt.f3(E[12].w.neg.auroc),
  neg8_auroc: fmt.f2(E[8].w.neg.auroc), neg16_auroc: fmt.f2(E[16].w.neg.auroc),
  dmu_neg12: fmt.pct1(E[12].dmu.neg.acc), dmu_neg12_auroc: fmt.f2(E[12].dmu.neg.auroc),
  turn12: fmt.deg(deg(cosOf(12, "w", "w2"))), w2aff12: fmt.pct1(E[12].w2.aff.acc),
  w2sp12: fmt.pct1(E[12].w2.sp.acc), w2negsp12: fmt.pct1(E[12].w2.negsp.acc),
  w2sp12_auroc: fmt.f2(E[12].w2.sp.auroc), w2negsp12_auroc: fmt.f2(E[12].w2.negsp.auroc),
  w2sp16: fmt.pct1(E[16].w2.sp.acc), w2negsp16: fmt.pct1(E[16].w2.negsp.acc),
  wsp16: fmt.pct1(E[16].w.sp.acc), wnegsp16: fmt.pct1(E[16].w.negsp.acc),
  tg_aff16: fmt.pct1(E[16].tG.aff.acc), tg_neg16: fmt.pct1(E[16].tG.neg.acc),
  w_tp16: fmt.f2(cosOf(16, "w", "tP")), w_tg16: fmt.f2(cosOf(16, "w", "tG")), w2_tp16: fmt.f2(Math.abs(cosOf(16, "w2", "tP"))),
  tg_tp16: fmt.f2(cosOf(16, "tG", "tP")),
};
window.probesNumbers = { NUM, E, pathEval, sameSide };      // for tests
window.probesFig = fig;

// ---- views ----
const ui = { fit: { labels: "coin", show: "held" }, reg: 8, flip: { layer: "12" }, fix: { layer: "12", set: "cities" }, gp: { layer: "16" } };
const guesses = {};
const probeOf = (l, name) => ({ ...Ls(l).probes[name], kind: Ls(l).probes[name].norm ? "lr" : "dim" });

function pointsFor(l, set, keyPrefix, shape) {
  const C = Ls(l).coords[set];
  const idx = set === "sp" || set === "negsp" ? (narrow ? d3.range(0, C.length, 3) : d3.range(C.length)) : IDX;
  return idx.map((i) => ({ key: `${l}:${keyPrefix}${i}`, c: C[i], truth: lab[set][i], shape, text: txt[set][i], set, i }));
}

/** Glass scale: fit rows into the glass in this frame (equal aspect or stretched), optionally centred on a point. */
function scaleFor(frame, rows, { aspect = "fit", centre = null, probe = null, k = null } = {}) {
  const view = { frame, aspect, probe };
  if (centre) view.centreX = dot(centre, frame.u);
  const sc = fig.fitScale(view, rows);
  if (centre) sc.cy = dot(centre, frame.v);
  if (k) { sc.kx = k.kx; sc.ky = k.ky; }
  return sc;
}
/** Paper scale that puts each dot straight below its point (the probe lies along the frame's u). */
function matched(sc, probe, units = false) {
  const [GX] = fig.glassCenter();
  const n = units ? 1 : (probe.norm ?? 1);
  return { k: sc.kx / n, x0: GX + (probe.thr - sc.cx) * sc.kx, matched: true };
}
/** Paper scale of its own (true-proportion views squeeze projections): fits the scores' 99.5% range. */
function fitPaper(rowsList, probe, units = false, extra = 1.08) {
  const n = units ? 1 : (probe.norm ?? 1);
  const s = rowsList.map((c) => Math.abs(n * (dot(c, probe.coef) - probe.thr))).sort(d3.ascending);
  return paperRange(d3.quantile(s, 0.995) * extra);
}
function paperRange(R) {
  const G = layout.glass;
  return { k: (G.x1 - G.x0 - 60) / (2 * R), x0: (G.x0 + G.x1) / 2 };
}
const AX_FLIP = { x: "onto ŵ →", y: "largest remaining variance ↑" };
const LG = {
  tf: [{ glyph: "true", text: "true" }, { glyph: "false", text: "false" }],
  lvl: { glyph: "lvl", text: "level sets, 1 logit apart" },
};

const RO = (big, label, cls = "gold") => `<div class="ro"><b class="big ${cls}">${big}</b><span>${label}</span></div>`;
const ARROW = `<div class="ro-arrow" aria-hidden="true">→</div>`;

function flipFrame(l) {
  const u = unit(Ls(l).probes.w.coef);
  return { u, v: orthTo(Ls(l).probes.v.coef, u) };
}
function flipScale(l) {
  const fr = flipFrame(l), p = probeOf(l, "w");
  const rows = [...Ls(l).coords.aff, ...Ls(l).coords.neg];
  return scaleFor(fr, rows, { probe: p });
}

const krasCards = (l, which) => {
  const key = (i) => `${l}:p${i}`;
  if (which === "aff") return [
    { key: key(K.true), text: "Krasnodar is in Russia." },
    { key: key(K.false), text: "Krasnodar is in South Africa." }];
  return [
    { key: key(K.true), text: "…is not in Russia." },
    { key: key(K.false), text: "…is not in South Africa." }];
};

function viewAff(l, extra = {}) {
  const fr = flipFrame(l), p = probeOf(l, "w"), sc = flipScale(l);
  const pts = pointsFor(l, "aff", "p", "c");
  const order = pts.slice().sort((a, b) => dot(a.c, p.coef) - dot(b.c, p.coef)).map((q) => q.key);
  return {
    layer: l, space: `L${l}`, pts, frame: fr, sc, psc: matched(sc, p), probe: p, _order: order,
    paperLabel: "score w·h + b, in logits · one dot per statement",
    axes: AX_FLIP, legend: [...LG.tf, LG.lvl], ...extra,
  };
}

const views = [
  // 0 · a direction and a threshold
  () => {
    const e = E[12].w.aff;
    return {
      ...viewAff(12), choreo: "read", cards: krasCards(12, "aff"),
      fig: "Fig. 1", title: "A logistic-regression probe at layer 12",
      badge: badge("real", "Qwen2.5-1.5B · layer 12 · final token · 748 held-out cities"),
      readouts: RO(fmt.pct1(e.acc), `new statements read correctly · ${e.right} of ${e.n}`) +
        RO(`‖w‖ = ${Ls(12).probes.w.norm.toFixed(2)}`, "logits per unit of h: the level sets' spacing", "ink"),
      six: {},
    };
  },
  // 1 · a perfect fit proves nothing
  () => {
    const f = F[ui.fit.labels], part = ui.fit.show === "train" ? f.train : f.held;
    const real = F.real;
    const pts = part.x.map((x, i) => ({ key: `fit:${ui.fit.labels}:${ui.fit.show}${i}`, c: [x, part.y[i]], truth: part.label[i],
      shape: "c", ring: ui.fit.show === "train", text: part.text[i] }));
    const frame = { u: [1, 0], v: [0, 1] };
    const probe = { coef: [1, 0], thr: f.thr, norm: f.norm, kind: "lr" };
    // one glass scale for both label conditions (the true-label view's), so the coin-flip sliver is seen at true width
    const rowsReal = [...real.train.x.map((x, i) => [x, real.train.y[i]]), ...real.held.x.map((x, i) => [x, real.held.y[i]])];
    const scR = fig.fitScale({ frame, aspect: "fit", probe: { coef: [1, 0], thr: real.thr } }, rowsReal);
    const rowsCur = [...f.train.x.map((x, i) => [x, f.train.y[i]]), ...f.held.x.map((x, i) => [x, f.held.y[i]])];
    const ys = rowsCur.map((r) => r[1]).sort(d3.ascending);
    const sc = { ...scR, cx: f.thr, cy: (d3.quantile(ys, 0.01) + d3.quantile(ys, 0.99)) / 2 };
    const G = layout.glass;
    const psc = { k: (G.x1 - G.x0 - 40) / 2 / 60, x0: (G.x0 + G.x1) / 2 };       // paper: ±60 logits, fixed for both
    const order = pts.slice().sort((a, b) => a.c[0] - b.c[0]).map((q) => q.key);
    const a = f.acc;
    return {
      layer: 16, space: `fit:${ui.fit.labels}`, pts, frame, sc, psc, probe, _order: order, choreo: "read", lattice: frame,
      paperLabel: "score w·h + b, in logits · one scale for both label sets",
      axes: AX_FLIP,
      legend: [{ glyph: "true", text: ui.fit.labels === "coin" ? "heads" : "true" }, { glyph: "false", text: ui.fit.labels === "coin" ? "tails" : "false" },
        ...(ui.fit.show === "train" ? [{ glyph: "ring", text: "fitted to (200 of 300 drawn)" }] : [{ glyph: "lvl", text: "level sets, 1 logit apart" }])],
      fig: "Fig. 2", title: ui.fit.labels === "coin" ? "Fitted to coin-flip labels" : "The same recipe, true labels",
      badge: badge("real", `layer 16 · 300 training statements · C = 10⁴ · labels: ${ui.fit.labels === "coin" ? "coin flips" : "true / false"}`),
      readouts: RO(fmt.pct1(a.train), "training statements", "ink") +
        RO(fmt.pct1(a.held), "new statements", ui.fit.labels === "coin" ? "ink" : "gold") +
        RO(`‖w‖ = ${f.norm < 10 ? f.norm.toFixed(1) : Math.round(f.norm)}`, `new statements: median ${f.held_dist_median} units from the boundary`, "ink"),
      six: { 1: "now" },
    };
  },
  // 2 · two directions that both read truth
  () => regView(ui.reg),
  // 3 · predict: say "not"
  () => ({
    ...viewAff(12), choreo: "move",
    cards: [krasCards(12, "aff")[0], { ...krasCards(12, "aff")[0], id: "pending", text: "…is not in Russia. → ?", x: layout.glass.x0 + 4, anchor: "start", pending: true }],
    fig: "Fig. 4", title: "The layer-12 probe, before “not”",
    badge: badge("real", "layer 12 · trained on “is in” only"),
    readouts: RO(fmt.pct1(E[12].w.aff.acc), "“is in”, new cities") + ARROW + RO("?", "“is not in”, the same cities", "ink"),
    six: { 1: "done" },
  }),
  // 4 · upside down
  () => {
    const l = ui.flip.layer, p = probeOf(l, "w"), sc = flipScale(l), fr = flipFrame(l);
    const pts = pointsFor(l, "neg", "p", "s");
    const e = E[l].w;
    return {
      layer: l, space: `L${l}`, pts, frame: fr, sc, psc: matched(sc, p), probe: p, choreo: "flip", cards: krasCards(l, "neg"),
      paperLabel: "score w·h + b, in logits · one dot per statement", axes: AX_FLIP,
      fig: "Fig. 5", title: `The same probe on “is not in”`,
      badge: badge("real", `layer ${l} · trained on “is in” only · tested on “is not in”`),
      readouts: RO(fmt.pct1(e.aff.acc), "“is in”", "ink") + ARROW + RO(fmt.pct1(e.neg.acc), "“is not in”", "ink") +
        RO(fmt.f3(e.neg.auroc), "AUROC on “is not in”: 0.5 no signal, 0 inverted", "gold"),
      six: { 1: "done", 2: "now" },
    };
  },
  // 5 · retrain on both (final state; the choreography first shows the old probe, then turns)
  () => fixView(ui.fix.layer, ui.fix.set, "B"),
  // 6 · truth has at least two directions
  () => gpView(ui.gp.layer),
];

function regView(ci) {
  const l = 12, q = pathEval[ci];
  const probe = { coef: q.coef, thr: q.thr, norm: q.norm, kind: "lr" };
  const dmu = probeOf(l, "dmu");
  const u = unit(q.coef);
  const vOf = (j) => orthTo(dmu.coef, unit(pathEval[j].coef));
  const v = ci === 0 ? orthTo(vOf(1), u) : vOf(ci);
  const frame = { u, v };
  const means = Ls(l).means;
  const centre = means.aff_true.map((x, i) => (x + means.aff_false[i]) / 2);
  // one scale for the whole path, so the slider only turns the view
  const f8 = { u: unit(pathEval[8].coef), v: vOf(8) };
  const sc8 = scaleFor(f8, Ls(l).coords.aff, { aspect: "equal", centre });
  const sc = { kx: sc8.kx, ky: sc8.ky, cx: dot(centre, u), cy: dot(centre, v) };
  const pts = pointsFor(l, "aff", "p", "c");
  const order = pts.slice().sort((a, b) => dot(a.c, u) - dot(b.c, u)).map((p) => p.key);
  const angle = Math.round(q.angle);
  return {
    layer: l, space: `L${l}`, pts, frame, sc, psc: paperRange(REG_R), probe, paperUnits: true, _order: order,
    choreo: "move", lattice: null,
    ghosts: ci === 0 ? [] : [{ ...dmu, id: "dmu", angle: `${angle}°` }],
    means: [{ c: means.aff_true, label: "μ true", dx: 12, dy: -12 }, { c: means.aff_false, label: "μ false", dx: -12, dy: 26, anchor: "end" }],
    meanSegment: true,
    paperLabel: "projection onto ŵ minus the threshold, in units of h",
    axes: { x: "onto ŵ →", y: "Δμ, the part ⊥ ŵ ↑" },
    legend: [...LG.tf, { glyph: "lvl", text: "logistic regression" }, { glyph: "ghost", text: "Δμ's boundary" }, { glyph: "mean", text: "class means" }],
    fig: "Fig. 3", title: ci === 0 ? "Strong penalty: w points along Δμ" : `Logistic regression, ${angle}° from Δμ`,
    badge: badge("real", `layer 12 · 748 held-out cities · plane of ŵ and Δμ, true angles`),
    readouts: RO(`${angle}°`, "w vs Δμ, in all 1,536 dimensions", "gold") +
      RO(fmt.pct1(q.ev.acc), `w reads new statements · C = ${cLabel(q.C)}`, "ink") +
      RO(fmt.pct1(E[12].dmu.aff.acc), "Δμ, midpoint threshold", "ink"),
    six: { 1: "done" },
  };
}
// one paper range for the whole path, so the slider only turns the view
const REG_R = (() => {
  const G = 1.08;
  const m = d3.max(pathEval, (q) => d3.quantile(Ls(12).coords.aff.map((c) => Math.abs(dot(c, q.coef) - q.thr)).sort(d3.ascending), 0.995));
  return m * G;
})();
const cLabel = (C) => (C >= 1 ? d3.format("~g")(C) : C >= 1e-3 ? d3.format("~g")(C) : `10${sup(Math.round(Math.log10(C)))}`);
const sup = (n) => String(n).split("").map((ch) => "⁰¹²³⁴⁵⁶⁷⁸⁹"["0123456789".indexOf(ch)] ?? (ch === "-" ? "⁻" : ch)).join("");

function fixFrames(l) {
  const w = unit(Ls(l).probes.w.coef), w2 = unit(Ls(l).probes.w2.coef);
  const A = { u: w, v: orthTo(w2, w) };
  const B = { u: w2, v: orthTo(w.map((x) => -x), w2) };
  return { A, B };
}
function fixView(l, set, stage) {
  const { A, B } = fixFrames(l);
  const frame = stage === "A" ? A : B;
  const probe = probeOf(l, stage === "A" ? "w" : "w2");
  const cities = set === "cities";
  const pts = cities ? [...pointsFor(l, "neg", "p", "s"), ...pointsFor(l, "aff", "q", "c")]
    : [...pointsFor(l, "sp", "s", "c"), ...pointsFor(l, "negsp", "z", "s")];
  const rows = [...Ls(l).coords.aff, ...Ls(l).coords.neg];
  const centre = rows[0].map((_, j) => d3.mean(rows, (r) => r[j]));
  const scA = scaleFor(A, rows, { aspect: "equal", centre });
  const sc = stage === "A" ? scA : { kx: scA.kx, ky: scA.ky, cx: dot(centre, B.u), cy: dot(centre, B.v) };
  const e2 = E[l].w2, e1 = E[l].w;
  const turn = Math.round(deg(cosOf(l, "w", "w2")));
  const ro = cities
    ? RO(fmt.pct1(e2.aff.acc), "“is in”", "gold") + RO(fmt.pct1(e2.neg.acc), "“is not in”", "gold") + RO(`${turn}°`, "the turn from the old direction", "ink")
    : RO(fmt.pct1(e2.sp.acc), `Spanish words · AUROC ${e2.sp.auroc.toFixed(2)}`, e2.sp.acc < 0.7 ? "ink" : "gold") +
      RO(fmt.pct1(e2.negsp.acc), `their negations · AUROC ${e2.negsp.auroc.toFixed(2)}`, e2.negsp.acc < 0.7 ? "ink" : "gold") +
      RO(`${fmt.pct1(e1.sp.acc)} · ${fmt.pct1(e1.negsp.acc)}`, "before retraining", "ink");
  return {
    layer: l, space: `L${l}`, pts, frame, lattice: A, sc, psc: fitPaper(rows, probe), probe, choreo: stage === "A" ? "move" : "rotate",
    ghosts: stage === "B" ? [{ ...probeOf(l, "w"), id: "w-old", angle: `${turn}°` }] : [],
    paperLabel: "score w·h + b, in logits",
    axes: stage === "A" ? { x: "onto the old ŵ →", y: "the new ŵ, part ⊥ the old ↑" } : { x: "onto the new ŵ →", y: "" },
    legend: [{ glyph: "true", text: cities ? "“is in”" : "Spanish word" }, { glyph: "sq-true", text: "negated" }, { glyph: "false", text: "hollow = false" },
      ...(stage === "B" ? [{ glyph: "ghost", text: "old boundary" }] : [])],
    fig: "Fig. 6", title: stage === "A" ? "The old probe, in the plane of both" : cities ? "Retrained on both polarities" : "The retrained probe, Spanish words",
    badge: badge("real", `layer ${l} · retrained on “is in” and “is not in” · plane of both probes, true angles`),
    readouts: stage === "A" ? RO(fmt.pct1(e1.neg.acc), "the old probe on “is not in”", "ink") : ro,
    six: { 1: "done", 2: "now" },
  };
}

function gpView(l) {
  const P = Ls(l).probes;
  const u = unit(P.tG.coef), v = orthTo(P.tP.coef, u);
  const frame = { u, v };
  const probe = { ...P.tG, kind: "dim" };
  const pts = [...pointsFor(l, "neg", "p", "s"), ...pointsFor(l, "aff", "q", "c")];
  const rows = [...Ls(l).coords.aff, ...Ls(l).coords.neg];
  const sc = scaleFor(frame, rows, { aspect: "equal", probe });
  const e = E[l].tG;
  return {
    layer: l, space: `L${l}`, pts, frame, sc, psc: fitPaper(rows, probe, true), probe, paperUnits: true, choreo: "move",
    ghosts: [{ ...probeOf(l, "w"), id: "w-aff" }],
    groups: [
      { label: "is in · true", test: (s) => s.shape === "c" && s.fill1 === 1, corner: "tr" },
      { label: "is in · false", test: (s) => s.shape === "c" && s.fill1 === 0, corner: "bl" },
      { label: "is not in · true", test: (s) => s.shape === "s" && s.fill1 === 1, corner: "br" },
      { label: "is not in · false", test: (s) => s.shape === "s" && s.fill1 === 0, corner: "tl" }],
    paperLabel: "projection onto g, minus the threshold, in units of h",
    axes: { x: "g, general truth →", y: "" },
    legend: [{ glyph: "true", text: "“is in”" }, { glyph: "sq-true", text: "“is not in”" }, { glyph: "false", text: "hollow = false" }, { glyph: "ghost", text: "old probe's boundary" }],
    fig: "Fig. 7", title: "General truth and polarity",
    badge: badge("real", `layer ${l} · plane of g and p (p made orthogonal to g) · true proportions`),
    readouts: RO(fmt.pct1(e.aff.acc), "along g: “is in”", "gold") + RO(fmt.pct1(e.neg.acc), "along g: “is not in”", "gold") +
      RO(`${cosOf(l, "w", "tP").toFixed(2)} · ${cosOf(l, "w", "tG").toFixed(2)}`, "the old probe's cosines with p and g", "ink"),
    six: { 1: "done", 2: "done" },
  };
}

function badge(kind, text) {
  const glyph = { real: "glass", schematic: "outline", illustrative: "dotted" }[kind];
  return `<span class="bdg ${glyph}"><i aria-hidden="true"></i>${kind}</span><span class="bdg-text">${text}</span>`;
}

// ---- rendering ----
let token = 0;
const sleep = (ms) => new Promise((res) => d3.timeout(res, reduced ? 0 : ms));
async function render(i, prev) {
  const my = ++token;
  const v = views[i]();
  d3.select("#fig-num").text(v.fig);
  d3.select("#fig-title").text(v.title);
  d3.select("#fig-badge").html(v.badge);
  d3.selectAll("#six li").attr("class", function () { return v.six[this.dataset.q] ?? ""; });
  echoGuesses();
  // multi-stage choreography where one read must land before the next
  if (i === 1 && prev !== 1 && ui.fit.show === "held" && !reduced) {
    const saved = ui.fit.show;
    ui.fit.show = "train";
    const first = views[1]();
    ui.fit.show = saved;
    await fig.show(first);
    if (my !== token) return;
    await sleep(1200);
    if (my !== token) return;
  }
  if (i === 5 && prev !== 5 && ui.fix.set === "cities" && !reduced) {
    await fig.show(fixView(ui.fix.layer, "cities", "A"));
    if (my !== token) return;
    await sleep(700);
    if (my !== token) return;
  }
  if (my !== token) return;
  await fig.show(v);
}

// ---- prose numbers, checks, guesses, ledger ----
document.querySelectorAll("[data-n]").forEach((el) => {
  const v = NUM[el.dataset.n];
  if (v != null) el.textContent = v;
});
// the stretch of Fig. 1, from its own scale
{
  const sc = flipScale(12);
  document.querySelectorAll('[data-n="stretch1"]').forEach((el) => { el.textContent = (sc.kx / sc.ky).toFixed(1); });
}

document.querySelectorAll(".check").forEach((box) => {
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    box.querySelectorAll("button").forEach((o) => o.classList.toggle("on", o === b));
    box.classList.add("answered");
    box.classList.toggle("right", b.hasAttribute("data-correct"));
  });
});

const FEEDBACK = {
  99: `The negated statements' states do carry their truth (a probe retrained on both reads them at ${NUM.w2aff12}, two steps on), but this probe's direction doesn't read it.`,
  75: "Not noise: the errors are systematic, as the ranking shows.",
  50: "That is what layers 8 and 16 score, for a different reason (below).",
  10: `Right: ${fmt.pct1(E[12].w.neg.acc)}.`,
};
document.querySelectorAll(".guess").forEach((box) => {
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    box.querySelectorAll("button").forEach((o) => o.classList.toggle("on", o === b));
    guesses[box.dataset.q] = { a: b.dataset.a, text: b.textContent.trim(), right: b.hasAttribute("data-correct") };
  });
});
function echoGuesses() {
  document.querySelectorAll("[data-echo]").forEach((el) => {
    const g = guesses[el.dataset.echo];
    el.innerHTML = g ? `You said <b>${g.text.split(":")[0]}</b>. ${FEEDBACK[g.a] ?? ""}` : "";
    el.classList.toggle("right", !!g?.right);
  });
}

const LEDGER = {
  1: ["Representation or probe?", "A perfect training fit is guaranteed in high dimensions. Held-out accuracy and controls are what separate a representation from a probe that memorized."],
  2: ["Concept or dataset?", "This probe read a quirk of its training data: city–country match. Test on shifted data, and read the ranking (AUROC), not only accuracy."],
};
document.querySelectorAll(".ledger").forEach((el) => {
  const [q, a] = LEDGER[el.dataset.qn];
  el.innerHTML = `<span class="ledger-k">Question ${el.dataset.qn} of 6 · answered</span><b>${q}</b><span>${a}</span>`;
});
d3.selectAll("#six li").attr("title", function () { const L_ = LEDGER[this.dataset.q]; return L_ ? `${L_[0]} ${L_[1]}` : "answered later in the piece"; });

// ---- controls ----
document.querySelectorAll(".toggles").forEach((box) => {
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    ui[box.dataset.for][b.dataset.k] = b.dataset.v;
    box.querySelectorAll(`button[data-k="${b.dataset.k}"]`).forEach((o) => o.classList.toggle("on", o === b));
    const i = window.explainer.current;
    token++;
    fig.show({ ...views[i](), choreo: box.dataset.for === "flip" || box.dataset.k === "layer" ? "move" : box.dataset.for === "fit" ? "read" : "move" });
    const v = views[i]();
    d3.select("#fig-title").text(v.title);
    d3.select("#fig-badge").html(v.badge);
  });
});
const reg = document.getElementById("reg-c");
const regOut = document.getElementById("reg-out");
const showReg = () => {
  const q = pathEval[ui.reg];
  regOut.innerHTML = `C = ${cLabel(q.C)} · <b>${Math.round(q.angle)}°</b> from Δμ · <b>${fmt.pct1(q.ev.acc)}</b>`;
};
reg.addEventListener("input", () => {
  ui.reg = Number(reg.value);
  showReg();
  if (window.explainer.current !== 2) return;
  token++;
  const v = views[2]();
  d3.select("#fig-title").text(v.title);
  fig.show({ ...v, choreo: "move" });
});
showReg();

// ---- side dish: Cover's function-counting curve, for d = 5, 50 and 1,536 ----
(function coverCurve() {
  const s = d3.select("#sd-cover");
  const w = 440, h = 210, m = { l: 46, r: 16, t: 14, b: 44 };
  const xa = d3.scaleLinear().domain([0, 4]).range([m.l, w - m.r]);
  const ya = d3.scaleLinear().domain([0, 1]).range([h - m.b, m.t]);
  const lf = new Float64Array(4 * 1536 + 2);
  for (let n = 2; n < lf.length; n++) lf[n] = lf[n - 1] + Math.log(n);
  // share of the 2^n labellings of n points in general position that a hyperplane through the origin of R^d realizes:
  // C(n, d) / 2^n = P(Binomial(n-1, 1/2) <= d-1)  (Cover 1965)
  const share = (n, d) => {
    if (n <= d) return 1;
    let acc = 0;
    for (let k = 0; k <= d - 1; k++) acc += Math.exp(lf[n - 1] - lf[k] - lf[n - 1 - k] - (n - 1) * Math.LN2);
    return Math.min(1, acc);
  };
  s.append("line").attr("class", "half").attr("x1", xa(0)).attr("x2", xa(4)).attr("y1", ya(0.5)).attr("y2", ya(0.5));
  s.append("line").attr("class", "half").attr("x1", xa(2)).attr("x2", xa(2)).attr("y1", ya(0)).attr("y2", ya(1));
  for (const [d, op, at, dy] of [[5, 0.4, 3.05, -8], [50, 0.65, 2.35, -10], [1536, 1, 1.62, 16]]) {
    const pts = d3.range(0.02, 4.0001, d > 500 ? 0.01 : 0.02).map((a) => [a, share(Math.max(1, Math.round(a * d)), d)]);
    s.append("path").attr("class", "curve").attr("opacity", op).attr("d", d3.line().x((p) => xa(p[0])).y((p) => ya(p[1]))(pts));
    s.append("text").attr("class", "note").attr("x", xa(at)).attr("y", ya(share(Math.max(1, Math.round(at * d)), d)) + dy)
      .attr("text-anchor", "end").text(d === 1536 ? "d = 1,536" : `d = ${d}`);
  }
  s.append("g").attr("class", "axis").attr("transform", `translate(0,${h - m.b})`).call(d3.axisBottom(xa).ticks(4).tickFormat((v) => `${v}`));
  s.append("g").attr("class", "axis").attr("transform", `translate(${m.l},0)`).call(d3.axisLeft(ya).ticks(2).tickFormat(d3.format(".0%")));
  s.append("text").attr("class", "note").attr("x", (m.l + w - m.r) / 2).attr("y", h - 6).attr("text-anchor", "middle").text("points per dimension, n / d");
  s.append("text").attr("class", "note").attr("transform", `translate(12,${(m.t + h - m.b) / 2}) rotate(-90)`).attr("text-anchor", "middle").text("labellings it can split");
  s.append("line").attr("class", "mark").attr("x1", xa(300 / 1536)).attr("x2", xa(300 / 1536)).attr("y1", ya(0)).attr("y2", ya(1));
  s.append("text").attr("class", "mark-label").attr("x", xa(300 / 1536) + 6).attr("y", ya(0.62)).text("our 300");
})();

startHero(document.getElementById("hero-svg"), DATA, { reduced, narrow });
mountSteps({ render });
