import type { Session, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const hasValidSupabaseConfig = supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.trim().length > 0 &&
  supabaseAnonKey.trim().length > 0 &&
  isValidUrl(supabaseUrl)

const isDemoMode = !hasValidSupabaseConfig

let createClient: ((url: string, key: string) => SupabaseClient) | null = null

if (!isDemoMode) {
  import('@supabase/supabase-js').then(module => {
    createClient = module.createClient
  })
}

if (isDemoMode) {
  console.log('Running in demo mode - using mock data')
}

type MockEntry = {
  id: number
  description: string
  project_name: string
  client_name: string
  start_date: string
  start: string
  duration_hours: number
  tags: string[]
}

type FilterOperator = 'contains' | 'gte' | 'lte'

type Filter = {
  field: keyof MockEntry
  operator: FilterOperator
  value: string | string[]
}

type OrderSpec = {
  field: keyof MockEntry
  ascending: boolean
} | null

// --- Dynamic current-week entries ---
function getCurrentWeekMonday(): Date {
  const now = new Date()
  const day = now.getDay() === 0 ? 7 : now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day - 1))
  monday.setHours(0, 0, 0, 0)
  return monday
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtISO(d: Date, hour: number): string {
  return `${fmtDate(d)}T${String(hour).padStart(2, '0')}:00:00Z`
}

function buildCurrentWeekHighlights(): MockEntry[] {
  const mon = getCurrentWeekMonday()
  const entries: MockEntry[] = []
  const highlights = [
    { desc: 'Morning meditation & journaling', project: 'Health', dur: 0.75, day: 0, hour: 6, tags: ['Highlight', 'Exercise'] },
    { desc: 'Weekly sprint planning', project: 'Work', dur: 1.5, day: 0, hour: 9, tags: ['Highlight', 'Meeting'] },
    { desc: 'Deep focus: API refactor', project: 'Agentic', dur: 3.0, day: 1, hour: 10, tags: ['Highlight', 'Deep Work'] },
    { desc: 'Book club discussion', project: 'Intellect', dur: 1.0, day: 2, hour: 19, tags: ['Highlight', 'Reading'] },
    { desc: 'Ship dashboard v2', project: 'Work', dur: 2.5, day: 3, hour: 14, tags: ['Highlight', 'Deep Work'] },
    { desc: 'Family dinner prep', project: 'Home', dur: 1.5, day: 4, hour: 17, tags: ['Highlight'] },
  ]
  highlights.forEach((h, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + h.day)
    entries.push({
      id: 900 + i,
      description: h.desc,
      project_name: h.project,
      client_name: '',
      start_date: fmtDate(d),
      start: fmtISO(d, h.hour),
      duration_hours: h.dur,
      tags: h.tags,
    })
  })
  return entries
}

