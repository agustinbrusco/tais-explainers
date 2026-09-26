# Learner profile

> Every explainer brief reads this. **Facts** come from the learner's CVs (2026-09-25), at the level of detail that matters
> for teaching. **Interests, depth of understanding, and preferences come only from the learner.** Don't infer them.

## Background (from CV)
- **Education:** Licenciatura in Physics, UBA (2020–, expected 2028; roughly a B.S. + M.S.).
  - Optional courses: statistical methods for experimental physics; complex systems (numerical and analytic methods
    for PDEs); complex networks with systems-biology applications.
- **Research:** experimental particle-detector work (Skipper-CCD defect detection, 2023–2025).
  - First-author paper: "Charge Trap Analysis in a SENSEI Skipper-CCD: Understanding Low-Energy Backgrounds in Rare-Event
    Searches", *Phys. Rev. Applied* (2026), arXiv:2510.23336.
- **Industry:**
  - Senior data scientist: A/B-test design, attribution, mathematical modelling, an ML fraud-prevention model. Python,
    BigQuery, AWS.
  - About 2.5 years before that as an AI scientist: exploring, developing, implementing and evaluating LLM-based systems.
    Also co-built an LLM customer-service chatbot.
- **Teaching:** TA at UBA Physics (Data Laboratory; Introduction to Continuum Modeling; Complex Networks); TA for an
  intro programming course; volunteer Python workshop.
- **Courses:**
  - BlueDot Technical AI Safety, in person, Jul–Aug 2026. Covered alignment and RLHF, mech interp, evals and
    red-teaming, control and scalable oversight.
  - Two 2024 short courses: "LLMs: Zero to (almost) Hero!" and a course on modelling cortical circuits with ML.
- **Other:** first place in a 22-team data competition (2025). Spanish native, English C1.

## Depth of understanding (from the learner, 2026-09-25)
- **Transformer internals:** not sure they could write attention and the residual stream from memory. These are exactly
  the intuitions they want to build. **No hands-on interp yet.** They want that soon, and this repo is part of it.
- **BlueDot mech interp and oversight weeks:** felt very comfortable in both. They have a fairly intuitive grasp of
  **SAEs**, and want an SAE explainer to *test and solidify* those ideas. So challenge them there, and don't re-teach basics.
- **Math:**
  - **Very comfortable:** linear algebra, SVD, high-dimensional geometry, unsupervised methods (UMAP etc.), complex
    networks and graphs, and ML/DNN basics (standard architectures).
  - **RL:** solid *conceptually* (optimization-pressure effects, RLHF, RLVR). The *math* (policy gradients etc.) is less
    sharp. Explainers can mention or cover the math briefly, but shouldn't re-explain the concepts.
  - **Wants a mini-refresher before KL divergence.**
- **Papers on these topics already read:** not stated.

## Goals and audience
- **Primarily for themselves.** They may also share good pieces with local AI safety groups and
  fellowship cohorts, crediting Claude. So pieces should stand on their own: no references to this profile or to private context inside a piece.
- **Where to start:** Claude's call, **without duplicating great existing content**. For example, the residual stream is
  covered by Welch Labs' "The most cited paper of the century is a brilliant hack" (2026-08-31). Link content like that
  as a prerequisite and build only what's missing.

## Preferences
- **Explainers in English.** (Conversation with Claude is mostly in Spanish, sometimes English: answer in the language
  of their message.)
- **Physics analogies in moderation**, from their actual strengths: complex systems, continuum modelling, data science,
  and statistical mechanics or quantum more than other physics. **Avoid classical-mechanics analogies** (torque etc.):
  "they might not land".
- **Formats:** web explorables first; a narrated video only if a piece proves worth it.
- **Visual style (learned on the first piece, 2026-09-26):** expressive, crafted visuals in the spirit of Welch Labs and
  Goodfire's research pages, *and* rigorous: "simplify only in ways non-essential for the topic". The "paper and glass"
  art direction with real activations was received as "amazing work".
- **Pace:** they go through a whole piece in one sitting and give feedback in batches. They like large
  autonomous iterations between feedback rounds, then a complete report.
- **Predict questions** must be genuinely didactic: aimed at a real misconception, not answerable from the figure.
- **Check, don't assume,** what they're interested in and what they already understand. Mark a concept as understood
  only from their own answers.

## Known gaps / things that never clicked
- RL math (concepts are fine). KL divergence (needs a refresher).
