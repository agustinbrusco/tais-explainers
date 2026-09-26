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
| I.2 | ✅ A word and 512 numbers | anatomy: a token card on paper beside one real hidden state (all 512 numbers) behind glass; the first 64 fold into the square used from then on | the premise of CoT monitoring, made visible: text is readable, hidden states are numbers | C-ANAT-1..5, C-VIZ-TILES |
| I.3 | ✅ A language model, unrolled | DAG; the camera pulls back from that one state | positions × layers; tokens treated as readable | C-DAG-1/2 |
| I.4 | ✅ The longest dark path (predict) | DAG, column counted, attention highlighted, a dashed route jumping across 8 columns | counting a dark path; can a wander beat 4? | C-OSD-1 |
| I.5 | ✅ Sideways doesn't help | zig-zag also tops out at 4; depth profile; point at a square to light up its dark past | every hop climbs a layer (width, not depth); OSD named | C-OSD-2, C-PROF-1, C-DARKPAST |
| II.6 | ✅ A problem that doesn't fit (predict) | task posed, route held | "32 dots is plenty?" (width vs depth) | C-CONV-1, C-SHORT-1, C-NANDA-1 |
| II.7 | ✅ Forced into text | pulse, forced 39 & 64 | necessity; the rule; through text ≠ readable | C-NEC-1, C-KOR-1, C-RULE-1 |
| II.8 | ✅ Facts hit the same wall (predict) | hop ladder in prose; 2 rows per lookup | which answer surfaces? (salience misconception) | C-HOP-1/2, C-CONV-2 |
| II.9 | ✅ Whatever lands at the top | capsules labelled with each lookup's result; 23 forced | what surfaces is whatever lands at the top | C-HOP-4..6, C-XU-2, C-BIRAN-1/2 |
| III.10–12 | ✅ Looped / Coconut / Full bandwidth | DAG edits | depth becomes a dial; thoughts; the discarded state kept | C-LOOP-*, C-COCO-*, C-FBW-* |
| III.13 | ✅ Your turn | controls + 5 questions w/ answers | operate the rule; filler = width | C-FILL-1 |
| IV.14 | ✅ Train against the monitor (predict) | Baker chart, pressure panel hidden | "penalize bad thoughts" misconception | C-BAKER-1..3 |
| IV.15 | ✅ Two ways to earn the reward | Baker chart, both panels; RL-math aside | obfuscated reward hacking; propensity erodes | C-BAKER-4..7, C-RL-1/2 |
| IV.16 | ✅ Pressure finds the dark path | Kuhn chart | a latent channel empties the CoT; the plain model can only thin it | C-TOY-1..6 |
| IV.17 | ✅ When the hint needs math (predict) | Emmons chart, complex bars hidden | "unfaithful ⇒ unmonitorable" misconception | C-EMM-1 |
| IV.18 | ✅ Unfaithful, but only when it's easy | Emmons chart | rationalization vs computation | C-EMM-2..4 |
| V.19 | ✅ One canvas, many passes (predict) | diffusion DAG, S wires, no path | do the cards cut the path? | C-DIFF-1 |
| V.20 | ✅ A wire around the cards | S opaque: path 9 | diffusion = the FBW edit if S is opaque; 28.6× | C-DIFF-2, C-DIFF-5 |
| V.21 | ✅ Label the wire readable | S readable: path 3 | the ratio flips on one labelling decision; 1.1× | C-DIFF-3/4 |
| VI.22 | ✅ Readers of hidden states | instruments on paper with two wires (one taps a state in the glass); outputs as formats | where interp tools get meaning from | C-INTERP-1..3 |
| VI.23 | ✅ When the text goes away | transcript cards turn to glass; the transcript wire weakens ("weaker?") | activations persist; labels and checks weaken | C-INTERP-4..7 |
| VI.24 | ✅ The evidence board | HTML board, 4 categories | calibrate in both directions | C-ASTRA-* |
| VI.25 | ✅ Check yourself | standard DAG, zig-zag | transfer | C-CY-* |
| VI.26 | ✅ What this doesn't show | standard DAG | limits | C-LIM |

## Visual grammar (keep consistent)
- **Two materials (iteration 4).** The page and everything readable are *paper*. The model's interior is a dark *glass*
  window. The window's edge is the readability boundary: the transcript's cards lie on the paper below it.
- Hidden state = a square of real numbers (64 of a gelu-4l state's 512, blue ramp). Readable token = a paper card.
  Monitor = an ink-gold eye on the paper; what necessity forces into the text gets the monitor's *highlighter* (gold
  swipe). Readability is a separate assumption (C-KOR-1).
  Continuous thought = a glass slot in the card row, holding the state fed back.
- Attention = faint lines from every earlier position, one layer down (global attention). Dark route = glowing blue in the
  glass, blue ink where it crosses paper. A forced write = gold, leaving the glass and landing on a highlighted card.
- **The route is counted:** each state the task uses lights up with a numbered badge (1, 2, 3 …). Crossing a readable card
  restarts the count at 1; dark links (Coconut, full bandwidth) don't. Multi-row steps (hops) get a capsule with the value
  found, in blue italic (it exists only in the dark).
- **Motion:** a pulse rides the route; each state flashes as it is reached; the pulse turns gold on write edges and vanishes
  *into* the card; the highlighter swipes; the eye reacts; "forced into text" fills in at that moment. One thing moves at a
  time. The camera moves once: pulling back from one state (the anatomy beat) to the whole grid. Under
  `prefers-reduced-motion`, and for slider drags, the final state appears at once.
- **Pointing** at a square lights up its dark past (everything that reaches it without passing through a card) with a count
  and its longest route.
- The readouts, "longest dark path" (computed on the drawn graph) and "forced into text", are always visible in DAG steps.
- Charts of published data are drawn on paper in ink colors; hatching = what the monitor never saw.

## Cut list
- The residual-stream re-explanation: Welch Labs covers it.
- The formal Boolean-circuit definition: linked, not taught.
