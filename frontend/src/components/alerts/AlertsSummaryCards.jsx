export default function AlertsSummaryCards({ alerts, unreadCount, activeFilter, onSelectFilter }) {
  const counts = {
    all: alerts.length,
    high: alerts.filter((a) => a.severity === 'high').length,
    moderate: alerts.filter((a) => a.severity === 'moderate').length,
    advisory: alerts.filter((a) => a.severity === 'advisory').length,
    info: alerts.filter((a) => a.severity === 'info').length,
  }

  const cards = [
    { id: 'all', label: 'ALL ALERTS', count: counts.all, icon: '📋', tone: 'blue' },
    { id: 'high', label: 'HIGH SEVERITY', count: counts.high, icon: '🔴', tone: 'coral' },
    { id: 'moderate', label: 'MODERATE', count: counts.moderate, icon: '🟠', tone: 'amber' },
    { id: 'advisory', label: 'ADVISORY', count: counts.advisory, icon: '🟡', tone: 'gold' },
    { id: 'info', label: 'INFORMATION', count: counts.info, icon: '🔵', tone: 'cyan' },
    { id: 'unread', label: 'UNREAD', count: unreadCount, icon: '📬', tone: 'mint' },
  ]

  return (
    <div className="alerts-summary-grid">
      {cards.map((card) => {
        const isSelected = activeFilter === card.id
        return (
          <button
            key={card.id}
            type="button"
            className={`alert-stat-card ${card.tone} ${isSelected ? 'is-selected' : ''}`}
            onClick={() => onSelectFilter(card.id)}
          >
            <div className="stat-card-header">
              <span className="stat-icon">{card.icon}</span>
              <small>{card.label}</small>
            </div>
            <strong className="stat-value">{card.count}</strong>
          </button>
        )
      })}
    </div>
  )
}
