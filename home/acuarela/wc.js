// Brings the watercolor frame of the home page (index.html) to life (layers and wc.json come from paint.py).
//
// The river is painted along its own course: an SVG mask strokes its center line up to a length that flows toward a
// target, with a soft tip. The target is how far down the page you are, a little ahead of the viewport, so on load it
// runs across the top and then follows you down the margin; it reaches the valley's side when you reach the bottom. It
// accelerates and slows down smoothly, and never goes back.
//
// The color of each crown in the margins blooms when the crown comes into view: it opens from the center, like pigment
// dropped on wet paper. The ink (branches, nodes) is there from the start, and so is everything across the top.
//
// With reduced motion, the river and the blooms are simply there.

const wc = document.querySelector(".wc");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const NS = "http://www.w3.org/2000/svg";
const url = (name, ext = "webp") => new URL(`./${name}.${ext}`, import.meta.url).href;

if (wc) {
  const data = await fetch(url("wc", "json")).then((r) => r.json());
  blooms(data);
  if (!reduced) river(data);
}

function blooms({ W, YA, YB, blooms }) {
  const mid = wc.querySelector(".wc-mid");
  const els = blooms.map((b) => {
    const el = document.createElement("div");
    el.className = reduced ? "wc-bloom" : "wc-bloom wait";
    Object.assign(el.style, {                       // in % of the middle layer, which stretches with the content
      left: `${(b.x / W) * 100}%`, width: `${(b.w / W) * 100}%`,
      top: `${((b.y - YA) / (YB - YA)) * 100}%`, height: `${(b.h / (YB - YA)) * 100}%`,
      backgroundImage: `image-set(url("${url(b.name)}") 1x, url("${url(`${b.name}@2x`)}") 2x)`,
    });
    mid.append(el);
    return el;
  });
  if (reduced) return;
  // a crown blooms once its middle is in view; several at once go one after another
  let queue = [], timer = 0;
  const next = () => {
    const el = queue.shift();
    if (el) {
      el.classList.replace("wait", "open");
      el.addEventListener("transitionend", function done(e) {
        if (e.propertyName !== "--wc-r") return;
        el.classList.remove("open");                // at rest the mask changes nothing: drop it
        el.removeEventListener("transitionend", done);
      });
    }
    timer = queue.length ? setTimeout(next, 450) : 0;
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      queue.push(e.target);
    }
    queue.sort((a, b) => a.offsetTop - b.offsetTop);
    if (!timer) timer = setTimeout(next, 250);
  }, { rootMargin: "-30% 0px -22% 0px" });
  els.forEach((el) => io.observe(el));
}

