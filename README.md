# TAIS Explainers

Animated, interactive and rigorously sourced explainers for Technical AI Safety research, built by a
learner working with Claude.

The aim is a *visceral* understanding: you drag a lens across the layers of a model and watch what it decodes,
and you watch a chain-of-thought monitor lose its grip as reasoning moves into latent space. That understanding
also has to be correct, so every claim traces back to a specific place in a source.

## Explainers

See [projects/README.md](projects/README.md).

## How a piece gets made

1. **Brief:** what you'll be able to see, predict or explain afterwards, and which misconceptions it defuses.
2. **Research:** the primary sources, actually read, in [references/](references/).
3. **Claims ledger:** every statement in the piece → a source, a location, and a status (`sourced`, `simplified`, `speculative`).
4. **Script → the hardest visual first → build**, as a web explorable (D3 / Three.js, no build step), a Manim
   video with local TTS narration, or both.
5. **Review:** rendered frames checked against a visual checklist, an adversarial fact-check, and a simulated
   learner read-through, all before a human sees it.

Every figure carries a badge: **schematic**, **real** (with the model and layer), or **speculative**.

## Layout

| path | what |
|---|---|
| [projects/](projects/) | one folder per explainer: brief, claims ledger, script, narration, `web/`, `manim/` |
| [references/](references/) | per-topic dossiers and source lists (PDFs are fetched locally, not committed) |
| [kit/](kit/) | the shared visual language: semantic color tokens, Manim helpers, web CSS/JS, starters |
| [scripts/](scripts/) | TTS, paper fetching, contact sheets, headless screenshots, scaffolding |
| [learner/](learner/) | the learner profile, concept map and journal the explainers are tailored to |
| [.claude/](.claude/) | Claude Code skills (`explainer`, `research`, `review`) and review agents |

## Setup

Linux or macOS, with [uv](https://docs.astral.sh/uv/), Node ≥ 20, and TeX Live (for Manim math).

```bash
# Manim needs Cairo/Pango headers (Debian/Ubuntu):
sudo apt install libcairo2-dev libpango1.0-dev pkg-config

./scripts/setup.sh            # Python env, Kokoro TTS model (~340 MB), headless Chromium
./scripts/setup.sh --interp   # optional: CPU torch + TransformerLens, for visuals built from real activations
./scripts/doctor.sh           # checks every tool and prints a fix for anything missing
```

No system ffmpeg is needed (a static build ships with `imageio-ffmpeg`), and no GPU is needed.

## Licensing

TBD.
