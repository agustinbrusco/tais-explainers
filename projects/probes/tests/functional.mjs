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
const DATA = JSON.parse(await readFile(path.join(root, "projects/probes/web/data/probes.json"), "utf8"));
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
const S = { collect: 0, probe: 1, position: 2, fit: 3, reg: 4, predict: 5, flip: 6, fix: 7, gp: 8 };

// 2. Every number in the prose is the page's computed value
const prose = await page.evaluate(() => [...document.querySelectorAll("[data-n]")].map((el) => [el.dataset.n, el.textContent]));
const NUM = await page.evaluate(() => window.probesNumbers.NUM);
for (const [k, text] of prose) if (k !== "stretch1") check(NUM[k] === text, `prose number ${k}`, text);
check(NUM.aff12 === pct1(L12.acc.w.aff), "layer-12 probe on new cities matches the exporter", NUM.aff12);
check(NUM.neg12_wrong === pct1(1 - L12.acc.w.neg), "the flip's share read wrong matches the exporter", NUM.neg12_wrong);

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

// 5. Which token: the readouts are the exporter's accuracies, and the gold one follows the toggle
await go(S.position);
const r2 = await ro();
check([PA.final, PA.every_mean, PA.every_max, PA.at_in].every((v) => r2.includes(pct1(v))), "Fig. 3 readouts: period, mean, max, “in”", r2.slice(0, 90));
await page.click('.toggles[data-for="pos"] button[data-v="max"]'); await page.waitForTimeout(400);
const gold = await page.evaluate(() => document.querySelector("#readouts .big.gold")?.textContent);
check(gold === pct1(PA.every_max), "the max toggle lights the max readout", gold);

// 6. Fitting proves nothing: 100% train on coin flips, ~50% held out
await go(S.fit);
const F = DATA.fit16;
const r1 = await ro();
check(r1.includes(pct1(F.coin.acc.train)) && r1.includes(pct1(F.coin.acc.held)), "Fig. 4 coin flips: training and new", r1.slice(0, 60));
check(F.coin.acc.train === 1 && Math.abs(F.coin.acc.held - 0.5) < 0.05, "coin flips fit perfectly and generalize at chance");
await page.click('.toggles[data-for="fit"] button[data-v="real"]'); await page.waitForTimeout(400);
check((await ro()).includes(pct1(F.real.acc.held)), "Fig. 4 true labels: new statements", pct1(F.real.acc.held));

// 7. The regularization slider: Δμ at the strong end
await go(S.reg);
await page.evaluate(() => { const r = document.getElementById("reg-c"); r.value = "0"; r.dispatchEvent(new Event("input")); });
await page.waitForTimeout(400);
check((await ro()).startsWith("0°"), "slider at C = 10⁻⁶: 0° from Δμ", (await ro()).slice(0, 30));
await page.evaluate(() => { const r = document.getElementById("reg-c"); r.value = "12"; r.dispatchEvent(new Event("input")); });
await page.waitForTimeout(400);
check((await ro()).startsWith(NUM.path_angle), "slider at C = 100: the path's largest angle", (await ro()).slice(0, 30));

// 8. The predict and its reveal
await go(S.predict);
await page.click('.guess[data-q="p3"] button[data-correct]');
await go(S.flip);
const echo = await page.textContent('[data-echo="p3"]');
check(echo.includes(pct1(L12.acc.w.neg)), "P3 echo states the real share", echo);
const r4 = await ro();
check(r4.includes(pct1(L12.acc.w.neg)) && r4.includes(L12.acc.w.neg_auroc.toFixed(3)), "Fig. 7 readouts: accuracy and AUROC", r4);
const c4 = await page.evaluate(() => window.probesFig.counts);
check(c4.rightTrue + c4.leftFalse === Math.round(L12.acc.w.neg * N), "Fig. 7 counts match the negations' accuracy", JSON.stringify(c4));
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

// 11. Quick checks answer in place
await go(S.fit);
await page.click('.check[data-q="q-fit"] button[data-correct]');
check(await page.$eval('.check[data-q="q-fit"]', (el) => el.classList.contains("answered") && el.classList.contains("right")), "quick check answers in place");

check(errors.length === 0, "no console errors", errors.join(" | "));
await browser.close(); server.close();
console.log(failures ? `\n${failures} failure(s)` : "\nall checks passed");
process.exit(failures ? 1 : 0);
