# Review log: probes ("A Ruler Through the Glass")

Newest first. Each entry: what was reviewed, by whom, what was found, what was done (or why not).

## 2026-09-26 · Prototype · `learner-sim` (Opus 5.5, confirmed from its system prompt)

Verdict: "Would I want the rest built this way? Yes, clearly": real states, readings falling onto paper, layer badges,
honest-geometry boxes and the timed flip are the "expressive and rigorous" style asked for. The flip is the strongest
beat; the side dish reads as unmistakably optional and doesn't interrupt. It read shots taken before the technical-gate
fixes, so several of its notes (stale readouts, "our most accurate ruler", "land on the tick", difference of means "reads
chance", the Spanish-word cost, the half-finished still, the legible dimmed 6.8% in the film) were already fixed; the
film has been re-shot (`build/shots/motion-flip.png`: readouts now appear only when the dots land).

**To do, in priority order (none applied yet; the first job after compaction):**
1. **P3 honesty.** Number-first options of equal weight, with the mechanism not only in the right one (e.g. "≈10%: it
   leans on something 'not' leaves unchanged"), or ask where Krasnodar's negated twin lands (far right / at the tick /
   far left). Don't light chip 2 during the predict. Per-option feedback at the reveal, including why "about half" is
   what layers 8 and 16 score (every negation lands on the false side; ranking still inverted).
2. **Steps 05 → 07 as one argument.** Default 06 and 07 to layer 12 or give them a 12/16 toggle and say the clean picture
   is layer 16; draw the old ruler as a ghost so "it turns" and "leans on the flipping direction" are visible; label the
   vertical axis of step 07; point out that its top holds "is in · true" and "is not in · false", the city–country
   *match* pairs, as the evidence for step 05's reading (our voice), and say "Our reading:" *before* the claim at step 05
   with a forward pointer. Add the one line Δ_aff = g + p, Δ_neg = g − p; cite Bürger et al. properly at first mention.
3. **Explain the conventions once.** Step 01's caveat: "in true proportions this cloud is 8.5× taller than wide: truth is
   a thin direction beside the biggest ways these states vary"; an animated un-stretch and rotation into Fig. 3; fix Fig.
   3's caveat (in the plane of the two rulers the drawn angle *is* the angle); say what ×41 means at step 02 (the coin-flip
   ruler found a sliver where the statements barely differ). Six chips: a visible title ("What accuracy alone doesn't tell
   you"), introduce and name each question in the prose when it's first answered, light chips only at reveals, a one-line
   answer in each finished chip, and no pill styling that looks clickable.
4. **Step 02.** The main course needs the reason the fit is guaranteed (300 statements in 1,536 dimensions: a flat cut can
   split them any way), not only the side dish; show the new statements automatically once the training fit lands; say
   "layer 16" and "almost no regularization"; a quick check ("coin-flip labels: training accuracy?").
5. **Step 03.** Replace "many directions separate a few hundred points" (a training-fit argument) with the cone
   argument (both rulers generalize: a cone of good directions); fill or cut the empty paper band (e.g. both rulers'
   readings); a quick check on the angle; the why of the tilt (LR ≈ Σ⁻¹Δμ: difference of means along the long axis, LR
   across the thin one) as a side dish that doesn't spoil P4.
6. **Step 05 wording.** Motion order: "first the truth flips (the fills swap); then each dot drifts to its twin's reading:
   closer to the tick, never across it"; "confidently" → "systematically"; explain "read as false: 43.3%".
7. **Step 01.** "240 of the 748"; "cities that never appear in training"; mark the Krasnodar pair; hover a dot to read its
   statement; a word on the two vertical clusters of true statements (the eye goes there; heights mean something else).
8. **Side dish.** Its violet accent collides with "violet = writing" (use ink or a neutral); chart labels (d = 50
   clipped, d = 1,536 on the axis title, no y label); reconcile d + 1 (affine) in the text with the homogeneous formula;
   the VC-dimension hook; chart text ≥ 11 px on phones.
9. **Phone.** The nav pill covers prose and the fourth predict button; Fig. 7's labels collide with points; Fig. 3's empty
   band.
10. **Honest edges.** Scales clamp ~1% of outliers to the glass edge without a mark while the caveat says readings are
    exact: mark clamped points or widen the range.
11. **Wanted next:** drag the ruler and the tick; hover statements; how to hunt for a shift you didn't think of (content
    for step 14 or the limits: diverse held-out sets, error analysis, adversarial and LLM-written statements); the push.
