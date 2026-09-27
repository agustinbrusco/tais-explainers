"""Raw sketch: the L12 logistic-regression ruler trained on 'is in', read on held-out 'is in' and on 'is not in'."""
from pathlib import Path
import numpy as np
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
H = Path(__file__).parent
def load(n):
    d = np.load(H / f"acts_Qwen2.5-1.5B_{n}.npz"); return d["acts"].astype(np.float32), d["labels"]
A, ya = load("cities"); B, yb = load("neg_cities")
half = np.arange(len(ya)) % 4 < 2
fig, axs = plt.subplots(1, 3, figsize=(15, 4.2))
for ax, L in zip(axs, [8, 12, 16]):
    sc = StandardScaler().fit(A[half, L]); m = LogisticRegression(C=1.0, max_iter=3000).fit(sc.transform(A[half, L]), ya[half])
    sa = m.decision_function(sc.transform(A[~half, L])); sb = m.decision_function(sc.transform(B[~half, L]))
    bins = np.linspace(min(sa.min(), sb.min()), max(sa.max(), sb.max()), 60)
    ax.hist(sa[ya[~half] == 1], bins, alpha=.5, label="'is in', true"); ax.hist(sa[ya[~half] == 0], bins, alpha=.5, label="'is in', false")
    ax.hist(sb[yb[~half] == 1], bins, alpha=.5, histtype="step", lw=2, label="'is NOT in', true")
    ax.hist(sb[yb[~half] == 0], bins, alpha=.8, histtype="step", lw=2, label="'is NOT in', false")
    acc_a = ((sa > 0).astype(int) == ya[~half]).mean(); acc_b = ((sb > 0).astype(int) == yb[~half]).mean()
    ax.axvline(0, color="k", lw=.8); ax.set_title(f"L{L}: held-out 'is in' {acc_a:.2f} · 'is not in' {acc_b:.2f}")
    ax.set_xlabel("ruler score (trained on 'is in' only)")
axs[0].legend(fontsize=7)
plt.tight_layout(); plt.savefig(H / "sketch_neg.png", dpi=80)
