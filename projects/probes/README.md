# What a Probe Reads
*Linear probes: how to make one, how to know what it reads, and what happens when you use it*

> **Status:** brief **agreed 2026-09-26** · format: **web explorable** (a narrated history video only after the web piece
> converges) · designed with a Fable co-designer (see "How this plan was made") · dossier: `references/probes/`

## The learner's decisions (2026-09-26)
1. **One piece, ~28 steps.**
2. **Predicts for everything**, easy or hard: "if I find something easy that's ok, if I have to think hard for a deeper
   lesson, that's great too."
3. **Web only first.** A video of the history later, once content and visuals have converged.
4. **The maths asides stay open, as side-dishes**, not collapsed: explore a UI that serves them beside the main course.
5. **Data: go light on experiments.** Run them when they fit in reasonable time on this machine; otherwise use published
   results, or illustrative data points that communicate the idea, with a caveat wherever context doesn't already make
   it clear. The spike's real numbers stay where we have them.

## Promise
After this, you can train a probe on real activations, say which of **six questions** a reported probe accuracy does and
doesn't answer, predict what happens to a probe when the data, the layer or the model's incentives shift, and turn a probe
into a steering vector, knowing why the obvious direction is the worse one.

## Learner
- **Assumes:** logistic regression, k-NN, regularization, train/test splits, ROC/AUROC (data science); linear algebra and
  high-dimensional geometry; a hidden state as a vector of numbers (Welch Labs' residual-stream video, and piece 1's "a word
  and 512 numbers"); SAEs at an intuitive level (one bridge line only); RL concepts (the obfuscation beats).
- **Does not assume:** the probing literature (control tasks, mass-mean probes, CCS, the Othello episode), how probes are
  deployed and evaluated as monitors, or steering mechanics.
- **"Something I believe I know"** (the learner's words). The predicts double as a check of what they actually know, and
  before scripting we ask which parts already feel solid (questions at the end).

## Prerequisites and prior art
- **Watch first (optional):** Welch Labs' residual-stream video. Piece 1 (`cot-monitorability`) drew probes as one box
  among the "readers"; this piece opens the box.
- **Prior art** (details in `references/probes/README.md`, "Prior art"):
  - ARENA 1.3.1 (2026-02) covers truth PCA, mass-mean vs LR vs CCS, interventions, deception and attention probes. It's
    code only and needs an A100: the natural hands-on follow-up, not a substitute.
  - Nanda's Othello post and Kenneth Li's Gradient article (the history, in text).
  - The Geometry of Truth data explorer: real PCA plots, but it never trains a probe.
  - Viewers of probe scores on transcripts: the "Deception Monitor Dashboard" and hallucination-probes.com.
  - 3Blue1Brown covers directions only; Welch Labs has a ~2-minute probe segment.
- **Our delta:** nothing lets you train a probe on real activations, see it pass on random labels and fail upside down
  under a one-word shift, push the model with it, and then carry it into deployment (operating points, cascades, pooling,
  adversarial pressure). The evaluation discipline, the six questions, is scattered across papers and never shown.

## Learning objectives (each checked by a predict or a check-yourself question)
1. Predict how few labelled examples a linear probe needs on a salient concept, and why a perfect training fit (even on
   random labels) proves nothing; say what a control task measures.
2. Predict what a probe trained on one distribution does on a shifted one (negation, domain), name the check that would
   have caught it, and explain why "train on both" only fixes the shift you thought of.
3. Explain why a non-linear probe's success can mean "linear in a basis you didn't guess" or "the probe computed it", and
   why accuracy isn't evidence the model *uses* a feature; name the test that is (intervention).
4. Choose the direction to steer with (difference of means vs the logistic-regression weights) and justify it.
5. Say why AUROC is not an operating point: read recall at a threshold set on deployment negatives, flags per day at a base
   rate, and why every production system is a cascade with the probe first.
6. Name three ways probes fail under optimization pressure (and one without any), and predict which probe designs survive
   RL against them.

## The one running example
**"The city of Krasnodar is in Russia." / "The city of Krasnodar is in China."** A minimal pair: same template, one
word apart. Real activations from **Qwen2.5-1.5B** (open base model, CPU), read at the statement's final token. The design
is Marks & Tegmark's *cities* dataset; their repo has no license, so we rebuilt the statements from GeoNames (CC BY 4.0)
with the same construction (`data/statements.py`), and credit theirs. The negated twin ("…is *not* in…") and the
Spanish-English translation sets (and their negations) supply the shifts.

It's safety-shaped (the dream is a lie detector), and it forces the right caveat: a truth probe reads the model's
*assessment of a statement*, which is neither the truth nor "the model is lying".

**Feasibility, already run** (our own numbers from two independent runs, Opus's and Fable's, in scratch; they'll be
re-run as project data scripts with one pinned protocol):

| check | result |
|---|---|
| truth probe, held-out cities (split by city) | 0.50 at layer 0 (every final token is "."), 0.88 at L6, 0.99 at L12, 0.999 at L16 |
| labelled statements needed (layer 16, mean of 5 draws) | **4** → logistic regression 0.97, difference of means 0.94; 16 → 0.99 / 0.98 |
| random labels, 300 training statements, 1,536 dimensions (C = 10⁴) | train **1.000**, held-out **0.52** (real labels: 1.000 / 0.99) |
| two directions, both ~0.99 (logistic regression, difference of means; spike protocol) | 57–78° apart across layers; at L16 from **42° to 67°** depending only on regularization, accuracy 0.99 throughout |
| the best single coordinate out of 1,536 | reads truth at 0.91 (L12) and 0.976 (L16): truth is a dominant axis here |
| trained on "is in", tested on "is not in" | logistic regression **0.03–0.11 at L12**, ranked upside down (AUROC **0.005**); ~0.5 at L8 and L16 because every negation lands on the false side, yet still ranked upside down (AUROC 0.02, 0.39); difference of means ~0.48 at the tick but also upside down (AUROC 0.03) |
| difference-of-means directions of the two polarities | cosine −0.79 (L8) → −0.47 (L12) → −0.15 (L16) |
| difference of means, cities → Spanish-English translations | 0.85 at L12, **0.98 at L16** (logistic regression: 0.62–0.67 / 0.78–0.79) |
| trained on both polarities | 0.99 on both; Spanish words near chance at L12; at L16 negated 0.45 → 0.83 but plain 0.79 → 0.73 (helps the shift you added, costs elsewhere) |
| a probe that sees only the country name | 0.48 (chance): the dataset controls for the country prior |
| the model's own zero-shot "true or false?" | AUROC 1.00 but accuracy 0.61 at P = 0.5: it ranks perfectly and leans "false" |
| the model's own few-shot answer vs the probe | the model is right on 96%; on the 29 statements it gets wrong, the probe has 28 right (to check with completions before we say "it knows more than it shows") |
| pushing along the difference of means (L16, final token, zero-shot) | P(TRUE) on true statements 0.44 → 0.02; on false ones 0.12 → 0.34, then saturates (the same true→false > false→true asymmetry as Marks & Tegmark's Table 2) |
| difference of means vs logistic regression, same push size (L16, few-shot) | **messy so far.** Toward "false", the difference of means moves true statements' margin 2.2× more (−3.4 vs −1.5 logits); toward "true", neither flips anything and the LR push does slightly more; big pushes lower confidence both ways. P4 needs the intervention tuned (a band of layers, more positions, Marks & Tegmark's protocol); fallback reveal: their Table 2 (13B: .77 vs .13), ITI and AxBench |

## Historical episodes (one lesson each)
- **Othello-GPT, 2022 → 2023.** A linear probe read black/white at 74.8%, an MLP at 98.7%, so the board looked
  non-linear. In "mine / yours" a linear probe reads 99.6% (Nanda et al.), and Nanda speculated the MLP had computed an XOR
  of two linear features. Lesson: a powerful probe's success can hide a linear representation in a basis you didn't guess.
- **The lie-detector arc, 2022 → 2026.** CCS finds a truth direction without labels; unsupervised methods find whatever is
  most prominent; supervised truth probes fail on negations; mass-mean directions turn out to be the causal ones;
  deception probes reach AUROC 0.96–0.999 on a 70B model; then replications fall (0.696 on another model; recall 96% → 73%
  once the threshold is calibrated correctly) and the field admits it lacks confidently labelled deception. Lesson: each
  generation fixed the last failure and found the next.
- **One contrast pair catches a sleeper agent, 2024.** AUROC 99.3% from "Are you a helpful AI? no / yes", with the
  authors' own caveat that the salience may come from how the backdoor was inserted. Lesson: contrast data need not be
  about the target, and a probe on a model organism is only as informative as the organism.
- Origin note: Alain & Bengio (2016) named "probes".

## The money shot: the cloud, the probe and the push
A glass window holds ~300 real final-token states as points (filled = true, hollow = false) on the plane spanned by the
probe's direction and the largest remaining spread. The probe is drawn as its **gold level sets** (one logit apart, ⊥ w),
and the paper below is the glass's projection onto the probe's direction: one normalized histogram per class, in the grid's
units (see `script.md`, "Visual grammar"). The learner operates it:
- a **dataset switch** (cities | negated | translations) morphs the points while the probe stays, and the accuracy drops;
- **retrain** (logistic regression | difference of means | both polarities) turns the probe (the view rotates to it), the scores recompute in
  causal order, then the accuracy lands;
- a **layer slider** recomputes the plane;
- **push mode**: drag a hollow point along a **violet arrow** (a vector added to the model's hidden state) and a paper strip
  shows the model's own answer at that strength (real, precomputed; the unsteered answer dashed; the push's size shown
  relative to the hidden state's size).

One picture shows the probe reading its training set's quirks (the flip) and reaching into behaviour (the push).

## Misconceptions to defuse (in both directions)
- "Probes need lots of data." → four statements are enough here (P1), which is also why one pair caught a sleeper agent,
  and why a handful of examples can point a probe at the wrong thing.
- "A probe that fits has found something." → random labels fit perfectly too.
- "A more powerful probe is better evidence." → Othello (P2); selectivity (same 97% accuracy, selectivity 26 vs 4.5).
- "A truth probe reads truth." → the negation flip (P3); it reads whatever separated its training set, and accuracy at a tick can hide that it's upside down (AUROC 0.005).
- "The probe's direction *is* the concept." → accuracy underdetermines the direction (two directions at 96–99.5%, 46° apart; regularization alone turns logistic regression's through 54°).
- "The best reader is the best handle." → the push (P4).
- "Unsupervised probes discover what the model believes." → they find the most prominent difference.
- "A deception probe detects the model's intent." → it reads the concept in play: misalignment probes fire on 97.7% of
  role-played misalignment, and a direction can decode the situation at AUC 0.999 while predicting the next action poorly.
- "AUROC 0.999 means it catches deception." → recall 0.009 at the deployed threshold (P5).
- "Mean-pooling is the safe default." → it's the design RL evades most easily (P6).
- "If you don't train against a probe, it keeps working." → ordinary RL can move the representation out from under it.
- Both directions: "probes are toys" (they screen production traffic at three labs in 2026) and "probes are solved"
  (replications fall, labels are scarce, obfuscation is easy under pressure, steering evidence is contested).

## Arc
Predicts are separate steps from their reveals, as in piece 1. Draft, to become `script.md` once the brief is agreed:

| # | chapter | steps (P = predict) |
|---|---|---|
| — | **Hero** | act 1: the view turns until the probe's direction lies flat, and the scores fall onto paper; act 2: a true statement is pushed along a violet arrow and the model's confidence falls. Must not spoil P1, P3 or P4. |
| 1 | **Prologue: the cheapest reader** | In 2026 a linear probe screens every exchange first in Anthropic's classifiers, misuse probes run in user-facing Gemini, and OpenAI reports activation classifiers (self-reported by each lab). What can a dot product know, and how would you find out? |
| 2–5 | **I. A direction and a threshold** | two statements and their 1,536 numbers · the probe, its level sets and its scores · why linear (every component reads the stream through a linear projection first; an expressive probe can compute what it reports) · which layer (slider, real curves) |
| 6–11 | **II. Finding the direction** | **P1** how many labelled statements? → the learning curve, then random labels fit perfectly; control tasks · the difference of means, 42°–67° from logistic regression depending on regularization · contrast pairs and no labels at all (the "what you give / what you get" table; the most-prominent-feature failure) · **P2** Othello → mine/yours on the real model with Nanda's probe; when non-linear probes are legitimate |
| 12–16 | **III. What does the probe read?** | **P3** the L12 logistic-regression probe on negations → the flip, the real matrix with both directions · the fix and its limit (our real "general truth vs polarity" figure; the translations; the country-name baseline) · **P4** which direction moves the model → the push; the arrow turns from gold to violet: same direction, two uses |
| | *(seam: the piece can be split here)* | |
| 17–24 | **IV. The probe as a monitor** | two jobs for one dot product (science vs monitoring); a probe reads *the concept in play*, not whose intent it is (a truth ruler is not a lie detector; misalignment probes fire on role-play; "the situation, not the action") · one pair catches a sleeper agent; deception probes · **P5** AUROC 0.999: what recall at the deployed threshold? → the dial (operating points, base rates) · the cascade and the long context (cost, pooling) · the 2026 evidence board (self-reported vs independent) · **P6** which pooling survives RL? → under pressure (obfuscation, chameleons, drift without pressure) |
| 25–26 | **V. The direction as a handle** | steering for free (persona vectors: drift monitoring, preventative steering, data flagging) · inhibiting evaluation awareness, and why it's contested |
| 27–28 | **VI. Limits, check yourself** | what this doesn't show · five questions, one transfer |

**The six questions** (a paper card that fills in as the chapters answer them; the transfer question uses it):
(1) representation or probe? (2) concept or dataset? (3) in the activations or in the text? (4) read or used? (5) what
happens at deployment? (6) what happens under pressure?

**Side-dishes** (the learner's word; open, beside the main course, never blocking it): the capacity of a hyperplane
(Cover's count, the transition at n = 2d); covector vs vector (a probe learns a covector, the model writes vectors; they
coincide only for isotropic noise, Park et al.'s causal inner product); why max-pooled alarms grow with length
(thresholds must be set on long negatives); recalibrating a score after a label shift. One idea per beat still holds for
the main course: a side-dish is optional depth on the beat it sits beside, with its own small figure where it helps.

## What this does NOT show
- Probes answer one question you knew to ask, with examples you could write. They don't find unknown concepts (that's
  SAEs, activation oracles and NLAs, later in the series).
- One direction vs a subspace: truth needs at least two dimensions (a general truth direction plus polarity), and
  deception may need more.
- Our real data is a 1.5B base model on simple statements; frontier results are re-plotted from papers and badged so.
- MDL / information-theoretic probing, concept erasure and structural probes get a line each, not a beat.
- Whether steering evidence about evaluation awareness holds up is contested; the piece says so.

## Format and why
**Web explorable, no narration for now** (Fable and Opus agreed independently). Probes are the archetype of a mechanism
with knobs (layer, training set, number of examples, regularization, threshold, base rate, steering strength), and every
knob drives a readout computed from real activations, including a probe you train in the browser. A video can't offer
that, and it's what landed in piece 1. It will be more animated than piece 1: the view turns to the probe, points morph between
datasets, the push is a motion with its consequence on paper, and every transition gets its reads timed. Point clouds are
drawn on canvas with our own projection math (no WebGL, so headless screenshots stay reliable), and projections change as
a grand tour, so every frame is an honest linear projection. A narrated short (the Othello and lie-detector history) can
be decided after use.

## Visual grammar (extends paper and glass)
- **Glass** = the activation space: real states as blue points, filled = true, hollow = false. No red/green for truth
  values: a false statement is not misbehaviour, and that conflation is exactly what chapter IV has to undo.
- **Gold = reading.** Probes (as level sets), boundaries, scores, monitors. Readings cross the readability boundary and land on paper as
  histograms and gauges.
- **Violet = writing.** A steering vector is a concept vector (kit token `feature`). The difference-of-means arrow appears
  gold when it reads (step 8) and *turns* violet when it writes (step 16), as one read: same direction, two uses.
- **Magenta** only for optimization pressure (RL against a probe; steering during fine-tuning). **Red / green** only for
  deceptive / honest *behaviour* in chapter IV.
- **Every impressive number travels with its counterpart**, as a pair of paper cards: AUROC 0.999 with recall 0.009 at
  the deployed threshold; 99.3% on the sleeper agent with the salience caveat; Apollo's 0.96 with the 0.696 replication.
- Badges: "real: Qwen2.5-1.5B, L12, final token · plane chosen to contain the probe"; "real · re-plotted" for papers;
  "schematic" for the cascade and overlays.

## Check yourself (draft)
1. A probe for "this text is about Paris" reaches 97% held-out accuracy at layer 2. What might it be reading, and which
   control would tell you?
2. You have 500 labelled examples, 4,096 dimensions, and 100% training accuracy. What does that tell you, and which two
   numbers do you want next?
3. Your truth probe works on "X is in Y" and fails upside down on "X is not in Y". What did it learn, how do you fix it,
   and how do you find the next shift you haven't thought of?
4. Why can the difference of means move the model's answer more than the logistic-regression direction, when the latter
   classifies at least as well?
5. *(Transfer)* A probe flags reward hacking at AUROC 0.98 on model A. The lab wants it on model B, a looped version of A.
   Walk the six questions: what do you check, and in what order?

## How this plan was made
Claude Opus (main session) and a Fable co-designer drafted plans independently, then merged them; Fable critiqued the merge
and Opus acted on it. Both chose the same running example and model.
- **From Fable:** one piece with the loop make → trust → deploy → handle; the six questions; the money shot; the three
  historical episodes; the 2026 production evidence; the learning-curve predict (it judged the random-labels one too easy
  for a data scientist); the real "general truth vs polarity" decomposition and the difference-of-means transfer row (it generalizes across domains better at layers 12–16); an equal-projection control for the push; corrections to "why linear" and to several phrasings.
- **From Opus:** the real-data spike (the inversion at L12, random labels, the 60° between rulers, the country-name
  baseline); gold = reading and violet = writing; moving the negated wall out of the hero (it spoiled P3); the AUROC-vs-
  operating-point predict (from the dossier's Parrack result); the asides.
- **Technical gate (Fable `technical-reviewer`, 2026-09-26):** verdict "fix first": 2 blockers (a sideways "evasion" that wouldn't change a reading; "difference of means reads chance", which was a threshold accident hiding an upside-down ranking) and 17 shoulds (P3–P5 posed to match their evidence; Marks & Tegmark's normalization and the cos² explanation for P4; two different controls; OpenAI's classifiers not drawn as rulers; labelled replications; the Atlas as the concept moving). All addressed in `claims.md`, `script.md` and the prototype; details in `review.md`.
- **Resolved disagreements:** diptych vs one piece (one piece, seam marked); Fable's "MLP vs linear: which tells you more?"
  predict dropped (its answer is a methodological stance, contested by Pimentel et al.); Fable's cuts of the maths asides
  kept as collapsed boxes instead of beats.

## Pipeline
- [x] Brief (this file) agreed (2026-09-26)
- [x] Dossier built (`references/probes/`, 89 sources); `claims.md` to draft from it
- [ ] `script.md` beats written, with reads
- [x] `technical-reviewer` (Fable) reviewed the script ("fix first"); blockers and shoulds addressed (`review.md`); quick re-check before the full build
- [x] The money shot prototyped (7 steps of chapters II–III, `web/`), self-reviewed and learner-sim reviewed (fixes pending)
- [ ] Visuals built
- [ ] Visual self-review (stills, motion frames, phone)
- [ ] `rigor-reviewer` and `technical-reviewer` (Fable), `learner-sim` (Opus)
- [ ] Learner went through it; feedback in `learner/journal.md`

## State and next actions (keep current: this is the handoff)

**Where we are (2026-09-26, end of the third pass: the style frame):**
- **Brief agreed**, then four answers from the learner (2026-09-26): title **"What a Probe Reads"**; the six questions stay,
  redesigned (titled, lit only where answered, a one-line answer, not controls); side dishes stay inline cards; commits go
  on main. Their feedback on the prototype: less "ruler" language (projections, the LR weights, SVD/PCA are fine), clearer
  phrasing, and a final piece "an order of magnitude above in aesthetics", with meaning encoded in the aesthetics (now in
  `learner/profile.md`).
- **Style frame built** (`web/`: hero + 7 steps of the core sequence), from a Fable art-direction consult merged with ours:
  probes drawn as level sets (covectors), one dot per statement on paper, gold rings for fitted statements, dashed ghosts,
  a grid in hidden-state units, provenance as material (badges and readouts), a motion grammar (read, shift, retrain,
  rotate), and honest rotations (every frame an orthogonal projection of a per-layer basis). The visual grammar is written
  in `script.md`. The learner-sim's prototype fixes 1–10 are applied (P3 number-first with per-option feedback; 05 → 07 as
  one argument with the g/p algebra and a layer toggle; the stretch explained by the grid and a caveat; the six questions
  titled and lit only where answered; step 02's n < d reason in a quick check; step 03's cone argument and the
  regularization slider; Krasnodar marked; hover shows each statement; the side dish's accent, labels and d + 1; phone
  layouts; no clamped points, since the scales are fitted by quantile and the glass clips honestly). Not done from that
  list: dragging the probe's direction (#11), the hunt for unknown shifts (#11, content for step 14 or the limits), and
  the check-yourself gaps (#12).
- **Data pipeline pinned** (`data/export.py` → `build/data/probes.json`, gitignored): split by city; logistic regression
  on raw centred states with no standardization (so the L2 path runs from Δμ to the max-margin direction), C = 1; every
  held-out statement exported in a per-layer basis (k = 6 at layers 8 and 16, 18 at layer 12 with the regularization
  path); fit16 at C = 10⁴ for both label sets. Numbers moved from the spike (e.g. the flip is 0.080 / AUROC 0.006 at L12;
  the two directions are 46° apart); `claims.md` rows C-II-2/2b/8/8b–d, C-III-1/8/10/11, C-VIZ-6/7 updated. New sources:
  Dobriban & Wager (1507.03003, §3.4) and Rosset, Zhu & Hastie 2003 (Theorem 2.1). Still the Marks & Tegmark statements.
- **Checks:** `node projects/probes/tests/functional.mjs` (all pass: page numbers vs exporter, dot counts vs readouts, the
  slider, P3's echo, toggles, no console errors). Stills in `build/shots2/` (desktop), `build/shots-m/` (phone); films of
  the flip (`build/motion/`), the retraining turn (`build/motion6/`), the coin-flip fit (`build/motion1/`) and the hero
  (`build/hero/`).
- **Rebuild:** `uv run --group interp --with scikit-learn python projects/probes/data/export.py projects/probes/data/spike`
  (the spike activations and CSVs sit in `data/spike/`, gitignored).
- **Not yet reviewed by the agents** (the style frame was a checkpoint for the learner's eye first). Committed and pushed
  on main with the learner's approval (2026-09-26).

**The learner's reaction to the style frame (2026-09-26):** the encodings are "cool"; the technical register is "much
better"; commit and push. Two changes asked for:
- **The paper must always be a projection of the glass** (same x, same units). The dot piles saturate (flat tops at the band
  height) and some views put the paper on its own scale (Fig. 2's logit fan; Figs. 3, 6, 7): "a common, normalized hist
  would do the work just fine".
- **A viz of how activations become data points**: a statement's tokens through a sketch of a transformer, the activation
  read and saved with its label, accurate to practice (which token? averaged over tokens? per token?), because where a probe
  reads decides what it can measure.

**Done since (2026-09-27):** the paper is the projection of the glass (`figure.js` `drawHist`/`drawAxis`): same x and
units, one histogram per class normalized to sum to 1, one height scale per view (interpolated through transitions),
recomputed every frame; the axis is the distance from the boundary in units of h; level sets continue onto the paper at an
adaptive spacing stated in the glass's scale note; the separate paper scales are gone (Figs. 2, 3, 6, 7); Fig. 2 draws
all 300 training and 748 held-out statements; hovering a bin shows its counts and its range in units and logits; the first
figure waits as an empty glass until the stage is on screen, so its read is seen. Prose and `script.md` updated.

**Done since (2026-09-27, second part):**
- **Our own statements** (`data/statements.py`): Marks & Tegmark's construction rebuilt from GeoNames (cities > 500,000,
  unique names, UN member states, no city-states, false country drawn by frequency; plus: names containing their country
  dropped): 1,026 cities in 123 countries; Krasnodar's false twin is now China. Our own Spanish-English list, 265 words, each
  once true and once false. `data/extract.py` ran Qwen2.5-1.5B on all four sets (final token, every layer) plus every token's
  state at layers 8/12/16 for the cities (~20 min CPU). `data/export.py` now writes `web/data/probes.json` (committed, 1 MB)
  and solves logistic regression exactly (Newton-Cholesky). The page's numbers followed; the prose whose *facts* changed
  was rewritten (the flip is now 31.0% with AUROC 0.010, so P3's options are ≈99/75/50/30; layer 8 is inverted like 12,
  only 16 calls every negation false; the Spanish-word pattern moved: at 16 the retrained probe ranks well but reads 68.3%);
  `claims.md` and `script.md` numbers updated; spike-only rows flagged for a re-run when their steps are built.
- **Two new steps** (`web/pipeline.js`, a second scene in the stage's SVG): *From a statement to a data point* (tokens →
  a sketch of the model → the state over "." at layer 12, tapped in gold → h as a glass chip with its 1,536 real numbers →
  a row of X with its label; the false twin recomputes only the last two columns) and *Which token?* (causal attention; the
  twins' states over "in" are identical, so a probe there is at 50.0%; per-token scores of a probe trained on every token,
  on paper under the tokens; the period 98.4%, mean pooling 98.5%, max pooling 50.0% at threshold 0 and 87.8% with its own
  threshold, because one spuriously high token decides; the literature for long inputs: CC++ smoothing, GDM MultiMax,
  McKenzie's last-token result). Claims C-I-10..17.
- `tests/functional.mjs` now takes every expected value from the exporter's numbers (survives regeneration) and checks
  the new steps (the exact "in" fact, the per-token coincidence, the readouts, the toggle).

**Next actions, in order:**
1. Quick technical re-check of `script.md` (Fable), then build the remaining ~23 steps with the new engine (`figure.js`):
   prologue and chapter I (two statements → the probe; why linear; which layer); the in-browser trainer (n, L2, shuffle;
   drag the direction); chapter II's table and Othello; P4 and the push (violet arrows: writing); chapter IV (the dial,
   the cascade, pooling, the evidence board, pressure with magenta trails); chapter V; limits and check-yourself; side
   dishes SD2–SD4 (SD2 now carries the LR ↔ Σ⁻¹Δμ ↔ max-margin derivation).
2. Full review loop: stills, films, `tests/functional.mjs`, then `technical-reviewer` and `rigor-reviewer` (Fable) and
   `learner-sim` (Opus).
3. At the end: the lessons in `review.md` into `kit/PLAYBOOK.md` (with the learner's rule: a chart under a figure shares its
   axis and units, and a normalized histogram beats a saturating dot pile); move `figure.js`/`lin.js`
   patterns that generalize into `kit/web/`.
