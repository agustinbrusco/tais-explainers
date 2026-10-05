"""Paints the watercolor frame of the home page (index.html).

A network grows around the text column like a frame: crowns across the top, more down both margins, and trees on the
ground at the bottom. Below, the x coordinates of all of its nodes are projected onto a ruler and painted as sierras
(kernel density estimates at three bandwidths, far to near), so the mountains are the density of the network above. A
river runs along a path of the network, across the top and down the right margin, and the page paints it as you read.

Uses the watercolor primitives of Agustin's `acuarela` repo (paper, washes, trembling ink, sierras), which isn't vendored
here: point ACUARELA at a checkout of it. The scene is adapted from acuarela/hybrid.py.

    uv run --with scipy --with contourpy python home/acuarela/paint.py [--seed 7]

Writes, next to this file, transmittance layers (white = bare paper) at 1x and 2x: top, mid, bottom (the network and
sierras), river-top, river-mid (the river alone) and bloom-<i> (the color of each crown in the margins, which the page
lets bloom as it scrolls into view), plus wc.json (where each bloom goes, and the river's center line, along which the
page paints it) and a preview.png of the whole page.
"""
import argparse, heapq, json, math, os, sys

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter
from scipy.spatial import Delaunay
from scipy.interpolate import splprep, splev
import contourpy

sys.path.insert(0, os.environ.get("ACUARELA", os.path.expanduser("~/Documents/acuarela")))
from acuarela.wc import WC, rgb, ellipse, WARM, CYAN, TURQ        # noqa: E402
from acuarela.landscape import sierras                            # noqa: E402
from acuarela.hybrid import VIRID, HOOK, SAPG, MOSS, LIGHTG, BARK, BARKW, TEALINK, ISO  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
COLORS = dict(virid=VIRID, hook=HOOK, sapg=SAPG, moss=MOSS, cyan=CYAN, turq=TURQ)

# Page geometry in CSS px at desktop widths, measured on index.html (the column has a fixed width from 1180 px up, so
# the height is the same at any desktop width). H is document.documentElement.scrollHeight in a window ≥ 1180 px wide.
# When the page's height changes (a new card), set H and re-paint: the bands below follow it, but the margins'
# communities (COMMUNITIES) are placed by hand, so space them over the new height too.
W, H = 1920, 2142
COL = (528, 1392)          # the text column
YA, YB = 420, H - 330      # cuts between the top, middle and bottom layers (--wc-a, H - --wc-b)
TEXT_TOP = 330             # the title starts at 340
Y0 = H - 62                # the ruler, just above the footer line
YMAX = H - 372             # no crown nodes below this

# Communities: (cx, cy, sx, sy, rotation, nodes, color, x of the trunk's root | None)
COMMUNITIES = [
    # across the top (the LinkedIn banner's composition, stretched to 1920)
    (180, 205, 90, 50, 0.10, 14, "moss", None),
    (438, 122, 72, 40, 0.15, 12, "moss", None),
    (732, 160, 105, 48, -0.20, 22, "virid", None),
    (1014, 190, 114, 46, 0.20, 24, "hook", None),
    (1290, 135, 110, 50, -0.12, 24, "cyan", None),
    (1590, 200, 120, 54, 0.25, 24, "sapg", None),
    (1790, 111, 66, 40, -0.30, 12, "turq", None),
    # down the left margin
    (405, 545, 66, 74, 0.25, 14, "virid", None),
    (300, 880, 86, 92, -0.20, 17, "cyan", None),
    (450, 1170, 52, 56, 0.10, 8, "moss", None),
    (370, 1410, 78, 74, 0.30, 15, "sapg", None),
    (400, 1640, 66, 58, 0.00, 12, "hook", 425),
    (110, 690, 60, 55, 0.00, 6, "moss", None),
    (140, 1230, 64, 60, 0.20, 7, "turq", None),
    # down the right margin, where the river runs
    (1500, 610, 58, 92, -0.30, 15, "turq", None),
    (1630, 900, 92, 80, 0.20, 16, "virid", None),
    (1480, 1150, 52, 56, -0.15, 8, "cyan", None),
    (1570, 1385, 82, 86, 0.25, 16, "hook", None),
    (1530, 1645, 66, 58, 0.00, 12, "sapg", 1510),
    (1820, 1150, 60, 60, 0.00, 6, "moss", None),
]
N_BG = 54
BLOOM_FROM = 7             # the communities from here on (the margins) bloom on scroll; the top ones are there from the start


