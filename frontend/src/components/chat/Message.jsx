import { useState, useEffect } from 'react'
import EvidencePanel from './EvidencePanel'
import ReasoningTrace from './ReasoningTrace'
import ChatMiniMap from './ChatMiniMap'
import { speakResponse, stopSpeech } from '../../utils/speech'
import { buildSpokenSummary } from '../../utils/speechSummary'


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

function enrichOceanMetric(label, value) {
  const cleanVal = String(value || '').replace(/^[:\s]+/, '').trim()
  const matchNum = cleanVal.match(/[-+]?\d*\.?\d+/)
  const num = matchNum ? parseFloat(matchNum[0]) : NaN

  if (label.toLowerCase().includes('wave height') && !isNaN(num)) {
    const formatted = `${num.toFixed(1)} m`
    if (num < 0.5) return { value: formatted, subtitle: 'Calm / Smooth (Sea State 1-2 · Safe)', statusClass: 'safe' }
    if (num < 1.25) return { value: formatted, subtitle: 'Slight Sea (Sea State 3 · Safe for standard craft)', statusClass: 'safe' }
    if (num < 2.2) return { value: formatted, subtitle: 'Moderate Sea (Sea State 4 · Choppy / Small craft caution)', statusClass: 'moderate' }
    if (num < 3.5) return { value: formatted, subtitle: 'Rough Sea (Sea State 5 · High wave hazard)', statusClass: 'high' }
    return { value: formatted, subtitle: 'Very Rough / High (Sea State 6+ · Severe danger)', statusClass: 'critical' }
  }
  if (label.toLowerCase().includes('wave period') && !isNaN(num)) {
    const formatted = `${num.toFixed(1)} s`
    if (num >= 12) return { value: formatted, subtitle: 'Long-Period Swell (Heavy surf & breaker risk)', statusClass: 'moderate' }
    if (num >= 10) return { value: formatted, subtitle: 'Moderate Ocean Swell (Stable interval)', statusClass: 'safe' }
    return { value: formatted, subtitle: 'Standard Wind Chop (Normal interval)', statusClass: 'safe' }
  }
  if ((label.toLowerCase().includes('temperature') || label.toLowerCase().includes('sst')) && !isNaN(num)) {
    return { value: `${num.toFixed(1)} °C`, subtitle: num >= 28 ? 'Tropical Warm Water (SST)' : 'Temperate Water (SST)', statusClass: 'safe' }
  }
  return { value: cleanVal || value, subtitle: '', statusClass: 'neutral' }
}

