# Review log: cot-monitorability

## 2026-09-25: visual self-review of the prototype (steps 0–7, desktop + mobile)

| # | finding | severity | resolution |
|---|---|---|---|
| 1 | Glowing dark-route edges were **invisible** on vertical segments. An SVG filter with the default objectBoundingBox units collapses on a zero-width bbox. | blocker | Fixed: `filterUnits="userSpaceOnUse"` with an explicit region. |
| 2 | "Looped" read as "a taller stack", not "the same stack reused". | should | Fixed: alternating pass bands labelled "pass 1 / pass 2". |
| 3 | The "thought" label overflowed the latent card. | nit | Fixed: ∿ glyph, with the meaning carried by the legend. |
| 4 | A lot of empty space above the graph at R = 4. | nit | Fixed: row gap up to 95. |
| 5 | Mobile: the sticky stage overflowed (readouts clipped, chain strip over the legend and prose). | blocker | Fixed: 62vh stage on mobile, legend hidden, chain strip smaller, matching `scroll-margin-top`, badge moved. |
| 6 | The chain arithmetic in cards and strip (7→…→181, 374). | check | Verified by hand: 39 and 64 forced at k = 10 standard; 64 at looped ×2; none for Coconut or full bandwidth. |
| 7 | The full-bandwidth wiring is a placeholder (top-of-column → next column's first layer). | blocker for shipping | **Open.** Verify against `arxiv:2608.08888` and Redwood (research agent), then update `buildGraph` and the caveat. |
| 8 | On mobile the step-nav pill covers two lines of prose. | nit | Open (kit-level: consider auto-hiding the pill while scrolling). |

Not yet run: the `rigor-reviewer` and `learner-sim` agents (the claims ledger isn't drafted yet).
