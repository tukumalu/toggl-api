import { isRunningInDemoMode as isSupabaseDemoMode, supabase } from './supabase'

export function isRunningInDemoMode(): boolean {
  return isSupabaseDemoMode()
}

export type DateRange = { startDate: string; endDate: string };
export type ViewMode = "single_year" | "all_time" | "custom_range";

export interface OverviewMetrics {
  totalHours: number;
  totalEntries: number;
  uniqueProjects: number;
  activeDays: number;
  avgHoursPerDay: number;
}

export async function fetchOverview(mode: ViewMode, year: number | null, range: DateRange | null): Promise<OverviewMetrics> {
  const { data, error } = await supabase.rpc('get_overview_metrics', {
    view_mode: mode,
    filter_year: year,
    p_start_date: range?.startDate,
    p_end_date: range?.endDate
  })
  if (error) throw error
  if (!data || data.length === 0) return { totalHours: 0, totalEntries: 0, uniqueProjects: 0, activeDays: 0, avgHoursPerDay: 0 }
  const row = data[0]
  return {
    totalHours: row.total_hours,
    totalEntries: row.total_entries,
    uniqueProjects: row.unique_projects,
    activeDays: row.active_days,
    avgHoursPerDay: row.avg_hours_per_day
  }
}

export async function fetchProjectBreakdown(mode: ViewMode, year: number | null, range: DateRange | null): Promise<Array<{ projectName: string; hours: number; entries: number }>> {
  const { data, error } = await supabase.rpc('get_project_breakdown', {
    view_mode: mode,
    filter_year: year,
    p_start_date: range?.startDate,
    p_end_date: range?.endDate
  })
  if (error) throw error
  return data.map((d: any) => ({ projectName: d.project_name, hours: d.hours, entries: d.entries }))
}

export async function fetchTagBreakdown(mode: ViewMode, year: number | null, range: DateRange | null): Promise<Array<{ tagName: string; hours: number; entries: number }>> {
  const { data, error } = await supabase.rpc('get_tag_breakdown', {
    view_mode: mode,
    filter_year: year,
    p_start_date: range?.startDate,
    p_end_date: range?.endDate
  })
  if (error) throw error
  return data.map((d: any) => ({ tagName: d.tag_name, hours: d.hours, entries: d.entries }))
}

export async function fetchClientBreakdown(mode: ViewMode, year: number | null, range: DateRange | null): Promise<Array<{ clientName: string; hours: number; entries: number }>> {
  const { data, error } = await supabase.rpc('get_client_breakdown', {
    view_mode: mode,
    filter_year: year,
    p_start_date: range?.startDate,
    p_end_date: range?.endDate
  })
  if (error) throw error
  return data.map((d: any) => ({ clientName: d.client_name, hours: d.hours, entries: d.entries }))
}

export async function fetchTaskBreakdown(mode: ViewMode, year: number | null, range: DateRange | null): Promise<Array<{ taskName: string; hours: number; entries: number }>> {
  const { data, error } = await supabase.rpc('get_task_breakdown', {
    view_mode: mode,
    filter_year: year,
    p_start_date: range?.startDate,
    p_end_date: range?.endDate
  })
  if (error) throw error
  return data.map((d: any) => ({ taskName: d.task_name, hours: d.hours, entries: d.entries }))
}

export interface OnThisDayEntry {
  start: string
  description: string
  project_name: string
  duration_hours: number
  tags: string[]
}

export interface OnThisDayYear {
  year: number
  hours: number
  entries: number
  details: OnThisDayEntry[]
}

