# Active Context

Date: 2026-09-01
Project: Toggl Time Journal
Task: Analytics on the freshly exported month (data/TogglTrack_Report_Detailed_report_(from_08_02_2026_to_09_06_2026).csv) - trend, change, foresight, actions.

## Plan
- [x] Merge new CSV (Aug 2 - Sep 1, 485 entries) with the 2026 YTD CSV; dedupe (2 overlaps) -> 4,499 entries, 244/244 days covered
- [x] Last-30 vs prior-30 vs 2026 YTD vs 9-year August baseline
- [x] Project / tag / time-of-day / fragmentation shifts
- [x] Sleep proxy: tracked-hours-per-day and longest untracked block per day
- [x] Trend fits on last 10 weeks + bounded forecast
- [x] Publish report artifact with charts
- [x] Published: https://claude.ai/code/artifact/c86a9077-9b4e-4841-99d1-6f20d022bb96
- [ ] Optional follow-up: incremental-sync the DB (stale since 2026-05-17) so the graph/vault match the CSV

## Review / Results
- Merged dataset: 4,499 entries, 2026-01-01 -> 2026-09-01, 244/244 days, 2 duplicate rows dropped.
- Headline: Aug = 606.2 h / 19.6 h per day, the highest August in the 10-year log (2018-25 band: 17.0-17.9).
- Postnatal peaked at 92 h in W31 (week of 27 Jul) and fell to 37 h by W35; slope -9.4 h/wk over the last 6 weeks.
- Sleep proxy (24 h minus logged): 6.3-6.8 h/day Jan-May -> 3.6 in Jul -> 4.4 in Aug; longest unbroken gap under 4 h on 55% of Aug days (Jul 61%, Jan-May 0-6%).
- Deep-tagged hours recovered 2.1 -> 21.2 h/wk across Aug; Work steady at ~29 h/wk.
- Signals: wife PPD time 0.7 -> 4.0 -> 15.5 h/month (May/Jul/Aug); nanny churn 41-44 h in W31-32 then collapse; layoff/pay-cut risk 3.4 h on 5-6 Aug then silence.
- Charts hand-built as inline SVG; palette validated with the dataviz validator (5 slots, PASS light + dark); rendered and eyeballed headless in both themes.

---

# Previous task (archived)

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
