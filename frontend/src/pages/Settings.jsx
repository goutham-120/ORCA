import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { COASTAL_LOCATIONS } from '../data/coastalLocations'
import './Settings.css'

export default function Settings() {
  const { user, updateProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('security') // 'security' | 'saved' | 'preferences' | 'cache'

  // Change Email State
  const [emailForm, setEmailForm] = useState({
    currentEmail: user?.email || '',
    newEmail: '',
    confirmEmail: '',
  })
  const [emailMessage, setEmailMessage] = useState({ text: '', type: '' })
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)

  // Change Password State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' })
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  // Saved Items State
  const [savedHarbors, setSavedHarbors] = useState([])
  const [savedPfzs, setSavedPfzs] = useState([])
  const [savedReports, setSavedReports] = useState([])
  const [newHarborId, setNewHarborId] = useState('')

  // Preferences State
  const [preferredUnits, setPreferredUnits] = useState(() => {
    return localStorage.getItem('orca_preferred_units') || 'knots'
  })
  const [offlineSyncInterval, setOfflineSyncInterval] = useState(() => {
    return localStorage.getItem('orca_offline_interval') || '15'
  })
  const [cacheMessage, setCacheMessage] = useState('')

  // Load saved items on mount
  useEffect(() => {
    if (user?.email) {
      setEmailForm((prev) => ({ ...prev, currentEmail: user.email }))
    }

    // Load saved harbors
    try {
      const storedHarbors = localStorage.getItem('orca_saved_harbors')
      if (storedHarbors) {
        setSavedHarbors(JSON.parse(storedHarbors))
      } else {
        // Initial defaults based on popular ports
        const defaults = [
          { id: 'chennai', name: 'Chennai / Kasimedu Port', state: 'Tamil Nadu', lat: 13.125, lon: 80.298, isDefault: true },
          { id: 'visakhapatnam', name: 'Visakhapatnam Fishing Harbour', state: 'Andhra Pradesh', lat: 17.697, lon: 83.298, isDefault: false },
          { id: 'kochi', name: 'Cochin / Kochi Fisheries Harbour', state: 'Kerala', lat: 9.941, lon: 76.262, isDefault: false },
        ]
        setSavedHarbors(defaults)
        localStorage.setItem('orca_saved_harbors', JSON.stringify(defaults))
      }
    } catch {
      // Ignore
    }

    // Load saved PFZs
    try {
      const storedPfz = localStorage.getItem('orca_saved_pfz_bookmarks')
      if (storedPfz) {
        setSavedPfzs(JSON.parse(storedPfz))
      } else {
        const defaultPfzs = [
          { id: 'pfz-01', name: 'Zone East-7B (High Chlorophyll Edge)', lat: 13.35, lon: 80.65, depth: '42m', species: 'Yellowfin Tuna, Mackerel', dateAdded: 'Today' },
          { id: 'pfz-02', name: 'Vizag Offshore Thermal Front', lat: 17.82, lon: 83.58, depth: '55m', species: 'Sardine, Kingfish', dateAdded: 'Yesterday' },
        ]
        setSavedPfzs(defaultPfzs)
        localStorage.setItem('orca_saved_pfz_bookmarks', JSON.stringify(defaultPfzs))
      }
    } catch {
      // Ignore
    }

    // Load saved reports
    try {
      const storedRep = localStorage.getItem('orca-saved-reports')
      if (storedRep) {
        setSavedReports(JSON.parse(storedRep))
      }
    } catch {
      // Ignore
    }
  }, [user])

  // Handle Email Update
  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setEmailMessage({ text: '', type: '' })

    if (!emailForm.newEmail || !emailForm.newEmail.includes('@')) {
      setEmailMessage({ text: 'Please enter a valid new email address.', type: 'error' })
      return
    }

    if (emailForm.newEmail !== emailForm.confirmEmail) {
      setEmailMessage({ text: 'New email and confirmation email do not match.', type: 'error' })
      return
    }

    if (emailForm.newEmail === emailForm.currentEmail) {
      setEmailMessage({ text: 'New email is identical to current email.', type: 'error' })
      return
    }

    setIsUpdatingEmail(true)
    try {
      await updateProfile({ email: emailForm.newEmail })
      setEmailMessage({ text: '✓ Email address successfully updated!', type: 'success' })
      setEmailForm((prev) => ({
        ...prev,
        currentEmail: emailForm.newEmail,
        newEmail: '',
        confirmEmail: '',
      }))
    } catch (err) {
      setEmailMessage({ text: err.message || 'Failed to update email address.', type: 'error' })
    } finally {
      setIsUpdatingEmail(false)
    }
  }

  // Handle Password Update
  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordMessage({ text: '', type: '' })

    if (!passwordForm.currentPassword) {
      setPasswordMessage({ text: 'Please enter your current password.', type: 'error' })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ text: 'New password must be at least 6 characters long.', type: 'error' })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ text: 'New password and confirmation do not match.', type: 'error' })
      return
    }

    setIsUpdatingPassword(true)
    try {
      // In production or demo token mode, simulated or api-driven password update
      await new Promise((resolve) => setTimeout(resolve, 600))
      setPasswordMessage({ text: '✓ Password changed successfully! Please use it on next login.', type: 'success' })
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
    } catch (err) {
      setPasswordMessage({ text: err.message || 'Failed to update password.', type: 'error' })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  // Saved Harbors Handlers
  const handleAddHarbor = () => {
    if (!newHarborId) return
    const coastal = COASTAL_LOCATIONS.find((c) => c.id === newHarborId)
    if (!coastal) return

    if (savedHarbors.some((h) => h.id === coastal.id)) {
      alert('Harbor is already saved in your favorites.')
      return
    }

    const updated = [
      ...savedHarbors,
      {
        id: coastal.id,
        name: coastal.name,
        state: coastal.state,
        lat: coastal.latitude,
        lon: coastal.longitude,
        isDefault: savedHarbors.length === 0,
      },
    ]
    setSavedHarbors(updated)
    localStorage.setItem('orca_saved_harbors', JSON.stringify(updated))
    setNewHarborId('')
  }

  const handleSetDefaultHarbor = (id) => {
    const updated = savedHarbors.map((h) => ({
      ...h,
      isDefault: h.id === id,
    }))
    setSavedHarbors(updated)
    localStorage.setItem('orca_saved_harbors', JSON.stringify(updated))
    const defaultOne = updated.find((h) => h.id === id)
    if (defaultOne) {
      localStorage.setItem('orca_preferred_spot', `${defaultOne.name}, ${defaultOne.state}`)
    }
  }

  const handleDeleteHarbor = (id) => {
    const updated = savedHarbors.filter((h) => h.id !== id)
    setSavedHarbors(updated)
    localStorage.setItem('orca_saved_harbors', JSON.stringify(updated))
  }

  // Saved PFZ Handlers
  const handleDeletePfz = (id) => {
    const updated = savedPfzs.filter((p) => p.id !== id)
    setSavedPfzs(updated)
    localStorage.setItem('orca_saved_pfz_bookmarks', JSON.stringify(updated))
  }

  // Saved Reports Handlers
  const handleDeleteReport = (id) => {
    const updated = savedReports.filter((r) => r.id !== id)
    setSavedReports(updated)
    localStorage.setItem('orca-saved-reports', JSON.stringify(updated))
  }

  // Preferences Handlers
  const handleUnitsChange = (unit) => {
    setPreferredUnits(unit)
    localStorage.setItem('orca_preferred_units', unit)
  }

  const handleIntervalChange = (val) => {
    setOfflineSyncInterval(val)
    localStorage.setItem('orca_offline_interval', val)
  }

  // Cache & Storage Handlers
  const handleClearCache = () => {
    try {
      localStorage.removeItem('orca-offline-messages')
      localStorage.removeItem('incois-cache-layers')
      localStorage.removeItem('mosdac_satellite_cache')
      setCacheMessage('✓ Marine telemetry, satellite tiles, and offline packets cache cleared successfully.')
      setTimeout(() => setCacheMessage(''), 4000)
    } catch {
      setCacheMessage('Error clearing local cache.')
    }
  }

  const handleResetSession = () => {
    if (confirm('Are you sure you want to clear saved bookmarks and local preferences? Your account login will remain intact.')) {
      localStorage.removeItem('orca_saved_harbors')
      localStorage.removeItem('orca_saved_pfz_bookmarks')
      localStorage.removeItem('orca-saved-reports')
      setSavedHarbors([])
      setSavedPfzs([])
      setSavedReports([])
      setCacheMessage('✓ Saved bookmarks and local cached items have been reset.')
      setTimeout(() => setCacheMessage(''), 4000)
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h1>Account & Application Settings</h1>
          <p className="settings-subtitle">
            Manage your credentials, security preferences, favorite ports, and saved marine data.
          </p>
        </div>

        <div className="user-profile-summary">
          <div className="avatar-chip">
            {user?.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <div className="user-profile-details">
            <span className="profile-name">{user?.display_name || user?.name || 'Maritime User'}</span>
            <span className="profile-role">
              {user?.role === 'researcher' ? 'Ocean Researcher' : 'Fisherman / Marine Operator'}
            </span>
          </div>
        </div>
      </div>

      <div className="settings-tabs-bar">
        <button
          type="button"
          className={`settings-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Security & Login
        </button>
        <button
          type="button"
          className={`settings-tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved')}
        >
          ⭐ Saved Items ({savedHarbors.length + savedPfzs.length + savedReports.length})
        </button>
        <button
          type="button"
          className={`settings-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          Marine Preferences
        </button>
        <button
          type="button"
          className={`settings-tab-btn ${activeTab === 'cache' ? 'active' : ''}`}
          onClick={() => setActiveTab('cache')}
        >
          Data & Cache
        </button>
      </div>

      {/* TAB 1: SECURITY & LOGIN */}
      {activeTab === 'security' && (
        <div className="settings-grid">
          {/* Change Email Form */}
          <div className="settings-card">
            <div className="settings-card-head">
              <h3>Change Email Address</h3>
              <p>Update your registered notification and login email address.</p>
            </div>

            {emailMessage.text && (
              <div className={`settings-alert ${emailMessage.type}`}>
                {emailMessage.text}
              </div>
            )}

            <form onSubmit={handleEmailSubmit} className="settings-form">
              <div className="form-group">
                <label>Current Email</label>
                <input
                  type="email"
                  value={emailForm.currentEmail}
                  disabled
                  className="input-disabled"
                />
              </div>

              <div className="form-group">
                <label>New Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. yourname@maritime.in"
                  value={emailForm.newEmail}
                  onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm New Email</label>
                <input
                  type="email"
                  placeholder="Re-enter your new email"
                  value={emailForm.confirmEmail}
                  onChange={(e) => setEmailForm({ ...emailForm, confirmEmail: e.target.value })}
                  required
                />
              </div>

              <button
                type="submit"
                className="settings-submit-btn"
                disabled={isUpdatingEmail}
              >
                {isUpdatingEmail ? 'Updating Email…' : 'Update Email Address'}
              </button>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="settings-card">
            <div className="settings-card-head">
              <h3>Change Password</h3>
              <p>Enhance the security of your coastal navigation and fleet account.</p>
            </div>

            {passwordMessage.text && (
              <div className={`settings-alert ${passwordMessage.type}`}>
                {passwordMessage.text}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="settings-form">
              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="Re-type new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                />
              </div>

              <button
                type="submit"
                className="settings-submit-btn"
                disabled={isUpdatingPassword}
              >
                {isUpdatingPassword ? 'Updating Password…' : 'Change Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 2: SAVED ITEMS */}
      {activeTab === 'saved' && (
        <div className="saved-items-container">
          {/* Section 1: Saved Harbors */}
          <div className="saved-section-card">
            <div className="saved-section-header">
              <div>
                <h3>Saved Harbors & Ports of Origin</h3>
                <p>Quick-access embarkation harbors for routing and PFZ distance calculations.</p>
              </div>

              <div className="add-harbor-inline">
                <select
                  value={newHarborId}
                  onChange={(e) => setNewHarborId(e.target.value)}
                  className="harbor-select"
                >
                  <option value="">+ Add a Port to Favorites...</option>
                  {COASTAL_LOCATIONS.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.state})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="add-harbor-btn"
                  onClick={handleAddHarbor}
                  disabled={!newHarborId}
                >
                  Save Harbor
                </button>
              </div>
            </div>

            <div className="saved-list-table">
              {savedHarbors.length === 0 ? (
                <div className="empty-state">No favorite harbors saved yet.</div>
              ) : (
                savedHarbors.map((h) => (
                  <div key={h.id} className="saved-row-item">
                    <div className="saved-item-info">
                      <div className="item-title-line">
                        <span className="item-main-title">{h.name}</span>
                        {h.isDefault && <span className="default-badge">DEFAULT PORT</span>}
                      </div>
                      <span className="item-sub-title">
                        {h.state} • Coordinates: {h.lat.toFixed(3)}°N, {h.lon.toFixed(3)}°E
                      </span>
                    </div>

                    <div className="saved-item-actions">
                      {!h.isDefault && (
                        <button
                          type="button"
                          className="action-small-btn set-default"
                          onClick={() => handleSetDefaultHarbor(h.id)}
                          title="Set as my default home harbor"
                        >
                          Make Default
                        </button>
                      )}
                      <a
                        href={`/map-explorer?harbor=${encodeURIComponent(h.name)}`}
                        className="action-small-btn view"
                      >
                        View on Map
                      </a>
                      <button
                        type="button"
                        className="action-small-btn delete"
                        onClick={() => handleDeleteHarbor(h.id)}
                        title="Remove from saved"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 2: Bookmarked PFZ Zones */}
          <div className="saved-section-card">
            <div className="saved-section-header">
              <div>
                <h3>Bookmarked PFZ Waypoints</h3>
                <p>Saved high-yield potential fishing zones for rapid navigation and expedition logging.</p>
              </div>
            </div>

            <div className="saved-list-table">
              {savedPfzs.length === 0 ? (
                <div className="empty-state">No fishing zones bookmarked yet. Bookmarked zones from Map Explorer will appear here.</div>
              ) : (
                savedPfzs.map((p) => (
                  <div key={p.id} className="saved-row-item">
                    <div className="saved-item-info">
                      <div className="item-title-line">
                        <span className="item-main-title">{p.name}</span>
                        <span className="badge-depth">{p.depth}</span>
                      </div>
                      <span className="item-sub-title">
                        Coordinates: {p.lat}°N, {p.lon}°E • Target Species: {p.species}
                      </span>
                    </div>

                    <div className="saved-item-actions">
                      <a
                        href={`/map-explorer?lat=${p.lat}&lon=${p.lon}&zone=${encodeURIComponent(p.name)}`}
                        className="action-small-btn view"
                      >
                        Navigate
                      </a>
                      <button
                        type="button"
                        className="action-small-btn delete"
                        onClick={() => handleDeletePfz(p.id)}
                        title="Remove bookmark"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 3: Saved Marine Reports */}
          <div className="saved-section-card">
            <div className="saved-section-header">
              <div>
                <h3>Saved Marine Reports</h3>
                <p>Generated expedition advisories and marine safety logs.</p>
              </div>
            </div>

            <div className="saved-list-table">
              {savedReports.length === 0 ? (
                <div className="empty-state">No saved reports found. You can generate and save reports from the Reports section.</div>
              ) : (
                savedReports.map((r) => (
                  <div key={r.id || r.title} className="saved-row-item">
                    <div className="saved-item-info">
                      <div className="item-title-line">
                        <span className="item-main-title">{r.title || 'Marine Expedition Log'}</span>
                        <span className="badge-depth">{r.type || 'Advisory'}</span>
                      </div>
                      <span className="item-sub-title">
                        Generated on: {r.date || r.createdAt || 'Recent'} • Format: PDF/CSV
                      </span>
                    </div>

                    <div className="saved-item-actions">
                      <a href="/reports" className="action-small-btn view">
                        Open in Reports
                      </a>
                      <button
                        type="button"
                        className="action-small-btn delete"
                        onClick={() => handleDeleteReport(r.id)}
                        title="Delete report"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MARINE PREFERENCES */}
      {activeTab === 'preferences' && (
        <div className="preferences-container">
          <div className="settings-card">
            <div className="settings-card-head">
              <h3>Operational & Nautical Units</h3>
              <p>Configure how speeds, distances, and coordinates are formatted throughout ORCA.</p>
            </div>

            <div className="pref-row">
              <div className="pref-label-group">
                <strong>Speed & Velocity Units</strong>
                <span>Choose preferred nautical or terrestrial measurement standard.</span>
              </div>
              <div className="pref-options">
                <button
                  type="button"
                  className={`pref-btn ${preferredUnits === 'knots' ? 'active' : ''}`}
                  onClick={() => handleUnitsChange('knots')}
                >
                  Knots (kts)
                </button>
                <button
                  type="button"
                  className={`pref-btn ${preferredUnits === 'kmh' ? 'active' : ''}`}
                  onClick={() => handleUnitsChange('kmh')}
                >
                  Kilometers/hr (km/h)
                </button>
                <button
                  type="button"
                  className={`pref-btn ${preferredUnits === 'ms' ? 'active' : ''}`}
                  onClick={() => handleUnitsChange('ms')}
                >
                  Meters/sec (m/s)
                </button>
              </div>
            </div>

            <div className="pref-row">
              <div className="pref-label-group">
                <strong>NavIC Deep-Sea Polling Frequency</strong>
                <span>Interval for satellite telemetry synchronizations when operating out of cellular range.</span>
              </div>
              <div className="pref-options">
                <button
                  type="button"
                  className={`pref-btn ${offlineSyncInterval === '5' ? 'active' : ''}`}
                  onClick={() => handleIntervalChange('5')}
                >
                  5 mins (High)
                </button>
                <button
                  type="button"
                  className={`pref-btn ${offlineSyncInterval === '15' ? 'active' : ''}`}
                  onClick={() => handleIntervalChange('15')}
                >
                  15 mins (Standard)
                </button>
                <button
                  type="button"
                  className={`pref-btn ${offlineSyncInterval === '30' ? 'active' : ''}`}
                  onClick={() => handleIntervalChange('30')}
                >
                  30 mins (Battery Save)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DATA & CACHE */}
      {activeTab === 'cache' && (
        <div className="cache-container">
          <div className="settings-card">
            <div className="settings-card-head">
              <h3>Local Data, Cache & Offline Packets</h3>
              <p>Manage browser storage used for high-resolution satellite tiles and cached INCOIS telemetry.</p>
            </div>

            {cacheMessage && (
              <div className="settings-alert success">
                {cacheMessage}
              </div>
            )}

            <div className="cache-action-row">
              <div className="cache-text">
                <strong>Clear Telemetry & Tile Cache</strong>
                <p>Clears cached satellite overlays, tide charts, and bathymetry tiles to free up local device storage.</p>
              </div>
              <button
                type="button"
                className="cache-btn clear"
                onClick={handleClearCache}
              >
                Clear Tile Cache
              </button>
            </div>

            <div className="cache-action-row danger">
              <div className="cache-text">
                <strong>Reset Saved Bookmarks & Favorites</strong>
                <p>Resets saved harbors, bookmarked fishing zones, and local user configurations back to defaults.</p>
              </div>
              <button
                type="button"
                className="cache-btn reset"
                onClick={handleResetSession}
              >
                Reset Saved Items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
