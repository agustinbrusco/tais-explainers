# Script: What a Probe Reads

## Arc
1. **Question:** linear probes now screen production traffic at two labs, and a third uses activation classifiers. What can a dot product know about a model, and how would you find out?
2. **Why the obvious answer fails:** "train a classifier on activations and check its accuracy" answers almost nothing:
   four examples already give 97%, coin-flip labels fit perfectly, and a 99% probe reads negations upside down.
3. **The idea:** a linear probe is a direction and a threshold: its score is the projection of the hidden state onto w,
   plus a bias, and logistic regression, the difference of means and PCA of paired differences are three ways to find w.
   Six questions separate what it reads from
   what you hoped it reads: representation or probe? concept or dataset? activations or text? read or used? deployment?
   pressure?
4. **Watching it work:** real states of a real model; the probe, the flip, the fix; the push that writes with the reader's
   cousin.
5. **Where it breaks:** as a monitor, AUROC isn't an operating point, the probe reads the concept in play rather than
   intent, and optimization finds the blind spot (or drifts into one with no pressure at all).
6. **What's left:** a cheap, useful first stage and a steering handle, with contested evidence, and one question at a time.
7. **Check yourself.**

## Two kinds of predict (the learner: "go for everything", easy or hard)
- **Predict / reveal step pairs** (P1–P6): the core misconceptions. The stage never leaks the answer; guess buttons echo
  "You said X" at the reveal; every option has a rationale.
- **Quick checks** (Q1–Q6): one-click questions inline in the prose, answered in place, for the basics (so easy ones don't
  cost a whole step).

## Beats (web explorable; one prose step per beat; `render(i)` is a pure function of the step)
Status: 🔲 planned. Real data: our spike (to become `data/` scripts with a pinned protocol). "Re-plotted" = published
numbers drawn on paper. "Illustrative" = drawn to carry the idea, badged so.

