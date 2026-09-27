// What a Probe Reads (work in progress: chapters I–III). Every number on the page is computed here from
// web/data/probes.json (data/export.py), from the same coordinates the figure draws; prose numbers are filled from the
// same table. render(i) is a pure function of the step index and the controls' state (including which quick checks
// have been answered: a check holds back the readout it asks about).
import * as d3 from "d3";
import { mountSteps } from "../../../kit/web/steps.js";
import { Figure, LAYOUT } from "./figure.js";
import { dot, orthTo, unit, scores, accuracy, auroc, deg, fmt } from "./lin.js";
import { startHero } from "./hero.js";
import { Pipeline } from "./pipeline.js";
import { Paper } from "./paper.js";
import * as D from "./diagrams.js";
import * as M4 from "./monitor.js";

const [DATA, FIND, PUSH, MON] = await Promise.all(["./data/probes.json", "./data/find.json", "./data/push.json", "./data/monitor.json"]
  .map((u) => fetch(new URL(u, import.meta.url)).then((r) => r.json())));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const narrow = matchMedia("(max-width: 860px)").matches;
const layout = narrow ? LAYOUT.phone : LAYOUT.desktop;
const fig = new Figure(document.getElementById("fig"), layout,
  { tip: document.getElementById("tip"), readouts: document.getElementById("readouts"), reduced });
// the second scene in the same SVG: a statement becomes a data point, and which token a probe reads
const pipe = new Pipeline(document.getElementById("fig"), layout, { reduced, tip: document.getElementById("tip") });
// the third: paper diagrams (readers in production, why linear, boards, cascades)
const paper = new Paper(document.getElementById("fig"), layout, { reduced, tip: document.getElementById("tip") });

const Ls = (l) => DATA.layers[String(l)];
const N_ALL = DATA.label.aff.length;
const IDX = narrow ? DATA.show : d3.range(N_ALL);               // phones draw a lighter subset
const K = DATA.krasnodar;
const lab = DATA.label, txt = DATA.text;
const TR = FIND.trainer, CV = FIND.curve;           // chapter II: the nested draw's fits and the learning curve

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
  w2sp12: fmt.pct1(E[12].w2.sp.acc), w2neg12: fmt.pct1(E[12].w2.neg.acc), neg8_acc: fmt.pct1(E[8].w.neg.acc),
  w2sp16_auroc: fmt.f2(E[16].w2.sp.auroc), w2negsp16_auroc: fmt.f2(E[16].w2.negsp.auroc), w2negsp12: fmt.pct1(E[12].w2.negsp.acc),
  w2sp12_auroc: fmt.f2(E[12].w2.sp.auroc), w2negsp12_auroc: fmt.f2(E[12].w2.negsp.auroc),
  w2sp16: fmt.pct1(E[16].w2.sp.acc), w2negsp16: fmt.pct1(E[16].w2.negsp.acc),
  wsp16: fmt.pct1(E[16].w.sp.acc), wnegsp16: fmt.pct1(E[16].w.negsp.acc),
  tg_aff16: fmt.pct1(E[16].tG.aff.acc), tg_neg16: fmt.pct1(E[16].tG.neg.acc),
  w_tp16: fmt.f2(cosOf(16, "w", "tP")), w_tg16: fmt.f2(cosOf(16, "w", "tG")), w2_tp16: fmt.f2(Math.abs(cosOf(16, "w2", "tP"))),
  tg_tp16: fmt.f2(cosOf(16, "tG", "tP")),
};
// the two pipeline steps: a statement becomes a data point; which token a probe reads
{
  const PL = DATA.pipeline, PA = PL.acc[String(PL.layer)];
  Object.assign(NUM, {
    n_tokens: `${PL.tokens.true.length}`, n_train: PL.n_train.toLocaleString("en-US"),
    false_country: DATA.text.aff[K.false].match(/is in (.+)\.$/)[1],
    n_cities: DATA.meta.n.cities.toLocaleString("en-US"), n_countries: `${DATA.meta.n.countries}`,
    n_test: N_ALL.toLocaleString("en-US"), n_test_minus1: (N_ALL - 1).toLocaleString("en-US"),
    every_max_own: fmt.pct1(PA.every_max_own),
    ...(() => {             // the running example's highest-scoring token before the country (the false statement)
      const s = PL.scores[String(PL.layer)].false.every, n = s.length - 2;
      const j = d3.maxIndex(s.slice(0, n));
      return { max_tok: PL.tokens.false[j].trim(), max_tok_score: s[j].toFixed(1) };
    })(),
    at_in: fmt.pct1(PA.at_in), every_mean: fmt.pct1(PA.every_mean), every_max: fmt.pct1(PA.every_max), final_pos: fmt.pct1(PA.final),
  });
}
Object.assign(NUM, Object.fromEntries([2, 4, 6, 8, 10, 11, 28].map((L) => [`acc_l${L}`, fmt.pct1(DATA.by_layer[L].acc)])));
{
  const PL = DATA.pipeline, PA = PL.acc[String(PL.layer)], BP = PL.by_position, MM = PL.max_miss;
  const n12 = E[12].w.neg, yn = lab.neg;
  const side = (truth, readTrue) => n12.s.filter((v, i) => yn[i] === truth && (v > 0) === readTrue).length;
  const cap = (x) => x.toLocaleString("en-US");
  Object.assign(NUM, {
    n_train_cities: cap(DATA.meta.n.cities / 2), aff12_count: cap(E[12].w.aff.right),
    pos_country_first: fmt.pct1(BP.country_first), pos_country: fmt.pct1(BP.country_last), pos_period: fmt.pct1(BP.period),
    mean_state: fmt.pct1(PA.mean), first_ratio: `${Math.round(PL.first_token_norm_ratio / 10) * 10}`,
    first_score: cap(Math.round(PL.scores[String(PL.layer)].true.final[0])).replace("-", "−"),
    stripes_corr: PL.x_stripes.true_false_mean_corr.toFixed(2),
    max_miss_n: `${MM.n_missed_false}`, max_miss_of: `${MM.n_false_test}`, max_miss_text: MM.text,
    max_miss_tok: MM.tokens[d3.maxIndex(MM.scores.slice(0, -2))].trim(),
    // the flip, by class and side of the boundary
    negT_false: `${side(1, false)}`, negF_false: `${side(0, false)}`, neg_class: `${yn.filter((v) => v === 1).length}`,
    neg_called_false: fmt.pct1(E[12].w.neg.calledFalse), neg12_acc: fmt.pct1(E[12].w.neg.acc),
    dmu_neg12_false: fmt.pct1(E[12].dmu.neg.calledFalse),
    wsp16_auroc: fmt.f2(E[16].w.sp.auroc),
    g_len16: Ls(16).norm.tG.toFixed(1), p_len16: Ls(16).norm.tP.toFixed(1),
    coin_margin: F.coin.margin.toFixed(2), real_margin: F.real.margin.toFixed(2),
  });
}
{
  const c16 = FIND.curve["16"], c12 = FIND.curve["12"], at = (c, n) => c.lr[c.n.indexOf(n)].mean;
  const first95 = (c) => c.n[c.lr.findIndex((r) => r.mean >= 0.95)];
  const f4 = TR.fits[TR.fits.findIndex((f) => f.n === 4)], f512 = TR.fits[TR.fits.findIndex((f) => f.n === 512)];
  const NM = FIND.norm["12"];
  Object.assign(NUM, {
    c16_2: fmt.pct0(at(c16, 2)), c16_4: fmt.pct0(at(c16, 4)), c16_8: fmt.pct0(at(c16, 8)), c16_100: fmt.pct0(at(c16, 128)),
    c16_all: fmt.pct1(at(c16, c16.n[c16.n.length - 1])), c16_dmu8: fmt.pct0(c16.dmu[c16.n.indexOf(8)].mean),
    c16_first95: `${first95(c16)}`, c12_first95: `${first95(c12)}`, c12_8: fmt.pct0(at(c12, 8)),
    tr4_acc: fmt.pct1(f4.acc), tr4_ang: fmt.deg(trAngle(f4)), tr512_ang: fmt.deg(trAngle(f512)),
    // how much the direction depends on the draw (20 independent draws), and each fit against its own draw's Δμ
    draw4_ang: fmt.deg(c16.draw_ang[c16.n.indexOf(4)]), draw512_ang: fmt.deg(c16.draw_ang[c16.n.indexOf(512)]),
    own4: c16.dmu_cos[c16.n.indexOf(4)].toFixed(2), own512: c16.dmu_cos[c16.n.indexOf(512)].toFixed(2),
    len_cv12: fmt.pct1(NM.len_cv), len_min12: `${Math.round(NM.len_min)}`, len_max12: `${Math.round(NM.len_max)}`,
    acc_normed12: fmt.pct1(NM.acc_normed), ang_normed12: fmt.deg(deg(NM.cos_raw_normed)),
    ...(FIND.pca ? { pc_cos16: FIND.pca["16"].cos.toFixed(2), pc_var16: fmt.pct0(FIND.pca["16"].var_share) } : {}),
    ...(FIND.lengths ? { len1: `${Math.round(FIND.lengths[1])}`, len27: `${Math.round(FIND.lengths[27])}`, len28: `${Math.round(FIND.lengths[28])}` } : {}),
  });
}
{
  const P8 = FIND.pairs["8"], P12 = FIND.pairs["12"], P16 = FIND.pairs["16"];
  Object.assign(NUM, {
    pair_cos8: P8.cos_mean.toFixed(2), pair_cos12: P12.cos_mean.toFixed(2), pair_cos16: P16.cos_mean.toFixed(2),
    pair_sd: P12.random_sd.toFixed(2), pair_pos12: fmt.pct1(P12.frac_pos), pair_meandiff12: P12.cos_mean_diff_dmu.toFixed(3),
    pca_cos12: P12.pca_cos_dmu.toFixed(3), pca_acc12: fmt.pct1(P12.pca_acc), pca_acc8: fmt.pct1(P8.pca_acc), pca_acc16: fmt.pct1(P16.pca_acc),
    pca_cos8: P8.pca_cos_dmu.toFixed(2), pca_sign12: fmt.pct1(P12.pca_sign),
    text_lr: fmt.pct1(FIND.text_baseline.char_lr), text_mlp: fmt.pct0(FIND.text_baseline.char_mlp),
  });
}
{
  const nie = PUSH.nie.cities, j1 = PUSH.meta.alphas.indexOf(1), c = PUSH.geometry.cos_w_dmu;
  Object.assign(NUM, {
    w16: fmt.pct1(E[16].w.aff.acc), dmu16: fmt.pct1(E[16].dmu.aff.acc), angle16: fmt.deg(deg(c)), cos16: c.toFixed(2),
    cos2_16: fmt.pct0(c * c), push_n: `${2 * PUSH.meta.n_each}`,
    nie_mm: fmt.pct0(nie.mm.f2t[j1]), nie_lr: fmt.pct0(nie.lr.f2t[j1]),
    nie_mm_t2f: fmt.pct0(nie.mm.t2f[j1]), nie_lr_t2f: fmt.pct0(nie.lr.t2f[j1]),
    country_baseline: fmt.pct1(DATA.meta.country_baseline),
    nie_mm_q: fmt.pct0(nie.mm.f2t[PUSH.meta.alphas.indexOf(0.25)]),
    model_acc: fmt.pct1(PUSH.pd.cities.acc),
    // out of distribution, as in Marks and Tegmark's table: Spanish-English statements
    nie_sp_mm: fmt.pct0(PUSH.nie.sp.mm.f2t[j1]), nie_sp_lr: fmt.pct0(PUSH.nie.sp.lr.f2t[j1]),
    ...(PUSH.nie.sp.mm_matched ? { m_sp_f2t1: fmt.pct0(PUSH.nie.sp.mm_matched.f2t[j1]) } : {}),
    // the difference-of-means push as long along Δμ as the w push (alpha * cos²)
    ...(nie.mm_matched ? (() => {
      const M = nie.mm_matched, at = (k, a) => M[k][PUSH.meta.alphas.indexOf(a)];
      return { m_f2t1: fmt.pct0(at("f2t", 1)), m_t2f1: fmt.pct0(at("t2f", 1)), m_f2t2: fmt.pct0(at("f2t", 2)), m_t2f2: fmt.pct0(at("t2f", 2)),
        lr_f2t2: fmt.pct0(nie.lr.f2t[PUSH.meta.alphas.indexOf(2)]), lr_t2f2: fmt.pct0(nie.lr.t2f[PUSH.meta.alphas.indexOf(2)]) };
    })() : {}),
  });
}
Object.assign(NUM, { fa_day: Math.round(1e6 * M4.shareAbove(M4.drawnSamples(MON.chat), MON.meta.tick)).toLocaleString("en-US") });
window.probesNumbers = { NUM, E, pathEval, sameSide };      // for tests
window.probesSteps = () => ORDER;
window.probesFig = fig;

