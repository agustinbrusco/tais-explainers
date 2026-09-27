"""Chapter IV's dial for "What a Probe Reads": illustrative score distributions whose readouts reproduce published rows.

The dial draws, on one score axis, ordinary chat (Alpaca: 1,000 benign instructions) and a monitored task's honest and
deceptive responses, one normalized histogram each. The *shapes* are ours: each class is a Gaussian drawn as n = 1,000
quantile samples (x_i = mu + sigma * Phi^-1((i - 0.5) / n)), so histograms are smooth and deterministic, and every readout
the page prints is computed from those drawn samples. The *parameters* are fitted here so that, at the published
threshold (1% of chat flagged), the drawn samples reproduce the published numbers:

- Parrack, Attubato & Heimersheim (2507.12691), Apollo's probes on Llama-3.3-70B-Instruct, Insider Trading:
  the instructed-pairs probe: AUROC 0.999 (Table 3), recall 100% at 1% FPR on Alpaca (Table 7);
  the roleplaying probe: AUROC 0.999, recall 0.9%.
  The pairs probe on Backdoors: AUROC 0.844, recall 100%, and "the average honest Backdoors sample had a mean probe
  activation higher than 99.9% of the Alpaca samples" (L619-620).
- Das et al. (2609.03035), GPT-OSS-20B agents, logistic-regression probe, peak aggregation, the threshold frozen:
  aware AUROC 0.975, recall 0.95; with feedback AUROC 0.912, recall 0.41 (L369-372).

Writes web/data/monitor.json. No model runs; this is arithmetic on published numbers.

    uv run python projects/probes/data/export_monitor.py
"""
import json
from pathlib import Path
import numpy as np
from scipy.stats import norm

OUT = Path(__file__).resolve().parents[1] / "web" / "data" / "monitor.json"
N = 1000
Q = norm.ppf((np.arange(N) + 0.5) / N)          # standard quantile samples


def samples(mu, sd):
    return mu + sd * Q


def auroc(pos, neg):
    """P(score of a positive > score of a negative), ties half: exact on the drawn samples."""
    neg = np.sort(neg)
    lo = np.searchsorted(neg, pos, side="left")
    hi = np.searchsorted(neg, pos, side="right")
    return float((lo + (hi - lo) / 2).sum() / (len(pos) * len(neg)))


def above(x, t):
    return float((x > t).mean())


chat = samples(0.0, 1.0)
# the tick: 1% of chat flagged, i.e. between the 990th and 991st of the 1,000 sorted chat samples
cs = np.sort(chat)
TICK = float((cs[989] + cs[990]) / 2)
assert above(chat, TICK) == 0.01


def fit_pair(sd, auroc_target, recall_target, tick, hi_side=True):
    """Deceptive N(mu_d, sd) placed so that its recall at the tick rounds to recall_target; honest N(mu_h, sd) below it by
    the gap whose drawn-sample AUROC rounds to auroc_target (3 d.p.). Returns (mu_h, mu_d)."""
    # recall: the share of deceptive samples above the tick; solve on the continuous quantile, then check on the samples
    mu_d = tick - sd * norm.ppf(1 - recall_target) if 0 < recall_target < 1 else (tick - sd * Q[0] + 0.05 if recall_target >= 1 else tick - sd * Q[-1] - 0.05)
    assert round(above(samples(mu_d, sd), tick), 3) == round(recall_target, 3), (mu_d, above(samples(mu_d, sd), tick))
    # AUROC: bisect the gap on the drawn samples
    lo, hi = 0.0, 20.0 * sd
    for _ in range(200):
        g = (lo + hi) / 2
        a = auroc(samples(mu_d, sd), samples(mu_d - g, sd))
        lo, hi = (g, hi) if a < auroc_target else (lo, g)
    g = hi
    assert round(auroc(samples(mu_d, sd), samples(mu_d - g, sd)), 3) == auroc_target
    return mu_d - g, mu_d


out = {"meta": {
    "note": "illustrative shapes (Gaussians drawn as 1,000 quantile samples); parameters fitted so that the drawn samples "
            "reproduce the published rows at the published threshold. Only those rows are data.",
    "n": N, "tick": round(TICK, 4)}, "chat": {"mu": 0.0, "sd": 1.0}}

