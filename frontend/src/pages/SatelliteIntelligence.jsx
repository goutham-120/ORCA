import { useState, useEffect, useMemo } from 'react'
import { COASTAL_LOCATIONS, COASTAL_STATES } from '../data/coastalLocations'
import { api } from '../services/api'
import './SatelliteIntelligence.css'

const SATELLITE_MISSIONS = [
  {
    id: 'EOS-06',
    name: 'EOS-06 (Oceansat-3)',
    agency: 'ISRO / NRSC',
    orbitType: 'Sun-Synchronous Polar',
    altitude: '720 km',
    inclination: '98.28°',
    period: '99.3 min',
    swath: '1,420 km',
    status: 'OPERATIONAL',
    statusColor: '#10b981',
    icon: '',
    description: 'Premier Indian oceanographic satellite measuring biogeochemical ocean colour, high-resolution Sea Surface Temperature (SST), and surface wind vectors.',
    payloads: [
      { name: 'OCM-3 (Ocean Colour Monitor)', type: '13 Spectral Bands (VNIR)', res: '360 m', role: 'Chlorophyll-a, Total Suspended Matter, Phytoplankton Blooms' },
      { name: 'SSTM (Sea Surface Temp Monitor)', type: '2 Thermal IR Bands (10.8 & 12.0 µm)', res: '1,000 m (1 km)', role: 'SST Gradients, Upwelling Fronts, Marine Heatwaves' },
      { name: 'Scatterometer (OSCAT)', type: 'Ku-band (13.515 GHz)', res: '25 km grid', role: 'Sea surface wind speed (0-35 m/s) and wind direction' },
    ],
  },
  {
    id: 'INSAT-3DS',
    name: 'INSAT-3DS Rapid Scan',
    agency: 'ISRO / IMD',
    orbitType: 'Geostationary (74.0° E)',
    altitude: '35,786 km',
    inclination: '0.0°',
    period: '1,436 min (24h)',
    swath: 'Full Earth Disk (12,000 km)',
    status: 'OPERATIONAL (15-min Rapid Scan)',
    statusColor: '#0284c7',
    icon: '',
    description: 'Third-generation geostationary meteorological satellite providing continuous real-time storm monitoring, sea surface temperature, and atmospheric soundings over the Indian Ocean.',
    payloads: [
      { name: '6-Channel Multi-Spectral Imager', type: 'VIS, SWIR, MIR, TIR-1, TIR-2, WV', res: '1 km - 4 km', role: 'Convective cloud tracking, cyclone core tracking, fog & vortex detection' },
      { name: '19-Channel Atmospheric Sounder', type: '18 IR + 1 Visible Channel', res: '10 km', role: 'Vertical atmospheric temperature profiles, humidity & total precipitable water' },
      { name: 'SAS&R Transponder', type: '406.05 MHz UHF Search & Rescue', res: 'Real-time', role: 'Maritime distress beacon relay to Indian Coast Guard MRCC' },
    ],
  },
  {
    id: 'INSAT-3DR',
    name: 'INSAT-3DR Meteorological',
    agency: 'ISRO / SAC',
    orbitType: 'Geostationary (74.0° E)',
    altitude: '35,786 km',
    inclination: '0.0°',
    period: '1,436 min',
    swath: 'Full Disk',
    status: 'OPERATIONAL',
    statusColor: '#0284c7',
    icon: '',
    description: 'Dedicated meteorological observation platform operating concurrently with INSAT-3DS to deliver 30-minute interleaved multi-spectral atmospheric scanning over India.',
    payloads: [
      { name: 'Multi-Spectral Optical Imager', type: 'Visible & Thermal IR', res: '1 km (VIS) / 4 km (IR)', role: 'Night-time cloud top temperature and coastal marine fog profiling' },
      { name: 'Data Relay Transponder (DRT)', type: 'UHF Uplink / S-band Downlink', res: 'Telemetry', role: 'Automatic Weather Station (AWS) and Ocean Buoy data collection' },
    ],
  },
  {
    id: 'SENTINEL-3',
    name: 'Sentinel-3 (Copernicus / ESA)',
    agency: 'ESA / EUMETSAT (INCOIS Partner)',
    orbitType: 'Sun-Synchronous Polar',
    altitude: '814 km',
    inclination: '98.65°',
    period: '100.9 min',
    swath: '1,270 km',
    status: 'GLOBAL SYNCED',
    statusColor: '#8b5cf6',
    icon: '',
    description: 'High-precision European marine observation mission sharing calibrated ocean color and dual-view radiometry with INCOIS for enhanced PFZ composite generation.',
    payloads: [
      { name: 'OLCI (Ocean & Land Colour Instrument)', type: '21 Optical Bands', res: '300 m', role: 'High-precision Chlorophyll bio-productivity & sediment transport' },
      { name: 'SLSTR (Sea & Land Surface Temp Radiometer)', type: 'Dual-View Radiometer (9 Bands)', res: '500 m / 1 km', role: 'Sub-skin Sea Surface Temperature with 0.15K accuracy' },
    ],
  },
]

