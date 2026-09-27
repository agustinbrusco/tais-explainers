# A Ruler Through the Glass
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
**"The city of Krasnodar is in Russia." / "The city of Krasnodar is in South Africa."** A minimal pair: same template, one
word apart. Real activations from **Qwen2.5-1.5B** (open base model, CPU), read at the statement's final token. The design
is Marks & Tegmark's *cities* dataset; their repo has no license, so we regenerate the statements from a permissively
licensed gazetteer with the same construction, and credit theirs. The negated twin ("…is *not* in…") and the
Spanish-English translation sets (and their negations) supply the shifts.

It's safety-shaped (the dream is a lie detector), and it forces the right caveat: a truth ruler reads the model's
*assessment of a statement*, which is neither the truth nor "the model is lying".

**Feasibility, already run** (our own numbers from two independent runs, Opus's and Fable's, in scratch; they'll be
re-run as project data scripts with one pinned protocol):

| check | result |
|---|---|
| truth probe, held-out cities (split by city) | 0.50 at layer 0 (every final token is "."), 0.88 at L6, 0.99 at L12, 0.999 at L16 |
| labelled statements needed (layer 16, mean of 5 draws) | **4** → logistic regression 0.97, difference of means 0.94; 16 → 0.99 / 0.98 |
| random labels, 300 training statements, 1,536 dimensions (C = 10⁴) | train **1.000**, held-out **0.52** (real labels: 1.000 / 0.99) |
| two rulers, both ~0.99 (logistic regression, difference of means) | 57–78° apart across layers; at L16 from **42° to 67°** depending only on regularization, accuracy 0.99 throughout |
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

## The money shot: the cloud, the ruler and the push
A glass window holds ~300 real final-token states as points (filled = true, hollow = false) on the plane spanned by the
ruler's direction and the largest remaining spread. A **gold ruler** crosses it with a threshold tick, and each point's
reading lands on the paper below as a gold histogram. The learner operates it:
- a **dataset switch** (cities | negated | translations) morphs the points while the ruler stays, and the accuracy drops;
- **retrain** (logistic regression | difference of means | both polarities) turns the ruler, the readings recompute in
  causal order, then the accuracy lands;
