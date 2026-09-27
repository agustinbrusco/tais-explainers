"""Text-only baselines for cities: can you predict true/false from the country name alone (no model knowledge)?"""
import csv
from pathlib import Path
import numpy as np
from sklearn.linear_model import LogisticRegression
H = Path(__file__).parent
rows = list(csv.DictReader(open(H / "data" / "cities.csv")))
y = np.array([int(r["label"]) for r in rows])
countries = sorted({r["country"] for r in rows})
ci = {c: i for i, c in enumerate(countries)}
X = np.zeros((len(rows), len(countries))); X[np.arange(len(rows)), [ci[r["country"]] for r in rows]] = 1
cities = sorted({r["city"] for r in rows})
tr_c = set(np.random.default_rng(1).permutation(cities)[: len(cities) // 2])
tr = np.array([r["city"] in tr_c for r in rows])
m = LogisticRegression(C=1.0, max_iter=2000).fit(X[tr], y[tr])
print(f"country-name-only LR, held-out cities: {(m.predict(X[~tr]) == y[~tr]).mean():.3f}  ({len(countries)} countries)")
from collections import Counter
t = Counter(r["country"] for r in rows if r["label"] == "1"); f = Counter(r["country"] for r in rows if r["label"] == "0")
print("most common in TRUE:", t.most_common(6)); print("most common in FALSE:", f.most_common(6))
