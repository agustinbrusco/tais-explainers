# How Many Steps Fit in the Dark?
*Chain-of-thought monitoring, opaque serial depth, and the architectures that could end it*

> **Status:** brief agreed 2026-09-25 (with additions below) · format: **web explorable first**; a video only if it seems worth it afterwards

## Promise
After this, you can look at any architecture drawn as a computation graph, find its **longest dark path**, and use that
one quantity to predict whether reading the chain of thought can catch what the model is planning. You'll also be able to
place the September 2026 evidence (GPT-6 Astra) on that picture, keeping confirmed and rumored claims apart.

## Learner
- **Assumes:** linear algebra and high-dimensional intuition; DNN basics; graphs and DAGs (a strength: we lean on it);
  transformers at block-diagram level; what CoT monitoring is at the BlueDot level.
- **Does not assume:**
  - Attention and residual-stream mechanics from memory. Only the "wide in parallel, shallow in serial" shape is needed,
    and it gets drawn here.
  - RL *math*. RL concepts (optimization pressure, RLHF, RLVR) are known, so don't re-teach them. The obfuscation
    argument uses them directly, and a short optional aside can show the policy-gradient version.
  - Circuit complexity.

## Prerequisites and prior art
- Welch Labs, residual stream video (optional, helps with the "layers stack up" intuition).
- **Prior art on this topic is text only:** Korbak et al. 2025; Brown-Cohen, Lindner, Shah 2026 (the formal definition);
  Redwood's operationalization (2026-09-10) and argument (2026-09-23). A 2026-09-25 search found no visual or
  interactive explainer of opaque serial depth.
- **Our delta:** make the depth argument something you can *see and operate*, and put the new evidence on the same picture.

## Learning objectives
1. **Find the longest dark path.** Given an architecture as a graph (token positions × layers, with the gold "readable"
   nodes at the text bottleneck), trace the longest opaque path, and say how it scales: standard ∝ layers; looped
   ∝ layers × loops; full-bandwidth ∝ layers × positions.
2. **Necessity vs propensity.** For a task needing *k* dependent steps, predict whether the model *must* surface some of
   it as text. That tells you whether a CoT monitor gets a guarantee or is relying on the model's habits.
3. **Why "penalize bad thoughts" backfires.** With RL concepts the learner has (math optional): when the reward includes "the monitor didn't flag it", there
   are two ways to earn it, behaving or not verbalizing, and optimization finds the cheaper one.
4. **Faithfulness ≠ monitorability.** Explain why "CoT is often unfaithful" doesn't imply "monitoring is useless".
5. **What latent reasoning does to today's interpretability tools** *(added at the learner's request)*. Why probes,
   SAEs, NLAs, AOs and the J-lens get harder, or lose their labels or their ground truth, when the CoT is unreliable or
   absent. For example: can you still train a probe if the CoT no longer tells you what the model was doing?
6. **Sort the Astra evidence** into confirmed / reported / rumored / still-bounded, and name the evidence that would change your mind.

## The one running example
**A chain of dependent arithmetic steps** ("start at 7, triple it, subtract 4, …"): each step needs the previous result,
so it can't be parallelized. Nanda (2026-09-10) measured how many such steps fit in one forward pass: about 4 for the
best models, about 7 for Astra. That's LLM-dependent research, and the caveat stays on screen. In the explorable, this
chain is laid onto the graph. Steps that fit on the dark path stay invisible, and the rest *must* surface as gold text
where the monitor reads it.

**Stakes, used as the hook:** the July 2026 Hugging Face incident. About 1,200 agents coordinated, and investigators
understood it largely by reading raw chains of thought.

## The money shot
The transformer unrolled as a DAG: columns are token positions, rows are layers, and the text bottleneck between columns
is gold. A glowing counter traces the **longest dark path**. Then each architecture is shown as an **edit to the graph**:
- **Looped:** the rows repeat, so the dark path grows by the loop count.
- **Coconut** *(learner asked for it explicitly)*: the last hidden state is fed back as the next input, with no token in
  between. "Thought" columns lose their gold node, and the dark path chains through them.
