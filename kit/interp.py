"""Real activations for explainer figures, on CPU (TransformerLens 4).

    ./scripts/setup.sh --interp        # or: uv sync --group interp
    uv run --group interp python <script that uses kit.interp>

TransformerLens 4 removed `HookedTransformer`; models load through `TransformerBridge`:
  - legacy TransformerLens repos (e.g. `NeelNanda/GELU_4L512W_C4_Code` = gelu-4l): `boot_tl_legacy` (tested);
  - Hugging Face models (e.g. `gpt2`, `EleutherAI/pythia-70m`): `boot_transformers`.

Figures draw a hidden state as a square of real numbers (kit/web/states.js). The helpers here produce that data:
the residual stream after each block, a per-layer color scale, and small ints for compact JSON. `greedy` records what
the model actually says, so a figure can claim what the model can't do (see cot-monitorability's C-ANAT-4).
Reference use: projects/cot-monitorability/data/export_tiles.py.
"""

from __future__ import annotations

import torch

LEGACY_PREFIXES = ("NeelNanda/",)


def load(name: str, device: str = "cpu"):
    """Load a model by repo name, picking the TransformerLens 4 loader that fits it."""
    from transformer_lens import TransformerBridge

    torch.manual_seed(0)
    if name.startswith(LEGACY_PREFIXES):
        return TransformerBridge.boot_tl_legacy(name, device=device)
    return TransformerBridge.boot_transformers(name, device=device)


def residual_stream(model, text: str):
    """(tokens, hooks, resid) with resid[layer, token, d_model] = the residual stream after each block."""
    tokens = model.to_str_tokens(text)
    _, cache = model.run_with_cache(text)
    hooks = [f"blocks.{l}.hook_resid_post" for l in range(model.cfg.n_layers)]
    return tokens, hooks, torch.stack([cache[h][0] for h in hooks])


def layer_scales(resid, q: float = 0.99, skip_first: bool = True) -> list[float]:
    """Each layer's q-quantile |value| over tokens and dimensions. The residual stream's norm grows with depth, so colors
    are relative to each layer (say so on screen). The first token is skipped by default: its norm is an outlier."""
    start = 1 if skip_first else 0
    return [float(torch.quantile(resid[l, start:].abs().flatten(), q)) for l in range(resid.shape[0])]


def quantize(v, scale: float, dims: int | None = None, levels: int = 127) -> list[int]:
    """The first `dims` values of v, divided by `scale`, clipped to [-1, 1], as ints in [-levels, levels]."""
    v = v[:dims] if dims else v
    return [int(round(max(-1.0, min(1.0, float(x) / scale)) * levels)) for x in v]


def greedy(model, prompt: str, n: int = 8) -> str:
    """The model's own greedy continuation of `prompt` (n tokens)."""
    ids = model.to_tokens(prompt)
    out = ids
    with torch.no_grad():
        for _ in range(n):
            out = torch.cat([out, model(out)[0, -1].argmax().view(1, 1)], dim=1)
    return model.to_string(out[0, ids.shape[1]:])