function river({ W, YA, YB, river: pts, crops }) {
  const top = wc.querySelector(".wc-river-top"), mid = wc.querySelector(".wc-river-mid");
  const d = "M" + pts.map(([x, y]) => `${x} ${y}`).join("L");
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = cum[cum.length - 1];
  const TIP = [12, 24, 36, 48];                     // the soft tip: four fainter strokes past the front

  // one mask per layer (in design coordinates), its region fitted to the stretch of river that can touch the layer, so
  // a frame repaints only the layer the front is in, and only around the river (an image's repaint is bounded by its
  // mask region). Outside a layer's stretch the strokes can't reach its image, so the pixels are the same as one mask.
  const hi = devicePixelRatio > 1.25 ? "@2x" : "";
  const PAD = 30;                                   // > half the stroke width (23)
  const make = (host, name, y, h) => {
    const [x0, y0, x1, y1] = crops?.[name] ?? [0, 0, W, h];   // the layer's image is cropped to its paint (paint.py)
    const idx = pts.map((p, i) => [p, i]).filter(([[, py]]) => py >= y - PAD && py <= y + h + PAD).map(([, i]) => i);
    const lo = cum[idx[0]], hi_ = cum[idx[idx.length - 1]];
    const xs = idx.map((i) => pts[i][0]), ys = idx.map((i) => pts[i][1]);
    const rx = Math.floor(Math.min(...xs) - PAD), ry = Math.floor(Math.max(y, Math.min(...ys) - PAD));
    const rw = Math.ceil(Math.max(...xs) + PAD) - rx, rh = Math.ceil(Math.min(y + h, Math.max(...ys) + PAD)) - ry;
    const id = `wc-river-${name}`;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 ${y} ${W} ${h}`);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.innerHTML = `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="${rx}" y="${ry}" width="${rw}" height="${rh}">
        <path d="${d}" fill="none" stroke="#fff" stroke-width="46"/>
        ${TIP.map(() => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="46"/>`).join("")}
      </mask></defs>`;
    const img = document.createElementNS(NS, "image");
    const src = url(name + hi);                     // fetched once its layer is shown (phones never show the middle)
    const show = () => { if (!img.hasAttribute("href") && getComputedStyle(host).display !== "none") img.setAttribute("href", src); };
    for (const [k, v] of Object.entries({ x: x0, y: y + y0, width: x1 - x0, height: y1 - y0, preserveAspectRatio: "none", mask: `url(#${id})` }))
      img.setAttribute(k, v);
    svg.append(img);
    host.append(svg);
    const [main, ...tips] = svg.querySelectorAll("mask path");
    // the front only matters to this layer within [lo - 60, hi + 60] (60 > the longest tip plus the stroke's half width)
    show();
    addEventListener("resize", show);
    return { img, main, tips, lo: lo - 60, hi: hi_ + 60, last: null };
  };
  const masks = [make(top, "river-top", 0, YA), make(mid, "river-mid", YA, YB - YA)];
  const paint = (s) => {
    for (const m of masks) {
      const sk = Math.min(m.hi, Math.max(m.lo, s)).toFixed(1);
      if (sk === m.last) continue;                  // nothing of this layer changes: leave its mask (and pixels) alone
      m.last = sk;
      if (s >= m.hi) { m.img.removeAttribute("mask"); continue; }   // past this layer: the river's pigment lies within the
                                                                    // stroke, so the mask no longer changes anything
      m.main.setAttribute("stroke-dasharray", `${sk} ${total + 100}`);
      m.tips.forEach((p, k) => p.setAttribute("stroke-dasharray", `0 ${sk} ${TIP[k]} ${total + 100}`));
    }
  };
  let s = cum[pts.findIndex(([x]) => x > -30)];     // it starts where it comes into the page
  paint(s);
  wc.classList.add("live");

  // the target: the river's furthest point above a front a little below the middle of the viewport
  const target = () => {
    const vh = innerHeight, max = document.documentElement.scrollHeight - vh;
    const front = scrollY + vh * (0.62 + 0.38 * (max > 0 ? Math.min(1, scrollY / max) : 1));
    const k = top.offsetWidth / W;                  // the top layer is scaled down on narrow screens
    const midH = mid.offsetHeight;
    const y = front < top.offsetHeight || !midH ? front / k : YA + ((front - top.offsetHeight) * (YB - YA)) / midH;
    let i = pts.length - 1;
    while (i > 0 && pts[i][1] > y) i--;
    return cum[i];
  };

  const VMAX = 0.7, ACC = 0.002;                    // px/ms and px/ms²: it flows, it doesn't jump
  let v = 0, last = 0, raf = 0;
  const tick = (now) => {
    const dt = last ? Math.min(48, now - last) : 16;
    last = now;
    const goal = target();
    if (goal > s) {
      v = Math.min(VMAX, 0.04 + (goal - s) * 0.002, v + ACC * dt);
      s = Math.min(goal, s + v * dt);
      paint(s);
    }
    if (goal > s + 0.5) raf = requestAnimationFrame(tick);
    else { raf = 0; last = 0; v = 0; }
  };
  const flow = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener("scroll", flow, { passive: true });
  addEventListener("resize", flow);
  setTimeout(flow, 300);
}
