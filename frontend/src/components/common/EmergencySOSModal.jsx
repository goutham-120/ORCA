import { useState, useEffect, useMemo } from 'react'
import './EmergencySOSModal.css'

export default function EmergencySOSModal({ isOpen, onClose, location }) {
  const [vesselName, setVesselName] = useState('IND-TN-02-MM-4412')
  const [personsOnBoard, setPersonsOnBoard] = useState(4)
  const [natureOfDistress, setNatureOfDistress] = useState('Capsize Risk / High Swell Breach')
  const [copied, setCopied] = useState(false)
  const [isSirenPlaying, setIsSirenPlaying] = useState(false)

  const lat = location?.latitude != null ? Number(location.latitude).toFixed(4) : '13.0827'
  const lon = location?.longitude != null ? Number(location.longitude).toFixed(4) : '80.2707'
  const locLabel = location?.label || 'Coromandel Coastal Waters'

  const broadcastMessage = useMemo(() => {
    const utcTime = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC'
    return `MAYDAY MAYDAY MAYDAY
THIS IS: ${vesselName} (ORCA ID: #ORCA-SOS-991)
POSITION: ${lat}°N, ${lon}°E (${locLabel})
TIME: ${utcTime}
NATURE OF DISTRESS: ${natureOfDistress}
PERSONS ON BOARD: ${personsOnBoard}
IMMEDIATE COAST GUARD ASSISTANCE REQUIRED
OVER (VHF CH 16 / 156.800 MHz)`
  }, [vesselName, lat, lon, locLabel, natureOfDistress, personsOnBoard])

  // Simple Audio Synth Siren generator
  const toggleSiren = () => {
    if (isSirenPlaying) {
      setIsSirenPlaying(false)
      return
    }
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(440, audioCtx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5)
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime)
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.start()
      osc.stop(audioCtx.currentTime + 1.2)
      setIsSirenPlaying(true)
      setTimeout(() => setIsSirenPlaying(false), 1200)
    } catch {
      setIsSirenPlaying(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard?.writeText?.(broadcastMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="sos-modal-backdrop font-inter" onClick={onClose}>
      <div className="sos-modal-container font-inter" onClick={(e) => e.stopPropagation()}>
        <div className="sos-modal-header">
          <div className="sos-header-title">
            <span>🚨</span>
            <h3 className="font-sora">EMERGENCY SOS & COAST GUARD DISTRESS</h3>
          </div>
          <button type="button" className="sos-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="sos-modal-body">
          <div className="sos-alert-box">
            <span>⚠️</span>
            <span>
              1-Click International VHF Channel 16 & DSC Mayday Distress Generator for Indian Coast Guard MRCC.
            </span>
          </div>

          <div className="sos-form-grid">
            <div className="sos-field">
              <label>Vessel Registration / MMSI</label>
              <input
                type="text"
                value={vesselName}
                onChange={(e) => setVesselName(e.target.value)}
              />
            </div>
            <div className="sos-field">
              <label>Persons On Board (POB)</label>
              <input
                type="number"
                min="1"
                max="50"
                value={personsOnBoard}
                onChange={(e) => setPersonsOnBoard(e.target.value)}
              />
            </div>
            <div className="sos-field" style={{ gridColumn: 'span 2' }}>
              <label>Nature of Distress</label>
              <select
                value={natureOfDistress}
                onChange={(e) => setNatureOfDistress(e.target.value)}
              >
                <option value="Capsize Risk / High Swell Breach">Capsize Risk / High Swell Breach (&gt;2.5m)</option>
                <option value="Engine Failure / Drifting Offshore">Engine Failure / Drifting Offshore</option>
                <option value="Medical Emergency / Critical Injury">Medical Emergency / Critical Injury</option>
                <option value="Flooding / Hull Breach">Flooding / Hull Breach</option>
                <option value="Fire on Board">Fire on Board</option>
              </select>
            </div>
          </div>

          <div className="sos-broadcast-preview">
            <div className="preview-header">
              <span>Standard VHF / DSC Mayday Transmission</span>
              <small style={{ color: '#94a3b8' }}>Frequency: 156.800 MHz (Ch 16)</small>
            </div>
            <pre className="sos-broadcast-text">{broadcastMessage}</pre>
          </div>
        </div>

        <div className="sos-modal-footer">
          <div className="coastguard-hotline">
            <span>📞</span>
            <span>ICG Hotline: <strong>1554</strong> (Toll Free)</span>
          </div>
          <div className="sos-action-buttons">
            <button type="button" className="siren-btn" onClick={toggleSiren}>
              {isSirenPlaying ? '🔊 Sounding...' : '🔔 Test Beacon'}
            </button>
            <button
              type="button"
              className={`copy-broadcast-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
            >
              {copied ? '✓ Copied to Clipboard' : '📋 Copy Mayday Text'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
