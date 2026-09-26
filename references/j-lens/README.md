# J-lens and J-space

> **Last reviewed:** 2026-09-25 · Compiled by the research agent. arXiv metadata was re-checked against arXiv.
> ✓ = a number checked against the paper text (`papers/2607.15495.txt`). Re-read the source before any claim goes into a claims ledger.
> **This is after Claude's training data**, so rely only on the sources.

## What it is
The **J-lens** (Jacobian lens) is a per-layer linear readout. It carries a residual-stream vector at layer ℓ into
final-layer coordinates using the **average input–output Jacobian**, then decodes it with the model's own unembedding.
The result is a ranked list of tokens the activation is, on average across contexts, "disposed to make the model say",
now or later. Each vocabulary token gets a layer-ℓ "J-lens vector".

The **J-space** is the set of points expressible as a *sparse nonnegative combination* of J-lens vectors, typically with
k ≤ ~25 active. The paper argues this set behaves like a "global workspace": it is reportable, deliberately
controllable, carries silent intermediate reasoning, and is broadcast widely.

**Name collisions to warn about:**
- **Jacobian SAEs** (Farnik et al., ICML 2025, `arxiv:2502.18147`) are a different method.
- **JEPA "joint-embedding space"** is unrelated.
- Third-party "jspace" repos and sites are not Anthropic's.

## Primary sources
- Gurnee, Sofroniew, Pearce, … Batson, Lindsey. **"Verbalizable Representations Form a Global Workspace in Language
  Models."** Anthropic, 2026-07-06. https://transformer-circuits.pub/2026/workspace/. arXiv `2607.15495` (v1 2026-07-16).
- Blog: "A global workspace in language models", https://www.anthropic.com/research/global-workspace
- Code (Apache-2.0, "reference implementation, not maintained"; open-weights HF decoders, Qwen examples):
  https://github.com/anthropics/jacobian-lens
- Interactive: https://www.neuronpedia.org/jlens
- LW linkpost with substantive comments: https://www.lesswrong.com/posts/3PaLrzxagpbnNtPLT/a-global-workspace-in-language-models

## Follow-ups and critique
- Neel Nanda, "A Review of Anthropic's Global Workspace Paper", LW, 2026-07-06. https://www.lesswrong.com/posts/zFJ3ZdQwrTWE9jT5S
- Zvi, "No Space Like J-Space", LW, 2026-07-07. https://www.lesswrong.com/posts/EnxHPxJT4Xin5cTsX
- D. Louapre, "J-Space: Yet Another LLM Mind Reader?", HF blog, 2026-07-13, with a Gemma-3-4B demo. https://huggingface.co/blog/dlouapre/j-space
- Yan et al., "Short Horizons and Sparse Concepts: a Mathematical View of the Readout in the J-lens", 2026-08-26. `arxiv:2608.25347`
- Gong & Wang, "The First Token Is a Clue: Verbalizing Multi-Token Concepts from the J-lens", 2026-08-31. `arxiv:2608.31084`
- Precursor cited by the paper: Hernandez et al., "Linearity of Relation Decoding", 2023 (`foundations/`, `arxiv:2308.09124`)

## Key claims to get right
- **Definition.** J_ℓ = E[∂h_final,t′ / ∂h_ℓ,t].
  - The expectation runs over the source position t, all subsequent positions t′, and "a corpus of one thousand prompts
    sampled from a pretraining-like distribution" ✓.
  - The result is one d_model × d_model matrix per layer. The lens is lens_ℓ(h) = unembed(J_ℓ h).
  - It is estimated by **averaging Jacobians**, not trained against an output-matching objective.
  - *Derived (ours):* the J-lens vector for token v is J_ℓᵀ u_v.
- **The logit lens is the special case J_ℓ = I.** Per the paper, the logit lens captures much of the same structure,
  "with somewhat lower reliability (particularly in earlier layers)".
- **Tuned lens contrast.** The tuned lens is trained to match outputs ("correlational rather than causal"). It tends to
  "skip ahead" to the output on unverbalized-intermediate prompts.
- **J-space is not a vector subspace.** It is a union of k-sparse nonnegative cones, found by gradient pursuit, and k is
  a free parameter.
- **It explains a small share of variance:** "never more than 10%" at any layer ✓, with "tens of concepts at a time".
- **Verbal-report swap** ("think of a {category}"): the swap target reaches the top-5 on 88% of trials with pure J-lens
  vectors ✓, on 59% with the J-space component of concept vectors ✓, and on only ~5% with the non-J-space component.
- **Silent multi-hop reasoning.** "Legs on the animal that spins webs" puts *spider* in the J-lens without it ever being
  said. Swapping the intermediate flips the answer in 54% of trials on Haiku 4.5, 70% on Sonnet 4.5, and 70% on Opus 4.5 ✓.
- **Layer structure:** "sensory" (early), "workspace" (middle, ~38–92 on a normalized 0–100 depth), and "motor" (late).
- **Models:** Claude Sonnet 4.5 by default, with key results on Haiku 4.5 and Opus 4.5, and some on Opus 4.6.
- **Safety case studies:**
  - In a blackmail honeypot, strategic concepts (*leverage*, *manipulation*) and *panic* surface.
  - Eval-awareness tokens (*fake*, *fictional*) surface early. Ablating them "can surface malicious propensities that
    were otherwise concealed".
  - In model organisms, the J-lens surfaces *reward* and *bias*.
- **Counterfactual reflection training** implants ethical concepts into the J-space. Ablating those concepts "largely
  reverts" the behavioral improvement.
- **Disclaimers:**
  - "We take no position" on phenomenal consciousness; access consciousness is functional only.
  - The authors don't claim the full global-workspace architecture: there are no separable input processors, and
    broadcast happens within one forward pass.
- **The spectrum:** the J-lens sits at the "cheap-and-grounded end". Patchscopes, AOs and NLAs articulate multi-token
  concepts, but at a higher cost and with more confabulation risk.

## Prerequisites
Residual stream · logit lens and tuned lens · Jacobians and linearization · the linear representation hypothesis ·
superposition and SAEs · steering and patching · concept-injection introspection (Lindsey 2025) · multi-hop findings from
attribution graphs.

## Misconceptions and overclaims
- "J-space is a subspace or basis of thought." It is sparse cones, relative to the lens and k, covering ≤ 10% of variance.
- "It reads everything the model thinks." It sees only **single-token** concepts, only what is "poised for
  verbalization", and it is a first-order average.
- "It proves consciousness." The authors explicitly disclaim this.
- "It's unrelated to the logit lens." The paper calls it "a principled refinement of the logit lens".
- "*fake* in the lens proves the model believes it's being tested." The lens is a hypothesis generator, and Nanda expects "many
  false positives". Swap results also have a boring alternative explanation: steering the model toward or away from saying a token.

## Open questions
- What gates entry into the J-space? (The authors say it's unknown.)
- Is it a workspace, or a buffer for tokens that may soon be emitted?
- Replication on open models: Nanda's group reports a partial replication on Qwen 3.6 27B (multilingual and typo
  tasks replicated; poetry and arithmetic did not). This is not independently checked.
- Multi-token concepts (Gong & Wang) and the theory of the readout (Yan et al.).
- Goodharting risk if the J-space is used in training or for steering.

## Explainer notes
Excellent **interactive** material, and it can use **real data**: the reference code runs on open-weights models. On CPU
that means a small model, so check which sizes are feasible. The natural running example is the *spider* two-hop, with
a layer slider comparing the logit lens, the tuned lens and the J-lens.
