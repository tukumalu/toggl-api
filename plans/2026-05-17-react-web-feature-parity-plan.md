---
title: "React Web App Feature Parity with Streamlit"
date: "2026-05-17"
status: "draft"
request: "Compare Streamlit and React apps, improve GitHub Pages version via multi-phase plan to reach feature parity"
plan_type: "multi-phase"
research_inputs:
  - "none"
---

# Plan: React Web App Feature Parity with Streamlit

## Objective
Bring the React/TypeScript web app (deployed at `https://tukumalu.github.io/toggl-api/`) to visual and functional parity with the polished Streamlit app. The GitHub Pages demo currently looks barebone because of sparse mock data (10 entries), missing visual polish (uniform metric colors, no scan-line, wrong font), and several unintegrated components. Each phase is independently deployable.

## Context Snapshot
- **Current state:** React app is ~80% feature-complete structurally but visually underwhelming. Mock data has only 10 entries across 3 projects and 2 date clusters. Homepage lacks project-colored cards and day grouping. Dashboard has NeonHeatmap built but not integrated, no most-common-activities table. Chat has no collapsible help. Nav is a horizontal button grid. All metric cards are the same cyan color.
- **Desired state:** React app matches Streamlit's cyberpunk neon aesthetic — project-colored cards, per-metric accent colors, GitHub-style daily heatmap, scan-line overlay, `Share Tech Mono` font, rich mock data spanning 12+ months across 6+ projects, sidebar navigation, branded login page.
- **Key repo surfaces:**
  - `web/src/lib/supabase.ts` — mock data and RPC handlers
  - `web/src/pages/Homepage.tsx` — highlight cards
  - `web/src/pages/Dashboard.tsx` — charts, metrics, drilldown
  - `web/src/pages/Chat.tsx` — chat interface
  - `web/src/components/MetricCard.tsx` — metric display
  - `web/src/components/AppShell.tsx` — navigation layout
  - `web/src/components/Charts/NeonHeatmap.tsx` — built, not integrated
  - `web/src/styles/theme.css` — CSS variables and theme
  - `web/src/lib/api.ts` — data fetching layer
  - `.github/workflows/web-deploy.yml` — deployment pipeline
- **Out of scope:** Supabase backend changes, Streamlit app modifications, real data sync features, authentication with real backend

## Research Inputs
No applicable research briefs were found in `research/`.

## Assumptions and Constraints
- **ASM-001:** The React app must work fully in demo mode (no Supabase env vars) since GitHub Pages has no backend
- **ASM-002:** The existing Supabase integration code must be preserved — mock data is a fallback layer, not a replacement
- **ASM-003:** The GitHub Actions workflow (`web-deploy.yml`) deploys automatically on `web/**` changes to master
- **CON-001:** Must use existing stack: React 18, TypeScript, Vite 5, Plotly.js, react-router-dom with HashRouter
- **CON-002:** No server-side rendering or API routes — static site only
- **DEC-001:** Cyberpunk neon color palette is fixed: cyan `#00fff9`, magenta `#ff00ff`, green `#39ff14`, purple `#bc13fe`, gold `#ffd700`, dark bg `#0a0a1a`

## Phase Summary
| Phase | Goal | Dependencies | Primary outputs |
|---|---|---|---|
| PHASE-01 | Rich mock data + visual foundation | None | Expanded mock dataset, `Share Tech Mono` font, scan-line overlay, CSS variable updates |
| PHASE-02 | Homepage parity | PHASE-01 | Project-colored cards, day grouping, matching Streamlit homepage |
| PHASE-03 | Dashboard completion | PHASE-01 | Heatmap integration, most-common-activities table, per-metric accent colors |
| PHASE-04 | Chat + navigation + login branding | PHASE-01 | Collapsible help, richer mock responses, sidebar nav, branded login |
| PHASE-05 | Deploy and verify | PHASE-01..04 | Successful GitHub Pages deployment, visual verification |

## Detailed Phases

### PHASE-01 - Rich Mock Data & Visual Foundation
**Goal**
Replace the 10-entry mock dataset with 80-100 entries spanning 12+ months, 6+ projects, and multiple tags. Update CSS foundation: import `Share Tech Mono`, add scan-line overlay, update color variables to match Streamlit.

