// The paper scene of "What a Probe Reads": figures that are not clouds of states (readers in production, why a probe
// is linear, the Othello board, cascades, evidence boards). It shares the stage's SVG with the probe figure (figure.js)
// and the pipeline scene (pipeline.js), and keeps their frame: a glass window at the top where the model's interior is
// drawn, paper below it.
//
// Each view brings its own drawing: view.draw(g, ctx) builds its elements (starting hidden) and schedules their
// choreography with d3 transitions, then returns its total length in ms. The scene cross-fades between views; a view
// that keeps its id and has view.update(g, ctx) is updated in place (a toggle). Under reduced motion ctx.dur() and
// ctx.at() return 0, so every drawing lands in its final state at once.
import * as d3 from "d3";

export class Paper {
  constructor(svgEl, figL, { reduced = false, tip = null } = {}) {
    this.svg = d3.select(svgEl);
    this.L = { ...figL };
    this.reduced = reduced;
    this.tipEl = tip;
    this.cur = null;
    this.g = null;
    this.hidden = true;
    this.id = `q${Math.random().toString(36).slice(2, 7)}`;
    const defs = this.svg.append("defs");
    const grad = defs.append("linearGradient").attr("id", `${this.id}-gfill`).attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 1);
    grad.append("stop").attr("offset", 0).attr("stop-color", "#101723");
    grad.append("stop").attr("offset", 1).attr("stop-color", "#070a10");
    defs.append("filter").attr("id", `${this.id}-card`).attr("x", "-10%").attr("y", "-20%").attr("width", "120%").attr("height", "150%")
      .html(`<feDropShadow dx="0" dy="1.5" stdDeviation="1.8" flood-color="#3c2d14" flood-opacity="0.2"/>`);
    // arrowheads, one per material: ink on paper, gold (reading), violet (writing), light on glass
    for (const [k, col] of [["ink", "var(--ink2)"], ["gold", "var(--overseer-ink)"], ["goldg", "var(--overseer)"],
      ["violet", "var(--feature-ink)"], ["violetg", "var(--feature)"], ["glass", "#c9d2de"], ["mag", "var(--training)"]]) {
      defs.append("marker").attr("id", `${this.id}-ah-${k}`).attr("viewBox", "0 0 10 10").attr("refX", 8).attr("refY", 5)
        .attr("markerWidth", 7).attr("markerHeight", 7).attr("orient", "auto-start-reverse")
        .append("path").attr("d", "M0,0L10,5L0,10z").style("fill", col);
    }
    this.root = this.svg.append("g").attr("class", "paper-root").style("opacity", 0).style("pointer-events", "none");
  }

  dur(ms) { return this.reduced ? 0 : ms; }

  setVisible(on, ms = 450) {
    this.hidden = !on;
    this.root.interrupt().style("pointer-events", on ? null : "none")
      .transition().duration(this.dur(ms)).style("opacity", on ? 1 : 0);
    if (!on && this.tipEl) this.tipEl.hidden = true;
  }

  ctx() {
    const self = this;
    return {
      L: this.L, phone: !!this.L.phone, reduced: this.reduced,
      dur: (ms) => this.dur(ms), at: (ms) => this.dur(ms),
      arrow: (k) => `url(#${this.id}-ah-${k})`,
      cardFilter: `url(#${this.id}-card)`,
      /** A glass window: dark gradient, faint edge. */
      glass(g, r) {
        const gg = g.append("g").attr("class", "q-glass");
        gg.append("rect").attr("x", r.x0).attr("y", r.y0).attr("width", r.x1 - r.x0).attr("height", r.y1 - r.y0).attr("rx", r.rx ?? 12)
          .attr("fill", `url(#${self.id}-gfill)`);
        gg.append("rect").attr("class", "glass-edge").attr("x", r.x0 + 0.5).attr("y", r.y0 + 0.5).attr("width", r.x1 - r.x0 - 1)
          .attr("height", r.y1 - r.y0 - 1).attr("rx", r.rx ?? 12);
        return gg;
      },
      /** Fade a selection in at `t` ms, over `d` ms. */
      fadeIn(sel, t, d = 450) {
        sel.style("opacity", 0).transition().delay(self.dur(t)).duration(self.dur(d)).style("opacity", 1);
        return sel;
      },
      /** Multi-line text: lines as tspans (dy in em). */
      lines(sel, arr, x, dy = 1.25) {
        arr.forEach((t, i) => sel.append("tspan").attr("x", x).attr("dy", i ? `${dy}em` : 0).text(t));
        return sel;
      },
      tip: (html, x, y) => {
        if (!this.tipEl) return;
        if (html == null) { this.tipEl.hidden = true; return; }
        const box = this.svg.node().getBoundingClientRect(), k = box.width / this.L.W;
        this.tipEl.hidden = false;
        this.tipEl.innerHTML = html;
        this.tipEl.style.left = `${Math.max(110, Math.min(box.width - 110, x * k))}px`;
        this.tipEl.style.top = `${y * k}px`;
      },
    };
  }

  /** Move to a view. Returns a promise that settles when its choreography has landed. */
  show(view) {
    const ctx = this.ctx();
    if (this.cur && this.g && this.cur.id === view.id && view.update) {
      this.cur = view;
      const t = view.update(this.g, ctx) ?? 0;
      return new Promise((res) => d3.timeout(res, this.dur(t)));
    }
    const old = this.g;
    if (old) old.interrupt().selectAll("*").interrupt();
    if (old) old.transition().duration(this.dur(300)).style("opacity", 0).remove();
    const g = this.g = this.root.append("g").attr("class", `pv pv-${view.id}`);
    this.cur = view;
    const total = view.draw(g, ctx) ?? 0;
    return new Promise((res) => d3.timeout(res, this.dur(total)));
  }
}
