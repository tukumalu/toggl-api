"""Export the vault link graph as a self-contained interactive HTML graph view."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import networkx as nx

sys.path.insert(0, str(Path(__file__).parent))
from render_graph import STYLE, parse_vault  # noqa: E402

TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Toggl Decade — Graph View</title>
<style>
  html, body { margin: 0; height: 100%; background: #16161a; overflow: hidden;
               font-family: "Segoe UI", sans-serif; }
  #canvas { width: 100vw; height: 100vh; cursor: grab; }
  #canvas:active { cursor: grabbing; }
  .link { stroke: #6f74d8; stroke-opacity: 0.12; }
  .node { stroke: none; cursor: pointer; }
  .lbl { fill: #e8e8ef; font-size: 11px; pointer-events: none;
         text-anchor: middle; paint-order: stroke; stroke: #16161a;
         stroke-width: 3px; }
  #hud { position: fixed; top: 14px; left: 16px; color: #9aa0b5; font-size: 13px; }
  #hud b { color: #f5a623; font-size: 15px; }
  #legend { position: fixed; bottom: 14px; left: 16px; color: #9aa0b5;
            font-size: 12px; line-height: 1.7; }
  .sw { display: inline-block; width: 10px; height: 10px; border-radius: 50%;
        margin-right: 6px; }
  .dim { opacity: 0.06 !important; }
</style>
</head>
<body>
<svg id="canvas"></svg>
<div id="hud"><b>Toggl Decade</b> — __NODES__ pages · __LINKS__ links · drag to pull, scroll to zoom, hover to isolate</div>
<div id="legend">__LEGEND__</div>
<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
<script>
const data = __DATA__;
const svg = d3.select("#canvas");
const g = svg.append("g");
const zoom = d3.zoom().scaleExtent([0.05, 8])
  .on("zoom", (e) => g.attr("transform", e.transform));
svg.call(zoom);

const links = g.append("g").selectAll("line").data(data.links).join("line")
  .attr("class", "link");
const node = g.append("g").selectAll("circle").data(data.nodes).join("circle")
  .attr("class", "node").attr("r", d => d.r).attr("fill", d => d.color);
const label = g.append("g").selectAll("text").data(data.nodes).join("text")
  .attr("class", "lbl").text(d => d.deg >= 14 ? d.name : null);

node.call(d3.drag()
  .on("start", (e, d) => { if (!e.active) sim.alphaTarget(0.25).restart(); d.fx = d.x; d.fy = d.y; })
  .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
  .on("end", (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

const sim = d3.forceSimulation(data.nodes)
  .force("link", d3.forceLink(data.links).distance(55).strength(0.35))
  .force("charge", d3.forceManyBody().strength(-140))
  .force("center", d3.forceCenter(0, 0))
  .force("collide", d3.forceCollide().radius(d => d.r + 3))
  .on("tick", () => {
    links.attr("x1", d => d.source.x).attr("y1", d => d.source.y)
         .attr("x2", d => d.target.x).attr("y2", d => d.target.y);
    node.attr("cx", d => d.x).attr("cy", d => d.y);
    label.attr("x", d => d.x).attr("y", d => d.y - d.r - 4);
  });

node.on("mouseover", (e, d) => {
  const keep = new Set([d.id]);
  data.links.forEach(l => {
    if (l.source.id === d.id) keep.add(l.target.id);
    if (l.target.id === d.id) keep.add(l.source.id);
  });
  node.classed("dim", n => !keep.has(n.id));
  label.classed("dim", n => !keep.has(n.id));
  links.classed("dim", l => l.source.id !== d.id && l.target.id !== d.id);
}).on("mouseout", () => {
  node.classed("dim", false); label.classed("dim", false);
  links.classed("dim", false);
});
</script>
</body>
</html>
"""


def main() -> None:
    vault_root = Path(sys.argv[1])
    out = Path(sys.argv[2])
    graph, kinds = parse_vault(vault_root)
    deg = dict(graph.degree())
    nodes = [{"id": n, "name": n, "kind": kinds.get(n, "note"),
              "color": STYLE.get(kinds.get(n, "note"), "#8b7cf6"),
              "deg": deg[n],
              "r": 3.5 + 16 * (deg[n] / max(deg.values())) ** 1.6}
             for n in graph.nodes]
    links = [{"source": u, "target": v}
             for u, v in graph.to_undirected().edges]
    legend = "".join(
        f'<span class="sw" style="background:{c}"></span>{k.capitalize()}&nbsp;&nbsp;'
        for k, c in STYLE.items() if k != "note")
    html = (TEMPLATE.replace("__DATA__", json.dumps({"nodes": nodes, "links": links}))
            .replace("__NODES__", str(len(nodes)))
            .replace("__LINKS__", str(len(links)))
            .replace("__LEGEND__", legend))
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out}: {len(nodes)} nodes, {len(links)} links")


if __name__ == "__main__":
    main()
