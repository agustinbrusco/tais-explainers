# Playbook: what building explainers has taught us

Distilled from the first piece, `projects/cot-monitorability` (four iterations, 2026-09-25 → 26), and the second,
`projects/probes` (chapters I–III, 2026-09-26 → 27). It records the patterns that landed with the learner, the review
findings that kept recurring, and the pitfalls that cost time. The two projects are the reference implementations for
everything below. **Update this file at the end of every piece**, with its own
lessons and without repeating what's already here.

## 1. The loop that worked

1. **Brief, then a gate.** The learner agreed on the brief before anything was built. It changed twice later (adding an
   N-hop example, Coconut, and interpretability without a CoT), and cheaply, because the brief existed.
2. **The money shot first.** The unrolled DAG with a counted route was prototyped and shown before any other beat.
   The learner's first reaction ("the framing works *if the visualization carries it*") set the bar for everything after.
3. **Big autonomous passes between feedback rounds.** Each pass followed the same order:
   - build;
   - take stills (desktop, phone and reduced motion), motion frames, timed shots, and run the functional tests;
   - run the review agents in parallel;
   - fix;
   - commit;
   - report.

   The learner asked for this rhythm ("advance more than one, with everything, without more feedback from me").
4. **The reviews found real problems every single time:**
   - Iteration 2b turned up a missing caveat that was a blocker ("through the text ≠ readable").
   - Iteration 3 turned up 32 findings, including a paper misquoted in the piece's own voice.
   - Iteration 4 turned up a blocker: the piece claimed "real data" where the data was only reused.

   Never skip them. Give each agent a list of *what changed* and the paths to fresh screenshots.
5. **A report the learner can act on.**
   - What changed, grouped by theme.
   - What the reviewers found and what was fixed.
   - What was *not* done.
   - How to open the piece.
   - Two or three specific questions (e.g. "do the real squares help after step 2, or feel decorative?").