def in_column(x, y, pad=16):
    """The text column below the title line: no nodes, edges or paint there."""
    return COL[0] - pad < x < COL[1] + pad and y > TEXT_TOP - 40


def allowed(x, y):
    return 24 < x < W - 24 and 24 < y < YMAX and not in_column(x, y, pad=24)


def crosses_column(p, q):
    return any(in_column(*(p + (q - p) * t), pad=10) for t in np.linspace(0, 1, 24))


def column_mask(c):
    """1 where paint may stay, dissolving with a ragged edge into the column and at the outer edges."""
    S = c.S
    xs = np.arange(c.w, dtype=np.float32)[None, :] / S
    ys = np.arange(c.h, dtype=np.float32)[:, None] / S
    inx = np.clip((xs - (COL[0] - 14)) / 22, 0, 1) * np.clip(((COL[1] + 14) - xs) / 22, 0, 1)
    iny = np.clip((ys - (TEXT_TOP - 50)) / 46, 0, 1) * np.clip((YB + 26 - ys) / 30, 0, 1)
    inside = inx * iny
    outer = 1 - np.clip(xs / 70, 0, 1) * np.clip((W - xs) / 70, 0, 1) * np.ones_like(ys)
    gone = np.clip(inside + outer, 0, 1)
    gone = np.clip(gone + 0.14 * c.noise((c.h, c.w), 30, 4) * np.sqrt(gone * (1 - gone) + 1e-3) * 2, 0, 1)
    return 1 - gaussian_filter(gone, 2) ** 1.2


