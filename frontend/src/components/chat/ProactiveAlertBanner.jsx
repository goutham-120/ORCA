import { useEffect, useState } from 'react'
import { checkLocationAlerts } from '../../services/orcaService'
import './ProactiveAlertBanner.css'

export default function ProactiveAlertBanner({ location, onDismiss }) {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [activeAlertIdx, setActiveAlertIdx] = useState(0)

  useEffect(() => {
    if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
      setAlerts([])
      return
    }

    let isMounted = true
    setLoading(true)
    setIsDismissed(false)

    checkLocationAlerts(location.latitude, location.longitude)
      .then((res) => {
        if (isMounted && res && Array.isArray(res.alerts)) {
          setAlerts(res.alerts)
          setActiveAlertIdx(0)
        }
      })
      .catch((err) => {
        console.warn('Proactive alert check notice:', err)
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [location?.latitude, location?.longitude])

  if (isDismissed || alerts.length === 0) return null

  const currentAlert = alerts[activeAlertIdx] || alerts[0]
  const severityClass = currentAlert.severity || 'warning'

  return (
    <div className={`proactive-alert-banner ${severityClass} font-sans`} role="alert">
      <div className="alert-content-left">
        <div className="alert-icon-wrap">
          <span className="alert-pulse-ring"></span>
          <span className="alert-icon">{severityClass === 'critical' ? '🛑' : severityClass === 'high' ? '🚨' : '⚠️'}</span>
        </div>
        <div className="alert-text-body">
          <div className="alert-headline-row">
            <span className={`alert-sev-badge ${severityClass} font-mono`}>
              {currentAlert.category === 'geofence' ? 'GEOFENCE WARNING' : 'PROACTIVE MARINE ALERT'}
            </span>
            <strong className="alert-title font-sora">{currentAlert.title}</strong>
            {alerts.length > 1 && (
              <span className="alert-counter font-mono">
                ({activeAlertIdx + 1}/{alerts.length})
              </span>
            )}
          </div>
          <p className="alert-message">{currentAlert.message}</p>
          {currentAlert.action && (
            <p className="alert-action">
              <strong>Action:</strong> {currentAlert.action}
            </p>
          )}
        </div>
      </div>

      <div className="alert-actions-right">
        {alerts.length > 1 && (
          <div className="alert-nav-buttons">
            <button
              type="button"
              className="alert-arrow-btn"
              onClick={() => setActiveAlertIdx((prev) => (prev > 0 ? prev - 1 : alerts.length - 1))}
              title="Previous alert"
            >
              ◀
            </button>
            <button
              type="button"
              className="alert-arrow-btn"
              onClick={() => setActiveAlertIdx((prev) => (prev < alerts.length - 1 ? prev + 1 : 0))}
              title="Next alert"
            >
              ▶
            </button>
          </div>
        )}
        <button
          type="button"
          className="alert-dismiss-btn"
          onClick={() => {
            setIsDismissed(true)
            if (onDismiss) onDismiss()
          }}
          title="Acknowledge and dismiss alert"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
