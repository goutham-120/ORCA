export default function EvidencePanel({ evidence = [] }) {
  if (!evidence || !evidence.length) return null

  return (
    <div className="evidence-panel-wrapper font-sans">
      <details className="evidence-details" open>
        <summary className="evidence-summary font-mono">
          <span>Sources & evidence ({evidence.length})</span>
          <span className="summary-chevron">▼</span>
        </summary>

        <div className="evidence-grid">
          {evidence.map((item, index) => {
            const status = item.metadata?.data_status || item.metadata?.source_status || 'unavailable'
            const badgeClass = status === 'live' ? 'live' : status === 'cached' ? 'cached' : 'unavailable'
            const observedDate = item.observed_at ? new Date(item.observed_at).toLocaleString() : null

            return (
              <div key={`${item.source}-${index}`} className="evidence-item-card">
                <div className="item-header">
                  <span className="source-name font-sans">{item.source}</span>
                  <span className={`evidence-badge font-mono ${badgeClass}`}>
                    {status.toUpperCase()}
                  </span>
                </div>

                <p className="item-summary font-sans">{item.summary}</p>

                <div className="item-footer font-mono">
                  {observedDate && <span className="timestamp">Observed: {observedDate}</span>}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noreferrer" className="source-link">
                      Source API ↗
                    </a>
                  )}
                </div>

                {item.metadata?.error && (
                  <div className="evidence-error-text font-sans">
                    ⚠️ {item.metadata.error}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </details>
    </div>
  )
}
