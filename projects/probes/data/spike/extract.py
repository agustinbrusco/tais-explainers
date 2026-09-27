"""Feasibility spike: last-token residual stream for Geometry-of-Truth statements, every layer, on CPU."""
import csv, sys, time
from pathlib import Path
import numpy as np
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

HERE = Path(__file__).parent
MODEL = sys.argv[1] if len(sys.argv) > 1 else "Qwen/Qwen2.5-1.5B"
SETS = sys.argv[2].split(",") if len(sys.argv) > 2 else ["cities", "neg_cities"]
tag = MODEL.split("/")[-1]

torch.set_num_threads(12)
tok = AutoTokenizer.from_pretrained(MODEL)
tok.padding_side = "right"
if tok.pad_token is None:
    tok.pad_token = tok.eos_token
model = AutoModelForCausalLM.from_pretrained(MODEL, torch_dtype=torch.float32)
model.eval()
print(MODEL, model.config.num_hidden_layers, model.config.hidden_size, flush=True)

for name in SETS:
    rows = list(csv.DictReader(open(HERE / "data" / f"{name}.csv")))
    texts = [r["statement"] for r in rows]
    labels = np.array([int(r["label"]) for r in rows])
    out = []
    t0 = time.time()
    for i in range(0, len(texts), 32):
        batch = tok(texts[i:i + 32], return_tensors="pt", padding=True)
        with torch.no_grad():
            hs = model(**batch, output_hidden_states=True).hidden_states  # (L+1) x B x T x d
        last = batch["attention_mask"].sum(1) - 1
        h = torch.stack([x[torch.arange(x.shape[0]), last] for x in hs], 1)  # B x (L+1) x d
        out.append(h.to(torch.float16).numpy())
    acts = np.concatenate(out)
    np.savez_compressed(HERE / f"acts_{tag}_{name}.npz", acts=acts, labels=labels)
    print(name, acts.shape, f"{time.time() - t0:.0f}s", flush=True)
