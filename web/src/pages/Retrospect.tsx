import { useEffect, useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import {
  fetchOnThisDay,
  fetchWeekAcrossYears,
  fetchYearComparison,
  fetchAvailableYears,
  type OnThisDayYear,
} from '../lib/api'
import { getProjectColor, METRIC_COLORS } from '../lib/colors'
import MetricCard from '../components/MetricCard'
import LoadingSpinner from '../components/LoadingSpinner'
import NeonBarChart from '../components/Charts/NeonBarChart'
import NeonLineChart from '../components/Charts/NeonLineChart'

type TabType = 'on-this-day' | 'week-view' | 'year-comparison'

function getCurrentIsoWeek(): number {
  const now = new Date()
  const thursday = new Date(now)
  thursday.setDate(now.getDate() + (4 - (now.getDay() === 0 ? 7 : now.getDay())))
  const yearStart = new Date(thursday.getFullYear(), 0, 1)
  return Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function formatTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function Retrospect() {
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('on-this-day')

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [history, setHistory] = useState<OnThisDayYear[]>([])
  const [expandedYear, setExpandedYear] = useState<number | null>(null)

  const [isoWeek, setIsoWeek] = useState<number>(getCurrentIsoWeek())
  const [weekData, setWeekData] = useState<any[]>([])

  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [yearA, setYearA] = useState<number>(new Date().getFullYear())
  const [yearB, setYearB] = useState<number>(new Date().getFullYear() - 1)
  const [comparisonData, setComparisonData] = useState<any[]>([])

  useEffect(() => {
    async function loadYears() {
      try {
        const years = await fetchAvailableYears()
        setAvailableYears(years)
        if (years.length >= 2) {
          setYearA(years[0])
          setYearB(years[1])
        }
      } catch {
        setAvailableYears([2026, 2025, 2024, 2023])
      }
    }
    void loadYears()
  }, [])

  useEffect(() => {
    async function loadOnThisDay() {
      setLoading(true)
      try {
        setErrorMessage('')
        const data = await fetchOnThisDay(selectedDate.getMonth() + 1, selectedDate.getDate())
        setHistory(data)
        if (data.length > 0) {
          setExpandedYear(data[0].year)
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load data.')
      } finally {
        setLoading(false)
      }
    }
    if (activeTab === 'on-this-day') {
      void loadOnThisDay()
    }
  }, [activeTab, selectedDate])

  useEffect(() => {
    async function loadWeekView() {
      setLoading(true)
      try {
        setErrorMessage('')
        const data = await fetchWeekAcrossYears(isoWeek)
        setWeekData(data)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load data.')
      } finally {
        setLoading(false)
      }
    }
    if (activeTab === 'week-view') {
      void loadWeekView()
    }
  }, [activeTab, isoWeek])

  useEffect(() => {
    async function loadYearComparison() {
      setLoading(true)
      try {
        setErrorMessage('')
        const data = await fetchYearComparison(yearA, yearB)
        setComparisonData(data)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load data.')
      } finally {
        setLoading(false)
      }
    }
    if (activeTab === 'year-comparison') {
      void loadYearComparison()
    }
  }, [activeTab, yearA, yearB])

  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  }

  const totalHistoryHours = history.reduce((s, h) => s + h.hours, 0)
  const totalHistoryEntries = history.reduce((s, h) => s + h.entries, 0)

  const weekChartData = weekData.length > 0 ? {
    x: weekData.map((d: any) => d.year),
    y: weekData.map((d: any) => d.hours)
  } : null

  const comparisonChartData = comparisonData.length > 0 ? [
    { x: comparisonData.map(d => d.month), y: comparisonData.map(d => d.hoursA), name: String(yearA) },
    { x: comparisonData.map(d => d.month), y: comparisonData.map(d => d.hoursB), name: String(yearB) }
  ] : null

  const getYearDiff = () => {
    if (comparisonData.length === 0) return 0
    const totalA = comparisonData.reduce((sum: number, d: any) => sum + d.hoursA, 0)
    const totalB = comparisonData.reduce((sum: number, d: any) => sum + d.hoursB, 0)
    return totalA - totalB
  }

  return (
    <div>
      <h1>Retrospect</h1>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'on-this-day' ? 'active' : ''}`}
          onClick={() => setActiveTab('on-this-day')}
        >
          On This Day
        </button>
        <button
          className={`tab ${activeTab === 'week-view' ? 'active' : ''}`}
          onClick={() => setActiveTab('week-view')}
        >
          Week View
        </button>
        <button
          className={`tab ${activeTab === 'year-comparison' ? 'active' : ''}`}
          onClick={() => setActiveTab('year-comparison')}
        >
          Year Comparison
        </button>
      </div>

      {errorMessage && <p className="error-text">{errorMessage}</p>}

      {loading ? (
        <LoadingSpinner />
      ) : activeTab === 'on-this-day' ? (
        <>
          <div className="filter-bar">
            <label style={{ margin: 0 }}>Pick a date:</label>
            <DatePicker
              selected={selectedDate}
              onChange={(date: Date | null) => date && setSelectedDate(date)}
              dateFormat="yyyy-MM-dd"
              className="date-input"
            />
          </div>

          <h2>On This Day ({formatDateDisplay(selectedDate)})</h2>

          {history.length === 0 ? (
            <p className="empty-state">No entries found for {formatDateDisplay(selectedDate)} in any year.</p>
          ) : (
            <>
              {/* Summary metrics */}
              <div className="metric-grid" style={{ marginBottom: '1rem' }}>
                <MetricCard value={totalHistoryHours.toFixed(1)} label="Total Hours" accentColor={METRIC_COLORS.totalHours} />
                <MetricCard value={totalHistoryEntries} label="Entries" accentColor={METRIC_COLORS.entries} />
                <MetricCard value={history.length} label="Years Active" accentColor={METRIC_COLORS.projects} />
              </div>

              {/* Bar chart: hours by year */}
              <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
                <NeonBarChart
                  data={{
                    x: history.map(h => String(h.year)),
                    y: history.map(h => h.hours),
                  }}
                  title={`Hours on ${formatDateDisplay(selectedDate)} by Year`}
                  height={Math.max(200, history.length * 60)}
                  color="#00fff9"
                />
              </div>

              {/* Per-year expandable details */}
              {history.map(yearData => (
                <div key={yearData.year} className="expandable-section" style={{ marginBottom: '0.5rem' }}>
                  <div
                    className="expandable-header"
                    onClick={() => setExpandedYear(expandedYear === yearData.year ? null : yearData.year)}
                  >
                    <span>
                      <strong>{yearData.year}</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '1rem' }}>
                        {yearData.hours.toFixed(1)}h &middot; {yearData.entries} entries
                      </span>
                    </span>
                    <span>{expandedYear === yearData.year ? '▲' : '▼'}</span>
                  </div>
                  {expandedYear === yearData.year && yearData.details && yearData.details.length > 0 && (
                    <div className="expandable-content">
                      <div className="table-container">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Time</th>
                              <th>Description</th>
                              <th>Project</th>
                              <th>Hours</th>
                            </tr>
                          </thead>
                          <tbody>
                            {yearData.details.map((entry, idx) => (
                              <tr key={idx}>
                                <td>{formatTime(entry.start)}</td>
                                <td>{entry.description}</td>
                                <td style={{ color: getProjectColor(entry.project_name) }}>
                                  {entry.project_name}
                                </td>
                                <td>{entry.duration_hours.toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {yearData.details.some(e => e.tags.length > 0) && (
                        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Tags: {[...new Set(yearData.details.flatMap(e => e.tags))].join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </>
      ) : activeTab === 'week-view' ? (
        <>
          <div className="filter-bar">
            <label style={{ margin: 0 }}>ISO Week:</label>
            <select
              value={isoWeek}
              onChange={(e) => setIsoWeek(Number(e.target.value))}
            >
              {Array.from({ length: 53 }, (_, i) => i + 1).map(week => (
                <option key={week} value={week}>Week {week}</option>
              ))}
            </select>
          </div>

          <h2>Week {isoWeek} Across Years</h2>

          {weekData.length === 0 ? (
            <p className="empty-state">No data for this week.</p>
          ) : (
            <>
              <div className="metric-grid" style={{ marginBottom: '1.5rem' }}>
                {weekData.map((w: any) => (
                  <MetricCard key={w.year} value={`${w.hours.toFixed(1)}h`} label={String(w.year)} accentColor="#ff00ff" />
                ))}
              </div>

              {weekChartData && (
                <div className="chart-card">
                  <NeonBarChart
                    data={weekChartData}
                    title="Hours by Year"
                    height={280}
                    color="#ff00ff"
                  />
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div className="filter-bar">
            <label style={{ margin: 0 }}>Compare:</label>
            <select
              value={yearA}
              onChange={(e) => setYearA(Number(e.target.value))}
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <span style={{ color: 'var(--text-muted)' }}>vs</span>
            <select
              value={yearB}
              onChange={(e) => setYearB(Number(e.target.value))}
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <h2>{yearA} vs {yearB}</h2>

          {comparisonData.length === 0 ? (
            <p className="empty-state">No data for comparison.</p>
          ) : (
            <>
              <div className="metric-grid" style={{ marginBottom: '1.5rem' }}>
                <MetricCard
                  value={comparisonData.reduce((s: number, d: any) => s + d.hoursA, 0).toFixed(1)}
                  label={`${yearA} Hours`}
                  accentColor="#00fff9"
                />
                <MetricCard
                  value={comparisonData.reduce((s: number, d: any) => s + d.hoursB, 0).toFixed(1)}
                  label={`${yearB} Hours`}
                  accentColor="#ff00ff"
                />
                <MetricCard
                  value={`${getYearDiff() >= 0 ? '+' : ''}${getYearDiff().toFixed(1)}`}
                  label="Difference"
                  accentColor={getYearDiff() >= 0 ? '#39ff14' : '#ff8fa3'}
                />
              </div>

              {comparisonChartData && (
                <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
                  <NeonLineChart
                    data={comparisonChartData}
                    title="Monthly Comparison"
                    height={300}
                  />
                </div>
              )}

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>{yearA}</th>
                      <th>{yearB}</th>
                      <th>Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((d: any, idx: number) => (
                      <tr key={idx}>
                        <td>{d.month}</td>
                        <td>{d.hoursA.toFixed(1)}</td>
                        <td>{d.hoursB.toFixed(1)}</td>
                        <td style={{ color: d.hoursA - d.hoursB >= 0 ? '#00fff9' : '#ff8fa3' }}>
                          {d.hoursA - d.hoursB >= 0 ? '+' : ''}{(d.hoursA - d.hoursB).toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
