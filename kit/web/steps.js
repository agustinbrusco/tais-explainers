// Step engine for scrollytelling explainers.
//
//   import { mountSteps } from "../../../kit/web/steps.js";
//   mountSteps({ render: (i, prev) => { ... } });
//
// Contract: `render(i)` must draw step i from scratch-or-transition, never assume `prev`
// was i-1. The picture is a pure function of the step index, so every step can be
// deep-linked (#3), screenshotted by scripts/shoot.mjs, or reached by scrolling backwards.
//
// Exposes window.explainer = { steps, goto(i, {scroll}), current } for scripts/shoot.mjs.

export function mountSteps({ render, root = document }) {
  const sections = [...root.querySelectorAll("[data-step]")];
  let current = -1;
  let quietUntil = 0;
  // Must match the breakpoint in base.css, where the stage becomes a sticky top band.
  const narrow = matchMedia("(max-width: 860px)").matches;

  const nav = document.createElement("nav");
  nav.className = "stepnav";
  nav.innerHTML = `<button data-d="-1" aria-label="Previous step">←</button>
    <span aria-live="polite"></span><button data-d="1" aria-label="Next step">→</button>`;
  document.body.append(nav);
  const [prevBtn, label, nextBtn] = nav.children;
  nav.addEventListener("click", (e) => {
    const d = Number(e.target.dataset?.d);
    if (d) goto(current + d, { scroll: true });
  });

  async function goto(i, { scroll = false } = {}) {  // scroll: false | true (smooth) | "instant"
    i = Math.max(0, Math.min(sections.length - 1, i));
    if (i === current && !scroll) return;
    const prev = current;
    current = i;
    sections.forEach((s, j) => s.classList.toggle("active", j === i));
    label.textContent = `${i + 1} / ${sections.length}`;
    prevBtn.disabled = i === 0;
    nextBtn.disabled = i === sections.length - 1;
    history.replaceState(null, "", `#${i}`);
    if (scroll) {
      quietUntil = performance.now() + 900;
      sections[i].scrollIntoView({ behavior: scroll === "instant" ? "instant" : "smooth", block: narrow ? "start" : "center" });
    }
    await render(i, prev);
  }

  const io = new IntersectionObserver(
    (entries) => {
      if (performance.now() < quietUntil) return;
      const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (hit) goto(sections.indexOf(hit.target));
    },
    { rootMargin: narrow ? "-55% 0px -35% 0px" : "-45% 0px -45% 0px", threshold: [0, 0.5, 1] },
  );
  sections.forEach((s, j) => {
    io.observe(s);
    // clicking a section selects it, but not when the click was meant for a control inside it
    s.addEventListener("click", (e) => { if (!e.target.closest("button, input, select, textarea, a, label, summary, details")) goto(j, { scroll: true }); });
  });

  addEventListener("keydown", (e) => {
    if (e.target.closest?.("input, textarea, select")) return;
    if (["ArrowRight", "ArrowDown", "PageDown", "j"].includes(e.key)) { e.preventDefault(); goto(current + 1, { scroll: true }); }
    if (["ArrowLeft", "ArrowUp", "PageUp", "k"].includes(e.key)) { e.preventDefault(); goto(current - 1, { scroll: true }); }
  });

  window.explainer = { steps: sections.length, goto, get current() { return current; } };
  goto(Number(location.hash.slice(1)) || 0, { scroll: location.hash.length > 1 });
  return window.explainer;
}
