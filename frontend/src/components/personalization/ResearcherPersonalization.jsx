import React, { useState, useEffect, useCallback } from 'react'
import { researchPublicationService } from '../../services/researchPublicationService'

const PARAMETER_CONFIG = {
  sst: { name: 'Sea Surface Temperature (SST)', unit: '°C', current: 28.4, baseline: 27.9, delta: '+0.5', trend: '↑ 0.12 °C / week', history: [27.8, 28.0, 28.1, 28.3, 28.2, 28.4, 28.4] },
  chlorophyll: { name: 'Chlorophyll-a', unit: 'mg/m³', current: 1.38, baseline: 1.25, delta: '+0.13', trend: '↑ 0.04 mg/m³ / week', history: [1.22, 1.25, 1.28, 1.30, 1.34, 1.36, 1.38] },
  salinity: { name: 'Sea Surface Salinity', unit: 'PSU', current: 34.6, baseline: 34.8, delta: '-0.2', trend: '↓ 0.05 PSU / week', history: [34.9, 34.8, 34.8, 34.7, 34.7, 34.6, 34.6] },
  wave_height: { name: 'Wave Height', unit: 'm', current: 1.2, baseline: 1.4, delta: '-0.2', trend: '↓ 0.1 m / week', history: [1.5, 1.4, 1.3, 1.3, 1.2, 1.2, 1.2] },
  ocean_current: { name: 'Ocean Current', unit: 'm/s', current: 0.48, baseline: 0.42, delta: '+0.06', trend: '↑ 0.02 m/s / week', history: [0.40, 0.42, 0.43, 0.45, 0.46, 0.47, 0.48] },
  wind_speed: { name: 'Wind Speed', unit: 'm/s', current: 6.5, baseline: 6.0, delta: '+0.5', trend: '↑ 0.3 m/s / week', history: [5.8, 6.0, 6.1, 6.3, 6.2, 6.4, 6.5] },
  dissolved_oxygen: { name: 'Dissolved Oxygen', unit: 'mg/L', current: 6.4, baseline: 6.6, delta: '-0.2', trend: '↓ 0.08 mg/L / week', history: [6.7, 6.6, 6.5, 6.5, 6.4, 6.4, 6.4] },
  ph: { name: 'pH', unit: 'pH', current: 8.15, baseline: 8.18, delta: '-0.03', trend: '↓ 0.01 / week', history: [8.19, 8.18, 8.17, 8.16, 8.16, 8.15, 8.15] },
  sea_level_anomaly: { name: 'Sea Level Anomaly', unit: 'cm', current: 4.1, baseline: 2.5, delta: '+1.6', trend: '↑ 0.4 cm / week', history: [2.5, 2.8, 3.1, 3.4, 3.7, 3.9, 4.1] },
  mixed_layer_depth: { name: 'Mixed Layer Depth', unit: 'm', current: 32.5, baseline: 35.0, delta: '-2.5', trend: '↓ 0.8 m / week', history: [36.0, 35.2, 34.5, 34.0, 33.2, 32.8, 32.5] },
}

