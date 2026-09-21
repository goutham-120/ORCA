import { useEffect, useState, useId } from 'react'
import { simulateScenario } from '../../services/orcaService'
import { LOCATION_COORDINATES } from '../../services/openMeteoService'
import './ScenarioSimulatorModal.css'

const PRESET_SCENARIOS = [
  {
    id: 'heatwave',
    label: '🔥 Marine Heatwave',
    description: '+2.0°C SST elevation (thermal stratification & pelagic species dispersal)',
    deltaSst: 2.0,
    deltaWave: 0.2,
    windKnots: 12,
    condition: 'normal'
  },
  {
    id: 'monsoon_gale',
    label: '💨 Monsoon Gale',
    description: '35 kts gale wind, +2.4m wave surge (small craft hazard)',
    deltaSst: -0.5,
    deltaWave: 2.4,
    windKnots: 35,
    condition: 'squall'
  },
  {
    id: 'pre_cyclone',
    label: '🌀 Cyclonic Surge',
    description: '45 kts winds, +3.8m waves, convective thunderstorm',
    deltaSst: 0.5,
    deltaWave: 3.8,
    windKnots: 45,
    condition: 'cyclone'
  },
  {
    id: 'long_swell',
    label: '🌊 Long-Period Swell',
    description: '+1.6m distant oceanic swell shoaling near coastal shelf',
    deltaSst: 0.0,
    deltaWave: 1.6,
    windKnots: 10,
    condition: 'normal'
  }
]

