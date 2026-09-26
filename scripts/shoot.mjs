#!/usr/bin/env node
// Screenshot a web explainer at each of its steps, and report console errors.
//
//   node scripts/shoot.mjs projects/<slug>/web/index.html                # every step
//   node scripts/shoot.mjs projects/<slug>/web/index.html --steps 0,3,5 --mobile
//   node scripts/shoot.mjs http://localhost:8000/ --out /tmp/shots
//
// Pages opt in by exposing `window.explainer = { steps: number, goto(i, {scroll}): Promise|void }`
// (see kit/starters/web). Without it, one full-page shot is taken.
// Local files are served over HTTP (ES modules don't load from file://).
// Exit code 1 if the page logged errors, so this doubles as a smoke test.

import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

const VALUE_FLAGS = new Set(["steps", "out", "width", "height", "settle"]);
const args = process.argv.slice(2);
const opts = {};
const positional = [];
for (let i = 0; i < args.length; i++) {
  const name = args[i].startsWith("--") ? args[i].slice(2) : null;
  if (name === null) positional.push(args[i]);
  else opts[name] = VALUE_FLAGS.has(name) ? args[++i] : true;
}
const flag = (name, dflt) => opts[name] ?? dflt;
const target = positional[0];
if (!target) {
  console.error("usage: node scripts/shoot.mjs <file-or-url> [--steps 0,2] [--out dir] [--mobile] [--width 1280 --height 800]");
  process.exit(2);
}
const mobile = Boolean(opts.mobile);
const width = Number(flag("width", mobile ? 390 : 1280));
const height = Number(flag("height", mobile ? 844 : 800));
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".woff2": "font/woff2" };

let server, url = target;
if (!/^https?:/.test(target)) {
  // Serve from the repo root so pages can reach ../../kit/web/tokens.css etc.
  const root = process.cwd();
  const abs = path.resolve(target);
  server = createServer(async (req, res) => {
    let p = path.join(root, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (existsSync(p) && statSync(p).isDirectory()) p = path.join(p, "index.html");
    try {
      const body = await readFile(p);
      res.writeHead(200, { "content-type": MIME[path.extname(p)] ?? "application/octet-stream" }).end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((resolve) => server.listen(0, resolve));
  url = `http://localhost:${server.address().port}/${path.relative(root, abs)}`;
}

const outDir = flag("out", server ? path.join(path.dirname(path.resolve(target)), "..", "build", "shots") : "build/shots");
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1 });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts?.ready);

const nSteps = await page.evaluate(() => window.explainer?.steps ?? 0);
const tag = mobile ? "mobile" : `${width}`;
const shots = [];
if (!nSteps) {
  const f = path.join(outDir, `page-${tag}.png`);
  await page.screenshot({ path: f, fullPage: true });
  shots.push(f);
} else {
  const want = flag("steps") ? flag("steps").split(",").map(Number) : [...Array(nSteps).keys()];
  for (const i of want) {
    await page.evaluate((i) => window.explainer.goto(i, { scroll: "instant" }), i);
    await page.waitForTimeout(Number(flag("settle", 900))); // let transitions finish
    const f = path.join(outDir, `step-${String(i).padStart(2, "0")}-${tag}.png`);
    await page.screenshot({ path: f });
    shots.push(f);
  }
}
await browser.close();
server?.close();

console.log(shots.join("\n"));
if (errors.length) {
  console.error(`\n${errors.length} console error(s):\n` + errors.map((e) => "  " + e).join("\n"));
  process.exit(1);
}