const staticEntries: MockEntry[] = [
  // --- 2023 ---
  { id: 1, description: 'Quarterly OKR planning', project_name: 'Work', client_name: 'Acme Corp', start_date: '2023-01-09', start: '2023-01-09T09:00:00Z', duration_hours: 2.0, tags: ['Meeting'] },
  { id: 2, description: 'React migration spike', project_name: 'Agentic', client_name: '', start_date: '2023-01-12', start: '2023-01-12T10:00:00Z', duration_hours: 4.0, tags: ['Deep Work'] },
  { id: 3, description: 'Gym session — strength', project_name: 'Health', client_name: '', start_date: '2023-01-15', start: '2023-01-15T07:00:00Z', duration_hours: 1.0, tags: ['Exercise'] },
  { id: 4, description: 'Read "Designing Data-Intensive Apps"', project_name: 'Intellect', client_name: '', start_date: '2023-02-03', start: '2023-02-03T20:00:00Z', duration_hours: 1.5, tags: ['Reading'] },
  { id: 5, description: 'Client pitch deck prep', project_name: 'Work', client_name: 'Acme Corp', start_date: '2023-02-14', start: '2023-02-14T13:00:00Z', duration_hours: 3.0, tags: ['Deep Work'] },
  { id: 6, description: 'Grocery run + meal prep', project_name: 'Home', client_name: '', start_date: '2023-02-19', start: '2023-02-19T11:00:00Z', duration_hours: 2.0, tags: ['Admin'] },
  { id: 7, description: 'Sprint retrospective', project_name: 'Work', client_name: 'Acme Corp', start_date: '2023-03-10', start: '2023-03-10T15:00:00Z', duration_hours: 1.0, tags: ['Meeting'] },
  { id: 8, description: 'Side project: CLI tool', project_name: 'Agentic', client_name: '', start_date: '2023-03-18', start: '2023-03-18T09:00:00Z', duration_hours: 3.5, tags: ['Deep Work'] },
  { id: 9, description: 'Yoga class', project_name: 'Health', client_name: '', start_date: '2023-04-02', start: '2023-04-02T07:30:00Z', duration_hours: 1.0, tags: ['Exercise'] },
  { id: 10, description: 'Database schema redesign', project_name: 'Work', client_name: 'Acme Corp', start_date: '2023-04-17', start: '2023-04-17T10:00:00Z', duration_hours: 4.5, tags: ['Deep Work'] },
  { id: 11, description: 'Park run 5K', project_name: 'Health', client_name: '', start_date: '2023-05-06', start: '2023-05-06T06:30:00Z', duration_hours: 0.5, tags: ['Exercise'] },
  { id: 12, description: 'Investor update draft', project_name: 'Work', client_name: 'Acme Corp', start_date: '2023-05-22', start: '2023-05-22T14:00:00Z', duration_hours: 2.5, tags: ['Deep Work', 'Admin'] },
  { id: 13, description: 'Board game night', project_name: 'Leisure', client_name: '', start_date: '2023-06-10', start: '2023-06-10T19:00:00Z', duration_hours: 3.0, tags: ['Highlight'] },
  { id: 14, description: 'API performance tuning', project_name: 'Agentic', client_name: '', start_date: '2023-06-20', start: '2023-06-20T09:00:00Z', duration_hours: 3.0, tags: ['Deep Work'] },
  { id: 15, description: 'Apartment deep clean', project_name: 'Home', client_name: '', start_date: '2023-07-01', start: '2023-07-01T10:00:00Z', duration_hours: 3.0, tags: ['Admin'] },
  { id: 16, description: 'Conference talk prep', project_name: 'Intellect', client_name: '', start_date: '2023-07-15', start: '2023-07-15T14:00:00Z', duration_hours: 2.0, tags: ['Deep Work'] },
  { id: 17, description: 'Team offsite activities', project_name: 'Work', client_name: 'Acme Corp', start_date: '2023-08-05', start: '2023-08-05T09:00:00Z', duration_hours: 6.0, tags: ['Meeting', 'Highlight'] },
  { id: 18, description: 'Hiking trip — Blue Mountain', project_name: 'Leisure', client_name: '', start_date: '2023-08-19', start: '2023-08-19T07:00:00Z', duration_hours: 5.0, tags: ['Exercise', 'Highlight'] },
  { id: 19, description: 'Bug triage & fixes', project_name: 'Work', client_name: 'Acme Corp', start_date: '2023-09-04', start: '2023-09-04T10:00:00Z', duration_hours: 3.0, tags: ['Deep Work'] },
  { id: 20, description: 'Read "Staff Engineer" book', project_name: 'Intellect', client_name: '', start_date: '2023-09-17', start: '2023-09-17T21:00:00Z', duration_hours: 1.5, tags: ['Reading'] },
  { id: 21, description: 'Q3 review presentation', project_name: 'Work', client_name: 'Acme Corp', start_date: '2023-10-02', start: '2023-10-02T14:00:00Z', duration_hours: 2.0, tags: ['Meeting'] },
  { id: 22, description: 'Home automation setup', project_name: 'Home', client_name: '', start_date: '2023-10-14', start: '2023-10-14T15:00:00Z', duration_hours: 2.5, tags: ['Deep Work'] },
  { id: 23, description: 'Personal finance review', project_name: 'Asset', client_name: '', start_date: '2023-11-05', start: '2023-11-05T10:00:00Z', duration_hours: 1.5, tags: ['Admin'] },
  { id: 24, description: 'Thanksgiving dinner prep', project_name: 'Home', client_name: '', start_date: '2023-11-23', start: '2023-11-23T09:00:00Z', duration_hours: 4.0, tags: ['Highlight'] },
  { id: 25, description: 'Year-end planning', project_name: 'Work', client_name: 'Acme Corp', start_date: '2023-12-15', start: '2023-12-15T13:00:00Z', duration_hours: 3.0, tags: ['Meeting', 'Admin'] },

  // --- 2024 ---
  { id: 26, description: 'New year goal setting', project_name: 'Intellect', client_name: '', start_date: '2024-01-02', start: '2024-01-02T09:00:00Z', duration_hours: 2.0, tags: ['Deep Work', 'Highlight'] },
  { id: 27, description: 'Code review marathon', project_name: 'Work', client_name: 'Acme Corp', start_date: '2024-01-08', start: '2024-01-08T10:00:00Z', duration_hours: 3.0, tags: ['Deep Work'] },
  { id: 28, description: 'Morning run — 10K', project_name: 'Health', client_name: '', start_date: '2024-01-14', start: '2024-01-14T06:00:00Z', duration_hours: 1.0, tags: ['Exercise'] },
  { id: 29, description: 'Feature spec writing', project_name: 'Work', client_name: 'Acme Corp', start_date: '2024-01-22', start: '2024-01-22T11:00:00Z', duration_hours: 2.5, tags: ['Deep Work'] },
  { id: 30, description: 'Piano practice', project_name: 'Leisure', client_name: '', start_date: '2024-02-03', start: '2024-02-03T18:00:00Z', duration_hours: 1.0, tags: ['Highlight'] },
  { id: 31, description: 'Valentine cooking class', project_name: 'Leisure', client_name: '', start_date: '2024-02-14', start: '2024-02-14T18:00:00Z', duration_hours: 2.5, tags: ['Highlight'] },
  { id: 32, description: 'Infrastructure migration', project_name: 'Agentic', client_name: '', start_date: '2024-02-26', start: '2024-02-26T09:00:00Z', duration_hours: 5.0, tags: ['Deep Work'] },
  { id: 33, description: 'Team 1:1 sessions', project_name: 'Work', client_name: 'Acme Corp', start_date: '2024-03-04', start: '2024-03-04T10:00:00Z', duration_hours: 2.0, tags: ['Meeting'] },
  { id: 34, description: 'Gym — leg day', project_name: 'Health', client_name: '', start_date: '2024-03-11', start: '2024-03-11T06:30:00Z', duration_hours: 1.0, tags: ['Exercise'] },
  { id: 35, description: 'Tax prep & filing', project_name: 'Asset', client_name: '', start_date: '2024-03-20', start: '2024-03-20T10:00:00Z', duration_hours: 3.0, tags: ['Admin'] },
  { id: 36, description: 'Open source PR reviews', project_name: 'Agentic', client_name: '', start_date: '2024-04-05', start: '2024-04-05T14:00:00Z', duration_hours: 2.0, tags: ['Deep Work'] },
  { id: 37, description: 'Spring garden planting', project_name: 'Home', client_name: '', start_date: '2024-04-13', start: '2024-04-13T09:00:00Z', duration_hours: 3.0, tags: ['Highlight'] },
  { id: 38, description: 'Product launch prep', project_name: 'Work', client_name: 'Acme Corp', start_date: '2024-04-22', start: '2024-04-22T08:00:00Z', duration_hours: 5.0, tags: ['Deep Work', 'Highlight'] },
  { id: 39, description: 'Swimming — 2K meters', project_name: 'Health', client_name: '', start_date: '2024-05-06', start: '2024-05-06T07:00:00Z', duration_hours: 1.0, tags: ['Exercise'] },
  { id: 40, description: 'Podcast recording', project_name: 'Intellect', client_name: '', start_date: '2024-05-15', start: '2024-05-15T16:00:00Z', duration_hours: 1.5, tags: ['Deep Work'] },
  { id: 41, description: 'Weekend camping trip', project_name: 'Leisure', client_name: '', start_date: '2024-05-25', start: '2024-05-25T08:00:00Z', duration_hours: 8.0, tags: ['Highlight'] },
  { id: 42, description: 'Quarterly roadmap review', project_name: 'Work', client_name: 'Acme Corp', start_date: '2024-06-03', start: '2024-06-03T13:00:00Z', duration_hours: 2.0, tags: ['Meeting'] },
  { id: 43, description: 'ML experiment — embeddings', project_name: 'Agentic', client_name: '', start_date: '2024-06-12', start: '2024-06-12T10:00:00Z', duration_hours: 4.0, tags: ['Deep Work'] },
  { id: 44, description: 'Bike maintenance', project_name: 'Home', client_name: '', start_date: '2024-06-22', start: '2024-06-22T15:00:00Z', duration_hours: 1.0, tags: ['Admin'] },
  { id: 45, description: 'Design system overhaul', project_name: 'Work', client_name: 'Acme Corp', start_date: '2024-07-08', start: '2024-07-08T09:00:00Z', duration_hours: 4.0, tags: ['Deep Work'] },
  { id: 46, description: 'Beach volleyball', project_name: 'Leisure', client_name: '', start_date: '2024-07-20', start: '2024-07-20T17:00:00Z', duration_hours: 2.0, tags: ['Exercise'] },
  { id: 47, description: 'Investment portfolio rebalance', project_name: 'Asset', client_name: '', start_date: '2024-08-01', start: '2024-08-01T10:00:00Z', duration_hours: 1.5, tags: ['Admin'] },
  { id: 48, description: 'Conference attendance — ReactConf', project_name: 'Intellect', client_name: '', start_date: '2024-08-14', start: '2024-08-14T09:00:00Z', duration_hours: 7.0, tags: ['Meeting', 'Highlight'] },
  { id: 49, description: 'Refactor auth module', project_name: 'Work', client_name: 'Acme Corp', start_date: '2024-09-02', start: '2024-09-02T10:00:00Z', duration_hours: 3.5, tags: ['Deep Work'] },
  { id: 50, description: 'Family reunion organizing', project_name: 'Kin', client_name: '', start_date: '2024-09-14', start: '2024-09-14T11:00:00Z', duration_hours: 2.0, tags: ['Admin', 'Highlight'] },
  { id: 51, description: 'Half-marathon training', project_name: 'Health', client_name: '', start_date: '2024-09-22', start: '2024-09-22T06:00:00Z', duration_hours: 1.5, tags: ['Exercise'] },
  { id: 52, description: 'Halloween costume crafting', project_name: 'Leisure', client_name: '', start_date: '2024-10-26', start: '2024-10-26T14:00:00Z', duration_hours: 2.5, tags: ['Highlight'] },
  { id: 53, description: 'Performance review writing', project_name: 'Work', client_name: 'Acme Corp', start_date: '2024-10-30', start: '2024-10-30T13:00:00Z', duration_hours: 2.0, tags: ['Admin'] },
  { id: 54, description: 'Advent of Code — day 1-5', project_name: 'Intellect', client_name: '', start_date: '2024-12-05', start: '2024-12-05T20:00:00Z', duration_hours: 3.0, tags: ['Deep Work'] },
  { id: 55, description: 'Holiday gift shopping', project_name: 'Kin', client_name: '', start_date: '2024-12-15', start: '2024-12-15T12:00:00Z', duration_hours: 2.0, tags: ['Admin'] },

  // --- 2025 ---
  { id: 56, description: 'Annual review & goals', project_name: 'Work', client_name: 'Acme Corp', start_date: '2025-01-06', start: '2025-01-06T09:00:00Z', duration_hours: 3.0, tags: ['Meeting', 'Highlight'] },
  { id: 57, description: 'New framework evaluation', project_name: 'Agentic', client_name: '', start_date: '2025-01-15', start: '2025-01-15T10:00:00Z', duration_hours: 4.0, tags: ['Deep Work'] },
  { id: 58, description: 'Gym — upper body', project_name: 'Health', client_name: '', start_date: '2025-01-20', start: '2025-01-20T06:30:00Z', duration_hours: 1.0, tags: ['Exercise'] },
  { id: 59, description: 'Budget planning 2025', project_name: 'Asset', client_name: '', start_date: '2025-02-01', start: '2025-02-01T10:00:00Z', duration_hours: 2.0, tags: ['Admin'] },
  { id: 60, description: 'Pair programming session', project_name: 'Work', client_name: 'Acme Corp', start_date: '2025-02-10', start: '2025-02-10T14:00:00Z', duration_hours: 3.0, tags: ['Deep Work'] },
  { id: 61, description: 'Read "The Pragmatic Programmer"', project_name: 'Intellect', client_name: '', start_date: '2025-02-22', start: '2025-02-22T21:00:00Z', duration_hours: 1.5, tags: ['Reading'] },
  { id: 62, description: 'Kitchen renovation planning', project_name: 'Home', client_name: '', start_date: '2025-03-08', start: '2025-03-08T10:00:00Z', duration_hours: 2.0, tags: ['Admin'] },
  { id: 63, description: 'Deploy new CI pipeline', project_name: 'Agentic', client_name: '', start_date: '2025-03-17', start: '2025-03-17T09:00:00Z', duration_hours: 3.5, tags: ['Deep Work', 'Highlight'] },
  { id: 64, description: 'Trail running — 15K', project_name: 'Health', client_name: '', start_date: '2025-04-05', start: '2025-04-05T07:00:00Z', duration_hours: 1.5, tags: ['Exercise', 'Highlight'] },
  { id: 65, description: 'Product demo to stakeholders', project_name: 'Work', client_name: 'Acme Corp', start_date: '2025-04-14', start: '2025-04-14T15:00:00Z', duration_hours: 1.5, tags: ['Meeting'] },
  { id: 66, description: 'Weekend woodworking', project_name: 'Leisure', client_name: '', start_date: '2025-04-26', start: '2025-04-26T10:00:00Z', duration_hours: 4.0, tags: ['Highlight'] },
  { id: 67, description: 'Mentorship session', project_name: 'Work', client_name: 'Acme Corp', start_date: '2025-05-05', start: '2025-05-05T11:00:00Z', duration_hours: 1.0, tags: ['Meeting'] },
  { id: 68, description: 'Garden maintenance', project_name: 'Home', client_name: '', start_date: '2025-05-11', start: '2025-05-11T09:00:00Z', duration_hours: 2.0, tags: ['Admin'] },

  // --- 2026 ---
  { id: 69, description: 'Q1 kickoff meeting', project_name: 'Work', client_name: 'Acme Corp', start_date: '2026-01-05', start: '2026-01-05T09:00:00Z', duration_hours: 2.5, tags: ['Meeting'] },
  { id: 70, description: 'Build Toggl dashboard v1', project_name: 'Agentic', client_name: '', start_date: '2026-01-12', start: '2026-01-12T10:00:00Z', duration_hours: 5.0, tags: ['Deep Work', 'Highlight'] },
  { id: 71, description: 'Morning swim', project_name: 'Health', client_name: '', start_date: '2026-01-18', start: '2026-01-18T06:00:00Z', duration_hours: 1.0, tags: ['Exercise'] },
  { id: 72, description: 'Tax document gathering', project_name: 'Asset', client_name: '', start_date: '2026-02-01', start: '2026-02-01T10:00:00Z', duration_hours: 1.5, tags: ['Admin'] },
  { id: 73, description: 'Architecture review', project_name: 'Work', client_name: 'Acme Corp', start_date: '2026-02-10', start: '2026-02-10T14:00:00Z', duration_hours: 2.0, tags: ['Meeting'] },
  { id: 74, description: 'Read ML papers', project_name: 'Intellect', client_name: '', start_date: '2026-02-22', start: '2026-02-22T20:00:00Z', duration_hours: 2.0, tags: ['Reading'] },
  { id: 75, description: 'Deploy dashboard to GH Pages', project_name: 'Agentic', client_name: '', start_date: '2026-03-01', start: '2026-03-01T09:00:00Z', duration_hours: 3.0, tags: ['Deep Work'] },
  { id: 76, description: 'Weekly wins roundup', project_name: 'Work', client_name: 'Acme Corp', start_date: '2026-03-10', start: '2026-03-10T16:00:00Z', duration_hours: 1.0, tags: ['Meeting'] },
  { id: 77, description: 'Interval training', project_name: 'Health', client_name: '', start_date: '2026-03-15', start: '2026-03-15T06:30:00Z', duration_hours: 0.75, tags: ['Exercise'] },
  { id: 78, description: 'Movie night — sci-fi marathon', project_name: 'Leisure', client_name: '', start_date: '2026-03-22', start: '2026-03-22T19:00:00Z', duration_hours: 4.0, tags: ['Highlight'] },
  { id: 79, description: 'Ship review notes', project_name: 'Work', client_name: 'Acme Corp', start_date: '2026-03-24', start: '2026-03-24T14:00:00Z', duration_hours: 1.0, tags: ['Deep Work'] },
  { id: 80, description: 'Call with family', project_name: 'Kin', client_name: '', start_date: '2026-04-06', start: '2026-04-06T18:00:00Z', duration_hours: 1.0, tags: ['Highlight'] },
  { id: 81, description: 'Sprint demo', project_name: 'Work', client_name: 'Acme Corp', start_date: '2026-04-14', start: '2026-04-14T15:00:00Z', duration_hours: 1.0, tags: ['Meeting'] },
  { id: 82, description: 'Supabase edge functions', project_name: 'Agentic', client_name: '', start_date: '2026-04-20', start: '2026-04-20T10:00:00Z', duration_hours: 3.5, tags: ['Deep Work'] },
  { id: 83, description: 'Cycling — 30K ride', project_name: 'Health', client_name: '', start_date: '2026-05-03', start: '2026-05-03T07:00:00Z', duration_hours: 1.5, tags: ['Exercise'] },
  { id: 84, description: 'Dashboard feature parity push', project_name: 'Agentic', client_name: '', start_date: '2026-05-10', start: '2026-05-10T09:00:00Z', duration_hours: 4.0, tags: ['Deep Work', 'Highlight'] },
  { id: 85, description: 'Apartment spring cleaning', project_name: 'Home', client_name: '', start_date: '2026-05-11', start: '2026-05-11T10:00:00Z', duration_hours: 3.0, tags: ['Admin'] },
]

