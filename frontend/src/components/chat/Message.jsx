import { useState } from 'react'
import EvidencePanel from './EvidencePanel'

export default function Message({ message }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const response = message.response
  const isSpecialized = Boolean(response?.evidence?.length || response?.agents_used?.length || response?.response_kind === 'specialized')

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(message.text)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = message.text
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Silent catch
    }
  }

  if (isUser) {
    return (
      <div className="chat-bubble-wrap user-wrap font-sans">
        <div className="chat-message user-message">
          <div className="message-header">
            <span className="user-label font-mono">YOU</span>
            <time className="font-mono">{message.timestamp || 'Just now'}</time>
          </div>
          <div className="message-body font-sans">{message.text}</div>
        </div>
      </div>
    )
  }

  // Extract Assessment properties safely
  const assessment = response?.assessment
  const level = assessment?.level || 'unknown'
  const levelBadgeClass = level === 'low' ? 'low' : level === 'moderate' ? 'moderate' : level === 'high' ? 'high' : level === 'critical' ? 'critical' : 'unknown'
  const scorePercent = assessment?.score != null ? Math.round(assessment.score * 100) : null

  // Extract Evidence for domain breakdown cards
  const evidenceList = response?.evidence || []
  const marineEvidence = evidenceList.find((e) => e.source?.toLowerCase().includes('marine') || e.source?.toLowerCase().includes('ocean'))
  const weatherEvidence = evidenceList.find((e) => e.source?.toLowerCase().includes('weather') || e.source?.toLowerCase().includes('meteo'))

  const recommendations = response?.recommendations || []
  const pendingDomains = response?.pending_domains || []
  const unavailableDomains = response?.unavailable_domains || []

  return (
    <div className="chat-bubble-wrap orca-wrap font-sans">
      <div className="orca-avatar-orb">
        <span>🐋</span>
      </div>

      <div className="chat-message orca-message structured-orca-card">
        {/* Card Header */}
        <div className="message-header">
          <div className="orca-identity">
            <strong className="font-mono">{isSpecialized ? 'ORCA INTELLIGENCE ASSESSMENT' : 'ORCA'}</strong>
            {response?.intent && (
              <span className="intent-badge font-mono">{response.intent.toUpperCase()}</span>
            )}
          </div>
          <time className="font-mono">{message.timestamp || 'Just now'}</time>
        </div>

        {/* 1. Risk Assessment Banner */}
        {isSpecialized && assessment && (
          <section className={`assessment-banner ${levelBadgeClass}`}>
            <div className="banner-title-row">
              <span className={`risk-level-badge ${levelBadgeClass}`}>
                {level.toUpperCase()} RISK
              </span>
              {scorePercent != null && (
                <span className="risk-score-text font-mono">Confidence Index: {scorePercent}%</span>
              )}
            </div>
            <p className="assessment-summary font-sans">{assessment.summary}</p>
            {scorePercent != null && (
              <div className="risk-meter-bar">
                <div className={`meter-fill ${levelBadgeClass}`} style={{ width: `${scorePercent}%` }}></div>
              </div>
            )}
          </section>
        )}

        {/* 2. Executive Summary */}
        <section className="response-section summary-section">
          <h4 className="section-title font-mono font-bold">📌 EXECUTIVE SUMMARY</h4>
          <div className="message-body font-sans">{response?.answer || message.text}</div>
        </section>

        {/* 3. Domain Telemetry Cards */}
        {(marineEvidence || weatherEvidence) && (
          <section className="response-section domains-section">
            <h4 className="section-title font-mono">🌊 TELEMETRY OBSERVATIONS</h4>
            <div className="domain-cards-grid">
              {marineEvidence && (
                <div className="domain-metric-card marine font-sans">
                  <div className="card-header font-mono">
                    <span>🌊 OCEAN DATA</span>
                    <span className="source-tag">{marineEvidence.metadata?.data_status || 'LIVE'}</span>
                  </div>
                  <p className="metric-text font-sans">{marineEvidence.summary}</p>
                </div>
              )}

              {weatherEvidence && (
                <div className="domain-metric-card weather font-sans">
                  <div className="card-header font-mono">
                    <span>🌤️ WEATHER DATA</span>
                    <span className="source-tag">{weatherEvidence.metadata?.data_status || 'LIVE'}</span>
                  </div>
                  <p className="metric-text font-sans">{weatherEvidence.summary}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 4. Coverage Limitations & Hazards */}
        {(unavailableDomains.length > 0 || pendingDomains.length > 0) && (
          <section className="response-section limitations-section">
            <h4 className="section-title font-mono">⚠️ COVERAGE & DOMAIN STATUS</h4>
            <div className="limitations-box font-sans">
              {unavailableDomains.length > 0 && (
                <p>
                  <strong>Unavailable Domains:</strong> {unavailableDomains.join(', ')} (No data feed configured)
                </p>
              )}
              {pendingDomains.length > 0 && (
                <p>
                  <strong>Pending Capabilities:</strong> {pendingDomains.join(', ')}
                </p>
              )}
            </div>
          </section>
        )}

        {/* 5. Actionable Recommendations */}
        {recommendations.length > 0 && (
          <section className="response-section recommendations-section">
            <h4 className="section-title font-mono">💡 ACTIONABLE RECOMMENDATIONS</h4>
            <div className="recommendations-list font-sans">
              {recommendations.map((item, index) => {
                const priorityClass = item.priority || 'medium'
                return (
                  <div key={index} className="recommendation-item font-sans">
                    <div className="rec-header">
                      <span className={`priority-badge font-mono ${priorityClass}`}>
                        {priorityClass.toUpperCase()}
                      </span>
                      <strong className="rec-action font-sans">{item.action}</strong>
                    </div>
                    {item.rationale && <p className="rec-rationale font-sans">{item.rationale}</p>}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* 6. Evidence Panel */}
        {evidenceList.length > 0 && <EvidencePanel evidence={evidenceList} />}

        {/* Card Actions */}
        <div className="message-actions">
          <button
            type="button"
            className={`action-btn copy-btn ${copied ? 'is-copied' : ''}`}
            onClick={handleCopy}
            title="Copy response text"
          >
            {copied ? '✓ Copied' : '📋 Copy Assessment'}
          </button>
        </div>
      </div>
    </div>
  )
}