def paint(seed):
    c = WC(seed, W=W, H=H, S=2, paper=WARM, texture=1.0)
    rng, S = c.rng, c.S
    CL = [(cx, cy, sx, sy, rot, n, COLORS[col], xr) for cx, cy, sx, sy, rot, n, col, xr in COMMUNITIES]

    # ------------------------------------------------------------ nodes
    pts, com, trunk, parent = [], [], [], []
    for ci, (cx, cy, sx, sy, rot, n, col, xr) in enumerate(CL):
        co, si = math.cos(rot), math.sin(rot)
        if xr is not None:
            top_y = min(YMAX + 22, cy + sy * 1.5)
            for j in range(4):
                t = j / 3
                x = xr + (cx - xr) * t ** 1.3 + rng.normal(0, 5) * math.sin(math.pi * t)
                y = Y0 + 4 - (Y0 + 4 - top_y) * t
                pts.append((x, y)); com.append(ci); trunk.append(True)
                parent.append(-1 if j == 0 else len(pts) - 2)
        got = tries = 0
        while got < n and tries < 5000:
            tries += 1
            z = rng.normal(0, 1, 2) * [sx, sy]
            x, y = cx + co * z[0] - si * z[1], cy + si * z[0] + co * z[1]
            if not allowed(x, y) or (COL[0] - 30 < x < COL[1] + 30 and y > TEXT_TOP - 60):
                continue
            if any((x - a) ** 2 + (y - b) ** 2 < 19 ** 2 for a, b in pts):
                continue
            pts.append((x, y)); com.append(ci); trunk.append(False); parent.append(None); got += 1
    tries = nbg = 0
    while tries < 8000 and nbg < N_BG:
        tries += 1
        x, y = rng.uniform(30, W - 30), rng.uniform(30, YMAX - 20)
        if not allowed(x, y) or (COL[0] - 40 < x < COL[1] + 40 and y > TEXT_TOP - 70):
            continue
        if any((x - a) ** 2 + (y - b) ** 2 < 34 ** 2 for a, b in pts):
            continue
        pts.append((x, y)); com.append(-1); trunk.append(False); parent.append(None); nbg += 1
    Pb = np.array(pts); N = len(Pb); com = np.array(com); trunk = np.array(trunk)

    # ------------------------------------------------------------ a tree per community (Prim–Dijkstra)
    pathlen = np.zeros(N)
    for i in range(N):
        if parent[i] not in (None, -1):
            pathlen[i] = pathlen[parent[i]] + np.linalg.norm(Pb[i] - Pb[parent[i]])
    for ci in range(len(CL)):
        idx = [i for i in range(N) if com[i] == ci]
        in_tree = [i for i in idx if trunk[i]]
        ground = in_tree[0] if in_tree else None
        if not in_tree:                       # no trunk: the root is the community's lowest node
            in_tree = [max(idx, key=lambda i: Pb[i][1])]
        top = in_tree[-1]
        for i in sorted([i for i in idx if not trunk[i] and i not in in_tree],
                        key=lambda i: np.linalg.norm(Pb[i] - Pb[top])):
            best, bc = None, 1e18
            for p in in_tree:
                if p == ground or Pb[p][1] < Pb[i][1] - 4:
                    continue
                cost = np.linalg.norm(Pb[i] - Pb[p]) + 0.2 * pathlen[p]
                if cost < bc:
                    bc, best = cost, p
            if best is None:
                best = min((p for p in in_tree if p != ground), key=lambda p: np.linalg.norm(Pb[i] - Pb[p]))
            parent[i] = best
            pathlen[i] = pathlen[best] + np.linalg.norm(Pb[i] - Pb[best])
            in_tree.append(i)
    children = {i: [] for i in range(N)}
    for i in range(N):
        if parent[i] not in (None, -1):
            children[parent[i]].append(i)
    cnt = np.ones(N)
    for i in sorted(range(N), key=lambda i: -pathlen[i]):
        if parent[i] not in (None, -1):
            cnt[parent[i]] += cnt[i]
    width = 0.7 + 1.05 * cnt ** 0.6

    def branch_curve(p, q, bend, wig):
        m = (p + q) / 2
        dv = q - p
        Ln = np.linalg.norm(dv) + 1e-9
        nv = np.array([-dv[1], dv[0]]) / Ln
        t = np.linspace(0, 1, 28)[:, None]
        pts_ = (1 - t) ** 2 * p + 2 * (1 - t) * t * (m + nv * bend * Ln) + t ** 2 * q
        ph = rng.uniform(0, 6.3)
        pts_ += nv * (wig * Ln * np.sin(np.pi * t[:, 0] * rng.uniform(1.5, 3) + ph) * np.sin(np.pi * t[:, 0]))[:, None]
        return pts_

    tree_edges, curves = [], {}
    for i in range(N):
        p = parent[i]
        if p in (None, -1):
            continue
        tree_edges.append((p, i))
        curves[(p, i)] = branch_curve(Pb[p], Pb[i], rng.normal(0, 0.05 if trunk[i] else 0.15),
                                      0.012 if trunk[i] else rng.uniform(0.02, 0.055))

    # network edges (not in a tree), and minimal bridges (Kruskal) so the graph is connected; none crosses the column
    crown = np.where(~trunk)[0]
    tri = Delaunay(Pb[crown])
    cand = set()
    for simp in tri.simplices:
        for a_, b_ in ((0, 1), (1, 2), (2, 0)):
            a, b = sorted((crown[simp[a_]], crown[simp[b_]]))
            if not crosses_column(Pb[a], Pb[b]):
                cand.add((a, b))
    is_tree = set(tuple(sorted(e)) for e in tree_edges)
    extra = set()
    for a, b in sorted(cand):
        if (a, b) in is_tree:
            continue
        Ln = np.linalg.norm(Pb[a] - Pb[b])
        same = com[a] == com[b] and com[a] >= 0
        if (same and Ln < 85 and rng.uniform() < 0.38) or (not same and Ln < 140 and rng.uniform() < 0.33):
            extra.add((a, b))
    par = list(range(N))

    def find(u):
        while par[u] != u:
            par[u] = par[par[u]]; u = par[u]
        return u
    for a, b in list(is_tree) + list(extra):
        par[find(a)] = find(b)
    for Ln, a, b in sorted((np.linalg.norm(Pb[a] - Pb[b]), a, b) for a, b in cand):
        if find(a) != find(b):
            par[find(a)] = find(b); extra.add((a, b))
    for a, b in sorted(extra):
        curves[(a, b)] = branch_curve(Pb[a], Pb[b], rng.choice([-1, 1]) * rng.uniform(0.08, 0.26),
                                      rng.uniform(0, 0.025))
    deg = np.zeros(N, int)
    for a, b in list(is_tree) + list(extra):
        deg[a] += 1; deg[b] += 1

    # ------------------------------------------------------------ isolines of the mixture, outside the column
    gx = np.linspace(0, c.w, W // 4); gy = np.linspace(0, c.h, H // 4)
    X, Y = np.meshgrid(gx, gy); Z = np.zeros_like(X)
    for cx, cy, sx, sy, rot, n, col, xr in CL:
        co, si = math.cos(rot), math.sin(rot)
        dx, dy = X - cx * S, Y - cy * S
        u, v = co * dx + si * dy, -si * dx + co * dy
        Z += n * np.exp(-0.5 * ((u / (sx * S * 1.3)) ** 2 + (v / (sy * S * 1.4)) ** 2))
    gen = contourpy.contour_generator(X, Y, Z)
    iso = []
    for lev in [0.8, 2.4, 5.0, 9.0, 14.0]:
        for line in gen.lines(lev):
            keep = np.array([not in_column(x / S, y / S, pad=30) for x, y in line])
            # split each line where it enters the column
            run = []
            for q, k in zip(line, keep):
                if k:
                    run.append(q)
                elif len(run) > 4:
                    iso.append(np.array(run)); run = []
                else:
                    run = []
            if len(run) > 4:
                iso.append(np.array(run))
    c.ink_paths(iso, ISO, 1.9, 0.17, wobble=0.8, passes=1, blur=0.6, gran=0.7)

    # ------------------------------------------------------------ sierras: the density of every node's x, on a ruler
    xs = np.linspace(-20, W + 20, 900)
    groups = [Pb[(com == ci) & ~trunk, 0] for ci in range(len(CL))]
    sierras(c, xs, Pb[com == -1, 0], groups, Y0, [CL[ci][6] for ci in range(len(CL))], hmax=200, am=0.82, sh=0.6)
    c.ink_paths([[[0, Y0 * S], [c.w, Y0 * S]]], BARK, 1.1 * S, 0.6, wobble=0.4, passes=1)
    minor, major = [], []
    for k, x in enumerate(np.arange(8, W, 16)):
        (major if k % 5 == 0 else minor).append([[x * S, Y0 * S], [x * S, (Y0 + (9 if k % 5 == 0 else 4)) * S]])
    c.ink_paths(minor, BARK, 0.8 * S, 0.45, wobble=0.05, passes=1)
    c.ink_paths(major, BARK, 1.0 * S, 0.6, wobble=0.05, passes=1)
    for ci in range(-1, len(CL)):                                # the rug: one tick per node
        m = (com == ci) & ~trunk
        col = CL[ci][6] if ci >= 0 else MOSS
        c.ink_paths([[[x * S, (Y0 + 1) * S], [x * S, (Y0 + 6) * S]] for x in Pb[m, 0]], col, 1.0 * S, 0.6,
                    wobble=0.05, passes=1)

    # ------------------------------------------------------------ crowns (communities) and 2-simplices
    # The margins' washes are painted apart, each community's into its own crops of transmittance, so the page can let
    # them bloom one by one. Same calls in the same order either way, so the picture doesn't depend on the split.
    scratch, bloom_crops = c.paper_img.copy(), {}

    def wash_for(ci):
        if ci < BLOOM_FROM:
            return c.wash

        def bloom_wash(poly, color, **kw):
            poly = np.asarray(poly, float)
            pad = int(min(np.ptp(poly, axis=0).max() * 0.6, 200)) + 10          # the region WC.wash paints in
            x0 = int(max(0, poly[:, 0].min() - pad)); x1 = int(min(c.w, poly[:, 0].max() + pad))
            y0 = int(max(0, poly[:, 1].min() - pad)); y1 = int(min(c.h, poly[:, 1].max() + pad))
            main, c.img = c.img, scratch
            c.wash(poly, color, **kw)
            c.img = main
            sl = (slice(y0, y1), slice(x0, x1))
            bloom_crops.setdefault(ci, []).append((y0, x0, scratch[sl] / c.paper_img[sl]))
            scratch[sl] = c.paper_img[sl]
        return bloom_wash

    for ci, (cx, cy, sx, sy, rot, n, col, xr) in enumerate(CL):
        wash = wash_for(ci)
        wash(ellipse(cx * S, cy * S, sx * S * 1.9, sy * S * 2.0, rot, 14), col, layers=30, alpha=0.013,
             spread=0.6, edge=2.4)
        wash(ellipse((cx + rng.normal(0, 15)) * S, (cy - 6) * S, sx * S * 1.3, sy * S * 1.4, rot, 14), LIGHTG,
             layers=20, alpha=0.009, spread=0.7, edge=1.8)
    for simp in tri.simplices:
        g = crown[simp]
        cs = com[g]
        if cs[0] < 0 or not (cs == cs[0]).all() or rng.uniform() > 0.35:
            continue
        tp = Pb[g]
        if max(np.linalg.norm(tp[i] - tp[(i + 1) % 3]) for i in range(3)) > 85:
            continue
        cen = tp.mean(0)
        wash_for(cs[0])((cen + (tp - cen) * 0.9) * S, CL[cs[0]][6], layers=14, alpha=0.042, spread=0.3,
                        base_depth=2, layer_depth=3, edge=3.4)
    del scratch

    # ------------------------------------------------------------ trunks and branches
    def ribbon(cv, w0, w1):
        ws = np.linspace(w0, w1, len(cv))
        tang = np.gradient(cv, axis=0)
        nrm = np.stack([-tang[:, 1], tang[:, 0]], 1)
        nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-9
        return cv + nrm * ws[:, None] / 2, cv - nrm * ws[:, None] / 2, nrm, ws

    trunk_body = Image.new("L", (c.w, c.h), 0); tbd = ImageDraw.Draw(trunk_body)
    trunk_lines = []
    body = Image.new("L", (c.w, c.h), 0); bd = ImageDraw.Draw(body)
    lit = Image.new("L", (c.w, c.h), 0); ld = ImageDraw.Draw(lit)
    LIGHT_DIR = np.array([0.6, -0.8])
    for (p, i) in tree_edges:
        cv = curves[(p, i)]
        w0 = width[i] * (1.3 if trunk[i] and parent[p] == -1 else 1.0)
        w1 = width[i] * (0.35 if not children[i] else 0.82)
        l, r, nrm, ws = ribbon(cv, w0, w1)
        if trunk[i]:
            tbd.polygon([tuple(v * S) for v in np.vstack([l, r[::-1]])], fill=255)
            trunk_lines += [l * S, r * S]
            continue
        bd.polygon([tuple(v * S) for v in np.vstack([l, r[::-1]])], fill=255)
        r0 = w0 / 2 * S
        bd.ellipse([cv[0][0] * S - r0, cv[0][1] * S - r0, cv[0][0] * S + r0, cv[0][1] * S + r0], fill=255)
        if w0 > 2.4:
            side = np.sign((nrm * LIGHT_DIR).sum(1, keepdims=True))
            hl = cv + side * nrm * ws[:, None] * 0.22
            l2, r2, _, _ = ribbon(hl, w0 * 0.3, w1 * 0.3)
            ld.polygon([tuple(v * S) for v in np.vstack([l2, r2[::-1]])], fill=255)
    c.paint_mask(np.asarray(trunk_body, np.float32) / 255, BARKW, alpha=0.1, edge=0.6, gran=0.5, blur=1.2)
    c.ink_paths(trunk_lines, BARK, 0.8 * S, 0.45, wobble=0.6, passes=1, gran=0.7, pin=True)
    c.ink_paths([curves[e] * S for e in sorted(extra)], BARK, 1.0 * S, 0.42, wobble=0.5, passes=2, pin=True, gran=0.5)
    body = np.asarray(body, np.float32) / 255
    lit = np.asarray(lit, np.float32) / 255
    c.paint_mask(body, BARK, alpha=0.74, edge=1.0, gran=0.42, blur=0.9)
    c.lift_mask(lit * body, 0.26, blur=1.2)
    c.paint_mask(lit * body, BARKW, alpha=0.2, edge=0.0, gran=0.6, blur=1.2)

    for i in crown:                                              # leaves at the tips
        if children[i] or com[i] < 0:
            continue
        for _ in range(rng.integers(2, 6)):
            x, y = Pb[i] + rng.normal(0, 10, 2)
            r = rng.uniform(1.2, 3.0) * S
            col = [SAPG, VIRID, HOOK, CYAN, LIGHTG][rng.integers(0, 5)]
            c.wash(ellipse(x * S, y * S, r, r * 0.6, rng.uniform(0, 3), 6), col, layers=3, alpha=0.2, spread=0.3,
                   base_depth=1, layer_depth=1, edge=1.5, blur=0.5)

    # ------------------------------------------------------------ nodes (the river's too: the river layer rings them)
    cent, rad = [], []
    for i in crown:
        col = CL[com[i]][6] if com[i] >= 0 else MOSS
        r = (2.5 + 1.1 * math.sqrt(deg[i])) * S
        c.wash(ellipse(*(Pb[i] * S), r, r, 0, 8), col, layers=8, alpha=0.15, spread=0.2, base_depth=2,
               layer_depth=2, edge=2.0, blur=0.6)
        cent.append(Pb[i] * S); rad.append(r * 1.02)
    c.rings(cent, rad, BARK, 1.05 * S, alpha=0.7)

    def sp():
        cx, cy, sx, sy, rot, n, col, xr = CL[rng.integers(0, len(CL))]
        return cx + rng.normal(0, sx * 1.6), cy + rng.normal(0, sy * 1.6), col
    c.splatter(110, sp, None, avoid=lambda x, y: in_column(x, y, pad=30) or y > YMAX)

    mask = column_mask(c)[..., None]
    c.img = c.paper_img + (c.img - c.paper_img) * mask
    graph = c.img.copy()
    blooms = []                                                  # (community, y0, x0, transmittance), canvas px
    for ci, crops in sorted(bloom_crops.items()):
        y0 = min(q[0] for q in crops) // S * S; x0 = min(q[1] for q in crops) // S * S
        y1 = -(-max(q[0] + q[2].shape[0] for q in crops) // S) * S
        x1 = -(-max(q[1] + q[2].shape[1] for q in crops) // S) * S
        T = np.ones((y1 - y0, x1 - x0, 3), np.float32)
        for qy, qx, F in crops:
            T[qy - y0:qy - y0 + F.shape[0], qx - x0:qx - x0 + F.shape[1]] *= F
        T = 1 - (1 - np.clip(T, 0, 1)) * mask[y0:y1, x0:x1]
        blooms.append((ci, y0, x0, T))

    # ------------------------------------------------------------ the river: in from the left, across the top, down the
    # right margin and out of the page to the right
    adj = {i: [] for i in range(N)}
    for a, b in list(is_tree) + list(extra):
        if not (trunk[a] or trunk[b]):
            adj[a].append(b); adj[b].append(a)

    C, R0 = np.array([1360.0, 320.0]), 150.0                     # the corner turns around C, with radius R0

    def flow(v):
        """The river's direction at node v, and how far v is from its ideal line: right across the top (y = 170), down
        the right margin (x = 1510), and in between a quarter circle, so the route can't double back at the corner."""
        P = Pb[v]
        if P[0] < C[0]:
            return np.array([1.0, 0.0]), abs(P[1] - (C[1] - R0))
        if P[1] > C[1]:
            return np.array([0.0, 1.0]), abs(P[0] - (C[0] + R0))
        r = P - C
        return np.array([-r[1], r[0]]) / (np.linalg.norm(r) + 1e-9), abs(np.linalg.norm(r) - R0)

    def cost(u, v):
        f, off = flow(v)
        d = Pb[v] - Pb[u]
        along = d @ f
        return np.linalg.norm(d) + 10 * max(0.0, -along) + 1.0 * abs(d[0] * f[1] - d[1] * f[0]) + 0.3 * off

    def nearest(x, y):
        return min(crown, key=lambda i: np.hypot(Pb[i][0] - x, Pb[i][1] - y))
    s, t = nearest(30, 170), nearest(1590, 1440)
    dist, prev, pq = {s: 0}, {}, [(0, s)]
    while pq:
        d, u = heapq.heappop(pq)
        if u == t:
            break
        if d > dist[u]:
            continue
        for v in adj[u]:
            nd = d + cost(u, v)
            if nd < dist.get(v, 1e18):
                dist[v] = nd; prev[v] = u; heapq.heappush(pq, (nd, v))
    path_nodes = [t]
    while path_nodes[-1] != s:
        path_nodes.append(prev[path_nodes[-1]])
    path_nodes = path_nodes[::-1]

    def progress(v):                                             # arc length along the ideal line
        P = Pb[v]
        if P[0] < C[0]:
            return P[0]
        if P[1] > C[1]:
            return C[0] + R0 * np.pi / 2 + (P[1] - C[1])
        return C[0] + R0 * (math.atan2(P[1] - C[1], P[0] - C[0]) + np.pi / 2)
    kept = [path_nodes[0]]                                       # only nodes that move it forward, near its line
    for v in path_nodes[1:]:
        if progress(v) > progress(kept[-1]) and flow(v)[1] < 95:
            kept.append(v)
    path_nodes = kept
    PP = Pb[path_nodes]
    a, z = PP[0], PP[-1]                                         # it comes from beyond the page, and leaves it
    PP = np.vstack([[a[0] - 260, a[1] + 30], [a[0] - 130, a[1] + 12], PP,
                    [z[0] + 150, z[1] + 55], [W + 90, z[1] + 95], [W + 260, z[1] + 110]])
    tck, _ = splprep([PP[:, 0], PP[:, 1]], s=len(PP) * 16 ** 2, k=3)
    river = np.stack(splev(np.linspace(0, 1, 6000), tck), 1)

    def by_arc(curve, step=2.0):
        sl = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(curve, axis=0), axis=1))])
        q = np.arange(0, sl[-1], step)
        return np.stack([np.interp(q, sl, curve[:, 0]), np.interp(q, sl, curve[:, 1])], 1)

    def min_radius(curve):
        d1 = np.gradient(curve, axis=0); d2 = np.gradient(d1, axis=0)
        k = np.abs(d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]) / (np.linalg.norm(d1, axis=1) ** 3 + 1e-9)
        return 1 / k[20:-20].max()

    def tightest(curve):
        d1 = np.gradient(curve, axis=0); d2 = np.gradient(d1, axis=0)
        k = np.abs(d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]) / (np.linalg.norm(d1, axis=1) ** 3 + 1e-9)
        return curve[20 + int(np.argmax(k[20:-20]))].round().tolist()
    river = by_arc(river)
    sigma = 4                                                    # samples are 2 px apart
    while min_radius(gaussian_filter(river, (sigma, 0), mode="nearest")) < 70 and sigma < 40:
        sigma += 2                                               # no tight bends: smooth until the radius is ≥ 70 px
    river = by_arc(gaussian_filter(river, (sigma, 0), mode="nearest"))
    dmin = np.array([np.min(np.linalg.norm(river - p, axis=1)) for p in Pb[path_nodes]])
    on_river = [n_ for n_, dd in zip(path_nodes, dmin) if dd < 8]
    u = np.linspace(0, 1, len(river))
    wr = 4 + 12 * u ** 0.8                                         # the bed widens downstream
    tang = np.gradient(river, axis=0)
    nrm = np.stack([-tang[:, 1], tang[:, 0]], 1); nrm /= np.linalg.norm(nrm, axis=1, keepdims=True) + 1e-9
    CH = 100
    for k0 in range(0, len(river) - 1, CH - 10):
        sl = slice(k0, min(len(river), k0 + CH))
        rv, nv, ww = river[sl], nrm[sl], wr[sl]
        c.wash(np.vstack([rv + nv * ww[:, None] / 2, (rv - nv * ww[:, None] / 2)[::-1]]) * S, CYAN, layers=14,
               alpha=0.05, spread=0.06, base_depth=1, layer_depth=2, edge=3.0)
        c.wash(np.vstack([rv + nv * ww[:, None] / 5, (rv - nv * ww[:, None] / 5)[::-1]]) * S, TURQ, layers=10,
               alpha=0.035, spread=0.05, base_depth=1, layer_depth=2, edge=2.0)
    c.ink_paths([river * S], TEALINK, 1.3 * S, 0.6, wobble=0.5, passes=2, gran=0.5, pin=True)

    ring = Image.new("L", (c.w, c.h), 0); rd_ = ImageDraw.Draw(ring)
    dpolys = []
    for i in on_river:                                           # the nodes it touches, ringed in a diamond
        rd = rng.uniform(6.0, 7.2) * S
        th = rng.normal(0, 0.12)
        Rm = np.array([[math.cos(th), -math.sin(th)], [math.sin(th), math.cos(th)]])
        poly = Pb[i] * S + np.array([[rd, 0], [0, rd], [-rd, 0], [0, -rd]]) @ Rm.T
        rd_.polygon([tuple(q) for q in poly], fill=255)
        rd_.polygon([tuple(q) for q in Pb[i] * S + (poly - Pb[i] * S) * 0.62], fill=0)
        dpolys.append(np.vstack([poly, poly[:1]]))
    c.paint_mask(np.asarray(ring, np.float32) / 255, TEALINK, alpha=0.45, edge=1.2, gran=0.5, blur=0.9)
    c.ink_paths(dpolys, TEALINK, 0.9 * S, 0.58, wobble=0.7, passes=2, gran=0.6, blur=0.9)

    c.meta = dict(nodes=N, river_nodes=len(on_river), river_end=river[-1].round().tolist(),
                  river_sigma_px=2 * sigma, min_radius=round(float(min_radius(river)), 1), at=tightest(river))
    return c, graph, blooms, river


