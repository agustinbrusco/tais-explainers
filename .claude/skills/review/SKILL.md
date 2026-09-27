---
name: review
description: Self-critique pass for an explainer project — look at the actual rendered frames/screenshots against a visual checklist, then dispatch the technical-reviewer, rigor-reviewer (both Fable) and learner-sim (Opus) agents, and record findings in the project's review.md. Use after any meaningful change to visuals, script or narration, and always before showing a piece to the learner.
---

# Reviewing an explainer

The only thing that counts is what's on the screen. Review the renders themselves, never the code that
produces them.

## 1. Produce viewable stills
- **Video:** `uv run scripts/contact_sheet.py <mp4> -n 16`, then `--burst <t>` for each key transition, to check
  the motion reads as intended.
- **Web:** `node scripts/shoot.mjs projects/<slug>/web/index.html`, then the same with `--mobile`. A non-zero exit
  means there were console errors, and those get fixed first. For any animated step, also film the motion:
  `--clock --steps <i> --frames 24 --element .stage` gives every frame of the transition at 24 fps, identical on every
  run (without `--clock`, frames are sampled on wall-clock time). Tile them with `contact_sheet.py <frames...>`.
  Animations outside the step engine (a hero): `--clock --at 1500,6000,12000 [--element .hero]`, at 900, 1024, 1280 and
  1920 px wide and on a phone. Reduced-motion stills hide motion and camera bugs, so look at frames too.
- Run the project's functional tests (`node projects/<slug>/tests/functional.mjs`) if it has them.
- Open **every** image with Read. Don't sample.

## 2. Visual checklist (per frame or step)
- [ ] **Words match picture:** the narration or prose at this moment agrees with what's drawn. Nothing shown that
      the text says hasn't happened yet.
- [ ] **One focal point:** the eye knows where to go, and whatever is new is the most salient thing.
- [ ] **Semantic colors are correct** (see CLAUDE.md), with ≤ 4 of them. No decorative color.
- [ ] **Legible at phone size:** no text under ~11 px effective, and nothing clipped, overlapping, or hidden behind UI.
- [ ] **A badge is present** (`schematic` / `real` / `speculative`), and it's true.
- [ ] **Simplifications are flagged on screen** where they happen.
- [ ] **Motion:** one thing moves at a time, there's a hold after each reveal, and nothing pops without a reason.
- [ ] **Reads:** on the exact frames, each read gets enough frames to be found and understood, no two important reads
      overlap, and a count lands with or after what it counts (`kit/PLAYBOOK.md`, "Timing").
- [ ] **Geometry is honest:** if a 2D picture stands in for a high-dimensional space, the piece says what the picture
      gets wrong whenever it matters.
- [ ] **Real vs reused:** a figure mixing real data and schematic structure says which parts are real, in its caveat
      and its badge.
- [ ] **Predicts:** not answerable from the figure or the wording; the right answer holds for every case shown.
- [ ] **Interactions:** discoverable (a hint where the prose invites them); the key instance shown without them.
- [ ] **One name per thing** across hero, figures and prose.

## 2b. Known pitfalls (check these explicitly)
- **SVG filters on straight lines:** with the default `objectBoundingBox` units, a glow filter on a perfectly vertical
  or horizontal line has a zero-size region, and the line *disappears*. Use `filterUnits="userSpaceOnUse"`.
- **Sticky stage on mobile:** anything added to the stage (readouts, strips, legends) must still fit in the sticky band.
  Re-shoot with `--mobile` after every stage change.
- **Words vs picture:** the prose at a step must not mention anything the stage hasn't drawn yet, or contradict it.
- **Stale prose after a structural edit:** when the drawn structure changes (e.g. attention from neighbours to all
  earlier positions), re-read every sentence that describes a property of it ("12 persists for a few columns" went false).
- **Camera moves:** content must already be there when the shot opens, and the target must exist in every layout.
- **Labels in windows:** measure a label's box and keep it inside; fixed clamping margins fail on long text.
- **Hidden-SVG filters:** filters defined inside a `display:none` SVG vanish; keep shared defs in an always-rendered SVG.

## 3. Dispatch the agents (in parallel)
Each agent's model is set in its frontmatter (see "Who does what" in CLAUDE.md). The technical checks run on Fable, a
different model from the one that wrote the piece. The experience check runs on Opus.
- `technical-reviewer` (Fable), mode `piece`: gets the project path. Is the explanation technically right? It checks
  mechanisms, simplifications (load-bearing or not), the code that computes readouts, and the argument.
- `rigor-reviewer` (Fable): gets the project path. Checks `claims.md`, the script, narration and prose against the sources.
- `learner-sim` (Opus): gets the project path and the shots or contact sheets. Reads the piece as the learner would.
- Give all three **what changed** since the last review, the **paths to fresh shots** (desktop, phone, motion frames,
  timed shots), and the specific questions you want answered. Run them in the background and keep working.
- **Pass `model` in each Agent call as well** (`"fable"`, `"fable"`, `"opus"`). The frontmatter is the default, but in
  this setup an agent file edited mid-session keeps its old model until the next session.
- **A finding is a claim too.** Check it against the source or the code before acting on it. When you reject one, write
  why in `review.md`; never drop it silently.

## 3b. Performance, at the end of a piece (and before sharing it)
Once content and visuals have settled, dispatch `performance-reviewer` (Opus; pass `model: "opus"`) with the project
path and, if the site is up, the live GitHub Pages URL. It measures load, every step's transition, sliders, the hero and
phones under CPU throttling, against the budgets in its definition, and proposes same-pixel fixes. To have it implement
them, run it with `isolation: "worktree"`; then check its pixel diffs and before/after numbers, run the functional tests
yourself, and merge. Performance lessons go into `kit/PLAYBOOK.md` §5.

## 4. Record and fix
Write `review.md` in the project: each finding, its severity (blocker / should / nit), and its resolution. Fix the
blockers, re-render, and re-review only what changed. Tell the learner what was found and what was changed,
including the things that were *not* fixed. If a finding is a lesson for future pieces, add it to `kit/PLAYBOOK.md`.