| # | step (on screen) | scene | what should click | claims |
|---|---|---|---|---|
| 0 | Hero | canvas, two acts (below) | a probe reads; its direction can also write | C-I-6, C-III-20 |
| 1 | The cheapest reader | paper: three production cascades; Anthropic's and Google DeepMind's start with a probe (gold level sets), OpenAI's with a classifier box (architecture undisclosed); cost bars | probes guard real traffic; the question of the piece | C-PRO-1..7 |
| 2 | Two statements, 1,536 numbers each | two cards over glass; each card's real L12 state as a 32 × 48 grid; then their difference | hidden states are numbers; you can't see truth in them by eye | C-I-2, C-I-3, C-I-9 |
| 3 | A direction and a threshold | the grids fold into points; 748 held-out statements; the probe's gold level sets (one logit apart, ⊥ w) and its boundary; each score falls onto paper as one dot (beeswarm), counts per side; drag the direction's angle | a probe = w and b; score = projection onto ŵ; level sets ⊥ w | C-I-1, C-I-6, C-VIZ-1/2 |
| 4 | Why linear? | the residual stream as a bus; attention and MLP read it through linear projections (the same operation as the probe); a non-linear probe beside it that can compute | linear = what the next layer can read in one step; an expressive probe can compute what it reports | C-I-4, C-I-5 |
| 5 | Which layer? | layer slider 0–28 (auto-plays once): at L0 all 300 states sit on one point; they spread and split; real accuracy curves below. **Q1** "At layer 0, what does the cloud look like?" | where a concept becomes readable; the L0 sanity check | C-I-6..8 |
| 6 | **P1** How many examples? | the cloud greyed, labels hidden; "n = ?" | (predict) | C-II-1 |
| 7 | Four statements | the in-browser trainer: n and L2 sliders, the probe refits live, held-out readout, real learning curve (5 draws); then **shuffle labels**: training 1.000 (guaranteed: n < d + 1), new statements still read confidently to both sides, half right (0.52). Two cards: "shuffled labels: does fitting mean anything?" and "control task: how much is memorized identity?" (selectivity 26 vs 4.5; linear still 71.2 on the control) · side-dish **SD1** | salient concepts need a handful of examples; fitting proves nothing; held-out and controls answer different questions | C-II-1..5, C-SD-1/2 |
| 8 | Two directions that both read truth | drawn in the plane of w and Δμ, in true proportions: the class means, Δμ's boundary dashed, 46° from logistic regression's (layer 12); the L2 slider turns w from Δμ (strong penalty) to 54° away (weak; toward the max-margin direction) while accuracy stays 0.960–0.995; the view turns with it | no training needed; accuracy underdetermines the direction; under equal covariances and infinite data, LR ≈ Σ⁻¹ × (difference of means) | C-II-6..9 |
| 9 | Contrast pairs, and no labels at all | every true/false twin joined by a short segment; the segments line up far beyond chance (mean cosine 0.56 with their average at layer 12); their mean = the arrow. Paper table "what you give / what you get" (labels → LR, mean difference; pairs → CAA, persona vectors, the eval-awareness pair, the sleeper pair; no labels → PCA of differences, CCS; the model's own behaviour → semantic-entropy probes). **Q2** Banana/Shed | a pair is a paired design: everything else cancels; unsupervised finds the most prominent difference | C-II-10..18 |
| 10 | **P2** Othello | a paper Othello board; linear 75% vs MLP 98.7% on black/white | (predict) | C-II-19, C-II-20 |
| 11 | Mine and yours | the board recoloured mine/yours: linear 99.6%; four clusters (mine/yours × whose turn) coloured black/white form an XOR a single direction can't split (schematic: Nanda's hypothesis; check: 53% empty + 47% × ½ ≈ 76%); recolour, and it can. Then: when a non-linear probe is legitimate (pooling across tokens; circles need a 2-D linear probe; onion codes in small GRUs) | a powerful probe's success can hide a linear representation in a basis you didn't guess; pooling, circles, onions | C-II-19..27 |
| 12 | **P3** Say "not" | the L12 probe over the affirmative cloud; the negated cloud hidden | (predict) | C-III-1 |
| 13 | Upside down | dataset switch: each dot becomes its negated twin (fills swap in place, then the dots drift); the probe stays; 0.080 at the threshold and AUROC 0.006: ranked upside down. Layer slider: at 8 and 16 accuracy ≈ 0.5 because every negation lands on the false side, yet AUROC 0.03 and 0.29. The difference of means: 0.485, AUROC 0.03. Re-plotted: Levinstein & Herrmann .826 → .408 (MLP probe, LLaMA-30B) | a truth probe reads whatever separated its training set ("city and country match", our inference, beside Marks & Tegmark's "close association"); accuracy at a threshold can hide which way a direction points | C-III-1..6 |
| 14 | The fix, and its limit | retrain on both polarities: the view turns 65° to the new w (the old boundary a dashed ghost), 0.992 / 0.992; then the Spanish-word sets: 0.511 / 0.582 at L12 although ranked well (AUROC 0.94 / 0.91: the threshold doesn't transfer); at L16 0.915 / 0.983 (the affirmative-only probe: 0.972 / 0.500). Levinstein & Herrmann's NegFacts2 (.53–.60) as the published counterpart. The real (t_G, t_P) plane: four clusters, truth along t_G for both polarities, t_P flipping. Country-name baseline 0.48 | the fix covers the shift you added and can cost elsewhere; truth is at least 2-D; no surface shortcut here (question 3) | C-III-7..12, C-DEF-3 |
| 15 | **P4** Which one pushes? | the plane of w and Δμ; the average false statement's point; each direction's push drawn as far as it takes for that probe's own score to say "true" (Marks & Tegmark's rule) | (predict) | C-III-15, C-III-22 |
| 16 | The best reader isn't the best handle | the difference-of-means arrow turns gold → violet; the two pushes drawn to scale: the logistic push is short and mostly sideways, its component along the class-mean direction cos² ≈ 0.16 of the other's (Marks & Tegmark measured 0.17); push mode with the model's answer on a paper strip (our real push, badged: one layer, final token); published pairs at tuned strengths (ITI 42.3 vs 34.8; AxBench 0.098 vs 0.239) · side-dish **SD2** | reading ≠ writing: the model's answer follows the class-mean direction; the reader's extra components read without writing (a labelled hypothesis) | C-III-13..24, C-SD-5, C-DEF-4 |
| — | *seam* | | | |
| 17 | Two jobs for one dot product | the probe moves from the bench (science) to a turnstile (monitoring); three cards: a truth probe ≠ a lie detector; misalignment probes fire on 97.7% of role-play; "the situation, not the action" (0.999 vs 0.801) | a probe reads the concept in play, not whose intent it is | C-IV-1..4 |
| 18 | One pair, one sleeper agent | the pair as two cards; 99.3% paired with its caveat card; Apollo 0.96–0.999 paired with three labelled counterparts: same recipe on another model (0.696), same model with corrected threshold (recall 96% → 73.2%, AUROC reproduced), trained organisms (balanced accuracy 0.85 → 0.52); "we lack confidently labelled deception" | contrast data need not be about the target; labels are the weak point | C-IV-5..9 |
| 19 | **P5** AUROC 0.999 | three score distributions hidden; the threshold at "1% of ordinary chat" | (predict) | C-IV-10 |
| 20 | Not an operating point | the dial with two probes of identical AUROC 0.999 and the same threshold rule (1% FPR on ordinary chat): recall 0.9% and 100% (re-plotted rows; illustrative distributions shaped to them); a second toggle where the honest baseline shifts up (false alarms); threshold slider; base-rate readout (flags per million a day, precision). Das: agents shown the scores stay ranked (AUROC 0.975 → 0.912) while recall at the frozen tick falls 0.95 → 0.41 · side-dish **SD4** | calibrate on deployment negatives; AUROC can't tell you recall at your threshold | C-IV-10..12, C-SD-4 |
| 21 | Stage one of a cascade | traffic particles through probe → classifier → LLM; ~5.5% escalated; log-scale cost bars; McKenzie 43% vs 55% at 1% FPR; cascades beat either alone | probes are cheap and weaker alone; that's why they're first | C-PRO-2/5/6, C-IV-13 |
| 22 | One score per transcript | a long paper strip of tokens with per-token scores (illustrative, or our probe on a paragraph); mean, max, attention pooling; Gemini long-context misses (87.88%, 99.13%) and false alarms (13.55%) · side-dish **SD3** | pooling decides what a probe sees | C-IV-14, C-IV-15, C-SD-3 |
| 23 | Deployed, 2026 | evidence board: self-reported (Anthropic cascade, prompt-injection probes, Gemini, OpenAI recall without FPR, Goodfire +3.1 / −7.9) vs independent checks (Liars' Bench, replications, intent vs text, textual leakage) | calibrate both ways | C-PRO-1..4, C-IV-16, C-IV-24/25 |
| 24 | **P6** Train against it | a frozen probe in the RL reward; three pooling choices | (predict) | C-IV-17 |
| 25 | Under pressure | re-plotted evasion bars (mean 0.82, max 0.044, attention 0.018) with the trade-off card (max pays in long-context false alarms); the five threats kept apart (input attack; RL against; deliberately trained; the concept moving with no pressure; instructed suppression); two badged pictures of evasion: points pushed *along −w* across the boundary (Chameleons, RL-obfuscation), and the honest cloud shifting so the frozen threshold misses (Das). No sideways escape: moving along a level set doesn't change a score | a monitor you train against stops being one; even untouched ones can lose their concept | C-IV-17..23 |
| 26 | Steering for free | persona vectors (monitor drift, preventative steering, flag data); the refusal direction (ablate / add), with its dual-use note | a probe's direction is a handle, for safety and against it | C-V-1, C-V-2 |
| 27 | Contested: steering away evaluation awareness | Sonnet 4.5 (0 → up to 8–9% misaligned; random features 0%); GLM-5 control vectors as large (80%); prompting often beats steering | what evidence would settle it | C-V-3..5 |
| 28 | What this doesn't show | limits board | | C-VI-1..5 |
| 29 | Check yourself | the six-question card, filled; five questions, one transfer | | — |

## Reads (animated beats; times from the moment the step becomes active)
- **0 Hero.** Act 1: (0.0–1.5) a field of ~300 real points drifts in perspective, grey; (1.5–3.0) the view turns (an honest rotation
  through the basis) until the probe's direction lies flat; (3.0–5.5) its gold level sets draw in and the scores fall onto a paper strip; (5.5–7)
  hold, title. Act 2: (7.0–8.5) one filled point is picked out; (8.5–10.5) a violet arrow grows from it and pushes it toward the false side;
  (10.5–12.5) under the glass, a paper bar for the model's own answer falls (real, from our push; which readout is honest and legible, zero-shot P(TRUE) or the few-shot margin, is decided in the prototype); (12.5–14) hold, caption
  "A probe reads a model. Its direction can also write."
- **2 Two statements.** (0–1.0) two cards; (1.0–2.5) numbers pour from each card into the glass and settle as grids;
  (2.5–4.5) hold on the pair; (4.5–6.0) the difference grid fades in between them; hold.
- **3 The probe.** (0–0.7) points appear; (0.7–1.6) the level sets draw in, boundary first; (1.7–3.7) each score falls from
  its point along its level set, through the glass edge, and piles on paper, in score order; (3.5–3.9) the axis; (3.9–4.4)
  counts and the readout "99.5%" land. (Built in the style frame.)
- **5 Which layer?** (0–1.0) the slider knob at 0, all points on one spot, label "every last token is '.'"; (1.0–7.0) the
  knob travels to 28 (one layer every ~0.2 s, cloud and curve advance together; the curve point lands with its layer);
  (7.0–8.0) the knob returns to 12, hold.
- **7 Four statements.** (0–1.0) n = 4: four points light up (gold rings), the level sets snap; (1.0–2.0) held-out readout 0.97 at L16;
  (2.0–4.0) the learning curve draws; then, on "shuffle labels": (0–1.0) fills scramble; (1.0–2.0) the probe refits,
  training 1.000; (2.0–3.5) held-out points fade in and settle on the tick, 0.52.
- **8 Two directions.** (0–1.1) the plane changes to (w, Δμ) and un-stretches (grid cells become squares); (0.5–1.2) the class
  means, Δμ's boundary (dashed) and the 46° arc; (1.1–1.5) readouts. Slider moves are single eased turns of the view.
- **9 Contrast pairs.** (0–2.0) segments draw between twins, one pair at a time for the first three, then all at once;
  (2.0–3.0) the segments fade to their mean, which becomes the arrow; hold.
- **11 Mine and yours.** (0–1.5) the board recolours; (1.5–2.5) linear readout 99.6%; (2.5–4.5) four clusters appear in
  black/white colours, a single direction tries and fails (a sweep that never separates); (4.5–6.0) recolour by mine/yours, and one
  direction separates them.
- **13 Upside down.** (0–0.7) the probe holds; (0.7–1.8) truth flips in place: fills swap and circles become squares, sweeping
  across; (2.0–3.3) each point travels to its twin's state and its dot slides on paper; (3.3–3.8) cards; (3.4–3.9) "99.5% → ?"
  becomes "99.5% → 8.0%" and the AUROC. (Built in the style frame; filmed.)
- **14 The fix.** (stage A, 0–1.5) the plane changes to span(w, w₂), true proportions, affirmatives join; (stage B, 0.2–1.9)
  the view turns 65° rigidly, the old level sets turning with it, then fading as the new ones draw in (the old boundary stays
  dashed, with the arc); (1.5–2.5) readouts 0.99 / 0.99; (2.5–4.5) switch to
  translations, points move, readout lands; (4.5–7.0) the (t_G, t_P) plane: four clusters appear one at a time.
- **16 The push.** (0–1.0) the arrow's colour turns gold → violet; (1.0–3.0) a point moves along it and the paper strip
  moves with it; (3.0–5.0) the same push along the logistic direction, and the strip moves less.
- **20 The dial.** (0–1.5) the chat distribution fills; (1.5–2.5) the threshold settles at its 99th percentile; (2.5–4.5)
  the test distributions fill, well separated from each other and both to the left of the threshold; (4.5–5.5) recall 0.009.
- **21 The cascade.** (0–3.0) particles flow into the probe; (3.0–5.0) 5.5% continue; (5.0–7.0) cost bars grow on a log
  scale, one at a time.
- **25 Under pressure.** (0–2.0) the evasion bars grow, one at a time; (2.0–5.0) the deceptive points slide along −w across the
  frozen boundary, one at a time, with magenta trails; hold.

## Predicts (each: the question, options with rationales, the misconception)
- **P1** (step 6). "How many labelled statements does a linear probe at layer 16 need before it reads *held-out*
  statements at 95%?" · ~10 ("truth is a big, clean direction here") · ~100 ("you need to average out 1,536 noisy numbers") ·
  ~1,000 ("more examples than dimensions, or it overfits"). Answer: ~10 (four gives 0.97). Misconception: probes need lots
  of data; the d ≫ n reflex applies to *fitting*, not to finding a salient direction.
- **P2** (step 10). "A linear probe reads each square as black/white/empty at 75%, an MLP at 98.7%. What does the model
  represent?" · "The board in black and white, stored non-linearly" · "Something else, stored linearly, that the MLP
  recombines" · "Nothing like a board: the MLP computed it from the moves". Answer: the second. Misconception: probe success
  ⇒ the concept is represented the way you probed it.
- **P3** (step 12). "Take the layer-12 probe from the first figure, 99.5% on new affirmative statements, and give it 'The city of Krasnodar is not in Russia.' along with the other 747 negated statements about the same held-out cities. What share does it read correctly?" Number-first options of equal weight, each with a mechanism: "≈ 99%: the state encodes the truth, 'not' included" · "≈ 75%: 'not' adds noise it never trained on" · "≈ 50%: it never saw 'not', so it guesses" · "≈ 10%: it relies on something 'not' leaves unchanged". Answer: ≈ 10% (8.0%; AUROC 0.006). Per-option feedback at the reveal (≈ 99%: the states do carry the truth, a retrained probe reads it at 99.2%; ≈ 75%: not noise, systematic; ≈ 50%: that's what layers 8 and 16 score, for a different reason). Misconception: a truth probe reads truth.
- **P4** (step 15). "Push the average false statement along each direction until *that probe's own score* says true (Marks & Tegmark's rule). Then ask the model. Which push moves the model's answer more?" · "Logistic regression's: it reads best" · "The difference of means'" · "The same: each probe now scores it 'true'". Answer: the difference of means (NIE .77 vs .13 at 13B; the gap closes at 70B). The reveal draws why: the logistic push is short and mostly sideways to Δμ; its component along the class-mean direction is cos² ≈ 0.16 of the other's. Misconception: the best reader is the best handle.
- **P5** (step 19). "A deception probe scores AUROC 0.999 on insider-trading transcripts. Its alarm is set to flag 1% of ordinary chat. What share of the insider-trading lies does it flag?" · "~99%: 0.999 is near-perfect separation" · "Anything from ~0% to ~100%: AUROC doesn't fix it" · "~1%: the threshold came from different data". Answer: anything; two probes with the same 0.999 caught 0.9% and 100% under the same rule. Misconception: AUROC = deployment performance.
- **P6** (step 24). "RL rewards a model for harmful answers a frozen probe doesn't flag, with no gradients through the probe.
  Which probe does it learn to evade?" · "Mean over tokens: loud tokens get averaged away" · "Max over tokens: it only has to
  keep every token quiet" · "A learned attention probe: it can be steered to look elsewhere". Answer: mean (0.82 vs 0.044 and 0.018). Misconception: any aggregation is as good as another. The reveal adds the trade-off: max-style pooling pays in false alarms on long inputs (step 22).
- **Quick checks:** Q1 the layer-0 cloud (step 5); Q2 Banana/Shed (step 9); Q3 "is the truth in the words?" before the
  country-name baseline (step 14); Q4 flags per day at 1% FPR on a million requests (step 20); Q5 "does a probe you never
  train against keep working after RL?" (step 25); Q6 "is a steering vector that changes behaviour a good monitor?" (step 26).

## The six-question card
A paper card beside the stage from step 7 on; each question gets a check and a one-line answer when a chapter answers it:
(1) representation or probe? (steps 7, 11) (2) concept or dataset? (13, 14, and 25 for the concept moving) (3) in the activations or in the text, i.e. could a reader of the text alone get this label (14: no surface shortcut; 23: behaviour spelled out) (4) read or used? (16: the class-mean direction is used; a reader can add components that read without writing) (5) what happens at deployment? (19–23) (6) under pressure? (24, 25). Step 29's transfer question
walks it.

## Side-dishes (open by default, beside the main course)
- **SD1** beside step 7: *How many points can a hyperplane split?* Cover's count; the capacity 2d; our capacity chart if it
  is cheap (C-SD-1/2).
- **SD2** beside step 16: *Readers are covectors.* A probe is a linear functional; a push is a vector. Two different conditions make them agree: isotropic within-class noise (the LDA picture), or, for Park et al. at the final layer, a change of inner product by the unembedding covariance (C-SD-5, C-III-23).
- **SD3** beside step 22: *Why max-pooled alarms grow with length* (C-SD-3).
- **SD4** beside step 20: *Recalibrating a score when the base rate moves* (label shift only) (C-SD-4).
- UI to explore (prototype): a third "side table" column on wide screens, aligned with its step; a hanging card on medium
  screens; inline and visibly distinct on phones. A side-dish never contains the only statement of a main-course fact.

## Visual grammar (keep consistent; built in the style frame, `web/figure.js`)
Meaning lives in form, not captions (the learner, 2026-09-26: "meanings encoded in the aesthetics"; Fable's design memo).
- **Glass** = the model's interior: real states as blue points; filled = true, hollow = false; circle = affirmative, square =
  negated (the flip morphs circles into squares as the fills swap). No red/green for truth values.
- **A probe is a covector, drawn as its level sets:** gold lines of equal score, one logit apart, perpendicular to w; the
  heavy one is the boundary, which crosses the glass edge onto paper. Their spacing is 1/‖w‖ (sharpness = confidence), and
  "moving along a level set doesn't change the score" is visible. **Arrows are for writing** (violet steering vectors).
- **Paper** = readable: each statement's score is one gold-ink dot, piled where it lands (a beeswarm); counts per side come
  from the dots, so the readout can't disagree with the drawing. Drops fall along the level set, then slide to the pile (a
  fan when the paper has its own scale: the ×‖w‖ amplification in the coin-flip beat).
- **Gold ring** = a statement the probe was fitted to. **Dashed** = the counterfactual: another probe's boundary (a ghost),
  the old direction after retraining, the unsteered answer.
- **Grid in hidden-state units:** square cells = true proportions, wide cells = a stretched axis (noted "↔ ×k"); it turns
  with the points in an in-plane rotation, so rotations and data shifts look different.
- **Motion grammar:** read = drops in score order; shift = fills swap, then points travel to their twins (grid and probe
  still); retrain = the old level sets turn with the view and give way to the new (old boundary stays dashed); rotate = rigid
  with the grid; write = arrow grows, point slides, paper bar moves after; pressure = magenta trails along −w, gate fixed.
  Views of one layer interpolate the frame on the sphere, so every frame is an orthogonal projection (`lin.js`).
- **Provenance as material:** badges are ink with a glyph (glass chip = real data, outline = schematic, dots =
  illustrative); readouts are big numbers, gold when measured on the model, ink for counterparts. The green badge is gone
  (green is reserved for honest behaviour in chapter IV).
- **Violet** only for writing; **magenta** only for optimization pressure; **red / green** only for deceptive / honest
  behaviour (17–25). At most 4 semantic colours per frame.
- **Pairs:** every impressive number travels with its counterpart ("99.5% → 8.0%"; 18, 20, 23).
- **The six questions:** a strip of glyphs under the figure (hollow → half at the answering step → filled), plus a ledger card
  in the prose where a question is answered. Not controls.

## Cut list
- MDL / information-theoretic probing, structural probes, concept erasure (LEACE, INLP): a line each in 4 or 28, no beat.
- Real Othello-GPT activations: re-plot Nanda et al.'s table instead (go light on experiments); revisit if cheap.
- Sentiment neuron, word2vec analogies: history outside the probe story.
- SAE probes vs linear probes: one sentence in 23 (Kantamneni; GDM), the SAE piece owns it.
- A narrated video of the history: after the web piece converges.
