# Activation Oracles (AOs)

> **Last reviewed:** 2026-09-25 · Compiled by the research agent. arXiv metadata was re-checked against arXiv.
> ✓ = a number checked against the paper text (`papers/2512.15674.txt`). Re-read the source before any claim goes into a claims ledger.

## What it is
An Activation Oracle is an LLM, typically a fine-tuned copy of the *same base model* as the target, trained to take
another model's residual-stream activations as input and **answer arbitrary natural-language questions about them**. This is
the LatentQA setup, studied from a generalist angle: far out-of-distribution evaluation, and how performance scales with
training-data diversity. **They are not probes or classifiers:** they are generative QA models.

## Primary source
- Karvonen, Chua, Dumas, Fraser-Taliente, Kantamneni, Minder, Ong, Sen Sharma, Wen, Evans, Marks. **"Activation Oracles:
  Training and Evaluating LLMs as General-Purpose Activation Explainers."** 2025-12-17. `arxiv:2512.15674`.
  AF post: https://www.alignmentforum.org/posts/rwoEz3bA9ekxkabc7

## Lineage (all in `sources.yaml`)
1. **SelfIE** (Chen, Vondrick, Mao, 2024-03, `2403.10949`): the model interprets its own embeddings through a prompt.
2. **Patchscopes** (Ghandeharioun et al., 2024-01, `2401.06102`): patch a hidden state into an inspection prompt. This unifies
   vocabulary-projection methods.
3. **LatentQA / LIT** (Pan, Chen, Steinhardt, 2024-12, `2412.08686`): fine-tune a decoder on (activation, QA) pairs.
4. **Activation Oracles** (2025-12).
5. Siblings: Cycle-Consistent AOs (Chalnev, 2026-03), and **NLAs** (2026-05, unsupervised; see `natural-language-autoencoders/`).

## Follow-ups
- Bauer et al., "Building Better Activation Oracles", 2026-05-23, `2606.02609`.
  - Changes: on-policy rollouts, more layers, a modified injection.
  - "Modest" capability gains.
  - Releases **AObench**.
  - Flags hallucination and **text-inversion** confounds.
- Bersia & Gaintseva, "When Activation Oracles Learn Not to Read", 2026-07-25, `2607.23379`. Fine-tuned AOs can become
  concept-specific "anti-readers": the information stays decodable, but the readout fails.
- Shenoy et al., "Introspection Adapters", Anthropic Alignment blog, 2026-04-28. https://alignment.anthropic.com/2026/introspection-adapters/
  On AuditBench, IA scores 59% vs 53% for the next-best method vs 44% for the best white-box method (an AO).
- Mentioned in the Claude Opus 4.6 system card (search-result only, unverified).

## Key claims to get right
- **Injection.**
  - Activations are added "after the second transformer layer" at placeholder " ?" positions, norm-matched:
    h′ = h + ‖h‖·v/‖v‖.
  - Sources are taken at 25/50/75% depth, with 50% the eval default.
  - The prompt states the source layer.
- **Training mix:** about 1M examples (~65M tokens).
  - System-prompt QA.
  - 7 binary classification tasks.
  - Self-supervised **context prediction** (the text before or after the position).
- **Self-interpretation.** Trained on the base instruct model's activations, the AO is applied to *fine-tuned variants*
  "without any additional training on the fine-tuned variants".
- **Headline:** "match or exceed white-box baselines on all four tasks and the best overall baseline on 3 of 4."
  - Taboo secret word: 21% vs 4% for the best interpretability baseline ✓ (Gemma-2-9B-IT).
  - Secret Side Constraint: 59% vs 52% ✓ (Llama-3.3-70B).
  - EM audit: comparable to the activation-difference-lens baseline (~2/5).
  - PersonaQA: ~5% → ~14% for open models, and 35% for Haiku 3.5.
- **Stated limitations:**
  - Black-box QA "sacrifices the ability to drill down into mechanisms".
  - Uncalibrated: it answers even when unsure.
  - Evaluated only on narrow fine-tunes.
  - Expensive.
  - May confabulate.

## Prerequisites
Residual stream · linear probes (the baseline) · logit lens and SAEs (white-box baselines) · activation patching and
injection · LoRA/SFT · the secret-elicitation model organisms (Taboo, user gender, SSC: Cywiński et al., `model-organisms/`,
`2510.01070`) · emergent misalignment.

## Misconceptions and overclaims
- "AOs are probes." They are generative LLMs answering open questions.
- "AO answers are mechanistic explanations." The QA interface explicitly trades mechanism away for convenience.
- "The answers are grounded in the target's state." Not guaranteed: text inversion and learned blind spots undercut this.
- "AO = the model introspecting." It's a separately fine-tuned reader, unlike native introspection (Lindsey 2025) or introspection adapters.

## Open questions
Calibration · evaluation confounds (AObench) · generalization to realistic post-training changes · the **tool-to-agent
gap**: standalone wins that don't transfer to agentic audits (AuditBench).

## Explainer notes
Pair AOs with NLAs as **supervised vs unsupervised readers**, and place both beside the J-lens on the cost/grounding
spectrum. The Taboo organism, a model hiding a secret word, is a great running example: concrete, playful, and it has
ground truth.
