# Performance review: probes ("What a Probe Reads")

By the `performance-reviewer` agent (Opus 5.5), 2026-09-28. It only measured; no fix has been applied to the page yet.
Its scripts and raw outputs are in `projects/probes/build/perf/` (gitignored, local only). This folder keeps what a
future session needs in git:
- this report;
- `figure-bundle.patch`, the recommended bundle (fix 1), a diff against `web/figure.js`, which is unchanged since the
  measured commit;
- `loadfix-index.patch`, the loading variant's `<head>` (fix 2).

The loading variant's `vendor-d3.mjs` wasn't committed. Rebuild it as a single pinned ES-module bundle of d3 7.9.0 (the
agent used esm.sh's bundle, 95 KB gzipped) and place it next to `index.html`.

To apply (in a worktree):
- `git apply projects/probes/perf/figure-bundle.patch`
- then fixes 2–5 by hand.

Pixel identity is a guardrail, not the goal (the learner, 2026-09-28). Stills that come out identical need no review.
For any that differ, look at a diff heatmap and a side-by-side before accepting.

## Bottom line

- **Only the glass (point-cloud) steps fail the performance budgets as deployed; everything else passes.**
  - Desktop at 4× throttle: 16 of 32 steps pass. The worst are gp (step 18), at 267 ms median frames (3.7 fps), and p1,
    reg, p4 and job, at 133–150 ms.
  - Phone at 6× throttle: 20 of 32 steps pass.
  - Where the cost is: one function, `Figure.drawPoints`, which rebuilds and rewrites every point on every frame (H1).
- **A small bundle of fixes, all in `figure.js`, measured on a copy:**
  - phone: 30 of 32 steps pass;
  - long tasks over a full desktop-4× pass: from 52.8 s to 12.6 s;
  - hero replay: from 15 to 60 fps median at desktop 4×;
  - all 280 functional checks still pass, and all 64 end-state stills are pixel-identical.
- **What the bundle leaves:**
  - The strict desktop target (median ≥ 50 fps at 4×) is still missed on most glass steps, which settle around 30 fps.
  - The phone's last two failures are separate issues: a font that loads mid-page (H5), and the first glass step's
    initial draw.
- **Loading:** first paint passes everywhere. On a phone, a link that opens at the first step (`#0`) draws it at
  **3.72 s, over the 3 s budget**. Self-hosting d3 as one pinned file, plus preloads, brings it to **2.69 s** (measured).
- **Memory:** passes. **Deployment:** works under the Pages sub-path, and is fragile only in its third-party
  dependencies (D1–D3).

## How it was measured

- **Page:** commit `016bb1e`, served from a pinned snapshot made with `git archive`, byte-identical to the live Pages
  site. The working tree moved on to `0243500` during the pass, which changed `main.js`, `monitor.js`, `index.html` and
  `probes.css`. The hot spots are in files that didn't change (`figure.js`, `pipeline.js`, `hero.js`, `paper.js`,
  `lin.js`, `diagrams.js`), so the findings carry over.
- **Server** (`build/perf/server.mjs`): behaves like Pages. The site sits under the sub-path `/tais-explainers/`, text is
  gzipped at level 6, paths are case-sensitive, anything outside the sub-path returns 404, and every request is logged.
- **Browser:** headless Chromium 153 (Playwright 1.63) on a mid-range laptop CPU, throttled with CDP:
  - desktop: 1280×800, at 1× and 4× CPU;
  - phone: 390×844, device pixel ratio 3, touch, at 6× CPU;
  - network for load: DevTools' "Fast 4G".
- **Per step:** settle on the previous step, go to the step, and record until the page stops animating:
  - frame times from requestAnimationFrame deltas (only frames in which the page drew);
  - long tasks, with long-animation-frame attribution;
  - a trace aggregated by event (Scripting, Style, Layout, Paint, Layerize);
  - a CPU profile aggregated by function.
