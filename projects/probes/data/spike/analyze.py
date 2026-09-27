"""Feasibility spike: do truth probes work on Qwen2.5-1.5B, and do the planned demos (Cover, negation, steering
directions) show what the plan needs? Scratch only; nothing here is a claim yet."""
import csv, sys
from pathlib import Path
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

HERE = Path(__file__).parent
tag = sys.argv[1] if len(sys.argv) > 1 else "Qwen2.5-1.5B"
rng = np.random.default_rng(0)


def load(name):
    d = np.load(HERE / f"acts_{tag}_{name}.npz")
    return d["acts"].astype(np.float32), d["labels"]


def city_split(name, frac=0.5):
    rows = list(csv.DictReader(open(HERE / "data" / f"{name}.csv")))
    cities = sorted({r["city"] for r in rows})
    rng2 = np.random.default_rng(1)
    train_c = set(rng2.permutation(cities)[: int(len(cities) * frac)])
    tr = np.array([r["city"] in train_c for r in rows])
    return tr, ~tr


def lr_fit(X, y, C=1.0):
    sc = StandardScaler().fit(X)
    clf = LogisticRegression(C=C, max_iter=3000).fit(sc.transform(X), y)
    return sc, clf


def lr_acc(model, X, y):
    sc, clf = model
    return (clf.predict(sc.transform(X)) == y).mean()


def dim_fit(X, y):
    mu1, mu0 = X[y == 1].mean(0), X[y == 0].mean(0)
    d = mu1 - mu0
    thr = ((mu1 + mu0) / 2) @ d
    return d, thr


def dim_acc(model, X, y):
    d, thr = model
    return ((X @ d > thr).astype(int) == y).mean()


A, y = load("cities")
tr, te = city_split("cities")
L = A.shape[1]
print(f"cities: {A.shape}, train {tr.sum()}, test {te.sum()}")
print("layer  LR_test  DiM_test  cos(w_LR, dmu)")
best = (0, -1)
for l in range(0, L, 2):
    X = A[:, l]
    m = lr_fit(X[tr], y[tr])
    dm = dim_fit(X[tr], y[tr])
    acc_lr, acc_dm = lr_acc(m, X[te], y[te]), dim_acc(dm, X[te], y[te])
    w = m[1].coef_[0] / m[0].scale_  # weight in raw coordinates
    cos = w @ dm[0] / np.linalg.norm(w) / np.linalg.norm(dm[0])
    print(f"{l:5d}  {acc_lr:.3f}    {acc_dm:.3f}     {cos:+.2f}")
    if acc_lr > best[1]:
        best = (l, acc_lr)
lb = best[0]
print(f"best layer {lb}")

# Cover: random labels, n_train=300 < d
X = A[:, lb]
yr = rng.integers(0, 2, len(y))
idx = rng.permutation(len(y))
trn, tst = idx[:300], idx[300:]
m = lr_fit(X[trn], yr[trn], C=1e4)
print(f"random labels, n=300, d={X.shape[1]}: train {lr_acc(m, X[trn], yr[trn]):.3f}, test {lr_acc(m, X[tst], yr[tst]):.3f}")
m = lr_fit(X[trn], y[trn], C=1.0)
print(f"real labels, n=300: train {lr_acc(m, X[trn], y[trn]):.3f}, test {lr_acc(m, X[tst], y[tst]):.3f}")

# Random 2D projection vs probe axis: how separable does each view look?
Q, _ = np.linalg.qr(rng.standard_normal((X.shape[1], 2)))
P = (X - X.mean(0)) @ Q
m2 = LogisticRegression(max_iter=2000).fit(P[tr], y[tr])
print(f"random 2D view, best line in that view: test {(m2.predict(P[te]) == y[te]).mean():.3f}")
Xc = X - X.mean(0)
U, S, Vt = np.linalg.svd(Xc[tr], full_matrices=False)
P = Xc @ Vt[:2].T
m2 = LogisticRegression(max_iter=2000).fit(P[tr], y[tr])
print(f"top-2 PCA view: test {(m2.predict(P[te]) == y[te]).mean():.3f}")

# Generalization: train on cities, test elsewhere; train on cities+neg_cities
others = [n for n in ["neg_cities", "sp_en_trans", "neg_sp_en_trans", "larger_than", "smaller_than", "companies_true_false"]
          if (HERE / f"acts_{tag}_{n}.npz").exists()]
for l in sorted({lb, max(0, lb - 4), min(L - 1, lb + 4)}):
    m = lr_fit(A[:, l], y)
    dm = dim_fit(A[:, l], y)
    row = []
    for n in others:
        B, yb = load(n)
        row.append(f"{n}: LR {lr_acc(m, B[:, l], yb):.2f} / DiM {dim_acc(dm, B[:, l], yb):.2f}")
    print(f"L{l} train=cities -> " + " | ".join(row))
if "neg_cities" in others:
    B, yb = load("neg_cities")
    for l in [lb]:
        m = lr_fit(np.concatenate([A[:, l], B[:, l]]), np.concatenate([y, yb]))
        row = []
        for n in others[1:]:
            C_, yc = load(n)
            row.append(f"{n}: {lr_acc(m, C_[:, l], yc):.2f}")
        print(f"L{l} train=cities+neg_cities -> " + " | ".join(row))
