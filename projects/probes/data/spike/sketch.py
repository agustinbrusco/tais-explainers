"""Quick look at the real cities activations: the views the plan relies on. Scratch sketches, not figures."""
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler

HERE = Path(__file__).parent
d = np.load(HERE / "acts_Qwen2.5-1.5B_cities.npz")
A, y = d["acts"].astype(np.float32), d["labels"]
rng = np.random.default_rng(0)
LAYER = 16
X = A[:, LAYER]
X = X - X.mean(0)
idx = rng.permutation(len(y))
trn, tst = idx[:300], idx[300:]
yr = rng.integers(0, 2, len(y))


def probe(Xtr, ytr, C):
    sc = StandardScaler().fit(Xtr)
    clf = LogisticRegression(C=C, max_iter=5000).fit(sc.transform(Xtr), ytr)
    w = clf.coef_[0] / sc.scale_
    b = clf.intercept_[0] - (sc.mean_ / sc.scale_) @ clf.coef_[0]
    return w, b


fig, axs = plt.subplots(2, 3, figsize=(15, 9))
for row, (labels, name, C) in enumerate([(y, "real labels (true/false)", 1.0), (yr, "random labels", 1e4)]):
    w, b = probe(X[trn], labels[trn], C)
    u = w / np.linalg.norm(w)
    R = X - np.outer(X @ u, u)
    _, _, Vt = np.linalg.svd(R[trn], full_matrices=False)
    v = Vt[0]
    for col, (sel, title) in enumerate([(trn, "training points (300)"), (tst, "held-out points")]):
        ax = axs[row, col]
        s = X[sel] @ w + b
        ax.scatter(s[labels[sel] == 1], (X[sel] @ v)[labels[sel] == 1], s=6, alpha=.6, label="label 1")
        ax.scatter(s[labels[sel] == 0], (X[sel] @ v)[labels[sel] == 0], s=6, alpha=.6, label="label 0")
        ax.axvline(0, color="k", lw=.8)
        acc = ((s > 0).astype(int) == labels[sel]).mean()
        ax.set_title(f"{name}: {title}  acc={acc:.3f}")
        ax.set_xlabel("probe score w.h+b (the probe's axis)")
        ax.set_ylabel("top remaining PC")
    ax = axs[row, 2]
    for sel, lab in [(trn, "train"), (tst, "held-out")]:
        s = X[sel] @ w + b
        ax.hist(s[labels[sel] == 1], bins=40, alpha=.5, density=True, label=f"{lab} label 1")
        ax.hist(s[labels[sel] == 0], bins=40, alpha=.5, density=True, label=f"{lab} label 0")
    ax.legend(fontsize=7)
    ax.set_title("probe score histograms")
plt.tight_layout()
plt.savefig(HERE / "sketch_cover.png", dpi=80)

# Reading vs writing: plane spanned by dmu and the LR direction
w, b = probe(X[trn], y[trn], 1.0)
dmu = X[y == 1].mean(0) - X[y == 0].mean(0)
e1 = dmu / np.linalg.norm(dmu)
w_perp = w - (w @ e1) * e1
e2 = w_perp / np.linalg.norm(w_perp)
P = np.stack([X @ e1, X @ e2], 1)
fig, ax = plt.subplots(figsize=(7, 7))
ax.scatter(*P[y == 1].T, s=5, alpha=.5, label="true")
ax.scatter(*P[y == 0].T, s=5, alpha=.5, label="false")
wn = w / np.linalg.norm(w)
m0 = P[y == 0].mean(0)
scale = np.linalg.norm(dmu)
ax.arrow(*m0, scale, 0, width=.02 * scale, color="purple", length_includes_head=True, label="dmu")
ax.arrow(*m0, (wn @ e1) * scale, (wn @ e2) * scale, width=.02 * scale, color="goldenrod", length_includes_head=True)
cos = wn @ e1
ax.set_title(f"L{LAYER}: plane of (dmu, LR w). cos(w, dmu) = {cos:.2f}  (purple: dmu, gold: w, same length)")
ax.set_aspect("equal")
ax.legend()
plt.savefig(HERE / "sketch_readwrite.png", dpi=80)

# Layer sweep of the random-2D-view separability vs probe view (per layer)
print("done")
