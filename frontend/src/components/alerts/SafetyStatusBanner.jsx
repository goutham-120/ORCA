export default function SafetyStatusBanner({ alerts, locationName }) {
  const highCount = alerts.filter((a) => a.severity === 'high').length
  const modCount = alerts.filter((a) => a.severity === 'moderate').length

  let tone = 'favorable'
  let title = '✓ CONDITIONS CURRENTLY CLEAR'
  let note = `No high-severity hazards reported for ${locationName}. Sea operations can proceed with routine monitoring.`

  if (highCount > 0) {
    tone = 'caution-high'
    title = `⚠ HIGH ATTENTION REQUIRED`
    note = `${highCount} high-priority alert(s) active near ${locationName}. Exercise extreme caution and delay non-essential offshore transit.`
  } else if (modCount > 0) {
    tone = 'caution-mod'
    title = `⚠ MODERATE ATTENTION`
    note = `${modCount} moderate advisory notice(s) in effect for ${locationName}. Small vessels should monitor wave and wind conditions.`
  }

  return (
    <div className={`safety-status-banner ${tone}`}>
      <div className="banner-icon-orb">
        <span>{highCount > 0 ? '🔴' : modCount > 0 ? '🟠' : '🟢'}</span>
      </div>
      <div className="banner-text">
        <p className="eyebrow">CURRENT SAFETY ADVISORY • {locationName.toUpperCase()}</p>
        <h2>{title}</h2>
        <p>{note}</p>
      </div>
    </div>
  )
}
