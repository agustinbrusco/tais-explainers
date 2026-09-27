"""Feasibility check for the probes explainer's running example, on CPU.

Qwen2.5-1.5B (already in the HF cache), Marks & Tegmark's true/false datasets (cities, neg_cities, sp_en_trans,
neg_sp_en_trans). Questions: (1) does a truth probe train at all on a 1.5B model; (2) does an LR probe trained on
cities transfer to neg_cities (the polarity failure); (3) mass-mean vs LR; (4) are the cities and neg_cities
directions orthogonal at some layer; (5) can the model judge statements zero-shot (capability check);
(6) does adding the mass-mean direction move the judgement (steering feasibility).
Scratch only: nothing here touches the repo.
"""
import csv, json, os, time, sys
import numpy as np, torch
from transformers import AutoTokenizer, AutoModelForCausalLM

torch.manual_seed(0); np.random.seed(0); torch.set_num_threads(8)
HERE = os.path.dirname(os.path.abspath(__file__))  # spike/fable; the activations and data/ sit in spike/
D = os.path.join(HERE, '..', 'data')
OUT = os.path.join(HERE, 'feasibility.json')
MODEL = 'Qwen/Qwen2.5-1.5B'
LAYERS = list(range(2, 29, 2))  # hidden_states[l] = residual after block l (0 = embeddings); 28 = after final norm
t0 = time.time()
def log(*a):
    print(f'[{time.time()-t0:6.0f}s]', *a, flush=True)

def load(name, n=None):
    rows = list(csv.DictReader(open(f'{D}/{name}.csv')))
    if n: rows = rows[:n]
    return [r['statement'] for r in rows], np.array([int(r['label']) for r in rows])

tok = AutoTokenizer.from_pretrained(MODEL); tok.padding_side = 'right'
model = AutoModelForCausalLM.from_pretrained(MODEL, torch_dtype=torch.float32); model.eval()
log('loaded', MODEL, 'layers', model.config.num_hidden_layers, 'd', model.config.hidden_size)

@torch.no_grad()
def acts(statements, bs=16):
    out = {l: [] for l in LAYERS}
    for i in range(0, len(statements), bs):
        batch = statements[i:i+bs]
        enc = tok(batch, return_tensors='pt', padding=True)
        hs = model(**enc, output_hidden_states=True).hidden_states
        last = enc['attention_mask'].sum(1) - 1
        for l in LAYERS:
            out[l].append(hs[l][torch.arange(len(batch)), last].float().numpy())
    return {l: np.concatenate(v) for l, v in out.items()}

def auroc(s, y):
    order = np.argsort(s, kind='stable'); r = np.empty(len(s)); r[order] = np.arange(1, len(s)+1)
    npos = y.sum(); nneg = len(y) - npos
    return float((r[y == 1].sum() - npos*(npos+1)/2) / (npos*nneg))

def mass_mean(X, y):
    w = X[y == 1].mean(0) - X[y == 0].mean(0)
    mid = 0.5*(X[y == 1].mean(0) + X[y == 0].mean(0))
    return w, -float(mid @ w)

def logreg(X, y, l2=1e-3):
    mu, sd = X.mean(0), X.std(0) + 1e-6
    Xn = torch.tensor((X - mu)/sd, dtype=torch.float32); yt = torch.tensor(y, dtype=torch.float32)
    w = torch.zeros(X.shape[1], requires_grad=True); b = torch.zeros(1, requires_grad=True)
    opt = torch.optim.LBFGS([w, b], max_iter=300, line_search_fn='strong_wolfe')
    def closure():
        opt.zero_grad()
        loss = torch.nn.functional.binary_cross_entropy_with_logits(Xn @ w + b, yt) + l2*(w*w).sum()
        loss.backward(); return loss
    opt.step(closure)
    wn = w.detach().numpy(); wr = wn/sd; br = float(b) - float((mu/sd) @ wn)
    return wr, br

def evaluate(w, b, X, y):
    s = X @ w + b
    return {'acc': float(((s > 0) == (y == 1)).mean()), 'auroc': auroc(s, y)}

def cos(a, b): return float(a @ b / (np.linalg.norm(a)*np.linalg.norm(b)))

sets = {n: load(n) for n in ['cities', 'neg_cities', 'sp_en_trans', 'neg_sp_en_trans']}
A = {}
for n, (S, y) in sets.items():
    A[n] = acts(S); log('acts', n, len(S))

