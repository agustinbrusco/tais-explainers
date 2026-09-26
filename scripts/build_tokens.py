#!/usr/bin/env python3
"""Generate kit/web/tokens.css from kit/tokens.json (the single source of truth).

    uv run scripts/build_tokens.py

Emits the GLASS palette (--bg, --text, ... and each semantic --<name>), the PAPER palette (--page, --ink, ...)
and the on-paper semantic variants (--<name>-ink).
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
tokens = json.loads((ROOT / "kit/tokens.json").read_text())
public = lambda d: {k: v for k, v in d.items() if not k.startswith("_")}

lines = ["/* GENERATED from kit/tokens.json by scripts/build_tokens.py. Do not edit. */", ":root {",
         "  /* glass: dark windows onto a model's interior */"]
lines += [f"  --{k}: {v};" for k, v in public(tokens["color"]).items()]
lines += ["  /* paper: the page, and anything readable on it */"]
lines += [f"  --{k}: {v};" for k, v in public(tokens.get("page", {})).items()]
lines += ["  /* semantic: --name on glass, --name-ink on paper */"]
for k, v in tokens["semantic"].items():
    lines.append(f"  --{k}: {v['hex']};  /* {v['means']} */")
    if "ink" in v:
        lines.append(f"  --{k}-ink: {v['ink']};")
ty = tokens["type"]
lines += [f'  --font-sans: "{ty["sans"]}", system-ui, sans-serif;',
          f'  --font-mono: "{ty.get("mono_web", ty["mono"])}", "{ty["mono"]}", ui-monospace, monospace;',
          f'  --font-display: "{ty.get("display", ty["sans"])}", Georgia, serif;']
lines += [f"  --fs-{k}: {v / 16:.3f}rem;" for k, v in ty["scale"].items()]
lines += [f"  --t-{k.replace('_', '-')}: {v}s;" for k, v in tokens["motion"].items() if not k.startswith("_")]
lines += ["}", ""]

out = ROOT / "kit/web/tokens.css"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text("\n".join(lines))
print(out.relative_to(ROOT))
