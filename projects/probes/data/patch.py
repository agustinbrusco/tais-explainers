"""Where does Qwen2.5-1.5B hold a statement's truth, causally? Marks & Tegmark's patching (their §3) on our statements.

For held-out cities whose true and false countries have the same number of tokens, run a few-shot TRUE/FALSE prompt with
the true statement and with the false one; then rerun the false prompt with a single hidden state (one position, one
layer) swapped in from the true run, and record how far the model's answer (logit TRUE - logit FALSE) moves toward the
true run's: 0 = no effect, 1 = as if the statement were true. Positions before the country are the same input in both
runs, so only the country, the period and the suffix can matter. The map says which states a push should target
(Marks & Tegmark's "group (b)": the statement's last token and its period, in middle layers).

Writes data/run/patch.json (gitignored with the run; the numbers the page uses are copied by data/push.py).

    uv run --group interp python projects/probes/data/patch.py
"""
import csv, json, time
from pathlib import Path
import numpy as np
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

RUN = Path(__file__).resolve().parent / "run"
MODEL = "Qwen/Qwen2.5-1.5B"
N_PAIRS = 10
# Marks & Tegmark's localization prompt, with our own examples (none of these cities is in our statements' held-out half
# by construction: they are not checked here, the prompt only primes the TRUE/FALSE format)
PREFIX = ("The city of Tokyo is in Japan. This statement is: TRUE\n"
          "The city of Hanoi is in Poland. This statement is: FALSE\n")
SUFFIX = " This statement is:"

torch.set_num_threads(12)
tok = AutoTokenizer.from_pretrained(MODEL)
model = AutoModelForCausalLM.from_pretrained(MODEL, torch_dtype=torch.float32).eval()
NL = model.config.num_hidden_layers
T_ID = tok(" TRUE", add_special_tokens=False).input_ids[0]
F_ID = tok(" FALSE", add_special_tokens=False).input_ids[0]

rows = list(csv.DictReader(open(RUN / "data" / "cities.csv", encoding="utf-8")))
cities = sorted({r["city"] for r in rows})
train_c = set(np.random.default_rng(1).permutation(cities)[: len(cities) // 2])      # the pinned split (export.py)
held = [i for i in range(0, len(rows), 2) if rows[i]["city"] not in train_c]
pairs = []
for i in held:
    t, f = rows[i]["statement"], rows[i + 1]["statement"]
    it, if_ = tok(PREFIX + t + SUFFIX).input_ids, tok(PREFIX + f + SUFFIX).input_ids
    if len(it) == len(if_):
        pairs.append((t, f, it, if_))
rng = np.random.default_rng(3)
pick = rng.choice(len(pairs), N_PAIRS, replace=False)
pairs = [pairs[j] for j in sorted(pick)]

# patching: a batch of copies of the false prompt, copy b gets the true run's state at (pos[b], layer[b])
state = {"cache": None, "pos": None, "lay": None}


def make_hook(l):
    def hook(mod, inp, out):
        if state["cache"] is None:
            return out
        h = out[0] if isinstance(out, tuple) else out
        for b in np.where(state["lay"] == l)[0]:
            h[b, state["pos"][b]] = state["cache"][l][state["pos"][b]]
        return out
    return hook


model.model.embed_tokens.register_forward_hook(make_hook(0))
for l in range(1, NL + 1):
    model.model.layers[l - 1].register_forward_hook(make_hook(l))


def answer(ids):
    with torch.no_grad():
        lg = model(ids).logits[:, -1]
    return (lg[:, T_ID] - lg[:, F_ID]).numpy()


t0 = time.time()
maps, labels = [], None
for n, (t, f, it, if_) in enumerate(pairs):
    ids_t, ids_f = torch.tensor([it]), torch.tensor([if_])
    state["cache"] = None
    with torch.no_grad():
        hs = model(ids_t, output_hidden_states=True).hidden_states
    # hidden_states[l] = output of block l-1 (the last one after the final norm): cache the raw block outputs instead
    cache = {0: hs[0][0]}
    grab = {}
    hooks = [model.model.layers[l - 1].register_forward_hook(
        lambda m, i_, o, l=l: grab.__setitem__(l, (o[0] if isinstance(o, tuple) else o)[0].clone())) for l in range(1, NL + 1)]
    with torch.no_grad():
        base_t = float(answer(ids_t)[0])
    for h in hooks:
        h.remove()
    cache.update(grab)
    base_f = float(answer(ids_f)[0])
    first = next(k for k in range(len(it)) if it[k] != if_[k])                 # the country's first token
    positions = list(range(first, len(it)))
    m = np.zeros((len(positions), NL + 1))
    for pi, p in enumerate(positions):
        state.update(cache=cache, pos=np.full(NL + 1, p), lay=np.arange(NL + 1))
        d = answer(ids_f.repeat(NL + 1, 1))
        state["cache"] = None
        m[pi] = (d - base_f) / (base_t - base_f)
    # keep only the country's last token, so that maps of different pairs align (country, period, 4 suffix tokens)
    m = m[len(positions) - 6:]
    maps.append(m)
    labels = ["country (last token)", "period", "This", "statement", "is", ":"]
    print(f"{n + 1}/{len(pairs)} {t} | {f} | answer true {base_t:+.2f} false {base_f:+.2f} | {time.time() - t0:.0f}s", flush=True)

M = np.mean(maps, 0)
print("mean normalized effect of patching one state (rows: positions; columns: layers 0..28)")
for lab, row in zip(labels, M):
    print(f"{lab:>22s} " + " ".join(f"{v:+.2f}" for v in row))
json.dump({"model": MODEL, "prefix": PREFIX, "suffix": SUFFIX, "pairs": [(t, f) for t, f, _, _ in pairs],
           "positions": labels, "layers": list(range(NL + 1)), "mean": np.round(M, 3).tolist(),
           "note": "layer l = output of block l-1 (0 = embeddings), raw residual (before the final norm)"},
          open(RUN / "patch.json", "w"), indent=1)
print("wrote", RUN / "patch.json", f"{time.time() - t0:.0f}s")
