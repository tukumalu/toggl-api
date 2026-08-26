"""Render Obsidian-style graph views of two vaults for blind comparison."""

from __future__ import annotations

import re
import sys
from pathlib import Path

import matplotlib
import networkx as nx

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

WIKILINK = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]")


def parse_vault(root: Path) -> tuple[nx.DiGraph, dict[str, str]]:
    notes: dict[str, Path] = {}
    for p in root.rglob("*.md"):
        if p.name.lower() in {"index.md", "log.md", "agents.md"}:
            continue
        key = p.stem.lower()
        if key not in notes:
            notes[key] = p
    graph = nx.DiGraph()
    kinds: dict[str, str] = {}
    for key, path in notes.items():
        text = path.read_text(encoding="utf-8", errors="replace")
        kind = "note"
        m = re.search(r'^type:\s*"?([\w-]+)"?', text, re.MULTILINE)
        if m:
            kind = m.group(1)
        graph.add_node(key)
        kinds[key] = kind
        for target in WIKILINK.findall(text):
            tkey = target.strip().lower()
            if tkey in notes and tkey != key and tkey not in graph[key]:
                graph.add_edge(key, tkey)
    return graph, kinds


STYLE = {
    "hub": "#f5a623", "domain": "#a78bfa", "year": "#60a5fa",
    "activity": "#4ade80", "concept": "#f472b6", "person": "#f87171",
    "note": "#8b7cf6",
}


def render(graph: nx.DiGraph, kinds: dict[str, str], out: Path,
           title: str) -> dict:
    deg = dict(graph.degree())
    max_deg = max(deg.values()) or 1
    pos = nx.spring_layout(graph.to_undirected(), k=0.28 / (len(graph) ** 0.33),
                           iterations=120, seed=7)
    sizes = [14 + 260 * (deg[n] / max_deg) ** 1.8 for n in graph.nodes]
    colors = [STYLE.get(kinds.get(n, "note"), "#8b7cf6") for n in graph.nodes]
    fig, ax = plt.subplots(figsize=(16, 16), dpi=100)
    fig.patch.set_facecolor("#16161a")
    ax.set_facecolor("#16161a")
    nx.draw_networkx_edges(graph.to_undirected(), pos, ax=ax, alpha=0.10,
                           edge_color="#9aa0ff", width=0.6)
    nx.draw_networkx_nodes(graph.nodes, pos, ax=ax, node_size=sizes,
                           node_color=colors, linewidths=0.0, alpha=0.95)
    labeled = {n for n, d in deg.items() if d >= max(12, max_deg * 0.18)}
    nx.draw_networkx_labels(graph.subgraph(labeled), pos, ax=ax,
                            font_size=9, font_color="#e8e8ef",
                            font_family="Segoe UI")
    ax.set_axis_off()
    fig.tight_layout(pad=0)
    fig.savefig(out, facecolor=fig.get_facecolor())
    plt.close(fig)

    undirected = graph.to_undirected()
    n_orphans = sum(1 for _, d in undirected.degree() if d == 0)
    comps = nx.number_connected_components(undirected)
    hubs = sorted(deg.items(), key=lambda kv: -kv[1])[:5]
    metrics = {"nodes": graph.number_of_nodes(),
               "edges": graph.number_of_edges(),
               "orphans": n_orphans,
               "components": comps,
               "top_hubs": [(n, d) for n, d in hubs]}
    print(title, metrics)
    return metrics


def main() -> None:
    ours_root = Path(sys.argv[1])
    bar_root = Path(sys.argv[2])
    out_dir = Path(sys.argv[3])
    out_dir.mkdir(parents=True, exist_ok=True)
    g_ours, k_ours = parse_vault(ours_root)
    g_bar, k_bar = parse_vault(bar_root)
    render(g_bar, k_bar, out_dir / "vault_A.png", "A")
    render(g_ours, k_ours, out_dir / "vault_B.png", "B")


if __name__ == "__main__":
    main()
