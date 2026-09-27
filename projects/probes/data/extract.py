"""Hidden states of Qwen2.5-1.5B (base, fp32, CPU) for our statements (data/statements.py).

Writes, into data/run/ (gitignored, ~0.5 GB):
- acts_Qwen2.5-1.5B_<set>.npz: the final token's hidden state at every layer, `hidden_states[l]` for l = 0..28 (l = 0 is
  the embedding, l = the output of block l-1), float16, with the labels. The final token is the statement's period.
- tokens_Qwen2.5-1.5B_cities.npz: every token's hidden state at layers 8, 12 and 16 for the affirmative cities, for the
  question of where along a statement a probe should read (flattened over tokens, with offsets and token ids).

    uv run --group interp python projects/probes/data/extract.py
"""
import csv, time
from pathlib import Path
import numpy as np
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

HERE = Path(__file__).resolve().parent / "run"
MODEL = "Qwen/Qwen2.5-1.5B"
TAG = MODEL.split("/")[-1]
SETS = ["cities", "neg_cities", "sp_en_trans", "neg_sp_en_trans"]
TOKEN_LAYERS = [8, 12, 16]
BATCH = 32

torch.set_num_threads(12)
tok = AutoTokenizer.from_pretrained(MODEL)
tok.padding_side = "right"
if tok.pad_token is None:
    tok.pad_token = tok.eos_token
model = AutoModelForCausalLM.from_pretrained(MODEL, torch_dtype=torch.float32).eval()
print(MODEL, model.config.num_hidden_layers, model.config.hidden_size, flush=True)

for name in SETS:
    rows = list(csv.DictReader(open(HERE / "data" / f"{name}.csv", encoding="utf-8")))
    texts = [r["statement"] for r in rows]
    labels = np.array([int(r["label"]) for r in rows])
    last_all, tok_states, tok_ids, offsets = [], [], [], [0]
    t0 = time.time()
    for i in range(0, len(texts), BATCH):
        batch = tok(texts[i:i + BATCH], return_tensors="pt", padding=True)
        with torch.no_grad():
            hs = model(**batch, output_hidden_states=True).hidden_states   # (L+1) x B x T x d
        lengths = batch["attention_mask"].sum(1)
        last = lengths - 1
        last_all.append(torch.stack([x[torch.arange(x.shape[0]), last] for x in hs], 1).to(torch.float16).numpy())
        if name == "cities":
            for b in range(len(last)):
                n = int(lengths[b])
                tok_states.append(torch.stack([hs[l][b, :n] for l in TOKEN_LAYERS], 1).to(torch.float16).numpy())
                tok_ids.append(batch["input_ids"][b, :n].numpy())
                offsets.append(offsets[-1] + n)
        if i // BATCH % 10 == 0:
            print(f"  {name} {i + len(last)}/{len(texts)} {time.time() - t0:.0f}s", flush=True)
    acts = np.concatenate(last_all)
    np.savez_compressed(HERE / f"acts_{TAG}_{name}.npz", acts=acts, labels=labels)
    print(name, acts.shape, f"{time.time() - t0:.0f}s", flush=True)
    if name == "cities":
        np.savez_compressed(HERE / f"tokens_{TAG}_cities.npz", states=np.concatenate(tok_states), ids=np.concatenate(tok_ids),
                            offsets=np.array(offsets), layers=np.array(TOKEN_LAYERS), labels=labels)
        print("  token states", sum(len(t) for t in tok_ids), "tokens", flush=True)
