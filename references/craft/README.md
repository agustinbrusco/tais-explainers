# Craft: explainers worth learning from

This folder is about how to *show* things: other people's work we learn from. Our own patterns and lessons live in
`kit/PLAYBOOK.md`. Study tools: `scripts/study_page.mjs` (pages) and `scripts/storyboard.py` (videos). Each entry says what the piece does well, concretely enough to reuse. Write
entries from actually looking at the piece (screenshots stay in the scratchpad and aren't committed; they're the
authors' work).

## Welch Labs (YouTube)
https://www.youtube.com/@WelchLabs. Recommended by the learner as top-tier, *especially visually*. Their 2026-08-31 video
on ResNets and the residual stream is this series' residual-stream prerequisite, so we don't re-make it.
- *Examined 2026-09-26* through YouTube's storyboard frames (low-resolution stills every few seconds) of "The most cited paper
  of the century is a brilliant hack" (ResNets) and "The Dark Matter of AI" (mechanistic interpretability). Claude can't
  watch video; stills show composition and color, not pacing or motion.
- **Two worlds, hard-cut.** A physical desk (warm wood, paper printouts of the original papers, hands pointing, rulers, pens;
  hand-drawn architecture diagrams on paper) and a black computer-graphics void where the model lives. Readable artifacts
  are literally paper. → *Borrowed as* this repo's paper/glass materials.
- **Tensors as volumes of real numbers.** ResNet activations are translucent 3D boxes filled with viridis voxels, receding in a
  long perspective pipeline; a transformer is a line of glass slabs (Attention, MLP) in perspective. Depth is shown as depth.
- **Show the actual numbers first, then compress.** A prompt becomes token ids, then a bracketed matrix of real values
  ("−1.54 −0.24 … 0.52", width 2304), then a vector reshaped into a square heatmap ("Reshape"). → *Borrowed as* the "A word and
  512 numbers" beat and the zoom out from one state.
- **Real outputs on screen.** Next-token probability bars with values, a per-layer "top next token" grid, top-activating text
  with highlighted tokens.
- **Palette:** black, viridis for magnitudes, one warm accent (gold outlines and arrows on operators like "Unembed").

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

## Goodfire, "Interpreting Language Model Parameters" (2026-05-05)
https://www.goodfire.com/research/interpreting-lm-parameters · examined 2026-09-26 via per-figure screenshots
- **Sheared heatmaps with real tokens on the edge.** Attention patterns are drawn as triangles in an oblique projection, the
  prompt's tokens written along the diagonal in monospace. A flat matrix gets depth without losing readability.
- **Visual equations of real data.** "Z = [heatmap] + [heatmap] + …" with the formula above each term: a decomposition you see
  as a sum. The hero figure does the same with a parameter matrix and rank-1 components.
- **Widgets built from the same parts.** Tick subcomponent pairs → reconstructed sum → softmax → compare with "ground truth".
  Checkbox, pager ("← Prev 1/10 Next →"), head pins; empty states are dashed boxes with an instruction ("Tick one or more pairs").
- **Type and color:** serif title, Suisse (sans) body, IBM Plex Mono for small uppercase labels ("DATASET PROMPT"); warm
  off-white panels with hairline borders; diverging red/blue for signed values, viridis for probabilities, green for "causal
  importance", brand purple for their method.
- **Lesson for this repo:** interaction should compose from pieces the reader has already seen. → *Borrowed as* the hover that
  lights up a state's dark past, built from the same squares, lines and counts as the rest of the figure.