- **What-if fixes:** copies under `build/perf/exp/`, served in place of the page's own files.
- **Caveat (inference):** headless Chromium rasterizes in software, and the throttle slows only the main thread. So the
  paint and raster share of frame time is probably pessimistic next to GPU laptops and phones. Gains from reducing
  JavaScript and DOM work should carry over to real devices.

## Steps × metrics (measured)

Cells give median / p95 frame time in ms, then long tasks as total / longest in ms (LT). "Bundle" = fix 1, measured on a
copy.

| # | step | desktop 4× | 4× | desktop 1× (med · LT) | phone 6× | phone | 4× with bundle | phone with bundle |
|---|---|---|---|---|---|---|---|---|
| 0 | prologue | 16.7/16.8 · 0/0 | pass | 16.7 · 0 | 16.7 · 52/52 | pass | ✓ | ✓ |
| 1 | collect | 16.7/16.8 · 0/0 | pass | 16.7 · 52 | 16.7 · 57/57 | pass | ✓ | ✓ |
| 2 | probe | 16.7/176.7 · 211/161 | fail | 16.7 · 50 | 16.7 · 255/205 | fail | 16.7/151.6 · 142/84 ✗ | 16.7 · 215 ✗ |
| 3 | linear | 16.7/16.8 · 164/164 | fail | 16.7 · 0 | 16.7 · 211/211 | fail | 141/141 ✗ | 210 ✗ |
| 4 | position | 16.7/33.3 · 0/0 | pass | 16.7 · 59 | 16.7 · 51/51 | pass | ✓ | ✓ |
| 5 | pooling | 16.7/33.4 · 0/0 | pass | 16.7 · 0 | 16.7 · 69/69 | pass | ✓ | ✓ |
| 6 | layer | 16.7/83.4 · 4350/146 | fail | 16.7 · 0 | 16.7 · 1505/61 | pass | 16.7/50 · 2179/71 ✗ | ✓ |
| 7 | p1 | 133.3/210 · 1596/187 | fail | 33.3 · 221 | 66.7 · 1477/86 | fail | 33.3/85.9 · 642/109 ✗ | 33.3 ✓ |
| 8 | curve | 83.3/100 · 4871/109 | fail | 16.7 · 0 | 50 · 1085/63 | fail | 33.4/66.6 · 1367/71 ✗ | 33.3 ✓ |
| 9 | fit | 100/128 · 9319/154 | fail | 16.7 · 0 | 50 · 6784/94 | fail | 16.8/50 · 893/81 ✗ | 16.7 ✓ |
| 10 | reg | 150/159 · 1617/182 | fail | 33.3 · 0 | 66.7 · 1546/102 | fail | 33.4/83.3 · 614/97 ✗ | 33.3 ✓ |
| 11 | pairs | 83.3/85.1 · 1574/99 | fail | 16.7 · 0 | 66.6 · 1574/87 | fail | 33.4/50.1 · 104/52 ✗ | 33.3 ✓ |
| 12 | p2 | 16.7/16.7 · 50/50 | pass | 16.7 · 0 | 16.7 · 57/57 | pass | ✓ | ✓ |
| 13 | othello | 33.3/90.8 · 4612/125 | fail | 16.7 · 0 | 33.3 · 1619/82 | pass | 16.7/33.4 · 547/177 ✗ | ✓ |
| 14 | predict | 83.4/116.7 · 1622/100 | fail | 16.7 · 0 | 50 · 1280/75 | fail | 33.3/50 · 0/0 ✗ | 33.3 ✓ |
| 15 | flip | 66.7/83.4 · 4421/90 | fail | 16.7 · 0 | 33.4 · 339/68 | pass | 33.3/66.6 · 683/73 ✗ | ✓ |
| 16 | fix | 133.3/150 · 5266/185 | fail | 33.3 · 0 | 66.6 · 4883/103 | fail | 49.9/83.4 · 2852/82 ✗ | 33.3 ✓ |
| 17 | gp | 266.6/458 · 1869/332 | fail | 66.6 · 1584 | 116.6 · 1638/148 | fail | 50/133 · 1054/199 ✗ | 33.4 ✓ |
| 18 | p4 | 149.9/216.7 · 1683/162 | fail | 33.3 · 0 | 66.6 · 1563/81 | fail | 33.3/83.4 · 788/87 ✗ | 33.3 ✓ |
| 19 | push | 66.7/83.4 · 8000/90 | fail | 16.7 · 0 | 33.3 · 295/65 | pass | 16.7/33.4 · 0/0 ✓ | ✓ |
| 20–21 | handle, contested | ≤16.8 p95 · 0/0 | pass | 16.7 · 0 | 16.7 · ≤60 | pass | ✓ | ✓ |
| 22 | job | 150/276.6 · 1503/196 | fail | 33.4 · 168 | 66.7 · 1376/91 | fail | 33.3/66.7 · 485/83 ✗ | 16.8 ✓ |
| 23–31 | lies … check | ≤16.8 p95 · ≤56 | pass | 16.7 · 0 | 16.7 · ≤65 | pass | ✓ | ✓ |

