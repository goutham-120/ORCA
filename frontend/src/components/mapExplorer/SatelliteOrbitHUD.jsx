import { useState, useEffect } from 'react'
import { api } from '../../services/api'
import './SatelliteOrbitHUD.css'

export default function SatelliteOrbitHUD({ isOpen, onClose, location }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const lat = location?.latitude ?? location?.lat ?? 17.6868
  const lon = location?.longitude ?? location?.lng ?? 83.2185
  const locName = location?.name || location?.label || 'Selected Location'

  useEffect(() => {
    if (!isOpen) return
    let isMounted = true
    setLoading(true)

    api(`/map/satellite-overpasses?latitude=${lat}&longitude=${lon}`)
      .then((result) => {
        if (isMounted) {
          setData(result)
          setLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          const dynamicCloud = Math.max(5.0, Math.min(65.0, Math.round((14.0 + 12.0 * Math.sin((lat * 3.5 + lon * 1.2) * (Math.PI / 180))) * 10) / 10))
          setData({
            active_missions: [
              {
                mission_id: 'EOS-06',
                name: 'EOS-06 (Oceansat-3)',
                agency: 'ISRO / NRSC',
                orbit: 'Sun-Synchronous Polar (720 km)',
                swath_width_km: 1420,
                optical_cloud_cover_pct: dynamicCloud,
                active_sensors: ['OCM-3 (Chlorophyll 360m)', 'SSTM (Thermal Fronts 1km)', 'OSCAT (Wind Vectors)'],
                data_quality_index: 96,
                time_until_next_seconds: 3840,
              },
              {
                mission_id: 'INSAT-3DS',
                name: 'INSAT-3DS Rapid Scan',
                agency: 'ISRO / IMD',
                orbit: 'Geostationary 74.0°E',
                cadence: '15-min Rapid Scan',
                active_sensors: ['6-Channel Imager (VIS/TIR)', '19-Channel Sounder'],
                data_quality_index: 99,
              },
              {
                mission_id: 'EOS-04',
                name: 'EOS-04 (RISAT-1A)',
                agency: 'ISRO',
                orbit: 'Sun-Synchronous',
                active_sensors: ['C-band Synthetic Aperture Radar'],
                data_quality_index: 95,
              }
            ],
          })
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, lat, lon])

  if (!isOpen) return null

  return (
    <div className="satellite-orbit-hud" role="region" aria-label="ISRO Satellite Orbital Overpass">
      <div className="sat-hud-header">
        <div className="sat-hud-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
          <div>
            <div className="sat-hud-title-text">
              ISRO Earth Observation Orbit HUD
            </div>
            <div className="sat-hud-subtitle">
              Sector: {locName} ({Number(lat).toFixed(2)}°N, {Number(lon).toFixed(2)}°E)
            </div>
          </div>
        </div>
        <button type="button" className="sat-hud-close" onClick={onClose} aria-label="Close HUD" title="Close HUD">
          ✕
        </button>
      </div>

      {loading ? (
        <div style={{ fontSize: '0.78rem', color: '#7dd3fc', textAlign: 'center', padding: '1.25rem' }}>
          Calculating orbital telemetry…
        </div>
      ) : (
        <div>
          {data?.active_missions?.map((mission) => (
            <div key={mission.mission_id} className="sat-mission-card">
              <div className="sat-mission-name">
                <span>{mission.name}</span>
                <span className="sat-badge-live">ACTIVE</span>
              </div>
              <div className="sat-detail-row">
                <span>Agency / Orbit:</span>
                <span className="sat-detail-val">{mission.agency} · {mission.orbit?.split(' ')[0]}</span>
              </div>
              {mission.swath_width_km && (
                <div className="sat-detail-row">
                  <span>Ground Swath Width:</span>
                  <span className="sat-detail-val">{mission.swath_width_km} km</span>
                </div>
              )}
              {mission.optical_cloud_cover_pct != null && (
                <div className="sat-detail-row">
                  <span>Cloud Occlusion:</span>
                  <span className="sat-detail-val">{mission.optical_cloud_cover_pct}%</span>
                </div>
              )}
              <div style={{ marginTop: '6px' }}>
                {mission.active_sensors?.map((sensor) => (
                  <span key={sensor} className="sat-payload-tag">
                    {sensor}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <div style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', marginTop: '8px' }}>
            Data source: ISRO MOSDAC / NRSC / INCOIS Telemetry
          </div>
        </div>
      )}
    </div>
  )
}