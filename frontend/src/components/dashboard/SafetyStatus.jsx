const labels = [
  ['wave', 'Wave Factor'],
  ['wind', 'Wind Factor'],
  ['visibility', 'Visibility Factor'],
]

export default function SafetyStatus({ safety }) {
  if (!safety) return null

  return (
    <section className="safety-status panel font-sans" aria-label="Marine safety status">
      <p className="eyebrow font-mono">MARINE SAFETY</p>
      <div className="safety-score font-mono">
        <strong>{safety.score}</strong>
        <span>/ 100</span>
      </div>
      <span className={`safety-label ${safety.label.toLowerCase()} font-mono`}>
        {safety.label}
      </span>
      <p className="safety-note font-sans">
        {safety.note && !safety.note.includes('Demo')
          ? safety.note
          : 'Safety assessment based on regional monitoring telemetry.'}
      </p>

      <div className="safety-bars font-sans">
        {labels.map(([id, label]) => (
          <div key={id}>
            <span>{label}</span>
            <div className="progress-track">
              <i style={{ width: `${safety[id]}%` }} />
            </div>
            <b className="font-mono">{safety[id]}%</b>
          </div>
        ))}
      </div>
    </section>
  )
}
