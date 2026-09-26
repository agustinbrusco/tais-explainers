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


# Contrast check (WCAG 2): text colors must reach 4.5:1 on the surfaces they sit on. The -ink variants sit on paper
# (page and sheet); the glass values on the glass background. Faint neutrals (ink3, faint) are for decoration only.
def luminance(hex_):
    c = [int(hex_.lstrip("#")[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def ratio(a, b):
    la, lb = sorted([luminance(a), luminance(b)], reverse=True)
    return (la + 0.05) / (lb + 0.05)


page, glass = public(tokens.get("page", {})), public(tokens["color"])
checks = []
for k, v in tokens["semantic"].items():
    if "ink" in v:
        checks += [(f"{k}-ink on page", v["ink"], page["page"]), (f"{k}-ink on sheet", v["ink"], page["sheet"])]
    checks.append((f"{k} on glass", v["hex"], glass["bg"]))
checks += [("ink2 on page", page["ink2"], page["page"]), ("muted on glass", glass["muted"], glass["bg"])]
low = [(n, round(ratio(a, b), 2)) for n, a, b in checks if ratio(a, b) < 4.5]
print("contrast: all text colors ≥ 4.5:1" if not low else "contrast below 4.5:1 (use for large text or decoration only): "
      + ", ".join(f"{n} {r}" for n, r in low))