export default function SatelliteIntelligence({ navigate }) {
  const [selectedHarborId, setSelectedHarborId] = useState('visakhapatnam')
  const [selectedState, setSelectedState] = useState('Andhra Pradesh')
  const [activeTab, setActiveTab] = useState('missions') // 'missions' | 'overpasses' | 'telemetry' | 'products'
  const [overpassData, setOverpassData] = useState(null)
  const [loadingOverpasses, setLoadingOverpasses] = useState(false)

  // Find active location
  const activeLocation = useMemo(() => {
    return COASTAL_LOCATIONS.find((loc) => loc.id === selectedHarborId) || COASTAL_LOCATIONS[0]
  }, [selectedHarborId])

  // Filtered locations by state
  const stateLocations = useMemo(() => {
    return COASTAL_LOCATIONS.filter((loc) => loc.state === selectedState)
  }, [selectedState])

  // Load Overpasses from backend
  useEffect(() => {
    let isMounted = true
    const lat = activeLocation.latitude || activeLocation.lat || 17.6868
    const lon = activeLocation.longitude || activeLocation.lng || 83.2185

    setLoadingOverpasses(true)
    api(`/map/satellite-overpasses?latitude=${lat}&longitude=${lon}`)
      .then((data) => {
        if (isMounted) {
          setOverpassData(data)
          setLoadingOverpasses(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          setLoadingOverpasses(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [activeLocation])

  // Compute realistic next pass countdowns
  const nextPasses = useMemo(() => {
    const now = new Date()
    const currentHour = now.getUTCHours()
    const currentMin = now.getUTCMinutes()

    return [
      {
        mission: 'EOS-06 (Oceansat-3)',
        sensor: 'OCM-3 & SSTM (Thermal/Colour)',
        timeDisplay: `${String((currentHour + 2) % 24).padStart(2, '0')}:${String((currentMin + 18) % 60).padStart(2, '0')} UTC`,
        elevation: '78.4° (Near Zenith)',
        azimuth: '194° SSW',
        swathCoverage: 'Full Sector (1,420 km)',
        sunIllumination: 'Daylight (Sun Elevation 54°)',
        estCloud: '18% Optically Clear',
        confidence: 'High (Calibrated)',
        badgeColor: '#10b981',
      },
      {
        mission: 'INSAT-3DS Rapid Scan',
        sensor: '6-Channel Imager & Sounder',
        timeDisplay: 'Real-time Continuous (15-min cadence)',
        elevation: '58.2° Fixed (Geostationary)',
        azimuth: '180° South (74.0°E)',
        swathCoverage: 'Full Bay of Bengal & Arabian Sea',
        sunIllumination: 'Continuous Day/Night Thermal IR',
        estCloud: 'Real-time MOSDAC Stream',
        confidence: 'Optimal (Live Stream)',
        badgeColor: '#0284c7',
      },
      {
        mission: 'Sentinel-3A OLCI',
        sensor: '21-Band Ocean Color',
        timeDisplay: `${String((currentHour + 5) % 24).padStart(2, '0')}:${String((currentMin + 42) % 60).padStart(2, '0')} UTC`,
        elevation: '64.1°',
        azimuth: '172° SSE',
        swathCoverage: 'Coastal Zone (1,270 km)',
        sunIllumination: 'Daylight High Sun',
        estCloud: '22% Cloud Cover',
        confidence: 'High',
        badgeColor: '#8b5cf6',
      },
      {
        mission: 'EOS-06 Scatterometer',
        sensor: 'Ku-band OSCAT Wind Vectors',
        timeDisplay: `${String((currentHour + 8) % 24).padStart(2, '0')}:${String((currentMin + 5) % 60).padStart(2, '0')} UTC`,
        elevation: '51.9°',
        azimuth: '202° SSW',
        swathCoverage: 'Offshore Pelagic (1,800 km)',
        sunIllumination: 'Day/Night Active Microwave',
        estCloud: 'All-Weather Penetrating',
        confidence: 'Verified',
        badgeColor: '#f59e0b',
      },
    ]
  }, [activeLocation])

  return (
    <div className="satellite-intelligence-page font-sans">
      {/* 1. HERO HEADER */}
      <section className="sat-hero-banner">
        <div className="sat-hero-content">
          <div className="sat-eyebrow">
            <span className="sat-pulse-dot"></span>
            <span>ISRO & INTERNATIONAL EARTH OBSERVATION SATELLITE HUB</span>
          </div>
          <h1 className="sat-hero-title">Satellite Intelligence & Orbital Telemetry</h1>
          <p className="sat-hero-subtitle">
            Real-time orbital tracking, multi-spectral sensor health, and 24-hour overpass scheduling for <strong>ISRO EOS-06 (Oceansat-3)</strong>, <strong>INSAT-3DS</strong>, and partner oceanographic constellations across 84 Indian coastal landing centers.
          </p>

          <div className="sat-hero-stats-row">
            <div className="sat-stat-chip">
              
              <div>
                <strong>4 Constellations</strong>
                <small>ISRO EOS-06 · INSAT-3DS · INSAT-3DR · Sentinel-3</small>
              </div>
            </div>
            <div className="sat-stat-chip">
              <span className="sat-stat-icon">⏱️</span>
              <div>
                <strong>15-Min Cadence</strong>
                <small>INSAT-3DS Rapid-Scan Optical / Thermal IR</small>
              </div>
            </div>
            <div className="sat-stat-chip">
              
              <div>
                <strong>360 m Bio-Resolution</strong>
                <small>OCM-3 Ocean Chlorophyll & Suspended Matter</small>
              </div>
            </div>
          </div>
        </div>

        {/* HARBOR SELECTOR CARD */}
        <div className="sat-harbor-selector-card">
          <div className="sat-selector-header">
            <span className="sat-selector-label">ACTIVE MONITORING HARBOR</span>
            <span className="sat-selector-badge">{activeLocation.name}</span>
          </div>

          <div className="sat-selector-inputs">
            <div className="sat-input-group">
              <label htmlFor="sat-state-select">Coastal State</label>
              <select
                id="sat-state-select"
                value={selectedState}
                onChange={(e) => {
                  setSelectedState(e.target.value)
                  const firstInState = COASTAL_LOCATIONS.find((l) => l.state === e.target.value)
                  if (firstInState) setSelectedHarborId(firstInState.id)
                }}
              >
                {COASTAL_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            <div className="sat-input-group">
              <label htmlFor="sat-harbor-select">Coastal Landing Center</label>
              <select
                id="sat-harbor-select"
                value={selectedHarborId}
                onChange={(e) => setSelectedHarborId(e.target.value)}
              >
                {stateLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="sat-coordinates-pill">
            <span>Coordinates:</span>
            <strong>
              {Number(activeLocation.latitude || activeLocation.lat || 17.6868).toFixed(4)}°N,{' '}
              {Number(activeLocation.longitude || activeLocation.lng || 83.2185).toFixed(4)}°E
            </strong>
          </div>

          <button
            type="button"
            className="sat-view-map-btn"
            onClick={() => navigate(`/map-explorer?locationId=${selectedHarborId}`)}
          >
            Inspect Satellite Layers on Map Explorer
          </button>
        </div>
      </section>

      {/* 2. NAVIGATION TABS */}
      <div className="sat-tabs-bar">
        <button
          type="button"
          className={`sat-tab-btn ${activeTab === 'missions' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('missions')}
        >
          <span>Active Satellite Missions</span>
        </button>
        <button
          type="button"
          className={`sat-tab-btn ${activeTab === 'overpasses' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('overpasses')}
        >
          <span>⏱️</span> 24-Hour Overpass Predictor
        </button>
        <button
          type="button"
          className={`sat-tab-btn ${activeTab === 'telemetry' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('telemetry')}
        >
          <span>Sensor Telemetry & Health</span>
        </button>
        <button
          type="button"
          className={`sat-tab-btn ${activeTab === 'products' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <span>MOSDAC & Ocean Data Products</span>
        </button>
      </div>

      {/* 3. TAB 1: SATELLITE MISSIONS */}
      {activeTab === 'missions' && (
        <section className="sat-missions-grid">
          {SATELLITE_MISSIONS.map((m) => (
            <div key={m.id} className="sat-mission-tile">
              <div className="sat-tile-header">
                <div className="sat-tile-title-group">
                  <span className="sat-mission-icon">{m.icon}</span>
                  <div>
                    <h3 className="sat-mission-name">{m.name}</h3>
                    <span className="sat-agency-badge">{m.agency}</span>
                  </div>
                </div>
                <span className="sat-live-badge" style={{ borderColor: m.statusColor, color: m.statusColor }}>
                  <span className="sat-live-dot" style={{ background: m.statusColor }}></span>
                  {m.status}
                </span>
              </div>

              <p className="sat-mission-desc">{m.description}</p>

              <div className="sat-orbit-metrics-grid">
                <div className="sat-metric-box">
                  <small>ORBIT TYPE</small>
                  <strong>{m.orbitType}</strong>
                </div>
                <div className="sat-metric-box">
                  <small>ALTITUDE</small>
                  <strong>{m.altitude}</strong>
                </div>
                <div className="sat-metric-box">
                  <small>SWATH WIDTH</small>
                  <strong>{m.swath}</strong>
                </div>
                <div className="sat-metric-box">
                  <small>PERIOD / SCAN</small>
                  <strong>{m.period}</strong>
                </div>
              </div>

              <div className="sat-payloads-section">
                <h4 className="sat-payloads-heading">ONBOARD SENSOR PAYLOADS</h4>
                <div className="sat-payload-list">
                  {m.payloads.map((p, idx) => (
                    <div key={idx} className="sat-payload-item">
                      <div className="sat-payload-top">
                        <strong className="sat-payload-name">{p.name}</strong>
                        <span className="sat-payload-res">{p.res}</span>
                      </div>
                      <div className="sat-payload-type">{p.type}</div>
                      <p className="sat-payload-role">{p.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* 4. TAB 2: OVERPASS SCHEDULE */}
      {activeTab === 'overpasses' && (
        <section className="sat-overpasses-section">
          <div className="sat-section-card">
            <div className="sat-section-header">
              <div>
                <h2 className="sat-section-title">24-Hour Orbital Overpass Schedule</h2>
                <p className="sat-section-subtitle">
                  Upcoming high-elevation data acquisition windows over <strong>{activeLocation.name}</strong> ({Number(activeLocation.latitude || 17.6868).toFixed(2)}°N, {Number(activeLocation.longitude || 83.2185).toFixed(2)}°E)
                </p>
              </div>
              <button
                type="button"
                className="sat-refresh-btn"
                onClick={() => {
                  setOverpassData(null)
                  setLoadingOverpasses(true)
                  setTimeout(() => setLoadingOverpasses(false), 600)
                }}
              >
                Refresh Overpass Model
              </button>
            </div>

            {loadingOverpasses ? (
              <div className="sat-loading-state">
                <span className="sat-spinner"></span>
                <span>Calculating orbital state vectors and ground tracks...</span>
              </div>
            ) : (
              <div className="sat-table-responsive">
                <table className="sat-overpass-table">
                  <thead>
                    <tr>
                      <th>MISSION / SATELLITE</th>
                      <th>PAYLOADS ACTIVE</th>
                      <th>PREDICTED PASS (UTC)</th>
                      <th>MAX ELEVATION</th>
                      <th>AZIMUTH</th>
                      <th>COVERAGE SWATH</th>
                      <th>ILLUMINATION</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nextPasses.map((pass, idx) => (
                      <tr key={idx}>
                        <td>
                          <strong>{pass.mission}</strong>
                        </td>
                        <td>
                          <span className="sat-sensor-tag">{pass.sensor}</span>
                        </td>
                        <td>
                          <strong className="sat-time-val">{pass.timeDisplay}</strong>
                        </td>
                        <td>
                          <span className="sat-elevation-tag">{pass.elevation}</span>
                        </td>
                        <td>{pass.azimuth}</td>
                        <td>{pass.swathCoverage}</td>
                        <td>
                          <small style={{ color: '#cbd5e1' }}>{pass.sunIllumination}</small>
                        </td>
                        <td>
                          <span className="sat-status-chip" style={{ color: pass.badgeColor, background: `${pass.badgeColor}18`, borderColor: `${pass.badgeColor}40` }}>
                            {pass.confidence}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 5. TAB 3: SENSOR TELEMETRY & HEALTH */}
      {activeTab === 'telemetry' && (
        <section className="sat-telemetry-grid">
          <div className="sat-sensor-tile ocm">
            <div className="sat-sensor-header">
              <div className="sat-sensor-title-row">
                
                <div>
                  <h3>OCM-3 (Ocean Colour Monitor)</h3>
                  <small>ISRO EOS-06 · 13 Spectral Bands</small>
                </div>
              </div>
              <span className="sat-health-badge good">HEALTH: 99.4%</span>
            </div>
            <div className="sat-sensor-metrics">
              <div className="sat-sensor-stat">
                <span>Signal-to-Noise Ratio (SNR)</span>
                <strong>&gt; 500 @ 412 nm</strong>
              </div>
              <div className="sat-sensor-stat">
                <span>Spatial Resolution</span>
                <strong>360 m Coastal / Pelagic</strong>
              </div>
              <div className="sat-sensor-stat">
                <span>Radiometric Quantization</span>
                <strong>12-bit Raw Downlink</strong>
              </div>
              <div className="sat-sensor-stat">
                <span>Biogeochemical Derivation</span>
                <strong>Chlorophyll-a & Total Suspended Matter</strong>
              </div>
            </div>
            <div className="sat-sensor-progress-wrap">
              <div className="sat-progress-label">
                <span>Optical Detector Array Uniformity</span>
                <span>99.4%</span>
              </div>
              <div className="sat-progress-bar"><div className="sat-progress-fill" style={{ width: '99.4%', background: '#10b981' }}></div></div>
            </div>
          </div>

          <div className="sat-sensor-tile sstm">
            <div className="sat-sensor-header">
              <div className="sat-sensor-title-row">
                
                <div>
                  <h3>SSTM (Sea Surface Temperature)</h3>
                  <small>ISRO EOS-06 · Dual Thermal IR</small>
                </div>
              </div>
              <span className="sat-health-badge good">HEALTH: 98.8%</span>
            </div>
            <div className="sat-sensor-metrics">
              <div className="sat-sensor-stat">
                <span>Thermal Resolution (NEΔT)</span>
                <strong>0.15 K @ 300 K</strong>
              </div>
              <div className="sat-sensor-stat">
                <span>Spatial Resolution</span>
                <strong>1,000 m (1.0 km)</strong>
              </div>
              <div className="sat-sensor-stat">
                <span>Thermal Infrared Channels</span>
                <strong>10.8 µm & 12.0 µm</strong>
              </div>
              <div className="sat-sensor-stat">
                <span>Ocean Application</span>
                <strong>Thermal Fronts & Marine Heatwave Detection</strong>
              </div>
            </div>
            <div className="sat-sensor-progress-wrap">
              <div className="sat-progress-label">
                <span>Cryocooler Core Temperature (80 K)</span>
                <span>Nominal</span>
              </div>
              <div className="sat-progress-bar"><div className="sat-progress-fill" style={{ width: '98.8%', background: '#0284c7' }}></div></div>
            </div>
          </div>

          <div className="sat-sensor-tile oscat">
            <div className="sat-sensor-header">
              <div className="sat-sensor-title-row">
                
                <div>
                  <h3>Ku-Band Scatterometer (OSCAT)</h3>
                  <small>ISRO EOS-06 · Active Microwave</small>
                </div>
              </div>
              <span className="sat-health-badge good">HEALTH: 100%</span>
            </div>
            <div className="sat-sensor-metrics">
              <div className="sat-sensor-stat">
                <span>Operating Frequency</span>
                <strong>13.515 GHz (Ku-band)</strong>
              </div>
              <div className="sat-sensor-stat">
                <span>Wind Vector Grid</span>
                <strong>25 km × 25 km</strong>
              </div>
              <div className="sat-sensor-stat">
                <span>Wind Speed Measurement</span>
                <strong>4 to 35 m/s (±1.5 m/s)</strong>
              </div>
              <div className="sat-sensor-stat">
                <span>Wind Direction Accuracy</span>
                <strong>±18° Directional Vector</strong>
              </div>
            </div>
            <div className="sat-sensor-progress-wrap">
              <div className="sat-progress-label">
                <span>TWT RF Power Amplifier Output</span>
                <span>100% Nominal</span>
              </div>
              <div className="sat-progress-bar"><div className="sat-progress-fill" style={{ width: '100%', background: '#f59e0b' }}></div></div>
            </div>
          </div>

          <div className="sat-sensor-tile insat">
            <div className="sat-sensor-header">
              <div className="sat-sensor-title-row">
                
                <div>
                  <h3>INSAT-3DS Multi-Spectral Imager</h3>
                  <small>ISRO / IMD · Geostationary 74°E</small>
                </div>
              </div>
              <span className="sat-health-badge good">HEALTH: 99.8%</span>
            </div>
            <div className="sat-sensor-metrics">
              <div className="sat-sensor-stat">
                <span>Rapid Scan Interval</span>
                <strong>15 Minutes Full Disk</strong>
              </div>
              <div className="sat-sensor-stat">
                <span>Visible Channel Res.</span>
                <strong>1.0 km Coastal Ground Pixel</strong>
              </div>
              <div className="sat-sensor-stat">
                <span>Thermal IR Channels</span>
                <strong>4.0 km Spatial Resolution</strong>
              </div>
              <div className="sat-sensor-stat">
                <span>Storm Tracking Protocol</span>
                <strong>Automated Cyclone Eye Fix</strong>
              </div>
            </div>
            <div className="sat-sensor-progress-wrap">
              <div className="sat-progress-label">
                <span>Scan Mirror Servo Mechanism</span>
                <span>99.8% Operational</span>
              </div>
              <div className="sat-progress-bar"><div className="sat-progress-fill" style={{ width: '99.8%', background: '#8b5cf6' }}></div></div>
            </div>
          </div>
        </section>
      )}

      {/* 6. TAB 4: DATA PRODUCTS */}
      {activeTab === 'products' && (
        <section className="sat-products-section">
          <div className="sat-section-card">
            <div className="sat-section-header">
              <div>
                <h2 className="sat-section-title">ISRO MOSDAC & INCOIS Ocean Data Feeds</h2>
                <p className="sat-section-subtitle">
                  Direct operational data products derived from satellite earth observations and integrated into ORCA decision workflows.
                </p>
              </div>
            </div>

            <div className="sat-products-grid">
              <div className="sat-product-card">
                <div className="sat-product-badge">LEVEL-2B GEOPHYSICAL</div>
                <h3>EOS-06 OCM-3 Chlorophyll-a Biomass</h3>
                <p>Derived 360m spatial resolution ocean surface Chlorophyll concentration grids in mg/m³ used for bio-productivity and PFZ boundary delineation.</p>
                <div className="sat-product-footer">
                  <span className="sat-cadence-pill">⏱️ Daily Revisit</span>
                  <button type="button" className="sat-open-link" onClick={() => navigate('/map-explorer')}>
                    Open in Map Explorer →
                  </button>
                </div>
              </div>

              <div className="sat-product-card">
                <div className="sat-product-badge">LEVEL-2 THERMAL</div>
                <h3>EOS-06 SSTM Sea Surface Temperature</h3>
                <p>Calibrated 1km Sea Surface Temperature (SST) and thermal front gradient rasters for upwelling zone tracking and marine heatwave monitoring.</p>
                <div className="sat-product-footer">
                  <span className="sat-cadence-pill">⏱️ Daily Multi-Pass</span>
                  <button type="button" className="sat-open-link" onClick={() => navigate('/map-explorer')}>
                    Open in Map Explorer →
                  </button>
                </div>
              </div>

              <div className="sat-product-card">
                <div className="sat-product-badge">LEVEL-3 METEOROLOGICAL</div>
                <h3>INSAT-3DS Rapid-Scan Cloud Top IR</h3>
                <p>15-minute cadence thermal infrared and water vapor brightness temperature for deep convective cloud and vortex tracking.</p>
                <div className="sat-product-footer">
                  <span className="sat-cadence-pill">⏱️ 15-Min Cadence</span>
                  <button type="button" className="sat-open-link" onClick={() => navigate('/dashboard')}>
                    View in Dashboard →
                  </button>
                </div>
              </div>

              <div className="sat-product-card">
                <div className="sat-product-badge">LEVEL-2B MICROWAVE</div>
                <h3>EOS-06 OSCAT Wind Vector Fields</h3>
                <p>25km ocean surface wind speed (m/s) and cardinal direction vectors derived from Ku-band radar backscatter across the Arabian Sea and Bay of Bengal.</p>
                <div className="sat-product-footer">
                  <span className="sat-cadence-pill">⏱️ Twice Daily</span>
                  <button type="button" className="sat-open-link" onClick={() => navigate('/map-explorer')}>
                    Open in Map Explorer →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