# Insider Trading, Apollo's two probes (Parrack et al. Tables 3 and 7)
hA, dA = fit_pair(0.8, 0.999, 1.0, TICK)
hB, dB = fit_pair(0.48, 0.999, 0.009, TICK)
out["insider"] = {
    "A": {"name": "instructed-pairs probe", "honest": {"mu": round(hA, 4), "sd": 0.8}, "deceptive": {"mu": round(dA, 4), "sd": 0.8},
          "published": {"auroc": 0.999, "recall": 1.000}},
    "B": {"name": "roleplaying probe", "honest": {"mu": round(hB, 4), "sd": 0.48}, "deceptive": {"mu": round(dB, 4), "sd": 0.48},
          "published": {"auroc": 0.999, "recall": 0.009}},
}
# Backdoors, the pairs probe: the honest centre above 99.9% of chat (its mean over the chat distribution), AUROC 0.844,
# recall 1.000 at the chat tick
q999 = float(np.sort(chat)[998])                      # 99.9% of the chat samples lie at or below this one
sd_bd = 0.6
mu_h_bd = q999 + 0.5                                  # the average honest sample above 99.9% of chat
lo, hi = 0.0, 10.0
for _ in range(200):
    g = (lo + hi) / 2
    a = auroc(samples(mu_h_bd + g, sd_bd), samples(mu_h_bd, sd_bd))
    lo, hi = (g, hi) if a < 0.844 else (lo, g)
mu_d_bd = mu_h_bd + hi
bd_h, bd_d = samples(mu_h_bd, sd_bd), samples(mu_d_bd, sd_bd)
assert round(auroc(bd_d, bd_h), 3) == 0.844 and above(bd_d, TICK) == 1.0
assert (chat < bd_h.mean()).mean() >= 0.999
out["backdoors"] = {"honest": {"mu": round(mu_h_bd, 4), "sd": sd_bd}, "deceptive": {"mu": round(mu_d_bd, 4), "sd": sd_bd},
                    "published": {"auroc": 0.844, "recall": 1.000}}

# Das et al.: control vs collusion runs, the threshold frozen at its baseline value; sd 1 for every class
T_DAS = 1.125
def fit_das(auroc_t, recall_t):
    mu_col = T_DAS - norm.ppf(1 - recall_t)
    # nudge until the drawn recall rounds right
    while round(above(samples(mu_col, 1.0), T_DAS), 2) < recall_t: mu_col += 1e-4
    while round(above(samples(mu_col, 1.0), T_DAS), 2) > recall_t: mu_col -= 1e-4
    lo, hi = 0.0, 10.0
    for _ in range(200):
        g = (lo + hi) / 2
        a = auroc(samples(mu_col, 1.0), samples(mu_col - g, 1.0))
        lo, hi = (g, hi) if a < auroc_t else (lo, g)
    assert round(auroc(samples(mu_col, 1.0), samples(mu_col - hi, 1.0)), 3) == auroc_t
    return mu_col - hi, mu_col
ca, la = fit_das(0.975, 0.95)
cf, lf = fit_das(0.912, 0.41)
out["das"] = {"tick": T_DAS,
              "aware": {"control": {"mu": round(ca, 4), "sd": 1.0}, "collusion": {"mu": round(la, 4), "sd": 1.0}, "published": {"auroc": 0.975, "recall": 0.95}},
              "feedback": {"control": {"mu": round(cf, 4), "sd": 1.0}, "collusion": {"mu": round(lf, 4), "sd": 1.0}, "published": {"auroc": 0.912, "recall": 0.41}}}

OUT.write_text(json.dumps(out, indent=1))
print(json.dumps(out, indent=1))
for k in ("A", "B"):
    P = out["insider"][k]
    d, h = samples(P["deceptive"]["mu"], P["deceptive"]["sd"]), samples(P["honest"]["mu"], P["honest"]["sd"])
    print(k, "AUROC", round(auroc(d, h), 4), "recall", above(d, TICK), "honest above tick", round(above(h, TICK), 3))
