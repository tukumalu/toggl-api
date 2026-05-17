interface MetricCardProps {
  value: string | number
  label: string
  accentColor?: string
}

export default function MetricCard({ value, label, accentColor = '#00fff9' }: MetricCardProps) {
  return (
    <div
      className="metric-card"
      style={{
        borderTop: `2px solid ${accentColor}`,
        borderColor: `${accentColor}33`,
        boxShadow: `0 0 10px ${accentColor}15, inset 0 0 20px #0a0a1a88`,
      }}
    >
      <div
        className="value"
        style={{
          color: accentColor,
          textShadow: `0 0 10px ${accentColor}55`,
        }}
      >
        {value}
      </div>
      <div className="label">{label}</div>
    </div>
  )
}
