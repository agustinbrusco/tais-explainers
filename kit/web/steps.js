// Step engine for scrollytelling explainers.
//
//   import { mountSteps } from "../../../kit/web/steps.js";
//   mountSteps({ render: (i, prev) => { ... } });
//
// Contract: `render(i)` must draw step i from scratch-or-transition, never assume `prev`
// was i-1. The picture is a pure function of the step index, so every step can be
// deep-linked (#3), screenshotted by scripts/shoot.mjs, or reached by scrolling backwards.
//
// Exposes window.explainer = { steps, goto(i, {scroll}), current, before } for scripts/shoot.mjs.
// `current` is the step the stage shows. `before` is true while the reader is still above the first step (the hero):
// the stage already shows step 1, but the counter reads 0 / N and → goes to step 1 instead of skipping it.

export function mountSteps({ render, root = document }) {
  const sections = [...root.querySelectorAll("[data-step]")];
  let current = -1;
  let before = false;
  let quietUntil = 0;
  // Must match the breakpoint in base.css, where the stage becomes a sticky top band.
  const narrow = matchMedia("(max-width: 860px)").matches;

  // Optional chapters: a `.chapter` element (with data-short, e.g. "II") labels every step after it.
  const chapterOf = sections.map((s) => {
    for (let el = s.previousElementSibling; el; el = el.previousElementSibling)
      if (el.classList.contains("chapter")) return el.dataset.short ?? "";
    return "";
  });

  const bar = document.createElement("div");
  bar.className = "progress";
  bar.innerHTML = "<i></i>";
  const nav = document.createElement("nav");
  nav.className = "stepnav";
  nav.innerHTML = `<span class="chap"></span><button data-d="-1" aria-label="Previous step">←</button>
    <span aria-live="polite"></span><button data-d="1" aria-label="Next step">→</button>`;
  document.body.append(bar, nav);
  const [chap, prevBtn, label, nextBtn] = nav.children;
  nav.addEventListener("click", (e) => {
    const d = Number(e.target.dataset?.d);
    if (d) move(d);
  });

  /** One step forwards or backwards: from the hero, → goes to step 1; from step 1, ← goes back to the hero. */
  function move(d) {
    if (before) { if (d > 0) goto(0, { scroll: true }); return; }
    if (current + d < 0) { toHero({ scroll: true }); return; }
    goto(current + d, { scroll: true });
  }

  /** The counter, the progress bar and the highlighted section, for step i (or for the hero, i = -1). */
  function paint(i) {
    sections.forEach((s, j) => s.classList.toggle("active", j === i));
    label.textContent = `${i + 1} / ${sections.length}`;
    chap.textContent = chapterOf[i] ?? "";
    bar.firstChild.style.width = `${((i + 1) / sections.length) * 100}%`;
    prevBtn.disabled = i < 0;
    nextBtn.disabled = i === sections.length - 1;
  }

  function scrollToStep(i, scroll) {
    quietUntil = performance.now() + 900;
    const behavior = scroll === "instant" ? "instant" : "smooth";
    if (narrow) { sections[i].scrollIntoView({ behavior, block: "start" }); return; }
    // centre a step that fits, but never past its own top, or its chapter's heading when it opens one: a long step (or a
    // chapter heading above it) used to land with its title off screen (the learner, 2026-10-04)
    const s = sections[i], prev = s.previousElementSibling;
    const head = prev?.classList.contains("chapter") ? prev : s;
    const r = s.getBoundingClientRect();
    const centred = scrollY + r.top + r.height / 2 - innerHeight / 2;
    const fromTop = scrollY + head.getBoundingClientRect().top - innerHeight * 0.08;
    scrollTo({ top: Math.max(0, Math.min(centred, fromTop)), behavior });
  }

  let rendering = Promise.resolve();
  function goto(i, { scroll = false } = {}) {  // scroll: false | true (smooth) | "instant"
    i = Math.max(0, Math.min(sections.length - 1, i));
    const wasBefore = before;
    before = false;
    if (i === current && wasBefore) {
      // arriving at step 1 from the hero: the stage already draws it (or waits to be seen), so no second render
      paint(i);
      history.replaceState(null, "", `#${i}`);
      if (scroll) scrollToStep(i, scroll);
      return rendering;
    }
    if (i === current && !scroll) return Promise.resolve();
    const prev = current;
    current = i;
    paint(i);
    history.replaceState(null, "", `#${i}`);
    if (scroll) scrollToStep(i, scroll);
    return (rendering = (async () => render(i, prev))());
  }

  /** Back above the first step. The stage keeps what it shows; only the position changes. */
  function toHero({ scroll = false } = {}) {
    before = true;
    paint(-1);
    history.replaceState(null, "", location.pathname + location.search);
    if (scroll) {
      quietUntil = performance.now() + 900;
      scrollTo({ top: 0, behavior: scroll === "instant" ? "instant" : "smooth" });
    }
  }

  const io = new IntersectionObserver(
    (entries) => {
      if (performance.now() < quietUntil) return;
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (hit) { goto(sections.indexOf(hit.target)); return; }
      // no step in the reading band, and the first one below it: the reader went back up to the hero (by scrolling, or a
      // jump to the top that never crossed the first step)
      const band = entries[0]?.rootBounds;
      if (!before && band && sections[0].getBoundingClientRect().top >= band.bottom) toHero();
    },
    { rootMargin: narrow ? "-55% 0px -35% 0px" : "-45% 0px -45% 0px", threshold: [0, 0.5, 1] },
  );
  sections.forEach((s, j) => {
    io.observe(s);
    // clicking a section selects it, but not when the click was meant for a control inside it, nor when it selected text.
    // A click on the section already shown does nothing: the reader may be partway down it, or selecting a passage, and
    // must neither be scrolled back to its title nor see its animation replay (goto(current) still replays, for shoot.mjs)
    s.addEventListener("click", (e) => {
      if (e.target.closest("button, input, select, textarea, a, label, summary, details")) return;
      if (String(getSelection?.() ?? "").length) return;
      if (j === current && !before) return;
      goto(j, { scroll: true });
    });
  });

  addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, textarea, select")) return;
    if (["ArrowRight", "ArrowDown", "PageDown", "j"].includes(e.key)) { e.preventDefault(); move(1); }
    if (["ArrowLeft", "ArrowUp", "PageUp", "k"].includes(e.key)) { e.preventDefault(); move(-1); }
  });

  window.explainer = { steps: sections.length, goto, get current() { return current; }, get before() { return before; } };
  if (location.hash.length > 1) goto(Number(location.hash.slice(1)) || 0, { scroll: true });
  else {
    // the stage draws step 1 at once, so it's ready when the reader arrives; until then the position is the hero
    goto(0);
    if (sections[0].getBoundingClientRect().top > innerHeight * (narrow ? 0.65 : 0.55)) toHero();
  }
  return window.explainer;
}
