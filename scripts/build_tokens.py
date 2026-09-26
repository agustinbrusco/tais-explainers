#!/usr/bin/env python3
"""Generate kit/web/tokens.css from kit/tokens.json (the single source of truth).

    uv run scripts/build_tokens.py
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
tokens = json.loads((ROOT / "kit/tokens.json").read_text())

lines = ["/* GENERATED from kit/tokens.json by scripts/build_tokens.py. Do not edit. */", ":root {"]
lines += [f"  --{k}: {v};" for k, v in tokens["color"].items()]
lines += [f"  --{k}: {v['hex']};  /* {v['means']} */" for k, v in tokens["semantic"].items()]
lines += [f'  --font-sans: "{tokens["type"]["sans"]}", system-ui, sans-serif;',
          f'  --font-mono: "{tokens["type"]["mono"]}", ui-monospace, monospace;']
lines += [f"  --fs-{k}: {v / 16:.3f}rem;" for k, v in tokens["type"]["scale"].items()]
lines += [f"  --t-{k.replace('_', '-')}: {v}s;" for k, v in tokens["motion"].items() if not k.startswith("_")]
lines += ["}", ""]

out = ROOT / "kit/web/tokens.css"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text("\n".join(lines))
print(out.relative_to(ROOT))