# splits
rng = np.random.RandomState(0)
idx = rng.permutation(len(sets['cities'][1])); ntr = int(0.8*len(idx)); tr, te = idx[:ntr], idx[ntr:]
idxn = rng.permutation(len(sets['neg_cities'][1])); trn, ten = idxn[:ntr], idxn[ntr:]
res = {'model': MODEL, 'layers': LAYERS, 'per_layer': {}}
for l in LAYERS:
    Xc, yc = A['cities'][l], sets['cities'][1]; Xn, yn = A['neg_cities'][l], sets['neg_cities'][1]
    r = {}
    for name, fit in [('lr', logreg), ('mm', mass_mean)]:
        w, b = fit(Xc[tr], yc[tr])
        r[f'{name}_cities_to'] = {
            'cities_test': evaluate(w, b, Xc[te], yc[te]),
            'neg_cities': evaluate(w, b, Xn, yn),
            'sp_en_trans': evaluate(w, b, A['sp_en_trans'][l], sets['sp_en_trans'][1]),
            'neg_sp_en_trans': evaluate(w, b, A['neg_sp_en_trans'][l], sets['neg_sp_en_trans'][1]),
        }
        Xb = np.concatenate([Xc[tr], Xn[trn]]); yb = np.concatenate([yc[tr], yn[trn]])
        w2, b2 = fit(Xb, yb)
        r[f'{name}_both_to'] = {
            'cities_test': evaluate(w2, b2, Xc[te], yc[te]),
            'neg_cities_test': evaluate(w2, b2, Xn[ten], yn[ten]),
            'sp_en_trans': evaluate(w2, b2, A['sp_en_trans'][l], sets['sp_en_trans'][1]),
            'neg_sp_en_trans': evaluate(w2, b2, A['neg_sp_en_trans'][l], sets['neg_sp_en_trans'][1]),
        }
    wc, _ = mass_mean(Xc, yc); wn_, _ = mass_mean(Xn, yn)
    r['cos_mm_cities_negcities'] = cos(wc, wn_)
    wlr, _ = logreg(Xc[tr], yc[tr]); r['cos_lr_vs_mm_cities'] = cos(wlr, wc)
    r['mean_norm'] = float(np.linalg.norm(Xc, axis=1).mean())
    res['per_layer'][l] = r
    log(f'L{l:2d} LR cities->test {r["lr_cities_to"]["cities_test"]["acc"]:.3f} ->neg {r["lr_cities_to"]["neg_cities"]["acc"]:.3f} '
        f'(auroc {r["lr_cities_to"]["neg_cities"]["auroc"]:.3f}) | MM ->test {r["mm_cities_to"]["cities_test"]["acc"]:.3f} '
        f'->neg {r["mm_cities_to"]["neg_cities"]["acc"]:.3f} | both->neg_sp {r["lr_both_to"]["neg_sp_en_trans"]["acc"]:.3f} '
        f'| cos(cities,neg) {r["cos_mm_cities_negcities"]:+.2f} | cos(lr,mm) {r["cos_lr_vs_mm_cities"]:+.2f}')

# capability check: zero-shot judgement
PROMPT = '{s}\nIs the statement above true or false? Answer:'
t_true = tok(' true', add_special_tokens=False)['input_ids']; t_false = tok(' false', add_special_tokens=False)['input_ids']
log('token ids', t_true, t_false)
@torch.no_grad()
def judge(statements, bs=16, hook=None):
    ps = []
    h = None
    if hook is not None:
        layer, vec = hook
        def fwd_hook(mod, inp, out):
            if isinstance(out, tuple):
                return (out[0] + vec,) + tuple(out[1:])
            return out + vec
        h = model.model.layers[layer-1].register_forward_hook(fwd_hook)
    try:
        for i in range(0, len(statements), bs):
            batch = [PROMPT.format(s=s) for s in statements[i:i+bs]]
            enc = tok(batch, return_tensors='pt', padding=True)
            logits = model(**enc).logits
            last = enc['attention_mask'].sum(1) - 1
            lg = logits[torch.arange(len(batch)), last]
            two = torch.stack([lg[:, t_true[0]], lg[:, t_false[0]]], 1).softmax(1)[:, 0]
            ps.append(two.numpy())
    finally:
        if h: h.remove()
    return np.concatenate(ps)

cap = {}
for n in ['cities', 'neg_cities', 'sp_en_trans']:
    S, y = sets[n]; sub = rng.permutation(len(S))[:160]
    p = judge([S[i] for i in sub]); yy = y[sub]
    cap[n] = {'acc': float(((p > 0.5) == (yy == 1)).mean()), 'auroc': auroc(p, yy), 'mean_p_true_on_true': float(p[yy == 1].mean()), 'mean_p_true_on_false': float(p[yy == 0].mean())}
    log('zero-shot', n, cap[n])
res['zero_shot'] = cap

# steering feasibility: add alpha * unit mass-mean direction (cities+neg_cities, layer L) at every position of layer L
best_l = max(LAYERS[2:-1], key=lambda l: res['per_layer'][l]['mm_both_to']['neg_cities_test']['auroc'])
Xc, yc = A['cities'][best_l], sets['cities'][1]; Xn, yn = A['neg_cities'][best_l], sets['neg_cities'][1]
w, _ = mass_mean(np.concatenate([Xc, Xn]), np.concatenate([yc, yn])); u = w/np.linalg.norm(w)
gap = float((Xc[yc == 1] @ u).mean() - (Xc[yc == 0] @ u).mean())
S, y = sets['cities']; false_idx = [i for i in rng.permutation(len(S)) if y[i] == 0][:48]; true_idx = [i for i in rng.permutation(len(S)) if y[i] == 1][:48]
steer = {'layer': best_l, 'class_gap_along_u': gap, 'alphas_in_gaps': [-3, -1.5, 0, 1.5, 3], 'false_statements_p_true': [], 'true_statements_p_true': []}
for k in steer['alphas_in_gaps']:
    vec = torch.tensor(k*gap*u, dtype=torch.float32)
    pf = judge([S[i] for i in false_idx], hook=(best_l, vec)); pt = judge([S[i] for i in true_idx], hook=(best_l, vec))
    steer['false_statements_p_true'].append(float(pf.mean())); steer['true_statements_p_true'].append(float(pt.mean()))
    log(f'steer L{best_l} alpha={k:+.1f} gaps: P(true|false stmts)={pf.mean():.3f}  P(true|true stmts)={pt.mean():.3f}')
res['steering'] = steer
json.dump(res, open(OUT, 'w'), indent=1)
log('wrote', OUT)
