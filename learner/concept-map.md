# Concept map

Status: `·` not started · `~` exposed · `✓` can explain it back · `★` can use it / critique it

Each explainer declares which nodes it needs and which it unlocks, and the map gets updated after every
delivered piece. All statuses stay `·` until `profile.md` is filled in, and some foundations will start at `✓`.

```mermaid
graph LR
  RS[residual stream] --> LL[logit lens] --> TL[tuned lens]
  RS --> LRH[linear representations] --> SAE[superposition & SAEs]
  RS --> PROBE[linear probes]
  RS --> PATCH[patching & steering]
  JAC[Jacobians / linearization] --> JL
  LL --> JL[J-lens & J-space]
  TL --> JL
  SAE --> JL
  PATCH --> INJ[activation injection / Patchscopes] --> AO[activation oracles] --> NLA[NLAs]
  PROBE --> AO
  FT[SFT / RL / SDF basics] --> MO[model organisms] --> AUD[auditing games]
  JL --> AUD
  AO --> AUD
  NLA --> AUD
  AR[reasoning models & CoT] --> MON[CoT monitorability] --> OBF[obfuscation under pressure]
  MON --> ARCH[latent / recurrent / diffusion architectures] --> OSD[opaque serial depth]
  OSD -. "when the text goes away" .-> JL
  OSD -.-> AO
```

| concept | status | needs | covered by |
|---|---|---|---|
| residual stream | · | transformer forward pass | `residual-stream-lenses` |
| logit lens → tuned lens | · | residual stream, unembedding | `residual-stream-lenses` |
| linear representations, SAEs | · | residual stream | (background) |
| Jacobians / linearization | · | multivariable calculus | `j-lens` |
| J-lens & J-space | · | logit/tuned lens, Jacobians, SAEs | `j-lens` |
| activation injection → activation oracles | · | patching, probes, SFT | `readers-that-talk` |
| NLAs | · | AOs, autoencoders/FVE, RL+KL | `readers-that-talk` |
| model organisms, auditing games | · | SFT/RL/SDF, the readers | `model-organisms` |
| CoT monitorability | · | reasoning models, RL | `cot-monitorability` |
| latent architectures, opaque serial depth | · | CoT monitorability | `cot-monitorability` |
