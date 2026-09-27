// Verified invariants of "What a Probe Reads". Run from the repo root:
//   node projects/probes/tests/functional.mjs
// Every expected value comes from the exporter's full-precision numbers (web/data/probes.json), so the checks survive a
// regeneration of the data; what they verify is that the page computes, draws and says the same numbers.
// Fails loudly (exit 1) on any mismatch or console error.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const load = async (f) => JSON.parse(await readFile(path.join(root, "projects/probes/web/data", f), "utf8"));
const DATA = await load("probes.json"), FIND = await load("find.json"), PUSH = await load("push.json"), MON = await load("monitor.json");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const server = createServer(async (req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  try { res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(await readFile(p)); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;
let failures = 0;
const check = (ok, what, detail = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${what}${detail ? ` · ${detail}` : ""}`); if (!ok) failures++; };
const pct1 = (v) => `${(100 * v).toFixed(1)}%`;
const L12 = DATA.layers["12"], N = DATA.label.aff.length;

// 1. The page recomputes accuracies from 3-decimal coordinates; they must match the exporter's full-precision numbers
//    within one statement.
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const accOf = (L, probe, set) => {
  const P = DATA.layers[L].probes[probe], rows = DATA.layers[L].coords[set], y = DATA.label[set];
  const k = P.norm ?? 1;
  return rows.filter((r, i) => ((k * (dot(r, P.coef) - P.thr)) > 0 ? 1 : 0) === y[i]).length / rows.length;
};
for (const L of ["8", "12", "16"]) for (const p of ["w", "dmu", "w2", "tG"]) for (const set of ["aff", "neg", "sp", "negsp"]) {
  const want = DATA.layers[L].acc[p]?.[set];
  if (want == null) continue;
  const got = accOf(L, p, set);
  check(Math.abs(got - want) <= 1 / DATA.layers[L].coords[set].length + 5e-4, `L${L} ${p} on ${set}`, `${got.toFixed(4)} vs ${want}`);
}
// the pipeline's exact fact: before the country, a true statement and its false twin are the same input
const PL = DATA.pipeline, PA = PL.acc[String(PL.layer)];
check(PA.at_in_identical === true, "states over “in” are identical for every city's true and false statement");
check(Math.abs(PA.at_in - 0.5) < 0.02, "a probe reading “in” is at chance", `${PA.at_in}`);
const sT = PL.scores[String(PL.layer)].true.every, sF = PL.scores[String(PL.layer)].false.every;
const firstDiff = sT.findIndex((v, i) => v !== sF[i]);
check(firstDiff === PL.tokens.true.length - 2, "per-token scores coincide until the country token", `first difference at ${firstDiff}`);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(`http://localhost:${port}/projects/probes/web/index.html`);
await page.waitForFunction(() => window.explainer && window.probesNumbers);
const go = async (i) => { await page.evaluate((j) => window.explainer.goto(j, { scroll: "instant" }), i); await page.waitForTimeout(500); };
const ro = async () => (await page.textContent("#readouts")).replace(/\s+/g, " ").trim();
const S = Object.fromEntries((await page.evaluate(() => window.probesSteps())).map((k, i) => [k, i]));
check(await page.evaluate(() => document.querySelectorAll("[data-step]").length) === Object.keys(S).length, "one prose step per view", JSON.stringify(S));

// 2. Every number in the prose is the page's computed value
const prose = await page.evaluate(() => [...document.querySelectorAll("[data-n]")].map((el) => [el.dataset.n, el.textContent]));
const NUM = await page.evaluate(() => window.probesNumbers.NUM);
for (const [k, text] of prose) if (k !== "stretch1") check(NUM[k] === text, `prose number ${k}`, text);
// the static text a reader without JavaScript sees (and search engines index) agrees with the computed values too
const raw = await page.evaluate(async () => (await fetch(location.href)).text());
const stale = [...raw.matchAll(/data-n="([^"]+)">([^<]*)</g)].filter(([, k, t]) => k !== "stretch1" && NUM[k] !== undefined && NUM[k] !== t)
  .map(([, k, t]) => `${k}: "${t}" ≠ "${NUM[k]}"`);
check(stale.length === 0, "the static placeholders match the computed numbers", stale.join("; "));
check(NUM.aff12 === pct1(L12.acc.w.aff), "layer-12 probe on new cities matches the exporter", NUM.aff12);
check(NUM.neg12_wrong === pct1(1 - L12.acc.w.neg), "the flip's share read wrong matches the exporter", NUM.neg12_wrong);

// 2b. The prologue: a paper scene with the three labs
await go(S.prologue);
check(Number(await page.evaluate(() => getComputedStyle(document.querySelector(".paper-root")).opacity)) > 0.9, "the paper scene is visible on the prologue");
check(await page.evaluate(() => document.querySelectorAll(".pv-prologue .q-card").length) === 3, "three labs, one card each");

// 2c. Why linear: the toggle swaps the probe
await go(S.linear);
await page.click('.toggles[data-for="linear"] button[data-v="mlp"]'); await page.waitForTimeout(400);
check(Number(await page.evaluate(() => getComputedStyle(document.querySelector(".q-probe-mlp")).opacity)) > 0.9 &&
  Number(await page.evaluate(() => getComputedStyle(document.querySelector(".q-probe-lin")).opacity)) < 0.1, "the probe toggle shows the hidden-layer probe");

// 3. A statement becomes a data point
await go(S.collect);
const pipeOn = await page.evaluate(() => getComputedStyle(document.querySelector(".pipe-root")).opacity);
check(Number(pipeOn) > 0.9, "the pipeline scene is visible on step 1");
check((await ro()).includes("1,536"), "readout: 1,536 numbers in h");
check(await page.evaluate(() => document.querySelectorAll(".p-chip").length) === PL.tokens.true.length, "one chip per token");

// 4. The probe: the paper counts the same accuracy the readout states
await go(S.probe);
const figOn = await page.evaluate(() => getComputedStyle(document.querySelector(".fig-root")).opacity);
check(Number(figOn) > 0.9, "the probe figure is visible on step 2");
const c0 = await page.evaluate(() => window.probesFig.counts);
check(c0.rightTrue + c0.leftFalse === Math.round(L12.acc.w.aff * N), "Fig. 2 counts: right-side true + left-side false = correct",
  JSON.stringify(c0));
check((await ro()).includes(NUM.aff12), "Fig. 2 readout", NUM.aff12);

// 5. Which token: a probe per position. "in" is held back until the quick check is answered, then exactly 50%
await go(S.position);
const BP = PL.by_position;
check((await ro()).startsWith("?"), "Fig. 3 holds back the “in” readout until the check is answered", (await ro()).slice(0, 40));
check(await page.$eval('[data-after="q-in"]', (el) => getComputedStyle(el).display === "none"), "the paragraph that gives the answer waits for it");
await page.click('.check[data-q="q-in"] button[data-correct]'); await page.waitForTimeout(500);
const r2 = await ro();
check([BP.in, BP.country_last, BP.period].every((v) => r2.includes(pct1(v))), "Fig. 3 readouts after the check: “in”, country, period", r2.slice(0, 90));
check(BP.in === 0.5 && ["The", "city", "of", "city_first", "city_last", "is"].every((k) => BP[k] === 0.5), "every position before the country is at chance");
await page.click('.toggles[data-for="pos"] button[data-v="country"]'); await page.waitForTimeout(400);
check((await page.evaluate(() => document.querySelector("#readouts .big.gold")?.textContent)) === pct1(BP.country_last), "the toggle lights the country readout");

// 5b. Every token, pooled: the max readout is held back until its check is answered
await go(S.pooling);
const r3 = await ro();
check(r3.includes(pct1(PA.mean)) && r3.includes(pct1(PA.every_mean)) && r3.includes("?"), "Fig. 4 readouts: mean state, mean of scores, max held", r3.slice(0, 90));
await page.click('.check[data-q="q-max"] button[data-correct]'); await page.waitForTimeout(500);
check((await ro()).includes(pct1(PA.every_max_own)) && (await ro()).includes(pct1(PA.every_max)), "Fig. 4 max readout after the check: own threshold and at 0");
await page.click('.toggles[data-for="pool"] button[data-v="miss"]'); await page.waitForTimeout(500);
check(await page.evaluate(() => document.querySelectorAll(".p-chip").length) === PL.max_miss.tokens.length, "the misread statement's tokens replace Krasnodar's");

// 5c. Which layer: a flipbook of every layer; layer 0 is one point
await go(S.layer);
check((await ro()).includes(pct1(DATA.by_layer[12].acc)), "Fig. 5 readout at layer 12", pct1(DATA.by_layer[12].acc));
check(DATA.by_layer[0].identical === true && DATA.by_layer[0].acc === 0.5, "layer 0: every statement's state is the same");

// 6. Fitting proves nothing: 100% train on coin flips, ~50% held out
await go(S.fit);
const F = DATA.fit16;
const r1 = await ro();
const heldAcc = (f) => f.held.x.filter((x, i) => ((x - f.thr > 0 ? 1 : 0) === f.held.label[i])).length / f.held.x.length;
check(r1.includes("100.0%") && r1.includes(pct1(heldAcc(F.coin))), "Fig. 6 coin flips: training and new (from the drawn points)", r1.slice(0, 60));
check(Math.abs(heldAcc(F.coin) - F.coin.acc.held) <= 1 / F.coin.held.x.length + 5e-4, "the drawn points' accuracy matches the exporter's");
check(F.coin.acc.train === 1 && Math.abs(F.coin.acc.held - 0.5) < 0.05, "coin flips fit perfectly and generalize at chance");
await page.click('.toggles[data-for="fit"] button[data-v="real"]'); await page.waitForTimeout(400);
check((await ro()).includes(pct1(heldAcc(F.real))), "Fig. 6 true labels: new statements", pct1(heldAcc(F.real)));

// 6b. How many examples: the trainer's readouts are this draw's fits; the final fit is the pinned probe
const TR = FIND.trainer;
check(TR.fits[TR.fits.length - 1].acc === DATA.layers["16"].acc.w.aff, "the trainer's last fit is Fig. 2's recipe at layer 16",
  `${TR.fits[TR.fits.length - 1].acc} vs ${DATA.layers["16"].acc.w.aff}`);
await go(S.curve);
check((await ro()).includes(pct1(TR.fits[2].acc)), "Fig. curve at n = 8: this draw's held-out accuracy", pct1(TR.fits[2].acc));
check(await page.evaluate(() => document.querySelectorAll("#fig .ring").length) === Math.min(TR.fits[2].n, TR.train.coords.length), "one ring per fitted statement");
const c8 = await page.evaluate(() => window.probesFig.counts);
check(c8.rightTrue + c8.leftFalse === Math.round(TR.fits[2].acc * N), "the paper counts only held-out statements, and matches the readout", JSON.stringify(c8));
await page.evaluate(() => { const r = document.getElementById("curve-n"); r.value = "0"; r.dispatchEvent(new Event("input")); });
await page.waitForTimeout(400);
check((await ro()).includes(pct1(TR.fits[0].acc)), "the slider at n = 2", pct1(TR.fits[0].acc));
const c16 = FIND.curve["16"];
check(c16.n[c16.lr.findIndex((r) => r.mean >= 0.95)] === Number(NUM.c16_first95), "the first n whose mean clears 95%", NUM.c16_first95);

// 7. The regularization slider: Δμ at the strong end; the angle is held back until its check is answered
await go(S.reg);
check((await ro()).startsWith("?"), "Fig. 7 holds back the angle until the check", (await ro()).slice(0, 20));
await page.click('.check[data-q="q-angle"] button[data-correct]'); await page.waitForTimeout(500);
await page.evaluate(() => { const r = document.getElementById("reg-c"); r.value = "0"; r.dispatchEvent(new Event("input")); });
await page.waitForTimeout(400);
check((await ro()).startsWith("0°"), "slider at C = 10⁻⁶: 0° from Δμ", (await ro()).slice(0, 30));
await page.evaluate(() => { const r = document.getElementById("reg-c"); r.value = "12"; r.dispatchEvent(new Event("input")); });
await page.waitForTimeout(400);
check((await ro()).startsWith(NUM.path_angle), "slider at C = 100: the path's largest angle", (await ro()).slice(0, 30));

// 7b. Contrast pairs: one segment per held-out city; cosines and the unsupervised direction from the exporter
await go(S.pairs);
const PR = FIND.pairs;
check((await ro()).includes(PR["12"].cos_mean.toFixed(2)) && (await ro()).includes(pct1(PR["12"].pca_acc)), "pairs readouts at layer 12", await ro());
check(await page.evaluate(() => (document.querySelector("#fig .pair")?.getAttribute("d").match(/M/g) ?? []).length) === N / 2, "one segment per held-out city");
await page.click('.toggles[data-for="pairs"] button[data-v="8"]'); await page.waitForTimeout(400);
check((await ro()).includes(pct1(PR["8"].pca_acc)), "layer 8: the unsupervised direction reads at chance", pct1(PR["8"].pca_acc));

// 7c. Othello: the drawn board is the position its moves produce; the reveal ends on mine/yours
const ob = await page.evaluate(async () => (await import("./diagrams.js")).OTHELLO);
{
  const cols = "abcdefgh", B = Array.from({ length: 8 }, () => Array(8).fill("."));
  const at = (m) => [Number(m[1]) - 1, cols.indexOf(m[0])];
  [["d4", "W"], ["e5", "W"], ["d5", "B"], ["e4", "B"]].forEach(([m, c]) => { const [r, q] = at(m); B[r][q] = c; });
  let c = "B", legal = true;
  for (const m of ob.moves) {
    const [r, q] = at(m), o = c === "B" ? "W" : "B", fl = [];
    for (const [dr, dq] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
      let rr = r + dr, qq = q + dq; const line = [];
      while (rr >= 0 && rr < 8 && qq >= 0 && qq < 8 && B[rr][qq] === o) { line.push([rr, qq]); rr += dr; qq += dq; }
      if (line.length && rr >= 0 && rr < 8 && qq >= 0 && qq < 8 && B[rr][qq] === c) fl.push(...line);
    }
    if (B[r][q] !== "." || !fl.length) legal = false;
    B[r][q] = c; fl.forEach(([rr, qq]) => { B[rr][qq] = c; });
    c = o;
  }
  check(legal && B.map((r) => r.join("")).join("|") === ob.cells.join("|") && c === ob.toMove, "the Othello board is the position its 12 moves produce");
}
await go(S.othello);
check((await ro()).includes("99.6%"), "the Othello reveal ends on mine/yours (99.6%)", await ro());

// 8. The predict and its reveal
await go(S.predict);
await page.click('.guess[data-q="p3"] button[data-correct]');
await go(S.flip);
const echo = await page.textContent('[data-echo="p3"]');
check(echo.includes(pct1(L12.acc.w.neg)), "P3 echo states the real share", echo);
const r4 = await ro();
check(r4.includes(pct1(L12.acc.w.neg)) && r4.includes(L12.acc.w.neg_auroc.toFixed(3)), "Fig. 9 readouts: accuracy and AUROC", r4);
const c4 = await page.evaluate(() => window.probesFig.counts);
check(c4.rightTrue + c4.leftFalse === Math.round(L12.acc.w.neg * N), "Fig. 9 counts match the negations' accuracy", JSON.stringify(c4));
for (const l of ["8", "16"]) {
  await page.click(`.toggles[data-for="flip"] button[data-v="${l}"]`); await page.waitForTimeout(400);
  const r = await ro(), A = DATA.layers[l].acc.w;
  check(r.includes(pct1(A.neg)) && r.includes(A.neg_auroc.toFixed(3)), `layer ${l}: accuracy and AUROC on negations`, r);
}

// 9. Retraining and the new topic
await go(S.fix);
check((await ro()).includes(pct1(L12.acc.w2.aff)), "Fig. 8 retrained, layer 12", pct1(L12.acc.w2.aff));
await page.click('.toggles[data-for="fix"] button[data-v="sp"]'); await page.waitForTimeout(400);
check((await ro()).includes(pct1(L12.acc.w2.sp)), "Fig. 8 layer 12, Spanish words", await ro());
await page.click('.toggles[data-for="fix"] button[data-v="16"]'); await page.waitForTimeout(400);
const r5 = await ro(), A16 = DATA.layers["16"].acc.w2;
check(r5.includes(pct1(A16.sp)) && r5.includes(pct1(A16.negsp)), "Fig. 8 layer 16, Spanish words and negations", r5);

// 10. General truth
await go(S.gp);
const r6 = await ro(), T16 = DATA.layers["16"].acc.tG;
check(r6.includes(pct1(T16.aff)) && r6.includes(pct1(T16.neg)), "Fig. 9 along g: both polarities", r6);

// 10b. The push: Marks and Tegmark's normalized effects, and the model's own answer on the slider
await go(S.push);
const NIE = PUSH.nie.cities, j1 = PUSH.meta.alphas.indexOf(1);
check((await ro()).includes(`${NIE.mm.f2t[j1].toFixed(2)} · ${NIE.lr.f2t[j1].toFixed(2)}`), "push readout: NIE along Δμ and along w", await ro());
check(NIE.mm.f2t[j1] > NIE.lr.f2t[j1], "the difference of means moves the model more than the logistic direction", `${NIE.mm.f2t[j1]} vs ${NIE.lr.f2t[j1]}`);
const kr = PUSH.krasnodar, i0 = kr.alphas.indexOf(0);
check(kr.mm.false[i0] === kr.lr.false[i0] && kr.mm.true[i0] === kr.lr.true[i0], "unpushed answers agree between the two sweeps");
check(Math.abs(PUSH.geometry.cos_w_dmu - dot(DATA.layers["16"].probes.w.coef, DATA.layers["16"].probes.dmu.coef)) < 2e-3, "the push's directions are the exported layer-16 probes");

// 10c. The matched push: the Δμ push as long along Δμ as the w push, at every strength
{
  const M = PUSH.nie.cities.mm_matched, c2 = PUSH.geometry.cos_w_dmu ** 2;
  check(M && M.alphas.every((a, i) => Math.abs(a - PUSH.meta.alphas[i] * c2) < 1e-3), "matched strengths are α·cos² of the w push's", JSON.stringify(M?.alphas));
  check(Math.abs(M.f2t[j1] - NIE.lr.f2t[j1]) < 0.05, "at equal movement along Δμ the two pushes move false statements about equally", `${M.f2t[j1]} vs ${NIE.lr.f2t[j1]}`);
}

// 12. Chapter IV: the same probe as a monitor. The flag count is the drawn probe's, from the exporter's scores
await go(S.job);
{
  const P = L12.probes.w, k = P.norm ?? 1;
  const flagged = L12.coords.aff.filter((r) => k * (dot(r, P.coef) - P.thr) <= 0).length;
  check((await ro()).startsWith(`${flagged.toLocaleString("en-US")}`), "the monitor's flag count: statements read as false", (await ro()).slice(0, 40));
  check(await page.evaluate(() => (document.querySelectorAll(".hist-u")[1]?.getAttribute("d") ?? "").length > 20), "labels unknown: one grey histogram on paper");
  await page.click('.toggles[data-for="job"] button[data-v="science"]'); await page.waitForTimeout(400);
  check((await ro()).startsWith(pct1(L12.acc.w.aff)), "science: the labelled accuracy", (await ro()).slice(0, 20));
}
// the counterparts board holds Claude Haiku 3.5's number until its check is answered
await go(S.lies);
check((await ro()).includes("?") && await page.evaluate(() => document.querySelectorAll(".cp-chip.held").length === 1), "the board holds the other-model AUROC back");
await page.click('.check[data-q="q-recipe"] button[data-correct]'); await page.waitForTimeout(500);
check((await ro()).includes("0.696") && await page.evaluate(() => document.querySelector(".pv-lies").textContent.includes("0.696")), "answered: 0.696 on the board and in the readout");

// 13. The dial: at the published threshold the drawn samples reproduce the published rows
await go(S.dial);
const dialRO = async () => (await ro()).replace(/\s+/g, " ");
{
  const r = await dialRO();
  check(r.includes("0.999") && r.includes("1.0%") && r.includes("100.0%"), "probe A: AUROC 0.999, 1% of chat, recall 100%", r.slice(0, 120));
  await page.click('.toggles[data-for="dial"] button[data-v="B"]'); await page.waitForTimeout(600);
  const rB = await dialRO();
  check(rB.includes("0.999") && rB.includes("1.0%") && rB.includes("0.9%"), "probe B: the same AUROC and threshold, recall 0.9%", rB.slice(0, 120));
  await page.click('.toggles[data-for="dial"] button[data-v="bd"]'); await page.waitForTimeout(600);
  const rD = await dialRO();
  check(rD.includes("0.844") && rD.includes("100.0%"), "Backdoors: AUROC 0.844, recall 100%", rD.slice(0, 120));
  await page.evaluate(() => { const t = document.getElementById("tick-t"); t.value = "80"; t.dispatchEvent(new Event("input")); });
  await page.waitForTimeout(600);
  check(!(await dialRO()).includes("the published threshold") && (await dialRO()).includes("0.844"), "moving the threshold changes the operating point, not the ranking");
  await page.evaluate(() => { const t = document.getElementById("tick-t"); t.value = "50"; t.dispatchEvent(new Event("input")); });
  await page.click('.toggles[data-for="dial"] button[data-v="A"]'); await page.click('.toggles[data-for="dial"] button[data-v="it"]');
  check(Math.abs(MON.meta.tick - 2.3268) < 1e-3, "the published threshold: 1% of the 1,000 drawn chat samples above it");
}
// 14. The held-back numbers of chapters IV–V
await go(S.leak);
await page.click('.toggles[data-for="leak"] button[data-v="organism"]'); await page.waitForTimeout(500);
check((await ro()).startsWith("?"), "the silent organism's AUROC waits for its check");
await page.click('.check[data-q="q-organism"] button[data-correct]'); await page.waitForTimeout(500);
check((await ro()).startsWith("0.50"), "answered: 0.50", (await ro()).slice(0, 10));
await go(S.pressure);
check((await ro()).includes("82%") && (await ro()).includes("4.4% · 1.8%"), "Gupta and Jenner's evasion rates", (await ro()).slice(0, 80));
await go(S.drift);
check((await ro()).includes("0.991 · 0.996 → ?"), "the Atlas numbers wait for their check");
await page.click('.check[data-q="q-drift"] button[data-correct]'); await page.waitForTimeout(500);
check((await ro()).includes("0.991 → 0.376 · 0.996 → 0.655"), "answered: Table 4's two rows", (await ro()).slice(0, 40));
await page.click('.toggles[data-for="drift"] button[data-v="told"]'); await page.waitForTimeout(3500);
check((await ro()).includes("0.975 → 0.912") && (await ro()).includes("0.95 → 0.41"), "told, not trained: Das and colleagues' four numbers");
check(await page.evaluate(() => document.querySelector(".pv-das-seq .d-bracket")?.textContent.includes("AUROC 0.912")), "the drawn samples reproduce 0.912 after feedback");
await go(S.contested);
check(await page.evaluate(() => document.querySelectorAll(".m-crate.held").length === 1), "the GLM-5 control bar waits for its check");
await page.click('.check[data-q="q-control"] button[data-correct]'); await page.waitForTimeout(800);
check(await page.evaluate(() => document.querySelectorAll(".m-crate.held").length === 0) && (await ro()).includes("80%"), "answered: up to 80%");
await go(S.check);
check(await page.evaluate(() => document.querySelectorAll(".cy details").length) === 5, "five check-yourself questions, each with a held-back answer");

// 11. Quick checks answer in place
await go(S.fit);
await page.click('.check[data-q="q-conf"] button[data-correct]');
check(await page.$eval('.check[data-q="q-conf"]', (el) => el.classList.contains("answered") && el.classList.contains("right")), "quick check answers in place");
// P3's reveal lists every option's feedback, the reader's own marked
await go(S.flip);
check(await page.evaluate(() => document.querySelectorAll('[data-echo="p3"] .fb li').length) === 4, "P3's reveal shows all four options' feedback");

// 12. A fast scroll (a reload mid-page, the scrollbar dragged) stacks interrupted transitions: nothing may go NaN or vanish
await go(0); await page.waitForTimeout(800);
await page.evaluate((j) => document.querySelectorAll("[data-step]")[j].scrollIntoView({ behavior: "smooth", block: "center" }), S.contested);
await page.waitForTimeout(3500);
await page.evaluate((j) => document.querySelectorAll("[data-step]")[j].scrollIntoView({ behavior: "smooth", block: "center" }), S.push);
await page.waitForTimeout(9000);
const ptsNow = await page.evaluate(() => { const p = [...document.querySelectorAll("#fig g.pts path.pt")];
  return { n: p.length, ok: p.filter((e) => +getComputedStyle(e).opacity > 0.5 && !/NaN/.test(e.getAttribute("transform") ?? "")).length }; });
check(ptsNow.n > 0 && ptsNow.ok === ptsNow.n, "after a fast scroll down and back, every point is drawn", JSON.stringify(ptsNow));

check(errors.length === 0, "no console errors", errors.slice(0, 3).join(" | "));
await browser.close(); server.close();
console.log(failures ? `\n${failures} failure(s)` : "\nall checks passed");
process.exit(failures ? 1 : 0);
