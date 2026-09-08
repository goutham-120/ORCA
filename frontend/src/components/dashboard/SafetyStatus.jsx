const labels = [['wave', 'Wave'], ['wind', 'Wind'], ['visibility', 'Visibility']]

export default function SafetyStatus({ safety }) {
  return <section className="safety-status panel" aria-label="Sample marine safety status"><p className="eyebrow">MARINE SAFETY</p><div className="safety-score"><strong>{safety.score}</strong><span>/ 100</span></div><span className={`safety-label ${safety.label.toLowerCase()}`}>{safety.label}</span><p className="safety-note">{safety.note || 'Demo intelligence based on the selected sample location.'}</p><div className="safety-bars">{labels.map(([id, label]) => <div key={id}><span>{label}</span><div className="progress-track"><i style={{ width: `${safety[id]}%` }} /></div><b>{safety[id]}</b></div>)}</div></section>
}
