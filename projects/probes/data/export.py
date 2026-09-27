"""Export the real data for "What a Probe Reads" (web/): hidden states, probe directions and every number the page shows.

Reads the activations of our statements (data/statements.py builds them, data/extract.py runs Qwen2.5-1.5B base on
them) and writes web/data/probes.json, which the page loads and the repo ships.

Protocol (pinned):
- Split by city: each city's statements (true, false and their negations) sit on one side; rng(1) halves.
- Logistic regression on raw hidden states, centred on the training mean, with no per-coordinate standardization,
  solved exactly (Newton-Cholesky).
  The L2 penalty is then rotation-invariant, so the regularization path runs from the difference of means (strong L2)
  to the max-margin direction (no L2; the training set is separable since n < d). C = 1 unless stated.
- Difference of means: threshold at the midpoint of the two class means (training statements).
- Negated and translated statements are evaluated on held-out cities only, like the affirmative ones.

Geometry: for each layer, a small orthonormal basis B (d x k) that contains every direction the page names (the probe,
the difference of means, the retrained probe, their planes' second axes, and at layer 12 the whole regularization path),
so each statement is stored as k numbers, the browser computes *exact* projections onto any of those directions, and a
rotation between two views is itself an honest orthogonal projection.

    uv run --group interp --with scikit-learn python projects/probes/data/export.py projects/probes/data/run
"""
import csv, json, sys
from pathlib import Path
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

SRC = Path(sys.argv[1])
OUT = Path(__file__).resolve().parents[1] / "web" / "data" / "probes.json"
MODEL = "Qwen2.5-1.5B"
LAYERS = [8, 12, 16]
PATH_LAYER = 12                 # the layer whose regularization path goes into the basis (the slider in step 3)
C_DEFAULT = 1.0
C_PATH = [1e-6, 1e-4, 1e-3, 3e-3, 1e-2, 3e-2, 1e-1, 3e-1, 1, 3, 10, 30, 100]
N_SHOW = 120                    # a lighter subset for phones and the hero: true and false held-out statements each
R = lambda a, n=3: np.round(np.asarray(a, dtype=float), n).tolist()


def load(name):
    d = np.load(SRC / f"acts_{MODEL}_{name}.npz")
    rows = list(csv.DictReader(open(SRC / "data" / f"{name}.csv")))
    return d["acts"], d["labels"].astype(int), rows


A, ya, ra = load("cities")
B, yb, rb = load("neg_cities")
S, ys, rs = load("sp_en_trans")
N, yn, rn = load("neg_sp_en_trans")
assert all(a["city"] == b["city"] and a["country"] == b["country"] for a, b in zip(ra, rb))  # row i's twin is row i

