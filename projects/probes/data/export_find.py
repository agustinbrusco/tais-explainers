"""Chapter II's data for "What a Probe Reads" ("Finding the direction"): how many labelled statements a probe needs, and
what contrast pairs give. Writes web/data/find.json. Same pinned protocol and split as export.py (data/common.py).

1. The learning curve: for n labelled statements (half true, half false, drawn from the training cities), the held-out
   accuracy of logistic regression (C = 1) and of the difference of means (midpoint threshold), over 20 random draws,
   at layers 12 and 16.
2. The trainer (layer 16): one nested draw (the first n statements of one random order, alternating true and false), a
   probe fitted at each n, and a basis that contains every one of those directions plus the final probe's, so the page
   can turn the view from one fit to the next as an honest rotation. Held-out statements in that basis; the first 64
   training statements too (the fitted ones, ringed on the page).
3. Contrast pairs: each held-out city's true-minus-false difference, against the training difference of means (cosines
   in all 1,536 dimensions), and the top principal direction of the pair differences found without labels (the
   differences' second moment doesn't depend on which member of a pair is true).

    uv run --group interp --with scikit-learn python projects/probes/data/export_find.py
"""
import json
import numpy as np
from common import load, split, unit, lr, lr_span, acc, top_pc, gram_schmidt, R, WEB

A, ya, ra = load("cities")
tr = split(ra)
te = ~tr
TE = np.where(te)[0]
NS = [2, 4, 8, 16, 32, 64, 128, 256, 512, int(tr.sum())]
DRAWS = 20
out = {"meta": {"curve": f"held-out accuracy (all {int(te.sum())} held-out statements) of probes fitted to n labelled training "
                         f"statements, half true and half false, {DRAWS} random draws per n; logistic regression C = 1; "
                         "difference of means thresholded at the midpoint of its two class means",
                "trainer": "layer 16; one nested draw (the first n of one random order alternating true and false); coords in "
                           "an orthonormal basis containing every fitted direction, centred on the training mean, 3 d.p.",
                "pairs": "each held-out city's h(true) - h(false), against the training difference of means"},
       "curve": {}, "pairs": {}}

