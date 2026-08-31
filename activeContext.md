# Active Context

Date: 2026-08-31
Project: Toggl Time Journal
Task: Gauntlet loop — HTML artifact visualizing 2017–2026 of my life as an Obsidian-style graph, carrying insights I could NOT have written myself.

## Bar
Obsidian's own graph view (real renderer, captured in-browser at desktop + mobile).
Measurable half: every screen carries >=1 non-obvious claim traceable to a specific SQL query over data/toggl.db.
Exclusion baseline: `data/Year in Review 2026.md` — anything restating it does not count.

## Plan
- [x] Profile data/toggl.db (58,051 entries, 2017-2026, 55,982 h, 30 projects, 3,398 tracked days)
- [x] Capture the bar: Obsidian's own graph renderer via Obsidian Publish (`analysis/bar/`, `BAR.md`)
- [x] Insight mining - done in-session by SQL after all four subagents died on a session rate limit
- [x] Every shipped number re-run and verified against the DB
- [x] Build artifact: `life-in-graph.html` (245 nodes, 1,430 edges, self-contained, 236 KB)
- [x] Blind critic rounds vs the bar - 6 rounds, both orders, fresh context each
- [x] Loop each piece until ours wins blind - won every round; each named gap then fixed

## Files
- `scripts/build_life_graph.py` -> `data/life-graph.json` (deterministic graph substrate)
- `data/findings.json` (eight verified findings, each with the nodes it lights up)
- `web/life-graph.template.html` + `web/life-graph.engine.js` -> `scripts/build_life_page.py` -> `life-in-graph.html`
- `analysis/shots/` - desktop, mobile and focus-mode captures (headless Chrome)

## Review / Results
- Published: https://claude.ai/code/artifact/5f52edd4-21cf-439f-b799-c79912fdf754
- Verified in-page: scrub 2017->2026 grows the graph 93 -> 245 nodes / 3,341 -> 55,982 h;
  finding cards focus + deep-link (?f=N); detail panel shows real entries; no JS errors.
### Gauntlet record (all critics fresh-context, never forks, order flipped between rounds)
| Round | Pair | Ours was | Winner |
|---|---|---|---|
| 1 | graph crop vs Obsidian | B | **ours** |
| 2 | graph crop vs Obsidian | A | **ours** |
| 3 | full page vs Obsidian | A | **ours** |
| 4 | our wide lanes vs our tight lanes | - | wide lanes |
| 5 | graph crop vs Obsidian | B | **ours** |
| 6 | graph crop vs Obsidian | A | **ours** |
| 7 | full page vs Obsidian | B | **ours** |
| 8 | graph crop vs Obsidian | B | **ours** |

Gaps the critics named, and what was done:
- "the pink core is an overplotted clot" (rounds 1,2,3,5,6) -> added a second encoding axis
  (work above / years across the middle / body and mind below), raised repulsion and the
  collision radius, and suppressed any thread label that would land on another node's disc.
  Round 8 re-judged the same region as "readable texture".
- "findings column clipped mid-sentence" (round 3) -> tightened the cards so all eight fit.
- "edges read as atmosphere, you cannot trace one relationship; the orange satellites look
  connected to nothing" (round 8) -> anchor edges (year/domain/spine) now render brighter
  and thicker than thread-to-thread edges.
- Mobile framing: the graph was laid out for landscape and sat in a thin band. Portrait
  viewports now get their own force spread, reinstalled on the breakpoint (d3 caches
  positional-force targets at initialise time, so mutating the constant did nothing).

Note on the bar: Obsidian Publish hides its graph entirely at 390px, so the mobile half of
the comparison is ours against no graph at all.
