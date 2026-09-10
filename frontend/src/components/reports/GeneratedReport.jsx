import { useState } from 'react'
import { ReportCharts } from './ReportCharts'

const BookmarkIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
)

const CopyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

const DownloadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const MapIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6" />
    <line x1="9" y1="3" x2="9" y2="18" />
    <line x1="15" y1="6" x2="15" y2="21" />
  </svg>
)

const BellIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

const MessageCircleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
)

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
    <div className="generated-report-wrapper font-inter">
      {/* Action Bar (Hidden during print) */}
      <div className="report-action-bar no-print font-inter">
        <div className="action-bar-left">
          <span className="report-status-pill font-inter">
            <span className="status-dot green"></span> Generated Official Document
          </span>
          <span className="report-id-code font-inter">ID: {report.id}</span>
        </div>

        <div className="action-bar-right font-inter">
          <button
            type="button"
            className={`orca-btn secondary text-sm font-inter ${savedLocally ? 'saved' : ''}`}
            onClick={handleSaveClick}
            disabled={savedLocally}
          >
            <BookmarkIcon />
            <span>{savedLocally ? '✓ Saved to Workspace' : 'Save Report'}</span>
          </button>
          
          <button
            type="button"
            className="orca-btn secondary text-sm font-inter"
            onClick={handleCopySummary}
          >
            <CopyIcon />
            <span>{copied ? '✓ Summary Copied' : 'Copy Summary'}</span>
          </button>

          <button
            type="button"
            className="orca-btn primary text-sm glow font-inter"
            onClick={handlePrint}
          >
            <DownloadIcon />
            <span>Print / Download PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Report Document Body */}
      <div className="report-document print-container font-inter">
        {/* Document Header */}
        <header className="report-doc-header">
          <div className="header-branding">
            <div className="orca-logo-emblem">🐋</div>
            <div>
              <h1 className="orca-doc-title font-sora">ORCA OCEAN & COASTAL ADVISORY SYSTEM</h1>
              <p className="orca-doc-subtitle font-inter">Integrated Marine Intelligence & Safety Analysis Platform</p>
            </div>
          </div>
          <div className="header-meta-box font-inter">
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
            <h2 className="section-heading font-sora">1. Executive Summary</h2>
            <div className="summary-box font-inter">
              <p>{report.summary}</p>
            </div>

            {/* Quick Metrics Bar */}
            <div className="report-metrics-grid font-inter">
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
            <h2 className="section-heading font-sora">2. Sea State & Hydrodynamic Conditions</h2>
            <div className="details-grid font-inter">
              <div className="detail-card">
                <h4 className="font-sora">Wave Action & Swell</h4>
                <ul>
                  <li>Significant Wave Height: <strong>{report.metrics.wave.value} m</strong></li>
                  <li>Observed Status: <strong>{report.metrics.wave.status}</strong></li>
                  <li>Trend: <strong>{report.metrics.wave.trend}</strong></li>
                </ul>
              </div>
              <div className="detail-card">
                <h4 className="font-sora">Coastal Currents</h4>
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
            <h2 className="section-heading font-sora">3. Atmospheric & SST Parameters</h2>
            <div className="details-grid font-inter">
              <div className="detail-card">
                <h4 className="font-sora">Wind Vector Profile</h4>
                <ul>
                  <li>Sustained Wind Speed: <strong>{report.metrics.wind.value} km/h</strong></li>
                  <li>Directional Origin: <strong>{report.metrics.wind.status}</strong></li>
                  <li>Recent Trend: <strong>{report.metrics.wind.trend}</strong></li>
                </ul>
              </div>
              <div className="detail-card">
                <h4 className="font-sora">Visibility & Thermal Readings</h4>
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
          <section className="report-doc-section font-inter">
            <h2 className="section-heading font-sora">4. Marine Operational Safety Index</h2>
            <div className="safety-summary-panel">
              <div className="safety-score-badge font-mono">
                {report.metrics.safety.score}<span>/100</span>
              </div>
              <div className="safety-details font-sans">
                <h4 className="font-sora">Overall Margin: <span className="label-text">{report.metrics.safety.label}</span></h4>
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
          <section className="report-doc-section font-inter">
            <h2 className="section-heading font-sora">5. Active Marine Advisories & Hazards ({report.alerts.length})</h2>
            {report.alerts.length === 0 ? (
              <p className="no-alerts-msg">✓ No high severity hazards active for this sector.</p>
            ) : (
              <div className="report-alerts-table-wrapper">
                <table className="report-alerts-table font-inter">
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
          <section className="report-doc-section font-inter">
            <h2 className="section-heading font-sora">6. Temporal Multi-Variable Trends</h2>
            <ReportCharts trends={report.trends} locationName={report.locationName} />
          </section>
        )}

        {/* Operational Recommendations */}
        {sections.includes('recommendations') && (
          <section className="report-doc-section font-inter">
            <h2 className="section-heading font-sora">7. Actionable Operational Recommendations</h2>
            <div className="recommendations-box">
              <ul className="rec-list font-inter">
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
        <footer className="report-doc-footer font-inter">
          <p>ORCA Integrated Marine Operations System • Automated Report Engine • Confidential Operational Advisory</p>
        </footer>
      </div>

      {/* Cross-Feature Links Bar (Hidden during print) */}
      <div className="report-cross-links-card no-print font-inter">
        <h3 className="font-sora">Cross-Feature Marine Tools</h3>
        <p className="font-inter">Explore full spatial context, active alert maps, or query Ask ORCA AI regarding this report.</p>
        <div className="cross-links-buttons font-inter">
          <button
            type="button"
            className="orca-btn secondary text-sm font-inter"
            onClick={() => onNavigate && onNavigate('/map-explorer')}
          >
            <MapIcon />
            <span>View Sector in Map Explorer</span>
          </button>
          <button
            type="button"
            className="orca-btn secondary text-sm font-inter"
            onClick={() => onNavigate && onNavigate('/alerts')}
          >
            <BellIcon />
            <span>Open Marine Alerts Desk ({report.alerts.length} Active)</span>
          </button>
          <button
            type="button"
            className="orca-btn primary text-sm glow font-inter"
            onClick={() => onNavigate && onNavigate(`/ask-orca?query=Provide+a+detailed+breakdown+for+${encodeURIComponent(report.locationName)}+report`)}
          >
            <MessageCircleIcon />
            <span>Ask ORCA AI About This Sector</span>
          </button>
        </div>
      </div>
    </div>
  )
}