**Tasks**
- [ ] TASK-01-01: Expand `mockEntries` array in `web/src/lib/supabase.ts` to ~80 entries spanning 2023-01 through 2026-03, covering projects: Work, Home, Health, Leisure, Agentic, Intellect. Include realistic descriptions and varied tags (Highlight, Deep Work, Meeting, Admin, Exercise, Reading).
- [ ] TASK-01-02: Update mock RPC handlers in `supabase.ts` to correctly aggregate the new data (existing logic should work, but verify `get_on_this_day`, `get_week_across_years`, and `get_available_years` return meaningful results).
- [ ] TASK-01-03: Add `Share Tech Mono` Google Font import to `web/index.html` and update `web/src/styles/theme.css` to use it as the primary monospace font instead of `Courier New`.
- [ ] TASK-01-04: Add scan-line CSS overlay to `theme.css` matching Streamlit's implementation: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 249, 0.015) 2px, rgba(0, 255, 249, 0.015) 4px)` applied to `.app` or `body::before`.
- [ ] TASK-01-05: Verify the background gradient matches Streamlit: `radial-gradient(ellipse at 20% 50%, #0d1b3e 0%, #0a0a1a 70%)`.
- [ ] TASK-01-06: Update `PROJECT_COLORS` mapping — add a shared constant in a new file `web/src/lib/colors.ts` mapping project names to hex colors matching Streamlit's `PROJECT_COLORS` dict.

**Files / Surfaces**
- `web/src/lib/supabase.ts` — expand mockEntries, verify RPC mock handlers
- `web/index.html` — add Google Font link
- `web/src/styles/theme.css` — font family, scan-line overlay, background gradient
- `web/src/lib/colors.ts` — new file, shared project color mapping

**Dependencies**
- None

**Exit Criteria**
- [ ] `npm run build` succeeds with no TypeScript errors
- [ ] Dev server shows scan-line overlay on all pages
- [ ] Font renders as `Share Tech Mono` (verify in browser dev tools)
- [ ] Dashboard shows data spanning multiple months when running locally
- [ ] Mock RPC handlers return aggregated data for all 80+ entries

**Phase Risks**
- **RISK-01-01:** Large mock data array bloats bundle size. Mitigation: 80-100 entries at ~200 bytes each is ~20KB — negligible.

### PHASE-02 - Homepage Parity
**Goal**
Match Streamlit's Homepage: project-colored left-border cards, day-grouped layout with day headers, duration formatting (hours/minutes), meta line with project name + duration + time.

