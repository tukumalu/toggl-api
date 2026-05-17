import { useEffect, useState } from 'react'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import {
  fetchOverview,
  fetchProjectBreakdown,
  fetchTagBreakdown,
  fetchClientBreakdown,
  fetchTaskBreakdown,
  fetchAvailableYears,
  fetchDailyHours,
  fetchMonthlyHours,
  fetchTopDescriptions,
  fetchTopActivities,
  OverviewMetrics,
  ViewMode,
  DateRange
} from '../lib/api'
import { METRIC_COLORS } from '../lib/colors'
import MetricCard from '../components/MetricCard'
import LoadingSpinner from '../components/LoadingSpinner'
import NeonPieChart from '../components/Charts/NeonPieChart'
import NeonBarChart from '../components/Charts/NeonBarChart'
import NeonLineChart from '../components/Charts/NeonLineChart'
import NeonHeatmap from '../components/Charts/NeonHeatmap'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [dailyHours, setDailyHours] = useState<any[]>([])
  const [monthlyHours, setMonthlyHours] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [availableYears, setAvailableYears] = useState<number[]>([])

  const [mode, setMode] = useState<ViewMode>('single_year')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [endDate, setEndDate] = useState<Date | null>(null)

  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [projectDescriptions, setProjectDescriptions] = useState<any[]>([])
  const [projectExpanded, setProjectExpanded] = useState(false)

  useEffect(() => {
    async function loadYears() {
      try {
        const years = await fetchAvailableYears()
        setAvailableYears(years)
        if (years.length > 0 && !years.includes(selectedYear)) {
          setSelectedYear(years[0])
        }
      } catch {
        setAvailableYears([2026, 2025, 2024, 2023])
      }
    }
    void loadYears()
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        setErrorMessage('')

        let range: DateRange | null = null
        if (mode === 'custom_range' && startDate && endDate) {
          range = {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          }
        }

        const year = mode === 'single_year' ? selectedYear : null

        const [m, p, t, c, ts, dh, mh, act] = await Promise.all([
          fetchOverview(mode, year, range),
          fetchProjectBreakdown(mode, year, range),
          fetchTagBreakdown(mode, year, range),
          fetchClientBreakdown(mode, year, range),
          fetchTaskBreakdown(mode, year, range),
          fetchDailyHours(mode, year, range).catch(() => []),
          fetchMonthlyHours(mode, year, range).catch(() => []),
          fetchTopActivities(mode, year, range).catch(() => []),
        ])

        setMetrics(m)
        setProjects(p.slice(0, 15))
        setTags(t.slice(0, 10))
        setClients(c.slice(0, 10))
        setTasks(ts.slice(0, 10))
        setDailyHours(dh)
        setMonthlyHours(mh)
        setActivities(act)
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load dashboard data.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [mode, selectedYear, startDate, endDate])

  useEffect(() => {
    async function loadProjectDetails() {
      if (!selectedProject) return
      try {
        let range: DateRange | null = null
        if (mode === 'custom_range' && startDate && endDate) {
          range = {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          }
        }
        const year = mode === 'single_year' ? selectedYear : null
        const desc = await fetchTopDescriptions(mode, year, range, selectedProject, 10)
        setProjectDescriptions(desc)
      } catch {
        setProjectDescriptions([])
      }
    }
    void loadProjectDetails()
  }, [selectedProject, mode, selectedYear, startDate, endDate])

  const titleSuffix = mode === 'single_year'
    ? String(selectedYear)
    : mode === 'all_time'
      ? availableYears.length > 0 ? `${Math.min(...availableYears)}-${Math.max(...availableYears)}` : 'All Time'
      : startDate && endDate ? `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}` : 'Custom Range'

  const projectPieData = {
    labels: projects.map(p => p.projectName),
    values: projects.map(p => p.hours)
  }

  const tagBarData = {
    x: tags.slice(0, 8).map(t => t.hours),
    y: tags.slice(0, 8).map(t => t.tagName)
  }

  const clientBarData = {
    x: clients.slice(0, 8).map(c => c.hours),
    y: clients.slice(0, 8).map(c => c.clientName)
  }

  const taskBarData = {
    x: tasks.slice(0, 8).map(t => t.hours),
    y: tasks.slice(0, 8).map(t => t.taskName)
  }

  const monthlyLineData = {
    x: monthlyHours.map(m => m.month),
    y: monthlyHours.map(m => m.hours)
  }

  const handleProjectClick = (projectName: string) => {
    setSelectedProject(selectedProject === projectName ? null : projectName)
    setProjectExpanded(true)
  }

  const selectedProjectData = projects.find(p => p.projectName === selectedProject)

  // Heatmap data grouping by year
  const heatmapData = dailyHours.map(d => ({ date: d.date, hours: d.hours }))
  const heatmapYears = [...new Set(heatmapData.map(d => parseInt(d.date.substring(0, 4))))].sort((a, b) => b - a)

  if (loading) {
    return (
      <div>
        <h1>Dashboard</h1>
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div>
      <h1>Dashboard</h1>

      <div className="filter-bar">
        <button
          onClick={() => setMode('all_time')}
          className={mode === 'all_time' ? 'active' : ''}
        >
          All Time
        </button>
        <button
          onClick={() => setMode('single_year')}
          className={mode === 'single_year' ? 'active' : ''}
        >
          Single Year
        </button>
        {mode === 'single_year' && (
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        )}
        <button
          onClick={() => setMode('custom_range')}
          className={mode === 'custom_range' ? 'active' : ''}
        >
          Custom Range
        </button>
        {mode === 'custom_range' && (
          <DatePicker
            selected={startDate}
            onChange={(dates) => {
              const [start, end] = dates as [Date | null, Date | null]
              setStartDate(start)
              setEndDate(end)
            }}
            startDate={startDate}
            endDate={endDate}
            selectsRange
            placeholderText="Select dates"
            dateFormat="yyyy-MM-dd"
            className="date-input"
          />
        )}
      </div>

      {errorMessage && <p className="error-text">{errorMessage}</p>}

      <h3 style={{ marginBottom: '0.5rem' }}>Overview: {titleSuffix}</h3>

      {metrics && (
        <div className="metric-grid">
          <MetricCard value={metrics.totalHours.toFixed(1)} label="Total Hours" accentColor={METRIC_COLORS.totalHours} />
          <MetricCard value={metrics.totalEntries} label="Entries" accentColor={METRIC_COLORS.entries} />
          <MetricCard value={metrics.uniqueProjects} label="Projects" accentColor={METRIC_COLORS.projects} />
          <MetricCard value={metrics.activeDays} label="Active Days" accentColor={METRIC_COLORS.activeDays} />
          <MetricCard value={metrics.avgHoursPerDay.toFixed(1)} label="Avg Hours/Day" accentColor={METRIC_COLORS.avgHoursPerDay} />
        </div>
      )}

      <hr className="section-divider" />

      <h3>Time by Project</h3>
      <div className="chart-grid">
        <div className="chart-card">
          <h3>Top Projects (proportion)</h3>
          {projects.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <NeonPieChart data={projectPieData} title="" height={320} />
            </div>
          ) : (
            <p className="empty-state">No project data</p>
          )}
        </div>

        <div className="chart-card">
          <h3>Top Projects (hours)</h3>
          {projects.length > 0 ? (
            <>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Hours</th>
                      <th>Entries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.slice(0, 10).map((p) => (
                      <tr
                        key={p.projectName}
                        onClick={() => handleProjectClick(p.projectName)}
                        style={{ cursor: 'pointer', background: selectedProject === p.projectName ? 'rgba(0,255,249,0.08)' : undefined }}
                      >
                        <td>{p.projectName}</td>
                        <td>{p.hours.toFixed(1)}</td>
                        <td>{p.entries}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="empty-state">No project data</p>
          )}
        </div>
      </div>

      <hr className="section-divider" />

      <h3>Time by Tag</h3>
      <div className="chart-card">
        {tags.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <NeonBarChart data={tagBarData} title="" orientation="h" height={300} color="#ff00ff" />
          </div>
        ) : (
          <p className="empty-state">No tag data</p>
        )}
      </div>

      <hr className="section-divider" />

      <div className="chart-grid">
        <div className="chart-card">
          <h3>Clients</h3>
          {clients.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <NeonBarChart data={clientBarData} title="" orientation="h" height={280} color="#ff9800" />
            </div>
          ) : (
            <p className="empty-state">No client data</p>
          )}
        </div>

        <div className="chart-card">
          <h3>Tasks</h3>
          {tasks.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <NeonBarChart data={taskBarData} title="" orientation="h" height={280} color="#39ff14" />
            </div>
          ) : (
            <p className="empty-state">No task data</p>
          )}
        </div>
      </div>

      {selectedProject && selectedProjectData && (
        <div className="project-drilldown">
          <hr className="section-divider" />
          <div className="expandable-section">
            <div
              className="expandable-header"
              onClick={() => setProjectExpanded(!projectExpanded)}
            >
              <span>Project Detail: {selectedProject}</span>
              <span>{projectExpanded ? '▲' : '▼'}</span>
            </div>
            {projectExpanded && (
              <div className="expandable-content">
                <div className="metric-grid" style={{ marginTop: 0 }}>
                  <MetricCard value={selectedProjectData.hours.toFixed(1)} label="Hours" accentColor="#00fff9" />
                  <MetricCard value={selectedProjectData.entries} label="Entries" accentColor="#ff00ff" />
                </div>

                <h4>Top Descriptions</h4>
                {projectDescriptions.length > 0 ? (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Hours</th>
                          <th>Entries</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectDescriptions.map((d, idx) => (
                          <tr key={idx}>
                            <td>{d.description || '(no description)'}</td>
                            <td>{d.hours.toFixed(1)}</td>
                            <td>{d.entries}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="empty-state">No descriptions found</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <hr className="section-divider" />

      <h3>Monthly Trend</h3>
      <div className="chart-card">
        {monthlyHours.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <NeonLineChart data={monthlyLineData} title="" height={300} showArea />
          </div>
        ) : (
          <p className="empty-state">No monthly data</p>
        )}
      </div>

      <hr className="section-divider" />

      <h3>Daily Activity Heatmap</h3>
      {heatmapData.length > 0 ? (
        mode === 'single_year' ? (
          <div className="chart-card">
            <NeonHeatmap
              data={heatmapData.filter(d => d.date.startsWith(String(selectedYear)))}
              title={String(selectedYear)}
              height={220}
            />
          </div>
        ) : (
          heatmapYears.map(yr => (
            <div key={yr} className="chart-card" style={{ marginBottom: '1rem' }}>
              <NeonHeatmap
                data={heatmapData.filter(d => d.date.startsWith(String(yr)))}
                title={String(yr)}
                height={180}
              />
            </div>
          ))
        )
      ) : (
        <p className="empty-state">No daily data for heatmap</p>
      )}

      <hr className="section-divider" />

      <h3>Most Common Activities</h3>
      {activities.length > 0 ? (
        <div className="chart-card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Entries</th>
                  <th>Total Hours</th>
                  <th>Avg Hours</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a, idx) => (
                  <tr key={idx}>
                    <td>{a.description}</td>
                    <td>{a.entries}</td>
                    <td>{a.totalHours.toFixed(1)}</td>
                    <td>{a.avgHours.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="empty-state">No activity data</p>
      )}
    </div>
  )
}
