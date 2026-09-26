# TAIS Explainers: working agreement

This repo exists so one learner (see [learner/profile.md](learner/profile.md)) can reach a clear, visceral,
*correct* understanding of Technical AI Safety developments, through animated, stylized explainers that we
build together. The learner is the audience. Optimize for their understanding, not for a general audience or
for looking impressive.

## Layout

```
references/<topic>/   dossier README + sources.yaml (tracked); papers/ PDFs + .txt (gitignored)
projects/<slug>/      one explainer: README (brief), claims.md, script.md, narration.yaml, web/ and/or manim/, build/ (gitignored)
kit/                  shared visual language: tokens.json (source of truth), style.py, narration.py, web/, starters/
scripts/              reusable tools (below)
learner/              profile.md, concept-map.md, journal.md: who we're teaching and what has landed
.claude/              skills (explainer, research, review) and agents (rigor-reviewer, learner-sim)
```

## Rigor is non-negotiable

1. **No source, no claim.** Every factual statement a piece makes (spoken, written, or *implied by a visual*)
   has a row in that project's `claims.md` pointing at a specific place in a source under `references/`.
2. **Know the edge of my knowledge.** My training data ends around mid-2026. For anything recent, and for
   *any* specific number, author, date or result, read the source; don't recall it. If a source can't be
   found, the claim is `open` and doesn't ship.
3. **Separate three voices:** what the paper *showed*, what the authors *argue* it implies, and what *we*
   think. Never let the third one sound like the first.
4. **Badge every figure:** `schematic`, `real` (with model and layer, e.g. "real: GPT-2 small, L6"), or
   `speculative`. Prefer real data when it's feasible on CPU (see `interp` extra).
5. **Name simplifications where they happen,** with a caveat callout on screen, not in a footnote.
6. **Every piece ends with its limits:** what it doesn't show, what's contested, what's unknown.
7. **Calibrate in both directions.** Don't soften worrying evidence into a "misconception" (e.g. "no lab deploys
   latent reasoning" was already outdated when written), and don't upgrade rumors to facts. Label claims as confirmed,
   reported, rumored, or contested, and check the "Sources to watch" in `references/README.md` for recent work.
8. **Honest geometry.** 2D/3D pictures of 4096-d spaces mislead in known ways (near-orthogonality,
   superposition, projections that make distinct things look close). Say so when the picture depends on it.

## Pedagogy

- **Don't duplicate great existing work, and build the delta.** Before planning a piece, check what excellent content
  already covers (the "Sources to watch" and [references/craft/](references/craft/): Welch Labs, Anthropic's interactive
  papers, Goodfire, Neuronpedia). Link it as a prerequisite and spend our effort on what nobody has shown well yet.
- **Pieces must stand alone.** The learner may share good ones with study groups, so a piece never refers to the
  learner profile or private context. Credit line: "Made with Claude".
- **Question before method.** Open with the problem the technique answers, and why the obvious approach fails.
- **One running example** carried through the whole piece. Concrete before abstract; a picture before the equation;
  the equation only once the picture has earned it.
- **Predict, then reveal.** Ask the learner to commit to a guess before showing the answer (`.predict` in web,
  a pause beat in video).
- **One new idea per beat.** If a beat needs "and also", split it.
- **Compound the vocabulary.** Reuse the kit's visual grammar and link back to earlier explainers. Check
  `learner/concept-map.md` for what has already landed, and don't re-teach it.
- **Close the loop.** 3–5 "check yourself" questions, at least one of them a transfer question. Afterwards, log what
  clicked and what didn't in `learner/journal.md`.

## Visual language (kit/tokens.json)

Colors carry meaning. Use the same concept → same color everywhere, and **at most 4 semantic colors per frame**.

