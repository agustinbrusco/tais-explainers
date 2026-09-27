# Explainers

## Proposed series: *reading minds, and checking we read them right*

The four requested topics form one argument:

- **Today** we can often read what a model is thinking because it thinks out loud, in text.
- **That window may be closing**: optimization pressure teaches obfuscation, controllability is rising, and latent-reasoning
  architectures are being explored (a deployed frontier model is rumored to be one).
- **So we build readers of activations**: lenses, oracles, autoencoders.
- **And we test those readers** on models built to hide something.

| # | slug | promise | format | status |
|---|---|---|---|---|
| 1 | `cot-monitorability` | **How Many Steps Fit in the Dark?** Find the longest dark path in a computation graph, and use it to predict when reading the CoT can catch a plan. Includes Astra and the Hugging Face incident, with confirmed and rumored claims kept apart. RL mini-primer inside. | web (video deferred) | **delivered** (iteration 4, 2026-09-26): 26 steps, real gelu-4l states, reviewed |
| 1b | `probes` | **A Ruler Through the Glass.** Linear probes on real activations: make one (four examples suffice; random labels fit too), learn what it actually reads (it reads negations upside down), push the model with it (the best reader isn't the best handle), and deploy it as a monitor (AUROC isn't an operating point; pooling decides what RL can evade). | web | **brief agreed** 2026-09-26; claims and script next |
| 2 | `saes` | *Test your intuitions.* The learner already has an intuitive grasp of SAEs, so this is predict-then-reveal challenges: toy superposition you train in the browser, then where SAEs fail (splitting, absorption, geometry they miss). | web | proposed |
| 3 | `j-lens` | Logit lens → tuned lens → J-lens, opening where Welch Labs' residual-stream video leaves off. See *spider* light up inside a model that never says "spider", and what the J-lens can't see. | web | proposed |
| 4 | `readers-that-talk` | Activation oracles vs NLAs: supervised vs unsupervised readers, and why "reconstructs well" ≠ "is true". Opens with a KL-divergence mini-refresher. | web + short video | proposed |
| 5 | `model-organisms` | The lab bench: build a model with a hidden objective, then play the auditor with the tools from 2–4. | web (game) | proposed |

**Not re-made (watch these instead):** the residual stream, in Welch Labs' "The most cited paper of the century is a
brilliant hack" (2026-08-31).

Order and scope are open. Start any new piece from `kit/PLAYBOOK.md`, which holds what the first piece taught.
