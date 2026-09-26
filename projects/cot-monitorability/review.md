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

## 2026-09-26: iteration 3 (full piece + visual overhaul) — `rigor-reviewer` + `learner-sim`, and fixes (3b)

**Rigor-reviewer** (32 findings, no blockers; charts within tolerance; diffusion DAG honest). Fixed:
- #1 Baker's point misquoted ("hacks needed no reasoning") → their actual point: the hacks only got through because the monitor never saw the actions.
- #2, #9 our synthesis in the paper's voice ("what's left is what the task forces"; "unfaithfulness lives in…") → marked "Our reading" / "They argue … in our terms"; Emmons title → "…when the hint is easy".
- #3 "At first it helped" → "throughout training".
- #4, #5 Baker chart: "genuine fix" → "passes, no test edits"; two baseline points re-read (.05, .18); y-axis labelled.
- #6, #7 Kuhn: the harder-task gap is smaller (latent ≈0.15, plain ≈0.3 in one variant); "an edit like the full-bandwidth one".
- #8 "without ever mentioning" → "often without"; the chart-location reference fixed.
- #10 Emmons RL result misread → "wrote the needed values in forms that narrow monitor didn't recognize: forced into the text isn't the same as caught".
- #11–13 Prologue calibration: subtitle softened; METR's "often-unreliable" analysis agents; candour "at least partly a habit" (they spoofed transcripts but left reasoning alone; METR isn't sure why).
- #14, #15 "In this drawing" restored; lookup cost stated as a drawing convention with both ratios (Astra 2.0×, next best ≈1.5×).
- #16 Readers diagram: the second wire is now transcript-based *selection and checks*, "weaker?", not "meaning … cut"; prose aligned.
- #17–21 Dilgren "up to" + "nearly a majority"; Redwood's J-lens vs SAE claims separated; S = per-position token probabilities (prompt omitted, noted); top-8 vs p>0.03; Engels' own suspicion of non-transparent reasoning added.
- #22–26 Board: "some cases", CoT-only-monitor developer message, sandbagging made explicit; production-monitor near-zero recall added (worrying) and monitorability recovery at longer CoTs (reassuring); first column "Stated by OpenAI" now includes the Chief Scientist statement; neutral colors for categories.
- #27–32 Limits cover the later chapters; REINFORCE simplification named; Q1 shortcut hedge; diffusion 48× vs 28.6× explained; ledger rows per board item, July 8 date; credits completed.

**Learner-sim** (the 4-hop section now works; chapter IV "lands best"; board weakest). Fixed:
- Predicts rebuilt to target misconceptions and not leak: count the dashed wandering route (readout hidden: "?"); "how many written: none/1/2/3" (the 32-dots lure); 4-hop with reason-tagged options incl. "None: four lookups fit in four layers" and dashed empty lookup slots on the figure; Baker "more honest fixes, cheating goes on unseen" (pressure helps at first); diffusion "what decides?" (no contradiction with the next step). Emmons predict kept.
- Readouts: "8 rows (4 lookups × 2)"; legend shows only what's on screen; Walcott/Holliday labels no longer collide.
- Define-before-use: probes, NLAs, activation oracles, J-lens (bulleted), self-conditioning, gate, K + Q mod 4, CODI, gold traces, CoT controllability; 28.6× vs 48× and "a third"; J-lens and weakening explained.
- Board redesigned: short items with worrying / reassuring / unverified markers, full quotes on hover, fits the panel on desktop.
- Your-turn Q5 spoiler removed from the looped caveat; Check-yourself figure now the standard graph with the zig-zag.
- Mobile: charts stacked and diffusion in a narrower viewBox (text ≥ ~11px); mobile panel height bounded.

Not done: small-multiples view; interactive toggles on the diffusion and readers figures (the learner-sim wanted to poke them); hero dot numbers are small at hero size (decorative); gold is still used for both "overseer/forced" and "readable S" (defensible: both mean "readable by an overseer").

## 2026-09-26: iteration 4 (visual redesign, "paper and glass") — `rigor-reviewer` + `learner-sim`, and fixes (4b)

