"""Which direction moves the model? Marks & Tegmark's causal test (their §6) on Qwen2.5-1.5B and our statements.

Protocol (pinned, 2026-09-27):
- Directions fitted at layer 16 over the period (the pinned protocol: logistic regression C = 1 on centred raw states,
  and the difference of means). Each is scaled by Marks & Tegmark's rule: theta such that, for that probe, the average
  false statement plus theta reads like the average true one. For the difference of means theta is the difference of
  means itself; for logistic regression it is (w_hat . dmu) w_hat, shorter by the cosine between the two.
- Where: the statement's last two tokens (the country's last token and the period), at layers 14-18 (hidden_states
  indices; the outputs of blocks 13-17), our analogue of their "group (b)", read off our patching map (data/patch.py):
  in this model the country's last token carries the answer up to layer ~15 and the period up to 28% at layers 16-18.
  theta is added to each of those states, as they add it to each group (b) state.
- The model's answer: a two-example TRUE/FALSE prompt; PD = P(TRUE) - P(FALSE) (softmax over the whole vocabulary);
  NIE false->true = (PD*_- - PD_-) / (PD_+ - PD_-) and true->false = (PD*_+ - PD_+) / (PD_- - PD_+), their definitions.
- Statements: 100 true and 100 false from the held-out cities (in distribution), and 100 + 100 Spanish-English
  statements (out of distribution, as in their Table 2), with the push strength alpha in multiples of theta.
- The running example: "The city of Krasnodar is in Russia." and its false twin, pushed at every alpha from -2 to 2 along
  each direction (negative = toward false), for the page's push slider and the hero.

Writes web/data/push.json.

    uv run --group interp --with scikit-learn python projects/probes/data/push.py
"""
import csv, json, sys, time
from pathlib import Path
import numpy as np
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import load, split, unit, lr, R, WEB, RUN

MODEL = "Qwen/Qwen2.5-1.5B"
FIT_LAYER = 16
BAND = list(range(14, 19))                 # hidden_states indices: add at the outputs of blocks 13..17
ALPHAS = [0.25, 0.5, 1.0, 1.5, 2.0]
SWEEP = [round(a, 2) for a in np.arange(-2, 2.001, 0.25)]
N_EACH = 100
BATCH = 20
PREFIX = {"cities": ("The city of Tokyo is in Japan. This statement is: TRUE\n"
                     "The city of Hanoi is in Poland. This statement is: FALSE\n"),
          "sp": ("The Spanish word 'fruta' means 'goat'. This statement is: FALSE\n"
                 "The Spanish word 'carne' means 'meat'. This statement is: TRUE\n")}
SUFFIX = " This statement is:"
t0 = time.time()
log = lambda *a: print(f"[{time.time() - t0:5.0f}s]", *a, flush=True)

# the directions, from the cached activations
A, ya, ra = load("cities")
tr = split(ra)
X = A[:, FIT_LAYER].astype(np.float64)
w, b = lr(X[tr], ya[tr])
mt, mf = X[tr][ya[tr] == 1].mean(0), X[tr][ya[tr] == 0].mean(0)
dmu = mt - mf
cos = float(unit(w) @ unit(dmu))
theta = {"mm": dmu, "lr": (unit(w) @ dmu) * unit(w)}
# check the scaling rule: each probe reads mu_false + theta like mu_true
assert abs((mf + theta["lr"]) @ w - mt @ w) < 1e-6 * abs(mt @ w - mf @ w) + 1e-9
hnorm = float(np.linalg.norm(X[~tr], axis=1).mean())
log(f"L{FIT_LAYER}: |dmu| {np.linalg.norm(dmu):.2f}, cos(w, dmu) {cos:.3f}, |theta_lr| {np.linalg.norm(theta['lr']):.2f}, mean |h| {hnorm:.1f}")

torch.set_num_threads(12)
tok = AutoTokenizer.from_pretrained(MODEL)
tok.padding_side = "right"
if tok.pad_token is None:
    tok.pad_token = tok.eos_token
model = AutoModelForCausalLM.from_pretrained(MODEL, dtype=torch.float32).eval()
T_ID = tok(" TRUE", add_special_tokens=False).input_ids[0]
F_ID = tok(" FALSE", add_special_tokens=False).input_ids[0]

state = {"vec": None, "pos": None}


def hook(mod, inp, out):
    if state["vec"] is None:
        return out
    h = out[0] if isinstance(out, tuple) else out
    for bi, ps in enumerate(state["pos"]):
        for p in ps:
            h[bi, p] += state["vec"]
    return out


for l in BAND:
    model.model.layers[l - 1].register_forward_hook(hook)


@torch.no_grad()
def pd(statements, kind, vec=None):
    """P(TRUE) - P(FALSE) for each statement, with vec added at its last two tokens across the band."""
    outp = []
    for i in range(0, len(statements), BATCH):
        batch = statements[i:i + BATCH]
        texts = [PREFIX[kind] + s + SUFFIX for s in batch]
        enc = tok(texts, return_tensors="pt", padding=True)
        ends = [len(tok(PREFIX[kind] + s).input_ids) for s in batch]
        state["pos"] = [[e - 2, e - 1] for e in ends]
        state["vec"] = None if vec is None else torch.tensor(vec, dtype=torch.float32)
        lg = model(**enc).logits
        last = enc["attention_mask"].sum(1) - 1
        p = lg[torch.arange(len(batch)), last].softmax(-1)
        outp.append((p[:, T_ID] - p[:, F_ID]).numpy())
        state["vec"] = None
    return np.concatenate(outp)


