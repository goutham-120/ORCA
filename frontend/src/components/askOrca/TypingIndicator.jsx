export default function TypingIndicator() {
  return (
    <div className="chat-bubble-wrap orca-wrap typing-wrap">
      <div className="orca-avatar-orb" aria-hidden="true">
        <span>◒</span>
      </div>
      <div className="chat-message orca-message typing-card">
        <div className="typing-header">
          <strong>ORCA</strong>
          <span className="typing-status">Analyzing marine intelligence...</span>
        </div>
        <div className="typing-dots" aria-label="ORCA is generating a response">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  )
}