12. **Check-yourself gaps** (brief drafts): Q1 needs a taught text-only baseline or named control task; Q3 needs a method
    for finding the next shift; Q5 needs the full piece.

## 2026-09-26 · Script (technical gate) · `technical-reviewer` (Fable 5.1, confirmed from its system prompt)

Verdict: **fix first**. Every published number it checked matched its source; the problems were in what the script
inferred, posed or drew. Resolution: all findings addressed in `claims.md` and `script.md` the same day, and the ones that
touch the prototype were fixed there too. Quick re-check before the full build.

| # | finding (severity) | resolution |
|---|---|---|
| 1 | Step 25 drew evasion as points sliding *sideways* out of the ruler's view: a sideways move doesn't change a reading (blocker). | Two badged pictures instead: points pushed down the ruler across the tick (Chameleons, RL-obfuscation) and the honest cloud shifting under a frozen tick (Das). |
| 2 | "Difference of means reads chance on negations" was a threshold accident; with cos(Δμ_aff, Δμ_neg) < 0 its ranking is inverted (blocker). | Computed: AUROC on negations 0.034 (DiM) and 0.005 (LR) at L12; LR at L8/L16 also inverted (0.022, 0.394) despite ~0.5 accuracy. Step 13, C-III-1, the brief and the prototype now show AUROC and say both rulers rank negations upside down. |
| 3 | P3 called L12 "our most accurate ruler" (L16 is 0.999) and two options were right at different layers (should). | "A 99%-accurate ruler (layer 12)"; the reveal runs the layer slider and says L16's ~0.5 is not "no signal". |
| 4 | P4 asked about equal-norm pushes; the published evidence uses other normalizations (should). | P4 posed in Marks & Tegmark's terms (push until each ruler's own reading flips); the reveal draws the cos² ≈ 0.16 component vs their measured 0.17. Our equal-norm gap (0.44) is the cos factor, not a per-unit deficit (C-III-19). |
| 5 | The equal-projection control was confounded by push size (should). | "Leans into directions the model barely reads" is now a labelled hypothesis; tuned-strength evidence (ITI, AxBench) carries "worse even at its best". |
| 6 | Hero act 2 and the brief said the model's answer "flips" (should). | Act 2 shows confidence falling (few-shot margin); no flip claimed. |
| 7 | P5's "~1%" is one probe's number; the same table has another probe with the same AUROC and recall 1.000 (should). | Options now include "anything from ~0% to ~100%"; the reveal shows both rows and a second dial toggle for a shifted honest baseline. |
| 8 | Random-label held-out readings drawn settling on the tick; they scatter confidently to both sides (should). | Prototype prose and step 7 fixed. |
| 9 | Shuffled labels and Hewitt & Liang's control tasks conflated (should). | Two cards; the prototype has a "two different controls" caveat. |
| 10 | OpenAI's system drawn as a linear probe (should). | "Linear probes at two labs, activation classifiers at a third" (C-PRO-7); OpenAI's stage is a classifier box. |
| 11 | Three different checks all called "replications" (should). | Each labelled: another model; corrected threshold (AUROC reproduced); trained organisms (C-IV-7). |
| 12 | Das condition and claim misstated (should). | Shown the scores: AUROC 0.975 → 0.912, recall 0.95 → 0.41 (C-IV-11). |
| 13 | The Atlas read as a stale probe; fresh probes fail too because the concept moved (should). | Rephrased as question 2 with ±0.261 and the surviving on-domain probe (C-IV-20). |
| 14 | Levinstein & Herrmann's probes are MLPs (should). | Badged; NegFacts2 (.53–.60) added as the counterpart for the fix's limits. |
| 15 | Our data show mixed training *costing* affirmative transfer (should). | "Helps the shift you added, costs elsewhere" (C-III-8); prototype readout shows before/after. |
| 16 | "LR = Σ⁻¹Δμ" without its conditions; the angle depends on regularization (should). | Conditions on screen; measured angle 42°–67° across C at L16 with accuracy 0.99 (C-II-8), now a knob for the trainer. |
| 17 | SD2 merged two isotropy conditions (should). | Kept apart: within-class covariance (LDA) vs unembedding covariance (Park et al.). |
| 18 | Question 3 drifted between steps; "the info is in the activations, not the words" overclaimed (should). | One definition (C-DEF-3); step 14 says "no surface shortcut". |
| 19 | P6's reveal would teach "use max" without its cost (should). | Trade-off card: long-context false alarms. |
| 20–30 | Nits: C-VI-2's "five"; "no single number" (false: one coordinate reads 0.976 at L16); "segments nearly parallel" (mean cosine 0.56 at L12); one C; L28 post-norm and fp16 storage; XOR schematic badge and the 76% check; circles need a 2-D probe; "our reading" labels; question 4 phrasing; "assessment" as framing; layer-specific transfer; cite Marks & Tegmark's "close association". | All applied in `claims.md` / `script.md`; the protocol nits (fp16 storage, L28, massive-activation dims in cosines) go into the pinned `data/` scripts. |

