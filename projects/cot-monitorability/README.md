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

## Pipeline
- [x] Brief drafted
- [ ] Brief agreed with learner
- [ ] Sources read, `claims.md` drafted (Brown-Cohen §3–4; Redwood 09-10 and 09-23 incl. appendices; Nanda; Baker; Emmons; Engels)
- [ ] `script.md` beats written
- [ ] Money shot prototyped (web) and reviewed
- [ ] Narration rendered and listened to
- [ ] Visuals built
- [ ] Visual self-review (contact sheets / shots)
- [ ] Rigor review (`rigor-reviewer` agent) and every claim resolved
- [ ] Learner-sim pass (`learner-sim` agent)
- [ ] Learner watched it, and feedback went into `learner/journal.md`
