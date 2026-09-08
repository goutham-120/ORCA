import Message from './Message'

export default function ChatWindow({ messages, loading }) {
  return <section className="chat-window" aria-live="polite">{messages.length === 0 && <div className="chat-empty"><span>◌</span><h2>Ask ORCA</h2><p>Evidence-backed marine, weather, and spatial intelligence.</p></div>}{messages.map((message) => <Message key={message.id} message={message} />)}{loading && <article className="chat-message assistant"><div className="message-label">ORCA</div><p>Reviewing available evidence…</p></article>}</section>
}