## 2026-09-26 · Prototype of the money shot (7 steps of chapters II–III) · visual self-review (Opus)

Built: `web/index.html`, `web/main.js`, `web/probes.css`; data from `data/export_prototype.py` → `build/proto/cloud.json`
(real Qwen2.5-1.5B states; Marks & Tegmark statements, so the file stays in `build/` until we regenerate our own).
Stills: `build/shots/step-0*-1280.png`, `step-0*-mobile.png`; motion: `build/shots/motion-flip.png` (`--clock`, 8 fps).

| # | finding | fix |
|---|---|---|
| 1 | **Words vs picture (blocker):** step 3 drew the difference-of-means arrow in the (ruler, largest remaining spread) plane, where it looked parallel to the ruler, while the label said "59° from the ruler". | Step 3 now uses the plane of the two rulers (ŵ, Δμ⊥) in true proportions: the drawn angle is the real 59.1°. The export computes both axes in the hidden state's own units. |
| 2 | Equal aspect everywhere squeezed the clouds into thin vertical stripes: the ruler's direction has little variance compared with the largest remaining spread. | Views that only show readings fill the glass and say "↔ stretched ×k" in the glass; views where 2-D geometry matters (3, 7) keep true proportions and say so. |
| 3 | **Timing (flip):** old and new dots crossfaded at once (two moving things), and the 6.8% readout was on screen before the dots arrived. | Each dot keeps its key and *becomes* its negated twin: ruler highlight 0–0.8 s, fills swap in place 0.8–2.0 s, drift 2.0–3.2 s, histogram and readouts land 3.2–3.8 s (checked on exact frames). Fills are D3-transitioned (CSS transitions don't follow `--clock`). |
| 4 | Coin-flip view's legend said "filled = true" (the labels are coin flips). | Legend per view: "filled = heads · outlined = tails". |
| 5 | Panel title wrapped one word per line (long badge); a badge overflowed on phones. | Header wraps; badge on its own line, allowed to wrap. |
| 6 | SVG labels at 18–20 units (under ~11 px on a phone). | All labels ≥ 22 units at viewBox width 720; shorter strings so they fit. |
| 7 | Prose numbers vs data: "98%" for the difference of means at L12 (data: 96.0%); "at layer 16" only (L8 also calls every negation false). | Prose now 96%; "at layers 8 and 16". Every stage number is read from `cloud.json`. |
| 8 | Group labels in step 7 overlapped points. | Labels at the glass edges with a dark halo (`paint-order: stroke`). |

| 9 | Stills caught a half-finished flip: `shoot.mjs` awaits `render()`'s promise, which settled with the step's main transition while the named fill/move/hist transitions and the readout timeout ran on. | `render()` now returns a promise that settles when the whole choreography has landed (`d3.timeout`, which follows the page clock). |

**Lessons for `kit/PLAYBOOK.md` (add at the end of the piece):** (1) with multi-phase choreography, `render()` must settle
after the last phase, or stills show intermediate states; (2) transition fills as D3 styles, never CSS, so `--clock`
controls them; (3) keep an element's key when a data point *becomes* another (a statement → its negation) so the change
reads as one object changing, not a crossfade; (4) draw angles only in true proportions, and say "stretched ×k" wherever
axes are scaled differently; (5) accuracy at a threshold can hide an inverted ranking: when a classifier "reads chance",
check AUROC before saying "no signal".

Not done yet (prototype scope): phone placement of the six-question chips (hidden on phones); hover to read a dot's
statement; the push; the in-browser trainer; reads-timed transitions for steps other than the flip; `tests/functional.mjs`.
Protocol note: the prototype's split gives slightly different numbers from the spike (e.g. L12 negated 0.068 here vs
0.106 in FINDINGS #5); the pinned `data/` scripts will fix one protocol and `claims.md` will be updated from them.
