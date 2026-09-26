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
| 7 | The full-bandwidth wiring is a placeholder (top-of-column → next column's first layer). | blocker for shipping | **Resolved:** the wiring matches `arxiv:2608.08888` ✓ (fused top-layer state, token as a gate). The caveat is replaced by "total vs opaque depth". |
| 9 | Overclaims found by research: the readout said "steps" before the convention was introduced; "attention can't lengthen the path"; Coconut shown without calibration. | should | **Fixed:** the unit is now "layers"; attention's log cost is stated; the Coconut GSM8k caveat is added; looped variants that chain across positions are noted. |
| 8 | On mobile the step-nav pill covers two lines of prose. | nit | Open (kit-level: consider auto-hiding the pill while scrolling). |

## 2026-09-26: iteration 2 (N-hop example + "felt" dark path), desktop + mobile + motion frames

What changed: a second example (Xu et al.'s 4-hop question, new step "Facts hit the same wall"); the route is now counted
node by node with a pulse, restarting at 1 after each card; forced cards light up when the pulse reaches them; hop capsules;
narrow viewBox on phones; `shoot.mjs --frames` + `contact_sheet.py` image mode for motion review.

| # | finding | severity | resolution |
|---|---|---|---|
| 10 | Route nodes were drawn in paper-white, the *token* color: a lit hidden state could read as "readable". | should | Fixed: lit route nodes are bright `residual` blue with a dark number. |
| 11 | "Forced into text" readout said "the answer, =181" (the card label leaked into prose). | nit | Fixed: the readout uses the plain value. |
| 12 | In the hop example nothing showed that a hop spans two rows. | should | Fixed: a capsule groups each hop's rows. |
| 13 | Phones: in-node numbers ~7 px (720-wide viewBox shrunk to 390 px). | should | Fixed: 5 columns in a 470-wide viewBox on narrow screens (numbers ~12 px). Full bandwidth then reads 20, not 32; the prose gives no number. |
| 14 | Motion (step 3, 16 frames): pulse climbs, numbers appear one at a time, the trail turns gold into the card, 39 appears, readout fills "39 …" → "39, 64 …" → final. One thing moves at a time. | check | OK. The strip reserves blank space where chips will appear (layout stays still); acceptable. |
| 16 | When a chain ended partway up a column, the answer's route jumped from the last used row to the top node (visible at step 3: 64 → rows 1–2 → gap → top). Free play also showed it for Coconut with ≤ 4 steps. | should | Fixed: the finished value rides up the remaining rows as hollow "carried, no new step" nodes (and through idle thought columns); legend entry added. Checked with a Playwright pass over free-play states (no console errors; values 34 / 374 / 735 verified by hand). |
| 15 | Coconut: the trail makes a small hook inside the dashed thought card (enters at the side, exits the top). | nit | Open; reads as "passes through". |
| 8 | (from iteration 1) the mobile step-nav pill covers prose. | nit | Still open. |
