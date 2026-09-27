// Small linear algebra on the per-layer basis coordinates (k numbers per statement), plus the statistics the page
// recomputes from what it draws. Every probe is {coef: unit k-vector, thr, norm?}; a statement's projection onto the
// probe is coords · coef, and its score is norm · (projection − thr) for logistic-regression probes.

export const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
export const norm = (a) => Math.sqrt(dot(a, a));
export const scale = (a, s) => a.map((x) => x * s);
export const add = (a, b) => a.map((x, i) => x + b[i]);
export const sub = (a, b) => a.map((x, i) => x - b[i]);
export const lerp = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
export const unit = (a) => scale(a, 1 / norm(a));
/** The part of v orthogonal to the unit vector u, normalized. */
export const orthTo = (v, u) => unit(sub(v, scale(u, dot(v, u))));
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const deg = (cos) => (Math.acos(clamp(cos, -1, 1)) * 180) / Math.PI;

/** Great-circle interpolation between unit vectors: an in-plane rotation keeps a constant angular speed. */
export function slerp(a, b, t) {
  const c = clamp(dot(a, b), -1, 1);
  const w = Math.acos(c);
  if (w < 1e-6) return a.slice();
  const s = Math.sin(w);
  return add(scale(a, Math.sin((1 - t) * w) / s), scale(b, Math.sin(t * w) / s));
}

/** A view's frame: two orthonormal directions (u across, v up). Interpolated frames stay orthonormal, so every
 *  intermediate picture is an orthogonal projection of the same states. */
export function frameAt(f0, f1, t) {
  if (t <= 0) return f0;
  if (t >= 1) return f1;
  // opposite directions have no shortest great circle: turn through the start frame's second axis
  if (dot(f0.u, f1.u) < -0.9999) {
    const mid = { u: f0.v, v: f0.u.map((x) => -x) };
    return t < 0.5 ? frameAt(f0, mid, t * 2) : frameAt(mid, f1, t * 2 - 1);
  }
  const u = unit(slerp(f0.u, f1.u, t));
  const v = orthTo(slerp(f0.v, f1.v, t), u);
  return { u, v };
}

/** Frame whose u is the direction d and whose v is `up` made orthogonal to d. */
export const frameOf = (d, up) => { const u = unit(d); return { u, v: orthTo(up, u) }; };

/** Scores of a set of coordinate rows under a probe (logits for LR probes, projection − threshold otherwise). */
export function scores(rows, probe) {
  const k = probe.norm ?? 1;
  return rows.map((r) => k * (dot(r, probe.coef) - probe.thr));
}

export function accuracy(s, labels) {
  let right = 0;
  for (let i = 0; i < s.length; i++) right += (s[i] > 0 ? 1 : 0) === labels[i] ? 1 : 0;
  return { right, n: s.length, acc: right / s.length };
}

/** AUROC by the rank-sum formula (ties count half). */
export function auroc(s, labels) {
  const idx = s.map((v, i) => [v, labels[i]]).sort((a, b) => a[0] - b[0]);
  let rank = 1, sumPos = 0, nPos = 0;
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j < idx.length && idx[j][0] === idx[i][0]) j++;
    const r = (rank + rank + (j - i) - 1) / 2;
    for (let q = i; q < j; q++) if (idx[q][1] === 1) { sumPos += r; nPos++; }
    rank += j - i;
    i = j;
  }
  const nNeg = idx.length - nPos;
  return (sumPos - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
}

/** Beeswarm ("dodge"): heights above the floor, in px, for dots of radius r at positions xs, so that none overlap.
 *  Dots are placed in the order given (score order), each at the lowest free height. */
export function dodge(xs, r, maxH = Infinity) {
  const d2 = (2 * r) ** 2, out = new Array(xs.length);
  const order = xs.map((x, i) => i).sort((a, b) => xs[a] - xs[b]);
  const placed = [];           // [x, y], sorted by x as they come
  let lo = 0;
  for (const i of order) {
    const x = xs[i];
    while (lo < placed.length && placed[lo][0] < x - 2 * r) lo++;
    const near = placed.slice(lo);
    // candidate heights: the floor, and just above each near dot
    const cand = [0];
    for (const [px, py] of near) cand.push(py + Math.sqrt(Math.max(0, d2 - (x - px) ** 2)) + 1e-6);
    cand.sort((a, b) => a - b);
    let y = 0;
    for (const c of cand) {
      if (near.every(([px, py]) => (x - px) ** 2 + (c - py) ** 2 >= d2 - 1e-6)) { y = c; break; }
    }
    y = Math.min(y, maxH);
    placed.push([x, y]);
    out[i] = y;
  }
  return out;
}

export const fmt = {
  pct1: (v) => `${(100 * v).toFixed(1)}%`,
  pct0: (v) => `${Math.round(100 * v)}%`,
  deg: (v) => `${Math.round(v)}°`,
  f2: (v) => v.toFixed(2),
  f3: (v) => v.toFixed(3),
  int: (v) => `${Math.round(v)}`,
};
