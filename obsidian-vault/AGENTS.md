---
title: "Vault Schema"
---

# Vault Schema (for the LLM maintainer)

This vault is a persistent LLM-maintained wiki over raw Toggl data
(data/toggl.db in the parent repo). Pattern source:
https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f

## Layout
- `Home.md` — the hub. Every new page must be reachable from here within 2 hops.
- `Domains/` — one page per Toggl project (life domain). Hubs for their activities.
- `People/` — humans appearing in the data.
- `Years/` — annual summaries, chained chronologically.
- `Activities/` — recurring named activities (>= 15 lifetime hours).
- `Concepts/` — synthesized threads: tagged practices (Deep Work, Highlights,
  The Grind) and cross-domain narratives (Parenthood, Education Arc, ...).

## Conventions
- Every page carries YAML frontmatter: `type`, `hours`, and domain-specific keys.
- Link generously with `[[wikilinks]]`; the graph view is the point.
- Never edit raw data; regenerate pages via `python scripts/build_vault.py`.
- New ingests append an entry to `log.md` with prefix `## [date] op | subject`.