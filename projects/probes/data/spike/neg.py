"""Negation check: train on affirmative city statements, test on negated ones (and the reverse, and both)."""
from pathlib import Path
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
H = Path(__file__).parent
def load(n):
    d = np.load(H / f"acts_Qwen2.5-1.5B_{n}.npz"); return d["acts"].astype(np.float32), d["labels"]
A, ya = load("cities"); B, yb = load("neg_cities")
def fit(X, y):
    sc = StandardScaler().fit(X); return sc, LogisticRegression(C=1.0, max_iter=3000).fit(sc.transform(X), y)
def acc(m, X, y): return (m[1].predict(m[0].transform(X)) == y).mean()
def dim(X, y):
    mu1, mu0 = X[y==1].mean(0), X[y==0].mean(0); d = mu1-mu0; return d, ((mu1+mu0)/2) @ d
def dacc(m, X, y): return (((X @ m[0]) > m[1]).astype(int) == y).mean()
half = np.arange(len(ya)) % 4 < 2   # rows come in (true, false) pairs per city; keep pairs together
print("layer | aff->aff(heldout) | aff->neg LR / DiM | neg->aff LR | both->heldout aff / neg | cos(dmu_aff, dmu_neg)")
for l in [8, 10, 12, 14, 16, 18, 20, 24]:
    Xa, Xb = A[:, l], B[:, l]
    ma = fit(Xa[half], ya[half]); da = dim(Xa[half], ya[half])
    mb = fit(Xb[half], yb[half])
    mboth = fit(np.concatenate([Xa[half], Xb[half]]), np.concatenate([ya[half], yb[half]]))
    ca = Xa[ya==1].mean(0)-Xa[ya==0].mean(0); cb = Xb[yb==1].mean(0)-Xb[yb==0].mean(0)
    cos = ca @ cb / np.linalg.norm(ca) / np.linalg.norm(cb)
    print(f"{l:5d} | {acc(ma, Xa[~half], ya[~half]):.3f} | {acc(ma, Xb[~half], yb[~half]):.3f} / {dacc(da, Xb[~half], yb[~half]):.3f} | "
          f"{acc(mb, Xa[~half], ya[~half]):.3f} | {acc(mboth, Xa[~half], ya[~half]):.3f} / {acc(mboth, Xb[~half], yb[~half]):.3f} | {cos:+.2f}")
