#!/usr/bin/env bash
# Report which parts of the toolchain work, with a fix for each one that doesn't.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
ok()   { printf "  \033[32m✓\033[0m %-22s %s\n" "$1" "$2"; }
bad()  { printf "  \033[31m✗\033[0m %-22s fix: %s\n" "$1" "$2"; }
opt()  { printf "  \033[33m·\033[0m %-22s optional: %s\n" "$1" "$2"; }
py()   { uv run --no-sync python -c "$1" 2>/dev/null; }

echo "toolchain:"
command -v uv >/dev/null && ok uv "$(uv --version)" || bad uv "curl -LsSf https://astral.sh/uv/install.sh | sh"
command -v node >/dev/null && ok node "$(node --version)" || bad node "install Node >= 20"
command -v latex >/dev/null && ok latex "TeX Live" || bad latex "sudo apt install texlive-latex-extra texlive-fonts-extra"
command -v dvisvgm >/dev/null && ok dvisvgm "$(dvisvgm --version | head -1)" || bad dvisvgm "sudo apt install dvisvgm"
v=$(py "import imageio_ffmpeg as m; print(m.get_ffmpeg_version())") && ok ffmpeg "bundled v$v" || bad ffmpeg "uv sync"
command -v pdftotext >/dev/null && ok pdftotext "poppler" || opt pdftotext "sudo apt install poppler-utils"

echo "renderers:"
v=$(py "import manim; print(manim.__version__)") && ok manim "v$v" || {
  pkg-config --exists pangocairo 2>/dev/null \
    && bad manim "uv sync --extra manim" \
    || bad manim "sudo apt install libcairo2-dev libpango1.0-dev pkg-config && uv sync --extra manim"; }
[[ -d node_modules/playwright ]] && ls ~/.cache/ms-playwright 2>/dev/null | grep -q chromium \
  && ok playwright "chromium installed" || bad playwright "npm install && npx playwright install chromium"
command -v blender >/dev/null && ok blender "$(blender --version 2>/dev/null | head -1)" || opt blender "only if a project needs it"

echo "audio:"
[[ -s .cache/models/kokoro-v1.0.onnx && -s .cache/models/voices-v1.0.bin ]] \
  && ok kokoro "model present" || bad kokoro "./scripts/setup.sh"

echo "interp (real activations):"
v=$(py "import transformer_lens, torch; print(torch.__version__)") && ok transformer-lens "torch $v" \
  || opt transformer-lens "./scripts/setup.sh --interp"
