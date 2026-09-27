# Vendored libraries

Self-hosted so a piece loads from one origin, in one request per library, and at a pinned version. Loading d3 from
jsDelivr as `d3@7/+esm` meant an unpinned version and a 44-module import graph. Each request waited on the one before,
so a slow CDN multiplied its delay, and a CDN outage left every figure blank. The probes piece's performance review found
this (`projects/probes/perf/REPORT.md`, D2–D3).

## d3-7.9.0.min.js

d3 7.9.0 as one minified ES module, with the same 577 exports as the npm package and no imports. 283 KB, 95 KB gzipped.
SHA-256 `a4692a9f06a4ef04ef91eb08f3cf3d921240a27289e26326de1d1be73e936eaa`.

Use it through the page's import map (the path is relative to the page):

```html
<script type="importmap">{ "imports": { "d3": "../../../kit/web/vendor/d3-7.9.0.min.js" } }</script>
<link rel="modulepreload" href="../../../kit/web/vendor/d3-7.9.0.min.js">
```

To rebuild it (run in a scratch directory, not in the repo):

```bash
npm init -y && npm install d3@7.9.0 esbuild@0.25
echo 'export * from "d3";' > entry.mjs
npx esbuild entry.mjs --bundle --format=esm --minify --target=es2020 --legal-comments=none \
  --banner:js='// d3 7.9.0 (https://d3js.org), ISC license, Copyright 2010-2023 Mike Bostock. One ES module bundled from the npm packages with esbuild 0.25.12: see README.md.' \
  --outfile=d3-7.9.0.min.js
```

npm resolves d3's dependency ranges when it installs, so a later rebuild can pick newer patch versions. The 2026-09-28
build bundled these packages:

- ISC license, Copyright Mike Bostock (d3 and its modules):
  - d3 7.9.0;
  - d3-array 3.2.4, d3-axis 3.0.0, d3-brush 3.0.0, d3-chord 3.0.1, d3-color 3.1.0, d3-contour 4.0.2, d3-delaunay 6.0.4;
  - d3-dispatch 3.0.1, d3-drag 3.0.0, d3-dsv 3.0.1, d3-fetch 3.0.1, d3-force 3.0.0, d3-format 3.1.2, d3-geo 3.1.1;
  - d3-hierarchy 3.1.2, d3-interpolate 3.0.1, d3-path 3.1.0, d3-polygon 3.0.1, d3-quadtree 3.0.1, d3-random 3.0.1;
  - d3-scale 4.0.2, d3-scale-chromatic 3.1.0, d3-selection 3.0.0, d3-shape 3.2.0, d3-time 3.1.0, d3-time-format 4.1.0;
  - d3-timer 3.0.1, d3-transition 3.0.1, d3-zoom 3.0.0;
  - internmap 2.0.3.
- d3-ease 3.0.1: BSD-3-Clause, Copyright Mike Bostock, and Copyright 2001 Robert Penner (the easing equations).
- delaunator 5.1.0: ISC license, Copyright Mapbox.
- robust-predicates 3.0.3: Unlicense (public domain).

The full license texts are in `LICENSES.txt`.