rng = np.random.default_rng(5)
te_idx = np.where(~tr)[0]
sets = {"cities": np.concatenate([rng.choice(te_idx[ya[te_idx] == 1], N_EACH, replace=False),
                                  rng.choice(te_idx[ya[te_idx] == 0], N_EACH, replace=False)])}
_, ys_, rs_ = load("sp_en_trans")
keep = [i for i, r in enumerate(rs_) if "'fruta'" not in r["statement"] and "'carne'" not in r["statement"]]
keep = np.array(keep)
sets["sp"] = np.concatenate([rng.choice(keep[ys_[keep] == 1], N_EACH, replace=False), rng.choice(keep[ys_[keep] == 0], N_EACH, replace=False)])
text = {"cities": [r["statement"] for r in ra], "sp": [r["statement"] for r in rs_]}
labels = {"cities": ya, "sp": ys_}

out = {"meta": {"model": MODEL, "fit_layer": FIT_LAYER, "band": BAND, "positions": "the statement's last two tokens",
                "alphas": ALPHAS, "n_each": N_EACH, "prefix": PREFIX, "suffix": SUFFIX,
                "readout": "PD = P(TRUE) - P(FALSE), softmax over the vocabulary; NIE as in Marks & Tegmark (2310.06824 §6.1)"},
       "geometry": {"cos_w_dmu": round(cos, 4), "dmu_norm": round(float(np.linalg.norm(dmu)), 3),
                    "theta_lr_norm": round(float(np.linalg.norm(theta["lr"])), 3), "h_norm_mean": round(hnorm, 2)},
       "nie": {}, "pd": {}}
if sys.argv[1:] == ["matched"]:
    # the difference-of-means push at the same displacement along dmu_hat as each w push: alpha * cos^2 (the w push at
    # alpha moves alpha * |theta_lr| * cos = alpha * |dmu| * cos^2 along dmu_hat). Merged into the existing push.json.
    prev = json.loads((WEB / "push.json").read_text())
    am = [round(a * cos ** 2, 4) for a in ALPHAS]
    for kind, idx in sets.items():
        stm = [text[kind][i] for i in idx]
        y = labels[kind][idx]
        pdp, pdm = prev["pd"][kind]["true"], prev["pd"][kind]["false"]
        fs = [s for s, yy in zip(stm, y) if yy == 0]
        ts = [s for s, yy in zip(stm, y) if yy == 1]
        f2t, t2f = [], []
        for a in am:
            pf, pt = pd(fs, kind, a * theta["mm"]), pd(ts, kind, -a * theta["mm"])
            f2t.append(round((float(pf.mean()) - pdm) / (pdp - pdm), 3))
            t2f.append(round((float(pt.mean()) - pdp) / (pdm - pdp), 3))
            log(kind, f"mm matched alpha {a}: f2t {f2t[-1]:+.3f} t2f {t2f[-1]:+.3f}")
        prev["nie"][kind]["mm_matched"] = {"alphas": am, "f2t": f2t, "t2f": t2f,
                                           "note": "difference-of-means pushes as long along dmu_hat as the w pushes at meta.alphas"}
    (WEB / "push.json").write_text(json.dumps(prev, separators=(",", ":")))
    log("updated", WEB / "push.json")
    sys.exit(0)

for kind, idx in sets.items():
    stm = [text[kind][i] for i in idx]
    y = labels[kind][idx]
    base = pd(stm, kind)
    pdp, pdm = float(base[y == 1].mean()), float(base[y == 0].mean())
    out["pd"][kind] = {"true": round(pdp, 4), "false": round(pdm, 4), "acc": round(float(((base > 0) == (y == 1)).mean()), 3)}
    log(kind, "baseline PD true", round(pdp, 3), "false", round(pdm, 3), "acc", out["pd"][kind]["acc"])
    out["nie"][kind] = {}
    for d in ("mm", "lr"):
        f2t, t2f = [], []
        for a in ALPHAS:
            fs = [s for s, yy in zip(stm, y) if yy == 0]
            ts = [s for s, yy in zip(stm, y) if yy == 1]
            pf = pd(fs, kind, a * theta[d])
            pt = pd(ts, kind, -a * theta[d])
            f2t.append(round((float(pf.mean()) - pdm) / (pdp - pdm), 3))
            t2f.append(round((float(pt.mean()) - pdp) / (pdm - pdp), 3))
            log(kind, d, f"alpha {a}: NIE false->true {f2t[-1]:+.3f}  true->false {t2f[-1]:+.3f}")
        out["nie"][kind][d] = {"f2t": f2t, "t2f": t2f}

# the running example, pushed along each direction at every strength (negative = toward false)
K = [i for i, r in enumerate(ra) if r["city"] == "Krasnodar"]
kr = {"statements": [text["cities"][i] for i in K], "labels": [int(ya[i]) for i in K], "alphas": SWEEP}
for d in ("mm", "lr"):
    kr[d] = {}
    for i in K:
        vals = []
        for a in SWEEP:
            vals.append(round(float(pd([text["cities"][i]], "cities", a * theta[d] if a else None)[0]), 4))
        kr[d]["true" if ya[i] else "false"] = vals
    log("Krasnodar", d, kr[d])
out["krasnodar"] = kr
# the patching map that located the band (data/patch.py), for the record and the page
pj = RUN / "patch.json"
if pj.exists():
    P = json.load(open(pj))
    out["patch"] = {"positions": P["positions"], "mean": P["mean"], "n_pairs": len(P["pairs"])}
WEB.mkdir(parents=True, exist_ok=True)
(WEB / "push.json").write_text(json.dumps(out, separators=(",", ":")))
log("wrote", WEB / "push.json")
