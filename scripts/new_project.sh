#!/usr/bin/env bash
# Scaffold a new explainer from projects/_template.
#
#   ./scripts/new_project.sh cot-monitorability --format web      # interactive explorable
#   ./scripts/new_project.sh jlens --format manim                 # narrated video
#   ./scripts/new_project.sh model-organisms --format both
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

slug="${1:-}"; format="web"
shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --format) format="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done
[[ "$slug" =~ ^[a-z0-9][a-z0-9-]*$ ]] || { echo "usage: $0 <kebab-slug> [--format web|manim|both]" >&2; exit 2; }
[[ "$format" =~ ^(web|manim|both)$ ]] || { echo "--format must be web, manim or both" >&2; exit 2; }

dest="$ROOT/projects/$slug"
[[ -e "$dest" ]] && { echo "$dest already exists" >&2; exit 1; }

cp -r "$ROOT/projects/_template" "$dest"
[[ "$format" == web || "$format" == both ]] && cp -r "$ROOT/kit/starters/web" "$dest/web"
[[ "$format" == manim || "$format" == both ]] && cp -r "$ROOT/kit/starters/manim" "$dest/manim"
find "$dest" -type f -exec sed -i "s/{{slug}}/$slug/g; s/{{format}}/$format/g; s/{{date}}/$(date +%F)/g" {} +

echo "created projects/$slug ($format)"
find "$dest" -type f | sed "s|$ROOT/||" | sort
