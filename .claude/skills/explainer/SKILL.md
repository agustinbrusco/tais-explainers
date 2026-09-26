---
name: explainer
description: Plan, build, or continue a TAIS explainer project in projects/<slug> — from brief through research, claims ledger, script, narration, visuals (web explorable and/or Manim video), review and delivery. Use whenever the learner asks for a new explainer, to continue one, or to change one's content or format.
---

# Building an explainer

Work in phases. Each phase leaves an artifact in the project folder, so any session can pick up where the last
stopped. Read the project's `README.md` pipeline checklist first to see where it is.

## 0. Know the learner
Read `learner/profile.md`, `learner/concept-map.md`, and the last entries of `learner/journal.md`. If the profile is
still empty, interview the learner before planning, keeping it short: background, math comfort, what they've already
read on the topic, and what "understanding it" would let them do.

## 1. Brief (`README.md`), with a gate
`./scripts/new_project.sh <slug> --format web|manim|both`, then fill in the brief: the promise, 3–5 *checkable*
objectives, the one running example, the misconceptions to defuse, what it will NOT show, and the format with a
reason. **Show the brief to the learner and get agreement before building.** A wrong brief wastes every later phase.

## 2. Research → `claims.md`
Make sure `references/<topic>/` has a dossier (run the `research` skill if not). Then *read* the primary sources,
using the extracted `.txt` files and reading whole sections, not skimming abstracts. Draft `claims.md` with every claim the
piece will need, each tied to a section, figure or page. Anything unsourced is `open`.

## 3. Script (`script.md`) and narration
- Arc: question → why the obvious answer fails → the idea → watching it work → where it breaks → check yourself.
- Beats table: one new idea per beat, and each beat names the claims it relies on.
- Narration (`narration.yaml`) is written for the ear: short sentences, no parentheses, no symbols, and numbers
  said the way a person says them. Use `say:` when the spoken form should differ from the caption.
- Render with `uv run scripts/tts.py ... --preview` and **ask the learner to listen** before timing any visuals
  to it (I can't hear it). Put their pronunciation fixes in `kit/lexicon.yaml`.

## 4. The hardest visual first
Identify the one visual that carries the insight, the shot that makes it *click*. Prototype it first, review it
(`review` skill), and show it to the learner. If it doesn't land, the rest of the piece won't save it.

## 5. Build
**Web** (`web/`): `render(i)` must be a pure function of the step index. Put a `.predict` before every reveal,
a `.caveat` wherever something is simplified, and a badge on every figure (`schematic` / `real` / `speculative`). Use
real activations when feasible (`./scripts/setup.sh --interp` gives CPU TransformerLens; GPT-2 small and Pythia fit).
Interaction should answer "what happens if…?", not decorate.

**Manim** (`manim/scenes.py`): one Scene per group of beats, each ≤ ~90 s, to keep renders cheap. Use `Narrated` +
`with self.voiceover(id) as vo:` so the audio sets the timing. Iterate at `-ql` and render finals at `-qh`. Colors come
only from `kit.style.S` (semantic) and `C` (neutral), and no raw hex in scenes.

**3D:** reach for Three.js first. Blender is justified only for a cinematic shot that nothing else can do. Write down why.

## 6. Review
Run the `review` skill: visual self-review, then the `rigor-reviewer` and `learner-sim` agents. Fix, and re-review
what changed. Record findings and their resolution in `review.md`.

## 7. Deliver
Show it to the learner, then ask the check-yourself questions and *listen* to the answers. Log what clicked and what
didn't in `learner/journal.md`, update `learner/concept-map.md`, and add the piece to `projects/README.md`.
