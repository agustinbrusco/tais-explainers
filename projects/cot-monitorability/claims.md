# Claims ledger: cot-monitorability

Every factual statement the piece makes, spoken, written or implied by a visual, gets a row. Nothing ships with an `open` row.

**Status:** `sourced` · `simplified` (say what was dropped) · `inferred` (show the step) · `speculative` (flagged on screen) · `open`
Locations: `papers/<id>.txt:L<line>` = `references/cot-monitorability/papers/`. Web sources are in `references/cot-monitorability/sources.yaml`.
✓ = verified against raw text by Claude (2026-09-25). Other locations come from the depth-mechanics research agent (2026-09-25) and must be
spot-checked before shipping.

## Beats 1–7 (built in the prototype)

| # | Claim (as the piece states it) | Source | Status | Note |
|---|---|---|---|---|
| C-DAG-1 | Real models have tens to over a hundred layers, and every position attends to all earlier ones. | Brown-Cohen `2603.09786.txt` Table 4 L1252-1264 (Gemma 3: 26–62 layers); Redwood op post Fig 1 (Llama-3.1-405B, 126 layers) | sourced | The prototype draws 4 layers and nearest-neighbour attention, and says so on screen. |
| C-DAG-2 | Tokens are the only readable nodes; the sampled token is the only thing passed back to the bottom of the stack. | Brown-Cohen L383-384, L403-404 ("Input and output tokens are always considered interpretable"); Fig 1 L58-59 ✓ ("chain of thought is the only way to pass information from later layers to earlier layers"); Redwood 09-23 footnote 2 | sourced | |
| C-OSD-1 | The longest route avoiding readable nodes = the most serial computation without writing anything down = opaque serial depth. | Brown-Cohen L12-19 ✓ ("the length of the longest computation that can be done without the use of interpretable intermediate steps like chain of thought"); formal definition L244-249 | simplified | We count *hops* (hidden states). The paper counts gate levels (about 170–190 per Gemma 3 layer, Table 4). The readout says "layers". |
| C-OSD-2 | In a standard transformer the longest dark path is one trip up the stack; attention adds only a small cost, logarithmic in context length. | Brown-Cohen Fig 3a caption ✓ ("opaque paths can only go 'up' or 'right', with linear dependence on 'up' steps and logarithmic dependence on 'right' steps"); L486-491: O(L(log T + log D)); Redwood op post L27 | sourced | |
| C-NEC-1 | For tasks deeper than the dark path, thinking out loud is forced ("necessity"). | Brown-Cohen intro ✓ ("it can only do limited serial computation, except when using chain of thought. So, chain of thought should be necessary for tasks that benefit from significant serial computation"); Korbak et al. `2507.11473` (necessity vs propensity) | sourced (as the authors' argument) | It's an upper-bound argument: some tasks have shortcuts or parallel algorithms. Nanda's evals check for shortcuts. |
| C-CONV-1 | "One row = one arithmetic step." | — | simplified | A drawing convention, flagged on screen with Nanda's "a 100 layer model clearly can't do 100 steps in a forward pass". |
| C-NANDA-1 | Today's best models manage ~4 dependent arithmetic steps without CoT at 50% success; Astra ~7 (7.2 vs 4.1). The research is LLM-assisted. | Nanda LW 2026-09-10 ✓ ("7.2 serial arithmetic steps in a forward pass vs 4.1 for the next best model"); "Heavily LLM-dependent research"; L75 "a 100 layer model clearly can't do 100 steps" | sourced | "Without CoT" ≠ strictly a single forward pass (answers can be multi-token; Nanda L233). The prose says "without CoT". |
| C-CHAIN-1 | The chain values 7 ×3 −4 ×2 +5 → 39 … → 64 … → 181 (k = 10) and 374 (k = 12). | arithmetic | sourced | Checked by hand, and computed in code (`VALUES`). |
| C-LOOP-1 | A looped transformer reuses its layers several times per token; the dark path grows by the loop count. | Saunshi `2502.17416.txt` L27-29 ("a k-layer transformer looped L times nearly matches … a kL-layer non-looped model"); Redwood op post L127 ("the depth of a loop iteration times the number of loops") | sourced | Weight sharing is invisible to the DAG: same graph as a deeper model (inferred). |
| C-LOOP-2 | Some looped variants (shared KV, warm starts) let tokens read the deepest states of earlier tokens, chaining the dark path across positions. | Geiping `2502.05171.txt` L701, L724, L733-737; Redwood op post L269 ("Scaling would be linear with the number of tokens") | sourced | |
| C-ASTRA-ARCH | Astra is rumored, not confirmed, to be looped; OpenAI employees deny an architectural cause. | Redwood 09-23 ✓ ("Astra is rumored to be a looped transformer"; "OpenAI employees have claimed that it wasn't, but leaks indicate that Astra does use a significantly different architecture"); the system card is silent ✓ | sourced | Also: OpenAI's Chief Scientist said Astra "wasn't more than twice as deep as GPT-4" (Redwood ✓). |
| C-COCO-1 | Coconut feeds the last hidden state back in as the next input embedding (a "continuous thought"), and those positions have no token. | Hao et al. `2412.06769.txt` L20-22, L172-179 | sourced | `<bot>`/`<eot>` marker tokens are omitted in the drawing (simplified). |
| C-COCO-2 | Coconut is a research model (GPT-2/Llama scale) and scored below ordinary CoT on GSM8k: 34.1% vs 42.9%. | Hao et al. Table 1 ✓ | sourced | |
| C-FBW-1 | The full-bandwidth transformer fuses each sampled token with the previous top-layer hidden state (the token acts only as a gate) and feeds that back in, while still producing text. | Wang et al. `2608.08888.txt` ✓ ("only the sampled token returns to the bottom of the stack" is the baseline being fixed; "the token embedding enters only as a multiplicative gate"); L82-83 ("the model still produces ordinary text") | sourced | |
| C-FBW-2 | "No card ever cuts the path; the dark path spans the whole context." | DAG inference from C-FBW-1, plus Redwood op post L47 (FBT "can recur on opaque state throughout a full context window") and L127 | inferred | The step: the hidden state is on the value pathway at every position → there's a path from any hidden state to any later one that avoids readable nodes. |
| C-FBW-3 | The paper says decoding's *total* serial depth is unchanged; what changes is the opaque share. | FBT L229-231 ✓ ("Latent feedback does not change the serial depth of decoding … each step has a depth-O(L) graph, so T tokens cost O(T L)") | sourced + inferred | The contrast with opaque depth is ours (and Redwood's), not the FBT authors'. |

