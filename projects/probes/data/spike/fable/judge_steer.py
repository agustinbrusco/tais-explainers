"""Fable's follow-up, reusing the coordinator's saved activations (spike/acts_*.npz).
(1) zero-shot judgement accuracy of Qwen2.5-1.5B (no few-shot prefix): can the piece show a P(true) strip without scaffolding?
(2) mass-mean steering over a wide alpha range at L12 and L16, two conventions (all positions vs final token), zero-shot prompt.
(3) coherence: greedy continuations under the strongest push.  Scratch only."""
import csv, json, os, time
import numpy as np, torch
from transformers import AutoTokenizer, AutoModelForCausalLM

torch.manual_seed(0); torch.set_num_threads(8)
HERE = os.path.dirname(os.path.abspath(__file__))  # spike/fable; the activations and data/ sit in spike/
S = os.path.join(HERE, '..')
OUT = os.path.join(HERE, 'judge_steer.json')
MODEL = 'Qwen/Qwen2.5-1.5B'
t0 = time.time()
def log(*a): print(f'[{time.time()-t0:5.0f}s]', *a, flush=True)

rows = list(csv.DictReader(open(f'{S}/data/cities.csv')))
d = np.load(f'{S}/acts_Qwen2.5-1.5B_cities.npz'); A, y = d['acts'].astype(np.float32), d['labels']
dn = np.load(f'{S}/acts_Qwen2.5-1.5B_neg_cities.npz'); yn = dn['labels']
nrows = list(csv.DictReader(open(f'{S}/data/neg_cities.csv')))
cities = sorted({r['city'] for r in rows})
train_c = set(np.random.default_rng(1).permutation(cities)[: len(cities)//2])   # the coordinator's split convention
tr = np.array([r['city'] in train_c for r in rows]); test_idx = np.where(~tr)[0]
rng = np.random.default_rng(2)
jud_idx = np.concatenate([rng.choice(test_idx[y[test_idx]==1], 60, replace=False), rng.choice(test_idx[y[test_idx]==0], 60, replace=False)])
neg_idx = rng.choice(len(nrows), 120, replace=False)
steer_idx = np.concatenate([rng.choice(test_idx[y[test_idx]==0], 24, replace=False), rng.choice(test_idx[y[test_idx]==1], 24, replace=False)])

tok = AutoTokenizer.from_pretrained(MODEL); tok.padding_side = 'right'
model = AutoModelForCausalLM.from_pretrained(MODEL, dtype=torch.float32).eval()
PROMPT = '{s}\nIs the statement above true or false? Answer:'
T = tok(' true', add_special_tokens=False).input_ids[0]; F = tok(' false', add_special_tokens=False).input_ids[0]
log('loaded; token ids', T, F)

state = {'vec': None, 'layer': None, 'mode': 'all', 'stmt_last': None}
def hook(mod, inp, out):
    if state['vec'] is None: return out
    h = out[0] if isinstance(out, tuple) else out
    if state['mode'] == 'all': h += state['vec']
    else: h[torch.arange(h.shape[0]), state['stmt_last'], :] += state['vec']
    return out
handles = [model.model.layers[l].register_forward_hook(hook) for l in range(model.config.num_hidden_layers)]
# hidden_states[l+1] = output of block l, so a direction fitted on hidden_states index L is added at block L-1's output
def set_push(L, vec, mode):
    state['vec'] = None
    for l, h in enumerate(handles): h.remove()
    handles[:] = [model.model.layers[L-1].register_forward_hook(hook)]
    state['vec'] = vec; state['mode'] = mode

@torch.no_grad()
def judge(stmts, bs=16):
    ps = []
    for i in range(0, len(stmts), bs):
        batch = stmts[i:i+bs]
        enc = tok([PROMPT.format(s=s) for s in batch], return_tensors='pt', padding=True)
        state['stmt_last'] = torch.tensor([len(tok(s).input_ids)-1 for s in batch])
        lg = model(**enc).logits
        last = enc['attention_mask'].sum(1)-1
        two = torch.stack([lg[torch.arange(len(batch)), last, T], lg[torch.arange(len(batch)), last, F]], 1).softmax(1)[:, 0]
        ps.append(two.numpy())
    return np.concatenate(ps)
def auroc(s, yy):
    o = np.argsort(s, kind='stable'); r = np.empty(len(s)); r[o] = np.arange(1, len(s)+1); p = yy.sum(); n = len(yy)-p
    return float((r[yy==1].sum()-p*(p+1)/2)/(p*n))

res = {'model': MODEL, 'prompt': PROMPT, 'zero_shot': {}, 'steer': {}}
state['vec'] = None
for name, idx, R, Y in [('cities_heldout', jud_idx, rows, y), ('neg_cities', neg_idx, nrows, yn)]:
    p = judge([R[i]['statement'] for i in idx]); yy = Y[idx]
    res['zero_shot'][name] = {'n': int(len(idx)), 'acc': float(((p>0.5)==(yy==1)).mean()), 'auroc': auroc(p, yy),
                              'mean_p_true|true': float(p[yy==1].mean()), 'mean_p_true|false': float(p[yy==0].mean())}
    log('zero-shot', name, res['zero_shot'][name])

for L in [12, 16]:
    X = A[tr, L]; dmu = X[y[tr]==1].mean(0) - X[y[tr]==0].mean(0); u = dmu/np.linalg.norm(dmu)
    gap = float((X[y[tr]==1] @ u).mean() - (X[y[tr]==0] @ u).mean())
    resid_norm = float(np.linalg.norm(A[tr, L], axis=1).mean())
    r = {'gap_along_u': gap, 'dmu_norm': float(np.linalg.norm(dmu)), 'mean_resid_norm': resid_norm, 'runs': []}
    stmts = [rows[i]['statement'] for i in steer_idx]; lab = y[steer_idx]
    for mode in ['all', 'last']:
        for k in [-3, -1.5, 0, 1.5, 3]:
            set_push(L, torch.tensor(k*gap*u, dtype=torch.float32), mode)
            p = judge(stmts)
            row = {'mode': mode, 'alpha_gaps': k, 'push_norm_over_resid_norm': abs(k)*gap/resid_norm,
                   'P(true)|false_stmts': float(p[lab==0].mean()), 'P(true)|true_stmts': float(p[lab==1].mean()),
                   'frac_judged_true|false': float((p[lab==0]>0.5).mean()), 'frac_judged_true|true': float((p[lab==1]>0.5).mean())}
            r['runs'].append(row)
            log(f'L{L} {mode:4s} a={k:+.1f} (|push|/|h|={row["push_norm_over_resid_norm"]:.2f}) P(true|false)={row["P(true)|false_stmts"]:.3f} '
                f'P(true|true)={row["P(true)|true_stmts"]:.3f} judgedT|false={row["frac_judged_true|false"]:.2f}')
    # coherence: greedy continuation of one false statement under the strongest all-position push
    cont = {}
    for k in [0, 3, -3]:
        set_push(L, torch.tensor(k*gap*u, dtype=torch.float32), 'all')
        ids = tok(stmts[0] + ' In fact,', return_tensors='pt').input_ids
        with torch.no_grad():
            out = ids
            for _ in range(8): out = torch.cat([out, model(out).logits[0, -1].argmax().view(1, 1)], 1)
        cont[str(k)] = tok.decode(out[0, ids.shape[1]:])
    r['coherence'] = {'statement': stmts[0], 'continuations': cont}
    log(f'L{L} coherence', cont)
    res['steer'][L] = r
state['vec'] = None
json.dump(res, open(OUT, 'w'), indent=1); log('wrote', OUT)