// ---- views ----
const ui = { push: { dir: "mm", which: "false", alpha: 1 }, oth: { labels: "my", angle: 0 }, pairs: { layer: "12" }, curve: 2, linear: { kind: "linear" }, collect: { which: "true" }, pos: { at: "period" }, pool: { how: "mean", which: "kras" }, layer: 12, fit: { labels: "coin", show: "held" }, reg: 8, flip: { layer: "12" },
  fix: { layer: "12", set: "cities" }, gp: { layer: "16" }, job: { job: "monitor" }, dial: { probe: "A", traffic: "it" }, tick: 50, base: 2, leak: { scored: "all" }, drift: { which: "moves" } };
const guesses = {};
const revealed = {};                 // quick checks answered: their readouts are no longer held back
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
const AX_FLIP = { x: "onto ŵ →", y: "largest remaining variance ↑" };
const LG = {
  tf: [{ glyph: "true", text: "true" }, { glyph: "false", text: "false" }],
  lvl: { glyph: "lvl", text: "level sets, {step} apart" },
};

const PAPER = (dir = "ŵ") => `distance from the boundary along ${dir}, in units of h`;
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
  // the running example's two statements, as the data names them ("The city of " dropped for space)
  const key = (i) => `${l}:p${i}`;
  const short = (t) => t.replace(/^The city of /, "");
  if (which === "aff") return [
    { key: key(K.true), text: short(txt.aff[K.true]) },
    { key: key(K.false), text: short(txt.aff[K.false]) }];
  return [
    { key: key(K.true), text: `…${short(txt.neg[K.true]).replace(/^Krasnodar /, "")}` },
    { key: key(K.false), text: `…${short(txt.neg[K.false]).replace(/^Krasnodar /, "")}` }];
};

function viewAff(l, extra = {}) {
  const fr = flipFrame(l), p = probeOf(l, "w"), sc = flipScale(l);
  const pts = pointsFor(l, "aff", "p", "c");
  const order = pts.slice().sort((a, b) => dot(a.c, p.coef) - dot(b.c, p.coef)).map((q) => q.key);
  return {
    layer: l, space: `L${l}`, pts, frame: fr, sc, probe: p, _order: order,
    paperLabel: PAPER(),
    axes: AX_FLIP, legend: [...LG.tf], ...extra,
  };
}

