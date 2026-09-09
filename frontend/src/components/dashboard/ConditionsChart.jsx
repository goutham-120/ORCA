const tabs = [
  ['waves', 'Waves'],
  ['wind', 'Wind'],
  ['temperature', 'Temperature'],
]

function points(values) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  return values
    .map((value, index) => `${(index / (values.length - 1)) * 100},${84 - ((value - min) / range) * 58}`)
    .join(' ')
}

export default function ConditionsChart({ trends, activeTab, onTabChange }) {
  const trend = trends[activeTab]

  return (
    <section className="conditions-chart panel font-sans">
      <div className="panel-title">
        <div>
          <p className="eyebrow font-mono">CONDITIONS TREND</p>
          <h2 className="font-sans">Last 12 Hours</h2>
        </div>
        <strong className="font-mono">{trend.current}</strong>
      </div>

      <div className="chart-tabs" role="tablist" aria-label="Condition trend type">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            className={activeTab === id ? 'active font-sans' : 'font-sans'}
            onClick={() => onTabChange(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="chart-wrap">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${trend.label} trend`}>
          <defs>
            <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity=".32" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="chart-area" d={`M 0,100 L ${points(trend.values)} L 100,100 Z`} />
          <polyline className="chart-line" points={points(trend.values)} />
        </svg>
        <span className="chart-label first font-mono">12h ago</span>
        <span className="chart-label middle font-mono">6h ago</span>
        <span className="chart-label last font-mono">Now</span>
      </div>

      <p className="chart-caption font-sans">
        {trend.label} &middot; {trend.direction || 'Stable'} &middot; Historical 12-hour trend data
      </p>
    </section>
  )
}
