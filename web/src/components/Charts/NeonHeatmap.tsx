import Plot from 'react-plotly.js'

interface HeatmapData {
  date: string
  hours: number
}

interface NeonHeatmapProps {
  data: HeatmapData[]
  title: string
  height?: number
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const HEATMAP_COLORSCALE: Array<[number, string]> = [
  [0, '#0a0a1a'],
  [0.01, '#0d1b3e'],
  [0.2, '#00334d'],
  [0.4, '#005566'],
  [0.6, '#008888'],
  [0.8, '#00ccaa'],
  [1, '#00fff9'],
]

function getISOWeekData(dateStr: string): { week: number; weekday: number; year: number } {
  const d = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay()

  const thursday = new Date(d)
  thursday.setDate(d.getDate() + (4 - dayOfWeek))
  const yearStart = new Date(thursday.getFullYear(), 0, 1)
  const week = Math.ceil((((thursday.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)

  return { week, weekday: dayOfWeek - 1, year: thursday.getFullYear() }
}

export default function NeonHeatmap({ data, title, height = 220 }: NeonHeatmapProps) {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(53).fill(0))

  for (const d of data) {
    const { week, weekday } = getISOWeekData(d.date)
    if (week >= 1 && week <= 53 && weekday >= 0 && weekday < 7) {
      grid[weekday][week - 1] += d.hours
    }
  }

  const weekLabels = Array.from({ length: 53 }, (_, i) => `W${i + 1}`)

  return (
    <Plot
      data={[{
        type: 'heatmap',
        z: grid,
        x: weekLabels,
        y: DAY_LABELS,
        colorscale: HEATMAP_COLORSCALE,
        showscale: true,
        xgap: 2,
        ygap: 2,
        hovertemplate: '%{x}<br>%{y}<br>%{z:.1f} hours<extra></extra>',
        colorbar: {
          title: { text: 'Hours', side: 'right' },
          titlefont: { color: '#7878a8', size: 11 },
          tickfont: { color: '#7878a8', size: 10 },
          len: 0.8,
        },
      }]}
      layout={{
        title: title ? {
          text: title,
          font: { color: '#00fff9', size: 14 },
          x: 0,
          xanchor: 'left',
        } : undefined,
        height,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#e0e0ff', size: 10, family: 'Share Tech Mono, Courier New, monospace' },
        margin: { t: title ? 40 : 10, r: 80, l: 40, b: 20 },
        xaxis: {
          showgrid: false,
          side: 'top',
          tickfont: { size: 8, color: '#7878a8' },
          dtick: 4,
        },
        yaxis: {
          showgrid: false,
          autorange: 'reversed',
          tickfont: { size: 10, color: '#7878a8' },
        },
      }}
      config={{ displayModeBar: false }}
      style={{ width: '100%' }}
    />
  )
}
