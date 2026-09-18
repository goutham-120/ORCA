import { useState } from 'react'
import EvidencePanel from './EvidencePanel'

function renderMarkdownInline(text) {
  if (!text) return ''
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function parseOrcaAnswer(rawText) {
  if (!rawText) return { summary: '', sections: [], remaining: '', hasStructuredEvidence: false }

  const hasStructured = /Ocean evidence:|Weather evidence:|GIS checked|Decision intelligence:|Risk factors:/i.test(rawText)

  if (!hasStructured) {
    return { summary: '', sections: [], remaining: rawText, hasStructuredEvidence: false }
  }

  let summary = ''
  const summaryMatch = rawText.match(/^(ORCA's combined assessment[^.]*\.|ORCA cannot make[^.]*\.|Assessment[^.]*\.|Combined risk assessment[^.]*\.)/i)
  if (summaryMatch) {
    summary = summaryMatch[1].trim()
  }

  const sections = []

  // 1. Ocean Evidence
  const oceanMatch = rawText.match(/Ocean evidence:\s*([^.]*)\./i)
  if (oceanMatch) {
    const rawMetrics = oceanMatch[1].split(';').map((s) => s.trim()).filter(Boolean)
    const metrics = rawMetrics.map((item) => {
      const match = item.match(/^(wave height|wave period|sea-surface temperature|sea surface temperature)\s+(.*)$/i)
      if (match) {
        return {
          label: match[1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          value: match[2]
        }
      }
      return { label: 'Metric', value: item }
    })
    sections.push({
      id: 'ocean',
      title: 'Ocean Conditions',
      icon: '🌊',
      metrics,
      raw: oceanMatch[1]
    })
  }

  // 2. Weather Evidence
  const weatherMatch = rawText.match(/Weather evidence:\s*([^.]*)\./i)
  if (weatherMatch) {
    const rawMetrics = weatherMatch[1].split(';').map((s) => s.trim()).filter(Boolean)
    const metrics = rawMetrics.map((item) => {
      const match = item.match(/^(condition|wind|precipitation|air temperature)\s+(.*)$/i)
      if (match) {
        return {
          label: match[1].replace(/\b\w/g, (c) => c.toUpperCase()),
          value: match[2]
        }
      }
      return { label: 'Metric', value: item }
    })
    sections.push({
      id: 'weather',
      title: 'Weather Conditions',
      icon: '⛅',
      metrics,
      raw: weatherMatch[1]
    })
  }

  // 3. GIS Evidence
  const gisMatch = rawText.match(/(GIS checked[^.]*\.)/i)
  if (gisMatch) {
    sections.push({
      id: 'gis',
      title: 'GIS & Spatial Intelligence',
      icon: '🗺️',
      text: gisMatch[1].replace(/^GIS checked\s*/i, 'Checked ').replace(/;/g, ' •'),
      raw: gisMatch[1]
    })
  }

  // 4. Decision Intelligence
  const decisionMatch = rawText.match(/Decision intelligence:\s*([^.]*)\./i)
  if (decisionMatch) {
    sections.push({
      id: 'decision',
      title: 'Decision Intelligence',
      icon: '🧠',
      text: decisionMatch[1].trim(),
      raw: decisionMatch[1]
    })
  }

  // 5. Risk factors
  const riskMatch = rawText.match(/Risk factors:\s*([^.]*)\./i)
  if (riskMatch) {
    const factors = riskMatch[1].split(';').map((s) => s.trim()).filter(Boolean)
    sections.push({
      id: 'risk_factors',
      title: 'Risk Concerns',
      icon: '⚠️',
      items: factors,
      raw: riskMatch[1]
    })
  }

  // Remaining notes
  let remaining = rawText
  if (summary) remaining = remaining.replace(summary, '')
  if (oceanMatch) remaining = remaining.replace(oceanMatch[0], '')
  if (weatherMatch) remaining = remaining.replace(weatherMatch[0], '')
  if (gisMatch) remaining = remaining.replace(gisMatch[0], '')
  if (decisionMatch) remaining = remaining.replace(decisionMatch[0], '')
  if (riskMatch) remaining = remaining.replace(riskMatch[0], '')
  remaining = remaining.trim()

  return { summary, sections, remaining, hasStructuredEvidence: true }
}

function FormattedAnswer({ text }) {
  if (!text) return null

  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)

  return (
    <div className="formatted-answer-flow font-sans">
      {paragraphs.map((para, pIdx) => {
        const lines = para.split(/\n/).map((l) => l.trim()).filter(Boolean)
        const isBulletList = lines.length > 1 && lines.every((l) => /^[-*•\d+.]\s/.test(l))

        if (isBulletList) {
          return (
            <ul key={pIdx} className="answer-bullet-list">
              {lines.map((line, lIdx) => (
                <li key={lIdx} className="bullet-item">
                  <span className="bullet-dot">▸</span>
                  <span className="bullet-text">
                    {renderMarkdownInline(line.replace(/^[-*•\d+.]\s*/, ''))}
                  </span>
                </li>
              ))}
            </ul>
          )
        }

        return (
          <p key={pIdx} className="answer-paragraph">
            {renderMarkdownInline(para)}
          </p>
        )
      })}
    </div>
  )
}

export default function Message({ message }) {
  const [copied, setCopied] = useState(false)
  const [showReason, setShowReason] = useState(false)
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
  const isFishingSuitability = Boolean(decision?.suitability && decision?.suitability !== 'unavailable')
  const levelBadgeClass = level === 'low' ? 'low' : level === 'moderate' ? 'moderate' : level === 'high' ? 'high' : level === 'critical' ? 'critical' : 'unknown'
  const evidenceList = response?.evidence || []
  const scorePercent = assessment?.score != null ? Math.round(assessment.score * 100) : null
  const recommendations = response?.recommendations || []
  const hasLimitations = Boolean(response?.unavailable_domains?.length || response?.pending_domains?.length || decision?.unavailable_data?.length || decision?.warnings?.length)
  const answer = response?.answer || message.text || ''
  const targetLocation = response?.context?.location || response?.location || evidenceList.find((e) => e.location?.latitude != null)?.location || null
  const hasTargetCoords = targetLocation && Number.isFinite(Number(targetLocation.latitude)) && Number.isFinite(Number(targetLocation.longitude))
  const isPFZContext = response?.context?.decision_type === 'pfz' || isPFZDiscovery || evidenceList.some((e) => e.data_type === 'pfz_feature' || e.source?.toLowerCase().includes('incois') || (e.metadata?.domain === 'gis' && e.summary?.toLowerCase().includes('pfz'))) || answer.toLowerCase().includes('pfz') || answer.toLowerCase().includes('fishing zone')

  // Extract unique observation factors
  const factors = [
    ...(assessment?.factors || []),
    ...(decision?.factors || [])
  ].filter((v, i, a) => a.indexOf(v) === i)

  const headlineVerdict = assessment?.summary || decision?.assessment || ''
  const parsed = parseOrcaAnswer(answer)

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
        {/* 1. ORCA HEADER */}
        <div className="message-header">
          <div className="orca-identity">
            <strong className="font-mono">ORCA</strong>
            {isSpecialized && response?.intent && <span className="intent-badge font-mono">{response.intent.toUpperCase()}</span>}
          </div>
          <time className="font-mono">{message.timestamp || 'Just now'}</time>
        </div>

        {/* 2. TOP RISK SCORE & OPERATIONAL ASSESSMENT BANNER */}
        {isSpecialized && (isPFZDiscovery || isFishingSuitability || (level && level !== 'unknown')) && (
          <section className={`top-assessment-card ${levelBadgeClass} font-sans`}>
            <div className="assessment-card-header">
              <div className="risk-badge-group">
                <span className={`risk-level-badge ${isPFZDiscovery ? 'moderate' : levelBadgeClass}`}>
                  {isPFZDiscovery
                    ? '🐟 PFZ ADVISORY FOUND'
                    : isFishingSuitability
                    ? `🎣 FISHING SUITABILITY: ${decision.suitability.toUpperCase()}`
                    : `🛡️ ${level.toUpperCase()} RISK`}
                </span>
                {decision?.status && decision.status !== 'available' && (
                  <span className="status-sub-chip font-mono">{decision.status.toUpperCase()}</span>
                )}
              </div>
              {scorePercent != null && (
                <span className="confidence-pill font-mono" title="Calculated Risk Score (0% is optimal/safe)">
                  Risk Score <strong>{scorePercent}%</strong>
                </span>
              )}
            </div>

            {headlineVerdict && headlineVerdict !== answer && (
              <h3 className="assessment-headline font-sora">{headlineVerdict}</h3>
            )}

            {scorePercent != null && (
              <div className="risk-meter-bar">
                <div className={`meter-fill ${levelBadgeClass}`} style={{ width: `${scorePercent}%` }}></div>
              </div>
            )}

            {/* REASON TOGGLE BUTTON UNDER RISK BANNER */}
            <div className="reason-toggle-row">
              <button
                type="button"
                className={`reason-toggle-btn ${showReason ? 'active' : ''} font-mono`}
                onClick={() => setShowReason((prev) => !prev)}
                title="Toggle detailed operational reasoning and environmental parameters"
              >
                <span className="reason-btn-label">
                  <span className="reason-btn-icon">🧠</span>
                  <span>Reason & Breakdown</span>
                </span>
                <span className="reason-btn-chevron">{showReason ? '▲ Hide Reason' : '▼ Reason'}</span>
              </button>
            </div>
          </section>
        )}

        {/* 3. REASON BREAKDOWN SECTION (UNDER RISK BOX) */}
        {showReason && isSpecialized && parsed.hasStructuredEvidence && (
          <div className="structured-reason-container font-sans">
            {parsed.summary && (
              <div className="reason-verdict-banner">
                <span className="verdict-icon">⚡</span>
                <span className="verdict-text">{parsed.summary}</span>
              </div>
            )}

            {/* Structured Telemetry & Domain Grid */}
            <div className="evidence-domain-grid">
              {parsed.sections.map((sec) => (
                <div key={sec.id} className={`domain-telemetry-card ${sec.id}`}>
                  <div className="telemetry-card-header">
                    <span className="telemetry-title">
                      <span className="telemetry-icon">{sec.icon}</span>
                      <strong>{sec.title}</strong>
                    </span>
                  </div>

                  {sec.metrics && (
                    <div className="metric-chips-row">
                      {sec.metrics.map((m, mIdx) => (
                        <div key={mIdx} className="metric-chip">
                          <span className="metric-label">{m.label}</span>
                          <span className="metric-value font-mono">{m.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {sec.text && (
                    <p className="telemetry-text font-sans">{sec.text}</p>
                  )}

                  {sec.items && (
                    <ul className="telemetry-bullet-list">
                      {sec.items.map((item, iIdx) => (
                        <li key={iIdx} className="telemetry-bullet-item">
                          <span className="bullet-dot">▸</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Remaining notes if any */}
            {parsed.remaining && (
              <div className="reason-supplementary-note font-sans">
                {parsed.remaining}
              </div>
            )}
          </div>
        )}

        {/* Fallback formatted answer if not structured evidence */}
        {(!isSpecialized || !parsed.hasStructuredEvidence) && (
          <div className="analysis-body-section font-sans">
            <FormattedAnswer text={answer} />
          </div>
        )}

        {/* Key Contributing Observation Factors */}
        {factors.length > 0 && showReason && (
          <div className="factors-breakdown-card font-sans">
            <span className="factors-header-tag font-mono">KEY OBSERVED FACTORS</span>
            <ul className="factors-list">
              {factors.map((factor, index) => (
                <li key={index} className="factor-row">
                  <span className="factor-bullet">▸</span>
                  <span className="factor-text">{factor}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 4. SUPPORTING RECOMMENDATIONS & WARNINGS */}
        {(recommendations.length > 0 || hasLimitations) && (
          <details className="response-supporting-details font-sans">
            <summary className="font-mono">Action recommendations & operational warnings ({recommendations.length})</summary>
            {hasLimitations && <p className="supporting-note font-sans">Some location-specific evidence is incomplete, so this response should not be treated as a complete safety clearance.</p>}
            {decision?.warnings?.map((warning, index) => <p key={index} className="supporting-note font-sans">⚠️ {warning}</p>)}
            {recommendations.length > 0 && (
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
            )}
          </details>
        )}

        {/* 5. SOURCES & EVIDENCE */}
        {evidenceList.length > 0 && <EvidencePanel evidence={evidenceList} />}

        {/* 6. BOTTOM ACTIONS */}
        <div className="message-actions">
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
