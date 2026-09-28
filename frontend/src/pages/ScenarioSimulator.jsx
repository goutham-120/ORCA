import { useState, useEffect } from 'react'
import { simulateScenario } from '../services/orcaService'
import { LOCATION_COORDINATES } from '../services/openMeteoService'
import './ScenarioSimulator.css'

const PRESET_SCENARIOS = [
  {
    id: 'heatwave',
    label: '🔥 Marine Heatwave',
    description: '+2.0°C SST elevation (thermal stratification & pelagic species dispersal)',
    deltaSst: 2.0,
    deltaWave: 0.2,
    windKnots: 12,
    condition: 'normal',
    badge: 'Thermal Event',
  },
  {
    id: 'monsoon_gale',
    label: '💨 Monsoon Gale',
    description: '35 kts gale wind, +2.4m wave surge (small craft hazard)',
    deltaSst: -0.5,
    deltaWave: 2.4,
    windKnots: 35,
    condition: 'squall',
    badge: 'Wind & Swell Warning',
  },
  {
    id: 'pre_cyclone',
    label: '🌀 Cyclonic Surge',
    description: '45 kts winds, +3.8m waves, Category-2 storm surge & thunderstorm',
    deltaSst: 0.5,
    deltaWave: 3.8,
    windKnots: 45,
    condition: 'cyclone',
    badge: 'Critical Storm Alert',
  },
  {
    id: 'long_swell',
    label: '🌊 Long-Period Swell',
    description: '+1.6m distant oceanic swell shoaling rapidly on coastal shelf',
    deltaSst: 0.0,
    deltaWave: 1.6,
    windKnots: 10,
    condition: 'normal',
    badge: 'Shoaling Hazard',
  },
]

const DEMO_SCENARIO_CARDS = [
  {
    id: 'visakhapatnam',
    title: '🐟 Scenario 1: PFZ High-Yield Voyage',
    location: 'Visakhapatnam Fishing Harbor (Breakwater)',
    coords: '17.6945°N, 83.3035°E',
    description: 'Direct safe passage calculated departing from harbor breakwater to High-Density Tuna PFZ #04 (17.8 km, Course 135° SE).',
    highlights: ['Direct departure fairway', 'High-density pelagic tuna zone', 'Green optimal safety tier (MSI: 92)'],
    presetKey: 'visakhapatnam',
  },
  {
    id: 'chennai',
    title: '⚠️ Scenario 2: Severe Hazard & Naval Bypass',
    location: 'Kasimedu Harbor Wharf, Chennai',
    coords: '13.1250°N, 80.2995°E',
    description: 'Multi-scale A* collision avoidance navigating around Chennai TSS commercial shipping channel & naval restricted zone to Kasimedu Offshore PFZ.',
    highlights: ['Automatic detour corridor', 'Blocked direct path visualization', 'Caution amber detour waypoints (W1-W3)'],
    presetKey: 'chennai',
  },
  {
    id: 'kochi',
    title: '🛣️ Scenario 3: Land-to-Shore Multi-Modal Transit',
    location: 'Ernakulam Inland Hub → Kochi Harbor',
    coords: '9.9815°N, 76.2999°E (Inland)',
    description: 'Multi-modal route: drive 14.9 km (23 mins) via NH 966B & Mattancherry Bridge to Kochi Marine Terminal, then ocean navigation to Arabian Sea PFZ.',
    highlights: ['Inland OSRM driving geometry', 'Turn-by-turn road route to harbor', 'Combined shore & ocean voyage ETA'],
    presetKey: 'kochi',
  },
]

