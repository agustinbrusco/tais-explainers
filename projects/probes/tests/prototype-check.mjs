// Prototype smoke check (not yet tests/functional.mjs): run from the repo root with `node projects/probes/tests/prototype-check.mjs`.
// Quick check that the prototype's toggles and guess buttons drive the figure (not the final functional tests).
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const server = createServer(async (req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  try { res.writeHead(200, { "content-type": types[path.extname(p)] ?? "application/octet-stream" }); res.end(await readFile(p)); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(`http://localhost:${port}/projects/probes/web/index.html#1`);
await page.waitForFunction(() => window.explainer?.current === 1); await page.evaluate(() => window.explainer.goto(1, { scroll: "instant" })); await page.waitForTimeout(1200);
const ro = async () => (await page.textContent("#readouts")).replace(/\s+/g, " ").trim();
console.log("step 2 default:", await ro());
await page.click('.toggles[data-for="fit"] button[data-v="held"]'); await page.waitForTimeout(1200);
console.log("coin, new statements:", await ro());
await page.click('.toggles[data-for="fit"] button[data-v="real"]'); await page.waitForTimeout(1200);
console.log("real, new statements:", await ro());
await page.evaluate(() => window.explainer.goto(3, { scroll: "instant" })); await page.waitForTimeout(1200);
await page.click('.guess[data-q="p3"] button[data-correct]');
await page.evaluate(() => window.explainer.goto(4, { scroll: "instant" })); await page.waitForTimeout(1200);
console.log("echo:", await page.textContent('[data-echo="p3"]'));
console.log("step 5:", await ro());
for (const l of ["8", "16"]) { await page.click(`.toggles[data-for="flip"] button[data-v="${l}"]`); await page.waitForTimeout(1200); console.log(`flip L${l}:`, await ro()); }
await page.evaluate(() => window.explainer.goto(5, { scroll: "instant" })); await page.waitForTimeout(1200);
await page.click('.toggles[data-for="fix"] button[data-v="sp"]'); await page.waitForTimeout(1200); console.log("fix L16 sp:", await ro());
await page.click('.toggles[data-for="fix"] button[data-v="12"]'); await page.waitForTimeout(1200); console.log("fix L12 sp:", await ro());
console.log("errors:", errors.length ? errors : "none");
await browser.close(); server.close();