const mockEntries: MockEntry[] = [...staticEntries, ...buildCurrentWeekHighlights()]

function filterByYear(entries: MockEntry[], year: number) {
  return entries.filter((entry) => entry.start.startsWith(String(year)))
}

function applyFilters(entries: MockEntry[], filters: Filter[]) {
  return filters.reduce((result, filter) => {
    return result.filter((entry) => {
      const candidate = entry[filter.field]

      if (filter.operator === 'contains') {
        if (!Array.isArray(candidate) || !Array.isArray(filter.value)) {
          return false
        }

        return filter.value.every((value) => candidate.includes(value))
      }

      if (typeof candidate !== 'string' || Array.isArray(filter.value)) {
        return false
      }

      if (filter.operator === 'gte') {
        return candidate >= filter.value
      }

      return candidate <= filter.value
    })
  }, entries)
}

function applyOrder(entries: MockEntry[], orderSpec: OrderSpec) {
  if (!orderSpec) {
    return entries
  }

  const direction = orderSpec.ascending ? 1 : -1

  return [...entries].sort((left, right) => {
    const leftValue = left[orderSpec.field]
    const rightValue = right[orderSpec.field]

    if (leftValue < rightValue) {
      return -1 * direction
    }

    if (leftValue > rightValue) {
      return 1 * direction
    }

    return 0
  })
}

