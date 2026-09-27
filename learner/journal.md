# Learning journal

Newest first. After each piece or session: what was explored, what clicked, what didn't, questions raised, and follow-ups.

## 2026-09-27: probes, chapters I–III (hero + 11 steps)
- Their two asks from the style frame, built: the paper is always the glass's projection (normalized histograms in the
  grid's units, level sets continuing onto it at an adaptive spacing), and the data-collection viz (a statement's tokens →
  a sketch of the model → the state over "." read out as h → a row of X with its label), which grew into "which token?"
  (a probe per position: exactly 50% before the country) and "every token, pooled?" (mean vs max, why prefix scores sit
  at zero), plus "which layer?" (a flipbook).
- Their verdicts: the where-to-read steps "are cool", and they belong at the start ("more constructive"); the histogram
  and level-set variants: "really good work"; checks that hold back their answer: "better that it's not spoiled".
- Not yet known: check-yourself answers (none built yet) and which specific beats clicked beyond these. Nothing in
  `concept-map.md` moves past "exposed" until they answer questions.
- Also this session: the statements were rebuilt from GeoNames (our own data, publishable), and the piece went through a
  full review round (technical, rigor, learner-sim). They suggested a performance agent for the end of each piece.

## 2026-09-26: cot-monitorability iteration 4 (visual redesign)
- Went through the whole piece: "you did an amazing work, this is great".
- Asked for, and got, full autonomy on the visuals ("go full visual designer", Goodfire and Welch Labs as inspiration,
  rigorous, simplified only where non-essential). The result: paper and glass, real gelu-4l states, a word and its 512
  numbers, the dark-past hover, a perspective hero, redrawn diffusion and readers.
- Not yet known: which parts clicked and which didn't (no specifics given), and the check-yourself answers. Ask before
  marking anything as understood in `concept-map.md`.
- Follow-ups: the learner asked to materialize the lessons of the whole process for future work (done:
  `kit/PLAYBOOK.md` and the updated skills, agents, kit and tools).

## 2026-09-26: cot-monitorability iteration 2b
- Clicked: the counted route that restarts at every card, plus the per-column depth profile, carries "longest dark path".
- Didn't click: the 4-hop step ("requires a better explanation"). Likely culprits: why a hop costs two rows, and why *23* is
  the one that surfaces (it isn't the most important entity, just whatever lands at the top of the stack). Fix: explain the
  hop as a lookup that uses up rungs of a ladder, label each hop's result on the figure, and ask a predict question that
  targets the misconception.
- Predict questions: "not bad, but they must be genuinely didactic and understandable". Standard to hold: each targets a
  specific misconception, offers a plausible wrong answer, and can be answered from what's on screen.
- Go-ahead: build several new beats autonomously; improve the visual style; show what the first section looks like
  finished.

## 2026-09-25: cot-monitorability prototype (first look)
- Clicked: the "longest dark path" framing works, provided the visualization carries it. The arithmetic chain works as an example.
- Asked for: an N-hop question example as an alternative; Coconut explicitly; a section on what latent reasoning does to
  interpretability tools (e.g. probes without a reliable CoT).
- Preferences confirmed: web first (video maybe later); creative freedom on the visualization.
- Follow-ups: see the "Next actions" in `projects/cot-monitorability/README.md`.

<!--
## YYYY-MM-DD: <project or topic>
- Clicked:
- Didn't click:
- New questions:
- Follow-ups:
-->
