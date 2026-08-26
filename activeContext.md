# Active Context

Date: 2026-08-26
Project: Toggl Time Journal
Task: Gauntlet loop — build an Obsidian vault (Karpathy LLM-Wiki pattern) from Toggl data whose graph view beats Nick Milo's LYT Kit blind

## Plan

- [x] Inspect `data/toggl.db`: 58,051 entries, 2017–2026, 30 projects, tags Deep/Highlight/Grind.
- [x] Write `scripts/build_vault.py` — deterministic generator: reads SQLite, emits `obsidian-vault/` markdown pages with YAML frontmatter + `[[wikilinks]]` (Home hub, domain pages, people, chained year pages, activity pages, concept/thread pages, AGENTS.md schema, index.md, log.md).
- [x] Run generator; verify vault link graph is dense (0 orphans, fully connected).
- [x] Fetch bar: LYT Kit via mirror `thebrianbug/LYT-Kit` (official `nickmilo/LYT-Kit` repo is gone; kit now gated behind email signup as "Ideaverse").
- [x] Render both graphs identically (`scripts/render_graph.py`: parse `[[links]]`, networkx spring layout, Obsidian-style dark render).
- [x] Critic rounds: 3 fresh-context blind A/B comparisons with shuffled candidate order — ours won all three.

## Review / Results

- **Vault:** `obsidian-vault/` — 219 pages (Home hub, 26 domains, 2 people, 10 year pages, ~160 activity pages, 10 concept pages), 1,261 directed links, 0 orphans, 1 connected component.
- **Bar comparison (parsed link graphs):** ours 216 nodes / 1,394 edges / 0 orphans / 1 component; LYT Kit 272 nodes / 747 edges / 27 orphans / 32 components.
- **Gauntlet verdict:** fresh-context critic picked our graph blind in rounds 1, 2, and 3. Remaining named gap: peripheral leaf activities read somewhat radial vs LYT's mesh; mitigated by sibling-chaining all activities within each domain/year/tag cluster.
- **How to view:** open `obsidian-vault/` as an Obsidian vault → graph view. Comparison renders: `analysis/output/vault_A.png` (LYT Kit), `vault_B.png` (ours).
- **Regenerate:** `python scripts/build_vault.py`; re-render comparison with `python scripts/render_graph.py obsidian-vault <lyt-kit-path> analysis\output`.