pos, neg = np.where(tr & (ya == 1))[0], np.where(tr & (ya == 0))[0]
_X = A[:, 16].astype(np.float64); _I = np.concatenate([pos[:40], neg[:40]])
_w1, _b1 = lr(_X[_I], ya[_I]); _w2, _b2 = lr_span(_X[_I], ya[_I])
assert np.allclose(_w1, _w2, atol=1e-5 * np.abs(_w1).max()) and abs(_b1 - _b2) < 1e-4 * max(1, abs(_b1)), "span fit must equal the full fit"
print("span fit == full fit: max |dw| / max |w| =", float(np.abs(_w1 - _w2).max() / np.abs(_w1).max()))
for L in (12, 16):
    X = A[:, L].astype(np.float64)
    rng = np.random.default_rng(10 + L)
    res = {"n": NS, "lr": [], "dmu": []}
    res["draw_cos"] = []                   # mean cosine between the directions fitted to independent draws of n statements
    res["draw_ang"] = []                   # and the mean angle between them, in degrees
    res["dmu_cos"] = []                    # mean cosine of each fit with its own draw's difference of means
    for n in NS:
        a_lr, a_dm, dirs, own = [], [], [], []
        for d in range(DRAWS if n < len(pos) + len(neg) else 1):
            I = np.concatenate([rng.choice(pos, n // 2, replace=False), rng.choice(neg, n // 2, replace=False)])
            w, b = lr_span(X[I], ya[I]) if n < X.shape[1] else lr(X[I], ya[I])
            dirs.append(unit(w))
            own.append(float(unit(w) @ unit(X[I][ya[I] == 1].mean(0) - X[I][ya[I] == 0].mean(0))))
            a_lr.append(acc(X[te] @ w + b, ya[te]))
            mt, mf = X[I][ya[I] == 1].mean(0), X[I][ya[I] == 0].mean(0)
            a_dm.append(acc((X[te] - (mt + mf) / 2) @ (mt - mf), ya[te]))
        D_ = np.stack(dirs)
        G_ = D_ @ D_.T
        res["draw_cos"].append(round(float(G_[np.triu_indices(len(dirs), 1)].mean()), 3) if len(dirs) > 1 else 1.0)
        res["draw_ang"].append(round(float(np.degrees(np.arccos(np.clip(G_[np.triu_indices(len(dirs), 1)], -1, 1))).mean()), 1) if len(dirs) > 1 else 0.0)
        res["dmu_cos"].append(round(float(np.mean(own)), 3))
        for k, a in (("lr", a_lr), ("dmu", a_dm)):
            a = np.array(a)
            res[k].append({"mean": round(float(a.mean()), 3), "lo": round(float(np.quantile(a, 0.1)), 3),
                           "hi": round(float(np.quantile(a, 0.9)), 3), "min": round(float(a.min()), 3)})
    out["curve"][str(L)] = res
    print(f"L{L} curve  LR:", [(n, r["mean"], r["lo"]) for n, r in zip(NS, res["lr"])])
    print(f"L{L} curve DMU:", [(n, r["mean"], r["lo"]) for n, r in zip(NS, res["dmu"])])

# the trainer, at layer 16
L = 16
X = A[:, L].astype(np.float64)
c = X[tr].mean(0)
rng = np.random.default_rng(7)
op, on = rng.permutation(pos), rng.permutation(neg)
order = np.ravel(np.column_stack([op, on]))                     # true, false, true, false, ...
wf, bf = lr(X[tr], ya[tr])                                      # the final probe (all training statements: the pinned one)
mt, mf = X[tr][ya[tr] == 1].mean(0), X[tr][ya[tr] == 0].mean(0)
dmu = mt - mf
fits = []
for n in NS:
    I = order[:n]
    w, b = (wf, bf) if n == len(order) else lr_span(X[I], ya[I])
    fits.append((n, w, b))
v = top_pc(X[tr], [unit(wf)])
if v @ (X[tr][ya[tr] == 1].mean(0) - c) < 0:
    v = -v
Bm = gram_schmidt([unit(wf), v] + [unit(w) for _, w, _ in fits[:-1]] + [unit(dmu)])
k = Bm.shape[1]
proj = lambda Z: (Z - c) @ Bm
coef = lambda u: Bm.T @ unit(u)
for n, w, _ in fits:
    assert np.linalg.norm(coef(w)) > 0.9999, n
tr_fit = []
for n, w, b in fits:
    nw = float(np.linalg.norm(w))
    tr_fit.append({"n": n, "coef": R(coef(w), 5), "thr": round(float(-(w @ c + b) / nw), 4), "norm": round(nw, 4),
                   "acc": acc(X[te] @ w + b, ya[te]), "train_acc": acc(X[order[:n]] @ w + b, ya[order[:n]]),
                   "cos_final": round(float(unit(w) @ unit(wf)), 3), "cos_dmu": round(float(unit(w) @ unit(dmu)), 3)})
FIT_SHOWN = 64
out["trainer"] = {
    "layer": L, "k": k, "fits": tr_fit,
    "v": R(coef(v), 5), "dmu": R(coef(dmu), 5),
    "held": R(proj(X[te])),                                                   # same order as probes.json's aff set
    "train": {"coords": R(proj(X[order[:FIT_SHOWN]])), "label": ya[order[:FIT_SHOWN]].tolist(),
              "text": [ra[i]["statement"] for i in order[:FIT_SHOWN]]},
}
print("trainer", [(f["n"], f["acc"], f["cos_final"], f["norm"]) for f in tr_fit], "k =", k)

# contrast pairs: rows 2i and 2i+1 are one city's true and false statements
assert all(ya[0::2] == 1) and all(ya[1::2] == 0)
for L in (8, 12, 16):
    X = A[:, L].astype(np.float64)
    dm = X[tr][ya[tr] == 1].mean(0) - X[tr][ya[tr] == 0].mean(0)
    hi = [i for i in range(0, len(ya), 2) if te[i]]
    D = np.stack([X[i] - X[i + 1] for i in hi])
    cs = D @ unit(dm) / np.linalg.norm(D, axis=1)
    # without labels: the top eigenvector of the training pairs' differences' second moment (sign-free)
    ti = [i for i in range(0, len(ya), 2) if tr[i]]
    Dt = np.stack([X[i] - X[i + 1] for i in ti])
    u = np.linalg.svd(Dt, full_matrices=False)[2][0]
    if u @ dm < 0:           # the one thing a label decides: which end is "true"
        u = -u
    s = (X[te] - np.median(X[tr], 0)) @ u
    thr = np.median((X[tr] - np.median(X[tr], 0)) @ u)      # set on the training statements (balanced classes)
    out["pairs"][str(L)] = {
        "n": len(hi), "cos_mean": round(float(cs.mean()), 3), "cos_median": round(float(np.median(cs)), 3),
        "frac_pos": round(float((cs > 0).mean()), 3), "hist": np.histogram(cs, bins=np.linspace(-0.2, 1, 25))[0].tolist(),
        "random_sd": round(float(1 / np.sqrt(X.shape[1])), 4),
        "cos_mean_diff_dmu": round(float(unit(D.mean(0)) @ unit(dm)), 3),
        "pca_cos_dmu": round(float(u @ unit(dm)), 3), "pca_acc": acc(s - thr, ya[te]),
        # one labelled pair fixes the sign: how often a training pair picked at random fixes it the right way
        "pca_sign": round(float((Dt @ u > 0).mean()), 3),
    }
    print(f"L{L} pairs", out["pairs"][str(L)])

# why linear: each block normalizes before it reads (RMSNorm). How much that matters for the states a probe reads here:
# the spread of their lengths at one position and layer, and a probe trained on normalized states (h / rms(h))
out["norm"] = {}
for L in (12, 16):
    X = A[:, L].astype(np.float64)
    nrm = np.linalg.norm(X, axis=1)
    Xn = X / (nrm / np.sqrt(X.shape[1]))[:, None]
    w, b = lr(X[tr], ya[tr])
    wn, bn = lr(Xn[tr], ya[tr])
    out["norm"][str(L)] = {"len_mean": round(float(nrm[te].mean()), 1), "len_cv": round(float(nrm[te].std() / nrm[te].mean()), 3),
                           "len_min": round(float(nrm[te].min()), 1), "len_max": round(float(nrm[te].max()), 1),
                           "acc_raw": acc(X[te] @ w + b, ya[te]), "acc_normed": acc(Xn[te] @ wn + bn, ya[te]),
                           "cos_raw_normed": round(float(unit(w) @ unit(wn)), 4)}
    print(f"L{L} norm", out["norm"][str(L)])

# which layer: the mean length of the period's state at every layer (held-out statements). hidden_states[28] is taken
# after the model's final normalization, so the last frame is shorter than the one before it
out["lengths"] = R(np.linalg.norm(A[te].astype(np.float32), axis=2).mean(0), 1)
print("lengths", out["lengths"])

# question 3, activations or text: classifiers that see only the statement's characters (TF-IDF of character 2-4-grams),
# trained on the training cities and tested on the held-out ones. A linear one can't combine "city spelling" with
# "country" (the label is their match); a small MLP can learn city-country spelling associations if the spelling leaks.
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neural_network import MLPClassifier
from sklearn.linear_model import LogisticRegression as _LR
texts = np.array([r["statement"] for r in ra])
vec = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), min_df=2).fit(texts[tr])
Ttr, Tte = vec.transform(texts[tr]), vec.transform(texts[te])
lin = _LR(C=1.0, max_iter=5000).fit(Ttr, ya[tr])
mlp_accs = []
for seed in range(3):
    m = MLPClassifier(hidden_layer_sizes=(256,), alpha=1e-4, max_iter=300, random_state=seed).fit(Ttr, ya[tr])
    mlp_accs.append(float((m.predict(Tte) == ya[te]).mean()))
out["text_baseline"] = {"char_lr": round(float((lin.predict(Tte) == ya[te]).mean()), 3),
                        "char_mlp": round(float(np.mean(mlp_accs)), 3), "char_mlp_runs": [round(a, 3) for a in mlp_accs],
                        "features": "TF-IDF of character 2-4-grams (within words), fitted on the training cities"}
print("text baseline", out["text_baseline"])

# how salient truth is: the training states' principal components, and which one lies along the difference of means
out["pca"] = {}
for L in (12, 16):
    X = A[:, L].astype(np.float64)
    Xc = X[tr] - X[tr].mean(0)
    _, S, Vt = np.linalg.svd(Xc, full_matrices=False)
    var = S ** 2 / (S ** 2).sum()
    dm = X[tr][ya[tr] == 1].mean(0) - X[tr][ya[tr] == 0].mean(0)
    cs = np.abs(Vt[:10] @ unit(dm))
    j = int(np.argmax(cs))
    out["pca"][str(L)] = {"pc_along_dmu": j + 1, "cos": round(float(cs[j]), 3), "var_share": round(float(var[j]), 3),
                          "top_var": R(var[:5], 3)}
    print(f"L{L} pca", out["pca"][str(L)])

WEB.mkdir(parents=True, exist_ok=True)
(WEB / "find.json").write_text(json.dumps(out, separators=(",", ":")))
print(WEB / "find.json", f"{(WEB / 'find.json').stat().st_size / 1e3:.0f} KB")