const V = {
  // prologue: readers in production
  prologue: () => ({
    scene: "paper", title: "Readers of hidden states, in production",
    badge: badge("schematic", "the flow is a sketch · the deployments as each lab reports them"),
    readouts: RO("≈ 377K", "FLOPs per token: a probe on all 46 layers of Gemma 3 27B", "gold") +
      RO("≈ 8B", "FLOPs per token: one pass through Gemma 3 4B", "ink"),
    paper: D.prologueView({}),
    six: {},
  }),
  // a statement becomes a data point
  collect: () => collectView(),
  // a direction and a threshold
  probe: () => {
    const e = E[12].w.aff;
    return {
      ...viewAff(12), choreo: "read", cards: krasCards(12, "aff"),
      title: "A logistic-regression probe at layer 12",
      badge: badge("real", `Qwen2.5-1.5B · layer 12 · final token · ${N_ALL.toLocaleString("en-US")} statements from held-out cities`),
      readouts: RO(fmt.pct1(e.acc), `new statements read correctly · ${e.right} of ${e.n}`) +
        RO(`‖w‖ = ${Ls(12).probes.w.norm.toFixed(2)}`, `logits per unit of h: level sets ${(1 / Ls(12).probes.w.norm).toFixed(2)} units apart`, "ink"),
      six: {},
    };
  },
  // why linear: how the next block reads the stream, beside how a probe reads it
  linear: () => ({
    scene: "paper", title: ui.linear.kind === "linear" ? "How the model reads its own states" : "A probe that can compute",
    badge: badge("schematic", "Qwen2.5-1.5B's block, as a sketch · sizes from the model's configuration"),
    readouts: RO("17,920", "directions each block's MLP reads, after normalizing", "ink") +
      RO("1,536 · 256 · 256", "query, key and value directions each attention layer reads", "ink"),
    paper: D.whyLinearView({ kind: ui.linear.kind, cfg: { intermediate: 8960 } }),
    six: {},
  }),
  // which token a probe reads
  position: () => positionView(),
  // or every token, pooled
  pooling: () => poolingView(),
  // predict: how many labelled statements?
  p1: () => {
    const v = trainerView(TR.fits.length - 1, { hidden: true });
    return { ...v, probe: null, paper: false, ghosts: [], counts: false, choreo: "move", axes: { x: "", y: "" },
      title: "New statements, labels hidden",
      badge: badge("real", `Qwen2.5-1.5B · layer ${TR.layer} · ${N_ALL.toLocaleString("en-US")} statements from held-out cities`),
      readouts: RO("n = ?", "labelled statements to fit the probe to", "ink") + RO("95%", "of new statements read correctly", "ink"),
      legend: [{ glyph: "hidden", text: "a held-out statement, label hidden" }], six: {} };
  },
  // a handful of statements
  curve: () => trainerView(ui.curve),
  // a perfect fit proves nothing
  fit: () => {
    const f = F[ui.fit.labels], part = ui.fit.show === "train" ? f.train : f.held;
    const real = F.real;
    const keep = (i) => !narrow || i % 3 === 0;          // phones draw a third
    const pts = part.x.map((x, i) => ({ key: `fit:${ui.fit.labels}:${ui.fit.show}${i}`, c: [x, part.y[i]], truth: part.label[i],
      shape: "c", ring: ui.fit.show === "train", text: part.text[i] })).filter((_, i) => keep(i));
    const frame = { u: [1, 0], v: [0, 1] };
    const probe = { coef: [1, 0], thr: f.thr, norm: f.norm, kind: "lr" };
    // one glass scale for both label conditions (the true-label view's), so the coin-flip sliver is seen at true width
    const rowsReal = [...real.train.x.map((x, i) => [x, real.train.y[i]]), ...real.held.x.map((x, i) => [x, real.held.y[i]])];
    const scR = fig.fitScale({ frame, aspect: "fit", probe: { coef: [1, 0], thr: real.thr } }, rowsReal);
    const rowsCur = [...f.train.x.map((x, i) => [x, f.train.y[i]]), ...f.held.x.map((x, i) => [x, f.held.y[i]])];
    const ys = rowsCur.map((r) => r[1]).sort(d3.ascending);
    const sc = { ...scR, cx: f.thr, cy: (d3.quantile(ys, 0.01) + d3.quantile(ys, 0.99)) / 2 };
    const order = pts.slice().sort((a, b) => a.c[0] - b.c[0]).map((q) => q.key);
    // accuracy from the coordinates the figure draws, so the readout and the paper's counts can't disagree
    const accOf = (part) => part.x.filter((x, i) => ((x - f.thr > 0 ? 1 : 0) === part.label[i])).length / part.x.length;
    const a = { train: accOf(f.train), held: accOf(f.held) };
    return {
      layer: 16, space: `fit:${ui.fit.labels}`, pts, frame, sc, probe, _order: order, choreo: "read", lattice: frame, binW: narrow ? 8 : 5,
      paperLabel: PAPER(),
      axes: AX_FLIP,
      legend: [{ glyph: "true", text: ui.fit.labels === "coin" ? "heads" : "true" }, { glyph: "false", text: ui.fit.labels === "coin" ? "tails" : "false" },
        ...(ui.fit.show === "train" ? [{ glyph: "ring", text: "fitted to" }] : [])],
      title: ui.fit.labels === "coin" ? "Fitted to coin-flip labels" : "The same recipe, true labels",
      badge: badge("real", `Qwen2.5-1.5B · layer 16 · 300 training statements · C = 10⁴ · labels: ${ui.fit.labels === "coin" ? "coin flips" : "true / false"}`),
      readouts: RO(fmt.pct1(a.train), "training statements", "ink") +
        RO(fmt.pct1(a.held), "new statements", ui.fit.labels === "coin" ? "ink" : "gold") +
        RO(`‖w‖ = ${f.norm < 10 ? f.norm.toFixed(1) : Math.round(f.norm)}`, `logits per unit of h (${ui.fit.labels === "coin" ? `true labels: ${real.norm.toFixed(1)}` : `coin flips: ${Math.round(F.coin.norm)}`})`, "ink"),
      six: { 1: "now" },
    };
  },
  // two directions that both read truth
  reg: () => regView(ui.reg),
  // contrast pairs
  pairs: () => pairsView(Number(ui.pairs.layer)),
  // predict: Othello
  p2: () => ({
    scene: "paper", title: "Can a probe read the board?",
    badge: badge("real", "re-plotted: Nanda, Lee and Wattenberg 2023, Table 1, best layer · the board: one real position"),
    readouts: RO("75.0%", "linear probe: each square black, white or empty", "ink") + RO("98.7%", "probe with one hidden layer", "ink"),
    paper: D.othelloPredictView({ acc: { linear: 0.75, mlp: 0.987, base: 0.618 } }),
    six: { 1: "done" },
  }),
  // mine and yours
  othello: () => othelloView(ui.oth.labels, ui.oth.angle),
  // predict: say "not"
  predict: () => ({
    ...viewAff(12), choreo: "move",
    cards: [krasCards(12, "aff")[0], { ...krasCards(12, "aff")[0], id: "pending", text: "…is not in Russia. → ?", x: layout.glass.x0 + 4, anchor: "start", pending: true }],
    title: "The layer-12 probe, before “not”",
    badge: badge("real", "Qwen2.5-1.5B · layer 12 · trained on “is in” only"),
    readouts: RO(fmt.pct1(E[12].w.aff.acc), "“is in”, new cities") + ARROW + RO("?", "“is not in”, the same cities", "ink"),
    six: { 1: "done" },
  }),
  // upside down
  flip: () => {
    const l = ui.flip.layer, p = probeOf(l, "w"), sc = flipScale(l), fr = flipFrame(l);
    const pts = pointsFor(l, "neg", "p", "s");
    const e = E[l].w;
    return {
      layer: l, space: `L${l}`, pts, frame: fr, sc, probe: p, choreo: "flip", cards: krasCards(l, "neg"),
      paperLabel: PAPER(), axes: AX_FLIP,
      title: `The same probe on “is not in”`,
      badge: badge("real", `Qwen2.5-1.5B · layer ${l} · trained on “is in” only · tested on “is not in”`),
      readouts: RO(fmt.pct1(e.aff.acc), "“is in” (circles)", "ink") + ARROW + RO(fmt.pct1(e.neg.acc), "“is not in” (squares)", "ink") +
        RO(fmt.f3(e.neg.auroc), "AUROC on “is not in”: 0.5 no signal, 0 inverted", "gold"),
      six: { 1: "done", 2: "now" },
    };
  },
  // retrain on both (final state; the choreography first shows the old probe, then turns)
  fix: () => fixView(ui.fix.layer, ui.fix.set, "B"),
  // truth has at least two directions
  gp: () => gpView(ui.gp.layer),
  // predict: which direction pushes the model?
  p4: () => {
    const v = pushView({ ...ui.push, alpha: 0 });
    return { ...v, probe: null, paper: false, arrows: [], cards: [], counts: false, choreo: "move",
      ghosts: [{ ...probeOf(16, "w"), id: "w", label: "w's boundary" }, { ...Ls(16).probes.dmu, kind: "dim", id: "dmu", label: "Δμ's boundary" }],
      legend: [...LG.tf, { glyph: "ghost", text: "each probe's boundary" }, { glyph: "mean", text: "class means" }],
      title: "Two probes, one push each",
      readouts: RO("?", "the model's answer after the logistic push", "ink") + RO("?", "after the Δμ push", "ink"), six: { 1: "done", 2: "done", 3: "done" } };
  },
  // the best reader isn't the best handle
  push: () => pushView(ui.push),
  // which layer
  layer: () => layerView(ui.layer),
  // chapter V: the same probe as a monitor
  job: () => jobView(ui.job.job),
  // a lie detector and its counterparts
  lies: () => ({
    scene: "paper", title: "Every headline with its counterpart",
    badge: badge("real", "re-plotted: each number as its paper reports it"),
    readouts: RO("99.3%", "sleeper agents, one contrast pair: AUROC", "ink") + RO("0.96–0.999", "Apollo's deception probe: AUROC", "ink") +
      RO(revealed["q-recipe"] ? "0.696" : "?", "the same recipe on another model", "ink"),
    paper: M4.counterpartsView({ held: !revealed["q-recipe"] }),
    six: { 1: "done", 2: "now", 3: "done", 4: "done", 5: "now" },
  }),
  // predict: an alarm at AUROC 0.999
  p5: () => ({
    scene: "paper", title: "An alarm set on ordinary chat",
    badge: badge("illustrative", "the chat distribution's shape is ours · Alpaca: 1,000 benign instructions"),
    readouts: RO("0.999 · 0.999", "AUROC, deceptive vs honest: probe A · probe B", "ink") + RO(fmt.pct1(dialRead({ probe: "A", traffic: "it", tick: MON.meta.tick }).fpr), "of ordinary chat flagged, for each", "ink") +
      RO("100% · ?", "of the lies flagged: A · B", "ink"),
    paper: M4.dialView(MON, { probe: "A", traffic: "none", tick: MON.meta.tick }),
    six: { 1: "done", 2: "done", 3: "done", 4: "done", 5: "now" },
  }),
  // the dial: not an operating point
  dial: () => dialStep(),
  // in the activations, or in the text?
  leak: () => {
    const k = ui.leak.scored, held = k === "organism" && !revealed["q-organism"];
    const au = { all: 0.95, answer: 0.81, benign: 0.63, organism: 0.5 }[k];
    return {
      scene: "paper", title: { all: "Scored on every token", answer: "Scored only on the answer", benign: "The instruction replaced by a benign one", organism: "A model that never says it" }[k],
      badge: badge("schematic", "a sketch of a transcript · the AUROCs: Boxo, Neelappa and Raval, sandbagging"),
      readouts: RO(held ? "?" : au.toFixed(2), "AUROC in this condition", "ink") + RO("10–30", "points of AUROC lost when the text's evidence is removed, across their settings", "ink"),
      paper: M4.leakView({ scored: k, held: !revealed["q-organism"] }),
      six: { 1: "done", 2: "done", 3: "now", 4: "done", 5: "done" },
    };
  },
  // predict: train against it
  p6: () => ({
    scene: "paper", title: "A frozen probe in the reward",
    badge: badge("schematic", "Gupta and Jenner's set-up, as a sketch · Qwen 2.5 14B"),
    readouts: RO("?", "evaded: mean over tokens", "ink") + RO("?", "maximum over tokens", "ink") + RO("?", "attention probe", "ink"),
    paper: M4.rlLoopView(),
    six: { 1: "done", 2: "done", 3: "done", 4: "done", 5: "done", 6: "now" },
  }),
  // under pressure
  pressure: () => ({
    scene: "paper", title: "Evaded through the text",
    badge: badge("real", "re-plotted: Gupta and Jenner, Table 1 (Qwen 2.5 14B, probes at layer 20) · the strip: a sketch of their mechanism"),
    readouts: RO("82%", "the mean-pooled probe, evaded at 1% FPR", "ink") + RO("≈ 70%", "of the recall drop from what the text says (their Llama 2 7B run)", "ink") +
      RO("4.4% · 1.8%", "the max-pooled probe · the attention probe", "ink"),
    paper: M4.pressureView(),
    six: { 1: "done", 2: "done", 3: "done", 4: "done", 5: "done", 6: "now" },
  }),
  // without an adversary
  drift: () => (ui.drift.which === "moves" ? {
    scene: "paper", title: revealed["q-drift"] ? "Hard-coding leaves the deception direction" : "Before ordinary RL on coding",
    badge: badge("illustrative", "a drawn mechanism, not measured states · the AUCs: the Obfuscation Atlas, Table 4 (four models: Llama-3 8B and 70B, Gemma-3 12B and 27B)"),
    readouts: RO(revealed["q-drift"] ? "0.991 → 0.376 · 0.996 → 0.655" : "0.991 · 0.996 → ?", "AUROC of fresh general deception probes on hard-coding, before → after RL (two training sets; mean of four models, wide spread)", "ink") +
      RO("1.000 → 1.000", "a probe trained on hard-coding itself", "ink"),
    paper: M4.movesView({ held: !revealed["q-drift"] }),
    six: { 1: "done", 2: "now", 3: "done", 4: "done", 5: "done", 6: "now" },
  } : {
    scene: "paper", title: "Told, not trained",
    badge: badge("illustrative", "shapes ours · at the frozen threshold the readouts reproduce Das and colleagues (GPT-OSS-20B agents, logistic probe, each round scored by its highest agent)"),
    readouts: RO("0.975 → 0.912", "AUROC, collusion vs control runs: told of the monitor → also shown its scores", "ink") + RO("0.95 → 0.41", "recall at the frozen threshold", "ink"),
    paper: M4.dasView(MON),
    six: { 1: "done", 2: "now", 3: "done", 4: "done", 5: "done", 6: "now" },
  }),
  // chapter IV: steering for free
  handle: () => ({
    scene: "paper", title: "One direction, many handles",
    badge: badge("real", "re-plotted: Chen and colleagues 2025 (persona vectors); Arditi and colleagues 2024 (refusal)"),
    readouts: RO(revealed["q-handle"] ? "0.70" : "?", "Marks and Tegmark's “likely” direction: false → true (LLaMA-2-13B)", "ink") +
      RO("0.098 · 0.239", "AxBench steering, 0 to 2: probe · difference of means", "ink") + RO("0.894", "steering by prompting, for comparison", "ink"),
    paper: M4.handleView(),
    six: { 1: "done", 2: "done", 3: "done", 4: "now" },
  }),
  // contested: steering away evaluation awareness
  contested: () => ({
    scene: "paper", title: "A steering result, and its controls",
    badge: badge("real", "re-plotted: Claude Sonnet 4.5 system card; Read, Schoen, Aranguri and Bloom 2026 (GLM-5)"),
    readouts: RO("8–9%", "Sonnet 4.5: the highest rate with awareness inhibited", "ink") + RO(revealed["q-control"] ? "80%" : "?", "GLM-5: the highest rate, from a control pair", "ink"),
    paper: M4.contestedView({ held: !revealed["q-control"] }),
    six: { 1: "done", 2: "done", 3: "done", 4: "now" },
  }),
  // chapter VI
  limits: () => ({
    scene: "paper", title: "The six questions, answered",
    badge: badge("schematic", "a summary of this piece"),
    readouts: "",
    paper: M4.sixView({ mode: "limits", answers: SIX_ANS }),
    six: { 1: "done", 2: "done", 3: "done", 4: "done", 5: "done", 6: "done" },
  }),
  check: () => ({
    scene: "paper", title: "Six questions for any probe",
    badge: badge("schematic", "a checklist"),
    readouts: "",
    paper: M4.sixView({ mode: "check", answers: null }),
    six: { 1: "done", 2: "done", 3: "done", 4: "done", 5: "done", 6: "done" },
  }),
};
const SIX_ANS = [
  ["held-out accuracy and controls, not a training fit;", "a probe with a hidden layer can compute what it reports"],
  ["whatever separated the training set, when it's in play;", "test on shifted data, and again after any training"],
  ["ask what a reader of the text alone would get: the difference", "is the probe's evidence beyond the text; the cost is the rest"],
  ["the best reader isn't the best handle; only a causal test", "(a push, an ablation) shows which direction the model uses"],
  ["recall at a threshold set on the traffic it will see,", "and the false alarms that threshold buys"],
  ["optimized against, it's evaded through the text first;", "no gradients through it; one monitor training never sees"],
];
const SIX_ASK = [
  ["held out? controls? what does a shuffled-label fit score?"],
  ["what else separated the labels? how does it do on shifted sets?"],
  ["what does a reader of the text alone score?"],
  ["does pushing along the direction change the behaviour?"],
  ["which threshold, set on which traffic? recall, false alarms?"],
  ["is its score in any reward? has the model been trained since?"],
];
const ORDER = ["prologue", "collect", "probe", "linear", "position", "pooling", "layer", "p1", "curve", "fit", "reg", "pairs", "p2", "othello", "predict", "flip", "fix", "gp", "p4", "push",
  "handle", "contested", "job", "lies", "p5", "dial", "leak", "p6", "pressure", "drift", "limits", "check"];