export default function ResearcherPersonalization({ user, userKey }) {
  // 1. RESEARCH PROFILE STATE
  const profileStorageKey = `orca_researcher_profile_${userKey}`
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(profileStorageKey)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [isEditingProfile, setIsEditingProfile] = useState(() => !profile)
  const [profileForm, setProfileForm] = useState(() => profile || {
    domain: 'Physical Oceanography',
    interests: 'SST anomalies, Coastal Upwelling, Marine Heatwaves',
    preferredData: 'Satellite SST, Chlorophyll-a, In-situ Buoys',
    studyRegion: 'Bay of Bengal & East Coast of India',
    alertPreferences: 'Thermal Stress Advisories & Anomaly Thresholds',
  })

  const [profileToast, setProfileToast] = useState('')

  // 4. RESEARCH PUBLICATIONS LIVE FEED STATE
  const [articles, setArticles] = useState([])
  const [articlesLoading, setArticlesLoading] = useState(false)
  const [articlesError, setArticlesError] = useState('')

  const loadResearchArticles = useCallback(async (prefs) => {
    setArticlesLoading(true)
    setArticlesError('')
    try {
      const results = await researchPublicationService.fetchPublications({
        domain: prefs?.domain || 'Physical Oceanography',
        interests: prefs?.interests || 'SST anomalies, Coastal Upwelling',
        studyRegion: prefs?.studyRegion || 'Bay of Bengal',
      })
      setArticles(results || [])
    } catch (err) {
      setArticlesError('Unable to fetch live research publications from Crossref API.')
    } finally {
      setArticlesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadResearchArticles(profile || profileForm)
  }, [profile, loadResearchArticles])

  const handleSaveProfile = (e) => {
    e.preventDefault()
    setProfile(profileForm)
    setIsEditingProfile(false)
    localStorage.setItem(profileStorageKey, JSON.stringify(profileForm))
    setProfileToast('Research Profile preferences saved successfully!')
    loadResearchArticles(profileForm)
    setTimeout(() => setProfileToast(''), 4000)
  }

  // 2. RESEARCH ANALYSIS STATE
  const [selectedAnalysisParam, setSelectedAnalysisParam] = useState('sst')

  // 3. LOG OBSERVATION STATE
  const observationStorageKey = `orca_research_observations_${userKey}`
  const [savedObservations, setSavedObservations] = useState(() => {
    try {
      const saved = localStorage.getItem(observationStorageKey) || localStorage.getItem('orca_research_observations')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [observationForm, setObservationForm] = useState({
    title: '',
    parameter: 'Sea Surface Temperature (SST)',
    notes: '',
  })
  const [obsToast, setObsToast] = useState('')

  const handleSaveObservation = (e) => {
    e.preventDefault()
    if (!observationForm.title.trim()) return

    const newObs = {
      id: Date.now().toString(),
      title: observationForm.title.trim(),
      parameter: observationForm.parameter,
      notes: observationForm.notes.trim(),
      timestamp: new Date().toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    }

    const updated = [newObs, ...savedObservations]
    setSavedObservations(updated)
    localStorage.setItem(observationStorageKey, JSON.stringify(updated))
    localStorage.setItem('orca_research_observations', JSON.stringify(updated))

    setObservationForm({ title: '', parameter: 'Sea Surface Temperature (SST)', notes: '' })
    setObsToast('Research Observation logged successfully!')
    setTimeout(() => setObsToast(''), 4000)
  }

  const handleDeleteObservation = (id) => {
    const updated = savedObservations.filter((obs) => obs.id !== id)
    setSavedObservations(updated)
    localStorage.setItem(observationStorageKey, JSON.stringify(updated))
    localStorage.setItem('orca_research_observations', JSON.stringify(updated))
  }

  const activeAnalysis = PARAMETER_CONFIG[selectedAnalysisParam] || PARAMETER_CONFIG.sst
  const activePrefs = profile || profileForm

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER BANNER */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0369a1 100%)', borderRadius: 12, padding: '24px 28px', color: '#ffffff', boxShadow: '0 4px 20px rgba(2, 132, 199, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🔬</span>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#38bdf8' }}>
              RESEARCH & SCIENTIFIC WORKSPACE
            </span>
            <h1 style={{ margin: '2px 0 0', fontSize: 22, fontFamily: 'Sora, sans-serif', fontWeight: 700, color: '#ffffff' }}>
              Researcher Personalization & Telemetry Analysis
            </h1>
          </div>
        </div>
        <p style={{ margin: '8px 0 0', color: '#e0f2fe', fontSize: 13, maxWidth: '720px', lineHeight: 1.5 }}>
          Manage your research profile, monitor 10 oceanographic parameters, analyze historical time-series anomalies, and log field observations.
        </p>
      </div>

      {/* 1. RESEARCH PROFILE SECTION */}
      <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #dce7f0', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              SECTION 1
            </span>
            <h2 style={{ margin: '2px 0 0', fontSize: 18, color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>
              Research Profile & Preferences
            </h2>
          </div>
          {profile && !isEditingProfile && (
            <button
              onClick={() => setIsEditingProfile(true)}
              style={{ padding: '6px 14px', borderRadius: 6, background: '#f0f9ff', border: '1px solid #0284c7', color: '#0284c7', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
            >
              ✏ Edit Profile
            </button>
          )}
        </div>

        {profileToast && (
          <div style={{ padding: '10px 14px', borderRadius: 6, background: '#dcfce7', border: '1px solid #86efac', color: '#166534', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            ✓ {profileToast}
          </div>
        )}

        {isEditingProfile ? (
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Research Domain
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physical Oceanography"
                  value={profileForm.domain}
                  onChange={(e) => setProfileForm({ ...profileForm, domain: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Study Region
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bay of Bengal & East Coast"
                  value={profileForm.studyRegion}
                  onChange={(e) => setProfileForm({ ...profileForm, studyRegion: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                Research Interests
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SST anomalies, Upwelling dynamics, Ocean acidification"
                value={profileForm.interests}
                onChange={(e) => setProfileForm({ ...profileForm, interests: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Preferred Data
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Satellite SST, Chlorophyll-a, In-situ Buoy Telemetry"
                  value={profileForm.preferredData}
                  onChange={(e) => setProfileForm({ ...profileForm, preferredData: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Alert Preferences
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Thermal Stress advisories, Marine Heatwaves"
                  value={profileForm.alertPreferences}
                  onChange={(e) => setProfileForm({ ...profileForm, alertPreferences: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <button
              type="submit"
              style={{
                marginTop: 8,
                padding: '12px 20px',
                borderRadius: 8,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(2, 132, 199, 0.3)',
              }}
            >
              Save Preferences
            </button>
          </form>
        ) : (
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Research Domain</span>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{profile.domain}</p>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Study Region</span>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{profile.studyRegion}</p>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Research Interests</span>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{profile.interests}</p>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Preferred Data</span>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{profile.preferredData}</p>
            </div>
            <div>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Alert Preferences</span>
              <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{profile.alertPreferences}</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. RESEARCH DATA SECTION */}
      <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #dce7f0', padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            SECTION 2
          </span>
          <h2 style={{ margin: '2px 0 0', fontSize: 18, color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>
            Research Data & Marine Parameters
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Live oceanographic observation telemetry measured across coastal stations.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
          {Object.entries(PARAMETER_CONFIG).map(([key, data]) => (
            <div key={key} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, transition: 'all 0.2s ease' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                {data.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>
                  {data.current}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0284c7' }}>
                  {data.unit}
                </span>
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#64748b' }}>Baseline: {data.baseline} {data.unit}</span>
                <span style={{ fontWeight: 700, color: data.delta.startsWith('+') ? '#16a34a' : '#dc2626' }}>
                  {data.delta}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. RESEARCH ANALYSIS SECTION (LIGHTWEIGHT & MAP-FREE) */}
      <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #dce7f0', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              SECTION 3
            </span>
            <h2 style={{ margin: '2px 0 0', fontSize: 18, color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>
              Research Analysis & Historical Trends
            </h2>
          </div>

          {/* PARAMETER SELECTOR DROPDOWN */}
          <select
            value={selectedAnalysisParam}
            onChange={(e) => setSelectedAnalysisParam(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #0284c7', background: '#f0f9ff', color: '#0369a1', fontWeight: 600, fontSize: 13 }}
          >
            {Object.entries(PARAMETER_CONFIG).map(([key, data]) => (
              <option key={key} value={key}>
                {data.name} ({data.unit})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'center' }}>
          {/* TIME-SERIES SVG CHART */}
          <div style={{ background: '#0f172a', borderRadius: 10, padding: 20, color: '#ffffff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>7-DAY HISTORICAL TREND</span>
              <span style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700 }}>{activeAnalysis.name}</span>
            </div>
            
            {/* SVG Trend Line */}
            <div style={{ height: 130, width: '100%', position: 'relative' }}>
              <svg viewBox="0 0 300 100" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                <polyline
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="3"
                  points={activeAnalysis.history
                    .map((val, idx) => {
                      const min = Math.min(...activeAnalysis.history) - 0.1
                      const max = Math.max(...activeAnalysis.history) + 0.1
                      const x = (idx / (activeAnalysis.history.length - 1)) * 280 + 10
                      const y = 90 - ((val - min) / (max - min)) * 80
                      return `${x},${y}`
                    })
                    .join(' ')}
                />
                {activeAnalysis.history.map((val, idx) => {
                  const min = Math.min(...activeAnalysis.history) - 0.1
                  const max = Math.max(...activeAnalysis.history) + 0.1
                  const x = (idx / (activeAnalysis.history.length - 1)) * 280 + 10
                  const y = 90 - ((val - min) / (max - min)) * 80
                  return (
                    <circle key={idx} cx={x} cy={y} r="4" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
                  )
                })}
              </svg>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginTop: 8 }}>
              <span>Day 1</span>
              <span>Day 3</span>
              <span>Day 5</span>
              <span>Today ({activeAnalysis.current} {activeAnalysis.unit})</span>
            </div>
          </div>

          {/* ANOMALY METRICS VIEW */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
              <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>ANOMALY DELTA</span>
              <div style={{ fontSize: 24, fontWeight: 700, color: activeAnalysis.delta.startsWith('+') ? '#16a34a' : '#dc2626', marginTop: 4 }}>
                {activeAnalysis.delta} {activeAnalysis.unit}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>
                Compared to 10-year climatological baseline mean ({activeAnalysis.baseline} {activeAnalysis.unit}).
              </p>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16 }}>
              <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>WEEKLY TREND DIRECTION</span>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0284c7', marginTop: 4 }}>
                {activeAnalysis.trend}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. RESEARCH NEWS & PUBLICATIONS SECTION (LIVE CROSSREF API) */}
      <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #dce7f0', padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                SECTION 4
              </span>
              <h2 style={{ margin: '2px 0 0', fontSize: 18, color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>
                Research News & Publications
              </h2>
            </div>
            <button
              onClick={() => loadResearchArticles(activePrefs)}
              disabled={articlesLoading}
              style={{
                background: '#f0f9ff',
                border: '1px solid #0284c7',
                color: '#0284c7',
                padding: '4px 12px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: articlesLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {articlesLoading ? 'Fetching…' : '↻ Refresh Feed'}
            </button>
          </div>

          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Live peer-reviewed scientific publications queried via Crossref API based on your saved preferences.
          </p>

          {/* ACTIVE PREFERENCES BADGE */}
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 6, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12 }}>
            <span style={{ fontWeight: 700, color: '#0369a1' }}>🔍 Query Filter:</span>
            <span style={{ color: '#0f172a', fontWeight: 600 }}>{activePrefs.domain}</span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span style={{ color: '#0f172a', fontWeight: 600 }}>{activePrefs.interests}</span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span style={{ color: '#0f172a', fontWeight: 600 }}>{activePrefs.studyRegion}</span>
          </div>
        </div>

        {articlesLoading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #0284c7', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 13, color: '#0369a1', fontWeight: 600 }}>
              Querying Crossref scientific repository for peer-reviewed papers...
            </p>
          </div>
        ) : articlesError ? (
          <div style={{ padding: 16, borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{articlesError}</span>
            <button
              onClick={() => loadResearchArticles(activePrefs)}
              style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        ) : articles.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }}>
            No publications found for the specified search query. Try broadening your research interests or region.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {articles.map((article) => (
              <div key={article.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#e0f2fe', color: '#0369a1' }}>
                      {article.domainTag}
                    </span>
                    <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                      {article.journal} • {article.year}
                    </span>
                  </div>
                  {article.doi && (
                    <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                      DOI: {article.doi}
                    </span>
                  )}
                </div>

                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'Sora, sans-serif', lineHeight: 1.4 }}>
                  {article.title}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: '#475569' }}>
                    Authors: <strong>{article.authors}</strong>
                  </span>

                  {article.link && article.link !== '#' && (
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#0284c7',
                        textDecoration: 'none',
                        background: '#ffffff',
                        border: '1px solid #0284c7',
                        padding: '4px 10px',
                        borderRadius: 6,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Read Publication ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. LOG RESEARCH OBSERVATION SECTION */}
      <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid #dce7f0', padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            SECTION 5
          </span>
          <h2 style={{ margin: '2px 0 0', fontSize: 18, color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>
            Log Research Observation
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Record in-situ observational notes and telemetry context.
          </p>
        </div>

        {obsToast && (
          <div style={{ padding: '10px 14px', borderRadius: 6, background: '#dcfce7', border: '1px solid #86efac', color: '#166534', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            ✓ {obsToast}
          </div>
        )}

        <form onSubmit={handleSaveObservation} style={{ background: '#f8fcff', border: '1px solid #d8e9f5', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>
              Observation Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g., Sea surface temperature anomaly off coastal shelf"
              value={observationForm.title}
              onChange={(e) => setObservationForm({ ...observationForm, title: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>
              Target Parameter
            </label>
            <select
              value={observationForm.parameter}
              onChange={(e) => setObservationForm({ ...observationForm, parameter: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontWeight: 600, color: '#0f172a', background: '#fff', boxSizing: 'border-box' }}
            >
              <option value="Sea Surface Temperature (SST)">Sea Surface Temperature (SST)</option>
              <option value="Wave Height & Swell Period">Wave Height & Swell Period</option>
              <option value="Coastal Drift & Currents">Coastal Drift & Currents</option>
              <option value="Other Oceanographic Parameter">Other Oceanographic Parameter</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>
              Observation Notes & Context
            </label>
            <textarea
              rows={3}
              placeholder="Record physical notes, telemetry context, or sensor observations..."
              value={observationForm.notes}
              onChange={(e) => setObservationForm({ ...observationForm, notes: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 13, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            style={{
              padding: '12px',
              fontSize: 14,
              fontWeight: 700,
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 3px 10px rgba(2, 132, 199, 0.3)',
              cursor: 'pointer',
            }}
          >
            Save Observation
          </button>
        </form>

        {/* LOGGED OBSERVATIONS LIST */}
        <div style={{ marginTop: 24 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>
            Logged Research Observations ({savedObservations.length})
          </h3>

          {savedObservations.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: '#64748b', fontStyle: 'italic' }}>
              No research observations logged yet. Fill out the form above to log your first observation.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {savedObservations.map((obs) => (
                <div key={obs.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#e0f2fe', color: '#0369a1' }}>
                        {obs.parameter}
                      </span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{obs.timestamp}</span>
                    </div>
                    <h4 style={{ margin: '4px 0', fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{obs.title}</h4>
                    {obs.notes && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.4 }}>{obs.notes}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteObservation(obs.id)}
                    style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
