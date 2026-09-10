import { useState } from 'react'
import EvidencePanel from './EvidencePanel'

export default function Message({ message }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'
  const response = message.response
  const isSpecialized = response?.response_kind === 'specialized'

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

  const assessment = response?.assessment
  const decision = response?.decision
  const level = decision?.risk_level || assessment?.level
  const isPFZDiscovery = response?.context?.decision_type === 'pfz' && decision?.status === 'available' && decision?.features?.length > 0 && decision?.suitability === 'unavailable'
  const levelBadgeClass = level === 'low' ? 'low' : level === 'moderate' ? 'moderate' : level === 'high' ? 'high' : level === 'critical' ? 'critical' : 'unknown'
  const evidenceList = response?.evidence || []
  const scorePercent = assessment?.score != null ? Math.round(assessment.score * 100) : null
  const recommendations = response?.recommendations || []
  const hasLimitations = Boolean(response?.unavailable_domains?.length || response?.pending_domains?.length || decision?.unavailable_data?.length || decision?.warnings?.length)
  const answer = response?.answer || message.text || ''
  const targetLocation = response?.context?.location || response?.location || evidenceList.find((e) => e.location?.latitude != null)?.location || null
  const hasTargetCoords = targetLocation && Number.isFinite(Number(targetLocation.latitude)) && Number.isFinite(Number(targetLocation.longitude))
  const isPFZContext = response?.context?.decision_type === 'pfz' || isPFZDiscovery || evidenceList.some((e) => e.data_type === 'pfz_feature' || e.source?.toLowerCase().includes('incois') || (e.metadata?.domain === 'gis' && e.summary?.toLowerCase().includes('pfz'))) || answer.toLowerCase().includes('pfz') || answer.toLowerCase().includes('fishing zone')

  const handleNavigateMap = (isPFZMode = false) => {
    const lat = hasTargetCoords ? Number(targetLocation.latitude).toFixed(4) : '13.0827'
    const lon = hasTargetCoords ? Number(targetLocation.longitude).toFixed(4) : '80.2707'
    const label = encodeURIComponent(targetLocation?.label || (isPFZMode ? 'PFZ Area' : 'Selected Location'))
    const path = `/map?latitude=${lat}&longitude=${lon}&label=${label}${isPFZMode ? '&layer=pfz' : ''}`
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  return (
    <div className="chat-bubble-wrap orca-wrap font-sans">
      <div className="chat-message orca-message structured-orca-card">
        <div className="message-header">
          <div className="orca-identity">
            <strong className="font-mono">ORCA</strong>
            {isSpecialized && response?.intent && <span className="intent-badge font-mono">{response.intent.toUpperCase()}</span>}
          </div>
          <time className="font-mono">{message.timestamp || 'Just now'}</time>
        </div>

        <div className="message-body font-sans conversational-answer">{answer}</div>

        {isSpecialized && (isPFZDiscovery || (level && level !== 'unknown')) && (
          <section className={`assessment-banner ${levelBadgeClass}`}>
            <div className="banner-title-row">
              <span className={`risk-level-badge ${isPFZDiscovery ? 'moderate' : levelBadgeClass}`}>{isPFZDiscovery ? 'PFZ FOUND' : `${level.toUpperCase()} RISK`}</span>
              {scorePercent != null && <span className="risk-score-text font-mono">Confidence {scorePercent}%</span>}
            </div>
            {scorePercent != null && (
              <div className="risk-meter-bar">
                <div className={`meter-fill ${levelBadgeClass}`} style={{ width: `${scorePercent}%` }}></div>
              </div>
            )}
          </section>
        )}

        {(evidenceList.length > 0 || recommendations.length > 0 || hasLimitations) && (
          <details className="response-supporting-details">
            <summary className="font-mono">Supporting details</summary>
            {hasLimitations && <p className="supporting-note font-sans">Some location-specific evidence is incomplete, so this response should not be treated as a complete safety clearance.</p>}
            {decision?.warnings?.map((warning, index) => <p key={index} className="supporting-note font-sans">{warning}</p>)}
            {recommendations.length > 0 && <div className="recommendations-list font-sans">
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
            </div>}
          </details>
        )}

        {evidenceList.length > 0 && <EvidencePanel evidence={evidenceList} />}

        {/* Card Actions */}
        <div className="message-actions">
          {mapUrl && <a className="action-btn copy-btn" href={mapUrl}>View on Map</a>}
          <button
            type="button"
            className={`action-btn copy-btn ${copied ? 'is-copied' : ''}`}
            onClick={handleCopy}
            title="Copy response text"
          >
            {copied ? '✓ Copied' : '📋 Copy Assessment'}
          </button>
          {isPFZContext ? (
            <button
              type="button"
              className="action-btn map-link-btn font-mono"
              onClick={() => handleNavigateMap(true)}
              title="View Potential Fishing Zones on Map Explorer"
            >
              🐟 View PFZs on Map
            </button>
          ) : (hasTargetCoords || isSpecialized) ? (
            <button
              type="button"
              className="action-btn map-link-btn font-mono"
              onClick={() => handleNavigateMap(false)}
              title="View this area on Map Explorer"
            >
              🗺️ View on Map
            </button>
          ) : null}
        </div>

      </div>
    </div>
  )
}
