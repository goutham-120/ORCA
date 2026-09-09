export default function IntelligenceBrief({ location, onAsk }) {
  if (!location) return null

  const handleAskContext = () => {
    if (onAsk) {
      onAsk(`Analyze current conditions and operational safety risks for ${location.name}`)
    }
  }

  return (
    <section className="intelligence-brief panel font-sans">
      <div className="brief-orb font-mono">OR</div>
      <div className="brief-content font-sans">
        <p className="eyebrow font-mono">ORCA INTELLIGENCE</p>
        <h2 className="font-sans">{location.name} Operating Picture</h2>
        <p className="brief-summary">{location.brief}</p>
        <ul className="findings-list">
          {location.findings?.map((finding) => (
            <li className={finding.tone} key={finding.text}>
              <span>{finding.tone === 'good' ? '✓' : '!'}</span>
              {finding.text}
            </li>
          ))}
        </ul>
      </div>
      <button type="button" className="brief-action font-sans" onClick={handleAskContext}>
        <span>Analyze location</span>
        <i aria-hidden="true">&rarr;</i>
      </button>
    </section>
  )
}
