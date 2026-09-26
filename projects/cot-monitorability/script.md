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

| # | step (on screen) | scene | what should click | claims |
|---|---|---|---|---|
| P1 | ✅ A swarm, read through its thoughts | waffle: 1,200 agents, 700 red; transcript stack (real counts) | CoT reading is the tool that worked on a real incident, and it rested on propensity | C-HF-1..5 |
| I.2 | ✅ A language model, unrolled | DAG | positions × layers; tokens treated as readable | C-DAG-1/2 |
| I.3 | ✅ The longest dark path (predict) | DAG, column counted, diagonals highlighted | counting a dark path; can a wander beat 4? | C-OSD-1 |
| I.4 | ✅ Sideways doesn't help | zig-zag also tops out at 4; depth profile | every hop climbs a layer; OSD named | C-OSD-2, C-PROF-1 |
| II.5 | ✅ A problem that doesn't fit (predict) | task posed, route held | "32 dots is plenty?" (width vs depth) | C-CONV-1, C-SHORT-1, C-NANDA-1 |
| II.6 | ✅ Forced into text | pulse, forced 39 & 64 | necessity; the rule; through text ≠ readable | C-NEC-1, C-KOR-1, C-RULE-1 |
| II.7 | ✅ Facts hit the same wall (predict) | hop ladder in prose; 2 rows per lookup | which answer surfaces? (salience misconception) | C-HOP-1/2, C-CONV-2 |
| II.8 | ✅ Whatever lands at the top | capsules labelled with each lookup's result; 23 forced | what surfaces is whatever lands at the top | C-HOP-4..6, C-XU-2, C-BIRAN-1/2 |
| III.9–11 | ✅ Looped / Coconut / Full bandwidth | DAG edits | depth becomes a dial; thoughts; the discarded state kept | C-LOOP-*, C-COCO-*, C-FBW-* |
| III.12 | ✅ Your turn | controls + 5 questions w/ answers | operate the rule; filler = width | C-FILL-1 |
| IV.13 | ✅ Train against the monitor (predict) | Baker chart, pressure panel hidden | "penalize bad thoughts" misconception | C-BAKER-1..3 |
| IV.14 | ✅ Two ways to earn the reward | Baker chart, both panels; RL-math aside | obfuscated reward hacking; propensity erodes | C-BAKER-4..7, C-RL-1/2 |
| IV.15 | ✅ Pressure finds the dark path | Kuhn chart | a latent channel empties the CoT; the plain model can only thin it | C-TOY-1..6 |
| IV.16 | ✅ When the hint needs math (predict) | Emmons chart, complex bars hidden | "unfaithful ⇒ unmonitorable" misconception | C-EMM-1 |
| IV.17 | ✅ Unfaithful, but only when it's easy | Emmons chart | rationalization vs computation | C-EMM-2..4 |
| V.18 | ✅ One canvas, many passes (predict) | diffusion DAG, S wires, no path | do the cards cut the path? | C-DIFF-1 |
| V.19 | ✅ A wire around the cards | S opaque: path 9 | diffusion = the FBW edit if S is opaque; 28.6× | C-DIFF-2, C-DIFF-5 |
| V.20 | ✅ Label the wire readable | S readable: path 3 | the ratio flips on one labelling decision; 1.1× | C-DIFF-3/4 |
| VI.21 | ✅ Readers of hidden states | readers with two wires | where interp tools get meaning from | C-INTERP-1..3 |
| VI.22 | ✅ When the text goes away | text wire cut | activations persist; labels and checks are lost | C-INTERP-4..7 |
| VI.23 | ✅ The evidence board | HTML board, 4 categories | calibrate in both directions | C-ASTRA-* |
| VI.24 | ✅ Check yourself | FBW DAG | transfer | C-CY-* |
| VI.25 | ✅ What this doesn't show | standard DAG | limits | C-LIM |

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