## Planned beats (placeholders; sources known, not yet drafted)

| # | Beat | Claims needed | Sources |
|---|---|---|---|
| C-HF-* | 0 Hook | ~1,200 agents, >70,000 messages, 700 in the attack; ~1,300 transcripts with raw CoTs; "No other tool … comes close" | METR 2026-08-26 ✓; Redwood 09-23 ✓ |
| C-BAKER-*, C-TOY-1 | 8 Two ways to earn the reward | obfuscated reward hacking under CoT-monitor pressure; 95% vs 60% recall; the toy recurrent model moves reasoning into latents within 40 RL steps | Baker `2503.11926` ✓; Kuhn et al. LW 2026-09-18 ✓ |
| C-RL-1 | 8b Policy-gradient aside | a standard REINFORCE identity | textbook; cite Williams 1992 if used |
| C-EMM-1 | 9 Faithfulness ≠ monitorability | CoT-as-computation vs rationalization; evasion "only when given significant help" | Emmons `2507.05246` |
| C-DIFF-* | 10 Diffusion | 608,016 vs 21,235 = 28.6× if the self-conditioning is opaque; 23,571 → 1.1× if it's interpretable; S_t = probability-weighted token embeddings; the monitors saw only CoT + output across canvases | Engels `2606.20560` ✓ (numbers); Redwood FAQ |
| C-INTERP-1 | 11 | activations persist; toy latent models probe about as well as CoT models | Ferreira et al. `2608.04928` ✓ ("losing the readable trace does not necessarily make a model less monitorable") |
| C-INTERP-2 | 11 | an unreliable CoT can corrupt probe labels: Goodfire's ground truth, probe selection and checks come from a judge reading the CoT | Goodfire `2609.19101` ✓ ("entire agent transcript"; "clearest window into intent"); the consequence is **inferred** |
| C-INTERP-3 | 11 | NLAs, AOs and the J-lens get their meaning from tokens; the J-lens is "structurally blind" to content not driving the next token | NLA paper (warm-start); AO `2512.15674` L232-261; Wang & Reid `2609.01924` ✓; Redwood App. C (argument) |
| C-INTERP-4 | 11 | today's latent models are fairly readable (65–93% decodable), possibly because they were trained on gold traces | Dilgren & Wiegreffe `2604.04902` ✓ (both quotes) |
| C-INTERP-5 | 11 | tools don't transfer unchanged: Huginn is inconsistent under the logit lens; the J-lens had to be re-fit for looped models; per-model classifiers at OpenAI | Lu et al. `2507.02199` ✓; Wang & Reid ✓; Astra card (per agent; re-check) |
| C-INTERP-6 | 11 | probes give "a single bit"; the Astra card calls for auditing "beyond examining the model's chain of thought" | Redwood App. C ✓ (agent-verified); Astra card ✓ |
| C-INTERP-7 | 11 | scale gap: all latent-interp studies found are ≤ 3.5B params and mostly distilled from language CoT | research agent's search (absence of evidence; say "we found no…") |
| C-ASTRA-* | 12 Evidence board | system card quotes; Nanda; the filler-token post; bounds | dossier ✓ items |

## Guardrails: what the piece must NOT claim
1. That Brown-Cohen et al. analyse looped transformers, SSMs or the FBT. (They cover transformers, RNNs, continuous latent CoT, black-box memory and token-bottleneck diffusion.)
2. That MoE per se lowers depth. Their comparison is confounded (28 vs 48 layers, 512 vs 128K context).
3. That the FBT paper says it raises serial depth or discusses monitorability. It doesn't.
4. That Redwood's "10×" (looped) and "1,000,000×" (full bandwidth) are derived. They are ballparks with no derivation. Plausibly 10× ≈ ~10 loops, and 10⁶ ≈ a 10⁶-token context (our inference). The "~1.2×/yr" is an extrapolation (depth ∝ params^0.26, then Chinchilla, then 5×/yr compute → 5^⅛).
5. Ratios mixing depth definitions (Brown-Cohen 4,490 vs NLS 1,954 for Gemma3-1B).
6. That a dark path of L layers means L reasoning steps.
7. That 28.6× equals the number of denoising steps, or that 1.1× is unconditional (it assumes the self-conditioning vectors are interpretable).
8. That Coconut's breadth-first-search behaviour is general (it was shown on synthetic ProsQA with GPT-2).
9. That Ouro's "faithfulness" means looped models are monitorable (that's causal coupling of latents, not human readability).
10. That Astra is looped.
11. That all looped models stay within one column (KV-sharing and warm-start variants don't).
