export default function IntelligenceBrief({ location, onAsk }) {
  return <section className="intelligence-brief panel"><div className="brief-orb">OR</div><div className="brief-content"><p className="eyebrow">ORCA INTELLIGENCE BRIEF</p><h2>{location.name} operating picture</h2><p>{location.brief}</p><ul>{location.findings.map((finding) => <li className={finding.tone} key={finding.text}><span>{finding.tone === 'good' ? 'OK' : '!'}</span>{finding.text}</li>)}</ul></div><button className="brief-action" onClick={onAsk}>Ask ORCA <span aria-hidden="true">-&gt;</span></button></section>
}