function resolveMockRows(filters: Filter[], orderSpec: OrderSpec) {
  return applyOrder(applyFilters(mockEntries, filters), orderSpec)
}

function createMockQuery(filters: Filter[] = [], orderSpec: OrderSpec = null) {
  const baseQuery = {
    contains: (field: keyof MockEntry, value: string[]) => createMockQuery([...filters, { field, operator: 'contains', value }], orderSpec),
    gte: (field: keyof MockEntry, value: string) => createMockQuery([...filters, { field, operator: 'gte', value }], orderSpec),
    lte: (field: keyof MockEntry, value: string) => createMockQuery([...filters, { field, operator: 'lte', value }], orderSpec),
    order: (field: keyof MockEntry, options?: { ascending?: boolean }) => createMockQuery(filters, {
      field,
      ascending: options?.ascending ?? true
    }),
    then: (resolve: (value: { data: MockEntry[]; error: null }) => void, _reject?: (error: any) => void) => {
      return Promise.resolve({
        data: resolveMockRows(filters, orderSpec),
        error: null
      }).then(resolve)
    }
  }
  return baseQuery
}

let client: SupabaseClient | null = null

async function initClient() {
  if (!isDemoMode && createClient) {
    client = createClient(supabaseUrl, supabaseAnonKey)
  }
}