export default function ScenarioSimulatorModal({
  isOpen,
  onClose,
  initialLocation,
  onApplyScenarioToChat,
  onNavigateMap
}) {
  const modalId = useId()
  const [selectedLocKey, setSelectedLocKey] = useState(() => {
    if (initialLocation?.id && LOCATION_COORDINATES[initialLocation.id]) {
      return initialLocation.id
    }
    return 'visakhapatnam'
  })

  const [activePreset, setActivePreset] = useState('heatwave')
  const [deltaSst, setDeltaSst] = useState(2.0)
  const [deltaWave, setDeltaWave] = useState(0.2)
  const [windKnots, setWindKnots] = useState(12)
  const [stormCondition, setStormCondition] = useState('normal')

  const [simulationData, setSimulationData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const activePort = LOCATION_COORDINATES[selectedLocKey] || LOCATION_COORDINATES.visakhapatnam

  const applyPreset = (preset) => {
    setActivePreset(preset.id)
    setDeltaSst(preset.deltaSst)
    setDeltaWave(preset.deltaWave)
    setWindKnots(preset.windKnots)
    setStormCondition(preset.condition)
  }

  // Trigger simulation query when parameters change (debounced)
  useEffect(() => {
    if (!isOpen) return
    let active = true
    const timer = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const windMps = Math.round(windKnots * 0.514444 * 10) / 10
        const result = await simulateScenario({
          location: {
            latitude: activePort.lat,
            longitude: activePort.lng,
            label: activePort.name
          },
          delta_sst_c: Number(deltaSst),
          delta_wave_m: Number(deltaWave),
          delta_wind_mps: windMps,
          wind_multiplier: 1.0,
          storm_condition: stormCondition !== 'normal' ? stormCondition : undefined
        })
        if (active) {
          setSimulationData(result)
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Simulation preview failed.')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }, 280)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [isOpen, selectedLocKey, deltaSst, deltaWave, windKnots, stormCondition, activePort])

  if (!isOpen) return null

  const handleLaunchChat = () => {
    const sstSign = deltaSst >= 0 ? `+${deltaSst}` : `${deltaSst}`
    const prompt = `Simulate scenario in ${activePort.name} if SST changes by ${sstSign}°C, waves increase by ${deltaWave}m, and wind reaches ${windKnots} knots.`
    if (onApplyScenarioToChat) {
      onApplyScenarioToChat(prompt, {
        latitude: activePort.lat,
        longitude: activePort.lng,
        label: activePort.name
      })
    }
    onClose()
  }

  const handleInspectMap = () => {
    if (onNavigateMap) {
      onNavigateMap(`/map?latitude=${activePort.lat}&longitude=${activePort.lng}&label=${encodeURIComponent(activePort.name)}`)
    }
    onClose()
  }

  const baselineMsi = simulationData?.baseline?.msi
  const simulatedMsi = simulationData?.simulated?.msi
  const msiDelta = simulationData?.msi_delta ?? 0

  return (
    <div className="scenario-modal-backdrop font-sans" onClick={onClose}>
      <div
        className="scenario-modal-card font-sans"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`title-${modalId}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="scenario-modal-header">
          <div className="title-group">
            <span className="modal-badge-tag font-mono">EXPERIMENTAL SANDBOX</span>
            <h2 id={`title-${modalId}`} className="scenario-modal-title font-sora">
              🧪 What-If Marine Scenario Simulator
            </h2>
            <p className="scenario-modal-desc font-sans">
              Test dynamic perturbations in sea surface temperature, wind, and wave surge to project real-time shifts in Marine Safety Index (MSI), target pelagic fisheries, and port harbor operations.
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="scenario-modal-body">
          {/* LEFT PANEL: CONTROLS & SLIDERS */}
          <div className="scenario-controls-panel">
            {/* 1. Location Picker */}
            <div className="control-field">
              <label className="field-label font-mono">📍 TARGET COASTAL SECTOR</label>
              <select
                className="scenario-select font-sans"
                value={selectedLocKey}
                onChange={(e) => setSelectedLocKey(e.target.value)}
              >
                {Object.entries(LOCATION_COORDINATES).map(([key, loc]) => (
                  <option key={key} value={key}>
                    {loc.name} ({loc.region || loc.state || 'India'})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Presets */}
            <div className="control-field">
              <label className="field-label font-mono">⚡ QUICK SCENARIO PRESETS</label>
              <div className="presets-grid">
                {PRESET_SCENARIOS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`preset-btn font-sans ${activePreset === p.id ? 'active' : ''}`}
                    onClick={() => applyPreset(p)}
                  >
                    <span className="preset-label font-sora">{p.label}</span>
                    <span className="preset-desc font-sans">{p.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Sliders */}
            <div className="sliders-container">
              {/* SST Delta */}
              <div className="slider-group">
                <div className="slider-header font-sans">
                  <span className="slider-title">🌡️ Sea Surface Temp Delta (ΔSST)</span>
                  <span className="slider-val font-mono">{deltaSst >= 0 ? `+${deltaSst}` : deltaSst} °C</span>
                </div>
                <input
                  type="range"
                  min="-2.0"
                  max="4.0"
                  step="0.5"
                  value={deltaSst}
                  onChange={(e) => {
                    setDeltaSst(parseFloat(e.target.value))
                    setActivePreset('')
                  }}
                  className="scenario-range"
                />
                <div className="slider-ticks font-mono">
                  <span>-2.0°C</span>
                  <span>0.0°C</span>
                  <span>+2.0°C</span>
                  <span>+4.0°C</span>
                </div>
              </div>

              {/* Wave Surge Delta */}
              <div className="slider-group">
                <div className="slider-header font-sans">
                  <span className="slider-title">🌊 Wave Height Surge (ΔWave)</span>
                  <span className="slider-val font-mono">+{deltaWave} m</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="3.5"
                  step="0.1"
                  value={deltaWave}
                  onChange={(e) => {
                    setDeltaWave(parseFloat(e.target.value))
                    setActivePreset('')
                  }}
                  className="scenario-range"
                />
                <div className="slider-ticks font-mono">
                  <span>+0.0m</span>
                  <span>+1.0m</span>
                  <span>+2.0m</span>
                  <span>+3.5m</span>
                </div>
              </div>

              {/* Wind Speed */}
              <div className="slider-group">
                <div className="slider-header font-sans">
                  <span className="slider-title">💨 Wind Speed Target</span>
                  <span className="slider-val font-mono">{windKnots} kts ({Math.round(windKnots * 0.514444 * 10) / 10} m/s)</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={windKnots}
                  onChange={(e) => {
                    setWindKnots(parseInt(e.target.value, 10))
                    setActivePreset('')
                  }}
                  className="scenario-range"
                />
                <div className="slider-ticks font-mono">
                  <span>5 kts</span>
                  <span>20 kts</span>
                  <span>35 kts</span>
                  <span>50 kts</span>
                </div>
              </div>

              {/* Storm Condition */}
              <div className="control-field">
                <label className="field-label font-mono">🌩️ CONVECTIVE STORM OVERRIDE</label>
                <div className="conditions-row">
                  {[
                    { id: 'normal', label: 'Fair / Normal' },
                    { id: 'squall', label: '⚡ Convective Squall' },
                    { id: 'cyclone', label: '🌀 Cyclonic Gale' }
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`cond-chip font-sans ${stormCondition === c.id ? 'active' : ''}`}
                      onClick={() => {
                        setStormCondition(c.id)
                        setActivePreset('')
                      }}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: LIVE PROJECTED TELEMETRY */}
          <div className="scenario-preview-panel">
            <div className="preview-panel-header">
              <span className="preview-label font-mono">PROJECTED MARITIME IMPACT</span>
              {loading && <span className="preview-spinner font-mono">Computing physics models...</span>}
            </div>

            {error && <div className="preview-error font-sans">⚠️ {error}</div>}

            {simulationData && (
              <div className="telemetry-stack">
                {/* 1. MSI SHIFT COMPARISON CARD */}
                <div className="msi-shift-card font-sans">
                  <div className="shift-header">
                    <div>
                      <span className="shift-sub font-mono">SAFETY INDEX SHIFT</span>
                      <h4 className="shift-title font-sora">
                        {baselineMsi?.score ?? 0} ({baselineMsi?.tier_label}) →{' '}
                        <span className={`sim-score ${simulatedMsi?.tier || ''}`}>
                          {simulatedMsi?.score ?? 0} ({simulatedMsi?.tier_label})
                        </span>
                      </h4>
                    </div>
                    <span className={`msi-delta-badge font-mono ${msiDelta < 0 ? 'negative' : 'positive'}`}>
                      {msiDelta > 0 ? `+${msiDelta}` : msiDelta} pts
                    </span>
                  </div>

                  <div className="msi-comparison-bars">
                    <div className="bar-row">
                      <span className="bar-label font-mono">Baseline</span>
                      <div className="bar-track">
                        <div
                          className="bar-fill baseline"
                          style={{ width: `${baselineMsi?.score ?? 50}%` }}
                        />
                      </div>
                      <span className="bar-val font-mono">{baselineMsi?.score ?? 0}/100</span>
                    </div>
                    <div className="bar-row">
                      <span className="bar-label font-mono">Simulated</span>
                      <div className="bar-track">
                        <div
                          className={`bar-fill simulated ${simulatedMsi?.tier || ''}`}
                          style={{ width: `${simulatedMsi?.score ?? 50}%` }}
                        />
                      </div>
                      <span className="bar-val font-mono">{simulatedMsi?.score ?? 0}/100</span>
                    </div>
                  </div>
                </div>

                {/* 2. PELAGIC FISHERY & BIOMASS DISPERSAL ALERT */}
                <div className="species-impact-card font-sans">
                  <div className="card-sub-header">
                    <span className="icon">🐟</span>
                    <strong className="font-sora">Pelagic Fishery Biomass Dispersal</strong>
                  </div>
                  <div className="species-list">
                    {simulationData.species_impacts?.map((sp, idx) => (
                      <div key={idx} className={`species-item ${sp.severity}`}>
                        <div className="species-item-header">
                          <span className="species-name font-sora">{sp.species}</span>
                          <span className={`species-status-chip font-mono ${sp.severity}`}>
                            {sp.thermal_status}
                          </span>
                        </div>
                        <p className="species-impact-text font-sans">{sp.impact}</p>
                        <span className="species-catch-text font-mono">▸ {sp.catch_projection}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. VESSEL RESTRICTIONS & PORT OPERATIONS */}
                <div className="vessel-port-card font-sans">
                  <div className="card-sub-header">
                    <span className="icon">⚓</span>
                    <strong className="font-sora">Vessel Restrictions & Harbor Status</strong>
                  </div>
                  <div className="vessel-grid">
                    {simulationData.vessel_advisories?.map((v, idx) => (
                      <div key={idx} className={`vessel-tile ${v.badge}`}>
                        <span className="vessel-cat font-sans">{v.category}</span>
                        <span className={`vessel-badge font-mono ${v.badge}`}>{v.status}</span>
                        <span className="vessel-adv font-sans">{v.advisory}</span>
                      </div>
                    ))}
                  </div>

                  {simulationData.port_impact && (
                    <div className={`port-banner font-sans ${simulationData.port_impact.risk_level}`}>
                      <span className="port-status font-mono">
                        HARBOR: {simulationData.port_impact.status}
                      </span>
                      <span className="port-adv font-sans">{simulationData.port_impact.advisory}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="scenario-modal-footer">
          <button
            type="button"
            className="secondary-btn font-sans"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="map-inspect-btn font-sans"
            onClick={handleInspectMap}
          >
            🗺️ Inspect on Map
          </button>
          <button
            type="button"
            className="primary-btn font-sans"
            onClick={handleLaunchChat}
          >
            🚀 Ask ORCA to Synthesize Scenario
          </button>
        </div>
      </div>
    </div>
  )
}