function enrichWeatherMetric(label, value) {
  const cleanVal = String(value || '').replace(/^[:\s]+/, '').trim()
  const matchNum = cleanVal.match(/[-+]?\d*\.?\d+/)
  const num = matchNum ? parseFloat(matchNum[0]) : NaN

  if ((label.toLowerCase().includes('wind') || label.toLowerCase().includes('speed')) && !isNaN(num)) {
    const kts = Math.round(num * 1.94384 * 10) / 10
    const kmh = Math.round(num * 3.6 * 10) / 10
    const formatted = `${num.toFixed(1)} m/s (${kts} kts · ${kmh} km/h)`
    if (num < 5.5) return { value: formatted, subtitle: 'Light / Gentle Breeze (Beaufort 2-3 · Ideal for fishing)', statusClass: 'safe' }
    if (num < 8.0) return { value: formatted, subtitle: 'Moderate Breeze (Beaufort 4 · Small waves)', statusClass: 'safe' }
    if (num < 10.8) return { value: formatted, subtitle: 'Fresh Breeze (Beaufort 5 · Small craft caution)', statusClass: 'moderate' }
    if (num < 13.9) return { value: formatted, subtitle: 'Strong Breeze (Beaufort 6 · Large waves)', statusClass: 'high' }
    if (num < 17.2) return { value: formatted, subtitle: 'Near Gale (Beaufort 7 · High wind hazard)', statusClass: 'high' }
    return { value: formatted, subtitle: 'Gale Force (Beaufort 8+ · Severe gale warning)', statusClass: 'critical' }
  }
  if (label.toLowerCase().includes('condition')) {
    const str = cleanVal.toLowerCase()
    if (str.includes('thunderstorm') || str.includes('squall')) {
      return { value: cleanVal, subtitle: 'Convective Storm (Sudden gusts & lightning hazard)', statusClass: 'high' }
    }
    if (str.includes('heavy rain') || str.includes('violent')) {
      return { value: cleanVal, subtitle: 'Heavy Precipitation (Poor navigational visibility)', statusClass: 'high' }
    }
    if (str.includes('fog')) {
      return { value: cleanVal, subtitle: 'Dense Fog (Restricted visibility)', statusClass: 'moderate' }
    }
    if (str.includes('clear') || str.includes('cloudy')) {
      return { value: cleanVal, subtitle: 'Good Navigational Visibility', statusClass: 'safe' }
    }
    return { value: cleanVal, subtitle: 'Operational Weather State', statusClass: 'safe' }
  }
  if (label.toLowerCase().includes('precipitation') && !isNaN(num)) {
    const formatted = `${num.toFixed(1)} mm`
    if (num >= 20) return { value: formatted, subtitle: 'Heavy Rainfall (Severe visibility reduction)', statusClass: 'high' }
    if (num >= 5) return { value: formatted, subtitle: 'Moderate Rainfall', statusClass: 'moderate' }
    return { value: formatted, subtitle: num === 0 ? 'No Precipitation' : 'Light Precipitation', statusClass: 'safe' }
  }
  if (label.toLowerCase().includes('temperature') && !isNaN(num)) {
    return { value: `${num.toFixed(1)} °C`, subtitle: 'Ambient Air Temperature', statusClass: 'safe' }
  }
  return { value: cleanVal || value, subtitle: '', statusClass: 'neutral' }
}