**Tasks**
- [ ] TASK-02-01: Import `PROJECT_COLORS` from `web/src/lib/colors.ts` into `Homepage.tsx`.
- [ ] TASK-02-02: Group highlight entries by date (sort ascending by `start`, group by `start_date`). Render a day header (`<h3>` styled like "Monday, Mar 23") before each group.
- [ ] TASK-02-03: Replace current entry cards with styled cards matching Streamlit: `border-left: 3px solid {accent}` where accent comes from `PROJECT_COLORS[project_name]`, dark gradient background `linear-gradient(135deg, #12122a 0%, #1a1a3e 100%)`, description as primary text, meta line (project + duration + time) as secondary muted text.
- [ ] TASK-02-04: Format duration: show `Xh` for >= 1 hour, `Xm` for < 1 hour (matching Streamlit's `f"{hours:.1f}h" if hours >= 1 else f"{int(hours * 60)}m"`).
- [ ] TASK-02-05: Add week header and date range caption matching Streamlit: "This Week's Highlights" + "Week N -- Mon DD to Mon DD, YYYY".
- [ ] TASK-02-06: Ensure mock data includes at least 4-5 entries with "Highlight" tag in the current week's date range so demo mode shows meaningful content. Update mock entries' dates to include some entries in the current ISO week.

**Files / Surfaces**
- `web/src/pages/Homepage.tsx` — card rendering, grouping logic
- `web/src/lib/supabase.ts` — ensure current-week Highlight entries exist in mock data
- `web/src/styles/theme.css` — entry card styles if needed

**Dependencies**
- PHASE-01 (needs `PROJECT_COLORS` and expanded mock data)

**Exit Criteria**
- [ ] Homepage shows day-grouped cards with colored left borders
- [ ] Each project maps to a distinct accent color
- [ ] Current-week highlight entries render in demo mode
- [ ] Duration shows "2.5h" or "45m" format
- [ ] Visual match with Streamlit's Homepage (compare side-by-side)

**Phase Risks**
- **RISK-02-01:** Current-week mock data goes stale as dates pass. Mitigation: Generate mock dates relative to `new Date()` (current week Monday through Sunday) rather than hardcoded dates.

### PHASE-03 - Dashboard Completion
**Goal**
Integrate the NeonHeatmap component, add most-common-activities table, give each MetricCard a unique accent color matching Streamlit's per-metric coloring.

**Tasks**
- [ ] TASK-03-01: Update `MetricCard.tsx` to accept an optional `accentColor` prop. Default to cyan. Apply accent as `border-top` color, value text color, and `text-shadow` glow color.
- [ ] TASK-03-02: In `Dashboard.tsx`, pass unique accent colors to each MetricCard matching Streamlit: Total Hours=`#00fff9`, Entries=`#ff00ff`, Projects=`#39ff14`, Active Days=`#bc13fe`, Avg Hours/Day=`#ffd700`.
- [ ] TASK-03-03: Fix `NeonHeatmap.tsx` to render a GitHub-style grid heatmap (7 rows for weekdays x 53 columns for ISO weeks) using Plotly `heatmap` trace type instead of `histogram2dcontour`. Match Streamlit's implementation: pivot by weekday (index) and ISO week (columns), fill all 53 weeks, use `SCALE_NEON_HEATMAP` colors.
- [ ] TASK-03-04: Integrate `NeonHeatmap` into `Dashboard.tsx` after the monthly trend chart. For single-year view, show one heatmap. For all-time view, show one heatmap per year (most recent first), matching Streamlit's small-multiples pattern.
- [ ] TASK-03-05: Add mock RPC handler for daily hours data if not already returning proper heatmap-compatible data (`get_daily_hours` should return `{start_date, hours, entries}` for each day).
- [ ] TASK-03-06: Add "Most Common Activities" section at the bottom of Dashboard — a styled table showing top 30 descriptions with columns: Description, Entries, Total Hours, Avg Hours. Fetch via a new mock RPC `get_top_activities` or compute client-side from entries.
- [ ] TASK-03-07: Ensure the MetricCard container uses `box-shadow: 0 0 10px {accent}15` and `inset` shadow matching Streamlit's glow effect.

**Files / Surfaces**
- `web/src/components/MetricCard.tsx` — add `accentColor` prop
- `web/src/pages/Dashboard.tsx` — wire accent colors, integrate heatmap, add activities table
- `web/src/components/Charts/NeonHeatmap.tsx` — rewrite to GitHub-style grid heatmap
- `web/src/lib/supabase.ts` — verify/add `get_daily_hours` and `get_top_activities` mock handlers
- `web/src/lib/api.ts` — add fetch functions for new endpoints

**Dependencies**
- PHASE-01 (needs rich mock data for heatmap to show meaningful patterns)

**Exit Criteria**
- [ ] Each of the 5 metric cards has a distinct accent color with glow effect
- [ ] Heatmap renders as 7-row x 53-column grid with colored cells
- [ ] Heatmap shows year labels in all-time view
- [ ] Most-common-activities table displays top descriptions with hours
- [ ] No TypeScript errors, `npm run build` succeeds

**Phase Risks**
- **RISK-03-01:** Plotly heatmap rendering performance with large datasets. Mitigation: mock data is small; real Supabase data is pre-aggregated by RPC.
- **RISK-03-02:** NeonHeatmap rewrite may break the existing component API. Mitigation: the component is currently unused, so no consumers to break.

### PHASE-04 - Chat, Navigation & Login Branding
**Goal**
Add collapsible help to Chat page, enrich mock chat responses, replace horizontal nav grid with a persistent sidebar, and add Streamlit-style branded login page.

**Tasks**
- [ ] TASK-04-01: In `Chat.tsx`, add a collapsible help section (HTML `<details>`/`<summary>` or a toggle div) above the chat history. Content: "Time periods", "Projects & Tags", "Analysis" categories matching Streamlit's help text. Auto-expand when message history is empty, collapse when messages exist.
- [ ] TASK-04-02: Expand mock chat responses in `supabase.ts` `functions.invoke` handler. Add pattern matching for: "this week", "yesterday", "compare", "total hours", "search", project names. Return formatted markdown responses with mock data.
- [ ] TASK-04-03: Refactor `AppShell.tsx` from horizontal nav grid to a vertical sidebar layout. Use a fixed-width left sidebar (~240px) with vertical nav links, each with an icon and label. Match Streamlit's navigation: Homepage (home icon), Dashboard (chart icon), Retrospect (search icon), Chat (chat icon). Sidebar should collapse on mobile to a hamburger menu.
- [ ] TASK-04-04: Add branded login page component `web/src/pages/Login.tsx` matching Streamlit's TIME JOURNAL branding: centered container, timer icon, "TIME JOURNAL" title in cyan with glow, "YOUR TOGGL DATA - VISUALIZED" tagline, password input, "Access Dashboard" button. Use `Share Tech Mono` font, scan-line overlay visible behind.
- [ ] TASK-04-05: Wire login page into the router — show `Login` when not authenticated, redirect to Homepage on success. In demo mode, accept any password or skip login entirely.
- [ ] TASK-04-06: Move the "Cyberpunk analytics cockpit" subtitle from the topbar into the sidebar header, or remove it in favor of the branded title.

**Files / Surfaces**
- `web/src/pages/Chat.tsx` — collapsible help section
- `web/src/lib/supabase.ts` — richer mock chat responses
- `web/src/components/AppShell.tsx` — sidebar navigation refactor
- `web/src/pages/Login.tsx` — new branded login page
- `web/src/App.tsx` — route login page
- `web/src/styles/theme.css` — sidebar styles, login page styles

**Dependencies**
- PHASE-01 (needs font and visual foundation)

**Exit Criteria**
- [ ] Chat page shows collapsible help that auto-expands on first visit
- [ ] Mock chat responds meaningfully to 8+ query patterns
- [ ] Navigation is a vertical sidebar on desktop, collapsible on mobile
- [ ] Login page displays branded TIME JOURNAL design
- [ ] Demo mode bypasses or trivially passes login

**Phase Risks**
- **RISK-04-01:** Sidebar refactor touches the shell component used by all pages — visual regression risk. Mitigation: test all 4 pages after the change.
- **RISK-04-02:** Login routing may conflict with HashRouter. Mitigation: use a simple `isAuthenticated` state guard, same pattern as Streamlit's `st.session_state`.

### PHASE-05 - Deploy & Verify
**Goal**
Ensure all changes build cleanly, deploy to GitHub Pages via the existing workflow, and visually verify parity with Streamlit.

**Tasks**
- [ ] TASK-05-01: Run `npm run build` in `web/` and fix any TypeScript or build errors.
- [ ] TASK-05-02: Run local dev server (`npm run dev`) and manually verify all 4 pages render correctly in demo mode.
- [ ] TASK-05-03: Commit all changes to `master` branch with a descriptive message.
- [ ] TASK-05-04: Push to trigger the `web-deploy.yml` GitHub Action.
- [ ] TASK-05-05: Verify the deployment at `https://tukumalu.github.io/toggl-api/` — check login page, homepage cards, dashboard heatmap and metrics, chat help section, sidebar navigation.
- [ ] TASK-05-06: Side-by-side screenshot comparison of Streamlit vs React on Homepage, Dashboard, and Chat pages.

**Files / Surfaces**
- `web/` — entire web directory
- `.github/workflows/web-deploy.yml` — deployment pipeline (no changes expected)

**Dependencies**
- PHASE-01, PHASE-02, PHASE-03, PHASE-04

**Exit Criteria**
- [ ] `npm run build` exits with code 0
- [ ] GitHub Action completes successfully (green check)
- [ ] Live site at GitHub Pages renders all pages without errors
- [ ] Console shows no errors in demo mode
- [ ] Visual parity confirmed on Homepage, Dashboard, and Chat pages

**Phase Risks**
- **RISK-05-01:** GitHub Pages cache may serve stale assets. Mitigation: Vite adds content hashes to filenames; hard refresh if needed.

## Verification Strategy
- **TEST-001:** `cd web && npm run build` — must exit 0 with no TypeScript errors after each phase
- **TEST-002:** `cd web && npx tsc --noEmit` — type-check without build to catch errors early
- **MANUAL-001:** Open `http://localhost:5173` after each phase and verify the changed pages render correctly
- **MANUAL-002:** After PHASE-05 deploy, open `https://tukumalu.github.io/toggl-api/` and verify all pages
- **MANUAL-003:** Side-by-side comparison of Streamlit (`streamlit run app.py`) and React app on matching pages

## Risks and Alternatives
- **RISK-001:** Mock data dates become stale over time (entries reference specific dates that may be months old). Mitigation: PHASE-02 generates current-week dates dynamically relative to `new Date()`.
- **RISK-002:** Plotly.js bundle size is large (~3MB). Not a new risk — already in the bundle. No action needed.
- **ALT-001:** Could use a static JSON file for mock data instead of inline in `supabase.ts`. Not chosen because the current pattern works, and a separate file adds a fetch step that complicates the mock layer.
- **ALT-002:** Could use Tailwind CSS instead of custom CSS. Not chosen because the project already has a working `theme.css` and adding Tailwind would be a larger refactor than needed.

## Grill Me
1. **Q-001:** Should the React login page enforce a real password in demo mode, or bypass auth entirely?
   - **Recommended default:** Bypass auth in demo mode (no Supabase = no real auth), show login page briefly with auto-redirect
   - **Why this matters:** Affects whether visitors to the GitHub Pages demo see the login branding
   - **If answered differently:** If enforcing a password, need to decide what the demo password is and document it somewhere visible

2. **Q-002:** Should mock data dates be hardcoded or generated relative to today?
   - **Recommended default:** Hybrid — bulk historical data uses fixed dates (2023-2025), but current-week Homepage highlights use dates computed from `new Date()` so the demo always has fresh content
   - **Why this matters:** Hardcoded current-week dates will drift and show "No highlights this week" after a few days
   - **If answered differently:** Fully static dates are simpler but require periodic updates to keep the demo looking active

## Suggested Next Step
Answer the Grill Me questions (or accept the recommended defaults), then begin PHASE-01 implementation. Each phase can be committed and deployed independently.