- **Budgets:**
  - desktop 4×: no long task over 100 ms, under 300 ms of long tasks, median ≥ 50 fps, p95 ≤ 33 ms;
  - phone 6×: median ≥ 30 fps, no task over 200 ms.
- **Steps passing:** 16/32 on desktop 4× and 20/32 on phone 6×; with the bundle, 17/32 and 30/32.
- **Long tasks summed over all 32 steps:**
  - desktop 4×: 52.8 s, longest 332 ms (bundle: 12.6 s, longest 199 ms);
  - desktop 1×: 2.1 s, longest 81 ms;
  - phone 6×: 27.9 s, longest 211 ms (bundle: 2.7 s).
- **Points animated per transition:**
  - most glass steps: 1,026 on desktop, 240 on the phone;
  - p1, reg, fix, p4 and job: 2,052;
  - gp: 4,104 on desktop (960 on the phone).
- The full 32-row table: `build/perf/out/table-final.md`.

## Controls (measured)

Desktop 4×:

| control | baseline | with the drawPoints fix and cached text widths |
|---|---|---|
| slider: reg | 83 ms median · 305 long tasks, 25.0 s | 33 ms · 1.8 s |
| slider: curve | 83 ms · 23.0 s | 50 ms · 2.1 s |
| slider: push | 67 ms · 22.0 s | 16.7 ms · 0 |
| slider: layer | p95 83 ms · 4.8 s | 0.57 s |
| slider: dial threshold | 60 fps, no long tasks (pass) | — |
| hero replay | 67 ms · 123 tasks, 7.9 s | 16.7 ms · one 60 ms task |

- **Toggles, desktop 4×:**
  - fix-layer and gp-layer are the worst: 267–283 ms median frames, and 544–560 ms from click to next paint (the "poor"
    line for interaction latency is 500 ms);
  - fit, flip and pairs: 100–150 ms frames;
  - paper-scene toggles: pass.
- **Phone 6×:**
  - fix and gp toggles: 100–117 ms frames, up to 320 ms to next paint;
  - curve and reg sliders: 50 ms median (fail);
  - layer, push and threshold sliders, and the hero: pass.

## Load, Fast 4G (medians of 3 cold runs, measured)

| scenario | first paint | hero first frame | first step drawn (link to `#0`) |
|---|---|---|---|
| desktop 1× | 528 ms | 2.39 s | 2.61 s |
| desktop 4× | 696 ms | 3.10 s | — |
| phone 6× | 824 ms | 3.63 s | **3.72 s (fail)** |
| loadfix (preloads + one self-hosted d3 file), desktop | — | 1.74 s | 1.84 s |
| loadfix, phone | — | 2.60 s | 2.69 s (pass) |
| preloads only (d3 still from jsDelivr), desktop / phone | — | 1.91 / 3.09 s | — |
| live Pages site, desktop / phone | 592–844 ms | 2.55–2.85 / 3.65–3.75 s | — |

- **Data:** about 461 KB gzipped in total (pass); `probes.json` is 422,852 B as Pages serves it.
- **d3:** 44 modules from jsDelivr (180 KB on the wire), finishing at 1.6–2.2 s. Only then does `main.js` start fetching
  the data, because it awaits the fetches at top level. No preloads.