export async function fetchOnThisDay(month: number, day: number): Promise<OnThisDayYear[]> {
  // Query time_entries directly (like Streamlit does) to get full entry details
  const { data, error } = await supabase
    .from('time_entries')
    .select('start,description,project_name,duration_hours,tags,start_year,start_month,start_day')
    .eq('start_month', month)
    .eq('start_day', day)
    .order('start_year', { ascending: false })
    .order('start', { ascending: true })
  if (error) throw error
  if (!data || data.length === 0) return []

  // Group by year client-side
  const byYear: Record<number, { hours: number; count: number; entries: any[] }> = {}
  for (const row of data) {
    const yr = row.start_year
    if (!byYear[yr]) byYear[yr] = { hours: 0, count: 0, entries: [] }
    byYear[yr].hours += row.duration_hours
    byYear[yr].count += 1
    const tags = typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || [])
    byYear[yr].entries.push({
      start: row.start,
      description: row.description || '',
      project_name: row.project_name || '',
      duration_hours: row.duration_hours,
      tags,
    })
  }

  return Object.entries(byYear)
    .map(([year, v]) => ({
      year: parseInt(year),
      hours: v.hours,
      entries: v.count,
      details: v.entries,
    }))
    .sort((a, b) => b.year - a.year)
}

export async function fetchWeekAcrossYears(isoWeek: number): Promise<Array<{ year: number; hours: number; entries: number }>> {
  const { data, error } = await supabase.rpc('get_week_across_years', {
    target_week: isoWeek
  })
  if (error) throw error
  return data.map((d: any) => ({ year: d.year, hours: d.hours, entries: d.entries }))
}

export async function askChat(question: string): Promise<{ answer: string }> {
  const { data, error } = await supabase.functions.invoke('chat-query', {
    body: { question }
  })
  if (error) throw error
  return data as { answer: string }
}

export async function fetchAvailableYears(): Promise<number[]> {
  const { data, error } = await supabase.rpc('get_available_years')
  if (error) throw error
  return data.map((d: any) => d.year)
}

export async function fetchDailyHours(mode: ViewMode, year: number | null, range: DateRange | null): Promise<Array<{ date: string; hours: number; entries: number }>> {
  const { data, error } = await supabase.rpc('get_daily_hours', {
    view_mode: mode,
    filter_year: year,
    p_start_date: range?.startDate,
    p_end_date: range?.endDate
  })
  if (error) throw error
  return data.map((d: any) => ({ date: d.start_date, hours: d.hours, entries: d.entries }))
}

export async function fetchMonthlyHours(mode: ViewMode, year: number | null, range: DateRange | null): Promise<Array<{ month: string; hours: number }>> {
  const { data, error } = await supabase.rpc('get_monthly_hours', {
    view_mode: mode,
    filter_year: year,
    p_start_date: range?.startDate,
    p_end_date: range?.endDate
  })
  if (error) throw error
  return data.map((d: any) => ({ month: d.month, hours: d.hours }))
}

export async function fetchYearComparison(yearA: number, yearB: number): Promise<Array<{ month: string; hoursA: number; hoursB: number }>> {
  const { data, error } = await supabase.rpc('get_year_comparison', {
    year_a: yearA,
    year_b: yearB
  })
  if (error) throw error
  return data.map((d: any) => ({ month: d.month, hoursA: d.hours_a, hoursB: d.hours_b }))
}

export async function fetchTopActivities(mode: ViewMode, year: number | null, range: DateRange | null): Promise<Array<{ description: string; entries: number; totalHours: number; avgHours: number }>> {
  const { data, error } = await supabase.rpc('get_top_activities', {
    view_mode: mode,
    filter_year: year,
    p_start_date: range?.startDate,
    p_end_date: range?.endDate
  })
  if (error) throw error
  return data.map((d: any) => ({ description: d.description, entries: d.entries, totalHours: d.total_hours, avgHours: d.avg_hours }))
}

export async function fetchTopDescriptions(mode: ViewMode, year: number | null, range: DateRange | null, projectName: string, limit?: number): Promise<Array<{ description: string; hours: number; entries: number }>> {
  const { data, error } = await supabase.rpc('get_top_descriptions', {
    view_mode: mode,
    filter_year: year,
    p_start_date: range?.startDate,
    p_end_date: range?.endDate,
    p_project_name: projectName,
    p_limit: limit || 10
  })
  if (error) throw error
  return data.map((d: any) => ({ description: d.description, hours: d.hours, entries: d.entries }))
}
