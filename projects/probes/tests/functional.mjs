// Verified invariants of "What a Probe Reads" (style frame). Run from the repo root:
//   node projects/probes/tests/functional.mjs
// Fails loudly (exit 1) on any mismatch or console error.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const DATA = JSON.parse(await readFile(path.join(root, "projects/probes/build/data/probes.json"), "utf8"));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const server = createServer(async (req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  try { res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(await readFile(p)); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;
let failures = 0;
const check = (ok, what, detail = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${what}${detail ? ` · ${detail}` : ""}`); if (!ok) failures++; };

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

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(`http://localhost:${port}/projects/probes/web/index.html`);
await page.waitForFunction(() => window.explainer && window.probesNumbers);
const go = async (i) => { await page.evaluate((j) => window.explainer.goto(j, { scroll: "instant" }), i); await page.waitForTimeout(500); };
const ro = async () => (await page.textContent("#readouts")).replace(/\s+/g, " ").trim();

// 2. Every number in the prose is the page's computed value
const prose = await page.evaluate(() => [...document.querySelectorAll("[data-n]")].map((el) => [el.dataset.n, el.textContent]));
const NUM = await page.evaluate(() => window.probesNumbers.NUM);
for (const [k, text] of prose) if (k !== "stretch1") check(NUM[k] === text, `prose number ${k}`, text);
check(NUM.aff12 === "99.5%" && NUM.aff12_count === "744", "layer-12 probe on new cities: 744 of 748 = 99.5%");
check(NUM.neg12_wrong === "92.0%" && NUM.neg12_auroc === "0.006", "the flip: 92.0% wrong, AUROC 0.006");

// 3. The dots on paper count the same accuracy the readout states
await go(0);
const c0 = await page.evaluate(() => window.probesFig.counts);
check(c0.rightTrue + c0.leftFalse === 744, "Fig. 1 counts: right-side filled + left-side hollow = 744", JSON.stringify(c0));
check((await ro()).includes("99.5%"), "Fig. 1 readout 99.5%");

// 4. Fitting proves nothing: 100% train on coin flips, ~50% held out
await go(1);
const r1 = await ro();
check(r1.includes("100.0%") && r1.includes("50.3%"), "Fig. 2 coin flips: 100.0% training, 50.3% new", r1.slice(0, 60));
await page.click('.toggles[data-for="fit"] button[data-v="real"]'); await page.waitForTimeout(400);
check((await ro()).includes("99.6%"), "Fig. 2 true labels: 99.6% new");

// 5. The regularization slider: Δμ at the strong end, 54° at the weak end
await go(2);
await page.evaluate(() => { const r = document.getElementById("reg-c"); r.value = "0"; r.dispatchEvent(new Event("input")); });
await page.waitForTimeout(400);
check((await ro()).startsWith("0°"), "slider at C = 10⁻⁶: 0° from Δμ", (await ro()).slice(0, 30));
await page.evaluate(() => { const r = document.getElementById("reg-c"); r.value = "12"; r.dispatchEvent(new Event("input")); });
await page.waitForTimeout(400);
check((await ro()).startsWith("54°"), "slider at C = 100: 54° from Δμ", (await ro()).slice(0, 30));

// 6. The predict and its reveal
await go(3);
await page.click('.guess[data-q="p3"] button[data-correct]');
await go(4);
const echo = await page.textContent('[data-echo="p3"]');
check(/Right: 8\.0%/.test(echo), "P3 echo says right, 8.0%", echo);
const r4 = await ro();
check(r4.includes("8.0%") && r4.includes("0.006"), "Fig. 5 readouts 8.0%, AUROC 0.006", r4);
const c4 = await page.evaluate(() => window.probesFig.counts);
check(c4.rightTrue + c4.leftFalse === 60, "Fig. 5 counts: 60 of 748 negations read correctly", JSON.stringify(c4));
for (const [l, auc] of [["8", "0.026"], ["16", "0.294"]]) {
  await page.click(`.toggles[data-for="flip"] button[data-v="${l}"]`); await page.waitForTimeout(400);
  const r = await ro();
  check(r.includes("50.0%") && r.includes(auc), `layer ${l}: 50.0% at the threshold, AUROC ${auc}`, r);
}

// 7. Retraining and the new topic
await go(5);
check((await ro()).includes("99.2%"), "Fig. 6 retrained: 99.2%");
await page.click('.toggles[data-for="fix"] button[data-v="sp"]'); await page.waitForTimeout(400);
check((await ro()).includes("51.1%"), "Fig. 6 layer 12, Spanish words: 51.1%", await ro());
await page.click('.toggles[data-for="fix"] button[data-v="16"]'); await page.waitForTimeout(400);
const r5 = await ro();
check(r5.includes("91.5%") && r5.includes("98.3%"), "Fig. 6 layer 16, Spanish words: 91.5% and 98.3%", r5);

// 8. General truth
await go(6);
const r6 = await ro();
check(r6.includes("96.8%") && r6.includes("90.6%"), "Fig. 7 along g: 96.8% and 90.6%", r6);

// 9. Quick checks answer in place
await go(1);
await page.click('.check[data-q="q-fit"] button[data-correct]');
check(await page.$eval('.check[data-q="q-fit"]', (el) => el.classList.contains("answered") && el.classList.contains("right")), "quick check answers in place");

check(errors.length === 0, "no console errors", errors.join(" | "));
await browser.close(); server.close();
console.log(failures ? `\n${failures} failure(s)` : "\nall checks passed");
process.exit(failures ? 1 : 0);
