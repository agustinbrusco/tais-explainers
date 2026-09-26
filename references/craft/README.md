# Craft: explainers worth learning from

This folder is about how to *show* things. Each entry says what the piece does well, concretely enough to reuse. Write
entries from actually looking at the piece (screenshots stay in the scratchpad and aren't committed; they're the
authors' work).

## Goodfire, "A Geometric Calculator Inside a Neural Network" (2026-05-14)
https://www.goodfire.com/research/a-geometric-calculator · examined 2026-09-25 via per-figure screenshots
- **Real data under idealized geometry.** Actual activation point clouds, projected onto a circle plane and colored by
  value, have a thin ideal circle and number labels drawn on top. You see both the noisy truth and the clean model of it,
  and how well they agree. → *Kit idea:* a `real` layer plus a `schematic` overlay in one figure, each with its own
  badge-level honesty.
- **Direct manipulation of inputs.** Sliders set "Input month = August" and "Offset = five". A highlighted point moves
  along the real manifold, and the output point lands where the mechanism predicts. The computation becomes a thing you
  can operate.
- **One knob → causal effect → output distribution.** In the steering widget, one slider (the "steering target") drives
  five clock dials (periods 2, 5, 10, 20, 50) *and* a probability strip over the month tokens. The steered answer is
  filled, and the unsteered expected answer has a dashed outline. Cause and effect share one screen.
- **Tabs for parallel structure.** Mod-2 / mod-5 / mod-10 submodule tabs show that the same mechanism is instanced
  several times, without cluttering one figure.
- **A single metaphor anchor.** The calculator icon stands for "the addition module" in every figure, and reappears
  whenever the operation happens.
- **Restraint.** Warm paper background, earth-brown UI chrome, and monospace labels. Saturated color is reserved for
  *data*: a cyclic rainbow, appropriate because the variable is cyclic.
- **Lessons for this repo:**
  1. Where possible, the money shot should be *real activations you can steer*, not a cartoon.
  2. Put the output distribution on screen whenever you intervene.
  3. Reserve saturated color for data. Our semantic tokens already do this, so keep UI chrome neutral.
