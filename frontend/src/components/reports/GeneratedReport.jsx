import { useState } from 'react'
import { ReportCharts } from './ReportCharts'

export function GeneratedReport({ report, onSave, onNavigate, isSaved = false }) {
  const [copied, setCopied] = useState(false)
  const [savedLocally, setSavedLocally] = useState(isSaved)

  if (!report) return null

  const handlePrint = () => {
    window.print()
  }

  const handleCopySummary = () => {
    const summaryText = `[ORCA REPORT - ${report.typeTitle}]\nLocation: ${report.locationName} (${report.region})\nScope: ${report.timePeriod}\nGenerated: ${report.generatedDate}\n\nSummary:\n${report.summary}\n\nKey Metrics:\n• Wave Height: ${report.metrics.wave.value} ${report.metrics.wave.unit} (${report.metrics.wave.status})\n• Wind Speed: ${report.metrics.wind.value} ${report.metrics.wind.unit} (${report.metrics.wind.status})\n• Safety Score: ${report.metrics.safety.score}/100 (${report.metrics.safety.label})`
    navigator.clipboard.writeText(summaryText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSaveClick = () => {
    if (onSave) {
      onSave(report)
      setSavedLocally(true)
    }
  }

  const sections = report.sections || []

  return (
    <div className="generated-report-wrapper">
      {/* Action Bar (Hidden during print) */}
      <div className="report-action-bar no-print">
        <div className="action-bar-left">
          <span className="report-status-pill">
            <span className="status-dot green"></span> Generated Official Document
          </span>
          <span className="report-id-code">ID: {report.id}</span>
        </div>

        <div className="action-bar-right">
          <button
            type="button"
            className={`orca-btn secondary text-sm ${savedLocally ? 'saved' : ''}`}
            onClick={handleSaveClick}
            disabled={savedLocally}
          >
            {savedLocally ? '✓ Saved to Workspace' : '💾 Save Report'}
          </button>
          
          <button
            type="button"
            className="orca-btn secondary text-sm"
            onClick={handleCopySummary}
          >
            {copied ? '✓ Summary Copied' : '📋 Copy Summary'}
          </button>

          <button
            type="button"
            className="orca-btn primary text-sm glow"
            onClick={handlePrint}
          >
            🖨️ Print / Download PDF
          </button>
        </div>
      </div>

      {/* Printable Report Document Body */}
      <div className="report-document print-container">
        {/* Document Header */}
        <header className="report-doc-header">
          <div className="header-branding">
            <div className="orca-logo-emblem">🐋</div>
            <div>
              <h1 className="orca-doc-title">ORCA OCEAN & COASTAL ADVISORY SYSTEM</h1>
              <p className="orca-doc-subtitle">Integrated Marine Intelligence & Safety Analysis Platform</p>
            </div>
          </div>
          <div className="header-meta-box">
            <div className="meta-row"><strong>Report Type:</strong> <span>{report.typeTitle}</span></div>
            <div className="meta-row"><strong>Target Area:</strong> <span>{report.locationName}, {report.region}</span></div>
            <div className="meta-row"><strong>Coordinates:</strong> <span>{report.coordinates}</span></div>
            <div className="meta-row"><strong>Temporal Scope:</strong> <span>{report.timePeriod}</span></div>
            <div className="meta-row"><strong>Generated:</strong> <span>{report.generatedDate}</span></div>
          </div>
        </header>

        <hr className="doc-divider" />

        {/* Executive Summary */}
        {sections.includes('summary') && (
          <section className="report-doc-section">
            <h2 className="section-heading">📌 1. Executive Summary</h2>
            <div className="summary-box">
              <p>{report.summary}</p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="report-metrics-grid">
              <div className="metric-box wave">
                <span className="metric-label">Wave Height</span>
                <span className="metric-val">{report.metrics.wave.value} <span className="unit">{report.metrics.wave.unit}</span></span>
                <span className="metric-status">{report.metrics.wave.status}</span>
              </div>
              <div className="metric-box wind">
                <span className="metric-label">Wind Velocity</span>
                <span className="metric-val">{report.metrics.wind.value} <span className="unit">{report.metrics.wind.unit}</span></span>
                <span className="metric-status">{report.metrics.wind.status}</span>
              </div>
              <div className="metric-box temp">
                <span className="metric-label">Sea Surface Temp</span>
                <span className="metric-val">{report.metrics.temperature.value} <span className="unit">{report.metrics.temperature.unit}</span></span>
                <span className="metric-status">{report.metrics.temperature.status}</span>
              </div>
              <div className="metric-box safety">
                <span className="metric-label">Safety Index</span>
                <span className="metric-val">{report.metrics.safety.score} <span className="unit">/100</span></span>
                <span className="metric-status">{report.metrics.safety.label}</span>
              </div>
            </div>
          </section>
        )}

        {/* Sea State & Marine Conditions */}
        {sections.includes('conditions') && (
          <section className="report-doc-section">
            <h2 className="section-heading">🌊 2. Sea State & Hydrodynamic Conditions</h2>
            <div className="details-grid">
              <div className="detail-card">
                <h4>Wave Action & Swell</h4>
                <ul>
                  <li>Significant Wave Height: <strong>{report.metrics.wave.value} m</strong></li>
                  <li>Observed Status: <strong>{report.metrics.wave.status}</strong></li>
                  <li>Trend: <strong>{report.metrics.wave.trend}</strong></li>
                </ul>
              </div>
              <div className="detail-card">
                <h4>Coastal Currents</h4>
                <ul>
                  <li>Current Speed: <strong>{report.metrics.currents.speed}</strong></li>
                  <li>Direction: <strong>{report.metrics.currents.direction}</strong></li>
                  <li>Drift Profile: <strong>{report.metrics.currents.status}</strong></li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* Weather & Meteorological Conditions */}
        {sections.includes('weather') && (
          <section className="report-doc-section">
            <h2 className="section-heading">🌤️ 3. Atmospheric & SST Parameters</h2>
            <div className="details-grid">
              <div className="detail-card">
                <h4>Wind Vector Profile</h4>
                <ul>
                  <li>Sustained Wind Speed: <strong>{report.metrics.wind.value} km/h</strong></li>
                  <li>Directional Origin: <strong>{report.metrics.wind.status}</strong></li>
                  <li>Recent Trend: <strong>{report.metrics.wind.trend}</strong></li>
                </ul>
              </div>
              <div className="detail-card">
                <h4>Visibility & Thermal Readings</h4>
                <ul>
                  <li>Surface Visibility: <strong>{report.metrics.visibility}</strong></li>
                  <li>Sea Surface Temp: <strong>{report.metrics.temperature.value} °C</strong></li>
                  <li>Thermal Trend: <strong>{report.metrics.temperature.trend}</strong></li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* Safety Assessment */}
        {sections.includes('safety') && (
          <section className="report-doc-section">
            <h2 className="section-heading">🛡️ 4. Marine Operational Safety Index</h2>
            <div className="safety-summary-panel">
              <div className="safety-score-badge font-mono">
                {report.metrics.safety.score}<span>/100</span>
              </div>
              <div className="safety-details font-sans">
                <h4>Overall Margin: <span className="label-text">{report.metrics.safety.label}</span></h4>
                <p>{report.metrics.safety.note}</p>
                <div className="safety-factors font-mono">
                  <span>Wave Margin: <strong>{report.metrics.safety.wave}%</strong></span>
                  <span>Wind Margin: <strong>{report.metrics.safety.wind}%</strong></span>
                  <span>Visibility Margin: <strong>{report.metrics.safety.visibility}%</strong></span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Active Marine Advisories */}
        {sections.includes('alerts') && (
          <section className="report-doc-section">
            <h2 className="section-heading">⚠️ 5. Active Marine Advisories & Hazards ({report.alerts.length})</h2>
            {report.alerts.length === 0 ? (
              <p className="no-alerts-msg">✓ No high severity hazards active for this sector.</p>
            ) : (
              <div className="report-alerts-table-wrapper">
                <table className="report-alerts-table">
                  <thead>
                    <tr>
                      <th>Severity</th>
                      <th>Advisory Title</th>
                      <th>Impact Area</th>
                      <th>Guidance & Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.alerts.map((al) => (
                      <tr key={al.id}>
                        <td>
                          <span className={`table-sev-badge ${al.severity}`}>
                            {al.severity.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <strong>{al.title}</strong>
                          <div className="table-sub-detail">{al.detail}</div>
                        </td>
                        <td>{al.affectedArea}</td>
                        <td>
                          <div>{al.guidance}</div>
                          <em className="rec-text">Rec: {al.recommendation}</em>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Trend Charts */}
        {sections.includes('trends') && (
          <section className="report-doc-section">
            <h2 className="section-heading">📈 6. Temporal Multi-Variable Trends</h2>
            <ReportCharts trends={report.trends} locationName={report.locationName} />
          </section>
        )}

        {/* Operational Recommendations */}
        {sections.includes('recommendations') && (
          <section className="report-doc-section">
            <h2 className="section-heading">💡 7. Actionable Operational Recommendations</h2>
            <div className="recommendations-box">
              <ul className="rec-list">
                {report.recommendations.map((rec, idx) => (
                  <li key={idx} className="rec-item">
                    <span className="rec-icon">➔</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Document Footer */}
        <footer className="report-doc-footer">
          <p>ORCA Integrated Marine Operations System • Automated Report Engine • Confidential Operational Advisory</p>
        </footer>
      </div>

      {/* Cross-Feature Links Bar (Hidden during print) */}
      <div className="report-cross-links-card no-print">
        <h3>🔗 Cross-Feature Marine Tools</h3>
        <p>Explore full spatial context, active alert maps, or query Ask ORCA AI regarding this report.</p>
        <div className="cross-links-buttons">
          <button
            type="button"
            className="orca-btn secondary text-sm"
            onClick={() => onNavigate && onNavigate('/map-explorer')}
          >
            🗺️ View Sector in Map Explorer
          </button>
          <button
            type="button"
            className="orca-btn secondary text-sm"
            onClick={() => onNavigate && onNavigate('/alerts')}
          >
            ⚠️ Open Marine Alerts Desk ({report.alerts.length} Active)
          </button>
          <button
            type="button"
            className="orca-btn primary text-sm glow"
            onClick={() => onNavigate && onNavigate(`/ask-orca?query=Provide+a+detailed+breakdown+for+${encodeURIComponent(report.locationName)}+report`)}
          >
            🤖 Ask ORCA AI About This Sector
          </button>
        </div>
      </div>
    </div>
  )
}
