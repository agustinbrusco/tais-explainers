# Script: How Many Steps Fit in the Dark?

## Arc
1. **Question:** we can currently read what models plan. Why does that work, and how long will it?
2. **Why the obvious worry is wrong:** the CoT is often unfaithful, yet monitoring still works when thinking out loud is *necessary*.
3. **The idea:** necessity = the task is longer than the longest dark path (opaque serial depth).
4. **Watching it work:** the chain forced into text; the monitor sees it.
5. **Where it breaks:** optimization pressure (propensity erodes); architectures that lengthen or bypass the dark path (necessity erodes).
6. **Evidence board:** Astra and the Hugging Face incident, with confirmed / reported / rumored / bounded kept apart.
7. **What's left:** interpretability readers as complements, and what latent reasoning does to *them*.
8. **Check yourself.**

## Beats (web explorable; one prose step per beat, and `render(i)` is a pure function of the step)
Status: ✅ in the prototype · 🔲 planned

| # | step | visual state | what should click | claims |
|---|---|---|---|---|
| 0 | 🔲 Hook: the Hugging Face incident | incident card: ~1,200 agents, a message board, raw CoTs | reading CoT is *the* tool that works today | C-HF-1..3 |
| 1 | ✅ A language model, unrolled | standard DAG, no highlight | positions × layers; only tokens are readable; the monitor reads that row | C-DAG-1 |
| 2 | ✅ The longest dark path | column-0 path glows, counter = 4 | serial depth is bounded by the layer count; attention can't lengthen it | C-OSD-1, C-OSD-2 |
| 3 | ✅ A problem that doesn't fit | 10-step chain; 39 and 64 forced into cards | **necessity**: long chains are *forced* into text | C-NEC-1, C-NANDA-1 |
| 4 | ✅ Looped | R = 8, pass bands; only 64 forced | the same weights reused → dark path × loops | C-LOOP-1, C-ASTRA-ARCH, C-NANDA-1 |
| 5 | ✅ Coconut | thought columns (∿) with no card; nothing forced | continuous thoughts bypass the text bottleneck | C-COCO-1 |
| 6 | ✅ Full bandwidth | dark links on every column; counter = 32 | a private channel next to the text → dark path spans the context | C-FBW-1 (**open**), C-RW-10x |
| 7 | ✅ Your turn | controls live (architecture, loops, chain length) | the learner answers the three questions | n/a |
| 8 | 🔲 Two ways to earn the reward | same graph; the reward term "monitor didn't flag" → the model can behave *or* stop writing | obfuscation under pressure; necessity survives it, propensity doesn't | C-BAKER-1..2, C-TOY-1 |
| 8b | 🔲 *(aside)* the policy-gradient version | a small equation panel, collapsible | the math behind "the cheaper route wins" (the learner is solid on RL concepts, less so on the math) | C-RL-1 |
| 9 | 🔲 Faithfulness ≠ monitorability | two panels: a rationalization CoT vs a computation CoT | "unfaithful" doesn't mean "unmonitorable" | C-EMM-1 |
| 10 | 🔲 Diffusion | canvas × denoising-steps DAG; toggle opaque vs bottlenecked self-conditioning | 28.6× → 1.1×: what matters is *what passes between steps* | C-DIFF-1..2 |
| 11 | 🔲 What latent reasoning does to interpretability | the same graph; readers (probe, SAE, NLA, J-lens) attached to hidden nodes; which lose their labels or ground truth | probes need labels, often from text; tools are complements today | C-INTERP-* (from research) |
| 12 | 🔲 Evidence board: Astra | a sortable board: confirmed / reported / rumored / bounded | calibration in both directions | C-ASTRA-* |
| 13 | 🔲 Check yourself | five questions (see README) | transfer | n/a |

## Visual grammar (keep consistent)
- Hidden state = `residual` blue dot. Readable token = `token` paper card. Monitor = `overseer` gold eye plus gold outlines on
  the cards it's guaranteed to read. Continuous thought = dashed blue card with ∿.
- Dark route = glowing blue. A forced write = a gold edge into a gold-outlined card.
- The readouts, "longest dark path" (computed on the drawn graph) and "forced into text", are always visible.

## Cut list
- The residual-stream re-explanation: Welch Labs covers it.
- The formal Boolean-circuit definition: linked, not taught.
