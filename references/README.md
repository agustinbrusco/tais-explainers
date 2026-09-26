# References

One folder per topic. Each has:

- `README.md`: the dossier (what it is, primary sources, key claims *with locations*, prerequisites,
  misconceptions, open questions). Built with the `research` skill.
- `sources.yaml`: the source list, tracked. `uv run scripts/fetch_paper.py <arxiv-id> --topic <topic>` adds to it.
- `papers/`: PDFs + extracted text, gitignored. On a fresh clone, run `uv run scripts/fetch_paper.py --restore`.

A source is marked `read: true` only once its relevant sections have actually been read, not just the abstract.
Verification tags in dossiers: **[verified-opened]** means the source was opened and checked, **[search-result-only]**
means it's located but not yet read.

## Topics

| topic | what it covers | sources |
|---|---|---|
| [foundations](foundations/) | residual stream, logit and tuned lens, linear representations, probes, SAEs, steering, attribution graphs, neural geometry | 12 |
| [j-lens](j-lens/) | Anthropic's Jacobian lens and "global workspace" J-space (2026-07), with critiques and follow-ups | 10 |
| [activation-oracles](activation-oracles/) | LLMs that answer questions about activations; lineage SelfIE → Patchscopes → LatentQA → AOs | 8 |
| [natural-language-autoencoders](natural-language-autoencoders/) | activation → text → activation, trained unsupervised with RL (2026-05); faithfulness critiques | 6 |
| [model-organisms](model-organisms/) | building misaligned models on purpose, and auditing them: sleeper agents → AuditBench | 17 |
| [cot-monitorability](cot-monitorability/) | reading the chain of thought; obfuscation; latent / looped / diffusion architectures; GPT-6 Astra; the Hugging Face incident | 43 |
| [craft](craft/) | how the best explainers *show* things (Goodfire, …): lessons to reuse | n/a |

## Sources to watch

Check these for newer work **before finalizing any dossier or script**. This field moves weekly, and a dossier compiled
from search results alone missed the most important posts once already (2026-09-25).

- **Redwood Research blog**: https://www.redwoodresearch.org/blog (CoT monitorability, opaque serial depth, control,
  incidents). Older posts live at blog.redwoodresearch.org.
- **Goodfire research**: https://www.goodfire.com/research (interpretability, neural geometry, activation monitors).
  Also a craft exemplar.
- **LessWrong / Alignment Forum**: https://www.lesswrong.com, https://www.alignmentforum.org (fast-moving empirical posts
  and the critiques in their comments).
- **Lab safety publications**:
  - Transformer Circuits (https://transformer-circuits.pub) and the Anthropic Alignment blog (https://alignment.anthropic.com).
  - OpenAI's Deployment Safety Hub (system cards, https://deploymentsafety.openai.com) and alignment blog (https://alignment.openai.com).
  - GDM (https://deepmind.google, https://institute.deepmind.com).
- **Evaluators and incident reports**: METR (https://metr.org/blog), Apollo Research (https://www.apolloresearch.ai).
- **Interactive tools**: Neuronpedia (https://www.neuronpedia.org) for J-lens and NLA demos.

All dossiers were compiled 2026-09-25. All arXiv metadata was checked against arXiv, and a sample of headline numbers
was checked against paper text (marked ✓). Every other claim is re-read from its source before it enters a claims ledger.
