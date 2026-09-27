// Drawings for the paper scene (paper.js): each function returns a view { id, draw(g, ctx), update? }.
// Materials as everywhere in the piece: glass = the model's interior (blue states), gold = reading (probes and their
// scores), violet = writing, paper cards = visible text and published facts. Numbers come from the caller (main.js),
// which takes them from the claims-backed data or from the cited sources.
import * as d3 from "d3";

const TAU = Math.PI * 2;

/** A probe glyph: its level sets (three gold lines, the middle one heavy), centred at (x, y). */
export function probeGlyph(g, x, y, s = 1, cls = "q-lvl") {
  const gg = g.append("g").attr("transform", `translate(${x},${y}) scale(${s})`);
  [-9, 0, 9].forEach((dx) => gg.append("line").attr("class", dx ? cls : `${cls} zero`).attr("x1", dx).attr("x2", dx).attr("y1", -13).attr("y2", 13));
  return gg;
}

/** A paper card with a title, body lines and a tag; returns its group. */
export function card(g, ctx, { x, y, w, h, title, body, tag, glyph }) {
  const c = g.append("g").attr("class", "q-card");
  c.append("rect").attr("x", x).attr("y", y).attr("width", w).attr("height", h).attr("rx", 7).attr("filter", ctx.cardFilter);
  const fs = ctx.phone ? 21 : 17;
  const gx = x + 16;
  if (glyph) glyph(c, gx + 10, y + 26);
  c.append("text").attr("class", "q-card-title").attr("x", gx + (glyph ? 34 : 0)).attr("y", y + 32).text(title);
  const t = c.append("text").attr("class", "q-card-body").attr("x", gx).attr("y", y + 32 + fs * 1.7);
  ctx.lines(t, body, gx);
  if (tag) c.append("text").attr("class", "q-card-tag").attr("x", gx).attr("y", y + h - 14).text(tag);
  return c;
}

