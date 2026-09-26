# Playbook: what building explainers has taught us

Distilled from the first piece, `projects/cot-monitorability` (four iterations, 2026-09-25 → 26). It records the patterns
that landed with the learner, the review findings that kept recurring, and the pitfalls that cost time. That project is
the reference implementation for everything below. **Update this file at the end of every piece**, with its own
lessons and without repeating what's already here.

## 1. The loop that worked

1. **Brief, then a gate.** The learner agreed on the brief before anything was built. It changed twice later (adding an
   N-hop example, Coconut, and interpretability without a CoT), and cheaply, because the brief existed.
2. **The money shot first.** The unrolled DAG with a counted route was prototyped and shown before any other beat.
   The learner's first reaction ("the framing works *if the visualization carries it*") set the bar for everything after.
3. **Big autonomous passes between feedback rounds.** Each pass followed the same order:
   - build;
   - take stills (desktop, phone and reduced motion), motion frames, timed shots, and run the functional tests;
   - run both review agents in parallel;
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

## 6. Tools (what each is for)
| tool | use it to |
|---|---|
| `scripts/shoot.mjs` | take stills per step (`--mobile`, `--reduced`), motion frames (`--frames --every --element`), and timed shots after load (`--at`, for heroes) |
| `scripts/contact_sheet.py <images…>` | tile shots or frames into one image to read at a glance |
| `scripts/study_page.mjs <url> --out <scratch>` | study a reference page: viewport shots, figure crops, computed typography |
| `scripts/storyboard.py <video> --out <scratch> --quad` | see a YouTube video's composition through its storyboard stills (Claude can't watch video) |
| `scripts/build_tokens.py` | regenerate `tokens.css` and check the contrast of every text color |
| `kit/interp.py` | load a small real model on CPU, export residual-stream states, record greedy capability checks |
| `kit/web/states.js` | draw a hidden state as a square of real numbers (`tileURL`, `rampCSS`) |
| `kit/web/glass.js` | install the paper/glass SVG defs; clip regions and dual strokes for the readability boundary |
| `projects/<slug>/tests/functional.mjs` | encode every value verified by hand (readouts, counts, badges, guess flow) as a check that fails loudly |

Reference-study shots stay in the scratchpad. They are the authors' work. Write what you learned in
`references/craft/README.md`.

## 7. Checklists

**Before showing the learner**
- [ ] Stills of every step on desktop and phone (`--reduced`), all opened and read; no console errors.
- [ ] Motion frames for each animated beat and timed shots of the hero, checked at 900–1920 px and on a phone.
- [ ] Functional tests pass.
- [ ] Every number on screen traced to `claims.md`, including numbers computed from our own data.
- [ ] Badges true, including where data is real vs reused. Simplifications named where they happen.
- [ ] Every predict: not guessable from the figure or wording, fair for all cases, options balanced.
- [ ] `rigor-reviewer` and `learner-sim` run with a change list and screenshot paths, and their findings resolved or
      listed as not done in `review.md`.

**Before committing**
- [ ] `claims.md`, `script.md` (beats, visual grammar), `review.md` and the README handoff updated.
- [ ] Data scripts re-run and outputs byte-identical (or the change explained).
- [ ] Nothing from `references/*/papers/` or reference-study shots is staged.
