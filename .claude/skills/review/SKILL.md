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

## 2b. Known pitfalls (check these explicitly)
- **SVG filters on straight lines:** with the default `objectBoundingBox` units, a glow filter on a perfectly vertical
  or horizontal line has a zero-size region, and the line *disappears*. Use `filterUnits="userSpaceOnUse"`.
- **Sticky stage on mobile:** anything added to the stage (readouts, strips, legends) must still fit in the sticky band.
  Re-shoot with `--mobile` after every stage change.
- **Words vs picture:** the prose at a step must not mention anything the stage hasn't drawn yet, or contradict it.

## 3. Dispatch the agents (in parallel)
- `rigor-reviewer`: gets the project path. Checks `claims.md`, the script, narration and prose against the sources.
- `learner-sim`: gets the project path and the shots or contact sheets. Reads the piece as the learner would.

## 4. Record and fix
Write `review.md` in the project: each finding, its severity (blocker / should / nit), and its resolution. Fix the
blockers, re-render, and re-review only what changed. Tell the learner what was found and what was changed,
including the things that were *not* fixed.