- a **layer slider** recomputes the plane;
- **push mode**: drag a hollow point along a **violet arrow** (a vector added to the model's hidden state) and a paper strip
  shows the model's own answer at that strength (real, precomputed; the unsteered answer dashed; the push's size shown
  relative to the hidden state's size).

One picture shows the ruler reading its training set's quirks (the flip) and reaching into behaviour (the push).

## Misconceptions to defuse (in both directions)
- "Probes need lots of data." → four statements are enough here (P1), which is also why one pair caught a sleeper agent,
  and why a handful of examples can point a ruler at the wrong thing.
- "A probe that fits has found something." → random labels fit perfectly too.
- "A more powerful probe is better evidence." → Othello (P2); selectivity (same 97% accuracy, selectivity 26 vs 4.5).
- "A truth probe reads truth." → the negation flip (P3); it reads whatever separated its training set, and accuracy at a tick can hide that it's upside down (AUROC 0.005).
- "The probe's direction *is* the concept." → accuracy underdetermines the direction (two 99% rulers, 42°–67° apart depending on regularization).
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
| — | **Hero** | act 1: the ruler sweeps a wall of real states and the readings light up; act 2: a true statement is pushed along a violet arrow and the model's confidence falls. Must not spoil P1, P3 or P4. |
| 1 | **Prologue: the cheapest reader** | In 2026 a linear probe screens every exchange first in Anthropic's classifiers, misuse probes run in user-facing Gemini, and OpenAI reports activation classifiers (self-reported by each lab). What can a dot product know, and how would you find out? |
| 2–5 | **I. A ruler through the glass** | two statements and their 1,536 numbers · the ruler and its readings · why linear (every component reads the stream through a linear projection first; an expressive probe can compute what it reports) · which layer (slider, real curves) |
| 6–11 | **II. Making rulers** | **P1** how many labelled statements? → the learning curve, then random labels fit perfectly; control tasks · the difference of means, 42°–67° from logistic regression depending on regularization · contrast pairs and no labels at all (the "what you give / what you get" table; the most-prominent-feature failure) · **P2** Othello → mine/yours on the real model with Nanda's probe; when non-linear probes are legitimate |
| 12–16 | **III. What does the ruler measure?** | **P3** the L12 logistic-regression ruler on negations → the flip, the real matrix with both rulers · the fix and its limit (our real "general truth vs polarity" figure; the translations; the country-name baseline) · **P4** which direction moves the model → the push; the arrow turns from gold to violet: same direction, two uses |
| | *(seam: the piece can be split here)* | |
| 17–24 | **IV. The ruler as a monitor** | two jobs for one dot product (science vs monitoring); a probe reads *the concept in play*, not whose intent it is (a truth ruler is not a lie detector; misalignment probes fire on role-play; "the situation, not the action") · one pair catches a sleeper agent; deception probes · **P5** AUROC 0.999: what recall at the deployed threshold? → the dial (operating points, base rates) · the cascade and the long context (cost, pooling) · the 2026 evidence board (self-reported vs independent) · **P6** which pooling survives RL? → under pressure (obfuscation, chameleons, drift without pressure) |
| 25–26 | **V. The ruler as a handle** | steering for free (persona vectors: drift monitoring, preventative steering, data flagging) · inhibiting evaluation awareness, and why it's contested |
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
that, and it's what landed in piece 1. It will be more animated than piece 1: the ruler sweeps, points morph between
datasets, the push is a motion with its consequence on paper, and every transition gets its reads timed. Point clouds are
drawn on canvas with our own projection math (no WebGL, so headless screenshots stay reliable), and projections change as
a grand tour, so every frame is an honest linear projection. A narrated short (the Othello and lie-detector history) can
be decided after use.

## Visual grammar (extends paper and glass)
- **Glass** = the activation space: real states as blue points, filled = true, hollow = false. No red/green for truth
  values: a false statement is not misbehaviour, and that conflation is exactly what chapter IV has to undo.
- **Gold = reading.** Rulers, ticks, scores, monitors. Readings cross the readability boundary and land on paper as
  histograms and gauges.
- **Violet = writing.** A steering vector is a concept vector (kit token `feature`). The difference-of-means arrow appears
  gold when it reads (step 8) and *turns* violet when it writes (step 16), as one read: same direction, two uses.
- **Magenta** only for optimization pressure (RL against a probe; steering during fine-tuning). **Red / green** only for
  deceptive / honest *behaviour* in chapter IV.
- **Every impressive number travels with its counterpart**, as a pair of paper cards: AUROC 0.999 with recall 0.009 at
  the deployed threshold; 99.3% on the sleeper agent with the salience caveat; Apollo's 0.96 with the 0.696 replication.
- Badges: "real: Qwen2.5-1.5B, L12, final token · plane chosen to contain the ruler"; "real · re-plotted" for papers;
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

**Where we are (2026-09-26, end of the second pass):**
- **Brief agreed** with the learner's five decisions (top of this file): one piece of ~28–30 steps; predicts for
  everything (easy or hard); web only (history video later); side-dishes open by default; go light on experiments
  (published results or badged illustrative data are fine; also in `CLAUDE.md` rule 4 and the `data-balance` memory).
- **Dossier:** `references/probes/` (95 sources; the Opus 5.5 and Sonnet 4.5 system-card texts are cached in
  `papers/web/`, gitignored). Read its §F–§H before writing the monitoring chapter.
- **`claims.md`:** ~100 rows, revised after the technical gate. Open: C-III-24 (SAE encoder/decoder bridge: find the
  passage or drop), C-SD-2 (capacity chart on real data, only if it takes minutes), C-SD-3 (a textbook citation for the
  max-of-N-Gaussians aside). Our numbers point at `data/spike/FINDINGS.md` items 1–12.
- **`script.md`:** 30 steps (hero + 29), P1–P6 and Q1–Q6, reads for every animated beat, the six-question card,
  side-dishes SD1–SD4. Revised after the technical gate; not yet re-checked by it (a quick re-check before the full
  build).
- **Technical gate:** done, verdict "fix first"; every finding addressed (`review.md`, first entry). The ideas that
  changed the piece: both rulers rank negations upside down (AUROC 0.005 / 0.03 at L12), so accuracy at a tick hides
  direction; P4 in Marks & Tegmark's normalization with the cos² ≈ 0.16 explanation (their 0.17); P5 with two probes of
  identical AUROC 0.999 catching 0.9% vs 100%; evasion drawn along the ruler (never sideways); the angle between the two
  rulers swings 42°–67° with regularization at equal accuracy.
- **Prototype of the money shot** (`web/`, 7 steps of chapters II–III): the ruler, fitting proves nothing (+ side-dish
  SD1, Cover's capacity), two rulers in true proportions, P3, the flip (fills swap in place → drift → histogram and
  readouts land), the fix and its cost, general truth vs polarity. Data: `data/export_prototype.py` →
  `build/proto/cloud.json` (gitignored: Marks & Tegmark statements). Rebuild from the repo root:
  `uv run --group interp --with scikit-learn python projects/probes/data/export_prototype.py projects/probes/data/spike`
  (the spike activations `acts_Qwen2.5-1.5B_*.npz` and the source CSVs in `data/spike/data/` sit there, gitignored,
  ~295 MB; on a fresh clone rebuild them with `data/spike/extract.py` after downloading the CSVs). Checks: `node projects/probes/tests/prototype-check.mjs` (click-through, readouts, no
  console errors); stills in `build/shots/`, flip film `build/shots/motion-flip.png`.
- **Reviews of the prototype:** visual self-review and `learner-sim` (Opus) done (`review.md`); learner-sim's verdict: build the rest this way; its 12 prioritized fixes are the first job.
- **Not committed yet** (the learner hasn't asked).

**Questions put to the learner (answers pending):** side-dish as an in-step "tray" card vs a margin column on wide
screens; are the six-question chips useful or noise; is "↔ stretched ×k" vs "true proportions" clear; commit now?

**Next actions, in order:**
1. Apply the learner-sim's prioritized fixes (`review.md`, top entry: P3 honesty; steps 05 → 07 as one argument; explain the stretch and the six chips once; …) and the learner's answers to the questions above.
2. Pin the data pipeline: regenerate the city statements from a permissively licensed gazetteer (same construction:
   false countries drawn from the true-country distribution, so the country-name baseline stays at chance), extract
   fp32 activations, one protocol (split by city, fixed C, seeds), drop or label L28 (post-final-norm), check cosines
   with and without the massive-activation coordinates; update `claims.md` from the pinned numbers.
3. Quick technical re-check of `script.md` (Fable), then build the remaining steps in order: prologue and hero; chapter
   I (steps 2–5); the in-browser trainer (step 7: n, L2 and shuffle knobs; the angle readout); chapter II's table,
   Othello (re-plotted, schematic XOR); step 16's push (drawn to scale in the plane of the two rulers; our real push as a
   badged secondary panel only if a tuned version is clean); chapter IV (the dial with two probes, the cascade, pooling,
   the evidence board, pressure); chapter V; limits and check-yourself; side-dishes SD2–SD4; the six-question chips on
   phones.
4. Full review loop before showing the learner: stills (desktop, phone, reduced), `--clock` films of every animated
   beat, `tests/functional.mjs`, then `technical-reviewer` and `rigor-reviewer` (Fable) and `learner-sim` (Opus).
5. At the end of the piece: add the prototype's lessons (listed in `review.md`) to `kit/PLAYBOOK.md`.
