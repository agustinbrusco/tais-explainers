import * as d3 from "d3";
import { mountSteps } from "../../../kit/web/steps.js";

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
const T = { normal: 800 };

const tokens = ["The", " capital", " of", " France", " is"];
const DIM = 8;
// Schematic vectors: deterministic pseudo-random so screenshots are stable.
const rand = d3.randomLcg(7);
const vectors = tokens.map(() => d3.range(DIM).map(() => rand() * 2 - 1));

const svg = d3.select("#stage");
const W = 720, H = 420, colW = W / tokens.length;
// Two materials (kit/web/base.css): the model's interior is a dark glass window; readable tokens lie on the paper below it.
svg.append("rect").attr("x", 8).attr("y", 14).attr("width", W - 16).attr("height", H - 100).attr("rx", 14)
  .attr("fill", css("bg")).attr("stroke", css("grid"));
const x = (i) => colW * i + colW / 2;
const barY = d3.scaleLinear().domain([-1, 1]).range([34, -34]);

const tok = svg.selectAll("g.tok").data(tokens).join("g")
  .attr("class", "tok").attr("transform", (_, i) => `translate(${x(i)},${H - 60})`);
tok.append("rect").attr("x", -colW / 2 + 6).attr("width", colW - 12).attr("height", 44).attr("rx", 6);
tok.append("text").attr("y", 30).attr("text-anchor", "middle").text((d) => d.trim());

const vec = svg.selectAll("g.vec").data(vectors).join("g")
  .attr("class", "vec").attr("transform", (_, i) => `translate(${x(i)},${H / 2 + 10})`);
vec.append("rect").attr("x", -colW / 2 + 14).attr("y", -52).attr("width", colW - 28).attr("height", 104)
  .attr("rx", 8).attr("fill", css("surface")).attr("stroke", css("residual")).attr("stroke-opacity", 0.5);
vec.selectAll("rect.bar").data((d) => d).join("rect").attr("class", "bar")
  .attr("x", (_, j) => -((DIM * 9) / 2) + j * 9).attr("width", 6)
  .attr("y", (v) => Math.min(barY(v), 0)).attr("height", (v) => Math.abs(barY(v)))
  .attr("fill", css("residual"));

const stream = svg.append("line").attr("x1", 20).attr("x2", W - 20)
  .attr("y1", H / 2 + 10).attr("y2", H / 2 + 10).attr("stroke", css("residual")).attr("stroke-width", 2)
  .lower();

const lens = svg.append("g").attr("transform", `translate(${x(4)},${70})`);
lens.append("circle").attr("r", 26).attr("fill", "none").attr("stroke", css("overseer")).attr("stroke-width", 3);
lens.append("line").attr("y1", 26).attr("y2", 88).attr("stroke", css("overseer")).attr("stroke-dasharray", "4 4");
lens.append("text").attr("y", -38).attr("text-anchor", "middle").attr("fill", css("overseer"))
  .style("font", `600 24px ${css("font-mono")}`).text("→ Paris");

function render(i) {
  const t = svg.transition().duration(T.normal).ease(d3.easeCubicInOut);
  vec.transition(t).style("opacity", i >= 1 ? 1 : 0);
  stream.transition(t).style("opacity", i >= 1 ? 0.35 : 0);
  lens.transition(t).style("opacity", i >= 2 ? 1 : 0);
  return t.end().catch(() => {});
}

// Start hidden so step 0 doesn't flash later elements.
vec.style("opacity", 0); stream.style("opacity", 0); lens.style("opacity", 0);
mountSteps({ render });
