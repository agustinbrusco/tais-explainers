# Foundations

> **Last reviewed:** 2026-09-25 · Compiled by the research agent. arXiv metadata was re-checked against arXiv.
> These are the prerequisites that cut across every topic in the series.

| concept | reference | where |
|---|---|---|
| Residual stream, QK/OV circuits, induction heads | Elhage et al., "A Mathematical Framework for Transformer Circuits", Anthropic, 2021. https://transformer-circuits.pub/2021/framework/index.html | web |
| Logit lens | nostalgebraist, "interpreting GPT: the logit lens", LW, 2020. https://www.lesswrong.com/posts/AcKRB8wDpdaN6v6ru | web |
| Tuned lens | Belrose et al., 2023-03-14 | `arxiv:2303.08112` |
| Future lens | Pal et al., "Future Lens: Anticipating Subsequent Tokens from a Single Hidden State", 2023. https://arxiv.org/abs/2311.04897 | not fetched |
| Linear representation hypothesis | Park, Choe, Veitch, 2023-11 (ICML 2024) | `arxiv:2311.03658` |
| Linear relation decoding (a Jacobian-based precursor of the J-lens) | Hernandez et al., 2023-08 | `arxiv:2308.09124` |
| Superposition | Elhage et al., "Toy Models of Superposition", 2022. https://transformer-circuits.pub/2022/toy_model/index.html | web |
| SAEs / dictionary learning | Bricken et al., "Towards Monosemanticity", 2023. https://transformer-circuits.pub/2023/monosemantic-features/index.html. Templeton et al., "Scaling Monosemanticity", 2024. https://transformer-circuits.pub/2024/scaling-monosemanticity/index.html. Cunningham et al., 2023, https://arxiv.org/abs/2309.08600 | web |
| Linear probes | Alain & Bengio, 2016 | `arxiv:1610.01644` |
| | Belinkov, "Probing Classifiers", 2021. https://arxiv.org/abs/2102.12452 | not fetched |
| Activation steering | Turner et al., ActAdd, 2023 | `arxiv:2308.10248` |
| | Zou et al., "Representation Engineering", 2023. https://arxiv.org/abs/2310.01405 | not fetched |
| Attribution graphs (the *spider* two-hop, poetry planning) | Lindsey, Gurnee, Ameisen et al., "On the Biology of a Large Language Model", 2025-03-27. https://transformer-circuits.pub/2025/attribution-graphs/biology.html | web |
| Introspection / concept injection | Lindsey, "Emergent Introspective Awareness in Large Language Models", 2025. https://transformer-circuits.pub/2025/introspection/index.html | web |

## Explainer notes
The pilot, "reading the residual stream", covers the logit lens → the tuned lens, and sets up the J-lens (J = I is the
logit lens) and the injection-based readers (Patchscopes → AOs, NLAs). GPT-2 small and Pythia run on CPU with
TransformerLens, so the logit and tuned lens visuals can be `real`.