| token | means |
|---|---|
| `token` (paper) | visible text: prompts, outputs, chain-of-thought |
| `residual` (blue) | hidden states: activations, latent reasoning |
| `feature` (violet) | interpretable directions, SAE latents, concept vectors |
| `overseer` (gold) | anything reading the model: probes, lenses, oracles, monitors, auditors |
| `training` (magenta) | optimization pressure: gradients, RL, fine-tuning, reward |
| `danger` / `safe` (red / green) | misaligned or hidden-objective behavior / aligned or caught behavior |
| `attention` / `mlp` (teal / coral) | component-level only |

Motion: one thing moves at a time. Hold after every reveal (`MOTION.hold_after_reveal`). Text on screen should
still be readable on a phone (SVG labels ≥ 22 units in a 720-wide viewBox).
Edit `kit/tokens.json`, then `uv run scripts/build_tokens.py`.

## Choosing a format (decide per project, and write down why in its README)

- **Interactive web explorable** (the default for *mechanisms with a knob*): the learner drags a layer, a
  steering strength, or a monitor threshold, and watches the consequence. Build-free ES modules + D3 (Three.js
  for real 3D). Starter: `kit/starters/web` (scrollytelling, `render(i)` must be a pure function of step).
- **Manim narrated video** (for *arguments, derivations, histories*): e.g. "why CoT monitorability is
  fragile". Starter: `kit/starters/manim` + `kit.narration.Narrated`.
- **Both:** a short narrated tour embedded in an explorable.
- **Blender:** only if a cinematic 3D shot is truly the best way to show something. Three.js covers most 3D
  needs and stays interactive.
- **Voice:** Kokoro (local) for drafts and probably finals. The learner decides if a piece should upgrade to a
  hosted voice or their own recording.

## Workflow

The `explainer` skill holds the full pipeline (brief → research → claims → script → hardest visual first →
build → review → deliver). `research` builds `references/<topic>/`. `review` is the self-critique pass and
dispatches the `rigor-reviewer` and `learner-sim` agents. Gate: the learner agrees on the brief before building.

## Tools

```bash
./scripts/setup.sh                                          # bootstrap (idempotent); --interp adds torch + TransformerLens
./scripts/doctor.sh                                         # what works, and how to fix what doesn't
./scripts/new_project.sh <slug> --format web|manim|both
uv run scripts/fetch_paper.py <arxiv-id> --topic <topic>    # PDF + text + sources.yaml entry
uv run scripts/tts.py projects/<slug>/narration.yaml --preview
uv run manim -ql --media_dir projects/<slug>/build/media projects/<slug>/manim/scenes.py <Scene>
uv run scripts/contact_sheet.py <video.mp4> [-n 12 | -t 1,2.5 | --burst 4.0]
node scripts/shoot.mjs projects/<slug>/web/index.html [--mobile] [--steps 0,3]
node scripts/shoot.mjs <page> --steps 2 --frames 16 --every 330 --element .stage   # motion frames; tile them with:
uv run scripts/contact_sheet.py build/shots/step-02-f*.png -o motion.png
python3 -m http.server 8000                                 # from the repo root, then open /projects/<slug>/web/
```

## Self-verification: I can see stills, but I can't watch or listen

- I review video through contact sheets (`contact_sheet.py`, with `--burst` for a transition's motion) and web
  pieces through `shoot.mjs` (desktop and `--mobile`; it fails on console errors; `--frames` for animations). **Never say a render
  "looks good" without having viewed it in this session.**
- I can't hear. Ask the learner to listen to `build/audio/preview.wav` before visuals are timed to it, and
  add every mispronunciation they report to `kit/lexicon.yaml`.
- Check that on-screen text agrees with the visual state. Contradictions between the words and the picture are
  the most common bug.

## Conventions

- Python through `uv run`. The `kit` package is importable from anywhere in the repo.
- Project slugs are kebab-case. `build/` is gitignored and reproducible, and finished renders get published via
  GitHub Releases/Pages, not committed.
- Reference PDFs aren't committed. `sources.yaml` is the record, and `fetch_paper.py --restore` rebuilds the library.
- Talk to the learner in whatever language they write in. Explainer language is decided per project.