const views = ORDER.map((k) => V[k]);
const STEP = Object.fromEntries(ORDER.map((k, i) => [k, i]));

// ---- the pipeline scene's views ----
const P = DATA.pipeline;
function collectView() {
  const w = ui.collect.which;
  return {
    scene: "pipe", title: "From a statement to a data point",
    badge: badge("real", `h and X: Qwen2.5-1.5B, layer ${P.layer} · the model: a sketch`),
    readouts: RO("1,536", `numbers in h: the state over “.” at layer ${P.layer}`, "ink") +
      RO(P.n_train.toLocaleString("en-US"), "rows of X, one per training statement", "ink"),
    pipe: { mode: "collect", tokens: P.tokens[w], which: w, h: P.h[w], hscale: P.hscale, table: P.table, nTrain: P.n_train, layer: P.layer },
    six: {},
  };
}
function positionView() {
  // a probe trained at each position of "The city of X is in Y." (layer 12), drawn under the running example's tokens
  const BP = P.by_position, tok = P.tokens.true, n = tok.length;
  const acc = tok.map((_, i) => (i === n - 1 ? BP.period : i === n - 2 ? BP.country_last : 0.5));
  const sel = { in: n - 3, country: n - 2, period: n - 1 }[ui.pos.at];
  const g = (k) => (ui.pos.at === k ? "gold" : "ink");
  const held = !revealed["q-in"];
  return {
    scene: "pipe", title: "Which token does a probe read?",
    badge: badge("real", `Qwen2.5-1.5B · layer ${P.layer} · a probe per position, trained on ${P.n_train.toLocaleString("en-US")} statements, tested on ${P.n_test.toLocaleString("en-US")}`),
    readouts: RO(held ? "?" : fmt.pct1(BP.in), "read at “in”", g("in")) + RO(fmt.pct1(BP.country_last), "read at the country's (last) token", g("country")) +
      RO(fmt.pct1(BP.period), "read at the period", g("period")),
    pipe: { mode: "position", tokens: P.tokens, acc: held ? acc.map((a, i) => (i < n - 2 ? null : a)) : acc, sel, layer: P.layer },
    six: {},
  };
}
function poolingView() {
  const L = String(P.layer), a = P.acc[L], how = ui.pool.how, MM = P.max_miss;
  const held = !revealed["q-max"];
  const series = ui.pool.which === "kras"
    ? [{ k: "t", tokens: P.tokens.true, scores: P.scores[L].true.every }, { k: "f", tokens: P.tokens.false, scores: P.scores[L].false.every }]
    : [{ k: "f", tokens: MM.tokens, scores: MM.scores }];
  return {
    scene: "pipe", title: ui.pool.which === "kras" ? "Every token, pooled" : "A statement the maximum misreads",
    badge: badge("real", `Qwen2.5-1.5B · layer ${P.layer} · a probe trained on every token (labels copied), tested on ${P.n_test.toLocaleString("en-US")} statements`),
    readouts: RO(fmt.pct1(a.mean), "mean of the states, then the probe", "ink") + RO(fmt.pct1(a.every_mean), "every token scored, mean of scores", how === "mean" ? "gold" : "ink") +
      RO(held ? "?" : fmt.pct1(a.every_max_own), held ? "every token scored, max of scores" : `max of scores, own threshold · ${fmt.pct1(a.every_max)} at 0`, how === "max" ? "gold" : "ink"),
    pipe: { mode: "pooling", series, how: held && how === "max" ? "mean" : how, layer: P.layer, thrMax: a.every_max_thr },
    six: {},
  };
}

// ---- which layer: a flipbook of every layer's own plane ----
const BL = DATA.by_layer;
function sparkline(L) {
  // held-out accuracy by layer, as a small chart inside the readout: gold curve, the current layer marked
  const w = 210, h = 54, x = d3.scaleLinear().domain([0, 28]).range([6, w - 6]), y = d3.scaleLinear().domain([0.5, 1]).range([h - 12, 4]);
  const line = d3.line().x((d) => x(d.layer)).y((d) => y(d.acc))(BL);
  const f = BL[L];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><line class="sp-half" x1="6" x2="${w - 6}" y1="${y(0.5)}" y2="${y(0.5)}"/>` +
    `<path class="sp-line" d="${line}"/><line class="sp-now" x1="${x(L)}" x2="${x(L)}" y1="2" y2="${h - 12}"/>` +
    `<circle class="sp-dot" cx="${x(L)}" cy="${y(f.acc)}" r="3.6"/><text class="sp-t" x="6" y="${h - 1}">0</text>` +
    `<text class="sp-t" x="${w - 6}" y="${h - 1}" text-anchor="end">28</text><text class="sp-t" x="${w / 2}" y="${h - 1}" text-anchor="middle">layer</text></svg>`;
}
function layerView(L) {
  const f = BL[L];
  const idx = narrow ? DATA.show : d3.range(N_ALL);
  const pts = idx.map((i) => ({ key: `ly:${i}`, c: [f.x[i], f.y[i]], truth: lab.aff[i], shape: "c", text: txt.aff[i] }));
  const frame = { u: [1, 0], v: [0, 1] };
  const probe = f.norm ? { coef: [1, 0], thr: f.thr, norm: f.norm, kind: "lr" } : null;
  const sc = f.identical ? { kx: 1, ky: 1, cx: 0, cy: 0 } : fig.fitScale({ frame, aspect: "fit", probe }, pts.map((q) => q.c));
  return {
    layer: L || null, space: `ly${L}`, pts, frame, sc, probe, paper: !!probe, choreo: "cut", lattice: frame,
    paperLabel: PAPER(), axes: { x: "onto this layer's ŵ →", y: "largest remaining variance ↑" }, legend: [...LG.tf],
    title: L === 0 ? "Layer 0: the embedding" : `A probe trained at layer ${L}`,
    badge: badge("real", `Qwen2.5-1.5B · layer ${L} · final token · ${N_ALL.toLocaleString("en-US")} statements from held-out cities`),
    readouts: `<div class="ro ro-spark"><b class="big gold">${fmt.pct1(f.acc)}</b><span>${L === 0 ? "every final token is “.”: one point, chance" : `new statements read correctly at layer ${L}`}</span></div>` +
      `<div class="ro">${sparkline(L)}<span>held-out accuracy by layer</span></div>`,
    six: {},
  };
}

// ---- how many labelled statements: one nested draw at layer 16, a probe fitted at each n (find.json) ----
const trFinal = TR.fits[TR.fits.length - 1];
const trProbe = (f) => ({ coef: f.coef, thr: f.thr, norm: f.norm, kind: "lr" });
function trAngle(f) { return deg(dot(unit(f.coef), unit(TR.fits[TR.fits.length - 1].coef))); }
function trainerFrame(j) {
  const last = TR.fits.length - 1, f = TR.fits[j], u = unit(f.coef);
  // the plane of this fit and the final probe; the final probe itself is drawn in its plane with the previous fit, turned
  // on from it (the same plane, so the last step is an in-plane rotation)
  if (j < last) return { u, v: orthTo(trFinal.coef, u) };
  const prev = unit(TR.fits[last - 1].coef);
  return { u, v: orthTo(prev, u).map((x) => -x) };
}
const trScale = (() => {
  // one scale for every fit (so the slider only turns the view): the tightest of their equal-aspect fits
  const scs = TR.fits.map((f, j) => fig.fitScale({ frame: trainerFrame(j), aspect: "equal", probe: trProbe(f) }, TR.held));
  const k = d3.min(scs, (q) => q.kx);
  return { kx: k, ky: k };
})();
function curveSpark(j) {
  // held-out accuracy by n (mean of 20 draws, the 10th to 90th percentile shaded), this draw's fit marked
  const L = String(TR.layer), c = CV[L], w = 210, h = 58;
  const x = d3.scaleLog().domain([2, c.n[c.n.length - 1]]).range([8, w - 8]), y = d3.scaleLinear().domain([0.5, 1]).range([h - 13, 4]);
  const band = d3.area().x((d) => x(d.n)).y0((d) => y(d.lo)).y1((d) => y(d.hi))(c.n.map((n, i) => ({ n, ...c.lr[i] })));
  const line = d3.line().x((d) => x(d.n)).y((d) => y(d.mean))(c.n.map((n, i) => ({ n, ...c.lr[i] })));
  const f = TR.fits[j];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><line class="sp-half" x1="8" x2="${w - 8}" y1="${y(0.95)}" y2="${y(0.95)}"/>` +
    `<path class="sp-band" d="${band}"/><path class="sp-line" d="${line}"/><line class="sp-now" x1="${x(f.n)}" x2="${x(f.n)}" y1="2" y2="${h - 13}"/>` +
    `<circle class="sp-dot" cx="${x(f.n)}" cy="${y(f.acc)}" r="3.6"/><text class="sp-t" x="8" y="${h - 1}">2</text>` +
    `<text class="sp-t" x="${w - 8}" y="${h - 1}" text-anchor="end">${c.n[c.n.length - 1].toLocaleString("en-US")}</text>` +
    `<text class="sp-t" x="${w / 2}" y="${h - 1}" text-anchor="middle">n (log) · dashed 95%</text></svg>`;
}
function trainerView(j, { hidden = false } = {}) {
  const f = TR.fits[j], fr = trainerFrame(j), last = j === TR.fits.length - 1;
  const held = IDX.map((i) => ({ key: `tr:h${i}`, c: TR.held[i], truth: hidden ? null : lab.aff[i], shape: "c", text: txt.aff[i] }));
  const nShow = hidden ? 0 : Math.min(f.n, TR.train.coords.length);
  const train = TR.train.coords.slice(0, nShow).map((c, q) => ({ key: `tr:t${q}`, c, truth: TR.train.label[q], shape: "c", ring: true, noPaper: true,
    text: TR.train.text[q] }));
  const sc = { kx: trScale.kx, ky: trScale.ky, cx: f.thr, cy: d3.mean(TR.held, (r) => dot(r, fr.v)) };
  const ang = Math.round(trAngle(f));
  const mean = CV[String(TR.layer)].lr[j];
  return {
    layer: TR.layer, space: "trainer", pts: [...held, ...train], frame: fr, sc, probe: trProbe(f), choreo: "move",
    ghosts: last ? [] : [{ ...trProbe(trFinal), id: "final", angle: `${ang}°` }],
    paperLabel: PAPER(), axes: { x: "onto this probe's ŵ →", y: last ? "" : "final probe's ŵ, part ⊥ ↑" },
    legend: [...LG.tf, { glyph: "ring", text: f.n > nShow ? `fitted to (${nShow} of ${f.n} drawn)` : "fitted to" },
      ...(last ? [] : [{ glyph: "ghost", text: "the final probe's boundary" }])],
    title: last ? `Fitted to all ${f.n.toLocaleString("en-US")} training statements` : `Fitted to ${f.n} statements`,
    badge: badge("real", `Qwen2.5-1.5B · layer ${TR.layer} · one draw of n training statements, half true · plane of this probe and the final one, true proportions`),
    readouts: RO(fmt.pct1(f.acc), `new statements read correctly · this draw · mean of 20 draws ${fmt.pct1(mean.mean)}`) +
      RO(last ? "0°" : `${ang}°`, "from the final probe's direction", "ink") +
      `<div class="ro">${curveSpark(j)}<span>held-out accuracy by n, 20 draws</span></div>`,
    six: {},
  };
}

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
  const held = !revealed["q-angle"];
  return {
    layer: l, space: `L${l}`, pts, frame, sc, probe, _order: order, levels: false, binW: narrow ? 6 : 4,
    choreo: "move", lattice: null,
    ghosts: ci === 0 ? [] : [{ ...dmu, id: "dmu", angle: held ? "?" : `${angle}°` }],
    means: [{ c: means.aff_true, label: "μ true", dx: 12, dy: -12 }, { c: means.aff_false, label: "μ false", dx: -12, dy: 26, anchor: "end" }],
    meanSegment: true,
    paperLabel: PAPER(),
    axes: { x: "onto ŵ →", y: "Δμ, the part ⊥ ŵ ↑" },
    legend: [...LG.tf, { glyph: "bnd", text: "w's boundary" }, { glyph: "ghost", text: "Δμ's boundary" }, { glyph: "mean", text: "class means" }],
    title: ci === 0 ? "Strong penalty: w points along Δμ" : held ? "Logistic regression and Δμ" : `Logistic regression, ${angle}° from Δμ`,
    badge: badge("real", `Qwen2.5-1.5B · layer 12 · plane of ŵ and Δμ, true angles`),
    readouts: RO(held ? "?" : `${angle}°`, "w vs Δμ, in all 1,536 dimensions", "gold") +
      RO(fmt.pct1(q.ev.acc), `w reads new statements · C = ${cLabel(q.C)}`, "ink") +
      RO(fmt.pct1(E[12].dmu.aff.acc), "Δμ, midpoint threshold", "ink"),
    six: { 1: "done" },
  };
}
const cLabel = (C) => (C >= 1 ? d3.format("~g")(C) : C >= 1e-3 ? d3.format("~g")(C) : `10${sup(Math.round(Math.log10(C)))}`);
const sup = (n) => String(n).split("").map((ch) => "⁰¹²³⁴⁵⁶⁷⁸⁹"["0123456789".indexOf(ch)] ?? (ch === "-" ? "⁻" : ch)).join("");

