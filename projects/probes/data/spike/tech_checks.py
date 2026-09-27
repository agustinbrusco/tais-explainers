"""Checks asked for by the technical review (2026-09-26): ranking (AUROC) of negated statements under both rulers;
best single coordinate; how parallel the true/false pair differences are; the LR-vs-mean angle as a function of C."""
import csv
from pathlib import Path
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import StandardScaler
H = Path(__file__).parent
S = H  # activations and CSVs live next to this script (gitignored)
def load(n):
    d = np.load(S / f"acts_Qwen2.5-1.5B_{n}.npz"); return d["acts"].astype(np.float32), d["labels"]
A, ya = load("cities"); B, yb = load("neg_cities")
rows = list(csv.DictReader(open(S / "data" / "cities.csv")))
cities = sorted({r["city"] for r in rows})
tr_c = set(np.random.default_rng(1).permutation(cities)[: len(cities) // 2])
tr = np.array([r["city"] in tr_c for r in rows]); te = ~tr
print("layer | LR on negated: acc / AUROC | DiM on negated: acc / AUROC | best single coord (held-out aff) | pair-diff cos to dmu (mean)")
for L in [8, 12, 16]:
    Xa, Xb = A[:, L], B[:, L]
    sc = StandardScaler().fit(Xa[tr]); m = LogisticRegression(C=1.0, max_iter=5000).fit(sc.transform(Xa[tr]), ya[tr])
    s_lr = m.decision_function(sc.transform(Xb))
    mt, mf = Xa[tr][ya[tr] == 1].mean(0), Xa[tr][ya[tr] == 0].mean(0); dmu = mt - mf
    s_dm = (Xb - (mt + mf) / 2) @ dmu
    # best single coordinate: pick on training data (sign and threshold), score on held-out
    best = (0, 0)
    for j in range(Xa.shape[1]):
        xtr, xte = Xa[tr, j], Xa[te, j]
        thr = (xtr[ya[tr] == 1].mean() + xtr[ya[tr] == 0].mean()) / 2
        sgn = 1 if xtr[ya[tr] == 1].mean() > xtr[ya[tr] == 0].mean() else -1
        acc = ((sgn * (xte - thr) > 0).astype(int) == ya[te]).mean()
        if acc > best[0]: best = (acc, j)
    # pair differences (true minus false for the same city, training half) vs dmu
    idx_t = [i for i in np.where(tr)[0] if ya[i] == 1]
    by_city = {}
    for i in np.where(tr)[0]: by_city.setdefault(rows[i]["city"], {})[ya[i]] = i
    diffs = np.array([Xa[v[1]] - Xa[v[0]] for v in by_city.values() if 0 in v and 1 in v])
    cosines = diffs @ dmu / np.linalg.norm(diffs, axis=1) / np.linalg.norm(dmu)
    print(f"{L:5d} | {((s_lr > 0) == (yb == 1)).mean():.3f} / {roc_auc_score(yb, s_lr):.3f} | "
          f"{((s_dm > 0) == (yb == 1)).mean():.3f} / {roc_auc_score(yb, s_dm):.3f} | {best[0]:.3f} (dim {best[1]}) | "
          f"{cosines.mean():.2f} (median {np.median(cosines):.2f}, n={len(cosines)})")
print("\nangle between LR (standardized, L2) and dmu at L16, by C:")
X = A[:, 16]; sc = StandardScaler().fit(X[tr]); dmu = X[tr][ya[tr] == 1].mean(0) - X[tr][ya[tr] == 0].mean(0)
for C in [1e-4, 1e-3, 1e-2, 1e-1, 1.0, 10.0]:
    m = LogisticRegression(C=C, max_iter=10000).fit(sc.transform(X[tr]), ya[tr]); w = m.coef_[0] / sc.scale_
    cos = w @ dmu / np.linalg.norm(w) / np.linalg.norm(dmu)
    acc = (m.predict(sc.transform(X[te])) == ya[te]).mean()
    print(f"  C={C:<7g} cos {cos:.3f}  angle {np.degrees(np.arccos(cos)):5.1f}°  held-out acc {acc:.3f}")
