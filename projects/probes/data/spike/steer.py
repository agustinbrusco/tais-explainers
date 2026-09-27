"""Feasibility spike: does adding a truth direction flip Qwen2.5-1.5B's TRUE/FALSE judgment, and does the
difference of means steer better than the logistic-regression direction at equal norm? Scratch only."""
import csv
from pathlib import Path
import numpy as np
import torch
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from transformers import AutoModelForCausalLM, AutoTokenizer

HERE = Path(__file__).parent
MODEL = "Qwen/Qwen2.5-1.5B"
torch.set_num_threads(6)
tok = AutoTokenizer.from_pretrained(MODEL)
model = AutoModelForCausalLM.from_pretrained(MODEL, torch_dtype=torch.float32).eval()

PREFIX = ("The city of Tokyo is in Japan. This statement is: TRUE\n"
          "The city of Hanoi is in Poland. This statement is: FALSE\n"
          "The city of Chicago is in the United States. This statement is: TRUE\n"
          "The city of Madrid is in Brazil. This statement is: FALSE\n")
SUFFIX = " This statement is:"
T_ID = tok(" TRUE", add_special_tokens=False).input_ids
F_ID = tok(" FALSE", add_special_tokens=False).input_ids
print("token ids", T_ID, F_ID)
T_ID, F_ID = T_ID[0], F_ID[0]

rows = list(csv.DictReader(open(HERE / "data" / "cities.csv")))
d = np.load(HERE / "acts_Qwen2.5-1.5B_cities.npz")
A, y = d["acts"].astype(np.float32), d["labels"]
cities = sorted({r["city"] for r in rows})
train_c = set(np.random.default_rng(1).permutation(cities)[: len(cities) // 2])
tr = np.array([r["city"] in train_c for r in rows])
test_idx = np.where(~tr)[0]
rng = np.random.default_rng(2)
sample = np.concatenate([rng.choice(test_idx[y[test_idx] == 1], 30, replace=False),
                         rng.choice(test_idx[y[test_idx] == 0], 30, replace=False)])

LAYERS = [8, 10, 12]
dirs = {}
for l in LAYERS:
    X = A[tr, l + 1]  # hidden_states[l+1] = output of block l
    dmu = X[y[tr] == 1].mean(0) - X[y[tr] == 0].mean(0)
    sc = StandardScaler().fit(X)
    clf = LogisticRegression(C=1.0, max_iter=3000).fit(sc.transform(X), y[tr])
    w = clf.coef_[0] / sc.scale_
    norm = np.linalg.norm(dmu)
    dirs[l] = {"dmu": torch.tensor(dmu / norm, dtype=torch.float32), "w": torch.tensor(w / np.linalg.norm(w), dtype=torch.float32), "norm": float(norm)}
    print(f"block {l}: |dmu| = {norm:.1f}, cos(w, dmu) = {float(dirs[l]['w'] @ dirs[l]['dmu']):.2f}")

state = {"alpha": 0.0, "kind": "dmu", "pos": None}


def make_hook(l):
    def hook(mod, inp, out):
        if state["alpha"] == 0.0:
            return out
        h = out[0] if isinstance(out, tuple) else out
        v = dirs[l][state["kind"]] * dirs[l]["norm"] * state["alpha"] / len(LAYERS)
        h[:, state["pos"], :] += v.to(h.dtype)
        return out
    return hook


for l in LAYERS:
    model.model.layers[l].register_forward_hook(make_hook(l))


def logit_diff(stmt):
    ids = tok(PREFIX + stmt + SUFFIX, return_tensors="pt").input_ids
    state["pos"] = len(tok(PREFIX + stmt).input_ids) - 1  # the statement's final "." token
    with torch.no_grad():
        lg = model(ids).logits[0, -1]
    return float(lg[T_ID] - lg[F_ID])


# Belief vs truth: on every held-out statement, does the probe side with the model's own judgment or with the facts?
state["alpha"] = 0.0
ld_all = np.array([logit_diff(rows[i]["statement"]) for i in test_idx])
judged = (ld_all > 0).astype(int)
Xl = A[:, 16]
sc = StandardScaler().fit(Xl[tr])
clf = LogisticRegression(C=1.0, max_iter=3000).fit(sc.transform(Xl[tr]), y[tr])
probe = clf.predict(sc.transform(Xl[test_idx]))
truth = y[test_idx]
wrong = judged != truth
print(f"\nmodel's few-shot judgment accuracy on {len(test_idx)} held-out: {(judged == truth).mean():.3f}")
print(f"probe (L16) accuracy vs truth: {(probe == truth).mean():.3f}; agreement with model's judgment: {(probe == judged).mean():.3f}")
if wrong.sum():
    print(f"on the {wrong.sum()} statements the model judges wrongly, probe sides with the model on "
          f"{(probe[wrong] == judged[wrong]).mean():.2f} of them")
    for i in np.where(wrong)[0][:12]:
        print("   ", rows[test_idx[i]]["statement"], "truth", truth[i], "model", judged[i], "probe", probe[i])

alphas = [-1.0, -0.5, 0.0, 0.5, 1.0]
for kind in ["dmu", "w"]:
    state["kind"] = kind
    print(f"\ndirection = {kind} (added at the final '.' of the statement, blocks {LAYERS}, total norm alpha*|dmu|)")
    for a in alphas:
        state["alpha"] = a
        ld = np.array([logit_diff(rows[i]["statement"]) for i in sample])
        lab = y[sample]
        acc = ((ld > 0).astype(int) == lab).mean()
        print(f"alpha {a:+.1f}: mean logit(TRUE)-logit(FALSE): true stmts {ld[lab == 1].mean():+.2f}, "
              f"false stmts {ld[lab == 0].mean():+.2f}; judged TRUE: {(ld > 0).mean():.2f}; acc {acc:.2f}")
