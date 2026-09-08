export function ReportCharts({ trends }) {
  if (!trends) return null

  const renderSvgLine = (values, strokeColor, gradientId, unit = '') => {
    if (!values || values.length === 0) return null

    const width = 340
    const height = 120
    const padding = 20

    const min = Math.min(...values) * 0.9
    const max = Math.max(...values) * 1.1 || 1

    const points = values.map((val, idx) => {
      const x = padding + (idx / (values.length - 1)) * (width - padding * 2)
      const y = height - padding - ((val - min) / (max - min)) * (height - padding * 2)
      return { x, y, val }
    })

    const pathD = points.reduce((acc, pt, i) => {
      return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`
    }, '')

    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`

    return (
      <div className="report-svg-chart-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="report-svg-chart">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.1)" />

          {/* Area Fill */}
          <path d={areaD} fill={`url(#${gradientId})`} />

          {/* Trend Line */}
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Points */}
          {points.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x}
              cy={pt.y}
              r="3.5"
              fill={i === points.length - 1 ? strokeColor : '#0f172a'}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
          ))}
        </svg>

        <div className="chart-footer-metrics">
          <span>Min: {Math.min(...values)} {unit}</span>
          <span className="current-metric-highlight" style={{ color: strokeColor }}>
            Latest: {values[values.length - 1]} {unit}
          </span>
          <span>Max: {Math.max(...values)} {unit}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="report-charts-container">
      <div className="report-chart-card">
        <div className="chart-header">
          <h4>🌊 Wave Height Progression</h4>
          <span className="chart-badge">{trends.waves?.direction || 'Trend'}</span>
        </div>
        {renderSvgLine(trends.waves?.values, '#38bdf8', 'waveGrad', 'm')}
      </div>

      <div className="report-chart-card">
        <div className="chart-header">
          <h4>💨 Wind Speed Variations</h4>
          <span className="chart-badge">{trends.wind?.direction || 'Trend'}</span>
        </div>
        {renderSvgLine(trends.wind?.values, '#34d399', 'windGrad', 'km/h')}
      </div>

      <div className="report-chart-card">
        <div className="chart-header">
          <h4>🌡️ Surface Sea Temperature</h4>
          <span className="chart-badge">{trends.temperature?.direction || 'Trend'}</span>
        </div>
        {renderSvgLine(trends.temperature?.values, '#f59e0b', 'tempGrad', '°C')}
      </div>
    </div>
  )
}
