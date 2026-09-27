// The hero: the whole argument in one shot, before any words.
//
// A wall of hidden states (columns = token positions, rows = layers; each square a real gelu-4l state) seen in
// perspective, receding into the dark. In front of it, on the floor, the transcript: a strip of paper.
// Act 1, a standard transformer, runs the 10-step chain: a pulse climbs one column, must leave the glass, lands on the
// paper (the monitor's highlighter marks the word) and climbs again from there, so the count restarts at every word.
// Act 2, full bandwidth: a wire carries the top state straight into the next column's first layer; words are still
// printed, but the pulse never needs them, and the count keeps growing.
// Canvas 2D with a small perspective camera; each square is drawn with the affine map of its projected corners.
// Reduced motion: one still frame of act 1 and a caption.

import { stateAt, rampCSS } from "./tiles.js";

const NARROW = () => matchMedia("(max-width: 860px)").matches;
const LAYERS = 4, DX = 1.0, DY = 0.92, TILE = 0.6, BASE = 0.78;   // world units
const CARD_Z = -0.72;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function mountHero(el, { K, font }) {
  if (!el) return;
  const canvas = document.createElement("canvas");
  el.appendChild(canvas);
  const main = canvas.getContext("2d");
  let ctx = main;                    // the drawing helpers draw into ctx: the canvas, or an offscreen layer (see below)
  const caption = el.parentElement.querySelector(".scene-caption");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // per-square textures (8x8 cells of a real state), drawn once
  const tex = new Map();
  const texture = (c, r) => {
    const k = `${c}_${r}`;
    if (tex.has(k)) return tex.get(k);
    const v = stateAt(c, r), cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    const g = cv.getContext("2d");
    g.fillStyle = "#02050b"; g.fillRect(0, 0, 64, 64);
    v.forEach((x, i) => { g.fillStyle = rampCSS(x / 127); g.fillRect((i % 8) * 8 + 0.6, Math.floor(i / 8) * 8 + 0.6, 6.8, 6.8); });
    tex.set(k, cv);
    return cv;
  };

  let W = 0, H = 0, dpr = 1, cam = null, N = 10, narrow = false;
  function layout() {
    const r = el.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(H * dpr));
    narrow = NARROW();
    N = narrow ? 7 : 10;
    // the camera stands just before the question, turned right: the transcript runs away from it, deeper into the dark
    cam = narrow
      ? { x: -2.2, y: 2.9, z: -4.6, yaw: 0.62, pitch: 0.2, f: H * 0.78, cx: W * 0.36, cy: H * 0.4 }
      : { x: -1.9, y: 2.75, z: -4.3, yaw: 0.56, pitch: 0.17, f: H * (W < 1100 ? 0.72 : 0.8), cx: W * (W < 1100 ? 0.7 : 0.6), cy: H * 0.45 };
    layers.clear();
  }

  // Offscreen layers, so a frame redraws only what moves. Under the moving pulse, the scene is kept as canvases its
  // size: the floor, and the monitor with the wall's wiring (fixed for a layout), and the squares with the finished
  // trails (fixed until a leg ends). Drawing into a transparent layer and compositing it gives the same pixels as
  // drawing in place (source-over is associative), and the drawing order is unchanged.
  const layers = new Map();          // name -> { cv, key }
  function layer(name, key, paint) {
    let l = layers.get(name);
    if (!l) {
      const cv = document.createElement("canvas");
      cv.width = canvas.width; cv.height = canvas.height;
      layers.set(name, (l = { cv, key: null }));
    }
    if (l.key !== key) {
      const g = l.cv.getContext("2d");
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, l.cv.width, l.cv.height);
      ctx = g; reset(); paint(); ctx = main;
      l.key = key;
    }
    main.setTransform(1, 0, 0, 1, 0, 0);
    main.drawImage(l.cv, 0, 0);
    reset();
  }
  // world -> screen. x runs along the transcript, y up; the wall is the plane z = 0, the camera at negative z
  function P(x, y, z) {
    const c = cam, dx = x - c.x, dy = y - c.y, dz = z - c.z;
    const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    const X = dx * cy - dz * sy, Zf = dx * sy + dz * cy;
    const Y = dy * cp + Zf * sp, Z = -dy * sp + Zf * cp;
    return [c.cx + (c.f * X) / Z, c.cy - (c.f * Y) / Z];
  }
  const colX = (c) => c * DX;
  const rowY = (r) => BASE + r * DY;

  // the full-bandwidth wire: a cable that leaves the top of column c, bows behind the wall, and plugs into the first
  // layer of column c + 1 (drawn as a smooth curve through world space)
  function wire(c) {
    const x0 = colX(c), x1 = colX(c + 1), top = rowY(LAYERS - 1), pts = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, e = u * u * (3 - 2 * u);
      pts.push([x0 + (x1 - x0) * e, top + 0.35 * Math.sin(Math.PI * Math.min(1, u * 1.6)) - (top - rowY(0)) * e, 0.55 * Math.sin(Math.PI * u)]);
    }
    return pts;
  }

  // ---------------- the two acts: legs of a route in world space ----------------
  // leg: { pts, kind: climb|carry|write|read|link, tile?: [c, r], count?, card?: {col, word, forced} }
  function route(mode) {
    const legs = [], top = rowY(LAYERS - 1);
    let count = 1;
    legs.push({ pts: [[0, 0.02, CARD_Z], [0, 0.05, -0.3], [0, rowY(0), 0]], kind: "read", tile: [0, 0], count });
    const out = (c, card) => {      // leave the glass: up, forward and down onto the paper at the next position
      const x0 = colX(c), x1 = colX(c + 1), pts = [];
      for (let i = 0; i <= 20; i++) {
        const u = i / 20;
        pts.push([x0 + (x1 - x0) * u, Math.max(0.02, (top + 0.55 * Math.sin(Math.PI * u)) * (1 - u * u)), CARD_Z * Math.sin((Math.PI / 2) * u)]);
      }
      legs.push({ pts, kind: "write", card });
    };
    if (mode === "standard") {
      const segs = [4, 4, 2], words = ["39", "64"];
      segs.forEach((n, c) => {
        for (let r = 1; r < LAYERS; r++) {
          const pts = [[colX(c), rowY(r - 1), 0], [colX(c), rowY(r), 0]];
          legs.push(r < n ? { pts, kind: "climb", tile: [c, r], count: ++count } : { pts, kind: "carry", tile: [c, r] });
        }
        if (c < segs.length - 1) {
          out(c, { col: c + 1, word: words[c], forced: true });
          count = 1;
          legs.push({ pts: [[colX(c + 1), 0.02, CARD_Z], [colX(c + 1), 0.05, -0.3], [colX(c + 1), rowY(0), 0]], kind: "read", tile: [c + 1, 0], count });
        } else out(c, { col: c + 1, word: "181", forced: false });
      });
    } else {
      const words = Array(9).fill("…");
      for (let c = 0; c < N - 1; c++) {
        for (let r = 1; r < LAYERS; r++) legs.push({ pts: [[colX(c), rowY(r - 1), 0], [colX(c), rowY(r), 0]], kind: "climb", tile: [c, r], count: ++count });
        if (c === N - 2) break;
        const x0 = colX(c), x1 = colX(c + 1), gx = (x0 + x1) / 2;
        legs.push({ pts: wire(c), kind: "link", tile: [c + 1, 0], count: ++count, card: { col: c + 1, word: words[c], forced: false, pale: true } });
      }
    }
    for (const l of legs) l.dur = { climb: 380, carry: 260, write: 950, read: 520, link: 760 }[l.kind];
    return legs;
  }

  // ---------------- drawing ----------------
  const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  function partial(pts, u) {         // a polyline up to fraction u of its length
    if (u >= 1) return pts;
    const seg = pts.slice(1).map((p, i) => dist(p, pts[i]));
    let rem = u * seg.reduce((a, b) => a + b, 0);
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      if (rem >= seg[i - 1]) { out.push(pts[i]); rem -= seg[i - 1]; continue; }
      const f = rem / seg[i - 1];
      out.push(pts[i - 1].map((v, k) => v + (pts[i][k] - v) * f));
      break;
    }
    return out;
  }
  function poly(pts, fill, stroke, lw = 1) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  function worldLine(pts, color, width, glow = 0) {
    ctx.beginPath();
    pts.forEach((w, i) => { const p = P(...w); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round";
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  function trail(l, pts) {           // a leg's light trail, up to pts
    const color = l.kind === "write" ? "rgba(245, 192, 74, 0.95)" : l.kind === "read" ? "rgba(225, 216, 196, 0.6)" : "rgba(126, 180, 255, 0.92)";
    worldLine(pts, color, l.kind === "climb" || l.kind === "link" ? 2.4 : 2, l.kind === "read" ? 0 : 12);
  }
  function affine(o, ex, ey, s) {    // map local units (s px per unit) onto the parallelogram at o spanned by ex, ey
    ctx.setTransform(dpr * (ex[0] - o[0]) * s, dpr * (ex[1] - o[1]) * s, dpr * (ey[0] - o[0]) * s, dpr * (ey[1] - o[1]) * s, dpr * o[0], dpr * o[1]);
  }
  const reset = () => ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  function draw({ mode, legs, u }) {
    reset();
    ctx.clearRect(0, 0, W, H);
    const done = Math.floor(u), frac = u - done;
    const lit = new Map(), printed = new Map();
    legs.forEach((l, i) => {
      const f = i < done ? 1 : i === done ? frac : 0;
      if (l.tile && f >= 0.999) lit.set(`${l.tile[0]}_${l.tile[1]}`, l.count ?? 0);
      if (l.card && l.kind === "write" && f > 0.9) printed.set(l.card.col, { ...l.card, a: Math.min(1, (f - 0.9) / 0.1) });
      if (l.card && l.kind === "link" && f > 0.5) printed.set(l.card.col, { ...l.card, a: Math.min(1, (f - 0.5) / 0.3) });
    });

    // the floor: the transcript, a strip of paper in front of the wall, fading into the dark at the far end
    const hw = 0.38, hz = 0.24;
    layer("floor", "floor", () => {
      const x0 = -0.75, x1 = colX(N - 1) + 1.2, zn = -0.22, zf = -1.22;
      const strip = [P(x0, 0, zn), P(x1, 0, zn), P(x1, 0, zf), P(x0, 0, zf)];
      poly(strip, "rgba(238, 232, 219, 0.95)");
      const fa = P(colX(N - 1) + 1.2, 0, -0.7), fb = P(colX(Math.max(2, N - 5)), 0, -0.7);
      const grad = ctx.createLinearGradient(fa[0], fa[1], fb[0], fb[1]);
      grad.addColorStop(0, "rgba(6,8,13,0.97)"); grad.addColorStop(1, "rgba(6,8,13,0)");
      poly(strip, grad);
      for (let c = 0; c < N; c++) {
        const cx = colX(c);
        poly([P(cx - hw, 0, CARD_Z + hz), P(cx + hw, 0, CARD_Z + hz), P(cx + hw, 0, CARD_Z - hz), P(cx - hw, 0, CARD_Z - hz)], null, "rgba(130, 112, 86, 0.4)", 0.8);
      }
    });
    for (let c = 0; c < N; c++) {      // the words on the cards (cards don't overlap, so the outlines can go first)
      const cx = colX(c);
      const card = c === 0 ? { word: "Q", a: 1 } : printed.get(c);
      if (!card) continue;
      if (card.forced) {  // the monitor's highlighter
        const w = 1.55 * hw * Math.min(1, card.a * 1.4);
        poly([P(cx - hw * 0.78, 0, CARD_Z + 0.13), P(cx - hw * 0.78 + w, 0, CARD_Z + 0.13), P(cx - hw * 0.78 + w, 0, CARD_Z - 0.13), P(cx - hw * 0.78, 0, CARD_Z - 0.13)],
          `rgba(243, 205, 91, ${0.92 * card.a})`);
      }
      const o = P(cx, 0, CARD_Z), ex = P(cx + 1, 0, CARD_Z);
      const size = Math.max(9, Math.hypot(ex[0] - o[0], ex[1] - o[1]) * (card.word.length > 3 ? 0.2 : 0.26));
      ctx.fillStyle = card.pale ? `rgba(70, 62, 50, ${0.6 * card.a})` : `rgba(24, 25, 27, ${card.a})`;
      ctx.font = `600 ${size}px ${font.mono}`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(card.word, o[0], o[1] + 1);
    }

    layer("wall", mode, () => {
      {   // the monitor, reading the paper
        const e = P(-0.6, 0, CARD_Z), e2 = P(-0.3, 0, CARD_Z), w = Math.hypot(e2[0] - e[0], e2[1] - e[1]) * 0.55;
        ctx.beginPath(); ctx.moveTo(e[0] - w, e[1]); ctx.quadraticCurveTo(e[0], e[1] - w * 0.75, e[0] + w, e[1]);
        ctx.quadraticCurveTo(e[0], e[1] + w * 0.75, e[0] - w, e[1]); ctx.closePath();
        ctx.fillStyle = "rgba(255, 253, 247, 0.95)"; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = "#855A00"; ctx.stroke();
        ctx.beginPath(); ctx.arc(e[0], e[1], w * 0.32, 0, 7); ctx.fillStyle = "#855A00"; ctx.fill();
      }
      // the wall: residual lines and faint attention strands (the squares come next)
      for (let c = 0; c < N; c++) {
        const a = P(colX(c), rowY(0), 0), b = P(colX(c), rowY(LAYERS - 1), 0);
        ctx.strokeStyle = "rgba(60, 90, 140, 0.5)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        for (let r = 0; r < LAYERS - 1 && c > 0; r++) for (let q = 0; q < c; q++) {
          const s0 = P(colX(q), rowY(r), 0), s1 = P(colX(c), rowY(r + 1), 0);
          ctx.strokeStyle = `rgba(70, 110, 170, ${Math.max(0.035, 0.2 - (c - q) * 0.035)})`;
          ctx.beginPath(); ctx.moveTo(s0[0], s0[1]); ctx.lineTo(s1[0], s1[1]); ctx.stroke();
        }
      }
      if (mode === "fullbw") for (let c = 0; c < N - 2; c++) worldLine(wire(c), "rgba(91, 156, 245, 0.34)", 1.3);   // faint until used
    });

    // the squares and the finished trails change only when a leg ends
    layer("lit", `${mode}|${done}|${[...lit].join(";")}`, () => {
      for (let c = 0; c < N; c++) for (let r = 0; r < LAYERS; r++) {
        const h = TILE / 2, cx = colX(c), cy = rowY(r);
        const p00 = P(cx - h, cy + h, 0), p10 = P(cx + h, cy + h, 0), p01 = P(cx - h, cy - h, 0), p11 = P(cx + h, cy - h, 0);
        const key = `${c}_${r}`, on = lit.has(key), n = lit.get(key);
        const far = Math.min(1, 1.08 - 0.72 * (c / (N - 1)) ** 1.2);
        ctx.globalAlpha = (on ? 1 : 0.4) * far;
        if (on && n) { ctx.shadowColor = "rgba(91,156,245,0.95)"; ctx.shadowBlur = 24; poly([p00, p10, p11, p01], "#0a1424"); ctx.shadowBlur = 0; }
        const s = texture(c, r).width;
        affine(p00, p10, p01, 1 / s);
        ctx.drawImage(texture(c, r), 0, 0);
        reset();
        poly([p00, p10, p11, p01], null, on && n ? "rgba(190, 216, 255, 0.95)" : on ? "rgba(91,156,245,0.8)" : "rgba(70, 100, 150, 0.5)", on && n ? 1.4 : 0.8);
        ctx.globalAlpha = 1;
        if (on && n) {   // the running count, on a badge at the square's corner
          const rr = Math.max(7.5, Math.hypot(p10[0] - p00[0], p10[1] - p00[1]) * 0.24);
          ctx.beginPath(); ctx.arc(p10[0], p10[1], rr, 0, 7); ctx.fillStyle = K.residual; ctx.fill();
          ctx.lineWidth = 2; ctx.strokeStyle = "#05080d"; ctx.stroke();
          ctx.fillStyle = "#05080d"; ctx.font = `700 ${Math.round(rr * (n > 9 ? 0.95 : 1.12))}px ${font.mono}`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(n, p10[0], p10[1] + 0.5);
        }
      }
      for (let i = 0; i < Math.min(done, legs.length); i++) trail(legs[i], legs[i].pts);
    });

    // the leg in progress, then the pulse
    const l = legs[done];
    if (l) {
      const pts = partial(l.pts, ease(frac));
      if (pts.length >= 2) {
        trail(l, pts);
        if (frac < 1) {
          const p = P(...pts.at(-1));
          ctx.beginPath(); ctx.arc(p[0], p[1], 4.6, 0, 7);
          ctx.fillStyle = l.kind === "write" ? K.overseer : "#ffffff";
          ctx.shadowColor = l.kind === "write" ? K.overseer : "#9cc8ff"; ctx.shadowBlur = 18; ctx.fill(); ctx.shadowBlur = 0;
        }
      }
    }

    // a soft scrim behind the title, so the scene never fights the text
    if (!narrow) {
      const sc = ctx.createLinearGradient(0, 0, W * 0.52, 0);
      sc.addColorStop(0, "rgba(5,7,11,0.8)"); sc.addColorStop(0.7, "rgba(5,7,11,0.3)"); sc.addColorStop(1, "rgba(5,7,11,0)");
      ctx.fillStyle = sc; ctx.fillRect(0, 0, W * 0.52, H);
    }

    // readout, top right of the scene
    const best = Math.max(0, ...[...lit.values()].filter(Boolean));
    const rx = W - (narrow ? 18 : 34), ry = narrow ? 28 : 44;
    ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#8A93A3"; ctx.font = `500 ${narrow ? 9.5 : 11}px ${font.mono}`;
    ctx.fillText(mode === "fullbw" ? "FULL BANDWIDTH" : "STANDARD", rx, ry);
    ctx.fillText("LONGEST DARK PATH", rx, ry + (narrow ? 13 : 16));
    ctx.fillStyle = K.residual; ctx.font = `600 ${narrow ? 30 : 42}px ${font.mono}`;
    ctx.fillText(String(best), rx, ry + (narrow ? 46 : 62));
  }

  // ---------------- playback ----------------
  const acts = () => [{ mode: "standard", legs: route("standard") }, { mode: "fullbw", legs: route("fullbw") }];
  const CAPTION = {
    standard: "A standard transformer. The work climbs the layers, then has to surface as a word, where a monitor can see it. The count restarts.",
    fullbw: "Full bandwidth. A hidden wire carries the work on, behind the glass. Tokens are still written, but the count never restarts.",
  };
  let current = null;
  const render = () => current && W > 0 && draw(current);
  layout();
  new ResizeObserver(() => { layout(); render(); }).observe(el);

  if (reduced) {
    const a = acts()[0];
    current = { mode: a.mode, legs: a.legs, u: a.legs.length };
    if (caption) caption.textContent = CAPTION.standard;
    render();
    return;
  }
  // Playback runs only while the hero is on screen and the tab is visible; it pauses between legs otherwise.
  let onScreen = false, running = false;
  const waiters = [];
  const playing = () => onScreen && !document.hidden;
  const whenPlaying = () => (playing() ? Promise.resolve() : new Promise((r) => waiters.push(r)));
  const update = () => { if (playing()) waiters.splice(0).forEach((r) => r()); if (playing() && !running) loop(); };
  const pause = async (ms) => { await wait(ms); await whenPlaying(); };
  async function playAct(a) {
    if (caption) caption.textContent = CAPTION[a.mode];
    current = { mode: a.mode, legs: a.legs, u: 0 };
    render();
    await pause(800);
    for (let i = 0; i < a.legs.length; i++) {
      await whenPlaying();
      const l = a.legs[i], t0 = performance.now();
      await new Promise((res) => {
        const tick = (now) => {
          const f = Math.min(1, (now - t0) / l.dur);
          current.u = i + f;
          render();
          if (f < 1) requestAnimationFrame(tick); else res();
        };
        requestAnimationFrame(tick);
      });
      if (l.kind === "write") await pause(380);
    }
    current.u = a.legs.length; render();
    await pause(2800);
  }
  async function loop() {
    running = true;
    for (;;) for (const a of acts()) await playAct(a);
  }
  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; update(); }).observe(el);
  document.addEventListener("visibilitychange", update);
  current = { ...acts()[0], u: 0 };
  render();
}
