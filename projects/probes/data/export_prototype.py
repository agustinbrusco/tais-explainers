"""Export the real data for the money-shot prototype (steps: the ruler, fitting proves nothing, the flip, the fix).

Reads the spike's cached activations (Qwen2.5-1.5B, final token of each statement; see data/spike/README.md) and writes
build/proto/cloud.json. The statements are Marks & Tegmark's (their repo has no license), so the output stays in build/
(gitignored) until we regenerate our own statements. Every number the prototype shows comes from this file.

    uv run --group interp --with scikit-learn python projects/probes/data/export_prototype.py <dir with acts_*.npz and data/*.csv>
"""
import csv, json, sys
from pathlib import Path
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import StandardScaler

SRC = Path(sys.argv[1])
OUT = Path(__file__).resolve().parents[1] / "build" / "proto" / "cloud.json"
MODEL = "Qwen2.5-1.5B"
rng = np.random.default_rng(0)


def load(name):
    d = np.load(SRC / f"acts_{MODEL}_{name}.npz")
    rows = list(csv.DictReader(open(SRC / "data" / f"{name}.csv")))
    return d["acts"].astype(np.float32), d["labels"], rows


A, ya, ra = load("cities")
B, yb, rb = load("neg_cities")
S, ys, rs = load("sp_en_trans")
N, yn, rn = load("neg_sp_en_trans")
assert all(a["city"] == b["city"] and a["country"] == b["country"] for a, b in zip(ra, rb))  # row i's twin is row i