- **Render-blocking:** 3 local stylesheets and the Google Fonts stylesheet.
- **Main thread at load, phone 6×:** a 578–627 ms long task, the top-level evaluation of `main.js`:
  - `coverCurve` (a side-dish chart): 123–128 ms;
  - `fitScale`: 110 ms;
  - `evalProbe` / `auroc`: 78–92 ms;
  - `startHero`: 93–97 ms.

## Memory (desktop 1×, measured)

| snapshot | JS heap | DOM nodes | detached nodes |
|---|---|---|---|
| start | 6.4 MB | 5,129 | 0 |
| after pass 1 | 7.8 MB | 6,335 | 40 |
| after pass 2 | 8.1 MB | 6,375 | 80 |

- **Pass over pass:** +3.8% heap (pass).
- **Start to pass 1:** +22%, the glass figure's points being created once and kept, as expected.
- **Minor leak:** about 40 detached nodes per full pass, source not identified.
- **No timer outlives its step.**

## Deployment (measured)

- **What works:**
  - no absolute or localhost URLs;
  - every reference resolves with the exact case;
  - under the sub-path, 17 of 17 requests return 200 with zero console errors, on desktop and phone;
  - Pages serves gzip with `max-age=600`;
  - `prefers-reduced-motion` is honoured.
- **D1:** the Google Fonts stylesheet blocks rendering. Delayed by 3 s, first paint moves from 292 ms to 3,300 ms.
- **D2:** jsDelivr slowed by 4 s per request puts the hero at 20.4 s, because the delay repeats at each level of the
  44-module graph. If jsDelivr is down, no figure ever renders and there is no message, though the prose stays readable.
- **D3:** `d3@7` is an unpinned range, resolved at request time.

## Hot spots (evidence: `build/perf/out/steps-desktop-4x-profile.json`, `build/perf/out/steps-*-trace.json`)

- **H1. `Figure.drawPoints` (`figure.js`) rebuilds every point on every frame, up to 4,104 of them.** Per point, per
  frame, it:
  - rebuilds the 24-sided path string in `shapePath`, even when the shape never changes;
  - calls `d3.select`;
  - writes `transform`, `d`, `fill`, `opacity` and `stroke`, changed or not;
  - calls `getComputedStyle` through `css("residual")`;
  - builds a new colour interpolator while fills change.

  `shapePath` alone is 49% of busy script in fit, 48% in push, 39% in flip and layer, and 52–53% in gp and p1. Scripting
  is 51–59% of main-thread time on every failing glass step.
- **H2.** `drawCards`, `drawGhosts` and `drawLegend` call `getComputedTextLength` every frame, forcing layout: 17% of
  flip's script, 20% of predict's.
- **H3.** A hidden scene is still painted. The glass figure is only faded to `opacity: 0` when a paper or pipeline scene
  shows. Layerize is 39–61% of main-thread time in paper steps; hiding the points cuts it from 3.2 to 0.5–0.6 ms per
  frame.
- **H4.** Transitions between different spaces keep both clouds for the whole choreography. The old points finish fading
  within 400–500 ms but are updated every frame for 1.5–4.6 s.
- **H5.** A web font arriving mid-page relays out the whole document at step 3. JetBrains Mono's latin-ext file is
  fetched when a mono label first needs a non-basic-Latin glyph (plausibly ŵ or ĝ; which glyph is inferred). The relayout
  costs 82 ms at desktop 4× and 211 ms on the phone, which is the phone's scroll-blocking failure.
- **H6.** The glass figure keeps animating after the reader leaves its step. Leaving step 2 after 800 ms, the hidden
  figure animated for another 3.6 s, and the next (paper) step dropped to 67 ms frames.
- **H7.** The hero keeps animating off screen. A reader who scrolls on at 1.2 s leaves it writing to its hidden SVG
  284,414 times; steps 1–2 run at 15 fps on desktop 4× meanwhile.