// ---------------------------------------------------------------------------------------------------------------------
// Prologue: readers in production. A schematic stream of exchanges runs through a model; a probe reads it (drawn at one
// layer; production probes may read several); a few are flagged and drop onto paper, to further checks. It ends as a snapshot of the running stream.
// Below: what three labs report.
export function prologueView() {
  return {
    id: "prologue",
    draw(g, ctx) {
      const { phone } = ctx;
      const G = { x0: 10, y0: 58, x1: 710, y1: phone ? 262 : 296 };
      // legend band
      const lg = g.append("g").attr("class", "legend");
      const lgy = 34;
      lg.append("circle").attr("cx", 22).attr("cy", lgy - 6).attr("r", 6).attr("class", "q-lg-ex");
      lg.append("text").attr("class", "lg-text").attr("x", 36).attr("y", lgy).text("an exchange: its hidden states");
      const lx = phone ? 420 : 392;
      lg.append("circle").attr("cx", lx).attr("cy", lgy - 6).attr("r", 8).attr("class", "q-lg-read");
      lg.append("text").attr("class", "lg-text").attr("x", lx + 16).attr("y", lgy).text("read by the probe");
      ctx.glass(g, G);
      const rowY = G.y0 + (G.y1 - G.y0) * 0.62;
      // the model: layers the stream passes through
      const mx0 = 170, mx1 = 560, nl = 9;
      const band = g.append("g").attr("class", "q-model");
      band.append("rect").attr("class", "q-modelbox").attr("x", mx0 - 18).attr("y", G.y0 + 44).attr("width", mx1 - mx0 + 36).attr("height", G.y1 - G.y0 - 66).attr("rx", 10);
      d3.range(nl).forEach((i) => band.append("line").attr("class", "q-layer").attr("x1", mx0 + i * (mx1 - mx0) / (nl - 1)).attr("x2", mx0 + i * (mx1 - mx0) / (nl - 1))
        .attr("y1", G.y0 + 56).attr("y2", G.y1 - 34));
      band.append("text").attr("class", "glass-label faint").attr("x", mx0 - 10).attr("y", G.y0 + 34).text("the model, layer by layer");
      // the probe reads one layer: a tap down to the stream's row
      const px = mx0 + 6 * (mx1 - mx0) / (nl - 1);
      const probe = g.append("g").attr("class", "q-probe");
      probe.append("line").attr("class", "q-tap").attr("x1", px).attr("x2", px).attr("y1", G.y0 + 92).attr("y2", rowY - 12);
      probeGlyph(probe, px, G.y0 + 74, 1.1, "q-lvlg");
      probe.append("text").attr("class", "glass-label gold").attr("x", px - 22).attr("y", G.y0 + 80).attr("text-anchor", "end").text("a probe");
      probe.append("text").attr("class", "glass-label small gold").attr("x", px - 22).attr("y", G.y0 + 102).attr("text-anchor", "end").text("one or more layers");
      ctx.fadeIn(band, 0, 500);
      ctx.fadeIn(probe, 300, 500);
      // the stream: exchanges enter on the left at a steady rate and move right at a steady speed
      const n = 30, flagged = new Set([6, 14]);
      const x0 = 26, xEnd = 700, v = (xEnd - x0) / 2600;                   // px per ms
      const gapT = 150, tFirst = 800, tLast = tFirst + (n - 1) * gapT;
      const T = tLast + 120;                                                // the snapshot: the last one just entered
      const paperY = G.y1 + (phone ? 36 : 40);
      const land = (i) => [640 + (i === 6 ? -16 : 16), paperY];
      const dots = g.append("g").attr("class", "q-stream");
      const reads = g.append("g").attr("class", "q-reads");
      const yOf = (i) => rowY + (((i * 37) % 9) - 4) * 3.4;
      for (let i = 0; i < n; i++) {
        const t0 = tFirst + i * gapT, y = yOf(i), fl = flagged.has(i);
        const tRead = t0 + (px - x0) / v;
        const d = dots.append("circle").attr("class", "q-ex").attr("r", phone ? 6.5 : 5.2).attr("cx", x0).attr("cy", y);
        const xAt = (t) => x0 + v * (t - t0);
        if (fl) {
          const [lx_, ly_] = land(i);
          const r = reads.append("circle").attr("class", "q-read").attr("r", phone ? 11 : 9.5).attr("cx", px).attr("cy", y);
          if (ctx.reduced) { d.attr("cx", lx_).attr("cy", ly_); r.attr("cx", lx_).attr("cy", ly_); continue; }
          d.style("opacity", 0).transition().delay(t0).duration(150).style("opacity", 1)
            .transition().duration(tRead - t0 - 150).ease(d3.easeLinear).attr("cx", px)
            .transition().duration((mx1 + 30 - px) / v).ease(d3.easeLinear).attr("cx", mx1 + 30)
            .transition().duration(700).ease(d3.easeCubicInOut).attr("cx", lx_).attr("cy", ly_);
          r.style("opacity", 0).transition().delay(tRead).duration(120).style("opacity", 1)
            .transition().duration((mx1 + 30 - px) / v).ease(d3.easeLinear).attr("cx", mx1 + 30)
            .transition().duration(700).ease(d3.easeCubicInOut).attr("cx", lx_).attr("cy", ly_);
          continue;
        }
        const tOut = t0 + (xEnd - x0) / v;
        if (tOut <= T) {
          // gone past before the snapshot
          if (ctx.reduced) { d.remove(); continue; }
          d.style("opacity", 0).transition().delay(t0).duration(150).style("opacity", 1)
            .transition().duration(tOut - t0 - 150).ease(d3.easeLinear).attr("cx", xEnd).transition().duration(200).style("opacity", 0).remove();
        } else {
          const xT = xAt(T);
          if (ctx.reduced) d.attr("cx", xT);
          else d.style("opacity", 0).transition().delay(t0).duration(150).style("opacity", 1)
            .transition().duration(T - t0 - 150).ease(d3.easeLinear).attr("cx", xT);
        }
        // the probe's reading: a gold ring flashes as it passes (and, in the snapshot, stays on the one being read)
        if (tRead <= T) {
          const r = reads.append("circle").attr("class", "q-read").attr("r", phone ? 11 : 9.5).attr("cx", px).attr("cy", y);
          const last = xAt(T) >= px && xAt(T) - px < v * gapT * 1.2;
          if (ctx.reduced) { if (!last) r.remove(); else r.attr("cx", xAt(T)); continue; }
          r.style("opacity", 0).transition().delay(tRead).duration(100).style("opacity", 0.9)
            .transition().duration(last ? T - tRead - 100 : 320).ease(d3.easeLinear).attr("cx", last ? xAt(T) : px + v * 420)
            .style("opacity", last ? 0.9 : 0);
        }
      }
      // where the flagged ones land: heavier checks, on paper
      const esc = g.append("g").attr("class", "q-esc");
      esc.append("path").attr("class", "q-drop").attr("d", `M${mx1 + 30},${G.y1 - 4} C${mx1 + 30},${paperY - 6} ${600},${paperY - 2} ${land(6)[0] - 14},${paperY}`);
      esc.append("text").attr("class", "q-note").attr("x", 600).attr("y", paperY + 6).attr("text-anchor", "end").text("flagged: on to further checks");
      ctx.fadeIn(esc, ctx.reduced ? 0 : tFirst + 6 * gapT + 2600, 500);
      // three labs, as they report it
      const cy0 = paperY + (phone ? 24 : 30);
      const labs = [
        { title: "Anthropic", lines: phone ? ["Claude Opus 5.5 (cyber): a probe screens all", "traffic, then two further classifiers"]
          : ["Claude Opus 5.5, cyber:", "a probe screens all traffic,", "then a lightweight classifier,", "then an LLM classifier"], glyph: "probe" },
        { title: "Google DeepMind", lines: phone ? ["Gemini: misuse-mitigation probes in", "user-facing instances"]
          : ["Gemini: misuse-mitigation", "probes deployed in", "user-facing instances"], glyph: "probe" },
        { title: "OpenAI", lines: phone ? ["GPT-5.6 Sol and Terra: activation classifiers", "pause streaming for a separate check"]
          : ["GPT-5.6 Sol and Terra:", "activation classifiers pause", "streaming for a separate", "check (design undisclosed)"], glyph: "box" },
      ];
      const glyph = (c, kind, x, y) => (kind === "probe" ? probeGlyph(c, x, y, 0.8, "q-lvl")
        : c.append("rect").attr("class", "q-box").attr("x", x - 11).attr("y", y - 11).attr("width", 22).attr("height", 22).attr("rx", 4));
      labs.forEach((lb, i) => {
        const c = g.append("g").attr("class", "q-card");
        if (phone) {
          const rh = 80, y = cy0 + i * (rh + 6);
          c.append("rect").attr("x", 10).attr("y", y).attr("width", 700).attr("height", rh).attr("rx", 7).attr("filter", ctx.cardFilter);
          glyph(c, lb.glyph, 34, y + 24);
          c.append("text").attr("class", "q-card-title").attr("x", 62).attr("y", y + 28).text(lb.title);
          ctx.lines(c.append("text").attr("class", "q-card-body").attr("x", 62).attr("y", y + 51), lb.lines, 62, 1.12);
        } else {
          const cw = 222, gap = 17, x = 10 + i * (cw + gap), h = 176;
          c.append("rect").attr("x", x).attr("y", cy0).attr("width", cw).attr("height", h).attr("rx", 7).attr("filter", ctx.cardFilter);
          glyph(c, lb.glyph, x + 26, cy0 + 26);
          c.append("text").attr("class", "q-card-title").attr("x", x + 50).attr("y", cy0 + 32).text(lb.title);
          ctx.lines(c.append("text").attr("class", "q-card-body").attr("x", x + 16).attr("y", cy0 + 62), lb.lines, x + 16);
          c.append("text").attr("class", "q-card-tag").attr("x", x + 16).attr("y", cy0 + h - 14).text("as the lab reports it");
        }
        ctx.fadeIn(c, 300 + i * 250, 450);
      });
      return ctx.reduced ? 0 : T + 200;
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Why linear: how the next block reads the residual stream (a normalization, then dot products with fixed directions,
// then a write back by adding), beside how a probe reads it (one direction). A toggle swaps the linear probe for a
// probe with a hidden layer, which can compute what it reports.
export function whyLinearView({ kind, cfg }) {
  const draw = (g, ctx) => {
    const { phone } = ctx;
    const G = { x0: 10, y0: 58, x1: 710, y1: phone ? 360 : 352 };
    // legend
    const lg = g.append("g").attr("class", "legend");
    const items = [["stream", "the residual stream"], ["mlp", "a block's reads"], ["probe", "a probe's read"]];
    let lx = 16;
    for (const [k, t] of items) {
      if (k === "stream") lg.append("rect").attr("x", lx - 4).attr("y", 18).attr("width", 8).attr("height", 22).attr("rx", 3).attr("class", "q-lg-stream");
      else lg.append("line").attr("x1", lx - 9).attr("x2", lx + 9).attr("y1", 29).attr("y2", 29).attr("class", k === "mlp" ? "q-lg-mlp" : "q-lg-probe");
      const tt = lg.append("text").attr("class", "lg-text").attr("x", lx + 16).attr("y", 35).text(t);
      lx += 16 + (tt.node().getComputedTextLength?.() ?? t.length * 11) + 30;
    }
    ctx.glass(g, G);
    const sx = phone ? 250 : 262;                              // the stream
    const yTop = G.y0 + 26, yBot = G.y1 - 22, yR = G.y0 + (G.y1 - G.y0) * 0.6, yW = G.y0 + 70;
    const st = g.append("g").attr("class", "q-streamg");
    st.append("rect").attr("class", "q-stream-rib").attr("x", sx - 5).attr("y", yTop).attr("width", 10).attr("height", yBot - yTop).attr("rx", 5);
    st.append("text").attr("class", "glass-label faint").attr("x", sx - 14).attr("y", yBot - 2).attr("text-anchor", "end").text("layer ℓ");
    st.append("text").attr("class", "glass-label faint").attr("x", sx - 14).attr("y", yTop + 14).attr("text-anchor", "end").text("layer ℓ + 1");
    st.append("circle").attr("class", "q-h").attr("cx", sx).attr("cy", yR).attr("r", 7);
    st.append("text").attr("class", "glass-label").attr("x", sx - 14).attr("y", yR - 14).attr("text-anchor", "end").text("h");
    ctx.fadeIn(st, 0, 500);
    // the next block's MLP: normalize, read along many fixed directions, write back by adding
    const bx0 = sx + 90, bx1 = G.x1 - 18, by0 = yR - 96, by1 = G.y1 - 16;
    const blk = g.append("g").attr("class", "q-block");
    blk.append("rect").attr("class", "q-blockbox").attr("x", bx0).attr("y", by0).attr("width", bx1 - bx0).attr("height", by1 - by0).attr("rx", 10);
    blk.append("text").attr("class", "glass-label mlp").attr("x", bx0 + 12).attr("y", by0 + 24).text("the next block's MLP");
    const nx = bx0 + 34;
    blk.append("line").attr("class", "q-read-mlp").attr("x1", sx + 7).attr("x2", nx - 22).attr("y1", yR).attr("y2", yR);
    const nchip = blk.append("g").attr("transform", `translate(${nx},${yR})`);
    nchip.append("rect").attr("class", "q-norm").attr("x", -22).attr("y", -15).attr("width", 64).attr("height", 30).attr("rx", 6);
    nchip.append("text").attr("class", "glass-label small").attr("x", 10).attr("y", 6).attr("text-anchor", "middle").text("norm");
    const ux = bx0 + (bx1 - bx0) * 0.58, units = d3.range(7).map((i) => by0 + 44 + i * ((by1 - by0 - 62) / 6));
    const fan = blk.append("g").attr("class", "q-fan");
    units.forEach((uy, i) => {
      fan.append("line").attr("class", "q-read-mlp thin").attr("x1", nx + 42).attr("y1", yR).attr("x2", ux - 6).attr("y2", uy);
      if (i !== 4) fan.append("circle").attr("class", "q-unit").attr("cx", ux).attr("cy", uy).attr("r", 4.5);
      else fan.append("text").attr("class", "glass-label small").attr("x", ux).attr("y", uy + 6).attr("text-anchor", "middle").text("⋮");
    });
    fan.append("text").attr("class", "glass-label small mlp").attr("x", bx1 - 12).attr("y", by1 - 12).attr("text-anchor", "end")
      .text(`${(cfg.intermediate * 2).toLocaleString("en-US")} directions`);
    // the write: back into the stream, by adding
    const wx = bx1 - 30;
    const wr = blk.append("g").attr("class", "q-writeg");
    units.forEach((uy, i) => { if (i !== 4) wr.append("line").attr("class", "q-read-mlp faint").attr("x1", ux + 5).attr("y1", uy).attr("x2", wx).attr("y2", yR); });
    wr.append("path").attr("class", "q-write").attr("d", `M${wx},${yR} V${yW} H${sx + 12}`).attr("marker-end", ctx.arrow("glass"));
    wr.append("circle").attr("class", "q-plus").attr("cx", sx).attr("cy", yW).attr("r", 9);
    wr.append("path").attr("class", "q-plus-x").attr("d", `M${sx - 5},${yW}H${sx + 5}M${sx},${yW - 5}V${yW + 5}`);
    wr.append("text").attr("class", "glass-label small faint").attr("x", sx + 22).attr("y", yW - 12).text("writes back by adding");
    ctx.fadeIn(blk.select("rect"), 500, 400); ctx.fadeIn(blk.select("text"), 500, 400);
    ctx.fadeIn(blk.selectAll(".q-read-mlp:not(.thin):not(.faint)"), 700, 400); ctx.fadeIn(nchip, 800, 400);
    ctx.fadeIn(fan, 1200, 700);
    ctx.fadeIn(wr, 2000, 600);
    // the probe: one direction, read off the stream (linear), or a small network (MLP)
    const px = G.x0 + (phone ? 70 : 84);
    const lin = g.append("g").attr("class", "q-probe-lin");
    lin.append("line").attr("class", "q-read-probe").attr("x1", sx - 7).attr("x2", px + 16).attr("y1", yR).attr("y2", yR);
    lin.append("circle").attr("class", "q-score").attr("cx", px).attr("cy", yR).attr("r", 12);
    lin.append("text").attr("class", "glass-label gold").attr("x", px - 4).attr("y", yR - 26).text("a probe");
    lin.append("text").attr("class", "glass-label small gold").attr("x", px - 4).attr("y", yR + 38).text("one direction");
    const mlp = g.append("g").attr("class", "q-probe-mlp");
    const hx = (px + sx) / 2 + 6, hys = [-54, -18, 18, 54].map((d) => yR + d);
    hys.forEach((hy) => {
      mlp.append("line").attr("class", "q-read-probe thin").attr("x1", sx - 7).attr("y1", yR).attr("x2", hx + 6).attr("y2", hy);
      mlp.append("line").attr("class", "q-read-probe thin").attr("x1", hx - 6).attr("y1", hy).attr("x2", px + 14).attr("y2", yR);
      mlp.append("circle").attr("class", "q-unit-probe").attr("cx", hx).attr("cy", hy).attr("r", 5);
    });
    mlp.append("circle").attr("class", "q-score").attr("cx", px).attr("cy", yR).attr("r", 12);
    mlp.append("text").attr("class", "glass-label gold").attr("x", px - 4).attr("y", yR - 26).text("a probe");
    mlp.append("text").attr("class", "glass-label small gold").attr("x", px - 4).attr("y", yR + 38).text("a hidden layer");
    const showLin = kind === "linear";
    lin.style("opacity", 0).transition().delay(ctx.at(2700)).duration(ctx.dur(600)).style("opacity", showLin ? 1 : 0);
    mlp.style("opacity", 0).transition().delay(ctx.at(2700)).duration(ctx.dur(600)).style("opacity", showLin ? 0 : 1);
    // paper: the two reads, as formulas
    const py = G.y1 + (phone ? 48 : 46), fs = phone ? 24 : 21;
    const fx = G.x0 + 6, fx2 = phone ? 250 : 240;
    const f = g.append("g").attr("class", "q-formulas");
    f.append("text").attr("class", "q-f-label").attr("x", fx).attr("y", py).text("a unit of the block");
    f.append("text").attr("class", "q-f mlp").attr("x", fx2).attr("y", py).text("silu(g · norm(h)) × (u · norm(h))");
    const fLin = f.append("g").attr("class", "q-f-lin");
    fLin.append("text").attr("class", "q-f-label").attr("x", fx).attr("y", py + fs * 1.9).text("a linear probe");
    fLin.append("text").attr("class", "q-f gold").attr("x", fx2).attr("y", py + fs * 1.9).text("w · h + b");
    const fMlp = f.append("g").attr("class", "q-f-mlp");
    fMlp.append("text").attr("class", "q-f-label").attr("x", fx).attr("y", py + fs * 1.9).text("a probe with a hidden layer");
    fMlp.append("text").attr("class", "q-f gold").attr("x", fx2 + (phone ? 110 : 90)).attr("y", py + fs * 1.9).text("v · relu(W h + c) + b");
    const note = f.append("text").attr("class", "q-note").attr("x", fx).attr("y", py + fs * 3.9);
    ctx.lines(note, phone ? ["g, u: two of the MLP's fixed directions", "h: the state once attention has added to it", "norm(h): h over its root-mean-square, times a gain"]
      : ["g, u: two of the MLP's fixed directions", "h: the state once attention has added to it", "norm(h): h divided by its root-mean-square, times a learned gain"], fx);
    ctx.fadeIn(f.select(".q-f-label"), 3300, 400); ctx.fadeIn(f.select(".q-f.mlp"), 3300, 400);
    fLin.style("opacity", 0).transition().delay(ctx.at(3700)).duration(ctx.dur(400)).style("opacity", showLin ? 1 : 0);
    fMlp.style("opacity", 0).transition().delay(ctx.at(3700)).duration(ctx.dur(400)).style("opacity", showLin ? 0 : 1);
    ctx.fadeIn(note, 3900, 400);
    return ctx.reduced ? 0 : 4300;
  };
  const update = (g, ctx) => {
    const showLin = kind === "linear";
    for (const [sel, on] of [[".q-probe-lin", showLin], [".q-probe-mlp", !showLin], [".q-f-lin", showLin], [".q-f-mlp", !showLin]])
      g.select(sel).interrupt().transition().duration(ctx.dur(500)).style("opacity", on ? 1 : 0);
    return ctx.reduced ? 0 : 500;
  };
  return { id: "whylinear", draw, update };
}

// ---------------------------------------------------------------------------------------------------------------------
// Othello: a mid-game position, the board a probe tries to read out of Othello-GPT, which only ever sees the moves.
export const OTHELLO = {
  // rows 1..8, columns a..h; B black, W white, . empty: the position after these 12 moves (checked by playing them out)
  cells: ["........", "..B.....", ".WBB....", ".WWBBW..", "..WBBB..", "..BWW...", "........", "........"],
  moves: ["f5", "d6", "c3", "d3", "c4", "f4", "c5", "b3", "c2", "e6", "c6", "b4"],
  toMove: "B",
};

/** An Othello board at (x, y), cell size s. mode "bw": black and white discs; "my": the discs of the player to move are
 *  "mine" (filled, blue: the model's own coding), the other player's "yours" (hollow). */
export function drawBoard(g, { x, y, s, mode = "bw", cells = OTHELLO.cells, toMove = OTHELLO.toMove, labels = true, cls = "" }) {
  const b = g.append("g").attr("class", `ob ${cls}`);
  b.append("rect").attr("class", "ob-bg").attr("x", x).attr("y", y).attr("width", 8 * s).attr("height", 8 * s).attr("rx", 3);
  for (let i = 1; i < 8; i++) {
    b.append("line").attr("class", "ob-grid").attr("x1", x + i * s).attr("x2", x + i * s).attr("y1", y).attr("y2", y + 8 * s);
    b.append("line").attr("class", "ob-grid").attr("x1", x).attr("x2", x + 8 * s).attr("y1", y + i * s).attr("y2", y + i * s);
  }
  if (labels) {
    "abcdefgh".split("").forEach((c, i) => b.append("text").attr("class", "ob-lab").attr("x", x + (i + 0.5) * s).attr("y", y - 6).attr("text-anchor", "middle").text(c));
    d3.range(8).forEach((r) => b.append("text").attr("class", "ob-lab").attr("x", x - 7).attr("y", y + (r + 0.5) * s + 5).attr("text-anchor", "end").text(r + 1));
  }
  cells.forEach((row, r) => row.split("").forEach((c, q) => {
    if (c === ".") return;
    const cx = x + (q + 0.5) * s, cy = y + (r + 0.5) * s, rr = s * 0.36;
    if (mode === "bw") b.append("circle").attr("class", c === "B" ? "ob-disc black" : "ob-disc white").attr("cx", cx).attr("cy", cy).attr("r", rr);
    else b.append("circle").attr("class", c === toMove ? "ob-disc mine" : "ob-disc yours").attr("cx", cx).attr("cy", cy).attr("r", rr);
  }));
  return b;
}

/** P2: can a probe read the board? The model sees only moves; a probe reads its state at one layer; two published
 *  accuracies for reading each square as black, white or empty. */
export function othelloPredictView({ acc }) {
  return {
    id: "othello-p2",
    draw(g, ctx) {
      const { phone } = ctx;
      const G = { x0: 10, y0: 58, x1: 710, y1: phone ? 214 : 200 };
      ctx.glass(g, G);
      // the moves, as tokens, entering the model
      const toks = OTHELLO.moves.slice(0, phone ? 9 : 12);
      const cw = phone ? 46 : 40, gap = 6, tx0 = G.x0 + 22, ty = G.y0 + 70;
      const chips = g.append("g").attr("class", "o-moves");
      toks.forEach((m, i) => {
        const cg = chips.append("g").attr("transform", `translate(${tx0 + i * (cw + gap)},${ty})`);
        cg.append("rect").attr("class", "o-chip").attr("width", cw).attr("height", phone ? 34 : 30).attr("rx", 5);
        cg.append("text").attr("class", "o-chip-t").attr("x", cw / 2).attr("y", phone ? 23 : 21).attr("text-anchor", "middle").text(m);
        cg.style("opacity", 0).transition().delay(ctx.at(i * 70)).duration(ctx.dur(200)).style("opacity", 1);
      });
      g.append("text").attr("class", "glass-label faint").attr("x", tx0).attr("y", G.y0 + 38).text("Othello-GPT sees only the moves");
      // the model reading them: a band of layers; a probe taps one layer
      const mx0 = tx0 + toks.length * (cw + gap) + 20, mx1 = G.x1 - 30;
      const band = g.append("g").attr("class", "q-model");
      d3.range(8).forEach((i) => band.append("line").attr("class", "q-layer").attr("x1", mx0 + i * (mx1 - mx0) / 7).attr("x2", mx0 + i * (mx1 - mx0) / 7)
        .attr("y1", G.y0 + 50).attr("y2", G.y1 - 18));
      band.append("text").attr("class", "glass-label faint").attr("x", (mx0 + mx1) / 2).attr("y", G.y0 + 38).attr("text-anchor", "middle").text("8 layers");
      ctx.fadeIn(band, 500, 400);
      const px = mx0 + 6 * (mx1 - mx0) / 7;
      const tap = g.append("g");
      probeGlyph(tap, px, G.y1 - 44, 0.9, "q-lvlg");
      tap.append("line").attr("class", "q-tap").attr("x1", px).attr("x2", px).attr("y1", G.y1 - 26).attr("y2", G.y1 + 26);
      ctx.fadeIn(tap, 900, 400);
      // paper: the board the probe tries to read, and how well two probes read it
      const s = phone ? 30 : 32, bx = G.x0 + 34, by = G.y1 + 50;
      const board = drawBoard(g, { x: bx, y: by, s, mode: "bw" });
      ctx.fadeIn(board, 1100, 500);
      g.append("text").attr("class", "q-note").attr("x", bx - 24).attr("y", by + 8 * s + 32).text(`${OTHELLO.toMove === "B" ? "black" : "white"} to move`);
      const rx = bx + 8 * s + (phone ? 40 : 56), rw = G.x1 - rx - 10;
      const rows = [
        { k: "lin", label: "a linear probe", sub: "black / white / empty", v: acc.linear },
        { k: "mlp", label: "an MLP probe", sub: "one hidden layer", v: acc.mlp },
      ];
      const x = d3.scaleLinear().domain([0, 1]).range([rx, rx + rw]);
      const bars = g.append("g").attr("class", "o-bars");
      rows.forEach((r, i) => {
        const y0 = by + 16 + i * (phone ? 110 : 100);
        const gg = bars.append("g");
        gg.append("text").attr("class", "q-card-title").attr("x", rx).attr("y", y0).text(r.label);
        gg.append("text").attr("class", "q-note faint").attr("x", rx).attr("y", y0 + (phone ? 25 : 22)).text(r.sub);
        gg.append("rect").attr("class", "o-track").attr("x", rx).attr("y", y0 + 34).attr("width", rw).attr("height", 14).attr("rx", 3);
        gg.append("rect").attr("class", "o-bar").attr("x", rx).attr("y", y0 + 34).attr("height", 14).attr("rx", 3)
          .attr("width", ctx.reduced ? x(r.v) - rx : 0).transition().delay(ctx.at(1600 + i * 500)).duration(ctx.dur(700)).attr("width", x(r.v) - rx);
        gg.append("text").attr("class", "o-val").attr("x", rx + rw).attr("y", y0).attr("text-anchor", "end").text(`${(100 * r.v).toFixed(1)}%`);
        ctx.fadeIn(gg, 1400 + i * 500, 400);
      });
      // the baseline: always guess each square's commonest state
      const bl = g.append("g").attr("class", "o-base");
      const yb0 = by + 50, yb1 = by + 50 + (phone ? 110 : 100) + 14;
      bl.append("line").attr("x1", x(acc.base)).attr("x2", x(acc.base)).attr("y1", yb0 - 4).attr("y2", yb1 + 4);
      bl.append("text").attr("class", "q-note faint").attr("x", rx).attr("y", yb1 + (phone ? 36 : 32))
        .text(`dashed: always the likeliest state, ${(100 * acc.base).toFixed(1)}%`);
      ctx.fadeIn(bl, 2600, 400);
      return ctx.reduced ? 0 : 3100;
    },
  };
}
