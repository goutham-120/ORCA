const filters = ['all', 'high', 'moderate', 'advisory']

function labelFor(filter) {
  return filter === 'all' ? 'All' : filter[0].toUpperCase() + filter.slice(1)
}

export default function AlertSummary({
  alerts,
  locationName,
  filter,
  onFilterChange,
  expandedId,
  onToggleAlert,
  onViewAlerts,
}) {
  const counts = alerts.reduce(
    (result, alert) => ({ ...result, [alert.severity]: (result[alert.severity] || 0) + 1 }),
    {}
  )
  const visibleAlerts = filter === 'all' ? alerts : alerts.filter((alert) => alert.severity === filter)

  return (
    <section className="panel alerts-preview font-sans">
      <div className="panel-title">
        <div>
          <p className="eyebrow font-mono">ACTIVE ALERTS</p>
          <h2 className="font-sans">
            {visibleAlerts.length} {visibleAlerts.length === 1 ? 'Advisory' : 'Advisories'} &middot; {locationName}
          </h2>
        </div>
        <button type="button" className="font-sans" onClick={onViewAlerts}>
          View all alerts <span aria-hidden="true">&rarr;</span>
        </button>
      </div>

      <p className="alert-summary font-sans">
        <b className="high-count">{counts.high || 0} High</b> &middot; {counts.moderate || 0} Moderate &middot;{' '}
        {counts.advisory || 0} Advisory
      </p>

      <div className="alert-filters font-sans" aria-label="Filter alerts">
        {filters.map((item) => (
          <button
            key={item}
            type="button"
            className={filter === item ? 'active' : ''}
            onClick={() => onFilterChange(item)}
            aria-pressed={filter === item}
          >
            {labelFor(item)}
          </button>
        ))}
      </div>

      <div className="alert-list font-sans">
        {visibleAlerts.length ? (
          visibleAlerts.map((alert) => {
            const open = alert.id === expandedId
            return (
              <article className={`alert-row ${open ? 'open' : ''}`} key={alert.id}>
                <button
                  type="button"
                  className="alert-toggle font-sans"
                  onClick={() => onToggleAlert(alert.id)}
                  aria-expanded={open}
                >
                  <i className={alert.severity} />
                  <span>
                    <small className="font-mono">{alert.severity.toUpperCase()}</small>
                    <b>{alert.title}</b>
                    <em>{alert.detail}</em>
                  </span>
                  <strong aria-hidden="true" className="font-mono">
                    {open ? '−' : '+'}
                  </strong>
                </button>
                {open && (
                  <div className="alert-details font-sans">
                    <p>{alert.guidance}</p>
                    <dl>
                      <div>
                        <dt>Affected Area</dt>
                        <dd>{alert.affectedArea || locationName}</dd>
                      </div>
                      <div>
                        <dt>Issued</dt>
                        <dd>{alert.time}</dd>
                      </div>
                    </dl>
                  </div>
                )}
              </article>
            )
          })
        ) : (
          <p className="empty-alerts font-sans">
            No {filter === 'all' ? '' : `${filter} `}active alerts for this location.
          </p>
        )}
      </div>
    </section>
  )
}
