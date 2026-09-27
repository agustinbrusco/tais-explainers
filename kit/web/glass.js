// Paper and glass: shared SVG pieces for figures that show a model's interior as a dark window on a paper page.
//
//   import { installGlassDefs, clipRegions, dualStroke } from "../../../kit/web/glass.js";
//   installGlassDefs(d3, { overseerInk: css("overseer-ink") });   // once per page
//   const clip = clipRegions(d3.select("svg"), "fig", [[x, y, w, h], ...], W, H);   // glass rects
//   dualStroke(g, d, { glass: css("residual"), ink: css("residual-ink"), width: 2 }, clip);
//
// Ids installed (reference them from any SVG on the page): #glass-fill (window gradient), #card-shadow (a paper card
// lying on paper), #paper (a card on glass), #glow (light along a route; userSpaceOnUse so perfectly vertical lines
// keep their filter region), #dot-glow (the same glow for a small moving dot), #tile-glow (a lit hidden state),
// #arrow-ink (an ink-gold arrowhead).
// Why a separate, always-rendered SVG: Chrome drops elements whose filter lives inside a display:none SVG, and scene
// SVGs are hidden and shown as the steps change. Rationale and examples: kit/PLAYBOOK.md.

export function installGlassDefs(d3, { overseerInk = "#855A00", glowBox = [-40, -40, 820, 720] } = {}) {
  if (document.getElementById("glass-fill")) return;
  const defs = d3.select("body").append("svg").attr("width", 0).attr("height", 0).attr("aria-hidden", "true")
    .style("position", "absolute").append("defs");
  defs.append("filter").attr("id", "card-shadow").attr("x", "-20%").attr("y", "-30%").attr("width", "140%").attr("height", "170%")
    .html(`<feDropShadow dx="0" dy="1.6" stdDeviation="1.6" flood-color="#3c2d14" flood-opacity="0.22"/>`);
  defs.append("filter").attr("id", "paper").attr("x", "-20%").attr("y", "-30%").attr("width", "140%").attr("height", "170%")
    .html(`<feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.4"/>`);
  const [gx, gy, gw, gh] = glowBox;
  defs.append("filter").attr("id", "glow").attr("filterUnits", "userSpaceOnUse")
    .attr("x", gx).attr("y", gy).attr("width", gw).attr("height", gh)
    .html(`<feGaussianBlur stdDeviation="3.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>`);
  // the same glow for a small moving thing (a pulse): a filter region around the element only, so moving it doesn't
  // re-blur the whole figure every frame
  defs.append("filter").attr("id", "dot-glow").attr("x", "-150%").attr("y", "-150%").attr("width", "400%").attr("height", "400%")
    .html(`<feGaussianBlur stdDeviation="3.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>`);
  defs.append("filter").attr("id", "tile-glow").attr("x", "-60%").attr("y", "-60%").attr("width", "220%").attr("height", "220%")
    .html(`<feDropShadow dx="0" dy="0" stdDeviation="4.5" flood-color="#5B9CF5" flood-opacity="0.85"/>`);
  const gf = defs.append("linearGradient").attr("id", "glass-fill").attr("x1", 0).attr("y1", 0).attr("x2", 0).attr("y2", 1);
  gf.append("stop").attr("offset", 0).attr("stop-color", "#0d1420");
  gf.append("stop").attr("offset", 1).attr("stop-color", "#060910");
  defs.append("marker").attr("id", "arrow-ink").attr("viewBox", "0 0 10 10").attr("refX", 8).attr("refY", 5)
    .attr("markerWidth", 7).attr("markerHeight", 7).attr("orient", "auto-start-reverse")
    .append("path").attr("d", "M0,0L10,5L0,10z").attr("fill", overseerInk);
}

// Two complementary clip paths for one SVG: inside the glass rects, and everything else (the paper).
// Returns their url(...) strings. Call again with new rects to update them in place.
export function clipRegions(svg, prefix, rects, W, H) {
  let defs = svg.select(`defs.${prefix}-clips`);
  if (defs.empty()) defs = svg.append("defs").attr("class", `${prefix}-clips`);
  let inner = defs.select(`#${prefix}-glass`);
  if (inner.empty()) inner = defs.append("clipPath").attr("id", `${prefix}-glass`);
  inner.selectAll("rect").data(rects).join("rect")
    .attr("x", (r) => r[0]).attr("y", (r) => r[1]).attr("width", (r) => r[2]).attr("height", (r) => r[3]);
  let outer = defs.select(`#${prefix}-paper`);
  if (outer.empty()) outer = defs.append("clipPath").attr("id", `${prefix}-paper`).append("path").attr("clip-rule", "evenodd");
  else outer = outer.select("path");
  outer.attr("d", `M-50,-50H${W + 50}V${H + 50}H-50Z` + rects.map(([x, y, w, h]) => `M${x},${y}h${w}v${h}h${-w}Z`).join(""));
  return { glass: `url(#${prefix}-glass)`, paper: `url(#${prefix}-paper)` };
}

// One path drawn twice with the same geometry: the glass color inside the window, the ink color on paper. Use it for
// any line that crosses the readability boundary (a write leaving the model, an input entering it).
export function dualStroke(parent, d, { glass, ink, width = 1.5, dash = null, opacity = 1, glow = false }, clip) {
  return [[glass, clip.glass], [ink, clip.paper]].map(([color, cp]) => parent.append("path").attr("d", d).attr("fill", "none")
    .attr("stroke", color).attr("stroke-width", width).attr("stroke-dasharray", dash).attr("opacity", opacity)
    .attr("clip-path", cp).attr("filter", glow && cp === clip.glass ? "url(#glow)" : null));
}
