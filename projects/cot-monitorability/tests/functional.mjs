#!/usr/bin/env node
// Functional checks for the cot-monitorability explorable: the invariants verified by hand in iterations 3–4.
// Run from the repo root:  node projects/cot-monitorability/tests/functional.mjs
// Exit code 1 on any failure. Serves the repo itself (no running server needed).
//
// If a value here changes because the piece changed on purpose, update claims.md in the same commit
// (C-DARKPAST, C-VIZ-TILES, the free-play answers in "Your turn").

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
const server = createServer(async (req, res) => {
  let p = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
  try { res.writeHead(200, { "content-type": MIME[path.extname(p)] ?? "application/octet-stream" }).end(await readFile(p)); }
  catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, r));
const url = `http://localhost:${server.address().port}/projects/cot-monitorability/web/`;

let failures = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `\n     got  ${JSON.stringify(got)}\n     want ${JSON.stringify(want)}`}`);
};

const browser = await chromium.launch();
for (const phone of [false, true]) {
  const page = await browser.newPage(phone ? { viewport: { width: 390, height: 844 }, isMobile: true, reducedMotion: "reduce" }
                                           : { viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(url, { waitUntil: "networkidle" });
  const tag = phone ? "phone" : "desktop";
  const go = async (i) => { await page.evaluate((i) => window.explainer.goto(i), i); await page.waitForTimeout(500); };
  const pastLabel = () => page.evaluate(() => [...document.querySelectorAll("#stage text")].map((t) => t.textContent).find((t) => t.includes("reach it")) ?? null);
  const badge = () => page.textContent("#fig-badge");

  check(`${tag}: step count`, await page.evaluate(() => window.explainer.steps), 26);
  // badges say where the squares are real (step numbers here are 0-based)
  await go(1); check(`${tag}: anatomy badge`, await badge(), "real · gelu-4l · layer 2");
  await go(2); check(`${tag}: standard arithmetic badge`, await badge(), "schematic · real states: gelu-4l");
  await go(8); check(`${tag}: 4-hop badge (reused)`, await badge(), "schematic · reused gelu-4l states");
  await go(11); check(`${tag}: full-bandwidth badge (reused)`, await badge(), "schematic · reused gelu-4l states");
  // the dark past, shown once the route has played
  await go(4); check(`${tag}: dark past, standard`, await pastLabel(), phone ? "15 drawn states reach it in the dark · longest route: 4" : "24 drawn states reach it in the dark · longest route: 4");
  await go(11); check(`${tag}: dark past, full bandwidth`, await pastLabel(), phone ? "19 drawn states reach it in the dark · longest route: 20" : "31 drawn states reach it in the dark · longest route: 32");
  // no dark past on the predict step: it would give the answer away
  await go(3);
  const tile = await page.evaluate(() => { const r = [...document.querySelectorAll("#stage g.tile")].at(-1).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  await page.mouse.move(tile[0], tile[1]); await page.waitForTimeout(200);
  check(`${tag}: no hover on the predict step`, await pastLabel(), null);

  if (!phone) {
    // a guess records the answer and moves on to the reveal
    await page.evaluate(() => window.explainer.goto(3, { scroll: "instant" })); await page.waitForTimeout(500);
    await page.locator("section.step.active .guess button[data-correct]").click(); await page.waitForTimeout(900);
    check("guess advances to the reveal", await page.evaluate(() => window.explainer.current), 4);
    check("guess is echoed", await page.textContent("#g-zig"), "You said “4 hidden states”. Right.");
    // free play: the "Your turn" answers
    const FREE = await page.evaluate(() => [...document.querySelectorAll("[data-step]")].findIndex((s) => s.querySelector("#controls")));
    await go(FREE);
    const read = async () => [await page.textContent("#read-dark"), (await page.textContent("#read-forced")).replace(/\s+/g, " ").trim()];
    const click = async (sel) => { await page.click(sel); await page.waitForTimeout(300); };
    const range = async (id, v) => { await page.$eval(id, (el, v) => { el.value = v; el.dispatchEvent(new Event("input")); }, v); await page.waitForTimeout(250); };
    await click('[data-task="hops"]'); await click('[data-arch="standard"]');
    check("free play: 4-hop, standard", await read(), ["4", "23 then the answer, 21"]);
    await click('[data-arch="looped"]'); await range("#loops", 2);
    check("free play: 4-hop, looped ×2 (Q4)", await read(), ["8", "nothing but the answer, 21"]);
    await click('[data-task="arith"]'); await click('[data-arch="coconut"]'); await range("#k", 3);
    check("free play: Coconut, 3 steps", await read(), ["12", "nothing but the answer, 34"]);
    await range("#k", 16);
    check("free play: Coconut, 16 steps (Q3)", await read(), ["12", "374 then the answer, 735"]);
    await click('[data-arch="fullbw"]'); await range("#k", 12);
    check("free play: full bandwidth, 12 steps (Q2)", await read(), ["32", "nothing but the answer, 374"]);
    await click('[data-arch="looped"]'); await range("#loops", 3); await range("#k", 12);
    check("free play: looped ×3, 12 steps (Q1)", await read(), ["12", "nothing but the answer, 374"]);
  }
  check(`${tag}: no console errors`, errors, []);
  await page.close();
}
await browser.close();
server.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
