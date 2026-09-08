export default function EvidencePanel({ evidence = [] }) {
  if (!evidence.length) return null
  return <details className="evidence-panel"><summary>Supporting evidence ({evidence.length})</summary>{evidence.map((item, index) => <article key={`${item.source}-${index}`}><b>{item.source}</b><span className={`status ${item.metadata?.data_status || 'unavailable'}`}>{item.metadata?.data_status || 'unavailable'}</span><p>{item.summary}</p>{item.observed_at && <small>Observed: {new Date(item.observed_at).toLocaleString()}</small>}{item.url && <a href={item.url} target="_blank" rel="noreferrer">Source ↗</a>}{item.metadata?.error && <small className="evidence-error">{item.metadata.error}</small>}</article>)}</details>
}
