# Natural Language Autoencoders (NLAs)

> **Last reviewed:** 2026-09-25 · Compiled by the research agent. There's no arXiv version, so sources are pages and posts
> (see `sources.yaml`). Re-read the source before any claim goes into a claims ledger. **This is at or past the edge of
> Claude's training data.**

## What it is
Two LLM modules are trained jointly with RL, with a **plain-text bottleneck** between them.
- The **activation verbalizer (AV)** takes one residual-stream activation (injected as a token embedding) and writes a
  text explanation.
- The **activation reconstructor (AR)** reads *only that text* and predicts the activation.
- The reward is reconstruction quality, so it's **unsupervised**: no ground-truth explanations are needed.
- The explanations become more informative with training, but **nothing in the objective forces them to be faithful**.

## Primary sources
- Fraser-Taliente, Kantamneni, Ong, … Lindsey, Zimmerman, Marks. **"Natural Language Autoencoders Produce Unsupervised
  Explanations of LLM Activations."** Anthropic, 2026-05-07. https://transformer-circuits.pub/2026/nla/
- Blog: "Natural Language Autoencoders: Turning Claude's thoughts into text", https://www.anthropic.com/research/natural-language-autoencoders
- Code and open checkpoints (Apache-2.0): https://github.com/kitft/natural_language_autoencoders. The checkpoints are Qwen2.5-7B-Instruct
  L20, Gemma-3-12B-IT L32, Gemma-3-27B-IT L41, and Llama-3.3-70B-Instruct L53.
- LW linkpost (critical comments): https://www.lesswrong.com/posts/oeYesesaxjzMAktCM
- Concurrent, independent: Chalnev, "Cycle-Consistent Activation Oracles", LW, 2026-03-12. https://www.lesswrong.com/posts/Nf2sKaNNdxE2ssxbp
- Robustness critique: Zhang & Turner, "How Robust Are Natural Language Autoencoders to Initialization?", 2026-07-09
  (updated 08-26). https://turntrout.com/natural-language-autoencoder-robustness

## Key claims to get right
- **Objective:** minimize E‖h − AR(z)‖² with z ~ AV(·|h). Quality is reported as **FVE** = 1 − L / E‖h − h̄‖², where 0 means
  predicting the mean and 1 means perfect.
- **Warm start:** SFT on (activation, summary) pairs, with summaries written by Claude Opus 4.5 from the text up to that
  token. This gives FVE ≈ 0.3–0.4.
- **RL phase:** a KL penalty keeps the explanations fluent. "FVE grows roughly linearly in log(training steps)", reaching 0.6–0.8.
- **Steganography test:** paraphrasing, shuffling and translating cause "only small drops in FVE", i.e. "little evidence of steganography".
- **Unverbalized evaluation awareness** (blog numbers):
  - 16% on a destructive-actions coding eval.
  - 26% on SWE-bench Verified.
  - <1% on opted-in claude.ai traffic.
  - The paper itself says it "cannot validate … against ground truth", and that the measure is a *relative* metric.
- **Auditing game** (the Marks et al. RM-sycophancy organism; see `model-organisms/`):
  - With NLAs, the auditor wins 12–15% of runs without training-data access, vs <3% without NLAs.
  - "SAEs do not help".
  - Midpoint-layer NLAs work; later layers don't.
- **Stated limitations:**
  - Confabulation ("invent[s] details").
  - The AV can infer beyond the activation.
  - Cost: several hundred tokens per activation.
  - A degenerate optimum: the AV could copy the context verbatim, or produce "seemingly interpretable" text the AR can invert.

## Prerequisites
Residual stream · autoencoders and SAEs · FVE/MSE · RL for LMs + KL regularization · activation injection (Patchscopes,
SelfIE) · LatentQA/activation oracles (the supervised sibling) · model organisms and auditing games.

## Misconceptions and overclaims
- "The NLA text is what the model thinks." It is a reconstruction-optimized code that is *often* plausible.
- "FVE 0.7 means 70% of the explanation is correct." FVE measures vector reconstruction. Zhang & Turner found an
  implausibly initialized NLA at ~0.68 FVE vs 0.70, with 0.7% vs 7.6% plausible claims.
- "16% eval awareness means the model believes it's being tested 16% of the time." That's not calibrated.
- "NLA = activation oracle." AOs are *supervised* QA. NLAs are *unsupervised* reconstruction.

## Open questions (mostly from LW comments)
- A context-inversion confound: the AV may recover the preceding tokens rather than the computation.
- Warm-start bias: the explanations may just be "text Claude might output".
- Anthropomorphic ontology.
- Steganography, if NLAs are used as a training signal.
- Greenblatt found nothing like an internal chain of thought for single-pass math on Gemma-3-27B NLAs.

## Explainer notes
The central *visceral* image is **the bottleneck**: a vector goes in, words come out, a vector comes back, and there's a
score on how close it came back. The key lesson is the gap between "reconstructs well" and "is true". Zhang & Turner's
implausible-but-high-FVE result is the perfect foil.