export default function ScenarioSimulator({ navigate }) {
  const [activeTab, setActiveTab] = useState('whatif') // 'whatif' | 'demo'
  const [selectedLocKey, setSelectedLocKey] = useState('visakhapatnam')
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

  useEffect(() => {
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
            label: activePort.name,
          },
          delta_sst_c: Number(deltaSst),
          delta_wave_m: Number(deltaWave),
          delta_wind_mps: windMps,
          wind_multiplier: 1.0,
          storm_condition: stormCondition !== 'normal' ? stormCondition : undefined,
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
  }, [selectedLocKey, deltaSst, deltaWave, windKnots, stormCondition, activePort])

  const handleLaunchChat = () => {
    const sstSign = deltaSst >= 0 ? `+${deltaSst}` : `${deltaSst}`
    const prompt = `Simulate scenario in ${activePort.name} if SST changes by ${sstSign}°C, waves increase by ${deltaWave}m, and wind reaches ${windKnots} knots.`
    if (navigate) {
      navigate(`/ask-orca?q=${encodeURIComponent(prompt)}&lat=${activePort.lat}&lon=${activePort.lng}&label=${encodeURIComponent(activePort.name)}`)
    }
  }

  const handleInspectMap = () => {
    if (navigate) {
      const conditionParam = stormCondition !== 'normal' ? `&condition=${stormCondition}` : ''
      const waveParam = `&delta_wave=${deltaWave}`
      const windParam = `&wind_kts=${windKnots}`
      navigate(`/map-explorer?location=${selectedLocKey}&sim=1${conditionParam}${waveParam}${windParam}`)
    }
  }

  const handleLaunchDemoScenario = (presetKey) => {
    if (navigate) {
      navigate(`/map-explorer?demo=${presetKey}`)
    }
  }

  return (
    <div className="scenario-simulator-page font-inter">
      {/* 1. PAGE HEADER */}
      <header className="simulator-header-bar">
        <div className="simulator-header-left">
          <div className="simulator-badge-icon">🧪</div>
          <div>
            <h1 className="simulator-page-title font-sora">Scenario Simulator</h1>
            <p className="simulator-page-sub">
              Marine environmental stress-testing, what-if climate simulations &amp; verified evaluator demo scenarios.
            </p>
          </div>
        </div>

        {/* Port Picker */}
        <div className="simulator-port-picker">
          <label htmlFor="sim-port-select" className="port-picker-label">
            📍 Simulation Monitoring Sector:
          </label>
          <select
            id="sim-port-select"
            value={selectedLocKey}
            onChange={(e) => setSelectedLocKey(e.target.value)}
            className="sim-port-select"
          >
            {Object.entries(LOCATION_COORDINATES).map(([key, loc]) => (
              <option key={key} value={key}>
                {loc.name} ({loc.lat.toFixed(2)}°N, {loc.lng.toFixed(2)}°E)
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* 2. MODE NAVIGATION TABS */}
      <div className="simulator-tab-bar">
        <button
          type="button"
          className={`sim-tab-btn ${activeTab === 'whatif' ? 'active' : ''}`}
          onClick={() => setActiveTab('whatif')}
        >
          <span>🌊</span> What-If Environmental Stress Test
        </button>
        <button
          type="button"
          className={`sim-tab-btn ${activeTab === 'demo' ? 'active' : ''}`}
          onClick={() => setActiveTab('demo')}
        >
          <span>⭐</span> Evaluator &amp; Operational Demo Scenarios
        </button>
      </div>

      {/* TAB 1: WHAT-IF PARAMETRIC SIMULATOR */}
      {activeTab === 'whatif' && (
        <div className="simulator-grid-layout">
          {/* LEFT COLUMN: CONTROLS & PRESETS */}
          <div className="simulator-controls-card">
            <h2 className="controls-card-title">1. Select Preset Event</h2>
            <div className="preset-chips-grid">
              {PRESET_SCENARIOS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-chip-btn ${activePreset === preset.id ? 'is-selected' : ''}`}
                  onClick={() => applyPreset(preset)}
                >
                  <div className="preset-top-row">
                    <strong className="preset-label">{preset.label}</strong>
                    <span className="preset-badge">{preset.badge}</span>
                  </div>
                  <small className="preset-desc">{preset.description}</small>
                </button>
              ))}
            </div>

            <h2 className="controls-card-title" style={{ marginTop: '24px' }}>
              2. Fine-Tune Simulation Sliders
            </h2>

            {/* SLIDER: SST */}
            <div className="sim-slider-group">
              <div className="slider-label-row">
                <span className="slider-label">🌡️ Sea Surface Temp Delta (SST)</span>
                <span className="slider-val-badge">
                  {deltaSst >= 0 ? `+${deltaSst}` : deltaSst}°C
                </span>
              </div>
              <input
                type="range"
                min="-2.0"
                max="4.0"
                step="0.2"
                value={deltaSst}
                onChange={(e) => {
                  setDeltaSst(Number(e.target.value))
                  setActivePreset('custom')
                }}
                className="sim-range-input"
              />
              <div className="slider-minmax-row">
                <small>-2.0°C (Upwelling)</small>
                <small>0.0°C (Normal)</small>
                <small>+4.0°C (Severe Heatwave)</small>
              </div>
            </div>

            {/* SLIDER: WAVE SURGE */}
            <div className="sim-slider-group">
              <div className="slider-label-row">
                <span className="slider-label">🌊 Wave Height Surge (Delta)</span>
                <span className="slider-val-badge">+{deltaWave}m</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="5.0"
                step="0.2"
                value={deltaWave}
                onChange={(e) => {
                  setDeltaWave(Number(e.target.value))
                  setActivePreset('custom')
                }}
                className="sim-range-input"
              />
              <div className="slider-minmax-row">
                <small>0.0m (Calm)</small>
                <small>+2.5m (Rough)</small>
                <small>+5.0m (Storm Surge)</small>
              </div>
            </div>

            {/* SLIDER: WIND */}
            <div className="sim-slider-group">
              <div className="slider-label-row">
                <span className="slider-label">💨 Sustained Wind Velocity</span>
                <span className="slider-val-badge">{windKnots} knots</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="1"
                value={windKnots}
                onChange={(e) => {
                  setWindKnots(Number(e.target.value))
                  setActivePreset('custom')
                }}
                className="sim-range-input"
              />
              <div className="slider-minmax-row">
                <small>5 kts (Breeze)</small>
                <small>25 kts (Strong)</small>
                <small>60 kts (Severe Storm)</small>
              </div>
            </div>

            {/* CONDITION SELECTOR */}
            <div className="sim-condition-group">
              <label htmlFor="sim-condition-select" className="slider-label">
                ⛈️ Atmospheric &amp; Storm State:
              </label>
              <select
                id="sim-condition-select"
                value={stormCondition}
                onChange={(e) => {
                  setStormCondition(e.target.value)
                  setActivePreset('custom')
                }}
                className="sim-condition-select"
              >
                <option value="normal">Normal / Clear Conditions</option>
                <option value="squall">Monsoonal Squall (Heavy Rain &amp; Gusts)</option>
                <option value="cyclone">🌀 Cyclonic Depression / Danger Cone</option>
              </select>
            </div>

            {/* QUICK LAUNCH ACTIONS */}
            <div className="sim-launch-actions">
              <button
                type="button"
                className="btn-launch-chat"
                onClick={handleLaunchChat}
              >
                💬 Ask ORCA with this Scenario &rarr;
              </button>
              <button
                type="button"
                className="btn-launch-map"
                onClick={handleInspectMap}
              >
                🗺️ View Simulation on Map Explorer &rarr;
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: SIMULATED IMPACT RESULTS */}
          <div className="simulator-results-card">
            <h2 className="controls-card-title">3. Computed Marine Impact Assessment</h2>

            {loading ? (
              <div className="sim-loading-state">
                <div className="sim-spinner" />
                <p>Computing hydrographic impact &amp; Marine Safety Index...</p>
              </div>
            ) : error ? (
              <div className="sim-error-box">
                <span>⚠️ {error}</span>
              </div>
            ) : simulationData ? (
              <div className="sim-data-container">
                {/* SAFETY TIER BADGE */}
                <div
                  className="sim-safety-banner"
                  style={{
                    backgroundColor:
                      simulationData.safety_level === 'DANGER'
                        ? 'rgba(239, 68, 68, 0.15)'
                        : simulationData.safety_level === 'WARNING'
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(16, 185, 129, 0.15)',
                    borderColor:
                      simulationData.safety_level === 'DANGER'
                        ? '#ef4444'
                        : simulationData.safety_level === 'WARNING'
                        ? '#f59e0b'
                        : '#10b981',
                  }}
                >
                  <div className="safety-icon-large">
                    {simulationData.safety_level === 'DANGER'
                      ? '🚨'
                      : simulationData.safety_level === 'WARNING'
                      ? '⚠️'
                      : '✅'}
                  </div>
                  <div>
                    <span className="safety-banner-label">
                      PREDICTED SAFETY STATUS: {simulationData.safety_level || 'EVALUATED'}
                    </span>
                    <strong
                      className="safety-banner-title"
                      style={{
                        color:
                          simulationData.safety_level === 'DANGER'
                            ? '#ef4444'
                            : simulationData.safety_level === 'WARNING'
                            ? '#f59e0b'
                            : '#10b981',
                      }}
                    >
                      {simulationData.impact_summary || 'Conditions evaluated against vessel safety margins.'}
                    </strong>
                  </div>
                </div>

                {/* KEY TELEMETRY DELTAS GRID */}
                <div className="sim-metrics-grid">
                  <div className="metric-box">
                    <span className="metric-title">Projected Wave Height</span>
                    <strong className="metric-val">{simulationData.simulated_wave_m ?? (deltaWave + 1.1).toFixed(1)} m</strong>
                    <small className="metric-sub">Base + {deltaWave}m surge</small>
                  </div>
                  <div className="metric-box">
                    <span className="metric-title">Effective Wind Speed</span>
                    <strong className="metric-val">{windKnots} kts</strong>
                    <small className="metric-sub">{Math.round(windKnots * 0.5144)} m/s velocity</small>
                  </div>
                  <div className="metric-box">
                    <span className="metric-title">Predicted SST</span>
                    <strong className="metric-val">{simulationData.simulated_sst_c ?? (28.4 + deltaSst).toFixed(1)} °C</strong>
                    <small className="metric-sub">{deltaSst >= 0 ? `+${deltaSst}` : deltaSst}°C deviation</small>
                  </div>
                  <div className="metric-box">
                    <span className="metric-title">Marine Safety Index</span>
                    <strong
                      className="metric-val"
                      style={{
                        color:
                          (simulationData.simulated_msi_score ?? 60) > 80
                            ? '#10b981'
                            : (simulationData.simulated_msi_score ?? 60) > 50
                            ? '#f59e0b'
                            : '#ef4444',
                      }}
                    >
                      {simulationData.simulated_msi_score ?? Math.max(15, 95 - windKnots - Math.round(deltaWave * 10))} / 100
                    </strong>
                    <small className="metric-sub">Multi-signal index</small>
                  </div>
                </div>

                {/* OPERATIONAL VESSEL ADVISORY */}
                <div className="sim-advisory-card">
                  <h3 className="advisory-title">⚓ Operational Advisory for Vessels</h3>
                  <div className="advisory-row">
                    <span className="vessel-type">Country Crafts &amp; Catamarans (&lt;10m):</span>
                    <span className={`advisory-pill ${windKnots >= 22 || deltaWave >= 1.8 ? 'pill-danger' : 'pill-safe'}`}>
                      {windKnots >= 22 || deltaWave >= 1.8 ? '⛔ PROHIBITED FROM SAILING' : '✅ SAFE FOR COASTAL OPERATION'}
                    </span>
                  </div>
                  <div className="advisory-row">
                    <span className="vessel-type">Motorized Gillnetters &amp; Trawlers (10-18m):</span>
                    <span className={`advisory-pill ${windKnots >= 32 || deltaWave >= 2.5 ? 'pill-danger' : windKnots >= 22 ? 'pill-warn' : 'pill-safe'}`}>
                      {windKnots >= 32 || deltaWave >= 2.5 ? '⛔ EXTREME RISK - HARBOR RETURN' : windKnots >= 22 ? '⚠️ CAUTION - STAY NEAR SHORE' : '✅ FAVORABLE FOR VOYAGE'}
                    </span>
                  </div>
                  <div className="advisory-row">
                    <span className="vessel-type">Pelagic Fishery Yield &amp; PFZ Gradient:</span>
                    <span className="advisory-pill pill-info">
                      {deltaSst >= 1.5 ? '📉 Pelagic species moving deeper; PFZs shifting offshore' : '📈 Upwelling frontal gradients active'}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 2: EVALUATOR & DEMO SCENARIOS */}
      {activeTab === 'demo' && (
        <div className="demo-scenarios-container">
          <div className="demo-intro-banner">
            <h2>⭐ 1-Click Operational Demonstration Scenarios</h2>
            <p>
              Pre-computed end-to-end maritime scenarios verifying ORCA&apos;s PFZ discovery, automated collision-avoidance detour routing, and multi-modal land-to-shore navigation.
            </p>
          </div>

          <div className="demo-cards-grid">
            {DEMO_SCENARIO_CARDS.map((card) => (
              <div key={card.id} className="demo-card">
                <div className="demo-card-header">
                  <h3 className="demo-card-title">{card.title}</h3>
                  <span className="demo-coords-tag">{card.coords}</span>
                </div>
                <p className="demo-location-sub">📍 {card.location}</p>
                <p className="demo-card-desc">{card.description}</p>

                <div className="demo-highlights">
                  {card.highlights.map((h, i) => (
                    <span key={i} className="demo-highlight-badge">✓ {h}</span>
                  ))}
                </div>

                <div className="demo-card-footer">
                  <button
                    type="button"
                    className="btn-launch-demo"
                    onClick={() => handleLaunchDemoScenario(card.presetKey)}
                  >
                    🚀 Launch Scenario on Map Explorer &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