- **H8.** The layer flipbook re-renders everything on each of its 45 frames (legend, counts, scale sorts).

## Incidental behaviour findings (not performance)

- **The first glass step's choreography never plays when a reader scrolls down from the top.** Step 2 is the first time
  the glass figure is shown. `Figure.show` makes a first view a cut, and `render()` only stages an empty glass on page
  load. The histogram is complete at t = 0 and no shadow falls. This is the same class of bug as PLAYBOOK §5, "the first
  figure's choreography never played".
- **During the layer flipbook, the paper's counts row flickers between 0 and 26% opacity.** Each frame restarts the
  counts' 400 ms fade.

## Fixes, ranked by gain for risk

- **1. The bundle (`figure-bundle.patch`): measured, low risk, about 60 lines, all in `figure.js`.** It combines:
  - **E1, a drawPoints fast path:** cache shape strings by (radius, morph); read the CSS colours once and cache the
    colour interpolators; write each attribute only when it changes; call the DOM directly instead of `d3.select` per
    point;
  - **E2:** cache text widths per (class, text), cleared when a font finishes loading;
  - **E5:** `visibility: hidden` on a scene after its fade-out ends;
  - **E6:** when the figure is hidden mid-transition, jump it to its final frame;
  - **E7:** remove old-space points once their fade has ended.

  Separate gains:
  - E6 alone: the hidden figure animates for 0.1 s instead of 3.6 s;
  - E5 alone: Layerize in paper steps −85–90%, and Paint halves;
  - "write only when changed" is most of E1's gain.

  Checks:
  - all 32 steps' end-state stills, desktop and phone, match a second baseline run with 0 differing pixels;
  - mid-transition frames: identical, except about 700 px over 40 frames of step 15, on a few points' edges (at most 4
    of 255 levels) and where card leader lines meet the glass edge. That difference comes from "write only when changed",
    is invisible, and is where most of the gain is: keep it;
  - the deployed commit's `tests/functional.mjs` passes 280 of 280.
- **2. Loading (`loadfix-index.patch` plus a vendored d3 7.9.0): measured, low–medium risk.** Preload the four JSON
  files and the page's own modules, and replace the jsDelivr import with one self-hosted, pinned d3 file. The hero is
  27–28% faster, the phone's first step moves from 3.72 to 2.69 s (now passes), and D2 and D3 go away. Still to check:
  stills and functional tests on this variant.
- **3. Load the late font at load: not measured, low risk.** Preload or self-host the woff2 files the page uses, or
  call `document.fonts.load` with the extra glyphs at startup. Expected to remove step 3's 82/211 ms whole-page relayout.
- **4. Stage the first glass show: not measured.** Start from an empty glass whenever the figure has no previous view.
  This fixes the first-step cut above and moves the 150–215 ms initial draw off the step change. It changes what the
  reader sees (the intended choreography now plays), so it needs the learner's eye.
- **5. Finish or pause the hero off screen; defer `coverCurve`; cache the flipbook's 29 scales: small, low risk.**
  About 20% off the phone's load-time task (inferred).

**Not recommended on current evidence:**
- **Glass points on a canvas:** a standalone estimate was no better than the bundle in software rendering, and batching
  by style was slower. It's a large refactor; revisit only with measurements on GPU hardware.
- **Rounding the JSON to 2 decimals:** 15% smaller, but it moves 1 of 1,026 statements across the layer-12 boundary,
  which changes the data shown.
- **Removing or caching the drop-shadow filters:** large gains only in steps that already pass, and the look changes.
- **Baking each point's translation into its path (E3):** faster alone, slower combined with the bundle.

**What to implement first:** fix 1, then 2, then 3; show fix 4 to the learner.

## Not established

- The phone scroll-blocking test was inconclusive (the synthesized touch scroll didn't move the page), so the 200 ms
  budget was judged by the longest task instead.
- Which font faces load mid-page is unresolved beyond the step-3 trace.
- Each variant was measured once, so per-step differences under about 30% shouldn't be over-read.
- The controls and the hero overlap weren't re-run with the full bundle.