// ---- contrast pairs: every held-out city's two statements, joined; their mean difference is Δμ ----
function pairsView(l) {
  const P_ = Ls(l).probes;
  const u = unit(P_.dmu.coef), v = orthTo(P_.w.coef, u);
  const frame = { u, v };
  const probe = { ...P_.dmu, kind: "dim" };
  // rows 2k and 2k+1 are one city's true and false statements; phones draw every fourth city
  const cities = d3.range(0, N_ALL, 2).filter((_, k) => !narrow || k % 4 === 0);
  const pts = cities.flatMap((i) => [i, i + 1]).map((i) => ({ key: `${l}:p${i}`, c: Ls(l).coords.aff[i], truth: lab.aff[i], shape: "c", text: txt.aff[i] }));
  const pairs = cities.map((i) => [`${l}:p${i + 1}`, `${l}:p${i}`]);
  const means = Ls(l).means;
  const sc = scaleFor(frame, Ls(l).coords.aff, { aspect: "equal", probe });
  const PR = FIND.pairs[String(l)];
  return {
    layer: l, space: `L${l}`, pts, frame, sc, probe, pairs, choreo: "move", levels: false,
    arrows: [{ id: "dmu", from: means.aff_false, to: means.aff_true, cls: "gold", label: "Δμ", dy: -16 }],
    paperLabel: PAPER("Δμ"), axes: { x: "along Δμ →", y: "w, the part ⊥ Δμ ↑" },
    legend: [...LG.tf, { glyph: "pair", text: "a city's two statements" }, { glyph: "arrow", text: "Δμ, their mean difference" }],
    title: "Every pair, and their average",
    badge: badge("real", `Qwen2.5-1.5B · layer ${l} · held-out cities, one segment per pair · plane of Δμ and w, true proportions`),
    readouts: RO(PR.cos_mean.toFixed(2), "a pair's difference vs Δμ: mean cosine in all 1,536 dimensions") +
      RO(`0 ± ${PR.random_sd.toFixed(2)}`, "the same, for random directions", "ink") +
      RO(fmt.pct1(PR.pca_acc), "no labels: PCA of the differences (one pair sets the sign)", PR.pca_acc < 0.6 ? "ink" : "gold"),
    six: { 1: "done" },
  };
}

// ---- Othello, schematic: one square's states in the plane of two directions the model is hypothesized to hold ----
// ownership (the piece is mine / yours: the player to move owns "mine") across, whose turn it is up. A black piece is
// "mine" on black's turn and "yours" on white's, so black pieces sit in two opposite quadrants: an XOR no single
// direction splits. Drawn from a fixed seed, as illustration (Nanda's hypothesis), not data.
const OTH = (() => {
  const rnd = d3.randomLcg(7), n = d3.randomNormal.source(rnd)(0, 0.42);
  const pts = [];
  for (const o of [1, -1]) for (const t of [1, -1]) for (let i = 0; i < (narrow ? 34 : 70); i++) pts.push({ o, t, c: [1.55 * o + n(), 1.15 * t + n()] });
  return pts;
})();
function othelloView(labels, angle) {
  const a = (angle * Math.PI) / 180;
  const u = [Math.cos(a), Math.sin(a)], v = [-Math.sin(a), Math.cos(a)];
  const bw = labels === "bw";
  const pts = OTH.map((q, i) => ({ key: `oth${i}`, c: q.c, truth: bw ? (q.o * q.t > 0 ? 1 : 0) : (q.o > 0 ? 1 : 0), shape: "c",
    text: `${q.o > 0 ? "my" : "your"} piece, ${q.t > 0 ? "black" : "white"} to move: ${q.o * q.t > 0 ? "black" : "white"}` }));
  const frame = { u, v };
  const probe = { coef: u, thr: 0, kind: "dim" };
  const sc = { kx: narrow ? 78 : 74, ky: narrow ? 78 : 74, cx: 0, cy: 0.05 };
  return {
    layer: null, space: "othello", gridNote: false, pts, frame, sc, probe, choreo: "move", lattice: { u: [1, 0], v: [0, 1] }, counts: false, binW: narrow ? 10 : 8,
    paperLabel: "position along the probe's direction (illustrative units)",
    axes: angle ? { x: "", y: "" } : { x: "“mine vs yours” →", y: "whose turn ↑" },
    legend: bw ? [{ glyph: "true", text: "black piece" }, { glyph: "false", text: "white piece" }]
      : [{ glyph: "true", text: "my piece (the player to move)" }, { glyph: "false", text: "your piece" }],
    groups: angle ? [] : [
      { label: "black to move", test: (s_) => s_.c1[1] > 0 && s_.c1[0] > 0, corner: "tr" },
      { label: "white to move", test: (s_) => s_.c1[1] < 0 && s_.c1[0] > 0, corner: "br" }],
    title: bw ? "Black and white: an XOR" : "Mine and yours: one direction",
    badge: badge("schematic", "one square's states, as Nanda hypothesized them · the accuracies are Nanda et al.'s, Table 1"),
    readouts: RO("75.0%", "linear probe: black, white or empty", bw ? "gold" : "ink") + ARROW + RO(bw ? "?" : "99.6%", "linear probe: mine, yours or empty", bw ? "ink" : "gold"),
    six: { 1: "now" },
  };
}

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
    layer: l, space: `L${l}`, pts, frame, lattice: A, sc, probe, choreo: stage === "A" ? "move" : "rotate",
    ghosts: stage === "B" ? [{ ...probeOf(l, "w"), id: "w-old", angle: `${turn}°` }] : [],
    paperLabel: PAPER(stage === "A" ? "the old ŵ" : "the new ŵ"),
    axes: stage === "A" ? { x: "onto the old ŵ →", y: "the new ŵ, part ⊥ the old ↑" } : { x: "onto the new ŵ →", y: "" },
    legend: [{ glyph: "true", text: cities ? "“is in”" : "Spanish word" }, { glyph: "sq-true", text: "negated" }, { glyph: "false", text: "hollow = false" },
      ...(stage === "B" ? [{ glyph: "ghost", text: "old boundary" }] : [])],
    title: stage === "A" ? "The old probe, in the plane of both" : cities ? "Retrained on both polarities" : "The retrained probe, Spanish words",
    badge: badge("real", `Qwen2.5-1.5B · layer ${l} · retrained on “is in” and “is not in” · plane of both probes`),
    readouts: stage === "A" ? RO(fmt.pct1(e1.neg.acc), "the old probe on “is not in”", "ink") : ro,
    six: { 1: "done", 2: "now", 3: "now" },
  };
}