- **Full-bandwidth:** an edge carries hidden state straight from column *t* to column *t+1* and skips the gold node, so the
  dark path suddenly spans the whole context. *(To verify in phase 2: does this reproduce Redwood's "1,000,000×"?)*
- **Diffusion with opaque self-conditioning vs bottlenecked:** GDM's 28.6× → 1.1×.

One picture and one number explain the whole argument, and each architecture is a graph edit you can toggle.

## Misconceptions to defuse (both directions)
- "CoT is unfaithful, so monitoring is useless." → Faithfulness ≠ monitorability (necessity).
- "Just penalize the bad thoughts." → Obfuscation (Baker et al.; the toy recurrent result).
- "Latent reasoning is hypothetical." → Coconut, looped and full-bandwidth models exist, and a deployed frontier model is rumored to be looped.
- "Astra is confirmed neuralese." → Rumored. The system card is silent on the architecture.
- "CoT monitoring is already broken." → Current bounds: no steganography, CoT-requiring side-tasks caught.
- "Interpretability will take over." → Complements today (Goodfire probes). That's the bridge to the rest of the series.

## What this does NOT show
- The formal circuit-depth definition (Boolean circuits, poly-size): intuition, plus a link.
- Opaque serial depth is an **architectural upper bound**; how much of it a model *uses* is behavioral (Nanda's steps,
  Redwood's NLS depth). The piece keeps the two visibly separate.
- RL algorithms beyond the two-ways-to-earn-reward argument.
- Diffusion LMs beyond one beat. Policy beyond summarizing the Redwood and lab positions.
- Any claim about Astra's architecture as fact.

## Format and why
**Web explorable** (agreed): the dark-path graph is a mechanism with knobs (architecture, loops, context length, task
depth *k*), and it's the money shot. A narrated Manim video of the argument, reusing the same graph grammar, is
**deferred**, and gets decided after the learner has used the explorable.

## Check yourself
1. A model solves 3-step chains without CoT but needs CoT for 6-step ones. Which plans is a CoT monitor *guaranteed* a shot
   at seeing, and which not?
2. Why can training against a CoT monitor make things worse even when visible bad reasoning goes down?
3. A lab ships a looped model with 4× the passes per token. What happens to the longest dark path? Which evaluation would
   you want to see before trusting their CoT monitoring?
4. Why did DiffusionGemma's opaque-depth gap go from 28.6× to 1.1×? Draw it as a graph edit.
5. *(Transfer)* Agents in a swarm pass compressed embeddings to each other through a shared cache instead of text. Where
   are the new edges, and what happens to the dark path?

## State and next actions (keep this current: it's the handoff after context compaction)

**Where we are (2026-09-26):**
- The brief is agreed. Web first, and a video only if it proves worth it.
- **Prototype iteration 2 is built** (`web/index.html` + `web/main.js`, 9 steps), acting on the 2026-09-25 feedback:
  - a second example: Xu et al.'s 4-hop question, in its own step ("Facts hit the same wall", two rows per hop) and as a toggle
    in "Your turn";
  - the dark path is now *felt*: a pulse climbs the route and numbers each hidden state; crossing a card lights it gold, the
    monitor's eye reacts, and the count restarts at 1; dark links never restart it;
  - phones get a 5-column, narrower viewBox. Reviewed on desktop, mobile and motion frames (`review.md`, iteration 2).
- **Iteration 2b (same day):** `rigor-reviewer` + `learner-sim` run, and all blockers and "should"s fixed (`review.md`):
  predict/reveal step pairs with guess buttons, a zig-zag route and a per-column **depth profile**, "Task needs" readout,
  unit "hidden states", answer cards no longer gold, filler tokens defined, "through the text ≠ readable" caveat, drawing
  convention vs measurement kept apart, "Your turn" answers + a transfer question. claims.md rewritten and re-verified.
- **Learner feedback on 2b (2026-09-26):** counted route + depth profile work; the 4-hop step needs a better explanation;
  predict questions must be genuinely didactic (target a misconception, plausible wrong answer, answerable from the screen).
  Go-ahead to build several new beats autonomously, polish the visual style, and show the first section as it would look
  finished.
- **Iteration 3 (2026-09-26): the whole piece is built** (25 steps, prologue + chapters I–VI):
  - Visual overhaul (kit-level): Newsreader display serif + JetBrains Mono, hero with a live miniature (standard vs full
    bandwidth), chapter dividers, framed "instrument" stage with per-step figure titles and badges, progress bar,
    chapter-aware step nav, small-caps callout labels, guess buttons with right/not-quite feedback.
  - 4-hop step rewritten as a lookup ladder, capsules labelled on the figure; predict questions rewritten to target
    misconceptions (width vs depth, salience, penalize-bad-thoughts, unfaithful ⇒ unmonitorable, cards cut diffusion?).
  - New scenes: METR incident waffle (real counts), Baker/Kuhn/Emmons charts re-plotted from the papers' figures,
    diffusion as a graph edit (DP on the drawn graph), interpretability "readers" with two wires, Astra evidence board.
  - claims.md covers every new claim; three research passes and their corrections are in the dossier.
  - **Iteration 3b (same day):** `rigor-reviewer` (32 findings, no blockers) and `learner-sim` run on the whole piece; all
    "should"s fixed (see `review.md`): predicts rebuilt around misconceptions without leaks, define-before-use glosses,
    board redesigned, readers diagram recalibrated, mobile layouts for every scene. Smoke-tested (25 steps, desktop +
    mobile, no console errors; guesses and free play exercised).
  - (Superseded by iteration 4, below.)
- **Iteration 4 (2026-09-26): visual redesign**, after the learner asked for "more expressive visuals… full visual
  designer", inspired by Goodfire and Welch Labs, rigorous and simplified only where it doesn't matter:
  - "Paper and glass" (kit-level): the page is paper; a model's interior is a dark glass window; the transcript lies on the
    paper below it; the monitor's reading is a gold highlighter. Tokens: `page`, `ink`, and an `-ink` variant per semantic
    color (`kit/tokens.json`); `kit/web/base.css` rewritten; Newsreader body text.
  - Real data: every hidden state is a square of real gelu-4l numbers (`data/export_tiles.py` → `web/data/tiles.json`,
    with a greedy capability check). Real at the tokens under them in the standard arithmetic figures, reused elsewhere,
    and the caveat and badges say which.
  - New step 2, "A word and 512 numbers" (`anatomy.js`), and a camera pull-back from that state into the grid; attention
    drawn from every earlier position; the sampled-token edge drawn and labelled; one state's attention fan in the
    step-4 predict; the dark past of any square on hover or tap (automatic in two steps); a perspective hero on canvas
    (`hero.js`); diffusion as glass passes with the canvas on paper strips; readers as instruments; charts on paper.
  - Reviewed: `rigor-reviewer` (1 blocker, fixed) and `learner-sim`, both acted on (`review.md`, iteration 4/4b).
    Smoke-tested: 26 steps, desktop and phone, no console errors; guesses and free play exercised.
  - **Awaiting the learner's feedback on iteration 4.**
- Beats for the full piece are in `script.md` (✅ built, 🔲 planned).
- **Both research passes are integrated** (depth mechanics per architecture; interpretability without a reliable CoT).
  They're in `references/cot-monitorability/README.md` (sections "What latent reasoning does to interpretability tools" and
  "Depth mechanics per architecture") and in `claims.md`, which covers beats 1–7 fully and the planned beats with sources.
  Full-bandwidth wiring verified; prototype prose corrected (unit "layers", attention's log cost, Coconut calibration,
  FBT "total vs opaque depth").

**Run it:** `python3 -m http.server 8000` from the repo root, then open http://localhost:8000/projects/cot-monitorability/web/
· screenshots: `node scripts/shoot.mjs projects/cot-monitorability/web/index.html [--mobile]`
· real states: `uv run --group interp python projects/cot-monitorability/data/export_tiles.py` (needs `./scripts/setup.sh --interp`;
TransformerLens 4 loads gelu-4l with `TransformerBridge.boot_tl_legacy`)

**How the prototype works:**
- `buildGraph(state)` builds the DAG: nodes `x{t}` are tokens (or latent thoughts), `h{t}_{r}` are hidden states.
  Edge kinds: `res`, `attn`, `in`, `write`, `dark-link`.
- `longestDarkPath(g)` is a DP in topological order, where readable tokens reset the count.
- A *story* is the ordered route the pulse takes: `pathStory` (the dark path alone) or `chainStory(g, k, arch, task)`,
  where `TASKS` holds the two examples (`arith`: 1 row per step; `hops`: 2 rows per hop). `playStory` draws and animates
  it on separate layers above the base graph (`drawGraph`), so the structure never carries task state.
- `STEPS[i]` gives the state for each step, and the last step reads the controls.
- An architecture is only a change in `buildGraph`, so new architectures (e.g. diffusion) belong there.
- Motion review: `node scripts/shoot.mjs projects/cot-monitorability/web/index.html --steps 2 --frames 16 --every 330 --element .stage`.
- Iteration 4 modules: `tiles.js` (loads the real states, draws them as 8×8 squares; `stateAt(col, row)` / `poolState`),
  `anatomy.js` (step 2), `hero.js` (canvas scene with a perspective camera; pauses off screen). In `main.js`, `showPast`
  computes a square's dark past; `STEPS` flags: `zoomFrom`, `explainWrite`, `fanFocus`, `autoPast`. Paths that cross the
  window's edge are drawn twice with `clip-win` / `clip-out`, so they're glass-colored inside and ink-colored on paper.

**Learner feedback on the prototype (2026-09-25):**
- The arithmetic chain works as the running example.
- **Also have an N-hop question example at hand** (multi-hop factual recall), as a second task toggle.
- **"Longest dark path" is approved as the framing, *as long as the visualization carries it*.**
- **The learner granted creative freedom** to explore the visualization further.

**Next actions, in order:**
1. ~~Act on the 2026-09-25 feedback~~ (done in iteration 2; still unexplored and worth trying if the learner wants more:
   small multiples of the four architectures, and a "real proportions" view built on real data, e.g. Biran et al.'s
   per-layer hop resolution in a 32-layer LLaMA, rather than an invented scale). Original notes:
   - **N-hop example:** an "example" toggle (arithmetic chain | N-hop question). Each hop is one serial step, and a forced
     write is the intermediate entity (e.g. "the director of X" → a name).
     - Pick an example whose facts are **verified** (every fact gets a claims row).
     - Evidence to cite: Xu et al. (Astra "~10-20% → ~50% on 4-hop natural facts" with filler tokens) ✓; Nanda (factual
       recall 3.6 hops for Astra vs 2.8); Greenblatt, "Recent LLMs can do 2-hop and 3-hop latent (no CoT) reasoning on
       natural facts" (located, read it first).
   - **Push the visualization so it carries "longest dark path" viscerally.** Ideas to explore:
     - Animate the chain as a pulse climbing the column and crossing links, with the counter ticking.
     - The monitor's "flashlight" sweeping the token row.
     - Small multiples comparing the architectures side by side.
     - A "real proportions" toggle (e.g. 62 layers vs ~4 steps) that shows why one row ≠ one step.
     - Make the reset at a gold card feel physical, e.g. the path "breaks" into light when it hits text.
2. ~~Integrate the research results~~ (done 2026-09-25).
3. ~~Spot-check the agent-sourced line numbers~~ (done by the rigor-reviewer 2026-09-26; claims.md rewritten).
   Candidates from the learner-sim not yet done: a toggle for looped "variant" edges (cross-position deep reads), which
   would make the filler-token transfer question operable; hop entities labelled on the figure.
4. ~~Build the 🔲 beats~~ (done in iteration 3). Remaining ideas, if the learner wants them: interactive toggles on the
   diffusion (S opaque/readable) and readers (text on/off) figures; small multiples; a narrated video version.
   Original list: 8 (two ways to earn the reward, plus the optional RL-math aside),
   9 (faithfulness ≠ monitorability), 10 (diffusion as a graph edit), 11 (what latent reasoning does to interpretability:
   probes need labels, often from text), 12 (the Astra evidence board), 0 (the Hugging Face hook), 13 (check yourself).
5. Run the `review` skill: shots, then the `rigor-reviewer` and `learner-sim` agents; log in `review.md`.
6. Deliver: the learner uses it, answers the check-yourself questions, and it all gets logged in `learner/journal.md`.
   Then decide on the video.

## Pipeline
- [x] Brief drafted
- [x] Brief agreed with learner (2026-09-25; additions: Coconut, effects on interp tools, RL math optional)
- [ ] Sources read, `claims.md` drafted (Brown-Cohen §3–4; Redwood 09-10 and 09-23 incl. appendices; Nanda; Baker; Emmons; Engels)
- [x] `script.md` beats written (26 steps since iteration 4)
- [x] Money shot prototyped (web) and self-reviewed. Learner feedback received 2026-09-25 (see above).
- [x] Iteration 2 (N-hop example, counted route with pulse) built and self-reviewed 2026-09-26.
- [ ] Narration rendered and listened to
- [x] Visuals built (iteration 3)
- [x] Visual self-review (shots desktop + mobile, motion frames)
- [x] Rigor review (`rigor-reviewer` agent): full piece 2026-09-26, findings resolved (`review.md`)
- [x] Learner-sim pass (`learner-sim` agent): full piece 2026-09-26, findings resolved or listed as not done
- [x] Iteration 4 (visual redesign, real states) built, self-reviewed, rigor- and learner-sim-reviewed (2026-09-26)
- [ ] Learner watched it, and feedback went into `learner/journal.md`
