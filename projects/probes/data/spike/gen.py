"""Generalization matrix across the four real sets (train on one or two, test on the others), by layer."""
from pathlib import Path
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
H = Path(__file__).parent
S = ["cities", "neg_cities", "sp_en_trans", "neg_sp_en_trans"]
D = {n: np.load(H / f"acts_Qwen2.5-1.5B_{n}.npz") for n in S}
def fit(X, y, C=1.0):
    sc = StandardScaler().fit(X); return sc, LogisticRegression(C=C, max_iter=3000).fit(sc.transform(X), y)
def acc(m, X, y): return (m[1].predict(m[0].transform(X)) == y).mean()
for l in [12, 16]:
    print(f"--- layer {l}: rows = trained on, cols = tested on (in-set = 5-fold held-out not done; in-set shows train acc)")
    print(" " * 26 + "  ".join(f"{n[:12]:>12}" for n in S))
    for tr_sets in [["cities"], ["neg_cities"], ["sp_en_trans"], ["cities", "neg_cities"]]:
        X = np.concatenate([D[n]["acts"][:, l].astype(np.float32) for n in tr_sets]); y = np.concatenate([D[n]["labels"] for n in tr_sets])
        m = fit(X, y)
        print(f"{'+'.join(tr_sets):>26}" + "  ".join(f"{acc(m, D[n]['acts'][:, l].astype(np.float32), D[n]['labels']):12.3f}" for n in S))
