"""Learning curve (how many labelled statements does a truth probe need?) and the mass-mean row of the transfer matrix,
from the coordinator's saved activations. Scratch only; seconds of CPU."""
import csv, json, os, numpy as np, torch
torch.set_num_threads(2)
HERE = os.path.dirname(os.path.abspath(__file__))  # spike/fable; the activations and data/ sit in spike/
S = os.path.join(HERE, '..')
OUT = os.path.join(HERE, 'curve_mm.json')
def load(n):
    d = np.load(f'{S}/acts_Qwen2.5-1.5B_{n}.npz'); return d['acts'].astype(np.float32), d['labels']
A = {n: load(n) for n in ['cities', 'neg_cities', 'sp_en_trans', 'neg_sp_en_trans']}
rows = list(csv.DictReader(open(f'{S}/data/cities.csv')))
cities = sorted({r['city'] for r in rows})
train_c = set(np.random.default_rng(1).permutation(cities)[: len(cities)//2])
tr = np.array([r['city'] in train_c for r in rows]); te = ~tr

def mm(X, y):
    w = X[y==1].mean(0) - X[y==0].mean(0); b = -float(0.5*(X[y==1].mean(0)+X[y==0].mean(0)) @ w); return w, b
def lr(X, y, l2=1e-3):
    mu, sd = X.mean(0), X.std(0)+1e-6
    Xn = torch.tensor((X-mu)/sd); yt = torch.tensor(y, dtype=torch.float32)
    w = torch.zeros(X.shape[1], requires_grad=True); b = torch.zeros(1, requires_grad=True)
    opt = torch.optim.LBFGS([w, b], max_iter=200, line_search_fn='strong_wolfe')
    def cl():
        opt.zero_grad(); L = torch.nn.functional.binary_cross_entropy_with_logits(Xn@w+b, yt) + l2*(w*w).sum(); L.backward(); return L
    opt.step(cl); wn = w.detach().numpy(); return wn/sd, float(b) - float((mu/sd)@wn)
def acc(w, b, X, y): return float((((X@w+b) > 0) == (y==1)).mean())

res = {'split': 'by city, rng(1) half/half (coordinator convention)', 'curve': {}, 'mm_transfer': {}, 'lr_transfer': {}}
Xc, yc = A['cities']
for L in [12, 16]:
    res['curve'][L] = {}
    for n in [2, 4, 8, 16, 32, 64, 128, 256, 512]:
        a_mm, a_lr = [], []
        for seed in range(5):
            rng = np.random.default_rng(seed); ti = np.where(tr)[0]
            pick = np.concatenate([rng.choice(ti[yc[ti]==1], n//2, replace=False), rng.choice(ti[yc[ti]==0], n - n//2, replace=False)])
            X, y = Xc[pick, L], yc[pick]
            w, b = mm(X, y); a_mm.append(acc(w, b, Xc[te, L], yc[te]))
            if n >= 4:
                w, b = lr(X, y); a_lr.append(acc(w, b, Xc[te, L], yc[te]))
        res['curve'][L][n] = {'mm_heldout': float(np.mean(a_mm)), 'lr_heldout': float(np.mean(a_lr)) if a_lr else None}
        print(f'L{L} n={n:4d} MM held-out {np.mean(a_mm):.3f}  LR held-out {np.mean(a_lr) if a_lr else float("nan"):.3f}', flush=True)
for L in range(4, 29, 4):
    r = {}; rl = {}
    w, b = mm(Xc[tr, L], yc[tr]); wl, bl = lr(Xc[tr, L], yc[tr])
    for n in ['cities_heldout', 'neg_cities', 'sp_en_trans', 'neg_sp_en_trans']:
        X, y = (Xc[te, L], yc[te]) if n == 'cities_heldout' else (A[n][0][:, L], A[n][1])
        r[n] = acc(w, b, X, y); rl[n] = acc(wl, bl, X, y)
    Xb = np.concatenate([Xc[tr, L], A['neg_cities'][0][tr, L]]); yb = np.concatenate([yc[tr], A['neg_cities'][1][tr]])
    w2, b2 = mm(Xb, yb); wl2, bl2 = lr(Xb, yb)
    for n in ['sp_en_trans', 'neg_sp_en_trans']:
        r['both->'+n] = acc(w2, b2, A[n][0][:, L], A[n][1]); rl['both->'+n] = acc(wl2, bl2, A[n][0][:, L], A[n][1])
    res['mm_transfer'][L] = r; res['lr_transfer'][L] = rl
    print(f'L{L:2d} MM: ' + ' '.join(f'{k}={v:.3f}' for k, v in r.items()), flush=True)
    print(f'L{L:2d} LR: ' + ' '.join(f'{k}={v:.3f}' for k, v in rl.items()), flush=True)
json.dump(res, open(OUT, 'w'), indent=1); print('wrote', OUT)
