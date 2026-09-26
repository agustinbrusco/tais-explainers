#!/usr/bin/env node
// Study a reference web page as a visual designer: viewport-by-viewport shots, crops of every large figure, and the
// computed typography of its main elements. For learning craft from pages like Goodfire's research posts.
//
//   node scripts/study_page.mjs https://www.goodfire.com/research/... --out <scratchpad>/study [--width 1440]
//
// Shots are the authors' work: keep them in the scratchpad, never commit them. Write what you learn in
// references/craft/README.md, from actually looking at the images (Read each one).

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const args = process.argv.slice(2);
const url = args.find((a) => /^https?:/.test(a));
const opt = (name, d) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : d; };
const out = opt("out");
if (!url || !out) { console.error("usage: node scripts/study_page.mjs <url> --out <dir> [--width 1440] [--every 900] [--max 60]"); process.exit(2); }
const width = Number(opt("width", 1440)), every = Number(opt("every", 900)), max = Number(opt("max", 60));
await mkdir(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 1000 } });
await page.goto(url, { waitUntil: "networkidle", timeout: 90000 }).catch((e) => console.log("goto:", e.message));
await page.waitForTimeout(2500);
// cookie banners hide content: decline if possible (nothing persists; the browser is fresh every run)
for (const name of [/reject all/i, /decline/i, /accept all/i, /^ok$/i, /got it/i]) {
  const b = page.getByRole("button", { name });
  if (await b.count().catch(() => 0)) { await b.first().click().catch(() => {}); await page.waitForTimeout(800); break; }
}

const H = await page.evaluate(() => document.documentElement.scrollHeight);
let n = 0;
for (let y = 0; y < H && n < max; y += every, n++) {
  await page.evaluate((y) => window.scrollTo(0, y), y);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/vp-${String(n).padStart(2, "0")}.png` });
}
let k = 0;
for (const f of await page.$$("figure, canvas, svg, img, [class*=figure], [class*=widget]")) {
  const bb = await f.boundingBox().catch(() => null);
  if (!bb || bb.width < 300 || bb.height < 150 || k >= max) continue;
  await f.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(400);
  await f.screenshot({ path: `${out}/fig-${String(k++).padStart(2, "0")}.png` }).catch(() => {});
}
const type = await page.evaluate(() => ["body", "h1", "h2", "h3", "p", "figcaption", "code", "a", "button"].map((sel) => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const s = getComputedStyle(e);
  return { sel, font: s.fontFamily, size: s.fontSize, weight: s.fontWeight, lineHeight: s.lineHeight, color: s.color, background: s.backgroundColor };
}).filter(Boolean));
await writeFile(`${out}/typography.json`, JSON.stringify({ url, width, type }, null, 1));
await browser.close();
console.log(`${n} viewport shots, ${k} figure crops, typography.json → ${out}`);