cities = sorted({r["city"] for r in ra})
train_c = set(np.random.default_rng(1).permutation(cities)[: len(cities) // 2])
tr = np.array([r["city"] in train_c for r in ra])
te = ~tr
TE = np.where(te)[0]                                   # held-out rows; every exported list of cities follows this order
K0 = 0  # the running example, "The city of Krasnodar is in Russia." (row 0); its false twin is row 1
assert ra[K0]["city"] == "Krasnodar" and ya[K0] == 1 and ra[K0 + 1]["city"] == "Krasnodar" and ya[K0 + 1] == 0
assert te[K0], "the running example must be a held-out city"
k_true, k_false = int(np.where(TE == K0)[0][0]), int(np.where(TE == K0 + 1)[0][0])

rng = np.random.default_rng(0)
te_true, te_false = np.where(ya[TE] == 1)[0], np.where(ya[TE] == 0)[0]      # positions within TE
pick = lambda pool, keep: np.concatenate([[keep], rng.choice(pool[pool != keep], N_SHOW - 1, replace=False)])
show = np.concatenate([pick(te_true, k_true), pick(te_false, k_false)]).tolist()


def unit(v):
    return v / np.linalg.norm(v)


def lr(X, y, C=C_DEFAULT, centre=None):
    """Logistic regression on raw states; returns (w, b) in raw coordinates."""
    c = X.mean(0) if centre is None else centre
    m = LogisticRegression(C=C, solver="newton-cholesky", max_iter=1000, tol=1e-8).fit(X - c, y)
    return m.coef_[0], float(m.intercept_[0] - c @ m.coef_[0])


def acc(s, y):
    return round(float(((s > 0).astype(int) == y).mean()), 3)


def auroc(s, y):
    return round(float(roc_auc_score(y, s)), 3)


def top_pc(X, remove):
    """Top principal direction of X after projecting out the unit vectors in `remove` (largest remaining spread)."""
    R_ = X - X.mean(0)
    for u in remove:
        R_ = R_ - np.outer(R_ @ u, u)
    return np.linalg.svd(R_, full_matrices=False)[2][0]


def gram_schmidt(vs, tol=1e-4):
    out = []
    for v in vs:
        for u in out:
            v = v - (v @ u) * u
        if np.linalg.norm(v) > tol:
            out.append(unit(v))
    return np.stack(out, 1)   # d x k


out = {
    "meta": {
        "model": f"Qwen/{MODEL} (base)", "position": "final token of the statement (the period)",
        "layers": "hidden_states[l]: l = output of block l-1 (0 = embeddings)",
        "split": "by city, rng(1) halves; negations and translations evaluated on held-out cities",
        "protocol": "logistic regression on raw hidden states centred on the training mean, no standardization, "
                    f"L2, C = {C_DEFAULT} unless stated; difference of means thresholded at the midpoint of the class means",
        "statements": "ours (data/statements.py): Marks & Tegmark's cities construction rebuilt from GeoNames (CC BY 4.0), "
                      "and our own Spanish-English word list, each word once true and once false",
        "sets": "aff / neg: every held-out city statement and its negated twin (same order); sp / negsp: all Spanish-English "
                "statements and their negations",
        "coords": "per layer, coordinates in an orthonormal basis (B^T (h - c), c = mean of the training affirmatives), 3 d.p.; "
                  "each probe is a unit direction in that basis (coef), a threshold along it (thr), and |w| (norm) for LR",
        "n": {"train_aff": int(tr.sum()), "test_aff": int(te.sum()), "test_neg": int(te.sum()), "sp": len(ys), "negsp": len(yn),
              "cities": len(cities), "countries": len({r["correct_country"] for r in ra})},
    },
    "text": {"aff": [ra[i]["statement"] for i in TE], "neg": [rb[i]["statement"] for i in TE],
             "sp": [r["statement"] for r in rs], "negsp": [r["statement"] for r in rn]},
    "label": {"aff": ya[TE].tolist(), "neg": yb[TE].tolist(), "sp": ys.tolist(), "negsp": yn.tolist()},
    "country": {"named": [ra[i]["country"] for i in TE], "correct": [ra[i]["correct_country"] for i in TE]},
    "show": show,                                   # positions within aff/neg (a lighter subset)
    "krasnodar": {"true": k_true, "false": k_false},
    "layers": {},
}

for L in LAYERS:
    Xa, Xb, Xs, Xn = (Z[:, L].astype(np.float64) for Z in (A, B, S, N))
    c = Xa[tr].mean(0)
    # the probes
    w, b = lr(Xa[tr], ya[tr])
    mt, mf = Xa[tr][ya[tr] == 1].mean(0), Xa[tr][ya[tr] == 0].mean(0)
    dmu = mt - mf
    Xboth, yboth = np.concatenate([Xa[tr], Xb[tr]]), np.concatenate([ya[tr], yb[tr]])
    w2, b2 = lr(Xboth, yboth, centre=c)
    nt, nf = Xb[tr][yb[tr] == 1].mean(0), Xb[tr][yb[tr] == 0].mean(0)
    dmu_neg = nt - nf
    tG, tP = (dmu + dmu_neg) / 2, (dmu - dmu_neg) / 2
    pool_mid = (np.concatenate([Xa[tr][ya[tr] == 1], Xb[tr][yb[tr] == 1]]).mean(0)
                + np.concatenate([Xa[tr][ya[tr] == 0], Xb[tr][yb[tr] == 0]]).mean(0)) / 2
    path = [(C, *lr(Xa[tr], ya[tr], C=C)) for C in C_PATH]
    # second axes of the planes the page draws: the largest remaining spread beside each probe
    v_aff = top_pc(Xa[tr], [unit(w)])
    # an SVD direction's sign is arbitrary: point it so that statements about Chinese cities sit up (the page says so)
    china = np.array([ra[i]["correct_country"] == "China" for i in range(len(ra))])
    if ((Xa[tr & china] - c) @ v_aff).mean() < ((Xa[tr & ~china] - c) @ v_aff).mean():
        v_aff = -v_aff
    v_both = top_pc(Xboth, [unit(w2)])
    vecs = [unit(w), v_aff, unit(dmu), unit(w2), v_both, unit(dmu_neg)]
    if L == PATH_LAYER:
        vecs += [unit(wc) for _, wc, _ in path]
    Bm = gram_schmidt(vecs)
    k = Bm.shape[1]
    proj = lambda X: (X - c) @ Bm                                  # coordinates in the basis
    coef = lambda v: Bm.T @ unit(v)                                # a direction as k numbers
    inbasis = lambda v: float(np.linalg.norm(Bm.T @ unit(v)))      # 1.0 when v lies in span(B)
    named = [("w", w), ("dmu", dmu), ("w2", w2), ("dmu_neg", dmu_neg), ("tG", tG), ("tP", tP), ("v", v_aff)]
    named += [(f"path{C:g}", wc) for C, wc, _ in path] if L == PATH_LAYER else []
    for name, v in named:
        assert inbasis(v) > 0.9999, (L, name, inbasis(v))

    def probe(v, thr_point=None, bias=None):
        """A unit direction, the threshold along it (same centred units as the coordinates), and |w| for LR probes."""
        u = unit(v)
        thr = float(-(v @ c + bias) / np.linalg.norm(v)) if bias is not None else float((thr_point - c) @ u)
        d = {"coef": R(coef(v), 5), "thr": round(thr, 4)}
        if bias is not None:
            d["norm"] = round(float(np.linalg.norm(v)), 4)
        return d

    s_aff = lambda v, bb: Xa[te] @ v + bb
    s_neg = lambda v, bb: Xb[te] @ v + bb
    mid = (mt + mf) / 2
    dm_s = lambda X: (X - mid) @ dmu
    cosd = lambda a_, b_: round(float(unit(a_) @ unit(b_)), 3)
    regpath = []
    for C, wc, bc in path:
        e = {"C": C, "cos_dmu": cosd(wc, dmu), "cos_w": cosd(wc, w), "norm": round(float(np.linalg.norm(wc)), 4),
             "thr": round(float(-(wc @ c + bc) / np.linalg.norm(wc)), 4),
             "aff": acc(s_aff(wc, bc), ya[te]), "neg": acc(s_neg(wc, bc), yb[te]), "neg_auroc": auroc(s_neg(wc, bc), yb[te])}
        if L == PATH_LAYER:
            e["coef"] = R(coef(wc), 5)
        regpath.append(e)
    # the flip, pair by pair: how many negated twins land on the same side of the threshold as their affirmative
    sa_all, sb_all = s_aff(w, b), s_neg(w, b)
    kr = {"aff": round(float(Xa[K0] @ w + b), 3), "neg": round(float(Xb[K0] @ w + b), 3),
          "aff_false": round(float(Xa[K0 + 1] @ w + b), 3), "neg_false": round(float(Xb[K0 + 1] @ w + b), 3)}

    out["layers"][str(L)] = {
        "k": k,
        "coords": {"aff": R(proj(Xa[te])), "neg": R(proj(Xb[te])), "sp": R(proj(Xs)), "negsp": R(proj(Xn))},
        "probes": {
            "w": probe(w, bias=b), "dmu": probe(dmu, thr_point=mid), "w2": probe(w2, bias=b2),
            "dmu_neg": probe(dmu_neg, thr_point=(nt + nf) / 2), "tG": probe(tG, thr_point=pool_mid), "tP": probe(tP, thr_point=pool_mid),
            "v": {"coef": R(coef(v_aff), 5)}, "v2": {"coef": R(coef(v_both), 5)},
        },
        "means": {k_: R(coef(v) * np.linalg.norm(v), 4) for k_, v in
                  [("aff_true", mt - c), ("aff_false", mf - c), ("neg_true", nt - c), ("neg_false", nf - c)]},
        "regpath": regpath,
        "acc": {
            "w": {"aff": acc(sa_all, ya[te]), "aff_auroc": auroc(sa_all, ya[te]),
                  "neg": acc(sb_all, yb[te]), "neg_auroc": auroc(sb_all, yb[te]),
                  "neg_called_false": round(float((sb_all < 0).mean()), 3),
                  "same_side": round(float(((sa_all > 0) == (sb_all > 0)).mean()), 3),
                  "sp": acc(Xs @ w + b, ys), "negsp": acc(Xn @ w + b, yn),
                  "sp_auroc": auroc(Xs @ w + b, ys), "negsp_auroc": auroc(Xn @ w + b, yn)},
            "dmu": {"aff": acc(dm_s(Xa[te]), ya[te]), "neg": acc(dm_s(Xb[te]), yb[te]), "neg_auroc": auroc(dm_s(Xb[te]), yb[te]),
                    "neg_called_false": round(float((dm_s(Xb[te]) < 0).mean()), 3),
                    "sp": acc(dm_s(Xs), ys), "negsp": acc(dm_s(Xn), yn)},
            "w2": {"aff": acc(s_aff(w2, b2), ya[te]), "neg": acc(s_neg(w2, b2), yb[te]),
                   "sp": acc(Xs @ w2 + b2, ys), "negsp": acc(Xn @ w2 + b2, yn),
                   "sp_auroc": auroc(Xs @ w2 + b2, ys), "negsp_auroc": auroc(Xn @ w2 + b2, yn)},
            "tG": {"aff": acc((Xa[te] - pool_mid) @ tG, ya[te]), "neg": acc((Xb[te] - pool_mid) @ tG, yb[te]),
                   "sp": acc((Xs - pool_mid) @ tG, ys), "negsp": acc((Xn - pool_mid) @ tG, yn)},
            "tP": {"aff": acc((Xa[te] - pool_mid) @ tP, ya[te]), "neg": acc((Xb[te] - pool_mid) @ tP, yb[te])},
        },
        "cos": {"w_dmu": cosd(w, dmu), "dmu_dmuneg": cosd(dmu, dmu_neg), "w_tG": cosd(w, tG), "w_tP": cosd(w, tP),
                "w2_tG": cosd(w2, tG), "w2_tP": cosd(w2, tP), "w_w2": cosd(w, w2), "tG_tP": cosd(tG, tP)},
        "norm": {"dmu": round(float(np.linalg.norm(dmu)), 3), "tG": round(float(np.linalg.norm(tG)), 3),
                 "tP": round(float(np.linalg.norm(tP)), 3), "h_centred_mean": round(float(np.linalg.norm(Xa[te] - c, axis=1).mean()), 3)},
        "krasnodar": kr,
    }
    # what the second axis of Fig. 1's plane separates: mean height by (city in China, named country China)
    hv = (Xa[te] - c) @ v_aff
    cc = np.array([ra[i]["correct_country"] == "China" for i in TE]); nm = np.array([ra[i]["country"] == "China" for i in TE])
    out["layers"][str(L)]["height_china"] = {
        f"city{int(a_)}_named{int(b_)}": round(float(hv[(cc == a_) & (nm == b_)].mean()), 2) for a_ in (0, 1) for b_ in (0, 1)}
    out["layers"][str(L)]["height_china"]["corr_city"] = round(float(np.corrcoef(hv, cc)[0, 1]), 2)

# Fitting proves nothing (layer 16): 300 training statements (from the training cities) with true labels or coin-flip
# labels, the same recipe for both: almost no regularization (C = 1e4), where the fit is the max-margin separator and
# Cover's count applies; evaluated on the held-out cities.
L = 16
X = A[:, L].astype(np.float64)
trn = rng.choice(np.where(tr)[0], 300, replace=False)
tst = np.where(te)[0]
coin = rng.integers(0, 2, len(ya))
fit = {}
for name, lab in [("real", ya), ("coin", coin)]:
    w, b = lr(X[trn], lab[trn], C=1e4)
    c = X[trn].mean(0)
    u = unit(w)
    v = top_pc(X[trn], [u])
    pick_tr, pick_te = trn, tst          # every training statement and every held-out one (the paper's histograms)
    xy = lambda I: (R((X[I] - c) @ u), R((X[I] - c) @ v))
    (tx, ty), (hx, hy) = xy(pick_tr), xy(pick_te)
    s_tr, s_te = X[trn] @ w + b, X[tst] @ w + b
    nw = float(np.linalg.norm(w))
    fit[name] = {"thr": round(float(-(w @ c + b) / nw), 4), "norm": round(nw, 3), "C": 1e4,
                 "train": {"x": tx, "y": ty, "label": lab[pick_tr].tolist(), "text": [ra[i]["statement"] for i in pick_tr]},
                 "held": {"x": hx, "y": hy, "label": lab[pick_te].tolist(), "text": [ra[i]["statement"] for i in pick_te]},
                 "acc": {"train": acc(s_tr, lab[trn]), "held": acc(s_te, lab[tst]), "held_auroc": auroc(s_te, lab[tst])},
                 # how far statements sit from the boundary, in hidden-state units: the margin of the training fit and the
                 # median distance of held-out statements; and the median size of held-out scores (confidence, in logits)
                 "margin": round(float(((2 * lab[trn] - 1) * s_tr).min() / nw), 3),
                 "held_dist_median": round(float(np.median(np.abs(s_te)) / nw), 3),
                 "held_score_median": round(float(np.median(np.abs(s_te))), 2)}
out["fit16"] = fit
out["meta"]["fit16"] = ("layer 16; 300 training statements drawn from the training cities, with true or coin-flip labels, "
                        "C = 1e4 for both; all of them and all held-out statements drawn; accuracy on all held-out cities")

# From a statement to a data point, and which token to read. Every token's state of the affirmative cities at layers 8,
# 12 and 16 (data/extract.py): the running example's tokens, its real state h at the period, a crop of the training
# matrix X, the per-token scores of the period-trained probe, and held-out accuracy for probes that read elsewhere:
# the mean over tokens, every token (the statement's label copied to each, scores pooled by mean or max), the country's
# last token, and "in" (the last token before the country, where a true statement and its false twin are still the same
# input, so their states are identical).
tf = SRC / f"tokens_{MODEL}_cities.npz"
if tf.exists():
    from transformers import AutoTokenizer
    T = np.load(tf)
    st, ids, off, TL = T["states"], T["ids"], T["offsets"], [int(l) for l in T["layers"]]
    tokz = AutoTokenizer.from_pretrained(f"Qwen/{MODEL}")
    span = lambda i: (int(off[i]), int(off[i + 1]))
    in_id = tokz(" in")["input_ids"][-1]
    pos_in = np.array([span(i)[0] + int(np.where(ids[slice(*span(i))] == in_id)[0][-1]) for i in range(len(ya))])
    pipe = {"layer": 12, "layers": TL, "n_train": int(tr.sum()), "n_test": int(te.sum()),
            "tokens": {k: [tokz.decode([int(t)]) for t in ids[slice(*span(r))]] for k, r in (("true", K0), ("false", K0 + 1))},
            "acc": {}, "scores": {}}
    for L in TL:
        j = TL.index(L)
        X = A[:, L].astype(np.float64)
        assert np.allclose(st[off[1:] - 1, j].astype(np.float64), X, atol=2e-2), "token states must end in the period's"
        w, b = lr(X[tr], ya[tr])                                          # the pinned probe (the period, C = 1)
        pooled = np.stack([st[slice(*span(i)), j].astype(np.float64).mean(0) for i in range(len(ya))])
        wm, bm = lr(pooled[tr], ya[tr])
        rows = np.concatenate([np.arange(*span(i)) for i in np.where(tr)[0]])
        lab = np.concatenate([[ya[i]] * (span(i)[1] - span(i)[0]) for i in np.where(tr)[0]])
        we, be = lr(st[rows, j].astype(np.float64), lab)
        per = [st[slice(*span(i)), j].astype(np.float64) @ we + be for i in range(len(ya))]
        country = st[off[1:] - 2, j].astype(np.float64)
        wc, bc = lr(country[tr], ya[tr])
        at_in = st[pos_in, j].astype(np.float64)
        wi, bi = lr(at_in[tr], ya[tr])
        # pooled scores need their own threshold: set it on the training statements (the one that reads them best)
        def own_threshold(v):
            cand = np.unique(v[tr])
            best = max(cand, key=lambda t: ((v[tr] > t) == ya[tr]).mean())
            return float(best), acc(v[te] - best, ya[te])
        mx, mn = np.array([p.max() for p in per]), np.array([p.mean() for p in per])
        thr_max, acc_max_own = own_threshold(mx)
        pipe["acc"][str(L)] = {
            "final": acc(X[te] @ w + b, ya[te]), "mean": acc(pooled[te] @ wm + bm, ya[te]),
            "every_mean": acc(np.array([p.mean() for p in per])[te], ya[te]),
            "every_max": acc(np.array([p.max() for p in per])[te], ya[te]),
            "every_last": acc(np.array([p[-1] for p in per])[te], ya[te]),
            "every_max_own": acc_max_own, "every_max_thr": round(thr_max, 2),
            "max_below_zero_false": round(float((mx[te & (ya == 0)] <= 0).mean()), 3),
            "country": acc(country[te] @ wc + bc, ya[te]), "at_in": acc(at_in[te] @ wi + bi, ya[te]),
            # the same input, so the same state: equal up to float16 storage (a batch's arithmetic can differ in the last bit)
            "at_in_identical": bool(np.allclose(st[pos_in[0::2], j].astype(np.float32), st[pos_in[1::2], j].astype(np.float32), atol=0.01)),
        }
        pipe["scores"][str(L)] = {
            k: {"final": R(st[slice(*span(r)), j].astype(np.float64) @ w + b, 2), "every": R(per[r], 2)}
            for k, r in (("true", K0), ("false", K0 + 1))}
        if L == pipe["layer"]:
            hk = {k: X[r] for k, r in (("true", K0), ("false", K0 + 1))}
            pipe["h"] = {k: R(v, 2) for k, v in hk.items()}
            pipe["hscale"] = round(float(np.quantile(np.abs(X[tr]), 0.98)), 2)
            pick_rows = np.where(tr)[0][:64]
            pipe["table"] = {"x": [R(X[i][::12], 2) for i in pick_rows], "y": ya[pick_rows].tolist(),
                             "stride": 12, "text": [ra[i]["statement"] for i in pick_rows]}
    out["pipeline"] = pipe
    print("pipeline", json.dumps(pipe["acc"]), pipe["tokens"])

# The country-name baseline: a classifier that sees only which country a statement names (one-hot), trained on the
# training cities and tested on the held-out ones. The false country is drawn by frequency, so this should be chance.
names = sorted({r["country"] for r in ra})
onehot = np.array([[r["country"] == n for n in names] for r in ra], dtype=float)
mc = LogisticRegression(C=1.0, max_iter=5000).fit(onehot[tr], ya[tr])
out["meta"]["country_baseline"] = acc(mc.decision_function(onehot[te]), ya[te])
print("country-name baseline", out["meta"]["country_baseline"])

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, separators=(",", ":")))
print(OUT, f"{OUT.stat().st_size / 1e6:.2f} MB")
for L in map(str, LAYERS):
    d = out["layers"][L]
    print(f"L{L} k={d['k']}", json.dumps(d["acc"]), json.dumps(d["cos"]), json.dumps(d["norm"]), json.dumps(d["krasnodar"]))
    print("   regpath", [(p["C"], p["cos_dmu"], p["aff"], p["neg"], p["neg_auroc"]) for p in d["regpath"]])
print({k: {**v["acc"], "norm": v["norm"], "margin": v["margin"], "held_dist_median": v["held_dist_median"],
           "held_score_median": v["held_score_median"]} for k, v in fit.items()})