// ---- the push (layer 16): each direction scaled by Marks & Tegmark's rule, and the model's answer (push.json) ----
const PG = PUSH.geometry;
const theta = (() => {
  const m = Ls(16).means, dmu = m.aff_true.map((x, i) => x - m.aff_false[i]);
  const wh = unit(Ls(16).probes.w.coef), k = dot(wh, dmu);
  return { mm: dmu, lr: wh.map((x) => x * k) };          // lr: (ŵ·Δμ) ŵ, shorter by the cosine
})();
/** The model's answer (P(TRUE) − P(FALSE)) for a Krasnodar statement pushed by alpha along a direction, from the sweep. */
function krAnswer(dir, which, alpha) {
  const K_ = PUSH.krasnodar, a = K_.alphas, v = K_[dir][which];
  const j = d3.bisectLeft(a, alpha);
  if (j <= 0) return v[0];
  if (j >= a.length) return v[a.length - 1];
  const t = (alpha - a[j - 1]) / (a[j] - a[j - 1]);
  return v[j - 1] + (v[j] - v[j - 1]) * t;
}
function answerGauge(pd, base) {
  // the model's answer on paper: P(TRUE) − P(FALSE) from −1 to +1; the unpushed answer dashed
  const w = 220, h = 50, x = d3.scaleLinear().domain([-1, 1]).range([10, w - 10]);
  return `<svg class="spark gauge" viewBox="0 0 ${w} ${h}" aria-hidden="true"><line class="g-axis" x1="10" x2="${w - 10}" y1="22" y2="22"/>` +
    `<line class="g-mid" x1="${x(0)}" x2="${x(0)}" y1="12" y2="32"/><line class="g-base" x1="${x(base)}" x2="${x(base)}" y1="8" y2="36"/>` +
    `<rect class="g-bar" x="${Math.min(x(0), x(pd))}" y="16" width="${Math.abs(x(pd) - x(0))}" height="12"/>` +
    `<text class="sp-t" x="10" y="${h - 2}">FALSE</text><text class="sp-t" x="${w - 10}" y="${h - 2}" text-anchor="end">TRUE</text>` +
    `<text class="sp-t" x="${x(0)}" y="${h - 2}" text-anchor="middle">0</text></svg>`;
}
function pushView({ dir, which, alpha }) {
  const l = 16, P_ = Ls(l).probes;
  const u = unit(P_.dmu.coef), v = orthTo(P_.w.coef, u), frame = { u, v };
  const means = Ls(l).means;
  const probe = { ...P_.dmu, kind: "dim" };
  const sc = scaleFor(frame, Ls(l).coords.aff, { aspect: "equal", probe });
  const ki = which === "false" ? K.false : K.true, sign = which === "false" ? 1 : -1;
  const a = sign * alpha;
  const k0 = Ls(l).coords.aff[ki];
  const kc = k0.map((x, i) => x + a * theta[dir][i]);
  const pts = pointsFor(l, "aff", "p", "c").map((q) => (q.key === `${l}:p${ki}` ? { ...q, c: kc } : q));
  // both pushes drawn from the statement's own state, at Marks and Tegmark's length (the vector that carries the average
  // false statement to the average true one, for each probe)
  const from = k0, tipMM = k0.map((x, i) => x + sign * theta.mm[i]), tipLR = k0.map((x, i) => x + sign * theta.lr[i]);
  const compLR = k0.map((x, i) => x + sign * dot(theta.lr, u) * u[i]);     // the logistic push's component along Δμ
  const pd = krAnswer(dir, which, a), base = krAnswer(dir, which, 0);
  const cos = PG.cos_w_dmu, nie = PUSH.nie.cities, j1 = PUSH.meta.alphas.indexOf(1);
  const nameOf = { mm: "Δμ", lr: "w" };
  return {
    layer: l, space: `L${l}`, pts, frame, sc, probe, choreo: "move", levels: false, counts: false,
    arrows: [
      { id: "mm", from, to: tipMM, cls: dir === "mm" ? "violet" : "violet faint", label: "the Δμ push", dy: -16 },
      { id: "lr", from, to: tipLR, cls: dir === "lr" ? "violet" : "violet faint", label: "the w push", dx: -8, dy: 26, anchor: "end" },
      { id: "comp", from: tipLR, to: compLR, cls: "violet dash", label: "" },
    ],
    means: [{ c: means.aff_true, label: "μ true", dx: 12, dy: -12 }, { c: means.aff_false, label: "μ false", dx: -12, dy: 26, anchor: "end" }],
    cards: [{ key: `${l}:p${ki}`, text: `${which === "false" ? "…in China." : "…in Russia."} ${alpha ? `pushed ${alpha}×` : "unpushed"}` }],
    paperLabel: PAPER("Δμ"), axes: { x: "along Δμ →", y: "w, the part ⊥ Δμ ↑" },
    legend: [],
    title: dir === "mm" ? "Pushed along the difference of means" : "Pushed along the logistic direction",
    badge: badge("real", `Qwen2.5-1.5B · directions fitted at layer 16 · pushed at layers 14–18, last two tokens · the model's own answer`),
    readouts: `<div class="ro">${answerGauge(pd, base)}<span>${narrow ? "the model's answer: P(TRUE) − P(FALSE) · dashed: unpushed" : `the model's answer to “${which === "false" ? "…is in China." : "…is in Russia."} This statement is:” · P(TRUE) − P(FALSE) · dashed: unpushed`}</span></div>` +
      RO(`${nie.mm.f2t[j1].toFixed(2)} · ${nie.lr.f2t[j1].toFixed(2)}`, "false → true · 100 held-out false statements · Δμ · w (1 = as if true)", "gold"),
    six: { 1: "done", 2: "done", 3: "done", 4: "now" },
    _cos: cos, _name: nameOf[dir],
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
    layer: l, space: `L${l}`, pts, frame, sc, probe, choreo: "move",
    ghosts: [{ ...probeOf(l, "w"), id: "w-aff" }],
    groups: [
      { label: "is in · true", test: (s) => s.shape === "c" && s.fill1 === 1, corner: "tr" },
      { label: "is in · false", test: (s) => s.shape === "c" && s.fill1 === 0, corner: "bl" },
      { label: "is not in · true", test: (s) => s.shape === "s" && s.fill1 === 1, corner: "br" },
      { label: "is not in · false", test: (s) => s.shape === "s" && s.fill1 === 0, corner: "tl" }],
    paperLabel: PAPER("ĝ"),
    axes: { x: "g, general truth →", y: "" },
    legend: [{ glyph: "true", text: "“is in”" }, { glyph: "sq-true", text: "“is not in”" }, { glyph: "false", text: "hollow = false" }, { glyph: "ghost", text: "old probe's boundary" }],
    title: "General truth and polarity",
    badge: badge("real", `Qwen2.5-1.5B · layer ${l} · plane of g and p (p made orthogonal to g) · true proportions`),
    readouts: RO(fmt.pct1(e.aff.acc), "along g: “is in”", "gold") + RO(fmt.pct1(e.neg.acc), "along g: “is not in”", "gold") +
      RO(`${cosOf(l, "w", "tP").toFixed(2)} · ${cosOf(l, "w", "tG").toFixed(2)}`, "the old probe's cosines with p and g", "ink"),
    six: { 1: "done", 2: "done", 3: "done" },
  };
}

// ---- chapter IV: the probe as a monitor ----
function jobView(job) {
  // Fig. 3's exact view; as a monitor the labels go (one grey histogram) and the side it flags is shaded
  const mon = job === "monitor", l = 12;
  const v = viewAff(l);
  const pts = mon ? v.pts.map((q) => ({ ...q, truth: null })) : v.pts;
  const s = scores(Ls(l).coords.aff, probeOf(l, "w"));
  const flagged = s.filter((x) => x <= 0).length, right = s.filter((x, i) => (x <= 0) === (lab.aff[i] === 0) && x <= 0).length;
  return {
    ...v, pts, choreo: "move", paperUnknown: mon, flagSide: mon ? "left" : null, counts: !mon,
    legend: mon ? [{ glyph: "hidden", text: "a statement, label unknown" }, { glyph: "flag", text: "flagged: read as false" }] : [...LG.tf],
    title: mon ? "The same probe, as a monitor" : "The probe, doing science",
    badge: badge("real", `Qwen2.5-1.5B · layer 12 · final token · ${N_ALL.toLocaleString("en-US")} statements from held-out cities`),
    readouts: mon ? RO(`${flagged.toLocaleString("en-US")}`, `of ${N_ALL.toLocaleString("en-US")} flagged: read as false`, "gold") + RO("?", "of the flags, how many are right", "ink")
      : RO(fmt.pct1(E[l].w.aff.acc), "read correctly: the labels are known", "gold") + RO(`${right.toLocaleString("en-US")} of ${flagged.toLocaleString("en-US")}`, "flags that are right: false statements read as false", "ink"),
    six: { 1: "done", 2: "now", 3: "done", 4: "done", 5: "now" },
  };
}
/** The dial's readouts, computed from the drawn samples (the same ones the histograms show). */
function dialRead(st) {
  const C = M4.dialClasses(MON, st);
  const chat = M4.drawnSamples(C.chat);
  const out = { fpr: M4.shareAbove(chat, st.tick) };
  if (C.honest) {
    const hon = M4.drawnSamples(C.honest), dec = M4.drawnSamples(C.deceptive);
    Object.assign(out, { recall: M4.shareAbove(dec, st.tick), honestUp: M4.shareAbove(hon, st.tick), auroc: M4.aurocOf(dec, hon) });
  }
  return out;
}
const TICK_STEP = 0.07;
const tickOf = (v) => MON.meta.tick + (v - 50) * TICK_STEP;          // the slider's middle is the published threshold
function dialStep() {
  const st = { probe: ui.dial.probe, traffic: ui.dial.traffic, tick: tickOf(ui.tick) };
  const r = dialRead(st), bd = st.traffic === "bd";
  const pub = ui.tick === 50;
  return {
    scene: "paper",
    title: bd ? "Probe A on a backdoor task" : `Probe ${st.probe}: ${st.probe === "A" ? "instructed pairs" : "role-play"}`,
    badge: badge("illustrative", "shapes ours · at the published threshold the readouts reproduce Parrack, Attubato and Heimersheim, Tables 3 and 7 (Llama-3.3-70B-Instruct, Apollo's probes)"),
    readouts: RO(r.auroc.toFixed(3), `AUROC, deceptive vs honest${bd ? " (Backdoors)" : ""}`, "ink") +
      RO(fmt.pct1(r.fpr), pub ? "of chat flagged: the published threshold" : "of chat flagged (illustrative away from 1%)", "ink") +
      RO(fmt.pct1(r.recall), `of the lies flagged: recall${bd ? " · the average honest response scores above 99.9% of chat" : ""}`, "ink"),
    paper: M4.dialView(MON, st),
    six: { 1: "done", 2: "done", 3: "done", 4: "done", 5: "now" },
  };
}