**What changed.** A kit-level art direction (paper page, glass windows onto the model, `-ink` variants of every semantic
color); every hidden state drawn as a square of real gelu-4l numbers (`data/export_tiles.py`); a new step 2 ("A word and
512 numbers") and a camera pull-back from that state into the grid; attention from every earlier position; a hover that
lights up a state's dark past; a perspective hero (canvas); diffusion as glass passes with paper strips between them;
readers as instruments with two wires; charts restyled on paper. Craft notes from actually looking at Goodfire's
"Interpreting LM Parameters" (per-figure screenshots) and Welch Labs (YouTube storyboard stills) are in `references/craft/`.

**Rigor-reviewer** (1 blocker, 3 should, 8 nits; every new number verified). Fixed:
- #1 (blocker) The "real states" framing overreached: the squares are the real states under them only in the standard
  arithmetic figures. Step 2's caveat now says exactly where they're real and lists every reuse case; badges read "real
  states: gelu-4l" there and "reused gelu-4l states" elsewhere (4-hop included); the hero carries its own badge line;
  C-VIZ-TILES rewritten to quote the screen.
- #2 The J-lens reads what is *driving* the next token, which can include a concept the model never says (Wang & Reid's
  showcase), not "what is about to become a token". Prose, figure label ("sees what drives the next token") and glyph fixed;
  the looped-model workspace result added for balance; the dossier's "poised to verbalize" re-attributed to the original
  J-lens paper.
- #3 Coconut's depth profile: with global attention 12 holds at every later column ("a few columns" was stale).
- #4 Phones don't draw the anatomy's column, so the camera move is skipped there.
- Nits: hero act 2 prints plain "…" cards (no invented narration); "where a monitor can see it" (no readability
  guarantee); per-layer color scale stated; key ±2.69; badge layer read from the data and kept on phones; "entries in its
  vocabulary"; hover disabled on the predict step and counts labelled "drawn states"; diffusion attention all-to-all within
  a pass; phone reader wires rerouted outside the cards.

**Learner-sim** (verdict: "the first version where I get it before reading a word"; the 4-hop gap is closed; the hover is
"the best moment in Chapter I"). Fixed:
- The sampled-token edge ("the sampled token becomes the next column's input") is drawn, labelled and in the legend on its
  first appearance.
- Predicts: step 4 now asks for the *longest possible* route (not the length of a drawn one); 4-hop options all carry a
  rationale ("23: a day of the month"); Baker is a 2×2; Emmons asks what happens to *silent* hint-following (fair for both
  models).
- One state's attention fan is shown bright in step 4, so every line visibly ends one layer up (curves now leave and arrive
  vertically).
- The dark past is shown automatically once the route has played in "Sideways doesn't help" (24 states, route 4) and "Full
  bandwidth" (31 states, route 32), so the contrast doesn't hide behind a hover.
- Hero: a visible curved wire behind the glass, upright words on the paper, a monitor's eye, "longest dark path" (one name).
- Wording: "obfuscation" defined; lookup ratios stated (half, about two-thirds); "hold that thought" on filler tokens;
  Baker "about half of its samples (49% …, above the 43% …)"; "see the limits in the last Emmons step"; "computed ratio";
  decoded vs verified (Dilgren) explained; SAE defined; board glossary (steganography, sandbagging, honeypot, time
  horizon); garden-path sentence rewritten; Astra glossed in the prologue; "shared message board" in the figure;
  "In the figure" (not "on the right", which is wrong on phones); diffusion "(drawn 3 layers deep and 4 positions wide)".
- Charts: the thin "cheats, caught 1%" band labelled; the no-hint bar in the Emmons legend. Phones: the 4-hop strip uses
  short relation names so it fits.
- Performance: the hero pauses when off screen or in a hidden tab.

Not done: an interactive "build your own route" for the step-4 predict; a stack-height knob for the 4-hop question ("with 6
layers, which name surfaces?"); badges and glow on the tiny squares of the 8-row looped figure; the evidence board is
still dense.
