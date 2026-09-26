# Claims ledger: cot-monitorability

Every factual statement the piece makes, spoken, written or implied by a visual, gets a row. Nothing ships with an `open` row.

**Status:** `sourced` · `simplified` (say what was dropped) · `inferred` (show the step) · `speculative` (flagged on screen) · `open`
Locations: `papers/<id>.txt:L<line>` = `references/cot-monitorability/papers/`. Web sources are in `references/cot-monitorability/sources.yaml`.
✓ = verified against raw text by Claude (2026-09-25). Other locations come from the depth-mechanics research agent (2026-09-25) and must be
spot-checked before shipping.

## Built in the prototype (steps 1–11; step numbers are 1-based as on screen)

Web sources are quoted by anchor text, not line numbers (there is no local copy): "Redwood op" = LW "An operationalization
of opaque serial depth" (`lw:nls-depth`); "Redwood 09-23" = "Latent reasoning architectures would undermine CoT…".
The rigor-reviewer re-checked every location below on 2026-09-26; ✓ means verified against the raw text.

| # | Claim (as the piece states it) | Source | Status | Note |
|---|---|---|---|---|
| C-DAG-1 | Real models have dozens of layers (around a hundred at most in open models); positions attend to many earlier ones (all of them in global-attention layers). | Brown-Cohen `2603.09786.txt` Table 4 L1252-1264 ✓ (Gemma 3: 26/34/48/62 layers; 22 sliding-window + 4 global blocks in 1B, L1260-1261 ✓); Redwood 09-23 fn 2 ✓ ("somewhere around 100 layers at most in open source models") | sourced | Drawn: 4 layers, nearest-neighbour attention; said on screen. |
| C-DAG-2 | "We treat the tokens as the only readable nodes"; the sampled token is what returns to the bottom of the stack. | Brown-Cohen L383-384, L403-404 ✓ ("Input and output tokens are always considered interpretable"); L254-256 ✓ (the interpretable set is "user-specified"); Fig 1 L58-59 ✓ | sourced | Framed as a modelling choice; the piece notes probes and lenses read hidden states partly. |
| C-OSD-1 | The longest route avoiding readable nodes = the most serial computation without writing anything down = opaque serial depth. | Brown-Cohen L12-19 ✓; formal definition L244-249 ✓ | simplified | On screen: the formal version counts elementary operations (about 170–190 per Gemma 3 layer, Table 4 ✓) and is an upper bound; we count hidden states. |
| C-OSD-2 | "Every attention hop also climbs a layer, so a zig-zag … tops out at 4 too"; sideways steps add a small cost, logarithmic in the context length. | Brown-Cohen Fig 3a caption ✓ ("opaque paths can only go 'up' or 'right', with linear dependence on 'up' steps and logarithmic dependence on 'right' steps"); L486-491 ✓ O(L(log T + log D)) | sourced | The zig-zag route is computed on the drawn graph (attention edges go from row r to r+1). |
| C-PROF-1 | The numbers above the graph are the longest dark path reaching the top of each column; their maximum is the readout. | DP on the drawn graph (`longestDarkPath(...).depth`) | inferred | Coconut: 12 persists for a few columns after the last thought because attention climbs diagonally from its deep states (on screen). |
| C-NEC-1 | For tasks deeper than the dark path, putting intermediate results into the text is forced ("necessity"). | Brown-Cohen intro ✓; Korbak et al. `2507.11473.txt` L88-98 ✓ (necessity vs propensity), L145-148 ✓ | sourced (as the authors' argument) | Upper-bound argument; tasks with shortcuts escape it (C-SHORT-1). |
| C-KOR-1 | "Through the text is not the same as readable": necessity guarantees 39 and 64 pass through the tokens, not that we can understand them; the same authors argue readability holds by default via a "natural language prior". | Korbak L148-151 ✓ ("This does not guarantee that we can understand that information"); L151-156 ✓ ("natural language prior") | sourced | Added after the rigor review (blocker #1). |
| C-CONV-1 | "One row = one arithmetic step." Real models *use* many layers per step. | Nanda ✓ ("A 100 layer model clearly can't do 100 steps in a forward pass!", in a sentence contrasting architectural measures with behaviour) | simplified | A drawing convention, flagged on screen. |
| C-SHORT-1 | "That's measured, not proven … a task with a shortcut can beat it. Even this chain has one, since its steps compose into a single multiply-and-add." Nanda's chains are checked for shortcuts. | Arithmetic: composing affine maps x ↦ ax + b gives an affine map; Nanda ✓ ("nudging the running value after each step … and check that there aren't any shortcuts") | inferred + sourced | Rigor review #2. |
| C-NANDA-1 | Most frontier models manage ~4 dependent arithmetic steps without CoT at 50% success; Astra ~7; "heavily LLM-dependent research", numbers depend on researcher choices. | Nanda LW 2026-09-10 ✓ ("Astra can do 7.2 serial arithmetic steps (at 50% success) compared to 4.1 for second place (Gemini 3.8 Flash and Fable 5.1)"; epistemic status ✓) | sourced | "Without CoT" ≠ strictly one forward pass (multi-token answers; Nanda ✓). |
| C-CHAIN-1 | 7 ×3 −4 ×2 +5 → 39 … → 64 … → 181 (k = 10), 374 (k = 12), 735 (k = 16). | arithmetic | sourced | By hand and in code (`VALUES`). |
| C-RULE-1 | "In the drawing's terms: … forces at least ⌈n/d⌉ − 1 intermediate results through the text." | follows from the construction (a column holds d rows) | inferred | Stated in the drawing's terms only. |
| C-HOP-1 | The question is an item from a 2026 benchmark of 4-hop questions (quoted verbatim). | Xu, Prasanna, Westover, LW 2026-09-10 ✓ | sourced | |
| C-HOP-2 | 1992 Nobel Literature → Derek Walcott; born on the 23rd; Best Actress at the 23rd Academy Awards → Judy Holliday; born on the 21st. | `wiki:derek-walcott` ✓; Nobel laureates list ✓; `wiki:23rd-academy-awards` ✓; `wiki:judy-holliday` ✓ | sourced | Decomposition first seen in a LW comment; each hop re-checked (2026-09-26). |
| C-CONV-2 | "Chained facts fare worse than arithmetic: … about half as many ('approx 2x worse') … So we draw each hop as two rows, a drawing convention." | Nanda ✓ ("Every model does worse, approx 2x worse than arithmetic steps"; Astra 3.6 facts, Gemini 3.8 Flash 2.8) | simplified | The ratio is 2.0 for Astra, ~1.5 for Gemini (4.1/2.8); the cause needn't be depth (rigor review #4). |
| C-HOP-6 | "In this drawing, only 23 … Holliday stays in the dark too"; necessity only guarantees a minimum; real limits are success rates. | chainStory on the drawn graph; Xu ✓ (Astra 10–20% without filler) | inferred | Rigor review #5. |
| C-HOP-4 | Gemini 3 Pro 60% (2-hop) and 34% (3-hop) without CoT; every model at or near chance on 4 hops; the 2- and 3-hop figures used filler tokens "1 2 3 … 300". | Greenblatt, Redwood blog 2026-01-01 ✓ | sourced | Different dataset from Xu's; "(so not a trend)" on screen. |
| C-XU-2 | On Xu's benchmark every model except Astra gets ≤ 10% beyond 2 hops. | Xu ✓ footnote ("all non-Astra models get <=10% on N-hop questions for N>2", MathJax checked in the raw HTML) | sourced | |
| C-HOP-5 | Given filler tokens (up to 4,096), Astra rises from about 10–20% to about 50% on that benchmark; others improve much less; low reasoning effort, API reports 0 reasoning tokens. | Xu ✓ | sourced | Upper end of 10–20% is 10-shot. |
| C-BIRAN-1 | In two-hop queries the first hop resolves early, the second only later; the remaining layers may lack the knowledge. | Biran `2406.12775.txt` L48-61 ✓; conclusion ✓ | sourced | Models L199-207 ✓: LLaMA 2 7B/13B, LLaMA 3 8B/70B, Pythia 6.9B/12B. |
| C-BIRAN-2 | "For 32–66% of such failures, *some* choice of a later hidden state patched back … made the answer come out right: in effect, a hand-made, partial second pass … not a practical method." | Biran L609-613 ✓ ("between 32%-66% of incorrect cases"); L602-604 ✓ (any source–target pair counts); L89-91 ✓; L681-682 ✓ ("not a practical inference method") | sourced + inferred | "Second pass" is our gloss. |
| C-FILL-1 | Filler tokens = meaningless padding between question and answer; in the plain graph they add width, not depth; they help on parallelizable problems; the authors don't explain Astra's gain. | Xu ✓ (definition; no mechanism offered); Pfau et al. `2404.15758.txt` L120 ✓ (remains in TC0), L505-506 ✓ (serial computation "incompatible with the parallel structure of filler-token compute"); DAG (attention climbs a layer) | sourced + inferred | Used in the looped step and the transfer question. |
| C-LOOP-1 | A looped transformer reuses its layers several times per token; the dark path grows by the loop count. | Saunshi `2502.17416.txt` L27-29 ✓; Redwood op ✓ ("the NLS depth is the depth of a loop iteration times the number of loops") | sourced | Weight sharing is invisible to the DAG (inferred). |
| C-LOOP-3 | "Looping turns depth into a dial": run for more loops at test time, "unrolling to arbitrary depth". | Geiping `2502.05171.txt` L16-26 ✓ ("iterating a recurrent block, thereby unrolling to arbitrary depth at test-time") | sourced | |
| C-LOOP-2 | Some looped designs let a token read the deepest states of earlier tokens, chaining the dark path across positions. | Geiping L701 ✓ ("attend to the last, deepest available KV states"), L724 ✓, L733-737 ✓, warm start L739-742 ✓; Redwood op ✓ ("Scaling would be linear with the number of tokens", about a KV cache shared across depths) | sourced | Geiping's are zero-shot inference-time variants of one model (L765-767), not separate designs; the piece says "some looped designs" generally. |
| C-ASTRA-ARCH | Astra rumored, not confirmed, to be looped; according to Redwood, OpenAI employees have denied an architectural cause. | Redwood 09-23 ✓ ("rumored to be a looped transformer"; "OpenAI employees have claimed that it wasn't"; evidence "ambiguous"); system card silent ✓ | sourced | |
| C-COCO-1 | Coconut feeds the last hidden state back as the next input embedding; those positions have no token. | Hao `2412.06769.txt` L168-179 ✓ | sourced | `<bot>`/`<eot>` omitted (simplified). |
| C-COCO-3 | "The number of thoughts is fixed in training and matched at inference; here there are two." | Hao L418-419 ✓ ("For inference, we manually set the number of continuous thoughts to be consistent with their final training stage") | sourced | Two is our drawing's choice. |
| C-COCO-2 | Coconut: research model (GPT-2/Llama scale), below ordinary CoT on GSM8k: 34.1% vs 42.9% (GPT-2). | Hao Table 1 L379/L383 ✓; Llama appendix L816-836 ✓ | sourced | |
| C-FBW-0 | "only the sampled token returns to the bottom of the stack, while the top-layer hidden state is discarded." | Wang et al. `2608.08888.txt` L19-20 ✓ | sourced | Motivation for the name. |
| C-FBW-1 | FBT fuses each sampled token with the previous top-layer state (token as a gate); the model still samples a token at every position. | FBT L167-168 ✓ ("multiplicative gate"); L82-83 ✓ | sourced | |
| C-FBW-2 | "No card ever cuts the path, and the dark path grows by a full stack with every token." | DAG inference from C-FBW-1; Redwood op ✓ ("can recur on opaque state throughout a full context window") | inferred | Latent chain runs over generated positions (prompt is prefilled with plain embeddings, FBT L237-243, L390 ✓): the caveat says "everything generated so far". |
| C-FBW-3 | Decoding's total serial depth is unchanged; the opaque share changes. | FBT L229-231 ✓ | sourced + inferred | Contrast with opaque depth is ours and Redwood's. |
| C-VIS-1 | Route numbers count hidden states; the count restarts at 1 after every forced card; dark links don't restart it (Coconut only while the thoughts last). | Brown-Cohen definition (C-OSD-1) | simplified | Phones: 5 columns, so full bandwidth reads 20; the prose gives no number. |

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