6. **Since 2026-09-26, reviews are split by model** (the learner's request; see "Who does what" in `CLAUDE.md`). Fable
   checks the technical content, independently of the author: `technical-reviewer` gates the script before building and
   reviews the built piece, and `rigor-reviewer` audits claims against sources. `learner-sim` stays on Opus. First round
   on built steps (probes, 2026-09-27), each caught what the others didn't:
   - `technical-reviewer`: a "cost" that was calibration (the ranking improved while the accuracy fell), and a figure
     whose "evidence" was true by construction (p defined as match minus mismatch). It also re-derived every angle and
     count.
   - `rigor-reviewer`: a hypothesis stated as a finding, and a two-lab contrast the papers don't support.
   - `learner-sim`: answer leaks, an overloaded beat, counts that didn't add up on phones, and words that disagreed with
     the picture.
7. **Performance at the end** (added 2026-09-27, the learner's suggestion). Once a piece settles, `performance-reviewer`
   (Sonnet) measures it as deployed, under CPU throttling and on phones, and proposes same-pixel fixes; it implements
   them only in a worktree, with pixel diffs (`review` skill, §3b).

## 2. Visual grammar that landed

### Paper and glass (the art direction)
The page is **paper**, and so is everything readable: prose, the transcript, and charts of published data. A model's
interior is a dark **glass** window. The window's edge is the *readability boundary*, and the most important lines are
the ones that cross it:
- a sampled token leaving the glass and landing on paper;
- a wire that goes around the paper instead.

The monitor is drawn as an eye on the paper, and what necessity forces into the text gets its gold highlighter.
Readability is a separate assumption.
- Tokens: `kit/tokens.json` holds `page` and `-ink` variants. `scripts/build_tokens.py` checks that every text color
  reaches 4.5:1 contrast.
- Shared SVG pieces: `kit/web/glass.js` (`installGlassDefs`, `clipRegions`, `dualStroke`). A line that crosses the
  boundary is drawn twice with complementary clips: glass color inside, ink color outside.

### Real data under schematic wiring
- **Show one real object before the abstraction.** In the "A word and 512 numbers" step, a real token card sits beside
  *all* the numbers of its real hidden state. Then the first 64 fold into the square that every later figure uses.
  The learner's simulation: "It answers 'what is a square?' before the grid appears, and makes 'dark' literal."
- **Pick a model shaped like the drawing.** gelu-4l has 4 layers, and so does the drawing, so the standard figure can
  be *literally* real at the tokens under it. Tools: `kit/interp.py` (TransformerLens 4) and `kit/web/states.js`.
- **Say exactly where it's real and where it's reused.** State it in the caveat, and in a badge on each figure: "real
  states: gelu-4l" versus "reused gelu-4l states". Claiming "every square is real" was iteration 4's blocker.
- **Back capability claims with the model's own output.** A greedy check stored in the data file backs "this model
  can't do the chain" ("7 * 3 =" → " 10000000").
- **Scales are per layer; say so.** The residual stream's norm grows with depth.
- **The learner's simulation found the squares turn into "atmosphere" after their introduction.** Next time, give real
  data a job the reader has to look at: compare two states, or find what changed.

### The paper is the glass's projection (probes)
- **A chart under a figure shares its axis and units** (the learner's rule, 2026-09-26). The paper under the probes
  figure is the projection of the glass above it: the same x and the same units (distance from the boundary, in the
  hidden state's units). It shows one histogram per class (true filled, false outlined with a paper halo so it shows over
  the fill), each normalized to sum to 1, with a bin edge at the boundary.
  - The histogram is recomputed every frame from where the points are drawn, so flips, rotations and sliders morph it for
    free.
  - One height scale per view, interpolated through transitions.
  - Dot piles saturated; the normalized histogram doesn't. Landed: "really good work with those variants".
- **Units vs logits:** the axis is in hidden-state units, and logits appear only as the probe's level sets continuing
  onto the paper. Their spacing adapts (1, 2, 5, 10… logits, whatever stays ≥ ~9 px) and is written beside the grid ("grid
  5 units · ↔ ×8.6 · level sets 1 logit apart"). At one shared scale, an overconfident probe shows as level sets 10 logits
  apart where a healthy one's are 2.
- **Honest projections:** every drawn state is its coordinates in a small per-layer orthonormal basis that contains every
  direction the page names (the exporter asserts it), so each view is an exact orthogonal projection. Transitions slerp
  the frame, so every in-between frame is one too, and views of different spaces cross-fade instead. When each layer
  has its own plane, scrub it as a flipbook of projections. Orient SVD signs in the exporter and anchor them to the view
  the prose describes, or a sign flip will silently falsify a sentence ("the upper cluster is Chinese cities").
- **A second scene in the same SVG** (`pipeline.js`): a sketch of the model (one column per token, one row per layer) in
  the same glass window, so the transition to the point figure keeps its place.
  - A gold tap reads a state out; it becomes a chip of glass holding the real numbers, then a paper row of X with its label.
  - The per-position chart sits on paper directly under the token chips: the shared-axis rule again.
- **One meaning per glyph:** gold ring = fitted to; double gold ring = where a probe reads; half-filled marker = both
  statements, identical. The learner-sim confused the three when two shared a shape.

### The counted route (the pattern that made the idea click)
- A pulse rides the route, and each hidden state lights up with its running count: 1, 2, 3…
- Crossing a readable card restarts the count, with a highlighter swipe and the eye reacting. Dark links don't restart it.
- One thing moves at a time, and the readouts tick with the pulse.
- The learner, after iteration 2: it "works"; it carries "longest dark path".

### Compute the picture from the idea
The DAG is a real graph. Every number on screen is computed from the drawn graph with a DP: the longest dark path,
the depth profile, and the hover counts. So numbers can't disagree with the picture. **Prose can.** When attention
became global, "12 persists for a few columns" silently became false. After any structural change, re-read every
sentence that describes the structure.

### Interactions built from pieces already on screen
- **Pointing at a square lights up its dark past:** the same squares and counts, with the label "N drawn states reach
  it in the dark · longest route d". The learner's simulation called it the best moment in Chapter I.
  - Show the key instances automatically where the insight lives, so the aha isn't hidden behind a hover: 24 → 4 in a
    standard model, 31 → 32 with full bandwidth.
  - Disable it where it would give away a predict answer.
- **Fan focus:** light up one state's full attention fan instead of drawing a haze of every edge. Curves should leave
  and arrive vertically so each one visibly climbs a layer; long, flat curves read as "sideways, same layer".

### Architectures as graph edits (one visual vocabulary)
- **Looped:** stacked bands of the same stack.
- **Coconut:** glass slots in the card row, each holding the state fed back. The learner's simulation called this the
  best new visual.
- **Full bandwidth:** a wire around each card.
- **Diffusion:** glass passes, with the readable canvas on paper strips between them and the S wire beside each card
  (a glass chip when S is opaque, a paper chip when it's readable).
- Name the drawing's scale where it differs ("drawn 3 layers deep and 4 positions wide, to fit").

### Camera
Use one camera move, motivated by the story: the pull-back from the one real state into the grid.
- The content must already be there when the shot opens. Don't fade it in during the move.
- Skip the move if its target isn't drawn in that layout (phones draw fewer columns).
- Reduced-motion screenshots hide camera bugs. Check motion frames.

### Timing: write the reads
Adapted from the animation guide in ClaudeAnimationBase (see `references/craft/`), which calls timing the rule models get
wrong most often. We know what happens because we wrote the code. The learner sees it once, at full speed, for the
first time.
- **A read** is one thing the viewer has to understand: the route reaches a square, the counter says 2, the badge says
  "reused". Each needs time for the eye to find it, time to understand it, and a beat to register before the next starts.
- **Write them down** for every animated step or video beat, in order, with times: a `reads:` line under the beat in
  `script.md`. If they don't fit, lengthen the beat or cut a read. Don't squeeze them.
- **One read at a time, and the cause before its effect.** When two things change at once, one of them is missed. A
  count lands with or just after what it counts. (In "Sideways doesn't help" the counter ticks one to two frames,
  40–85 ms, before its square lights up: harmless at that size, but it's the direction to watch.)
- **Fast actions, slow meanings.** A move can be quick if the eye was led to it. What it means gets the hold.
- **Lead the eye** before an important read (the camera moves, the target lights up first), and give it time to arrive.
- **Code twins by default:** everything moves at once, on one curve. Ease every move, and stagger related changes in the
  order that carries meaning (a route lights up in causal order).
- **Check on exact frames:** `shoot.mjs --clock --frames 24 --element .stage` films a transition at 24 fps, the same
  frames on every run. Count the frames each read gets.

### Hero
The whole argument in one cinematic shot, before any words:
- **Two acts:** a standard model, where the count restarts at every word, and full bandwidth, where it keeps growing.
- **Build:** canvas plus a small perspective camera; each square is drawn with the affine map of its projected corners.
- **Legibility:** keep text upright, sized by its distance (text skewed with the floor read "39" as "37"), and draw
  what the caption mentions (the monitor).
- **Wording and hygiene:** captions stay calibrated ("where a monitor *can see* it", not "read it"); act 2 prints
  plain "…" cards instead of invented narration; the hero carries its own badge.
- **Performance:** pause the animation when it's off screen or the tab is hidden.
- **Layout:** check it at 900, 1024, 1280 and 1920 pixels wide and on a phone, and put a scrim behind the title.

### Charts of published data
- Re-plot them on paper, in ink colors.
- Label each series at its end, inline. Hatching means "the monitor never saw this". Label thin bands with a small
  label just outside them.
- Badge: "real · re-plotted, approx." Say the values were read off the figure by eye.
- Reveal area charts with a left-to-right clip. Growing stacked areas from flat leaves artifacts.

### Figure hygiene
- **Badges:** on every figure. For real data, give the model and layer, and keep them on phones.
- **Legends:** show only what's on screen.
- **Placeholders:** where no real output exists, draw the *format*, not invented content: a score gauge, a sentence of
  gray lines, token bars.
- **Naming:** use one name for one thing across the hero, figures and prose ("longest dark path").
- **Color:** keep neutral readouts neutral. Red "nothing" editorializes.

## 3. Pedagogy
- **Predict, then reveal, as two steps.** The guess buttons echo "You said X. Right./Not quite." at the reveal.
- **A good predict question:**
  - targets a named misconception (width vs depth; salience; "penalize bad thoughts"; unfaithful ⇒ unmonitorable);
  - has a plausible wrong answer;
  - **cannot be read off the figure or the wording**, so ask about a maximum or a trend, not about counting something
    that's drawn;
  - is fair for every case the figure shows (Emmons: one of the two models "mostly ignored" the hint);
  - gives every option a rationale, or none of them (the lone bare option gives itself away);
  - uses a 2×2 when the answer has two dimensions (honest fixes ↑/↓ × cheating gone/unseen).
- **Examples:**
  - Keep one running example, plus a second one that stresses a different cost (arithmetic steps vs. factual lookups).
    Verify every fact.
  - The 4-hop example only clicked once each lookup's result was labelled on the figure and "why 23" was explained as
    "whatever lands at the top of the stack".
- **Define before use.** Where jargon clusters (the evidence board), give it a glossary sentence. Watch out for garden-
  path sentences with nested parentheticals.
- **Phones:** don't say "on the right". It's wrong there.
- **No spoilers** (the learner, 2026-09-27: "better that it's not spoiled"):
  - A quick check holds back the number it asks about ("?" in the readout, a held arc label) and any paragraph that states
    it (`data-after="q-…"`, hidden until answered); answering re-renders the figure with the answer.
  - A reveal's heading must not give its predict away ("Upside down" did). At the reveal, show every option's feedback,
    the reader's own marked: the best explanation often sits under an option they didn't pick.
- **Ask the surprising question, not the one a data scientist answers instantly.** "Training accuracy on coin flips?" is
  Cover's theorem to this learner. "It's at chance on new statements: how sure is it?" (a median of 7 logits) is the
  lesson.
- **Constructive order:** what decides what a probe *can* measure (the data point, which token, pooling, which layer)
  goes first. The learner: "ok they are at the start so the explanation is more constructive".
- **Prefer an exact fact to a statistic when the design gives you one:** a city's true and false statements share every
  token up to "in", so their states there are identical and a probe reading them scores exactly 50%. Causality made
  visible, with no error bars.
- **Only the learner can mark a concept as understood.** Log "presented" until they answer the check-yourself
  questions. Their standing request is "check with me instead of assuming".

## 4. Rigor practices that caught real errors
- **Check quotes against the raw text** (`papers/*.txt`, saved page text) and record the location with ✓. Paraphrases
  drift: "Baker's point", "measured ratio" (it was a computed bound), "two steps below".
- **Attribute each quote to the paper it's actually in.** Grep the raw text to find it. "Poised to verbalize" came from
  the original J-lens paper, not the one cited. It also doesn't mean "about to be said": the lens reads what drives the
  next token, including concepts the model never says.
- **Describe an instrument's scope from its own limitations section**, not from a slogan.
- **Mixed real/schematic figures must say which part is real.** Reused data must say it's reused.
- **Our own runs are sources.** A script, its data file with metadata and a capability check, and claims rows that
  point at JSON keys. Re-run the script and confirm it's byte-identical before trusting a refactor.
- **Calibrate in both directions** on every board: stated, measured, reported/rumored, checked-and-not-found.
- **When a number is ours, not the paper's, say so:** "49% in our re-plot".
- **Rebuild data you can't redistribute.** Marks & Tegmark's repo has no license, so the probes statements were rebuilt from
  GeoNames (CC BY 4.0) with their published recipe (`data/statements.py`), credited on the page. The derived data file is
  committed so the Pages site works.
- **After a data change, re-derive every sentence, not just the numbers.** With the new statements the flip moved from
  8% to 31% correct (still AUROC 0.010), layer 8 changed behaviour, and a retraining "cost" became calibration. Bind every
  number with `data-n`; then read each sentence against the new data.
- **Tests take their expected values from the exporter**, so they survive regeneration. Readouts and counts come from
  the same drawn coordinates; give narrow slivers more decimals, or counts drift by one from the readout.
- **Watch for threshold artifacts.** A pooled score needs its own threshold: max pooling at the per-token threshold read
  50.0%, and 87.8% with its own. Accuracy falling while AUROC rises is calibration, not a worse direction.
- **Name what's true by construction.** p = ½(Δ_aff − Δ_neg) *is* the match-minus-mismatch direction, so "the matched
  groups sit up along p" is not evidence; its length and the probe's loading on it are.

## 5. Web pitfalls and their fixes
- **Filters inside a `display:none` SVG vanish (Chrome).** Keep defs in an always-rendered 0×0 SVG
  (`installGlassDefs`).
- **A glow on a perfectly vertical line has a zero-size bounding box.** Use `filterUnits="userSpaceOnUse"`.
- **Wide figures squeezing the prose column:** use `minmax(0, 1fr)` grid tracks and `min-width: 0` on the stage and
  panel.
- **Phones:**
  - Every scene needs its own narrow layout (a narrower viewBox, stacked panels), with text ≥ ~11 px effective.
  - The sticky stage must fit its readouts.
  - Long strips need a short form (the 4-hop relations).
- **Labels:** measure the label's box and keep it inside its window. Don't clamp with a fixed margin.
- **Tests:** click guess buttons by `[data-correct]`, not by label text, because labels change.
- **Data loading:** a top-level `await fetch` in an ES module is fine (`tiles.js`). Resolve URLs with
  `new URL(…, import.meta.url)`.
- **TransformerLens 4:** `HookedTransformer` is gone. Use `TransformerBridge.boot_tl_legacy` for legacy repos (gelu-4l)
  and `boot_transformers` for Hugging Face models (`kit/interp.py`).
- **Editing prose with scripts:** match whitespace-tolerantly. Hand-wrapped HTML rarely matches the exact line breaks.
- **Filming motion:** frames taken on wall-clock time vary from run to run and skip moments. Use `--clock`, which
  controls the page's clock (D3 transitions, canvas loops; CSS transitions still run on real time). Under it, never await
  a promise that settles when a transition ends, because it waits on a paused clock.
- **Slow transitions are usually paint, not JS.** In the CoT piece's DAG, one `clip-path` per path (two copies of ~200
  edges) and a figure-sized `#glow` filter on every trail path made each frame repaint and re-blur the whole figure.
  Clip and filter *groups* instead (one clipped layer for glass, one for paper, one glow group for the trails), use
  `stroke-opacity` rather than `opacity` on single paths, and give moving dots a small-region filter (`#dot-glow`).
  Long tasks during steps fell from ~6.7 s to ~0.05 s at 4× CPU throttle, with the same pixels.
- **Canvas heroes: cache what doesn't move.** Redrawing every square, strand and `shadowBlur` trail each frame ran the CoT
  hero at ~20 fps (4× throttle). Offscreen layers (static floor and wiring, plus lit squares and finished trails rebuilt
  only when a leg ends) bring it to 60 fps with identical output, since source-over is associative.
- **Measure before optimizing:** CPU profile plus a trace aggregated by event (Paint, Layerize), under
  `Emulation.setCPUThrottlingRate`. Scroll to each step so an on-screen hero doesn't pollute the numbers. Check sameness
  with a pixel diff of every step against shots taken before the change.
- **The first figure's choreography never played.** The first render at load is a cut, and the stage sits below the
  hero, so readers arrived at a finished figure. Hold the first render until the stage is on screen (an empty glass
  first, so the show has a previous state to animate from).
- **Base styles beat a class on an inline SVG:** `.stage svg { width: 100% }` overrides `.spark`; use `.stage svg.spark`.
- **Text measured before the web fonts load overlaps later:** measure legends again on `document.fonts.ready`.
- **A scripted edit with `str.replace(x, y, 1)` hits the first occurrence**, which was inside an event handler: two
  handlers ended up interleaved. Anchor on unique context, and syntax-check after.
- **Flipbooks and sliders set their readouts directly** (a view with `readouts: null` tells the figure to leave them
  alone). Otherwise 29 frames means 29 cross-fades.
- **Cards that share a side of the glass collide:** lay them out per side in the order of their points.
- **Logistic regression on raw activations:** L-BFGS hit its evaluation limit on ~20k per-token rows; `newton-cholesky`
  solves exactly and fast when d ≈ 1.5k.
- **Headless WebGL, for a future Three.js piece (untested here):** without a GPU, headless Chrome may give no WebGL
  context. ClaudeAnimationBase's `render.mjs` passes `--use-angle=swiftshader --enable-unsafe-swiftshader` for software
  WebGL, and `--use-angle=vulkan` or `gl-egl` on headless NVIDIA machines.

## 6. Tools (what each is for)
| tool | use it to |
|---|---|
| `scripts/shoot.mjs` | take stills per step (`--mobile`, `--reduced`), motion frames (`--frames --element`; with `--clock`, exact frames at `--fps`, default 24), and timed shots after load (`--at`, for heroes) |
| `scripts/contact_sheet.py <images…>` | tile shots or frames into one image to read at a glance |
| `scripts/study_page.mjs <url> --out <scratch>` | study a reference page: viewport shots, figure crops, computed typography |
| `scripts/storyboard.py <video> --out <scratch> --quad` | see a YouTube video's composition through its storyboard stills (Claude can't watch video) |
| `scripts/build_tokens.py` | regenerate `tokens.css` and check the contrast of every text color |
| `kit/interp.py` | load a small real model on CPU, export residual-stream states, record greedy capability checks |
| `kit/web/states.js` | draw a hidden state as a square of real numbers (`tileURL`, `rampCSS`) |
| `kit/web/glass.js` | install the paper/glass SVG defs; clip regions and dual strokes for the readability boundary |
| `projects/<slug>/tests/functional.mjs` | encode every value verified by hand (readouts, counts, badges, guess flow) as a check that fails loudly; take expected values from the exporter |
| `projects/probes/web/figure.js` + `lin.js` | the glass/paper projection figure: honest rotations of real states, level sets, the histogram paper, cards, flip/rotate/read choreographies (a candidate for `kit/web/`) |
| `projects/probes/web/pipeline.js` | a model-sketch scene (tokens × layers) with a tap, a state chip, a data table and per-token charts (a candidate for `kit/web/`) |
| `performance-reviewer` (agent) | measure load, transitions, sliders, heroes and phones as deployed, under CPU throttling; same-pixel fixes in a worktree |

Reference-study shots stay in the scratchpad. They are the authors' work. Write what you learned in
`references/craft/README.md`.

## 7. Checklists

**Before building**
- [ ] The learner agreed on the brief.
- [ ] `technical-reviewer` passed the script (`script` mode), and its blockers are fixed.
- [ ] Every animated beat in `script.md` has its reads.

**Before showing the learner**
- [ ] Stills of every step on desktop and phone (`--reduced`), all opened and read; no console errors.
- [ ] Exact motion frames (`--clock`) for each animated beat, with the frames per read counted, and timed shots of the
      hero, checked at 900–1920 px and on a phone.
- [ ] Functional tests pass.
- [ ] Every number on screen traced to `claims.md`, including numbers computed from our own data.
- [ ] Badges true, including where data is real vs reused. Simplifications named where they happen.
- [ ] Every predict: not guessable from the figure or wording, fair for all cases, options balanced.
- [ ] `technical-reviewer` and `rigor-reviewer` (Fable) and `learner-sim` (Opus) run with a change list and screenshot
      paths, and their findings resolved or listed as not done in `review.md`.

**Before committing**
- [ ] `claims.md`, `script.md` (beats, visual grammar), `review.md` and the README handoff updated.
- [ ] Data scripts re-run and outputs byte-identical (or the change explained).
- [ ] Nothing from `references/*/papers/` or reference-study shots is staged.
