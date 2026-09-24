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

                  {item.satellite_mission && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '4px 0 6px 0' }}>
                      <span style={{ background: 'rgba(34, 185, 242, 0.15)', border: '1px solid rgba(34, 185, 242, 0.35)', color: '#38bdf8', padding: '2px 7px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                        🛰️ {item.satellite_mission}
                      </span>
                      {item.metadata?.satellite_payload && (
                        <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                          [{item.metadata.satellite_payload}]
                        </span>
                      )}
                    </div>
                  )}

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
