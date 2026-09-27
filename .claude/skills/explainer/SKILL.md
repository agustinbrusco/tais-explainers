---
name: explainer
description: Plan, build, or continue a TAIS explainer project in projects/<slug> — from brief through research, claims ledger, script, narration, visuals (web explorable and/or Manim video), review and delivery. Use whenever the learner asks for a new explainer, to continue one, or to change one's content or format.
---

# Building an explainer

Work in phases. Each phase leaves an artifact in the project folder, so any session can pick up where the last
stopped. Read the project's `README.md` pipeline checklist first to see where it is, and read `kit/PLAYBOOK.md`
(patterns that landed, pitfalls, checklists) before designing anything.

## 0. Know the learner
Read `learner/profile.md`, `learner/concept-map.md`, and the last entries of `learner/journal.md`. If the profile is
still empty, interview the learner before planning, keeping it short: background, math comfort, what they've already
read on the topic, and what "understanding it" would let them do.

## 0.5 Survey what exists
Before choosing scope, look for excellent existing explainers of this topic (the sources to watch and craft list in
`references/`, plus a search). Put them in the brief under **Prerequisites and prior art**. The piece covers the *delta*:
what those don't show, or don't show for this learner.

When the learner points at a style to learn from, **look at it, don't recall it**: `node scripts/study_page.mjs <url>
--out <scratchpad>/…` for pages (viewport shots, figure crops, typography), `uv run scripts/storyboard.py <video>
--out <scratchpad>/… --quad` for YouTube videos (storyboard stills). Read the images, then write concrete, reusable
observations in `references/craft/README.md`. The shots stay in the scratchpad.

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
- Beats table: one new idea per beat, and each beat names the claims it relies on. Under each animated beat, add a
  `reads:` line: what the viewer must understand, in order, with times (`kit/PLAYBOOK.md`, "Timing: write the reads").
- Narration (`narration.yaml`) is written for the ear: short sentences, no parentheses, no symbols, and numbers
  said the way a person says them. Use `say:` when the spoken form should differ from the caption.
- Render with `uv run scripts/tts.py ... --preview` and **ask the learner to listen** before timing any visuals
  to it (I can't hear it). Put their pronunciation fixes in `kit/lexicon.yaml`.

## 3b. Technical gate, before building
Dispatch `technical-reviewer` (Fable; pass `model: "fable"` too) in `script` mode on the brief, `claims.md` and `script.md`. It checks that the
explanation is technically right before any of it becomes code: the mechanism, which simplifications are load-bearing,
the argument. Fix its blockers first (a wrong framing costs a paragraph now and a rebuild later), and log its findings
and their resolution in `review.md`.

## 4. The hardest visual first
Identify the one visual that carries the insight, the shot that makes it *click*. Prototype it first, review it
(`review` skill), and show it to the learner. If it doesn't land, the rest of the piece won't save it.
Make its numbers *computed from the drawn model of the idea* (e.g. a DP on the drawn graph), so the readouts can't
disagree with the picture, and make the idea something the viewer watches happen (e.g. a counted route).

## 5. Build
**Web** (`web/`): `render(i)` must be a pure function of the step index. Put a `.predict` before every reveal,
a `.caveat` wherever something is simplified, and a badge on every figure (`schematic` / `real` / `speculative`).
Interaction should answer "what happens if…?", not decorate. Specifically (details in `kit/PLAYBOOK.md`):
- **Materials:** paper page, glass windows onto the model (`kit/web/glass.js`); lines that cross the readability
  boundary get a glass color inside and an ink color outside.
- **Real data:** export states with `kit/interp.py` (CPU TransformerLens 4; pick a model shaped like the drawing), draw
  them with `kit/web/states.js`, record a greedy capability check, and say on screen and in each badge *exactly* where
  the data is real and where it is reused. Show one real object before using it as a glyph.
- **Predicts:** separate predict and reveal steps; a question that can't be read off the figure or the wording, fair for
  every case shown, with balanced options.
- **Phones:** a narrow layout for every scene, text ≥ ~11 px, no "on the right".
- **Tests:** put every value you verify by hand in `projects/<slug>/tests/functional.mjs` (see cot-monitorability's).

**Manim** (`manim/scenes.py`): one Scene per group of beats, each ≤ ~90 s, to keep renders cheap. Use `Narrated` +
`with self.voiceover(id) as vo:` so the audio sets the timing. Iterate at `-ql` and render finals at `-qh`. Colors come
only from `kit.style.S` (semantic) and `C` (neutral), and no raw hex in scenes.

**3D:** reach for Three.js first. Blender is justified only for a cinematic shot that nothing else can do. Write down why.

## 6. Review
Run the `review` skill: visual self-review, then the `technical-reviewer` and `rigor-reviewer` (Fable) and `learner-sim`
(Opus) agents. Fix, and re-review what changed. Record findings and their resolution in `review.md`. Once the piece has
settled, and before sharing it, run `performance-reviewer` (Sonnet) on it as deployed (`review` skill, §3b).

## 7. Deliver
Show it to the learner with a report they can act on: what changed, what the reviews found and fixed, what was *not*
done, how to open it, and two or three specific questions. Then ask the check-yourself questions and *listen* to the
answers. Log what clicked and what didn't in `learner/journal.md`. In `learner/concept-map.md`, mark a concept as
understood only from the learner's own answers ("presented" until then). Add the piece to `projects/README.md`.
At the end of a piece, add its new lessons to `kit/PLAYBOOK.md` (patterns, pitfalls, tools), and move reusable code
into `kit/` or `scripts/`.
