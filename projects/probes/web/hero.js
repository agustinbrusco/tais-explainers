// The hero: 748 real hidden states in a view that ignores the probe's direction; their truth labels appear; the view
// turns (an honest rotation through the layer-12 basis) until the probe's direction lies flat; its level sets draw in;
// each statement's score falls through the glass onto a paper strip. No negation, no example counts, no steering:
// it spoils none of the predicts.
import * as d3 from "d3";
import { Figure } from "./figure.js";
import { dot, unit, orthTo, auroc, scores, accuracy } from "./lin.js";

export function startHero(svgEl, DATA, { reduced = false, narrow = false } = {}) {
  const W = 640, H = narrow ? 560 : 600;
  const layout = narrow
    ? { W, H, glass: { x0: 12, y0: 12, x1: 628, y1: 420, rx: 14 }, pileTop: 432, floor: 520, ptR: 4.2, dotR: 3.4, cardY: -200, font: 24 }
    : { W, H, glass: { x0: 14, y0: 18, x1: 626, y1: 450, rx: 14 }, pileTop: 462, floor: 560, ptR: 3.1, dotR: 2.3, cardY: -200, font: 22 };
  const svg = d3.select(svgEl).attr("viewBox", `0 0 ${W} ${H}`).attr("preserveAspectRatio", "xMidYMid meet");
  // the paper strip the scores land on (the hero itself is glass)
  const paper = svg.append("rect").attr("class", "hero-paper").attr("x", layout.glass.x0).attr("y", layout.glass.y1 + 6)
    .attr("width", layout.glass.x1 - layout.glass.x0).attr("height", H - layout.glass.y1 - 12).attr("rx", 10);
  const fig = new Figure(svgEl, layout, { reduced });
  svg.classed("hero-fig", true);

  const L = DATA.layers["12"], P = L.probes;
  const idx = narrow ? DATA.show : d3.range(DATA.label.aff.length);
  const rows = L.coords.aff, y = DATA.label.aff;
  const w = unit(P.w.coef), v = orthTo(P.v.coef, w);
  // the opening view: the two basis directions (orthogonal to the probe's) along which true and false separate least
  const k = rows[0].length;
  const basis = d3.range(k).map((j) => d3.range(k).map((q) => (q === j ? 1 : 0)));
  const cand = basis.map((e) => ({ e, sep: Math.abs(auroc(rows.map((r) => dot(r, e)), y) - 0.5) }))
    .filter((c) => Math.abs(dot(c.e, w)) < 1e-6).sort((a, b) => a.sep - b.sep);
  const f0 = { u: cand[0].e, v: orthTo(cand[1].e, cand[0].e) };
  const f1 = { u: w, v };
  const probe = { ...P.w, kind: "lr" };

  const pts = (truth) => idx.map((i) => ({ key: `h${i}`, c: rows[i], truth: truth ? y[i] : null, shape: "c", text: DATA.text.aff[i] }));
  const fit = (frame, aspect, pr) => fig.fitScale({ frame, aspect, probe: pr }, rows);
  const sc0 = fit(f0, "equal", null);
  const sc1 = fit(f1, "fit", probe);
  const [GX] = fig.glassCenter();
  const psc1 = { k: sc1.kx / probe.norm, x0: GX + (probe.thr - sc1.cx) * sc1.kx };
  const psc0 = { k: psc1.k, x0: psc1.x0 };
  const order = idx.slice().sort((a, b) => dot(rows[a], w) - dot(rows[b], w)).map((i) => `h${i}`);
  const acc = accuracy(scores(rows, probe), y);
  const cap = document.getElementById("hero-caption");
  const say = (t) => { if (cap) cap.innerHTML = t; };
  const final = `each statement's score falls onto the paper, one dot per statement · <b>${(100 * acc.acc).toFixed(1)}%</b> of ${acc.n} new statements read correctly`;
  const big = { interrupt: () => big, style: () => big, transition: () => ({ duration: () => ({ style: () => {} }) }) };

  const base = { layer: 12, space: "hero", lattice: null, paperLabel: "", counts: false, glassLabel: "" };
  const V0 = { ...base, pts: pts(false), frame: f0, sc: sc0, psc: psc0, probe: null, paper: false, choreo: "cut" };
  const V1 = { ...base, pts: pts(true), frame: f0, sc: sc0, psc: psc0, probe: null, paper: false, choreo: "move" };
  const V2 = { ...base, pts: pts(true), frame: f1, sc: sc1, psc: psc1, probe, paper: false, choreo: "move" };
  const V3 = { ...base, pts: pts(true), frame: f1, sc: sc1, psc: psc1, probe, choreo: "read", _order: order };

  const sleep = (ms) => new Promise((r) => d3.timeout(r, reduced ? 0 : ms));
  let running = false;
  async function play() {
    if (running) return;
    running = true;
    paper.interrupt().style("opacity", 0);
    fig.cur = null; fig.pts.forEach((s) => { s.el?.remove(); s.dotEl?.remove(); s.ringEl?.remove(); }); fig.pts.clear();
    await fig.show(V0);
    say("748 statements about cities, as 1,536 numbers each, seen in a view that ignores the probe");
    await sleep(1300);
    await fig.show(V1);
    say("filled: true · hollow: false · in this view they overlap");
    await sleep(900);
    await fig.show({ ...V2, choreo: "move" });
    say("the view turns until the probe's direction lies flat");
    await sleep(400);
    paper.transition().duration(reduced ? 0 : 500).style("opacity", 0.96);
    say("each statement's score falls onto the paper, one dot per statement");
    await fig.show(V3);
    say(final);
    running = false;
  }
  if (reduced) { fig.show({ ...V3, choreo: "cut" }); say(final); }
  else {
    // start when the hero is on screen; pause-free (it plays once), with a replay control
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); play(); } }, { threshold: 0.3 });
    io.observe(svgEl);
  }
  const btn = document.createElement("button");
  btn.className = "hero-replay"; btn.type = "button"; btn.textContent = "↻ replay";
  btn.addEventListener("click", () => play());
  svgEl.closest(".hero").append(btn);
  return { play };
}
