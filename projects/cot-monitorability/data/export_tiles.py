"""Export real hidden states for the explainer's figures.

    uv run --group interp python projects/cot-monitorability/data/export_tiles.py

Every "hidden state" square in the web figures is a real residual-stream vector from gelu-4l, a small 4-layer
research language model (NeelNanda/GELU_4L512W_C4_Code: 4 layers, d_model 512, trained on C4 and code). It has
exactly as many layers as the drawings have rows per pass, which is why it was chosen. It cannot do the
arithmetic chain; the states are shown as what a hidden state *is* (a vector of numbers nobody can read directly),
not as evidence of the drawn computation. The drawn wiring and the one-step-per-layer convention stay schematic.

Output: projects/cot-monitorability/web/data/tiles.json
  meta         model, text, tokens, which token each drawn column uses, hook names, per-layer scale
  columns      [layer][column] -> 64 ints in -127..127 (dims 0-63 of the state after that layer, / layer scale)
  pool         [token][layer]  -> 64 ints, every token of the text (the other figures draw from this)
  zoom         one full state (512 floats, 2 decimals) for the "a word and 512 numbers" beat
"""

import json
from pathlib import Path

import torch
from transformer_lens import TransformerBridge

REPO = "NeelNanda/GELU_4L512W_C4_Code"
TEXT = ("Start with 7. Multiply by 3, subtract 4, multiply by 2, add 5, subtract 9, multiply by 2, add 7, subtract 3, "
        "multiply by 3, subtract 11. What is the result? 39, then 64, then 181. The answer is 181.")
DIMS = 64            # squares show dims 0..63 of each state, as an 8x8 grid
ZOOM_TOKEN = " answer"
ZOOM_LAYER = 2       # 1-based: the state after the 2nd of 4 blocks

OUT = Path(__file__).resolve().parents[1] / "web" / "data" / "tiles.json"

torch.manual_seed(0)
model = TransformerBridge.boot_tl_legacy(REPO, device="cpu")
cfg = model.cfg
toks = model.to_str_tokens(TEXT)
_, cache = model.run_with_cache(TEXT)
hooks = [f"blocks.{l}.hook_resid_post" for l in range(cfg.n_layers)]
resid = torch.stack([cache[h][0] for h in hooks])          # [layer, token, d_model]

# Per-layer scale: the residual stream's norm grows with depth, so colors are relative to each layer's
# 99th-percentile |value| over every token and dimension (BOS excluded: its norm is an outlier).
scale = [float(torch.quantile(resid[l, 1:].abs().flatten(), 0.99)) for l in range(cfg.n_layers)]
q = lambda v, l: [int(round(max(-1.0, min(1.0, float(x) / scale[l])) * 127)) for x in v[:DIMS]]


def last_index(piece, start=0):
    """Index of the last token of the first occurrence of `piece` (a list of token strings) at or after `start`."""
    for i in range(start, len(toks) - len(piece) + 1):
        if toks[i:i + len(piece)] == piece:
            return i + len(piece) - 1
    raise ValueError(piece)


# The drawn columns, left to right: the question (its last token), the written results 39 and 64, the answer 181,
# then whatever follows. Each card in the drawing stands for one of these tokens.
q_end = last_index(["?"])
i39 = last_index([" 3", "9"], q_end)
i64 = last_index([" 6", "4"], i39)
i181 = last_index([" 1", "8", "1"], i64)
column_tokens = [q_end, i39, i64, i181] + list(range(i181 + 1, i181 + 5))

zi = toks.index(ZOOM_TOKEN)
zoom_state = resid[ZOOM_LAYER - 1, zi]


def greedy(prompt, n=8):
    """The model's own continuation (greedy), to back the on-screen claim that it can't do the chain."""
    ids = model.to_tokens(prompt)
    out = ids
    with torch.no_grad():
        for _ in range(n):
            out = torch.cat([out, model(out)[0, -1].argmax().view(1, 1)], dim=1)
    return model.to_string(out[0, ids.shape[1]:])


question = TEXT[: TEXT.index("?") + 1]
capability = {p: greedy(p) for p in [question, question + " The result is", "7 * 3 ="]}

data = {
    "meta": {
        "model": "gelu-4l", "repo": REPO, "n_layers": cfg.n_layers, "d_model": cfg.d_model, "d_vocab": cfg.d_vocab,
        "tokenizer": getattr(cfg, "tokenizer_name", None), "text": TEXT, "tokens": toks,
        "hooks": hooks, "dims": f"0-{DIMS - 1} of {cfg.d_model}", "scale_per_layer": [round(s, 4) for s in scale],
        "column_tokens": column_tokens, "column_strings": [toks[i] for i in column_tokens],
        "capability_check": capability,
        "note": "columns[l][c] = dims 0-63 of the residual stream after block l+1 at token column_tokens[c], "
                "divided by that layer's 99th-percentile |value| and clipped to [-1, 1], times 127.",
    },
    "columns": [[q(resid[l, i], l) for i in column_tokens] for l in range(cfg.n_layers)],
    "pool": [[q(resid[l, i], l) for l in range(cfg.n_layers)] for i in range(1, len(toks))],
    "zoom": {
        "token": ZOOM_TOKEN, "token_index": zi, "layer": ZOOM_LAYER, "hook": hooks[ZOOM_LAYER - 1],
        "values": [round(float(x), 2) for x in zoom_state],
        "scale": round(scale[ZOOM_LAYER - 1], 4),
    },
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(data, separators=(",", ":")))
print(OUT, f"{OUT.stat().st_size / 1024:.1f} KB")
print("columns:", [toks[i] for i in column_tokens])
print("scale per layer:", [round(s, 3) for s in scale])
print("zoom:", repr(ZOOM_TOKEN), "layer", ZOOM_LAYER, "first values:", data["zoom"]["values"][:8])
for k, v in capability.items():
    print("greedy:", repr(k[-30:]), "->", repr(v))
