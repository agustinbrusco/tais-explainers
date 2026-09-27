"""Shared pieces of the pinned protocol (see export.py's docstring): loading our statements' activations, the split by
city, the probes, and the small linear algebra the exporters use. Imported by the chapter exporters (export_find.py,
push.py); export.py keeps its own copy of the same definitions."""
import csv
from pathlib import Path
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

RUN = Path(__file__).resolve().parent / "run"
WEB = Path(__file__).resolve().parents[1] / "web" / "data"
MODEL = "Qwen2.5-1.5B"
C_DEFAULT = 1.0
R = lambda a, n=3: np.round(np.asarray(a, dtype=float), n).tolist()


def load(name, src=RUN):
    d = np.load(src / f"acts_{MODEL}_{name}.npz")
    rows = list(csv.DictReader(open(src / "data" / f"{name}.csv", encoding="utf-8")))
    return d["acts"], d["labels"].astype(int), rows


def split(rows):
    """The pinned split: each city on one side, rng(1) halves. Returns the training mask."""
    cities = sorted({r["city"] for r in rows})
    train_c = set(np.random.default_rng(1).permutation(cities)[: len(cities) // 2])
    return np.array([r["city"] in train_c for r in rows])


def unit(v):
    return v / np.linalg.norm(v)


def lr(X, y, C=C_DEFAULT, centre=None):
    """Logistic regression on raw states (centred, no standardization), solved exactly; (w, b) in raw coordinates."""
    c = X.mean(0) if centre is None else centre
    m = LogisticRegression(C=C, solver="newton-cholesky", max_iter=1000, tol=1e-8).fit(X - c, y)
    return m.coef_[0], float(m.intercept_[0] - c @ m.coef_[0])


def lr_span(X, y, C=C_DEFAULT):
    """The same fit as lr() when there are fewer statements than dimensions, computed in the span of the centred points:
    the L2 solution lies there (w = -C sum_i g_i (x_i - c), because the unpenalized intercept makes sum_i g_i = 0), and
    the penalty is rotation-invariant, so fitting the r coordinates of the points in that span gives the same w at a
    cost of r^3 instead of d^3 per Newton step."""
    c = X.mean(0)
    Xc = X - c
    _, S, Vt = np.linalg.svd(Xc, full_matrices=False)
    V = Vt[S > S[0] * 1e-9].T                       # d x r
    m = LogisticRegression(C=C, solver="newton-cholesky", max_iter=1000, tol=1e-8).fit(Xc @ V, y)
    w = V @ m.coef_[0]
    return w, float(m.intercept_[0] - c @ w)


def acc(s, y):
    return round(float(((s > 0).astype(int) == y).mean()), 3)


def auroc(s, y):
    return round(float(roc_auc_score(y, s)), 3)


def top_pc(X, remove):
    """Top principal direction of X after projecting out the unit vectors in `remove`."""
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
