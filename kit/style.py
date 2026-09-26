"""Visual tokens for Python renderers (Manim, matplotlib).

    from kit.style import C, S, TYPE, MOTION
    C.bg, C.text, S.residual, S.overseer ...

Manim users should call `apply_manim_defaults()` once at import time of a scene file.
Kept free of a hard Manim dependency so non-video scripts can import it.
"""

from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

_TOKENS = json.loads((Path(__file__).parent / "tokens.json").read_text())

C = SimpleNamespace(**_TOKENS["color"])
S = SimpleNamespace(**{k: v["hex"] for k, v in _TOKENS["semantic"].items()})
MEANING = {k: v["means"] for k, v in _TOKENS["semantic"].items()}
TYPE = SimpleNamespace(**{k: v for k, v in _TOKENS["type"].items() if k != "scale"})
TYPE.scale = SimpleNamespace(**_TOKENS["type"]["scale"])
MOTION = SimpleNamespace(**{k: v for k, v in _TOKENS["motion"].items() if not k.startswith("_")})


def apply_manim_defaults() -> None:
    """Set background, fonts and default colors for every Mobject in the scene file."""
    from manim import MathTex, Tex, Text, MarkupText, config

    config.background_color = C.bg
    Text.set_default(font=TYPE.sans, color=C.text)
    MarkupText.set_default(font=TYPE.sans, color=C.text)
    Tex.set_default(color=C.text)
    MathTex.set_default(color=C.text)
