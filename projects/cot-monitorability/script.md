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

Predictions are split into a *predict* step (task posed, route held, guess buttons) and a *reveal* step, so the stage never
leaks the answer.
Status: ✅ in the prototype · 🔲 planned

| # | step (on screen) | visual state | what should click | claims |
|---|---|---|---|---|
| 0 | 🔲 Hook: the Hugging Face incident | incident card: ~1,200 agents, a message board, raw CoTs | reading CoT is *the* tool that works today | C-HF-1..3 |
| 1 | ✅ A language model, unrolled | standard DAG; readout "?" | positions × layers; tokens treated as the only readable nodes; the monitor reads that row | C-DAG-1/2 |
| 2 | ✅ The longest dark path (predict) | column route counted 1–4 | a dark path is counted in hidden states; predict: can a zig-zag beat 4? | C-OSD-1 |
| 3 | ✅ Sideways doesn't help (reveal) | zig-zag route also tops out at 4; **depth profile** appears (4s everywhere) | every attention hop climbs a layer; OSD named; formal version counts operations, log cost dropped | C-OSD-1/2, C-PROF-1 |
| 4 | ✅ A problem that doesn't fit (predict) | task posed (strip, "needs 10"), route held; guess buttons | commit to a guess | C-CONV-1, C-SHORT-1, C-NANDA-1 |
| 5 | ✅ Forced into text (reveal) | pulse climbs; 39, 64 forced; count restarts; answer plain | **necessity**; the rule in the drawing's terms; through the text ≠ readable | C-NEC-1, C-KOR-1, C-RULE-1, C-VIS-1 |
| 6 | ✅ Facts hit the same wall (predict) | 4-hop question posed, 2 rows per hop | facts fare ~2× worse; guess which answer surfaces | C-HOP-1/2, C-CONV-2 |
| 7 | ✅ A bare "23" (reveal) | capsules; only 23 forced | necessity guarantees a minimum, not a legible one; measured on different datasets; Biran's partial second pass | C-HOP-4..6, C-XU-2, C-BIRAN-1/2, C-FILL-1 |
| 8 | ✅ Looped | R = 8, pass bands; only 64 forced; profile 8s | depth becomes a dial; Astra's evidence; variants and filler | C-LOOP-1..3, C-ASTRA-ARCH, C-HOP-5, C-FILL-1 |
| 9 | ✅ Coconut | thought cards; count runs 1–10; profile shows capacity 12 | continuous thoughts bypass the text bottleneck | C-COCO-1..3 |
| 10 | ✅ Full bandwidth | dark links on every column; profile 4→32 | the discarded state kept → dark path grows with every token | C-FBW-0..3 |
| 11 | ✅ Your turn | controls live; 5 questions with answers (one transfer) | operate the rule; filler adds width, not depth | C-FILL-1 |
| 12 | 🔲 Two ways to earn the reward | same graph; the reward term "monitor didn't flag" | obfuscation under pressure; necessity survives it, propensity doesn't | C-BAKER-1..2, C-TOY-1 |
| 12b | 🔲 *(aside)* the policy-gradient version | a small equation panel, collapsible | the math behind "the cheaper route wins" | C-RL-1 |
| 13 | 🔲 Faithfulness ≠ monitorability | two panels: rationalization vs computation CoT | "unfaithful" doesn't mean "unmonitorable" | C-EMM-1 |
| 14 | 🔲 Diffusion | canvas × denoising-steps DAG; opaque vs bottlenecked self-conditioning | 28.6× → 1.1× | C-DIFF-1..2 |
| 15 | 🔲 What latent reasoning does to interpretability | readers with label-source wires that go dark | labels and verification are what we lose | C-INTERP-1..7 |
| 16 | 🔲 Evidence board: Astra | confirmed / reported / rumored / bounded | calibration in both directions | C-ASTRA-* |
| 17 | 🔲 Check yourself | five questions (see README) | transfer | n/a |

## Visual grammar (keep consistent)
- Hidden state = `residual` blue dot. Readable token = `token` paper card. Monitor = `overseer` gold eye plus gold outlines on
  the cards it's guaranteed to read. Continuous thought = dashed blue card with ∿.
- Dark route = glowing blue. A forced write = a gold edge into a gold-outlined card.
- **The route is counted:** each hidden state the task uses lights up with its running count (1, 2, 3 …). Crossing a
  readable card restarts the count at 1; dark links (Coconut, full bandwidth) don't. Multi-row steps (hops) get a capsule.
- **Motion:** a pulse rides the route; it turns gold on write edges and disappears *into* the card (cards are drawn above
  it); the card flashes, the monitor's eye reacts, and "forced into text" fills in at that moment. One thing moves at a time.
  Under `prefers-reduced-motion`, and for slider drags, the final state appears at once.
- The readouts, "longest dark path" (computed on the drawn graph) and "forced into text", are always visible. The dark-path
  readout shows "?" until step 2 introduces it, then ticks up with the pulse.

## Cut list
- The residual-stream re-explanation: Welch Labs covers it.
- The formal Boolean-circuit definition: linked, not taught.
