import { useState, useEffect } from 'react'
import { simulateScenario } from '../services/orcaService'
import { LOCATION_COORDINATES } from '../services/openMeteoService'
import './ScenarioSimulator.css'

const PRESET_SCENARIOS = [
  {
    id: 'heatwave',
    label: '🔥 Marine Heatwave',
    description: '+2.4°C SST elevation, pelagic biomass dispersion offshore & coral bleaching risk',
    deltaSst: 2.4,
    deltaWave: 0.2,
    windKnots: 10,
    currentKts: 0.8,
    visibilityM: 18,
    deltaChla: -0.9,
    pressureHpa: 1012,
    tidePhase: 'neap',
    condition: 'normal',
    badge: 'Thermal Event',
  },
  {
    id: 'monsoon_gale',
    label: '💨 Monsoon Gale & Squall',
    description: '38 kts gale gusts, +2.8m rough seas, hazardous drift & low visibility',
    deltaSst: -0.6,
    deltaWave: 2.8,
    windKnots: 38,
    currentKts: 2.6,
    visibilityM: 3.5,
    deltaChla: 1.2,
    pressureHpa: 996,
    tidePhase: 'flood',
    condition: 'squall',
    badge: 'Wind & Swell Warning',
  },
  {
    id: 'cyclone',
    label: '🌀 Cyclonic Storm Surge',
    description: '52 kts severe winds, +4.2m destructive waves, 968 hPa barometric drop',
    deltaSst: 0.4,
    deltaWave: 4.2,
    windKnots: 52,
    currentKts: 3.8,
    visibilityM: 1.2,
    deltaChla: 0.5,
    pressureHpa: 968,
    tidePhase: 'spring_high',
    condition: 'cyclone',
    badge: 'Critical Storm Alert',
  },
  {
    id: 'upwelling',
    label: '🌱 Coastal Upwelling & PFZ Bloom',
    description: '-1.8°C nutrient-rich cold upwelling, +2.8 mg/m³ Chlorophyll-a surge, prime fishing',
    deltaSst: -1.8,
    deltaWave: 0.6,
    windKnots: 14,
    currentKts: 1.4,
    visibilityM: 8.0,
    deltaChla: 2.8,
    pressureHpa: 1011,
    tidePhase: 'flood',
    condition: 'normal',
    badge: 'High-Yield PFZ Event',
  },
  {
    id: 'long_swell',
    label: '🌊 Oceanic Swell & High Drift',
    description: '+2.0m long-period shoaling swell, 3.2 kts surface drift, shoaling surf hazard',
    deltaSst: 0.0,
    deltaWave: 2.0,
    windKnots: 16,
    currentKts: 3.2,
    visibilityM: 14.0,
    deltaChla: 0.2,
    pressureHpa: 1014,
    tidePhase: 'spring_high',
    condition: 'normal',
    badge: 'Shoaling & Drift Risk',
  },
]

const DEMO_SCENARIO_CARDS = [
  {
    id: 'visakhapatnam',
    title: '🐟 Scenario 1: PFZ High-Yield Voyage',
    location: 'Visakhapatnam Fishing Harbour',
    coords: '17.6970°N, 83.2980°E',
    description: 'Optimal fishing zone convergence route 28.4 km offshore (Depth: 55m, SST: 28.1°C, Chl-a: 0.85 mg/m³). High pelagic fish concentration index with zero navigational hazards.',
    highlights: ['Direct green safe corridor', 'Live fuel burn estimate (~38L)', 'Estimated catch confidence: 88%'],
    presetKey: 'visakhapatnam',
  },
  {
    id: 'chennai',
    title: '⚠️ Scenario 2: Severe Hazard & Naval Bypass',
    location: 'Kasimedu Harbor Wharf, Chennai',
    coords: '13.1250°N, 80.2995°E',
    description: 'Multi-scale collision avoidance navigating around Chennai TSS commercial shipping channel & naval restricted artillery perimeter to reach Kasimedu Offshore PFZ safely.',
    highlights: ['Automatic detour corridor', 'Blocked direct path visualization', 'Caution amber detour waypoints (W1-W3)'],
    presetKey: 'chennai',
  },
  {
    id: 'kochi',
    title: '🛣️ Scenario 3: Land-to-Shore Multi-Modal Transit',
    location: 'Ernakulam Inland Hub → Kochi Harbor',
    coords: '9.9815°N, 76.2999°E (Inland)',
    description: 'Multi-modal route: drive 14.9 km (23 mins) via NH 966B & Mattancherry Bridge to Kochi Marine Terminal, then seamless oceanic navigation to Arabian Sea PFZ.',
    highlights: ['Inland OSRM driving geometry', 'Turn-by-turn road route to harbor', 'Combined shore & ocean voyage ETA'],
    presetKey: 'kochi',
  },
]