function badge(kind, text) {
  const glyph = { real: "glass", schematic: "outline", illustrative: "dotted" }[kind];
  return `<span class="bdg ${glyph}"><i aria-hidden="true"></i>${kind}</span><span class="bdg-text">${text}</span>`;
}

// ---- rendering ----
/** Phones draw a subset of the statements: the counts under the figure are of what is drawn, the big numbers of all. */
function withDrawn(v) {
  if (!narrow || !v.pts || typeof v.readouts !== "string") return v;
  v.readouts = v.readouts.replace("</span></div>", ` · paper: ${v.pts.length} drawn</span></div>`);
  return v;
}
/** Readouts for scenes that don't set their own: the old ones dim, then the new ones land. */
function setReadouts(html) {
  const r = d3.select("#readouts").interrupt();
  if (reduced || !r.html()) { r.html(html).style("opacity", 1); return; }
  r.transition().duration(200).style("opacity", 0.3).transition().duration(0).on("start", function () { d3.select(this).html(html); })
    .transition().duration(400).style("opacity", 1);
}
let token = 0;
const sleep = (ms) => new Promise((res) => d3.timeout(res, reduced ? 0 : ms));
async function render(i, prev) {
  const my = ++token;
  const v = views[i]();
  d3.select("#fig-num").text(`Fig. ${i + 1}`);
  d3.select("#fig-title").text(v.title);
  d3.select("#fig-badge").html(v.badge);
  d3.selectAll("#six li").attr("class", function () { return v.six[this.dataset.q] ?? ""; });
  echoGuesses();
  // the first figure waits until the stage is on screen, so its choreography is seen
  const offscreen = () => { const r = document.querySelector(".stage .panel").getBoundingClientRect(); return !(r.top < innerHeight * 0.75 && r.bottom > 0); };
  const onscreen = () => new Promise((res) => {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); res(); } }, { threshold: 0.4 });
    io.observe(document.querySelector(".stage .panel"));
  });
  const scene = v.scene ?? "fig";
  const fade = (on) => (prev === -1 ? 0 : on ? 450 : 350);
  for (const [name, sc] of [["fig", fig], ["pipe", pipe], ["paper", paper]]) if ((name === scene) !== !sc.hidden || prev === -1) sc.setVisible(name === scene, fade(name === scene));
  if (scene !== "fig") {
    setReadouts(v.readouts);
    if (prev === -1 && !reduced && offscreen()) { await onscreen(); if (my !== token) return; }
    await (scene === "pipe" ? pipe.show(v.pipe) : paper.show(v.paper));
    return;
  }
  withDrawn(v);
  if (prev === -1 && !reduced && offscreen()) {
    // an empty glass first, so the figure's own choreography plays when it arrives
    await fig.show({ ...v, pts: [], probe: null, paper: false, cards: [], ghosts: [], means: [], groups: [], readouts: "", choreo: "cut" });
    await onscreen();
    if (my !== token) return;
  }
  // multi-stage choreography where one read must land before the next
  if (i === STEP.fit && prev !== STEP.fit && ui.fit.show === "held" && !reduced) {
    const saved = ui.fit.show;
    ui.fit.show = "train";
    const first = V.fit();
    ui.fit.show = saved;
    await fig.show(first);
    if (my !== token) return;
    await sleep(1200);
    if (my !== token) return;
  }
  if (i === STEP.fix && prev !== STEP.fix && ui.fix.set === "cities" && !reduced) {
    await fig.show(fixView(ui.fix.layer, "cities", "A"));
    if (my !== token) return;
    await sleep(700);
    if (my !== token) return;
  }
  if (i === STEP.push && prev !== STEP.push && !reduced) {
    const v0 = V.push();
    const k0 = { ...v0, pts: v0.pts.map((q) => (q.key === `16:p${ui.push.which === "false" ? K.false : K.true}` ? { ...q, c: Ls(16).coords.aff[ui.push.which === "false" ? K.false : K.true] } : q)) };
    await fig.show({ ...k0, arrows: [{ ...v0.arrows[0], cls: "gold", label: "Δμ" }], cards: [], choreo: "move" });
    if (my !== token) return;
    await sleep(700);
    if (my !== token) return;
    await fig.show({ ...k0, arrows: [{ ...v0.arrows[0], cls: "violet", label: v0.arrows[0].label }], cards: [], choreo: "move" });
    if (my !== token) return;
    await sleep(900);
    if (my !== token) return;
    await fig.show({ ...k0, arrows: v0.arrows.slice(0, 2), cards: [], choreo: "move" });
    if (my !== token) return;
    await sleep(600);
    if (my !== token) return;
    await fig.show({ ...k0, arrows: v0.arrows, choreo: "move" });
    if (my !== token) return;
    await sleep(500);
    if (my !== token) return;
  }
  if (i === STEP.othello && prev !== STEP.othello && !reduced) {
    // one full turn of the probe's direction, in three steps: black and white never come apart
    for (const ang of [0, 120, 240, 360]) {
      if (my !== token) return;
      await fig.show({ ...othelloView("bw", ang), choreo: ang ? "move" : "read" });
      if (my !== token) return;
      await sleep(ang === 0 ? 900 : ang === 360 ? 800 : 150);
    }
    if (my !== token) return;
    await fig.show({ ...othelloView(ui.oth.labels, 0), choreo: "flip" });
    return;
  }
  if (i === STEP.curve && prev !== STEP.curve && !reduced) {
    for (const j of d3.range(0, ui.curve)) {
      if (my !== token) return;
      const f = trainerView(j);
      await fig.show(f);
      d3.select("#fig-title").text(f.title);
      setCurveOut(j);
      if (my !== token) return;
      await sleep(900);
    }
    setCurveOut(ui.curve);
    d3.select("#fig-title").text(v.title);
    if (my !== token) return;
  }
  if (i === STEP.layer && prev !== STEP.layer && !reduced) {
    // a flipbook through the layers, 0 → 28, then back to where the slider was
    const target = ui.layer;
    for (const L of [...d3.range(0, 29), ...d3.range(27, target - 1, -1)]) {
      if (my !== token) return;
      const f = layerView(L);
      await fig.show({ ...f, readouts: null });
      d3.select("#readouts").interrupt().style("opacity", 1).html(f.readouts);
      d3.select("#fig-title").text(f.title);
      d3.select("#fig-badge").html(f.badge);
      setLayerOut(L);
      await sleep(L === 0 ? 900 : 170);
    }
    if (my !== token) return;
  }
  if (my !== token) return;
  await fig.show(v);
}

// the level-set spacing each label condition of the fit figure is drawn with (it depends on ‖w‖ and the shared scale)
{
  const saved = ui.fit.labels, stepTxt = (k) => `${k} logit${k === 1 ? "" : "s"}`;
  for (const lb of ["coin", "real"]) { ui.fit.labels = lb; const v = V.fit(); NUM[`${lb}_step`] = stepTxt(fig.levelStep(v.probe, v.sc)); }
  ui.fit.labels = saved;
}

// ---- prose numbers, checks, guesses, ledger ----
document.querySelectorAll("[data-n]").forEach((el) => {
  const v = NUM[el.dataset.n];
  if (v != null) el.textContent = v;
});
// figure numbers in the prose follow the step order
document.querySelectorAll("[data-fig]").forEach((el) => { el.textContent = `Fig. ${STEP[el.dataset.fig] + 1}`; });
// the stretch of the probe's figure, from its own scale
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
    // a check holds back the readout it asks about, and any paragraph that would give it away: answering releases them
    if (revealed[box.dataset.q]) return;
    revealed[box.dataset.q] = true;
    document.querySelectorAll(`[data-after="${box.dataset.q}"]`).forEach((el) => el.classList.add("shown"));
    const i = window.explainer.current, v = views[i]();
    token++;
    d3.select("#fig-title").text(v.title);               // some titles name the answer, so they wait for it too
    d3.select("#fig-badge").html(v.badge);
    if (v.scene === "pipe") { setReadouts(v.readouts); pipe.show({ ...v.pipe, choreo: "play" }); }
    else if (v.scene === "paper") { setReadouts(v.readouts); paper.show(v.paper); }
    else fig.show({ ...v, choreo: "move" });
  });
});

const FEEDBACK = {
  lr: "It reads best, and pushes least: its push is short and mostly sideways to the class means.",
  mm: `Right: ${NUM.nie_mm} of the way to true along Δμ, ${NUM.nie_lr} along w.`,
  same: "Each probe reads the pushed state as true, but the model doesn't read it through either probe.",
  nonlin: "Li and colleagues' conclusion; the next step shows the board is linear in another labelling.",
  other: "Right: squares labelled mine and yours are read linearly at 99.6%.",
  nothing: "The directions are used: editing along them changes the model's moves as the new board requires.",
  10: `Right: eight statements give ${NUM.c16_8} on average, four ${NUM.c16_4}.`,
  100: `128 give ${NUM.c16_100}, but eight already give ${NUM.c16_8}: the direction is large and clean here, so a few examples find it.`,
  1000: "“More examples than dimensions” is what it takes to stop a probe from fitting any labels at all (the next step); finding a salient direction takes far fewer.",
  99: `The negated statements' states do carry their truth: a probe retrained on both reads them at ${NUM.w2neg12}, on the next step. This probe's direction doesn't read it.`,
  75: "Not noise: the errors are systematic, as the ranking shows.",
  50: "That is what layer 16 scores, for a different reason (below).",
  30: `Right: ${fmt.pct1(E[12].w.neg.acc)}, and ranked almost perfectly upside down.`,
  "p5:99": "That is probe A's result (100%). B has the same AUROC and catches 0.9%.",
  "p5:50": "What the slider below shows when you drag the threshold down into B's lies.",
  "p5:1": "Right: 0.9%. B ranks deceptive above honest almost perfectly, and both sit below the alarm.",
  "p6:mean": "Right: evaded on 82% of harmful answers, mostly by padding them with text the probe scores low.",
  "p6:max": "It held: evaded on 4.4%. One loud token is enough to flag the answer.",
  "p6:attn": "It held best: 1.8%.",
  "p6:none": "The policy doesn't need the probe's gradients: the reward tells it what gets flagged, and RL searches for text that doesn't.",
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
    const box = document.querySelector(`.guess[data-q="${el.dataset.echo}"]`);
    const opts = box ? [...box.querySelectorAll("button")].map((b) => ({ a: b.dataset.a, label: b.textContent.split(":")[0].trim() })) : [];
    const list = opts.map((o) => `<li class="${o.a === g?.a ? "mine" : ""}"><b>${o.label}</b> ${FEEDBACK[`${el.dataset.echo}:${o.a}`] ?? FEEDBACK[o.a] ?? ""}</li>`).join("");
    el.innerHTML = (g ? `You said <b>${g.text.split(":")[0]}</b>. ` : "") + `<ul class="fb">${list}</ul>`;
    el.classList.toggle("right", !!g?.right);
  });
}

