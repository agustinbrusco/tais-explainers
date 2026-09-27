// Small helpers for the home-page windows (home/<slug>.js).

// A timeline player: render(t) must be a pure function of the time t in seconds; play() runs it from 0 to its end once
// (a replay while playing is ignored).
export function player(render, end) {
  let raf = 0;
  render(0);
  return {
    final: () => render(end),
    play() {
      if (raf) return;
      const t0 = performance.now();
      const tick = (now) => {
        const t = (now - t0) / 1000;
        render(Math.min(t, end));
        raf = t < end ? requestAnimationFrame(tick) : 0;
      };
      raf = requestAnimationFrame(tick);
    },
  };
}

export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const ease = (x) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const svgEl = (parent, tag, attrs = {}) => {
  const e = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent.appendChild(e);
  return e;
};
