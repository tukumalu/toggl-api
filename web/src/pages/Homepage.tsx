import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getProjectColor } from '../lib/colors'
import LoadingSpinner from '../components/LoadingSpinner'

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDayHeader(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDuration(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`
  }
  return `${hours.toFixed(1)}h`
}

function getCurrentIsoWeekRange() {
  const now = new Date()
  const weekday = now.getDay() === 0 ? 7 : now.getDay()
  const mondayDate = new Date(now)
  mondayDate.setDate(now.getDate() - (weekday - 1))
  const sundayDate = new Date(mondayDate)
  sundayDate.setDate(mondayDate.getDate() + 6)

  const thursday = new Date(now)
  thursday.setDate(now.getDate() + (4 - weekday))
  const yearStart = new Date(thursday.getFullYear(), 0, 1)
  const isoWeek = Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)

  return {
    monday: formatLocalDate(mondayDate),
    sunday: formatLocalDate(sundayDate),
    isoWeek,
    mondayDisplay: mondayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sundayDisplay: sundayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  }
}

export default function Homepage() {
  const [highlights, setHighlights] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [weekInfo, setWeekInfo] = useState<{ isoWeek: number; mondayDisplay: string; sundayDisplay: string } | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { monday, sunday, isoWeek, mondayDisplay, sundayDisplay } = getCurrentIsoWeekRange()
      setWeekInfo({ isoWeek, mondayDisplay, sundayDisplay })

      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .contains('tags', ['Highlight'])
        .gte('start_date', monday)
        .lte('start_date', sunday)
        .order('start', { ascending: true })

      if (error) {
        setErrorMessage(error.message)
        setHighlights([])
      } else if (data) {
        setHighlights(data)
      }
      setLoading(false)
    }
    load()
  }, [])

  const groupedByDay: Record<string, any[]> = {}
  for (const h of highlights) {
    const key = h.start_date
    if (!groupedByDay[key]) groupedByDay[key] = []
    groupedByDay[key].push(h)
  }
  const sortedDays = Object.keys(groupedByDay).sort()

  return (
    <div>
      <h1>This Week's Highlights</h1>

      {weekInfo && (
        <p className="week-range">
          Week <span>{weekInfo.isoWeek}</span> &mdash; {weekInfo.mondayDisplay} to {weekInfo.sundayDisplay}
        </p>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : errorMessage ? (
        <p className="error-text">{errorMessage}</p>
      ) : highlights.length === 0 ? (
        <p className="empty-state">No highlights logged this week yet.</p>
      ) : (
        <div>
          {sortedDays.map(day => (
            <div key={day}>
              <h4 className="day-header">{formatDayHeader(day)}</h4>
              {groupedByDay[day].map((h: any) => {
                const accent = getProjectColor(h.project_name || '')
                const time = formatTime(h.start)
                const dur = formatDuration(h.duration_hours)
                const project = h.project_name || ''
                const metaParts = [project, dur, time].filter(Boolean)

                return (
                  <div
                    key={h.id}
                    className="highlight-card"
                    style={{ borderLeft: `3px solid ${accent}` }}
                  >
                    <div className="card-description">
                      {h.description || '(no description)'}
                    </div>
                    <div className="card-meta">
                      {metaParts.join('  ·  ')}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