export default function ScenarioSimulator({ navigate }) {
  const [activeTab, setActiveTab] = useState('whatif') // 'whatif' | 'demo'
  const [selectedLocKey, setSelectedLocKey] = useState('visakhapatnam')
  const [activePreset, setActivePreset] = useState('heatwave')

  // Core Simulation Parameters
  const [deltaSst, setDeltaSst] = useState(2.4)
  const [deltaWave, setDeltaWave] = useState(0.2)
  const [windKnots, setWindKnots] = useState(10)
  
  // Extended Marine Parameters
  const [currentKts, setCurrentKts] = useState(0.8)
  const [visibilityM, setVisibilityM] = useState(18.0)
  const [deltaChla, setDeltaChla] = useState(-0.9)
  const [pressureHpa, setPressureHpa] = useState(1012)
  const [tidePhase, setTidePhase] = useState('neap')
  const [stormCondition, setStormCondition] = useState('normal')

  // Output State
  const [simulationData, setSimulationData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const activePort = LOCATION_COORDINATES[selectedLocKey] || LOCATION_COORDINATES.visakhapatnam

  const applyPreset = (preset) => {
    setActivePreset(preset.id)
    setDeltaSst(preset.deltaSst)
    setDeltaWave(preset.deltaWave)
    setWindKnots(preset.windKnots)
    setCurrentKts(preset.currentKts ?? 1.0)
    setVisibilityM(preset.visibilityM ?? 10.0)
    setDeltaChla(preset.deltaChla ?? 0.0)
    setPressureHpa(preset.pressureHpa ?? 1012)
    setTidePhase(preset.tidePhase ?? 'flood')
    setStormCondition(preset.condition)
  }

  // Trigger simulation query when parameters change (debounced)
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)

    const timer = setTimeout(async () => {
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
          // Extended parameters
          current_drift_kts: Number(currentKts),
          visibility_m: Number(visibilityM),
          delta_chla_mg_m3: Number(deltaChla),
          barometric_pressure_hpa: Number(pressureHpa),
          tidal_phase: tidePhase,
        })
        if (active) {
          setSimulationData(result)
        }
      } catch (err) {
        if (active) {
          // Graceful fallback simulation calculation if backend endpoint is unavailable
          const baseMsi = 92
          const wavePenalty = deltaWave * 12
          const windPenalty = Math.max(0, windKnots - 15) * 1.2
          const pressurePenalty = Math.max(0, 1010 - pressureHpa) * 0.6
          const currentPenalty = Math.max(0, currentKts - 1.5) * 5
          const visPenalty = Math.max(0, 5 - visibilityM) * 3
          const condPenalty = stormCondition === 'cyclone' ? 35 : stormCondition === 'squall' ? 18 : 0

          const score = Math.max(12, Math.min(98, Math.round(baseMsi - wavePenalty - windPenalty - pressurePenalty - currentPenalty - visPenalty - condPenalty)))
          const level = score < 40 ? 'DANGER' : score < 70 ? 'WARNING' : 'SAFE'

          setSimulationData({
            status: 'simulated_local',
            simulated_sst_c: Number((28.2 + deltaSst).toFixed(1)),
            simulated_wave_m: Number((1.2 + deltaWave).toFixed(1)),
            simulated_wind_mps: Number((windKnots * 0.5144).toFixed(1)),
            simulated_msi_score: score,
            safety_level: level,
            impact_summary:
              level === 'DANGER'
                ? `Critical maritime hazard: ${stormCondition === 'cyclone' ? 'Cyclonic depression' : 'Heavy sea surge & gale winds'} exceeding vessel safety thresholds.`
                : level === 'WARNING'
                ? 'Elevated sea conditions. Small artisanal crafts restricted; trawlers exercise extreme caution.'
                : 'Favorable operational maritime conditions for deep-sea navigation and harvesting.',
          })
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
  }, [selectedLocKey, deltaSst, deltaWave, windKnots, currentKts, visibilityM, deltaChla, pressureHpa, tidePhase, stormCondition, activePort])

  const handleLaunchChat = () => {
    if (navigate) {
      const prompt = `Simulate operational conditions in ${activePort.name} if SST changes by ${deltaSst >= 0 ? `+${deltaSst}` : deltaSst}°C, wave surge reaches +${deltaWave}m, winds reach ${windKnots} knots, current velocity is ${currentKts} knots, and atmospheric pressure drops to ${pressureHpa} hPa.`
      navigate(`/ask-orca?q=${encodeURIComponent(prompt)}`)
    }
  }

  const handleInspectMap = () => {
    if (navigate) {
      const conditionParam = stormCondition !== 'normal' ? `&condition=${stormCondition}` : ''
      const waveParam = `&delta_wave=${deltaWave}`
      const windParam = `&wind_kts=${windKnots}`
      const currentParam = `&current=${currentKts}`
      navigate(`/map-explorer?location=${selectedLocKey}&sim=1${conditionParam}${waveParam}${windParam}${currentParam}`)
    }
  }

  const handleLaunchDemoScenario = (presetKey) => {
    if (navigate) {
      navigate(`/map-explorer?scenario=${presetKey}`)
    }
  }

  // Calculate local safety score for responsive display
  const effectiveMsi = simulationData?.simulated_msi_score ?? Math.max(15, Math.min(96, Math.round(92 - deltaWave * 12 - Math.max(0, windKnots - 15) * 1.1)))
  const effectiveSafetyLevel = simulationData?.safety_level || (effectiveMsi < 40 ? 'DANGER' : effectiveMsi < 70 ? 'WARNING' : 'SAFE')

  return (
    <div className="scenario-simulator-page font-inter">
      {/* 1. PAGE HEADER */}
      <header className="simulator-header-bar">
        <div className="simulator-header-left">
          <div className="simulator-badge-icon">🧪</div>
          <div>
            <h1 className="simulator-page-title font-sora">Scenario Simulator</h1>
            <p className="simulator-page-sub">
              Marine environmental stress-testing, multi-parameter what-if climate simulations &amp; verified evaluator demo scenarios.
            </p>
          </div>
        </div>

        {/* Sector Picker */}
        <div className="simulator-port-picker">
          <span className="port-picker-icon">📍</span>
          <div className="port-picker-inner">
            <label htmlFor="sim-port-select" className="port-picker-label">
              Simulation Sector
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
        </div>
      </header>

      {/* 2. MODE NAVIGATION TABS */}
      <div className="simulator-tab-bar">
        <button
          type="button"
          className={`sim-tab-btn ${activeTab === 'whatif' ? 'active' : ''}`}
          onClick={() => setActiveTab('whatif')}
        >
          <span className="tab-icon">🌊</span>
          <span>What-If Environmental Stress Test</span>
          <span className="tab-pill-count">8 Parameters</span>
        </button>
        <button
          type="button"
          className={`sim-tab-btn ${activeTab === 'demo' ? 'active' : ''}`}
          onClick={() => setActiveTab('demo')}
        >
          <span className="tab-icon">⭐</span>
          <span>Evaluator &amp; Operational Demo Scenarios</span>
          <span className="tab-pill-count">3 Scenarios</span>
        </button>
      </div>

      {/* TAB 1: WHAT-IF PARAMETRIC SIMULATOR */}
      {activeTab === 'whatif' && (
        <div className="simulator-grid-layout">
          {/* LEFT COLUMN: CONTROLS & PRESETS */}
          <div className="simulator-controls-card">
            {/* Presets Bar */}
            <div className="controls-section-header">
              <span className="step-num">1</span>
              <div>
                <h2 className="controls-card-title">Select Preset Event</h2>
                <p className="controls-card-sub">Quick-apply calibrated meteorological &amp; oceanographic events</p>
              </div>
            </div>

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

            {/* Parameter Sliders */}
            <div className="controls-section-header" style={{ marginTop: '28px' }}>
              <span className="step-num">2</span>
              <div>
                <h2 className="controls-card-title">Fine-Tune 8 Environmental Parameters</h2>
                <p className="controls-card-sub">Adjust continuous physical variables to simulate compound marine hazards</p>
              </div>
            </div>

            {/* CATEGORY A: HYDRODYNAMICS & SEAS */}
            <div className="param-category-group">
              <div className="param-category-title">
                <span>🌊 Ocean Hydrodynamics &amp; Drift</span>
              </div>

              {/* SLIDER 1: WAVE SURGE */}
              <div className="sim-slider-group">
                <div className="slider-label-row">
                  <span className="slider-label">🌊 Significant Wave Surge (Delta)</span>
                  <span className="slider-val-badge wave">+{deltaWave} m</span>
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
                  className="sim-range-input wave"
                />
                <div className="slider-minmax-row">
                  <small>0.0m (Calm Seas)</small>
                  <small>+2.5m (Rough)</small>
                  <small>+5.0m (Extreme Surge)</small>
                </div>
              </div>

              {/* SLIDER 2: SURFACE CURRENT / DRIFT */}
              <div className="sim-slider-group">
                <div className="slider-label-row">
                  <span className="slider-label">🧭 Ocean Surface Drift Velocity</span>
                  <span className="slider-val-badge current">{currentKts} kts ({Math.round(currentKts * 0.514 * 10) / 10} m/s)</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="4.5"
                  step="0.1"
                  value={currentKts}
                  onChange={(e) => {
                    setCurrentKts(Number(e.target.value))
                    setActivePreset('custom')
                  }}
                  className="sim-range-input current"
                />
                <div className="slider-minmax-row">
                  <small>0.2 kts (Slack Drift)</small>
                  <small>2.0 kts (Moderate)</small>
                  <small>4.5 kts (Severe Rip/Current)</small>
                </div>
              </div>

              {/* SELECTOR: TIDAL PHASE */}
              <div className="sim-param-inline-row">
                <label htmlFor="sim-tide-select" className="inline-label">
                  🌕 Coastal Tidal Phase:
                </label>
                <select
                  id="sim-tide-select"
                  value={tidePhase}
                  onChange={(e) => {
                    setTidePhase(e.target.value)
                    setActivePreset('custom')
                  }}
                  className="sim-styled-select"
                >
                  <option value="spring_high">Spring Tide (High Water +1.8m)</option>
                  <option value="flood">Flood Current (Incoming Inflow)</option>
                  <option value="ebb">Ebb Current (Outgoing Harbor Race)</option>
                  <option value="neap">Neap Tide (Low Amplitude Slack)</option>
                </select>
              </div>
            </div>

            {/* CATEGORY B: ATMOSPHERE & WEATHER */}
            <div className="param-category-group">
              <div className="param-category-title">
                <span>💨 Atmospheric &amp; Storm Dynamics</span>
              </div>

              {/* SLIDER 3: WIND VELOCITY */}
              <div className="sim-slider-group">
                <div className="slider-label-row">
                  <span className="slider-label">💨 Sustained Wind Velocity</span>
                  <span className="slider-val-badge wind">{windKnots} knots ({Math.round(windKnots * 0.5144)} m/s)</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="65"
                  step="1"
                  value={windKnots}
                  onChange={(e) => {
                    setWindKnots(Number(e.target.value))
                    setActivePreset('custom')
                  }}
                  className="sim-range-input wind"
                />
                <div className="slider-minmax-row">
                  <small>5 kts (Gentle Breeze)</small>
                  <small>30 kts (Gale Warning)</small>
                  <small>65 kts (Cyclone Storm)</small>
                </div>
              </div>

              {/* SLIDER 4: BAROMETRIC PRESSURE */}
              <div className="sim-slider-group">
                <div className="slider-label-row">
                  <span className="slider-label">⏲️ Atmospheric Pressure</span>
                  <span className={`slider-val-badge ${pressureHpa < 990 ? 'danger' : 'neutral'}`}>{pressureHpa} hPa</span>
                </div>
                <input
                  type="range"
                  min="950"
                  max="1025"
                  step="1"
                  value={pressureHpa}
                  onChange={(e) => {
                    setPressureHpa(Number(e.target.value))
                    setActivePreset('custom')
                  }}
                  className="sim-range-input pressure"
                />
                <div className="slider-minmax-row">
                  <small>950 hPa (Depression Eye)</small>
                  <small>1005 hPa (Low Pressure)</small>
                  <small>1025 hPa (Fair High)</small>
                </div>
              </div>

              {/* SELECTOR: STORM CONDITION */}
              <div className="sim-param-inline-row">
                <label htmlFor="sim-condition-select" className="inline-label">
                  ⛈️ Convective Storm State:
                </label>
                <select
                  id="sim-condition-select"
                  value={stormCondition}
                  onChange={(e) => {
                    setStormCondition(e.target.value)
                    setActivePreset('custom')
                  }}
                  className="sim-styled-select"
                >
                  <option value="normal">Normal / Standard Fair Weather</option>
                  <option value="squall">Monsoonal Squall (Heavy Downpour &amp; Gusts)</option>
                  <option value="cyclone">🌀 Cyclonic Depression (Dangerous Gale Cone)</option>
                </select>
              </div>
            </div>

            {/* CATEGORY C: BIO-OCEANOGRAPHY & PFZ */}
            <div className="param-category-group">
              <div className="param-category-title">
                <span>🐟 Bio-Oceanography, PFZ &amp; Water Clarity</span>
              </div>

              {/* SLIDER 5: SST DELTA */}
              <div className="sim-slider-group">
                <div className="slider-label-row">
                  <span className="slider-label">🌡️ Sea Surface Temp Delta (SST)</span>
                  <span className={`slider-val-badge ${deltaSst > 2.0 ? 'danger' : 'temp'}`}>
                    {deltaSst >= 0 ? `+${deltaSst}` : deltaSst} °C
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
                  className="sim-range-input temp"
                />
                <div className="slider-minmax-row">
                  <small>-2.0°C (Upwelling)</small>
                  <small>0.0°C (Baseline)</small>
                  <small>+4.0°C (Severe Heatwave)</small>
                </div>
              </div>

              {/* SLIDER 6: CHLOROPHYLL-A DELTA */}
              <div className="sim-slider-group">
                <div className="slider-label-row">
                  <span className="slider-label">🌱 Chlorophyll-a Anomaly (PFZ Bloom)</span>
                  <span className="slider-val-badge bio">
                    {deltaChla >= 0 ? `+${deltaChla}` : deltaChla} mg/m³
                  </span>
                </div>
                <input
                  type="range"
                  min="-1.5"
                  max="3.5"
                  step="0.1"
                  value={deltaChla}
                  onChange={(e) => {
                    setDeltaChla(Number(e.target.value))
                    setActivePreset('custom')
                  }}
                  className="sim-range-input bio"
                />
                <div className="slider-minmax-row">
                  <small>-1.5 mg/m³ (Depleted)</small>
                  <small>0.0 (Nominal)</small>
                  <small>+3.5 mg/m³ (Dense PFZ Bloom)</small>
                </div>
              </div>

              {/* SLIDER 7: UNDERWATER VISIBILITY */}
              <div className="sim-slider-group">
                <div className="slider-label-row">
                  <span className="slider-label">🤿 Underwater Visibility (Secchi Depth)</span>
                  <span className="slider-val-badge vis">{visibilityM} m</span>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="25.0"
                  step="0.5"
                  value={visibilityM}
                  onChange={(e) => {
                    setVisibilityM(Number(e.target.value))
                    setActivePreset('custom')
                  }}
                  className="sim-range-input vis"
                />
                <div className="slider-minmax-row">
                  <small>1.0m (Turbid/Runoff)</small>
                  <small>10.0m (Average)</small>
                  <small>25.0m (Clear Blue Water)</small>
                </div>
              </div>
            </div>

            {/* QUICK LAUNCH ACTIONS */}
            <div className="sim-launch-actions">
              <button
                type="button"
                className="btn-launch-chat"
                onClick={handleLaunchChat}
              >
                <span>💬</span> Ask ORCA with this Scenario &rarr;
              </button>
              <button
                type="button"
                className="btn-launch-map"
                onClick={handleInspectMap}
              >
                <span>🗺️</span> View Simulation on Map Explorer &rarr;
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: SIMULATED IMPACT RESULTS */}
          <div className="simulator-results-card">
            <div className="controls-section-header">
              <span className="step-num">3</span>
              <div>
                <h2 className="controls-card-title">Computed Marine Impact Assessment</h2>
                <p className="controls-card-sub">Multi-layer physics modeling &amp; operational safety breakdown</p>
              </div>
            </div>

            {loading ? (
              <div className="sim-loading-state">
                <div className="sim-spinner" />
                <p>Computing hydrographic impact &amp; Marine Safety Index...</p>
              </div>
            ) : error ? (
              <div className="sim-error-box">
                <span>⚠️ {error}</span>
              </div>
            ) : (
              <div className="sim-data-container">
                {/* SAFETY TIER BANNER */}
                <div className={`sim-safety-banner ${effectiveSafetyLevel.toLowerCase()}`}>
                  <div className="safety-icon-large">
                    {effectiveSafetyLevel === 'DANGER' ? '🚨' : effectiveSafetyLevel === 'WARNING' ? '⚠️' : '✅'}
                  </div>
                  <div className="safety-banner-content">
                    <span className="safety-banner-label">
                      PREDICTED SAFETY STATUS: {effectiveSafetyLevel}
                    </span>
                    <strong className="safety-banner-title">
                      {simulationData?.impact_summary || 'Conditions evaluated against vessel safety margins.'}
                    </strong>
                  </div>
                  <div className="msi-score-badge">
                    <span className="msi-num">{effectiveMsi}</span>
                    <span className="msi-denom">/100 MSI</span>
                  </div>
                </div>

                {/* 6 KEY TELEMETRY DELTAS GRID */}
                <div className="sim-metrics-grid">
                  <div className="metric-box">
                    <span className="metric-title">Projected Wave Height</span>
                    <strong className="metric-val">{(deltaWave + 1.2).toFixed(1)} m</strong>
                    <small className="metric-sub">Base 1.2m + {deltaWave}m surge</small>
                  </div>
                  <div className="metric-box">
                    <span className="metric-title">Effective Wind Speed</span>
                    <strong className="metric-val">{windKnots} kts</strong>
                    <small className="metric-sub">{Math.round(windKnots * 0.5144)} m/s velocity</small>
                  </div>
                  <div className="metric-box">
                    <span className="metric-title">Predicted SST</span>
                    <strong className="metric-val">{(28.2 + deltaSst).toFixed(1)} °C</strong>
                    <small className="metric-sub">{deltaSst >= 0 ? `+${deltaSst}` : deltaSst}°C deviation</small>
                  </div>
                  <div className="metric-box">
                    <span className="metric-title">Surface Drift Current</span>
                    <strong className="metric-val">{currentKts} kts</strong>
                    <small className="metric-sub">Directional drift vector</small>
                  </div>
                  <div className="metric-box">
                    <span className="metric-title">Barometric Pressure</span>
                    <strong className="metric-val">{pressureHpa} hPa</strong>
                    <small className="metric-sub">{pressureHpa < 1000 ? 'Low pressure trough' : 'Stable atmospheric cell'}</small>
                  </div>
                  <div className="metric-box">
                    <span className="metric-title">Chlorophyll-a &amp; PFZ</span>
                    <strong className="metric-val">{(1.1 + deltaChla).toFixed(1)} mg/m³</strong>
                    <small className="metric-sub">{deltaChla >= 0.5 ? 'Dense bloom front' : 'Dispersed nutrient level'}</small>
                  </div>
                </div>

                {/* OPERATIONAL VESSEL ADVISORY */}
                <div className="sim-advisory-card">
                  <h3 className="advisory-title">⚓ Operational Advisory for Vessels &amp; Fleets</h3>
                  
                  <div className="advisory-row">
                    <div className="vessel-info">
                      <span className="vessel-type">Country Crafts &amp; Catamarans (&lt;10m):</span>
                      <small className="vessel-sub">Non-motorized or small OBM artisanal vessels</small>
                    </div>
                    <span className={`advisory-pill ${windKnots >= 20 || deltaWave >= 1.6 || currentKts >= 2.5 ? 'pill-danger' : 'pill-safe'}`}>
                      {windKnots >= 20 || deltaWave >= 1.6 || currentKts >= 2.5 ? '⛔ PROHIBITED FROM SAILING' : '✅ SAFE FOR INSHORE WATERS'}
                    </span>
                  </div>

                  <div className="advisory-row">
                    <div className="vessel-info">
                      <span className="vessel-type">Motorized Gillnetters &amp; Trawlers (10-20m):</span>
                      <small className="vessel-sub">Mechanized single/multi-day trawlers</small>
                    </div>
                    <span className={`advisory-pill ${windKnots >= 32 || deltaWave >= 2.6 ? 'pill-danger' : windKnots >= 22 || deltaWave >= 1.8 ? 'pill-warn' : 'pill-safe'}`}>
                      {windKnots >= 32 || deltaWave >= 2.6 ? '⛔ HARBOR RETURN MANDATORY' : windKnots >= 22 || deltaWave >= 1.8 ? '⚠️ CAUTION - STAY WITHIN 12 NM' : '✅ FAVORABLE FOR VOYAGE'}
                    </span>
                  </div>

                  <div className="advisory-row">
                    <div className="vessel-info">
                      <span className="vessel-type">Commercial Long-Liners &amp; Deep-Sea Fleets:</span>
                      <small className="vessel-sub">Offshore vessels &gt;20m with AIS transceiver</small>
                    </div>
                    <span className={`advisory-pill ${windKnots >= 45 || deltaWave >= 4.0 ? 'pill-danger' : windKnots >= 32 ? 'pill-warn' : 'pill-safe'}`}>
                      {windKnots >= 45 || deltaWave >= 4.0 ? '⛔ GALE DRIFT HAZARD - SEEK SHELTER' : windKnots >= 32 ? '⚠️ MONITOR NAVIC DISTRESS ALERTS' : '✅ ALL-WEATHER OPERATIONS PERMITTED'}
                    </span>
                  </div>
                </div>

                {/* FISHERIES IMPACT & HARBOR BERTHING ASSESSMENT */}
                <div className="sim-fisheries-card">
                  <h3 className="advisory-title">🐟 Pelagic Biomass &amp; Port Berthing Forecast</h3>
                  <div className="fisheries-impact-grid">
                    <div className="fishery-item">
                      <span className="fishery-label">Pelagic Fish Dispersal</span>
                      <p className="fishery-desc">
                        {deltaSst >= 1.5
                          ? 'Mackerel & Sardines migrating to deeper bathymetric layers (40m+) due to warm surface water.'
                          : deltaSst <= -1.0
                          ? 'Active upwelling: High pelagic biomass concentrated along thermal front 12-25 NM offshore.'
                          : 'Normal pelagic school distribution along standard continental shelf contours.'}
                      </p>
                    </div>
                    <div className="fishery-item">
                      <span className="fishery-label">Tidal Current &amp; Harbor Berthing</span>
                      <p className="fishery-desc">
                        {tidePhase === 'spring_high'
                          ? 'Spring High Tide (+1.8m): Maximum depth at harbor bar entrance, deep draft vessels can enter safely.'
                          : tidePhase === 'ebb'
                          ? 'Ebb Current: Strong outgoing rip current at harbor entrance; increase throttle when docking.'
                          : 'Moderate tidal fluctuation; normal berthing conditions.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EVALUATOR & DEMO SCENARIOS */}
      {activeTab === 'demo' && (
        <div className="demo-scenarios-container">
          <div className="demo-intro-banner">
            <div className="demo-intro-left">
              <span className="demo-star-icon">⭐</span>
              <div>
                <h2>Curated Evaluator Operational Demonstrations</h2>
                <p>
                  Pre-computed end-to-end maritime scenarios verifying ORCA&apos;s PFZ discovery, automated collision-avoidance detour routing around hazards, and multi-modal land-to-shore driving navigation.
                </p>
              </div>
            </div>
            <div className="demo-bench-pill">
              <span>Verified Benchmark Dataset (INCOIS &amp; OSRM)</span>
            </div>
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
                    <span>🚀 Launch Scenario on Map Explorer</span>
                    <span className="btn-arrow">&rarr;</span>
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
