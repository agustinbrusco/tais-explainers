#!/usr/bin/env bash
# Idempotent bootstrap. Safe to re-run after a fresh clone.
#   ./scripts/setup.sh            # Python env, TTS model, Node + headless Chromium
#   ./scripts/setup.sh --interp   # also CPU torch + TransformerLens (real-activation visuals)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

extras=()
if pkg-config --exists pangocairo 2>/dev/null; then
  extras+=(--extra manim)
else
  echo "! Cairo/Pango headers missing, so skipping Manim. Install with:"
  echo "    sudo apt install libcairo2-dev libpango1.0-dev pkg-config"
fi
[[ "${1:-}" == "--interp" ]] && extras+=(--extra interp)

echo "== Python (uv sync ${extras[*]:-})"
uv sync "${extras[@]}"

echo "== Kokoro TTS model"
mkdir -p .cache/models
base="https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
for f in kokoro-v1.0.onnx voices-v1.0.bin; do
  [[ -s ".cache/models/$f" ]] || curl -fL --progress-bar -o ".cache/models/$f" "$base/$f"
done

echo "== Node + headless Chromium (for screenshots of web explainers)"
npm install --silent
npx playwright install chromium

echo "== Tokens"
uv run scripts/build_tokens.py

echo; ./scripts/doctor.sh