def save_layers(c, graph, blooms, river):
    S = c.S
    T_net = np.clip(graph / np.maximum(c.paper_img, 1e-4), 0, 1)
    T_river = np.clip(c.img / np.maximum(graph, 1e-4), 0, 1)
    xs = np.arange(c.w, dtype=np.float32) / S                    # past 1920 px of screen, the river fades at the edges
    edge = np.clip(np.minimum(xs, W - xs) / 40, 0, 1)[None, :, None]
    T_river = 1 - (1 - T_river) * edge

    def save(name, T, y0, y1, box=None, check=True):
        """box = (x0, y0, x1, y1) in design px of the band, multiples of 16: only that part is written, and everything
        outside it must be bare paper (multiplying by white changes nothing, so the page looks the same). check=False
        when another crop of the same band holds the rest (then the caller checks what's between them)."""
        band = T[y0 * S:y1 * S]
        if box:
            bx0, by0, bx1, by1 = (v * S for v in box)
            if check:
                out = np.ones(band.shape[:2], bool)
                out[by0:by1, bx0:bx1] = False
                assert band[out].min() >= 254.5 / 255, f"{name}: paint outside its crop {box}"
            band = band[by0:by1, bx0:bx1]
        im = Image.fromarray((band * 255 + 0.5).astype(np.uint8))
        im.save(f"{HERE}/{name}@2x.webp", quality=80, method=6)
        im.resize((im.width // S, im.height // S), Image.LANCZOS).save(f"{HERE}/{name}.webp", quality=84, method=6)

    def ink_box(T, y0, y1, pad=8):
        """The smallest box, on a 16-px grid, holding all the paint of a band (design px, relative to the band)."""
        ys, xs = np.nonzero(T[y0 * S:y1 * S].min(axis=2) < 254.5 / 255)   # anything that would not encode as 255
        lo = lambda v: max(0, (int(v / S) - pad) // 16 * 16)
        hi = lambda v, top: min(top, -(-(int(v / S) + 1 + pad) // 16) * 16)
        return (lo(xs.min()), lo(ys.min()), hi(xs.max(), W), hi(ys.max(), y1 - y0))

    save("top", T_net, 0, YA)
    # the margins only: the column between them is bare paper (its ragged edge reaches 8 px into it, hence the extra 16)
    ml, mr = COL[0] + 16, COL[1] - 16
    assert T_net[YA * S:YB * S, ml * S:mr * S].min() >= 254.5 / 255, "mid: paint in the column"
    save("mid-l", T_net, YA, YB, (0, 0, ml, YB - YA), check=False)
    save("mid-r", T_net, YA, YB, (mr, 0, W, YB - YA), check=False)
    save("bottom", T_net, YB, H)
    crops = {"river-top": ink_box(T_river, 0, YA), "river-mid": ink_box(T_river, YA, YB)}
    save("river-top", T_river, 0, YA, crops["river-top"])
    save("river-mid", T_river, YA, YB, crops["river-mid"])
    print("river crops (update index.html's .wc-river-top / .wc-river-mid background-size and -position):", crops)
    T_all = T_net * T_river
    for f in os.listdir(HERE):                                   # blooms of an earlier render
        if f.startswith("bloom-"):
            os.remove(f"{HERE}/{f}")
    manifest = []
    for ci, y0, x0, T in blooms:
        name = f"bloom-{ci}"
        im = Image.fromarray((T * 255 + 0.5).astype(np.uint8))
        im.save(f"{HERE}/{name}@2x.webp", quality=80, method=6)
        im.resize((im.width // S, im.height // S), Image.LANCZOS).save(f"{HERE}/{name}.webp", quality=84, method=6)
        manifest.append(dict(name=name, x=x0 // S, y=y0 // S, w=T.shape[1] // S, h=T.shape[0] // S))
        T_all[y0:y0 + T.shape[0], x0:x0 + T.shape[1]] *= T
    with open(f"{HERE}/wc.json", "w") as fh:
        json.dump(dict(W=W, YA=YA, YB=YB, blooms=manifest, crops=crops,
                       river=[[round(float(x), 1), round(float(y), 1)] for x, y in river[::3]]), fh)
    page = np.array([0xF1, 0xED, 0xE4], np.float32) / 255
    prev = Image.fromarray((page * T_all * 255).astype(np.uint8))
    prev.resize((W // 2, H // 2), Image.LANCZOS).save(f"{HERE}/preview.png")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args()
    c, graph, blooms, river = paint(a.seed)
    save_layers(c, graph, blooms, river)
    print(c.meta)
