# Review log: probes ("What a Probe Reads")

Newest first. Each entry: what was reviewed, by whom, what was found, what was done (or why not).





## Chapters IV–VI drafted, and the review of the new I–III steps resolved (2026-09-27, autonomous pass; Opus)

**Resolution of the technical (Fable 5.1) and rigor (Fable) reviews of the new I–III steps.** Every finding was checked
against the source or the code; all were accepted.
- *Blocker, "it isn't in the words alone"* (q-country, ledger 3): reworded to what the baseline shows (the country's name
  closes one shortcut by construction), and the honest control was run: classifiers of the statement's characters (TF-IDF
  of 2–4-grams, the same city split) read 50.4% (linear) and 64% (one hidden layer) of new cities; the model, asked, 92.5%.
  The check's answer and the ledger now say: cheap cues don't carry the label, a reader that knows geography does
  (C-III-12b).
- *The trainer's turn* (technical #2): measured. Independent draws differ (57° at n = 4, 51° at 512), and with C fixed each
  fit's cosine with its own draw's Δμ falls from 0.97 to 0.51: the prose names both causes (C-II-1d).
- *The push*: the band is described as "where those two states still change the model's answer" (our contrast swaps the
  country, so its row is partly token identity: C-III-19a); our OOD numbers (Spanish–English: 69% vs 20%) sit beside
  Marks and Tegmark's OOD table; NIE > 1 explained. The per-unit claim was tested at matched displacement (a Δμ push of
  α·cos²): on held-out cities the two pushes move the answer about equally at M&T's scale (32% vs 34%), so the in-
  distribution gap is the rule and the geometry; OOD the w push does more than its Δμ part (20% vs 11%), and at α = 2 the two
  drift apart. **This changed the conclusion**: the old hypothesis ("w reads along directions the model doesn't use") is
  dropped (our OOD data contradicts it); the page now cites ITI's grid-searched strengths and AxBench for the gap that no
  scaling rule explains, with ITI's own reading (C-III-19c, C-III-22).
- *Othello arithmetic*: 47% empty (4 + t pieces after t moves) → 47% + 53%/2 ≈ 73.5%, with Li et al.'s inconsistency noted
  (C-VIZ-5). *Why linear*: attributed as a view (Alain & Bengio's "Computational convenience matters. Not just entropy.")
  with the opposite school quoted (Pimentel et al.); two norms per block. *Pairs*: "differ in one word and what follows";
  the PCA threshold now uses the training median (95.5%; a random pair fixes the sign 99.4% of the time); L8 "mostly".
- Attribution and quote fixes: Nanda's XOR as his speculation (ledger 1b, the P2 option "which a hidden layer can
  recombine"); the AxBench sentence (about SAE-A) no longer attached to the probe numbers; "seem to discover" (Chinchilla,
  IMDb); "two further classifiers"; the prologue's probe reads "one or more layers"; Goodfire's 87.98% as an average over
  the trace; the onion code's authors expect it in transformers but didn't test; persona vectors moved to the labelled-
  statements row; Park et al.'s inner product is one choice; Gaussian classes in the side dish; ITI's shifts per head;
  "100 held-out false statements" and "71 units by layer 18" in the readouts.
- `find.json` re-exported (lengths, PCA, draw angles, text baseline); `push.json` gained `mm_matched` (cities and sp).
  Figure numbers in the prose are now computed from the step order (the prologue had shifted them).

