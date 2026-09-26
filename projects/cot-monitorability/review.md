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

## 2026-09-26: `learner-sim` + `rigor-reviewer` on iteration 2, and the fixes (iteration 2b)

**Rigor-reviewer** (19 findings; every quote and number in the new step checked out; code does what the prose says):

| # | finding | severity | resolution |
|---|---|---|---|
| R1 | "the monitor is *guaranteed* to see 39 and 64": necessity puts information through the tokens, not readably (Korbak L148-151). | blocker | Fixed: new caveat "Through the text is not the same as readable", with the Korbak quote and the "natural language prior" argument, pointing at obfuscation. |
| R2 | Outputs of the drawing convention passed as facts ("need many layers per step", "It's forced"); the chain even has a parallel shortcut (affine steps compose). | should | Fixed: "use", "measured, not proven", the shortcut named on screen, Nanda's shortcut checks; rule stated "in the drawing's terms". |
| R3 | "today's best models ≈ 4" contradicts Astra 7.2; "LLM-assisted" softened the source. | should | Fixed: "most frontier models … one outlier, Astra"; Nanda's epistemic status quoted. |
| R4 | "A hop costs more depth" stated as a finding. | should | Fixed: "fare worse … about half as many … a drawing convention". |
| R5 | "Only 23" / "a bare 23" read as claims about real CoTs. | should | Fixed: "In this drawing"; propensity vs necessity; limits are success rates, not walls. |
| R6 | Three datasets in one breath read as a trend. | should | Fixed: "on different datasets (so not a trend)"; Gemini 3 Pro named; Xu's "≤10% for N>2" added (verified in the raw MathJax). |
| R7 | "filler tokens" undefined and seemingly contradicting the picture. | should | Fixed: defined at first use; "width, not depth" in the looped Variants caveat; transfer question built on it (Pfau et al.). |
| R8 | Xu's run conditions missing. | should | Fixed: low reasoning effort, API-reported 0 reasoning tokens. |
| R9 | Back-patching "fixed 32–66%" overstates an oracle, existence result. | should | Fixed: "*some* choice of … made the answer come out right … partial … not a practical method". |
| R10 | Strip label "23rd Oscars" leaked a value that stays hidden under Looped ×2. | should | Fixed: "Best Actress at that Oscars". |
| R11 | Lede: "works because", "exactly". | should | Fixed: "works partly because", "see when". |
| R12 | "The only things we can read are the tokens" is a modelling choice. | should | Fixed: "We treat the tokens as the only readable nodes" + probes/lenses note. |
| R13 | Line refs to a web post with no local file; "over a hundred layers" sourced to a figure that doesn't say it. | should | Fixed: quote anchors in claims.md; `lw:nls-depth` read: partial; layer claim now Redwood 09-23 fn 2. |
| R14–R19 | "attends to all" (global layers only); formal OSD counts gate levels; FBT chain over generated positions; GSM8k is GPT-2; year/second-hand denial; wrong line refs; C-VIS-1 wording. | nit | All fixed (see claims.md, rewritten 2026-09-26). |

**Learner-sim** (the numbered route + reset "is the strongest part of the piece"; main problems were pedagogical):

| # | finding | resolution |
|---|---|---|
| L1 | Predict boxes leaked: the answer was printed below and animated on the stage. All predictions were easy. | Fixed: each predict is its own step (the stage poses the task but holds the route; readout "predict first"), with guess buttons that record the guess ("You said: …") and move on to the reveal. New, harder predict: "can a zig-zag through attention beat 4?" |
| L2 | "Longest" was asserted, not shown; "logarithmic" sentence unexplained. | Fixed: a zig-zag route animates and also tops out at 4; a **depth profile** row above the graph shows the longest dark path reaching each column (flat 4s standard; 4→32 under full bandwidth; Coconut's capacity 12). Log cost moved into a caveat. |
| L3 | Unit "layers" wrong for looped/Coconut/FBW (8, 12, 32 "layers" for a 4-layer model). | Fixed: "hidden states". |
| L4 | Answer card gold-outlined like forced cards vs "Two". | Fixed: gold = forced only; the answer card is plain (as in the strip), and the prose says so. |
| L5 | Needs vs capacity not visible. | Fixed: "Task needs" readout next to the dark path; the rule ⌈n/d⌉ − 1 stated after the picture earns it. |
| L6 | Astra cited before introduced; filler tokens undefined; Biran not tied to looping; "bare 23" point unused. | Fixed: Astra introduced as "one outlier" at step 4; filler defined; Biran → "the next architecture makes a second pass part of the design"; bare-23 point made explicit (and calibrated, R5). |
| L7 | Why looping ≠ adding layers; why full bandwidth exists; "gate … so" non sequitur; number of Coconut thoughts. | Fixed: "depth becomes a dial" (Geiping); FBT motivation quote; gate sentence rewritten; thoughts fixed in training, matched at inference (Hao). |
| L8 | "Your turn": no answers, no transfer question. | Fixed: collapsible answers; transfer question on filler tokens. |
| L9 | Label Walcott/Holliday on the figure. | Not done: no room between columns without covering the gutter edges; they're in the strip (blue italic = stayed in the dark). |
| L10 | Toggle for the looped "variants" edges (cross-position deep reads). | Not done yet: candidate for a later iteration (it would also make the filler transfer question operable). |
| L11 | Stale `step-04-mobile.png`. | Fixed: all shots regenerated. |

Also fixed while testing: clicking a control inside a step re-triggered the step (double render, restarting animations): `kit/web/steps.js` now ignores clicks on controls. Still open: #8 (mobile nav pill over prose), #15 (hook inside Coconut thought cards).
