import EvidencePanel from './EvidencePanel'

export default function Message({ message }) {
  const response = message.response
  return <article className={`chat-message ${message.role}`}><div className="message-label">{message.role === 'user' ? 'You' : 'ORCA'}</div><p>{message.text}</p>{response && <><div className={`assessment ${response.assessment.level}`}><b>{response.assessment.level} risk</b><span>{response.assessment.summary}</span></div>{(response.pending_domains?.length > 0 || response.unavailable_domains?.length > 0) && <section className="capability-status"><b>Coverage limitations</b>{response.unavailable_domains?.length > 0 && <p>Unavailable: {response.unavailable_domains.join(', ')}</p>}{response.pending_domains?.length > 0 && <p>Pending: {response.pending_domains.join(', ')}</p>}</section>}{response.recommendations?.length > 0 && <section className="recommendations"><b>Recommendations</b>{response.recommendations.map((item, index) => <p key={index}>{item.action} <small>{item.rationale}</small></p>)}</section>}<EvidencePanel evidence={response.evidence} /></>}</article>
}
