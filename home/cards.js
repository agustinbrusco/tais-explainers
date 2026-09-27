// Home-page cards. Each piece's card carries a small live window in that piece's own style: home/<slug>.js exports
// mount(svg, { K, reduced }) -> { play }. A window draws its final frame at once under reduced motion; otherwise it plays
// once when it scrolls into view, and again when its card is hovered or focused.

const css = getComputedStyle(document.documentElement);
const K = new Proxy({}, { get: (_, name) => css.getPropertyValue(`--${name}`).trim() });
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

for (const el of document.querySelectorAll("[data-thumb]")) {
  import(`./${el.dataset.thumb}.js`).then(({ mount }) => {
    const win = mount(el.querySelector("svg"), { K, reduced });
    if (reduced) { win.final(); return; }
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); win.play(); } }, { threshold: 0.5 });
    io.observe(el);
    const card = el.closest(".piece");
    card.addEventListener("mouseenter", () => win.play());
    card.addEventListener("focusin", () => win.play());
  });
}