const LEDGER = {
  3: ["Activations or text?", `Could a reader of the text alone get the label? One that knows geography could: the label is a fact about the words, and the model itself answers ${NUM.model_acc} of them when asked. Cheap cues in the text don't carry it: the country's name alone reads ${NUM.country_baseline} (by construction), the statement's spelling ${NUM.text_mlp}. Chapter V meets monitors whose target is spelled out in the text itself.`],
  4: ["Read or used?", `Reading well doesn't make a direction the best handle. By Marks and Tegmark's rule the difference of means moved false statements' answers ${NUM.nie_mm} of the way to true, the logistic direction ${NUM.nie_lr}, mostly because its push is short along Δμ. At each method's best strength, other groups still find probe directions steer worse.`],
  "1b": ["Representation or probe?", "A probe with a hidden layer can compute what it reports, and a linear probe can fail by asking in the wrong basis. Othello's board is linear in mine/yours; the non-linear probe may have recombined two directions (Nanda's speculation)."],
  1: ["Representation or probe?", "A perfect training fit is guaranteed whenever there are no more points than dimensions plus one (here 300 against 1,537). Held-out accuracy and controls are what separate a representation from a probe that memorized."],
  2: ["Concept or dataset?", "This probe partly read (our reading) a quirk of its training data, city–country match: it leans on p as much as on g. Test on shifted data, and read the ranking (AUROC), not only accuracy."],
  "2b": ["Concept or dataset?", "At deployment a probe reads the concept in play, whoever's it is: misalignment probes fired on 97.7% of role-played misaligned reasoning. What it flags is what its training set separated."],
  5: ["At deployment?", "A monitor is a threshold set on other data. Two probes with the same AUROC, 0.999, and the same rule catch 100% and 0.9% of the lies. Report recall at the deployed threshold, and the false alarms it costs."],
  "3b": ["Activations or text?", "In monitoring the behaviour is often spelled out. Remove the tokens that say it and these probes lose 10 to 30 points of AUROC; on models that never say it (sandbagging, sycophancy) they read chance. The probe's evidence beyond the text is its boost over a reader of the text; its cost is the rest of its value."],
  6: ["Under pressure?", "A frozen probe in an RL reward is evaded through the text first: the mean-pooled probe on 82% of harmful answers, the max-pooled one on 4.4%. The pooling that survives pays on long inputs, in false alarms (a hard max) or misses (attention). No gradients through the probe; keep one monitor training never sees."],
  "6b": ["Under pressure?", "And with no pressure at all: after ordinary RL, fresh deception probes read hard-coding at AUC 0.376 and 0.655 (0.991 and 0.996 before), and agents shown the monitor's scores kept their ranking while recall at a frozen threshold fell from 0.95 to 0.41. Re-validate after any training."],
  "4b": ["Read or used?", "A used direction is a handle: it can monitor, flag training data, steer, and prevent drift. Reading well and steering well are separate checks, and a steering result is only as good as its control."],
};
document.querySelectorAll(".ledger").forEach((el) => {
  const [q, a] = LEDGER[el.dataset.qn];
  el.innerHTML = `<span class="ledger-k">Question ${parseInt(el.dataset.qn, 10)} of 6 · ${/b$/.test(el.dataset.qn) ? "more of the answer" : "answered"}</span><b>${q}</b><span>${a}</span>`;
});
d3.selectAll("#six li").attr("title", function () { const L_ = LEDGER[this.dataset.q]; return L_ ? `${L_[0]} ${L_[1]}` : "answered later in the piece"; });

// ---- controls ----
document.querySelectorAll(".toggles").forEach((box) => {
  box.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    ui[box.dataset.for][b.dataset.k] = b.dataset.v;
    box.querySelectorAll(`button[data-k="${b.dataset.k}"]`).forEach((o) => o.classList.toggle("on", o === b));
    if (box.dataset.for === "dial") { setTickOut(); setBaseOut(); }
    const i = window.explainer.current;
    token++;
    const v = views[i]();
    if (v.scene === "pipe") { setReadouts(v.readouts); pipe.show(v.pipe); }
    else if (v.scene === "paper") { setReadouts(v.readouts); paper.show(v.paper); }
    else fig.show({ ...withDrawn(v), choreo: box.dataset.for === "flip" || box.dataset.k === "layer" ? "move" : box.dataset.for === "fit" ? "read" : "move" });
    d3.select("#fig-title").text(v.title);
    d3.select("#fig-badge").html(v.badge);
  });
});
const reg = document.getElementById("reg-c");
const regOut = document.getElementById("reg-out");
const showReg = () => {
  const q = pathEval[ui.reg];
  regOut.innerHTML = `C = ${cLabel(q.C)} (the inverse of the penalty) · <b>${revealed["q-angle"] ? `${Math.round(q.angle)}°` : "?"}</b> from Δμ · <b>${fmt.pct1(q.ev.acc)}</b>`;
};
reg.addEventListener("input", () => {
  ui.reg = Number(reg.value);
  showReg();
  if (window.explainer.current !== STEP.reg) return;
  token++;
  const v = V.reg();
  d3.select("#fig-title").text(v.title);
  fig.show({ ...v, choreo: "move" });
});
showReg();

// the layer slider: each position is a frame of the flipbook (readouts set directly, without a cross-fade)
const layerIn = document.getElementById("layer-l");
const layerOut = document.getElementById("layer-out");
function setLayerOut(L) {
  if (layerIn) layerIn.value = String(L);
  if (layerOut) layerOut.innerHTML = `layer <b>${L}</b> · <b>${fmt.pct1(BL[L].acc)}</b> of new statements`;
}
layerIn?.addEventListener("input", () => {
  ui.layer = Number(layerIn.value);
  setLayerOut(ui.layer);
  if (window.explainer.current !== STEP.layer) return;
  token++;
  const v = V.layer();
  d3.select("#fig-title").text(v.title);
  d3.select("#fig-badge").html(v.badge);
  fig.show({ ...v, readouts: null });
  d3.select("#readouts").interrupt().style("opacity", 1).html(v.readouts);
});
setLayerOut(ui.layer);

// the n slider: each position is one fit of the nested draw
const curveIn = document.getElementById("curve-n");
const curveOut = document.getElementById("curve-out");
function setCurveOut(j) {
  const f = TR.fits[j];
  if (curveIn) curveIn.value = String(j);
  if (curveOut) curveOut.innerHTML = `n = <b>${f.n.toLocaleString("en-US")}</b> · <b>${fmt.pct1(f.acc)}</b> of new statements · ` +
    `<b>${Math.round(trAngle(f))}°</b> from the final probe`;
}
curveIn?.addEventListener("input", () => {
  ui.curve = Number(curveIn.value);
  setCurveOut(ui.curve);
  if (window.explainer.current !== STEP.curve) return;
  token++;
  const v = V.curve();
  d3.select("#fig-title").text(v.title);
  fig.show(withDrawn({ ...v, choreo: "move" }));
});
setCurveOut(ui.curve);

// the push strength: alpha in quarters of Marks and Tegmark's scale, 0 to 2
const pushIn = document.getElementById("push-a");
const pushOut = document.getElementById("push-out");
function setPushOut() {
  const { dir, which, alpha } = ui.push, a = which === "false" ? alpha : -alpha;
  const len = alpha * Math.hypot(...theta[dir]);
  if (pushOut) pushOut.innerHTML = `strength <b>${alpha}×</b> · <b>${len.toFixed(1)}</b> units per layer, ` +
    `${Math.round(5 * len)} by layer 18 (a state is about ${Math.round(PG.h_norm_mean)}) · the model: <b>${krAnswer(dir, which, a) > 0 ? "TRUE" : "FALSE"}</b>`;
}
pushIn?.addEventListener("input", () => {
  ui.push.alpha = Number(pushIn.value) / 4;
  setPushOut();
  if (window.explainer.current !== STEP.push) return;
  token++;
  const v = V.push();
  d3.select("#fig-title").text(v.title);
  fig.show(withDrawn({ ...v, choreo: "move" }));
});
if (pushIn) pushIn.value = String(ui.push.alpha * 4);
setPushOut();

// the dial's threshold: the middle of the slider is the published one (1% of chat)
const tickIn = document.getElementById("tick-t");
const tickOut = document.getElementById("tick-out");
function setTickOut() {
  const st = { probe: ui.dial.probe, traffic: ui.dial.traffic, tick: tickOf(ui.tick) }, r = dialRead(st);
  if (tickOut) tickOut.innerHTML = `flags <b>${fmt.pct1(r.fpr)}</b> of chat · catches <b>${fmt.pct1(r.recall)}</b> of the lies` +
    ` · AUROC <b>${r.auroc.toFixed(3)}</b>${ui.tick === 50 ? " · the published threshold" : ""}`;
}
const BASE = [1, 10, 100, 1000, 10000];
const baseIn = document.getElementById("base-p");
const baseOut = document.getElementById("base-out");
function setBaseOut() {
  const st = { probe: ui.dial.probe, traffic: ui.dial.traffic, tick: tickOf(ui.tick) }, r = dialRead(st);
  const real = BASE[ui.base], fa = r.fpr * (1e6 - real), caught = r.recall * real;
  const oneIn = caught > 0 ? (fa + caught) / caught : Infinity;
  if (baseOut) baseOut.innerHTML = `a million requests a day, <b>${real.toLocaleString("en-US")}</b> real: <b>${Math.round(fa).toLocaleString("en-US")}</b> false alarms · ` +
    `<b>${caught < 10 ? caught.toFixed(1) : Math.round(caught).toLocaleString("en-US")}</b> caught · ${Number.isFinite(oneIn) ? `1 flag in <b>${oneIn < 10 ? oneIn.toFixed(1) : Math.round(oneIn).toLocaleString("en-US")}</b> is real` : "no real case flagged"}`;
}
baseIn?.addEventListener("input", () => { ui.base = Number(baseIn.value); setBaseOut(); });
tickIn?.addEventListener("input", () => {
  ui.tick = Number(tickIn.value);
  setTickOut();
  setBaseOut();
  if (window.explainer.current !== STEP.dial) return;
  token++;
  const v = V.dial();
  d3.select("#fig-title").text(v.title);
  setReadouts(v.readouts);
  paper.show(v.paper);
});
setTickOut();
setBaseOut();

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