function parseOrcaAnswer(rawText) {
  if (!rawText) return { summary: '', sections: [], remaining: '', hasStructuredEvidence: false }

  const hasStructured = /Ocean evidence:|Weather evidence:|GIS checked|Decision intelligence:|Risk factors:|Tide conditions:|Marine Safety Index:/i.test(rawText)

  if (!hasStructured) {
    return { summary: '', sections: [], remaining: rawText, hasStructuredEvidence: false }
  }

  let summary = ''
  const summaryMatch = rawText.match(/^(ORCA's combined assessment[^.]*\.|ORCA cannot make[^.]*\.|Assessment[^.]*\.|Combined risk assessment[^.]*\.)/i)
  if (summaryMatch) {
    summary = summaryMatch[1].trim()
  }

  const sections = []

  // 0. Tide & Hydrodynamic Evidence
  const tideMatch = rawText.match(/(?:Tide conditions|Next High Tide)[^.]*\.(?:\s*(?:Next High Tide|Tide)[^.]*\.)?/i)
  if (tideMatch) {
    sections.push({
      id: 'tide',
      title: 'Tidal & Hydrodynamic Conditions',
      icon: '🌊',
      text: tideMatch[0].trim(),
      raw: tideMatch[0]
    })
  }

  // 1. Ocean Evidence
  const oceanMatch = rawText.match(/Ocean evidence:\s*([^.]*)\./i)
  if (oceanMatch) {
    const rawMetrics = oceanMatch[1].split(';').map((s) => s.trim()).filter(Boolean)
    const metrics = rawMetrics.map((item) => {
      const match = item.match(/^(wave height|wave period|sea-surface temperature|sea surface temperature|sst)[:\s]+(.*)$/i)
      if (match) {
        const label = match[1].replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        const enriched = enrichOceanMetric(label, match[2])
        return {
          label,
          value: enriched.value,
          subtitle: enriched.subtitle,
          statusClass: enriched.statusClass,
        }
      }
      return { label: 'Ocean Metric', value: item, subtitle: '', statusClass: 'neutral' }
    })
    sections.push({
      id: 'ocean',
      title: 'Ocean Conditions & Sea State',
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
      const match = item.match(/^(condition|wind speed|wind|precipitation|air temperature)[:\s]+(.*)$/i)
      if (match) {
        const label = match[1].replace(/\b\w/g, (c) => c.toUpperCase())
        const enriched = enrichWeatherMetric(label, match[2])
        return {
          label,
          value: enriched.value,
          subtitle: enriched.subtitle,
          statusClass: enriched.statusClass,
        }
      }
      return { label: 'Weather Metric', value: item, subtitle: '', statusClass: 'neutral' }
    })
    sections.push({
      id: 'weather',
      title: 'Atmospheric & Wind Conditions',
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
      title: 'Operational Intelligence',
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
      title: 'Risk Concerns & Hazards',
      icon: '⚠️',
      items: factors,
      raw: riskMatch[1]
    })
  }

  // Remaining notes
  let remaining = rawText
  if (summary) remaining = remaining.replace(summary, '')
  const msiMatch = rawText.match(/Marine Safety Index:\s*[^.]*\./i)
  if (msiMatch) remaining = remaining.replace(msiMatch[0], '')
  if (tideMatch) remaining = remaining.replace(tideMatch[0], '')
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
  const [showSimReport, setShowSimReport] = useState(false)
  const [isSpeakingThis, setIsSpeakingThis] = useState(false)
  const isUser = message.role === 'user'
  const response = message.response
  const isSpecialized = response?.response_kind === 'specialized'

  useEffect(() => {
    const handleStart = (e) => {
      if (e?.detail?.messageId === message.id) {
        setIsSpeakingThis(true)
      } else {
        setIsSpeakingThis(false)
      }
    }
    const handleEnd = (e) => {
      if (!e?.detail?.messageId || e.detail.messageId === message.id) {
        setIsSpeakingThis(false)
      }
    }
    window.addEventListener('orca-speech-start', handleStart)
    window.addEventListener('orca-speech-end', handleEnd)
    return () => {
      window.removeEventListener('orca-speech-start', handleStart)
      window.removeEventListener('orca-speech-end', handleEnd)
    }
  }, [message.id])

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

  const handleToggleSpeech = () => {
    if (isSpeakingThis) {
      stopSpeech()
      setIsSpeakingThis(false)
    } else {
      const textToSpeak = response?.answer || message.text || ''
      const spokenLang = response?.language || 'en'
      const spokenBriefing = buildSpokenSummary(response, textToSpeak, spokenLang)
      setIsSpeakingThis(true)
      speakResponse(
        spokenBriefing,
        spokenLang,
        () => setIsSpeakingThis(false),
        () => setIsSpeakingThis(false),
        message.id
      )
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

  const isPFZDiscovery = response?.context?.decision_type === 'pfz' && decision?.status === 'available' && decision?.features?.length > 0 && decision?.suitability === 'unavailable'
  const isFishingSuitability = Boolean(decision?.suitability && decision?.suitability !== 'unavailable')
  const isSimulation = response?.context?.decision_type === 'simulation' || Boolean(decision?.scenario_simulation)
  const simulation = decision?.scenario_simulation

  // Take the highest risk rank between assessment and decision, with simulation override
  const riskRanks = { critical: 4, high: 3, moderate: 2, low: 1, unknown: 0 }
  let assessmentLevel = assessment?.level || 'unknown'
  let decisionLevel = decision?.risk_level && decision.risk_level !== 'unavailable' ? decision.risk_level : 'unknown'
  let scorePercent = assessment?.score != null ? Math.round(assessment.score * 100) : null

  if (isSimulation && simulation?.simulated?.msi) {
    const simMsi = simulation.simulated.msi
    const msiScore = simMsi.score
    if (msiScore != null) {
      scorePercent = Math.max(0, Math.min(100, Math.round(100 - msiScore)))
      if (msiScore >= 75) {
        assessmentLevel = 'low'
      } else if (msiScore >= 50) {
        assessmentLevel = 'moderate'
      } else if (msiScore >= 25) {
        assessmentLevel = 'high'
      } else {
        assessmentLevel = 'critical'
      }
      decisionLevel = assessmentLevel
    }
  }

  const level = (riskRanks[assessmentLevel] || 0) >= (riskRanks[decisionLevel] || 0)
    ? assessmentLevel
    : decisionLevel

  const levelBadgeClass = level === 'low' ? 'low' : level === 'moderate' ? 'moderate' : level === 'high' ? 'high' : level === 'critical' ? 'critical' : 'unknown'
  const evidenceList = response?.evidence || []
  const recommendations = response?.recommendations || []
  const hasLimitations = Boolean(!isSimulation && (response?.unavailable_domains?.length || response?.pending_domains?.length || decision?.unavailable_data?.length))
  const answer = response?.answer || message.text || ''
  const parsed = parseOrcaAnswer(answer)
  const targetLocation = response?.context?.location || response?.location || evidenceList.find((e) => e.location?.latitude != null)?.location || null
  const hasTargetCoords = targetLocation && Number.isFinite(Number(targetLocation.latitude)) && Number.isFinite(Number(targetLocation.longitude))
  const isPFZContext = response?.context?.decision_type === 'pfz' || isPFZDiscovery || evidenceList.some((e) => e.data_type === 'pfz_feature' || e.source?.toLowerCase().includes('incois') || (e.metadata?.domain === 'gis' && e.summary?.toLowerCase().includes('pfz'))) || answer.toLowerCase().includes('pfz') || answer.toLowerCase().includes('fishing zone')

  // Extract unique observation factors
  const factors = [
    ...(assessment?.factors || []),
    ...(decision?.factors || [])
  ].filter((v, i, a) => a.indexOf(v) === i)

  const headlineVerdict = decision?.assessment || assessment?.summary || ''

  const spatialData = response?.spatial_data ? {
    ...response.spatial_data,
    center: response.spatial_data.center || response.spatial_data.coordinates || (hasTargetCoords ? [Number(targetLocation.longitude), Number(targetLocation.latitude)] : [80.2707, 13.0827]),
    location_label: response.spatial_data.label || targetLocation?.label || 'Selected Area',
  } : (hasTargetCoords ? {
    center: [Number(targetLocation.longitude), Number(targetLocation.latitude)],
    location_label: targetLocation.label || 'Selected Location',
    features: decision?.features || [],
    route_geometry: decision?.route_geometry,
    waypoints: decision?.waypoints || [],
    decision_type: response?.context?.decision_type,
  } : null)

  const handleNavigateMap = (isPFZMode = false) => {
    const lat = hasTargetCoords ? Number(targetLocation.latitude).toFixed(4) : '13.0827'
    const lon = hasTargetCoords ? Number(targetLocation.longitude).toFixed(4) : '80.2707'
    const label = encodeURIComponent(targetLocation?.label || (isPFZMode ? 'PFZ Area' : 'Selected Location'))
    const path = `/map?latitude=${lat}&longitude=${lon}&label=${label}${isPFZMode ? '&layer=pfz' : ''}`
    window.history.pushState({}, '', path)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const handleOpenSimulator = () => {
    window.dispatchEvent(
      new CustomEvent('orca-open-simulator', {
        detail: {
          location: hasTargetCoords ? targetLocation : null,
        },
      })
    )
  }

  const getPriorityDisplay = (priority) => {
    const p = (priority || 'medium').toLowerCase()
    if (p === 'low' || p === 'routine') return { label: '✓ ROUTINE', class: 'low' }
    if (p === 'moderate' || p === 'caution') return { label: '⚠️ CAUTION', class: 'moderate' }
    if (p === 'high') return { label: '🚨 HIGH ALERT', class: 'high' }
    if (p === 'critical' || p === 'urgent') return { label: '🛑 URGENT', class: 'critical' }
    if (p === 'advisory') return { label: 'ℹ️ ADVISORY', class: 'advisory' }
    return { label: p.toUpperCase(), class: 'medium' }
  }

  const hasTopAssessment = Boolean(
    isPFZDiscovery ||
    isFishingSuitability ||
    (level && level !== 'unknown') ||
    scorePercent != null ||
    (isSpecialized && headlineVerdict)
  )

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
        {hasTopAssessment && (
          <section className={`top-assessment-card ${levelBadgeClass} font-sans`}>
            <div className="assessment-card-header">
              <div className="risk-badge-group">
                <span className={`risk-level-badge ${isPFZDiscovery ? 'moderate' : levelBadgeClass}`}>
                  {isSimulation
                    ? `🧪 WHAT-IF: ${level.toUpperCase()} RISK`
                    : isPFZDiscovery
                    ? '🐟 PFZ ADVISORY FOUND'
                    : isFishingSuitability
                    ? `🎣 FISHING SUITABILITY: ${decision.suitability.toUpperCase()}`
                    : level && level !== 'unknown'
                    ? `🛡️ ${level.toUpperCase()} RISK`
                    : '🧭 MARITIME ASSESSMENT'}
                </span>
                {decision?.status && decision.status !== 'available' && (
                  <span className="status-sub-chip font-mono">{decision.status.toUpperCase()}</span>
                )}
              </div>
              {scorePercent != null && (
                <span className="confidence-pill font-mono" title="Calculated Risk Score (0% is optimal/safe)">
                  {isSimulation ? 'Simulated Risk' : 'Risk Score'} <strong>{scorePercent}%</strong>
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
                <span className="reason-btn-chevron">{showReason ? '▲ Hide Details' : '▼ View Sea State & Reasoning'}</span>
              </button>
            </div>
          </section>
        )}

        {/* 2B. SCENARIO SIMULATION REPORT BUTTON & COLLAPSIBLE CARD */}
        {isSimulation && simulation && (
          <div className="sim-report-wrapper font-sans">
            <div className="sim-report-trigger-row">
              <button
                type="button"
                className={`sim-report-btn ${showSimReport ? 'active' : ''} font-mono`}
                onClick={() => setShowSimReport((prev) => !prev)}
                title="Toggle detailed What-If Scenario Simulation Report"
              >
                <span className="sim-btn-left">
                  <span className="sim-btn-icon">📊</span>
                  <strong>SCENARIO SIMULATION REPORT</strong>
                  <span className="sim-pill-badge font-mono">
                    MSI Shift: {simulation.msi_delta > 0 ? `+${simulation.msi_delta}` : simulation.msi_delta} pts
                  </span>
                </span>
                <span className="sim-btn-chevron font-mono">
                  {showSimReport ? '▲ Hide Report' : '▼ View Simulation Report'}
                </span>
              </button>
            </div>

            {showSimReport && (
              <section className="simulation-result-card font-sans">
                <div className="sim-card-header">
                  <div className="sim-title-group">
                    <span className="sim-tag font-mono">🧪 WHAT-IF SCENARIO SIMULATION</span>
                    <h3 className="sim-summary-title font-sora">{simulation.scenario_summary}</h3>
                  </div>
                  <div className="sim-msi-delta-box font-mono">
                    <span className="delta-label">MSI SHIFT</span>
                    <strong className={`delta-val ${simulation.msi_delta < 0 ? 'drop' : 'rise'}`}>
                      {simulation.msi_delta > 0 ? `+${simulation.msi_delta}` : simulation.msi_delta} pts
                    </strong>
                  </div>
                </div>

                {/* Comparison Matrix Table */}
                {simulation.comparison_matrix?.length > 0 && (
                  <div className="sim-table-wrap">
                    <table className="sim-comparison-table font-sans">
                      <thead>
                        <tr>
                          <th>Marine Parameter</th>
                          <th>Baseline</th>
                          <th>Simulated</th>
                          <th>Shift (Δ)</th>
                          <th>Operational Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {simulation.comparison_matrix.map((row, rIdx) => (
                          <tr key={rIdx} className={row.severity || ''}>
                            <td className="param-name font-sora">{row.parameter}</td>
                            <td className="font-mono">{row.baseline} {row.unit}</td>
                            <td className="font-mono font-bold">{row.simulated} {row.unit}</td>
                            <td className="font-mono">{row.delta}</td>
                            <td>
                              <span className={`sim-sev-pill font-mono ${row.severity || ''}`}>
                                {(row.severity || 'nominal').toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pelagic Fishery & Biomass Dispersal Alert */}
                {simulation.species_impacts?.length > 0 && (
                  <div className="sim-species-section">
                    <h4 className="sim-section-sub font-sora">🐟 Pelagic Fishery Biomass Dispersal</h4>
                    <div className="sim-species-grid">
                      {simulation.species_impacts.map((sp, sIdx) => (
                        <div key={sIdx} className={`sim-species-card ${sp.severity || ''}`}>
                          <div className="species-card-head">
                            <strong className="font-sora">{sp.species}</strong>
                            <span className={`species-thermal-badge font-mono ${sp.severity || ''}`}>{sp.thermal_status}</span>
                          </div>
                          <p className="species-impact-desc font-sans">{sp.impact}</p>
                          <span className="species-catch-alert font-mono">▸ {sp.catch_projection}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Vessel Category Operational Restrictions */}
                {simulation.vessel_advisories?.length > 0 && (
                  <div className="sim-vessels-section">
                    <h4 className="sim-section-sub font-sora">⚓ Vessel Category Operational Restrictions</h4>
                    <div className="sim-vessels-grid">
                      {simulation.vessel_advisories.map((v, vIdx) => (
                        <div key={vIdx} className={`sim-vessel-card ${v.badge || ''}`}>
                          <div className="vessel-head">
                            <span className="vessel-title font-sora">{v.category}</span>
                            <span className={`vessel-status-tag font-mono ${v.badge || ''}`}>{v.status}</span>
                          </div>
                          <p className="vessel-adv-text font-sans">{v.advisory}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Port & Harbor Infrastructure Alert */}
                {simulation.port_impact && (
                  <div className={`sim-port-alert font-sans ${simulation.port_impact.risk_level || ''}`}>
                    <span className="port-label font-mono">🏛️ HARBOR & NAVIGATION TRANSIT: {simulation.port_impact.status}</span>
                    <p className="port-desc font-sans">{simulation.port_impact.advisory}</p>
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {/* 3. REASON BREAKDOWN SECTION (UNDER RISK BOX) */}
        {showReason && isSpecialized && (
          <div className="structured-reason-container font-sans">
            {parsed.summary && (
              <div className="reason-verdict-banner">
                <span className="verdict-icon">⚡</span>
                <span className="verdict-text">{parsed.summary}</span>
              </div>
            )}

            {/* Structured Telemetry & Domain Grid */}
            {parsed.sections.length > 0 && (
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
                          <div key={mIdx} className={`metric-chip ${m.statusClass || ''}`}>
                            <span className="metric-label">{m.label}</span>
                            <span className="metric-value font-mono">{m.value}</span>
                            {m.subtitle && <span className="metric-subtitle">{m.subtitle}</span>}
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
            )}

            {/* Key Contributing Observation Factors */}
            {factors.length > 0 && (
              <div className="factors-breakdown-card font-sans">
                <span className="factors-header-tag font-mono">KEY OBSERVED MARITIME PARAMETERS</span>
                <ul className="factors-list">
                  {factors.map((factor, index) => (
                    <li key={index} className="factor-row">
                      <span className="factor-bullet">▸</span>
                      <span className="factor-text">
                        {typeof factor === 'string' ? factor : (factor?.message || JSON.stringify(factor))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Remaining notes if any */}
            {!isSimulation && parsed.remaining && (
              <div className="reason-supplementary-note font-sans">
                {parsed.remaining}
              </div>
            )}
          </div>
        )}

        {/* 3.5 MAIN ANALYSIS TEXT - Only displayed when not already encapsulated in top card, reason breakdown, or simulation report */}
        {!isSimulation && (!hasTopAssessment || !parsed.hasStructuredEvidence) && answer ? (
          <div className="analysis-body-section font-sans">
            <FormattedAnswer text={parsed.hasStructuredEvidence ? parsed.remaining : answer} />
          </div>
        ) : (!isSimulation && parsed.remaining) ? (
          <div className="analysis-body-section font-sans">
            <FormattedAnswer text={parsed.remaining} />
          </div>
        ) : null}

        {/* 4. SUPPORTING RECOMMENDATIONS & WARNINGS */}
        {(recommendations.length > 0 || hasLimitations || (decision?.warnings && decision.warnings.length > 0)) && (
          <details className="response-supporting-details font-sans" open={level === 'high' || level === 'critical'}>
            <summary className="font-mono">
              Action recommendations & operational warnings ({recommendations.length + (hasLimitations ? 1 : 0) + (decision?.warnings?.length || 0)})
            </summary>
            {hasLimitations && (
              <p className="supporting-note font-sans">
                ⚠️ Some location-specific evidence is incomplete; this response should not be treated as a complete safety clearance.
              </p>
            )}
            {decision?.warnings?.map((warning, index) => (
              <p key={index} className="supporting-note font-sans">
                ⚠️ {typeof warning === 'string' ? warning : (warning?.message || JSON.stringify(warning))}
              </p>
            ))}
            {recommendations.length > 0 && (
              <div className="recommendations-list font-sans">
                {recommendations.map((item, index) => {
                  const prio = getPriorityDisplay(item.priority)
                  return (
                    <div key={index} className={`recommendation-item font-sans ${prio.class}`}>
                      <div className="rec-header">
                        <span className={`priority-badge font-mono ${prio.class}`}>
                          {prio.label}
                        </span>
                        <strong className="rec-action font-sans">{item.action}</strong>
                      </div>
                      {item.rationale && <p className="rec-rationale font-sans">{item.rationale}</p>}
                      {item.next_steps && item.next_steps.length > 0 && (
                        <div className="rec-next-steps">
                          <span className="next-steps-tag font-mono">NEXT STEPS:</span>
                          <span className="next-steps-text font-sans">{item.next_steps.join('  •  ')}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </details>
        )}
        {/* 4.5 INLINE GEOSPATIAL SITUATIONAL MINI-MAP */}
        {isSpecialized && spatialData && (
          <ChatMiniMap
            spatialData={spatialData}
            onNavigateFullMap={() => handleNavigateMap(isPFZContext)}
          />
        )}

        {/* 4.6 EXPLAINABLE AI REASONING TRACE */}
        {message.role === 'assistant' && (
          <ReasoningTrace message={message} persona={message.persona || 'fisherman'} />
        )}

        {/* 5. SOURCES & EVIDENCE */}
        {evidenceList.length > 0 && <EvidencePanel evidence={evidenceList} />}

        {/* 6. BOTTOM ACTION TOOLBAR */}
        <div className="message-actions">
          <button
            type="button"
            className={`action-btn speak-btn ${isSpeakingThis ? 'is-speaking' : ''}`}
            onClick={handleToggleSpeech}
            title={isSpeakingThis ? 'Stop speech synthesis' : 'Replay spoken response in selected language'}
          >
            {isSpeakingThis
              ? '⏹️ Stop Speech'
              : `🔊 Listen (${(response?.language || 'en').toUpperCase()})`}
          </button>
          <button
            type="button"
            className={`action-btn copy-btn ${copied ? 'is-copied' : ''}`}
            onClick={handleCopy}
            title="Copy response text"
          >
            {copied ? '✓ Copied' : '📋 Copy Advisory'}
          </button>
          <button
            type="button"
            className="action-btn map-link-btn font-mono"
            onClick={() => handleNavigateMap(isPFZContext)}
            title="View this operational area in Map Explorer"
          >
            🗺️ View in Map Explorer
          </button>
          <button
            type="button"
            className="action-btn sim-trigger-btn font-mono"
            onClick={handleOpenSimulator}
            title="Launch What-If Scenario Simulator for this location"
          >
            🧪 Scenario Simulator
          </button>
          {isPFZContext && (
            <button
              type="button"
              className="action-btn pfz-link-btn font-mono"
              onClick={() => handleNavigateMap(true)}
              title="View Potential Fishing Zones on Map Explorer"
            >
              🐟 Potential Fishing Zones
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
