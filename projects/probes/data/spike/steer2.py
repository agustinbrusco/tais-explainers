"""Steering spike v2 (faster, unbuffered): push the statement's final-token state at one layer along the difference of
means vs the logistic-regression direction, at equal norm and at equal projection on the difference of means; few-shot
TRUE/FALSE readout. Also: belief vs truth on a subsample. Scratch only."""
import csv, sys
from pathlib import Path
import numpy as np
import torch
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from transformers import AutoModelForCausalLM, AutoTokenizer

HERE = Path(__file__).parent
MODEL = "Qwen/Qwen2.5-1.5B"
HS = int(sys.argv[1]) if len(sys.argv) > 1 else 16   # hidden_states index = output of block HS-1
BLOCK = HS - 1
torch.set_num_threads(12)
tok = AutoTokenizer.from_pretrained(MODEL)
model = AutoModelForCausalLM.from_pretrained(MODEL, dtype=torch.float32).eval()

PREFIX = ("The city of Tokyo is in Japan. This statement is: TRUE\n"
          "The city of Hanoi is in Poland. This statement is: FALSE\n"
          "The city of Chicago is in the United States. This statement is: TRUE\n"
          "The city of Madrid is in Brazil. This statement is: FALSE\n")
SUFFIX = " This statement is:"
T_ID = tok(" TRUE", add_special_tokens=False).input_ids[0]
F_ID = tok(" FALSE", add_special_tokens=False).input_ids[0]

rows = list(csv.DictReader(open(HERE / "data" / "cities.csv")))
d = np.load(HERE / "acts_Qwen2.5-1.5B_cities.npz")
A, y = d["acts"].astype(np.float32), d["labels"]
cities = sorted({r["city"] for r in rows})
train_c = set(np.random.default_rng(1).permutation(cities)[: len(cities) // 2])
tr = np.array([r["city"] in train_c for r in rows])
test_idx = np.where(~tr)[0]

X = A[tr, HS]
dmu = X[y[tr] == 1].mean(0) - X[y[tr] == 0].mean(0)
gap = float(np.linalg.norm(dmu))
sc = StandardScaler().fit(X)
clf = LogisticRegression(C=1.0, max_iter=3000).fit(sc.transform(X), y[tr])
w = clf.coef_[0] / sc.scale_
u_d = dmu / gap
u_w = w / np.linalg.norm(w)
cos = float(u_w @ u_d)
hnorm = float(np.linalg.norm(A[test_idx, HS], axis=1).mean())
print(f"hidden_states[{HS}] (block {BLOCK} output): class gap |dmu| = {gap:.1f}, mean |h| = {hnorm:.1f}, cos(w, dmu) = {cos:.3f}", flush=True)
V = {"dmu": u_d, "w": u_w, "w_eqproj": u_w / cos}   # w_eqproj: same projection on dmu as the dmu push
V = {k: torch.tensor(v, dtype=torch.float32) for k, v in V.items()}

state = {"v": None, "pos": None}


def hook(mod, inp, out):
    if state["v"] is None:
        return out
    h = out[0] if isinstance(out, tuple) else out
    h[:, state["pos"], :] += state["v"].to(h.dtype)
    return out


model.model.layers[BLOCK].register_forward_hook(hook)


def logit_diff(stmt):
    ids = tok(PREFIX + stmt + SUFFIX, return_tensors="pt").input_ids
    state["pos"] = len(tok(PREFIX + stmt).input_ids) - 1
    with torch.no_grad():
        lg = model(ids).logits[0, -1]
    return float(lg[T_ID] - lg[F_ID])


rng = np.random.default_rng(2)
# Belief vs truth on 240 held-out statements (unsteered)
sub = rng.choice(test_idx, 240, replace=False)
state["v"] = None
ld = np.array([logit_diff(rows[i]["statement"]) for i in sub])
judged = (ld > 0).astype(int)
truth = y[sub]
probe = clf.predict(sc.transform(A[sub, HS]))
wrong = judged != truth
print(f"few-shot judgement accuracy {(judged == truth).mean():.3f} on {len(sub)}; probe vs truth {(probe == truth).mean():.3f}; "
      f"probe agrees with model {(probe == judged).mean():.3f}", flush=True)
if wrong.sum():
    print(f"  on {wrong.sum()} statements the model gets wrong, the probe sides with the model on {(probe[wrong] == judged[wrong]).mean():.2f}", flush=True)
    for i in np.where(wrong)[0][:8]:
        print("   ", rows[sub[i]]["statement"], "| truth", truth[i], "model", judged[i], "probe", probe[i], flush=True)

# Steering on 24 true + 24 false held-out statements
samp = np.concatenate([rng.choice(test_idx[y[test_idx] == 1], 24, replace=False),
                       rng.choice(test_idx[y[test_idx] == 0], 24, replace=False)])
lab = y[samp]
for kind in ["dmu", "w", "w_eqproj"]:
    print(f"\n{kind}:", flush=True)
    for a in [-3.0, -1.5, 0.0, 1.5, 3.0]:
        state["v"] = None if a == 0 else V[kind] * gap * a
        norm = 0.0 if a == 0 else float(state["v"].norm())
        proj = 0.0 if a == 0 else float(state["v"] @ V["dmu"])
        l = np.array([logit_diff(rows[i]["statement"]) for i in samp])
        print(f"  alpha {a:+.1f}  |push|/|h| {norm / hnorm:.2f}  proj on dmu-hat {proj / gap:+.2f} gaps  "
              f"mean logit(T)-logit(F): true {l[lab == 1].mean():+.2f}  false {l[lab == 0].mean():+.2f}  "
              f"judged TRUE: true {(l[lab == 1] > 0).mean():.2f}  false {(l[lab == 0] > 0).mean():.2f}", flush=True)
