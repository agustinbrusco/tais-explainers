# Spike findings (2026-09-26, scratch; our own runs, not yet a claims source)

Model: Qwen/Qwen2.5-1.5B (base), fp32 CPU, HF transformers, last token of the statement ("."), hidden_states[l]
(l=0 embeddings; l = output of block l-1; the last entry is post-final-norm). Data: Marks & Tegmark geometry-of-truth
CSVs (repo has NO license: rebuild our own dataset for the piece). Splits keep each city's true/false pair together.

1. Truth probe works: LR held-out accuracy (split by city) 0.50 @L0 (all last tokens are "."), 0.72 @L4, 0.88 @L6,
   0.94 @L8-10, 0.99 @L12, 0.999 @L16, ~0.99 to the end. Diff-in-means: 0.96 @L12, 0.98 @L16, falls to 0.80 @L28.
2. Cover: random labels, n_train=300, d=1536, C=1e4: train 1.000, test 0.524. Real labels n=300: train 1.000,
   test 0.991. Sketch: random-label held-out points collapse onto the boundary; the random probe's scores are ~20x larger
   (huge weight norm). The top remaining PC in the random-label view is the truth axis.
3. Reading vs writing: cos(w_LR, dmu) = +0.2..0.54 by layer (0.39 @L16 in one split, 0.50 in another), while both
   classify at 0.98-0.999. In the (dmu, w) plane, w tilts toward a low-variance direction (LDA-like).
4. Random 2D projection is NOT a blob at L16: best line in a random 2D view = 0.90; top-2 PCA view = 0.99 (truth is a
   dominant axis). Don't claim "random view = one blob" for this concept/layer.
5. Negation (the big one): probe trained on affirmative ("is in"), tested on negated ("is not in"):
   LR 0.428 @L8, 0.195 @L10, **0.106 @L12**, 0.286 @L14, 0.503 @L16, 0.43 @L18. Trained on negated -> affirmative:
   **0.032 @L14**. cos(dmu_aff, dmu_neg) = -0.79 @L8, -0.47 @L12, -0.15 @L16..20. Trained on both: 0.99 on both.
   i.e. an affirmative-only probe is confidently *inverted* on negations at L12: it learned something like "city and
   country match", which "not" flips.
6. Generalization matrix (LR trained on the full set, tested on another):
   L12: cities->neg_cities 0.128, cities->sp_en 0.667, cities->neg_sp_en 0.124, neg_cities->cities 0.221,
        sp_en->neg_sp_en 0.062, cities+neg_cities -> sp_en 0.523 / neg_sp_en 0.506.
   L16: cities->neg_cities 0.499, cities->sp_en 0.777, neg_cities->neg_sp_en 0.927, sp_en->neg_sp_en 0.099,
        cities+neg_cities -> sp_en 0.749 / neg_sp_en 0.941.
7. Text-only baseline: LR on the country name alone (one-hot, 108 countries), held-out cities: 0.483 (chance). M&T drew
   the false countries from the same distribution as the true ones, so the country prior carries no signal: the probe
   reads what the model knows, not the surface form. (A clean "question 3" control.)
8. Belief vs truth (few-shot TRUE/FALSE prompt, 748 held-out cities): the model's own judgement is right on 0.961; the
   L16 probe (no context) on 0.999 and agrees with the model on 0.963. On the 29 statements the model judges wrongly,
   the probe sides with the MODEL on only 0.03, i.e. it has the fact right on 28 of 29 (e.g. "Mombasa is in India":
   model TRUE, probe FALSE). "Knows more than it shows" (Orgad et al.; Burns' latent-knowledge motivation), but check
   with greedy completions ("The city of Mombasa is in" -> Kenya?) before saying so.
9. Steering v1 (blocks 8/10/12, split, alpha <= 1 class gap in total, final token, few-shot): no effect (logit diffs
   move by < 0.1). Too small: |push| << |h|. Fable's zero-shot run at L16, final token, alpha in class gaps:
   P(true|true) 0.44 -> 0.02 at alpha -3 (|push|/|h| 0.8); P(true|false) 0.12 -> 0.32 at +1.5, 0.34 at +3 (saturates);
   the same true->false > false->true asymmetry as Marks & Tegmark report. "All positions" pushes are non-monotonic.
   Steering v2 (L16, one layer, +-1.5/3 gaps, dmu vs w vs w at equal projection) running.
10. Steering v2 (L16 = output of block 15, final token of the statement, few-shot readout, 24 true + 24 false; log in
    steer_v2.log). Baseline margins: true +3.95, false -2.74. Equal norm |push|/|h| = 0.8:
    dmu -3: true +0.60, false -3.97 | w -3: true +2.46, false -2.66 (dmu moves true statements 2.2x more toward "false").
    dmu +3: true +3.22, false -2.07 | w +3: true +3.35, false -1.71 (toward "true", nothing flips; w slightly more).
    Equal projection on dmu (w/cos, |push|/|h| = 1-2): confidence collapses both ways (false -1.30 at -3, -1.87 at +3):
    pushes this large disrupt the model. Verdict: single-layer, single-token pushes are too messy for P4 as posed; tune
    (band of layers, Marks & Tegmark's positions) or use their Table 2 as the reveal.
11. General truth vs polarity (`tgtp.py`, split keeps pairs together): t_G = (dmu_aff + dmu_neg)/2, t_P = (dmu_aff -
    dmu_neg)/2. |t_G|/|t_P|: 0.18 (L2), 0.60 (L12), 0.87 (L16), 0.61 (L28). A ruler along t_G reads affirmative / negated
    held-out: 0.86 / 0.71 (L12), 0.97 / 0.90 (L16). Along t_P: 0.98 / 0.42 (L12), 0.98 / 0.25 (L16): it flips with "not".
    Sketch: build/sketches/truth-vs-polarity.png (four clusters; truth along t_G for both polarities).
12. Checks asked for by the technical review (`tech_checks.py`, split by city halves, C = 1):
    - Ranking of negated statements (AUROC; < 0.5 = upside down). LR ruler: 0.022 (L8), 0.005 (L12), 0.394 (L16).
      Difference of means: 0.036, 0.034, 0.240. Accuracy at the tick hides this: LR 0.50 at L8 (calls all false), DiM
      0.42-0.50. Both rulers rank negations upside down at every layer tested.
    - Best single coordinate (picked on training, scored on held-out affirmative): 0.750 (L8, dim 284), 0.908 (L12, dim
      596), 0.976 (L16, dim 179). So "no single number says which is true" is false; say "not by eye".
    - True-minus-false pair differences vs their mean (dmu): mean cosine 0.29 (L8), 0.56 (L12), 0.74 (L16), n = 374.
      (Random directions in 1,536-d: ~0 +- 0.03.)
    - LR vs dmu angle at L16 by regularization: C = 1e-4: 41.7 deg; 1e-3: 47.7; 1e-2: 57.9; 0.1: 65.0; 1: 66.7; 10: 67.2;
      held-out accuracy 0.989-0.999 throughout.
    - Prototype protocol (export_prototype.py): the affirmative-only ruler on Spanish words: 0.523 / neg 0.446 (L12),
      0.785 / 0.449 (L16); trained on both polarities: 0.506 / 0.508 (L12), 0.726 / 0.831 (L16).