**Chapters IV–VI, drafted from Fable's design memo** (12 steps; the cascade step was cut, its numbers folded into the
dial's base-rate paragraph): IV.1 two jobs (Fig. 3's view with the labels hidden: one grey histogram, the flagged side
shaded; `figure.js` gained `paperUnknown` and `flagSide`), IV.2 counterparts board, P5 and the dial (illustrative shapes
fitted by `data/export_monitor.py`; threshold slider; Backdoors; the false alarms at a million requests follow the
threshold), IV.5 leakage strip (schematic, Boxo et al.'s AUROCs), P6 and "Under pressure" (Gupta & Jenner's bars; the
filler mechanism as an animated sketch), "Without an adversary" (the Atlas as a drawn mechanism; Das et al. as the dial with
a frozen threshold), V.1 handles, V.2 contested (both sides: Read et al.'s GLM-5 controls and Lindsey's reply), VI.1 the
six questions answered and the limits, VI.2 five check-yourself questions with held-back model answers. New module
`web/monitor.js`. Every quote was re-opened in its source this pass (Zhou et al.'s setup line included). Tests cover the
flag count, the dial's published readouts, and every held-back number. Not yet reviewed by the agents: that round is next.

## Chapters I–III completed (2026-09-27, autonomous pass): build notes (Opus)

The learner's instruction: continue the probes explainer to a finished, rigorous, beautiful piece, iterating until done
(Fable as advisor when useful). Built in this pass, in step order:
- **Prologue, "The cheapest reader"** (`paper.js`, a third scene sharing the stage's SVG; `diagrams.js` `prologueView`): a
  schematic stream of exchanges through a model, a probe reading one layer of each, two flagged and dropped onto paper;
  three lab cards quoting what each lab reports (C-PRO-1/3/4/5). The first draft ended on an empty glass (the whole stream
  had left): the resting state is now a snapshot of the running stream. "None reports how its probe performs" was an
  overclaim (the Opus 5.5 card reports the classifier system's coverage and false-positive rate): the caveat now says the
  numbers describe whole systems.
- **Why a straight line?** (`whyLinearView`): the next block's MLP reading the stream (norm → 17,920 directions → write
  back by adding) beside a probe's single direction; toggle to a probe with a hidden layer. Sizes from the model's config
  (C-I-22). New data check: normalization barely matters for the states our probe reads (lengths vary 2.3%; a probe on
  normalized states reads the same 98.4% along a direction 4° away: C-I-23).
- **P1 "How many examples?" and "A handful of statements"** (`data/export_find.py` → `web/data/find.json`): the learning
  curve re-run on our statements (20 draws; eight statements give 97% at layer 16; the spike's "four → 0.97" doesn't hold
  on our data: four give 93%), and a trainer: one nested draw whose fits turn the view (every frame an in-plane rotation in
  one basis holding all the fits), the fitted statements ringed. New finding on screen: the direction keeps turning after
  the accuracy stops improving (70° from the final probe at n = 4 with 96% accuracy; 45° at n = 512). Small-n fits are
  exact in the span of the points (`common.lr_span`, asserted equal to the full fit).
- **Contrast pairs, and no labels at all**: every held-out pair joined by a segment in the plane of Δμ and w; Δμ as a gold
  arrow; the recipes table; our own instance of "unsupervised methods find the most prominent difference": the top
  principal direction of the pair differences reads 95.7% at layer 12 and 50.5% at layer 8. Banana/Shed as a quick check
  (answer corrected to the source: PCA and K-means "score highly", many CCS seeds reach 100%).
- **P2 "A board no one showed it" and "Mine and yours"**: a real Othello position (the 12 moves shown, replayed by the
  tests), the published accuracies (75.0 / 98.7 / 99.6, baseline 61.8), then Nanda's XOR hypothesis drawn as schematic
  clusters: the probe turns through a full circle without splitting black from white, then the fills swap to mine/yours
  and one direction splits them. Nanda's post cached and quoted verbatim.
- **P4 "Which one pushes?" and "The best reader isn't the best handle"** (`data/patch.py`, `data/push.py` →
  `web/data/push.json`): a patching map of our model placed Marks & Tegmark's "group (b)" at the statement's last two
  tokens, layers 14–18; pushes scaled by their rule; the model's own TRUE/FALSE answer. Δμ moves false statements' answers
  82% of the way to true, w 34% (M&T 13B: .77 vs .13); per unit of movement along Δμ the two do about the same (false →
  true), the cos² geometry made measurable. The Δμ arrow turns gold → violet (reading → writing); push mode shows the
  model's real answer at each strength for the running example.
- Chapter dividers (prologue, I–III); the performance agent moved to Opus at the learner's request.

Engine additions: `figure.js` per-point `noPaper` (fitted statements drawn but kept off the paper), pair segments,
arrows (grow in when new, change material by interpolating on the figure's clock, not CSS), rings drawn above points (a
fitted statement inside a dense cloud was invisible), `gridNote: false` for schematic views; `lin.js` `frameAt` handles
opposite frames; `paper.js` scene with its own choreography.

## The learner's reaction to chapters I–III (2026-09-27)
- The where-to-read steps ("which token?", "every token, pooled?"): "these are cool", and they stay at the start of the
  piece: "the explanation is more constructive".
- The histogram paper and the adaptive level-set spacing: "really good work with those variants".
- Checks that hold back their answer: "Seems good! It's better that it's not spoiled."
- Their suggestion: a performance agent that checks, at the end, that the explainer runs smoothly as deployed (GitHub
  Pages). Added: `.claude/agents/performance-reviewer.md` (Opus since 2026-09-27: the learner asked for another Opus 5.5 instance, not Sonnet), the `review` skill's §3b, and CLAUDE.md's "Who does
  what".

## Review round on the built chapters I–III (2026-09-27): technical (Fable), rigor (Fable), learner-sim (Opus)

Verdicts: technical "needs changes" (1 blocker, 7 shoulds, script re-check clean with 5 shoulds); rigor "no blockers"
(7 shoulds); learner-sim: the new steps answer the learner's question "mostly", with the gaps listed below. Each finding was
checked against the data or the source before acting; resolutions:

- **Blocker (technical #1): "retraining costs elsewhere"** at layer 16 was a calibration effect, since the retrained probe
  *ranks* Spanish words better (AUROC 0.977 → 0.989) while its accuracy falls. The sentence now says the direction carries
  over and a new topic can need a new threshold; C-III-8's note and `script.md` beat 14 follow.
- **"Which token?" was one overloaded beat** (all three reviews). Split into two steps:
  - **3, position:** a probe per position, exactly 50% up to "in" (exact by pairing) and 97.5% / 98.8% / 98.4% at the
    country's first and last tokens and the period. It answers "why not the country?": a fixed position, plus Marks &
    Tegmark's footnote 3. The patching summary is now stated as their hypothesis, in LLaMA-2-13B, under a few-shot prompt.
  - **4, pooling:** the linear identity (mean of states vs mean of scores; the learner asked about averaging activations),
    and why prefix scores sit at zero (each state appears once with each label). A check on max pooling comes before its
    readout. Max is headlined with its own threshold (87.8%), and 50.0% is shown as the per-token-threshold mismatch. A
    held-out false statement max misreads can be toggled in ("The city of Abidjan is in Colombia.").
  - **The production paragraph** moved into a side dish and was corrected: both labs smooth, then take a maximum;
    MultiMax is one GDM variant; RL-Obfuscation trains max-pooled probes through the max.
- **Leaks** (learner-sim): quick checks now ask the surprising question and hold back the readout they ask about, and a
  paragraph that would give an answer away waits for it (`data-after`):
  - step 1: "how many columns change?";
  - step 3: the probe at "in";
  - step 4: max pooling;
  - step 6: how confident is the chance-level coin-flip probe (a median of 7 logits);
  - step 7: the angle between Δμ and w, held back in the figure until answered.

  The reveal heading after P3 no longer says "upside down", and the reveal lists every option's feedback.
- **Words vs picture:**
  - **513/513:** the split is now stated (513 training, 513 held-out cities, 1,026 statements per side).
  - **The flip:** described as inversion plus drift, with per-class counts and Krasnodar's two twins.
  - **Readout labels:** "‖w‖ … level sets 0.22 units apart" (density, not spacing); circles/squares named in the flip's
    readouts.
  - **Fig. 4:** readouts computed from the drawn points, so the counts add up (fit16 now at 4 d.p.).
  - **Phones:** counts are of the drawn subset, and the readout says so.
  - **Hero:** the stale magenta "style frame" line is gone; the caption says the opening view was chosen so the classes
    overlap; the lede says 98%.
  - **Rigor nits:**
    - both ledgers corrected (no "guaranteed in high dimensions"; "our reading");
    - p's circularity named, and the non-circular evidence given;
    - the strong-L2 conditions (raw, centred, unpenalized bias; standardizing changes the limit);
    - balanced classes for the mass-mean threshold;
    - "in general position" in the side dish;
    - the dashed ghost line's sides;
    - the model named on every real badge;
    - glass and paper defined in step 1;
    - h's colour map, its 12 × 128 fold, and the stripes in X (shared by both classes, r = 0.99).
- **Glyphs:**
  - "read here" is a double ring, no longer the "fitted to" ring;
  - identical true/false scores are one half-filled marker;
  - the position chart uses gold bars on a 50% floor.
- **New step, "Which layer?"** (built during the round): a flipbook of every layer's own plane, whose up-axis signs are
  anchored at Fig. 2's orientation. Layer 0 is a single point, and the accuracy-by-layer curve sits inside the readout.
- **Not done (logged for the next pass):**
  - a draggable read position (the toggle stands in);
  - moving the counts for clipped points;
  - a "why linear?" beat;
  - the remaining script shoulds apply when those beats are built (S1 SD2's two regimes, S2 RMSNorm, S3 P4's cos² at L16,
    S4 maxpool training in the RL beat, S5 spike re-runs).
- Stills `build/shots6/` (desktop), `build/shots6m/` (phone); films re-shot on this build: `build/motion-c/collect.png`,
  `build/motion-h/read.png`, `build/motion-f/flip.png`, `build/motion-l/flipbook.png`, `build/hero/`.

## Our own statements, and where a probe reads (2026-09-27)

- **Why:** the learner asked for "a viz of how the activations are collected as data points", "accurate to the way it's
  usually done", because where a probe reads decides what it can measure. And the page's data file couldn't ship while it
  held Marks & Tegmark's unlicensed statements.
- **Statements rebuilt** from GeoNames with their recipe (`data/statements.py`, App. H of their paper); our additions and
  their reasons are in the file's docstring and C-I-17. The country-name baseline stays at chance (0.512).
- **What changed in the story** (rule 10, re-derived sentence by sentence): the layer-12 flip reads 31.0% (not 8.0%),
  still ranked almost perfectly upside down (AUROC 0.010), so P3's options became ≈99/75/50/30; layer 8 is now inverted like
  12 (18.8%), and only layer 16 calls every negation false (50%, AUROC 0.19); the two directions are 57° apart and the L2
  path turns 64°; the Spanish-word pattern moved (layer 12: 92.3% / 66.2%; layer 16: AUROC 0.99 / 0.95 but 68.3% / 62.5%),
  so the "threshold doesn't transfer" sentence now points at layer 16, and the cost of retraining is larger (92.3% → 68.3%).
  The SVD axis of Fig. 2 had flipped sign, which would have made "the upper cluster is Chinese cities" false; the exporter
  now orients it.
- **The new steps** (`pipeline.js`): the exact fact that carries the causal argument is real, not illustrative: the twins'
  states over "in" agree to float16 storage (99.9% of entries bit-equal, max difference 0.004, one float16 step), and a probe
  there scores 50.0%. Max pooling came out at 50.0% with threshold 0 (every false statement has an early token above zero:
  in Krasnodar, "ras" at 0.7) and 87.8% with its own threshold: the failure CC++ smooths against, seen in miniature.
- **Found on the way:** the per-token regression on raw states hit L-BFGS's evaluation limit, so every fit now uses
  Newton-Cholesky (exact; the export takes under 3 minutes). The period-trained probe applied at the first token scores
  −4,807 (the first position's massive activations), which is why the chart shows a probe trained on every token instead.
  Two Krasnodar cards on the same side hid each other; cards now stack by side.
- Stills `build/shots4/`, `build/shots4m/`; the collect film `build/motion-c/collect.png`.

## Paper as projection (2026-09-27), from the learner's reaction to the style frame

- **The ask:** "the hist below [should] always be a projection of the dots above"; "a common, normalized hist would do
  the work just fine" (the dot piles saturated, and Figs. 2, 3, 6, 7 put the paper on its own scale).
- **Built:** the paper shares the glass's x and units; one histogram per class (true filled, false outlined with a paper
  halo so it stays visible over the fill), normalized to sum to 1, with a bin edge at the boundary and one height scale per
  view. It's recomputed every frame from the drawn positions, so the flip, the retraining turn and the slider all morph it.
  Axis: distance from the boundary along the probe's direction, in units of h. The level sets continue onto the paper;
  their spacing adapts (1, 2, 5, 10… logits) and is written in the glass's scale note, which replaced the legend entry.
- **What the honest scale costs:** true-proportion views (Figs. 3, 6, 7) now show narrow histograms (truth is a narrow
  direction beside the large variance), so they get finer bins (4 px). Fig. 2's coin-flip histogram is a narrow spike at
  the shared scale: that *is* the "barely differ" message, and ‖w‖ now shows as level sets 10 logits apart at the
  true-label probe's 1-logit spacing. Fig. 2 draws every statement (300 / 748) so the spike has samples.
- **Found on the way:** the first figure's "read" never played for a real reader (the first render is a cut at load, and
  the stage is below the hero); it now waits as an empty glass until the stage is on screen. The axis title blinked when a
  view kept the same axis; identical tick sets are now the same object, and the title is drawn once.
- Films: `build/motion-h/read.png` (Fig. 1's read), `build/motion-f/flip.png` (the flip); stills `build/shots3/`,
  `build/shots3m/`.

## 2026-09-26 · Style frame (hero + 7 steps) · art direction by Fable (design memo) + Opus; learner-sim fixes applied

**Why:** the learner liked the prototype and asked for less "ruler" language (projections, the LR weights, SVD/PCA are fine),
clearer phrasing, and a final piece "an order of magnitude above in aesthetics and visual impact / coherence", with meaning
encoded in the aesthetics.

**Fable's design memo (`general-purpose`, Fable 5.1, confirmed from its system prompt), and what we did with it:**
- Critique: meaning lived in labels, not form; furniture without units (graduations every 24 px); composition drifting per
  step; one mono weight for everything; the green REAL badge spent the *safe* colour; the gold highlighter misused for "bad"
  numbers; the side dish's violet; one crossfade for every kind of change. → All addressed.
- Kept from it: the probe as a covector drawn as level sets (sharpness = ‖w‖; moving along a level set changes nothing);
  gold rings for fitted statements; dashed = counterfactual; the old direction as a ghost; one dot per statement on paper
  with counts from the dots; the grid in hidden-state units; provenance as material (badges, readouts; not inline); the
  motion grammar; the hero (no spoilers); risks (colour cap, phone clutter).
- Its corrections to our candidates: kill the six colours on the six questions (glyphs only; done); the gold wash replaced
  by level sets (done); weak L2 on separable data tends to the max-margin direction, not Σ⁻¹Δμ (done, with Rosset et al.
  2003 and Dobriban & Wager for the strong end).
- Not yet: act 2 of the hero (the push), the monitoring dial and pressure trails (later chapters).

**learner-sim prototype fixes:** 1–10 applied (details in the README handoff); 11 (drag the direction; hunting unknown
shifts) and 12 (check-yourself gaps) remain.

**Visual self-review (stills desktop + phone, `--clock` films of the hero, the flip, the retraining turn, the coin-flip fit):**
1. NaN positions when a view changed space (another layer, the 2-D fit data): frames of different dimension can't be
   interpolated. → Each view declares its `space`; a change of space cross-fades, and leaving points keep their old frame.
2. A reduced-motion cut drew the *start* state. → Every phase completes at t = 0 in a cut.
3. True-proportion views squeezed the paper pile into a column. → Those views get their own paper scale (fitted to the 99.5%
   range of the scores); matched scales stay where the glass is stretched.
4. Label collisions (glass label vs layer gauge, ghost labels vs group labels, grid note vs axis label, legend overflow). →
   Axis labels in the glass, legend on the paper band, ghost lines named by the legend, a shorter grid note, the legend
   scaled to fit.
5. The 65° arc was hidden under the points. → Arcs and angle labels above the points.
6. Card leaders crossed. → Cards sit on their point's side.
7. The flip blinked: the probe's level sets and the paper axis faded out although unchanged, and the readouts went blank
   for 3.4 s. → An unchanged probe and axis stay; the old readouts and counts stay dimmed until the new land ("99.5% → ?"
   becomes "99.5% → 8.0%").
8. The retraining turn lost the level sets during the rotation. → The old level sets turn with the view and give way to the
   new ones.
9. Prose numbers off by one statement (2-decimal coordinates). → 3 decimals; `tests/functional.mjs` checks the page against
   the exporter within one statement.
10. The empty hero paper strip before the drops; the hero's 99.5% over the points. → The strip fades in with the drops; the
    number moved to the caption.

**The learner on the style frame (2026-09-26):** the encodings are "cool", the register "much better". Two asks, queued as
next actions 1–2 in the README: the paper must always be a projection of the glass in the same units, with a normalized
histogram instead of saturating dot piles; and a new early step showing how a statement's activation becomes a labelled data
point (which token, averaged or per token).

**Lessons for kit/PLAYBOOK.md (at the end of the piece):**
- Store points in a small per-view basis and interpolate *frames* (on the sphere), not positions: every transition is then
  an honest projection, and rotations, plane changes and data shifts compose.
- Keep what doesn't change on screen across a step change (the probe, the axis, the old readouts dimmed): a blank panel
  during a 3-second animation reads as broken.
- Declare a view's space; never interpolate between spaces.
- A probe is a covector: draw level sets, and reserve arrows for vectors (writing).

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
