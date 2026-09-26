---
name: review
description: Self-critique pass for an explainer project — look at the actual rendered frames/screenshots against a visual checklist, then dispatch the rigor-reviewer and learner-sim agents, and record findings in the project's review.md. Use after any meaningful change to visuals, script or narration, and always before showing a piece to the learner.
---

# Reviewing an explainer

The only thing that counts is what's on the screen. Review the renders themselves, never the code that
produces them.

## 1. Produce viewable stills
- **Video:** `uv run scripts/contact_sheet.py <mp4> -n 16`, then `--burst <t>` for each key transition, to check
  the motion reads as intended.
- **Web:** `node scripts/shoot.mjs projects/<slug>/web/index.html`, then the same with `--mobile`. A non-zero exit
  means there were console errors, and those get fixed first. For any animated step, also capture the motion:
  `--steps <i> --frames 16 --every 330 --element .stage`, then tile the frames with `contact_sheet.py <frames...>`.
  Animations outside the step engine (a hero): `--at 1500,6000,12000 [--element .hero]`, at 900, 1024, 1280 and 1920
  px wide and on a phone. Reduced-motion stills hide motion and camera bugs, so look at frames too.
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
- `rigor-reviewer`: gets the project path. Checks `claims.md`, the script, narration and prose against the sources.
- `learner-sim`: gets the project path and the shots or contact sheets. Reads the piece as the learner would.
- Give both of them **what changed** since the last review, the **paths to fresh shots** (desktop, phone, motion frames,
  timed shots), and the specific questions you want answered. Run them in the background and keep working.

## 4. Record and fix
Write `review.md` in the project: each finding, its severity (blocker / should / nit), and its resolution. Fix the
blockers, re-render, and re-review only what changed. Tell the learner what was found and what was changed,
including the things that were *not* fixed. If a finding is a lesson for future pieces, add it to `kit/PLAYBOOK.md`.