# Split by city (each city's true and false statements stay on the same side), as in the spike.
cities = sorted({r["city"] for r in ra})
train_c = set(np.random.default_rng(1).permutation(cities)[: len(cities) // 2])
tr = np.array([r["city"] in train_c for r in ra])
te = ~tr
# Points on screen: 120 true + 120 false held-out affirmative statements, and their negated twins.
show = np.concatenate([rng.choice(np.where(te & (ya == 1))[0], 120, replace=False),
                       rng.choice(np.where(te & (ya == 0))[0], 120, replace=False)])


def lr(X, y, C=1.0):
    sc = StandardScaler().fit(X)
    m = LogisticRegression(C=C, max_iter=5000).fit(sc.transform(X), y)
    w = m.coef_[0] / sc.scale_                      # the ruler in raw coordinates
    b = m.intercept_[0] - (sc.mean_ / sc.scale_) @ m.coef_[0]
    return w, b


def frame(w, Xfit):
    """A plane that contains the ruler: x = the ruler's unit direction, y = the largest remaining spread."""
    u = w / np.linalg.norm(w)
    R = Xfit - Xfit.mean(0)
    R = R - np.outer(R @ u, u)
    v = np.linalg.svd(R, full_matrices=False)[2][0]
    return u, v, Xfit.mean(0)


def coords(X, u, v, c, w, b):
    """Both axes in the hidden state's own units (projections on orthonormal u, v, centred at c), so a figure drawn with
    equal aspect shows true distances and angles within the plane. The ruler's threshold sits at x = thr(u, c, w, b)."""
    return np.round((X - c) @ u, 3).tolist(), np.round((X - c) @ v, 3).tolist()


def thr(c, w, b):
    """Where w.h + b = 0 along the unit ruler u = w/|w|, in the same centred units as coords()."""
    return round(float(-(w @ c + b) / np.linalg.norm(w)), 3)


def acc(w, b, X, y):
    return round(float((((X @ w + b) > 0).astype(int) == y).mean()), 3)


out = {"meta": {"model": f"Qwen/{MODEL} (base)", "position": "final token of the statement",
                "layers": "hidden_states[l]: l = output of block l-1", "split": "by city, rng(1) halves",
                "statements": "Marks & Tegmark geometry-of-truth (prototype only; to be regenerated)",
                "shown": "240 held-out affirmative statements (120 true, 120 false) and their negated twins"},
       "text": {"aff": [ra[i]["statement"] for i in show], "neg": [rb[i]["statement"] for i in show]},
       "label": {"aff": ya[show].tolist(), "neg": yb[show].tolist()},
       "layers": {}}

for L in [8, 12, 16]:
    Xa, Xb = A[:, L], B[:, L]
    w, b = lr(Xa[tr], ya[tr])
    u, v, c = frame(w, Xa[tr])
    ax, ay = coords(Xa[show], u, v, c, w, b)
    nx, ny = coords(Xb[show], u, v, c, w, b)
    dmu = Xa[tr][ya[tr] == 1].mean(0) - Xa[tr][ya[tr] == 0].mean(0)
    cos = float(u @ (dmu / np.linalg.norm(dmu)))
    # the difference of means drawn in the same plane (for the "second ruler" arrow), from the false mean to the true mean
    mt, mf = Xa[tr][ya[tr] == 1].mean(0), Xa[tr][ya[tr] == 0].mean(0)
    # "fix": a ruler trained on both polarities, in its own plane, with the translation sets
    Xboth = np.concatenate([Xa[tr], Xb[tr]]); yboth = np.concatenate([ya[tr], yb[tr]])
    w2, b2 = lr(Xboth, yboth)
    u2, v2, c2 = frame(w2, Xboth)
    fx_a, fy_a = coords(Xa[show], u2, v2, c2, w2, b2)
    fx_n, fy_n = coords(Xb[show], u2, v2, c2, w2, b2)
    sp_show = rng.choice(len(ys), 120, replace=False)
    sx, sy = coords(S[sp_show, L], u2, v2, c2, w2, b2)
    nsx, nsy = coords(N[sp_show, L], u2, v2, c2, w2, b2)
    # general truth vs polarity (difference-of-means directions of each polarity)
    da, db = dmu, Xb[tr][yb[tr] == 1].mean(0) - Xb[tr][yb[tr] == 0].mean(0)
    tg, tp = (da + db) / 2, (da - db) / 2
    e1 = tg / np.linalg.norm(tg)
    e2 = tp - (tp @ e1) * e1
    e2 /= np.linalg.norm(e2)
    cm = np.concatenate([Xa[tr], Xb[tr]]).mean(0)
    tgtp = {k: np.round((X[show] - cm) @ np.stack([e1, e2], 1), 3).tolist() for k, X in [("aff", Xa), ("neg", Xb)]}
    # a ruler along t_G, threshold halfway between the pooled class means (training data), read on held-out statements
    pool_t = np.concatenate([Xa[tr][ya[tr] == 1], Xb[tr][yb[tr] == 1]]).mean(0)
    pool_f = np.concatenate([Xa[tr][ya[tr] == 0], Xb[tr][yb[tr] == 0]]).mean(0)
    thr_g = ((pool_t + pool_f) / 2) @ e1
    tgtp["acc"] = {k: round(float((((X[te] @ e1) > thr_g).astype(int) == yy[te]).mean()), 3) for k, X, yy in [("aff", Xa, ya), ("neg", Xb, yb)]}
    tgtp["thr"] = round(float(thr_g - cm @ e1), 3)
    e2 = dmu - (dmu @ u) * u
    e2 /= np.linalg.norm(e2)
    rx, ry = coords(Xa[show], u, e2, c, w, b)
    rulers = {"x": rx, "y": ry, "thr": thr(c, w, b),
              "means": {"true": [round(float((mt - c) @ u), 3), round(float((mt - c) @ e2), 3)],
                        "false": [round(float((mf - c) @ u), 3), round(float((mf - c) @ e2), 3)]}}
    out["layers"][str(L)] = {
        "thr": thr(c, w, b), "rulers": rulers,
        "aff": {"x": ax, "y": ay}, "neg": {"x": nx, "y": ny},
        "acc": {"aff_heldout": acc(w, b, Xa[te], ya[te]), "neg": acc(w, b, Xb, yb),
                "dim_aff_heldout": round(float((((Xa[te] - (mt + mf) / 2) @ dmu > 0).astype(int) == ya[te]).mean()), 3),
                "neg_called_false": round(float(((Xb @ w + b) < 0).mean()), 3),
                # ranking, not just accuracy at the tick: AUROC < 0.5 means negations are ranked upside down
                "neg_auroc": round(float(roc_auc_score(yb, Xb @ w + b)), 3),
                "dim_neg_auroc": round(float(roc_auc_score(yb, (Xb - (mt + mf) / 2) @ dmu)), 3),
                "dim_neg_acc": round(float((((Xb - (mt + mf) / 2) @ dmu > 0).astype(int) == yb).mean()), 3),
                # the affirmative-only ruler on the Spanish-word sets (to compare with the ruler trained on both)
                "sp": acc(w, b, S[:, L], ys), "negsp": acc(w, b, N[:, L], yn)},
        "cos_ruler_dmu": round(cos, 3),
        "fix": {"thr": thr(c2, w2, b2), "aff": {"x": fx_a, "y": fy_a}, "neg": {"x": fx_n, "y": fy_n},
                "sp": {"x": sx, "y": sy, "label": ys[sp_show].tolist(), "text": [rs[i]["statement"] for i in sp_show]},
                "negsp": {"x": nsx, "y": nsy, "label": yn[sp_show].tolist()},
                "acc": {"aff_heldout": acc(w2, b2, Xa[te], ya[te]), "neg_heldout": acc(w2, b2, Xb[te], yb[te]),
                        "sp": acc(w2, b2, S[:, L], ys), "negsp": acc(w2, b2, N[:, L], yn)}},
        "tgtp": tgtp,
    }

# Fitting proves nothing (layer 16): 300 training statements, real labels vs coin-flip labels.
L = 16
X = A[:, L]
idx = rng.permutation(len(ya))
trn, tst = idx[:300], idx[300:]
coin = rng.integers(0, 2, len(ya))
fit = {}
for name, lab, C in [("real", ya, 1.0), ("coin", coin, 1e4)]:
    w, b = lr(X[trn], lab[trn], C)
    u, v, c = frame(w, X[trn])
    pick_tr = trn[:200]
    pick_te = rng.choice(tst, 200, replace=False)
    tx, ty = coords(X[pick_tr], u, v, c, w, b)
    hx, hy = coords(X[pick_te], u, v, c, w, b)
    fit[name] = {"thr": thr(c, w, b), "train": {"x": tx, "y": ty, "label": lab[pick_tr].tolist()},
                 "held": {"x": hx, "y": hy, "label": lab[pick_te].tolist()},
                 "acc": {"train": acc(w, b, X[trn], lab[trn]), "held": acc(w, b, X[tst], lab[tst])}, "C": C}
out["fit16"] = fit
out["meta"]["fit16"] = "300 training statements at L16; 200 of them and 200 held-out drawn; C = 1 (real), 1e4 (coin)"

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, separators=(",", ":")))
print(OUT, f"{OUT.stat().st_size / 1e6:.2f} MB")
for L in ["8", "12", "16"]:
    print(L, out["layers"][L]["acc"], out["layers"][L]["fix"]["acc"], out["layers"][L]["cos_ruler_dmu"])
print({k: v["acc"] for k, v in fit.items()})
