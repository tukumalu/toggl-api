export const PROJECT_COLORS: Record<string, string> = {
  'Work': '#bc13fe',
  'Home': '#00fff9',
  'Health': '#ffd700',
  'Leisure': '#39ff14',
  'Agentic': '#ff9800',
  'Intellect': '#00b4d8',
  'Asset': '#e040fb',
  'Kin': '#ff2079',
  'Prenatal': '#ff00ff',
  'Postnatal': '#ff00ff',
  'Project Alpha': '#00fff9',
  'Project Beta': '#ff00ff',
  'Project Gamma': '#39ff14',
}

export const DEFAULT_ACCENT = '#00fff9'

export function getProjectColor(projectName: string): string {
  return PROJECT_COLORS[projectName] || DEFAULT_ACCENT
}

export const METRIC_COLORS = {
  totalHours: '#00fff9',
  entries: '#ff00ff',
  projects: '#39ff14',
  activeDays: '#bc13fe',
  avgHoursPerDay: '#ffd700',
}