initClient()

export const supabase = {
  from: (table: string) => {
    if (isDemoMode || !client) {
      return {
        select: (_columns?: string) => createMockQuery()
      }
    }

    return client.from(table)
  },
  rpc: (fn: string, params: any) => {
    if (isDemoMode || !client) {
      return {
        then: (resolve: (value: { data: any[]; error: null }) => void) => {
          let data: any[] = []

          if (fn === 'get_overview_metrics') {
            const entries = params.filter_year
              ? filterByYear(mockEntries, params.filter_year)
              : mockEntries
            const uniqueDates = [...new Set(entries.map((entry) => entry.start_date))]
            data = [{
              total_hours: entries.reduce((sum, entry) => sum + entry.duration_hours, 0),
              total_entries: entries.length,
              unique_projects: [...new Set(entries.map((entry) => entry.project_name))].length,
              active_days: uniqueDates.length,
              avg_hours_per_day: entries.reduce((sum, entry) => sum + entry.duration_hours, 0) / Math.max(uniqueDates.length, 1)
            }]
          } else if (fn === 'get_project_breakdown') {
            const entries = params.filter_year
              ? filterByYear(mockEntries, params.filter_year)
              : mockEntries
            const grouped: Record<string, { hours: number; entriesCount: number }> = {}
            for (const entry of entries) {
              const key = entry.project_name || 'No Project'
              if (!grouped[key]) {
                grouped[key] = { hours: 0, entriesCount: 0 }
              }
              grouped[key].hours += entry.duration_hours
              grouped[key].entriesCount += 1
            }
            data = Object.entries(grouped)
              .map(([project_name, value]) => ({ project_name, hours: value.hours, entries: value.entriesCount }))
              .sort((left, right) => right.hours - left.hours)
          } else if (fn === 'get_tag_breakdown') {
            const entries = params.filter_year
              ? filterByYear(mockEntries, params.filter_year)
              : mockEntries
            const grouped: Record<string, { hours: number; entriesCount: number }> = {}
            for (const entry of entries) {
              for (const tag of entry.tags || []) {
                if (!grouped[tag]) {
                  grouped[tag] = { hours: 0, entriesCount: 0 }
                }
                grouped[tag].hours += entry.duration_hours
                grouped[tag].entriesCount += 1
              }
            }
            data = Object.entries(grouped)
              .map(([tag_name, value]) => ({ tag_name, hours: value.hours, entries: value.entriesCount }))
              .sort((left, right) => right.hours - left.hours)
          } else if (fn === 'get_on_this_day') {
            const month = params.target_month
            const day = params.target_day
            const monthStr = String(month).padStart(2, '0')
            const dayStr = String(day).padStart(2, '0')
            const matching = mockEntries.filter(e => e.start_date.substring(5) === `${monthStr}-${dayStr}`)
            const byYear: Record<number, { hours: number; count: number }> = {}
            for (const e of matching) {
              const yr = parseInt(e.start_date.substring(0, 4))
              if (!byYear[yr]) byYear[yr] = { hours: 0, count: 0 }
              byYear[yr].hours += e.duration_hours
              byYear[yr].count += 1
            }
            data = Object.entries(byYear).map(([year, v]) => ({ year: parseInt(year), hours: v.hours, entries: v.count }))
          } else if (fn === 'get_available_years') {
            const years = [...new Set(mockEntries.map(e => parseInt(e.start_date.substring(0, 4))))].sort((a, b) => b - a)
            data = years.map(year => ({ year }))
          } else if (fn === 'get_daily_hours') {
            const entries = params.filter_year
              ? filterByYear(mockEntries, params.filter_year)
              : mockEntries
            const grouped: Record<string, { hours: number; entriesCount: number }> = {}
            for (const entry of entries) {
              const key = entry.start_date
              if (!grouped[key]) {
                grouped[key] = { hours: 0, entriesCount: 0 }
              }
              grouped[key].hours += entry.duration_hours
              grouped[key].entriesCount += 1
            }
            data = Object.entries(grouped)
              .map(([start_date, value]) => ({ start_date, hours: value.hours, entries: value.entriesCount }))
              .sort((a, b) => a.start_date.localeCompare(b.start_date))
          } else if (fn === 'get_monthly_hours') {
            const entries = params.filter_year
              ? filterByYear(mockEntries, params.filter_year)
              : mockEntries
            const grouped: Record<string, number> = {}
            for (const entry of entries) {
              const month = entry.start_date.substring(0, 7)
              grouped[month] = (grouped[month] || 0) + entry.duration_hours
            }
            data = Object.entries(grouped)
              .map(([month, hours]) => ({ month, hours }))
              .sort((a, b) => a.month.localeCompare(b.month))
          } else if (fn === 'get_year_comparison') {
            const yearA = params.year_a
            const yearB = params.year_b
            const entriesA = filterByYear(mockEntries, yearA)
            const entriesB = filterByYear(mockEntries, yearB)
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            data = months.map((month, idx) => {
              const monthNum = String(idx + 1).padStart(2, '0')
              const hoursA = entriesA
                .filter(e => e.start_date.startsWith(`${yearA}-${monthNum}`))
                .reduce((sum, e) => sum + e.duration_hours, 0)
              const hoursB = entriesB
                .filter(e => e.start_date.startsWith(`${yearB}-${monthNum}`))
                .reduce((sum, e) => sum + e.duration_hours, 0)
              return { month, hours_a: hoursA, hours_b: hoursB }
            })
          } else if (fn === 'get_week_across_years') {
            const targetWeek = params.target_week
            const byYear: Record<number, { hours: number; count: number }> = {}
            for (const e of mockEntries) {
              const d = new Date(e.start_date + 'T00:00:00')
              const jan4 = new Date(d.getFullYear(), 0, 4)
              const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + 1
              const wk = Math.ceil((dayOfYear + jan4.getDay()) / 7)
              if (Math.abs(wk - targetWeek) <= 1) {
                const yr = d.getFullYear()
                if (!byYear[yr]) byYear[yr] = { hours: 0, count: 0 }
                byYear[yr].hours += e.duration_hours
                byYear[yr].count += 1
              }
            }
            data = Object.entries(byYear).map(([year, v]) => ({ year: parseInt(year), hours: v.hours, entries: v.count })).sort((a, b) => b.year - a.year)
          } else if (fn === 'get_top_descriptions') {
            const entries = params.filter_year
              ? filterByYear(mockEntries, params.filter_year)
              : mockEntries
            const projectEntries = entries.filter(e => e.project_name === params.p_project_name)
            const grouped: Record<string, { hours: number; entriesCount: number }> = {}
            for (const entry of projectEntries) {
              const key = entry.description || 'No description'
              if (!grouped[key]) {
                grouped[key] = { hours: 0, entriesCount: 0 }
              }
              grouped[key].hours += entry.duration_hours
              grouped[key].entriesCount += 1
            }
            const limit = params.p_limit || 10
            data = Object.entries(grouped)
              .map(([description, value]) => ({ description, hours: value.hours, entries: value.entriesCount }))
              .sort((a, b) => b.hours - a.hours)
              .slice(0, limit)
          } else if (fn === 'get_client_breakdown') {
            const entries = params.filter_year
              ? filterByYear(mockEntries, params.filter_year)
              : mockEntries
            const grouped: Record<string, { hours: number; entriesCount: number }> = {}
            for (const entry of entries) {
              const key = entry.client_name || 'No Client'
              if (!grouped[key]) {
                grouped[key] = { hours: 0, entriesCount: 0 }
              }
              grouped[key].hours += entry.duration_hours
              grouped[key].entriesCount += 1
            }
            data = Object.entries(grouped)
              .map(([client_name, value]) => ({ client_name, hours: value.hours, entries: value.entriesCount }))
              .sort((a, b) => b.hours - a.hours)
          } else if (fn === 'get_task_breakdown') {
            const entries = params.filter_year
              ? filterByYear(mockEntries, params.filter_year)
              : mockEntries
            const grouped: Record<string, { hours: number; entriesCount: number }> = {}
            for (const entry of entries) {
              if (entry.description) {
                const key = entry.description
                if (!grouped[key]) grouped[key] = { hours: 0, entriesCount: 0 }
                grouped[key].hours += entry.duration_hours
                grouped[key].entriesCount += 1
              }
            }
            data = Object.entries(grouped)
              .map(([task_name, value]) => ({ task_name, hours: value.hours, entries: value.entriesCount }))
              .sort((a, b) => b.hours - a.hours)
              .slice(0, 20)
          } else if (fn === 'get_top_activities') {
            const entries = params.filter_year
              ? filterByYear(mockEntries, params.filter_year)
              : mockEntries
            const grouped: Record<string, { hours: number; entriesCount: number }> = {}
            for (const entry of entries) {
              if (entry.description) {
                const key = entry.description
                if (!grouped[key]) grouped[key] = { hours: 0, entriesCount: 0 }
                grouped[key].hours += entry.duration_hours
                grouped[key].entriesCount += 1
              }
            }
            data = Object.entries(grouped)
              .map(([description, value]) => ({
                description,
                total_hours: value.hours,
                entries: value.entriesCount,
                avg_hours: value.hours / value.entriesCount
              }))
              .sort((a, b) => b.total_hours - a.total_hours)
              .slice(0, 30)
          }

          return Promise.resolve(resolve({ data, error: null }))
        }
      }
    }

    return client!.rpc(fn, params)
  },
  functions: {
    invoke: (_fn: string, options: any) => {
      if (isDemoMode || !client) {
        return {
          then: (resolve: (value: { data: { answer: string }; error: null }) => void) => {
            const question = options.body?.question?.toLowerCase() || ''
            let answer = ''

            if (question.includes('top projects') || question.includes('top project')) {
              const grouped: Record<string, number> = {}
              for (const e of mockEntries) {
                grouped[e.project_name] = (grouped[e.project_name] || 0) + e.duration_hours
              }
              const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1])
              answer = '**Top Projects (All Time)**\n\n' + sorted.map(([name, hours], i) => `${i + 1}. **${name}** — ${hours.toFixed(1)}h`).join('\n')
            } else if (question.includes('top tags') || question.includes('top tag')) {
              const grouped: Record<string, number> = {}
              for (const e of mockEntries) {
                for (const t of e.tags) {
                  grouped[t] = (grouped[t] || 0) + e.duration_hours
                }
              }
              const sorted = Object.entries(grouped).sort((a, b) => b[1] - a[1])
              answer = '**Top Tags (All Time)**\n\n' + sorted.map(([name, hours], i) => `${i + 1}. **${name}** — ${hours.toFixed(1)}h`).join('\n')
            } else if (question.includes('today') || question.includes('this day')) {
              const now = new Date()
              const monthDay = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
              const matching = mockEntries.filter(e => e.start_date.substring(5) === monthDay)
              if (matching.length > 0) {
                const total = matching.reduce((s, e) => s + e.duration_hours, 0)
                answer = `**On This Day (${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })})**\n\nAcross all years, you tracked **${total.toFixed(1)}h** in ${matching.length} entries on this date.`
              } else {
                answer = `No entries found for ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} in any year.`
              }
            } else if (question.includes('this week')) {
              const mon = getCurrentWeekMonday()
              const sun = new Date(mon)
              sun.setDate(mon.getDate() + 6)
              const monStr = fmtDate(mon)
              const sunStr = fmtDate(sun)
              const weekEntries = mockEntries.filter(e => e.start_date >= monStr && e.start_date <= sunStr)
              const total = weekEntries.reduce((s, e) => s + e.duration_hours, 0)
              answer = `**This Week** (${mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})\n\n**${total.toFixed(1)}h** across ${weekEntries.length} entries.\n\n` +
                weekEntries.map(e => `- ${e.description} (${e.project_name}, ${e.duration_hours.toFixed(1)}h)`).join('\n')
            } else if (question.includes('yesterday')) {
              const yesterday = new Date()
              yesterday.setDate(yesterday.getDate() - 1)
              const yStr = fmtDate(yesterday)
              const yEntries = mockEntries.filter(e => e.start_date === yStr)
              if (yEntries.length > 0) {
                const total = yEntries.reduce((s, e) => s + e.duration_hours, 0)
                answer = `**Yesterday** (${yesterday.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })})\n\n**${total.toFixed(1)}h** across ${yEntries.length} entries.\n\n` +
                  yEntries.map(e => `- ${e.description} (${e.project_name}, ${e.duration_hours.toFixed(1)}h)`).join('\n')
              } else {
                answer = `No entries found for yesterday (${yesterday.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}).`
              }
            } else if (question.includes('total') || question.includes('all time') || question.includes('stats')) {
              const total = mockEntries.reduce((s, e) => s + e.duration_hours, 0)
              const projects = [...new Set(mockEntries.map(e => e.project_name))]
              const days = [...new Set(mockEntries.map(e => e.start_date))]
              answer = `**All-Time Stats**\n\n- **Total hours:** ${total.toFixed(1)}h\n- **Total entries:** ${mockEntries.length}\n- **Projects:** ${projects.length}\n- **Active days:** ${days.length}\n- **Avg hours/day:** ${(total / days.length).toFixed(1)}h`
            } else if (question.includes('compare')) {
              answer = 'To compare years, try asking "Compare 2023 and 2024" or visit the Retrospect page for year-over-year analysis.'
            } else if (question.includes('search')) {
              const searchTerm = question.replace('search', '').trim()
              const matches = mockEntries.filter(e => e.description.toLowerCase().includes(searchTerm))
              if (matches.length > 0) {
                const total = matches.reduce((s, e) => s + e.duration_hours, 0)
                answer = `**Search: "${searchTerm}"**\n\nFound ${matches.length} entries totaling **${total.toFixed(1)}h**.\n\n` +
                  matches.slice(0, 10).map(e => `- ${e.start_date}: ${e.description} (${e.project_name}, ${e.duration_hours.toFixed(1)}h)`).join('\n')
              } else {
                answer = `No entries found matching "${searchTerm}".`
              }
            } else {
              const projectMatch = mockEntries.find(e => question.includes(e.project_name.toLowerCase()))
              if (projectMatch) {
                const projEntries = mockEntries.filter(e => e.project_name === projectMatch.project_name)
                const total = projEntries.reduce((s, e) => s + e.duration_hours, 0)
                answer = `**${projectMatch.project_name}**\n\n**${total.toFixed(1)}h** across ${projEntries.length} entries.\n\nRecent:\n` +
                  projEntries.slice(-5).map(e => `- ${e.start_date}: ${e.description} (${e.duration_hours.toFixed(1)}h)`).join('\n')
              } else {
                answer = `You asked: "${options.body?.question}"\n\nTry asking about:\n- **Time periods:** "this week", "yesterday", "today in history"\n- **Projects:** "Work", "Health", "Agentic"\n- **Analysis:** "top projects", "top tags", "total stats"\n- **Search:** "search meditation"`
              }
            }

            return Promise.resolve(resolve({ data: { answer }, error: null }))
          }
        }
      }

      return client!.functions.invoke(_fn, options)
    }
  },
  auth: {
    getSession: () => ({ data: { session: null }, error: null }),
    getUser: () => ({ data: { user: null }, error: null }),
    signInWithPassword: (_credentials?: { email: string; password: string }) => ({ data: { user: null, session: null }, error: null }),
    signOut: () => ({ error: null }),
    onAuthStateChange: (_callback: (event: string, session: Session | null) => void) => ({
      data: {
        subscription: {
          unsubscribe: () => undefined
        }
      }
    })
  }
} as any

export function isRunningInDemoMode(): boolean {
  return isDemoMode
}
