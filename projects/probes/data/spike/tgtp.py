"""General truth vs polarity (Buerger et al.'s picture, measured in our model): t_G = (dmu_aff + dmu_neg)/2,
t_P = (dmu_aff - dmu_neg)/2 per layer; how well each reads both polarities; and a 2-D sketch on (t_G, t_P)."""
from pathlib import Path
import numpy as np
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
H = Path(__file__).parent
def load(n):
    d = np.load(H / f"acts_Qwen2.5-1.5B_{n}.npz"); return d["acts"].astype(np.float32), d["labels"]
A, ya = load("cities"); B, yb = load("neg_cities")
half = np.arange(len(ya)) % 4 < 2          # keep each city's true/false pair together
def dmu(X, y): return X[y == 1].mean(0) - X[y == 0].mean(0)
def acc_dir(v, Xtr, ytr, X, y):
    thr = ((Xtr[ytr == 1].mean(0) + Xtr[ytr == 0].mean(0)) / 2) @ v
    return ((X @ v > thr).astype(int) == y).mean()
print("layer |t_G|/|t_P|  t_G reads aff/neg   t_P reads aff/neg")
for l in range(2, 29, 2):
    Xa, Xb = A[:, l], B[:, l]
    da, db = dmu(Xa[half], ya[half]), dmu(Xb[half], yb[half])
    tg, tp = (da + db) / 2, (da - db) / 2
    Xtr = np.concatenate([Xa[half], Xb[half]]); ytr = np.concatenate([ya[half], yb[half]])
    ga, gb = acc_dir(tg, Xtr, ytr, Xa[~half], ya[~half]), acc_dir(tg, Xtr, ytr, Xb[~half], yb[~half])
    pa, pb = acc_dir(tp, Xa[half], ya[half], Xa[~half], ya[~half]), acc_dir(tp, Xa[half], ya[half], Xb[~half], yb[~half])
    print(f"{l:5d}   {np.linalg.norm(tg) / np.linalg.norm(tp):5.2f}        {ga:.2f} / {gb:.2f}         {pa:.2f} / {pb:.2f}")
fig, axs = plt.subplots(1, 2, figsize=(12, 5.5))
for ax, l in zip(axs, [12, 16]):
    Xa, Xb = A[:, l], B[:, l]
    da, db = dmu(Xa[half], ya[half]), dmu(Xb[half], yb[half])
    tg, tp = (da + db) / 2, (da - db) / 2
    e1 = tg / np.linalg.norm(tg); e2 = tp - (tp @ e1) * e1; e2 /= np.linalg.norm(e2)
    mu = np.concatenate([Xa, Xb]).mean(0)
    for X, y, name, mk in [(Xa, ya, "is in", "o"), (Xb, yb, "is NOT in", "s")]:
        P = (X[~half] - mu) @ np.stack([e1, e2], 1)
        for lab, col in [(1, "tab:blue"), (0, "tab:orange")]:
            ax.scatter(*P[y[~half] == lab].T, s=6, alpha=.5, marker=mk, color=col,
                       label=f"'{name}', {'true' if lab else 'false'}")
    ax.set_xlabel("general truth t_G"); ax.set_ylabel("polarity-sensitive t_P (orthogonalized)")
    ax.set_title(f"L{l}: held-out statements on the (t_G, t_P) plane"); ax.legend(fontsize=7)
plt.tight_layout(); plt.savefig(H / "sketch_tgtp.png", dpi=80)
