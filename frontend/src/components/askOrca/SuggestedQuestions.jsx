const suggestedPromptCategories = [
  { category: 'SAFETY', icon: '🛡️', question: 'Is it safe for small vessels to operate today?' },
  { category: 'CONDITIONS', icon: '🌊', question: 'What are the current sea conditions?' },
  { category: 'ROUTE', icon: '⚓', question: 'Are there any hazards along coastal routes?' },
  { category: 'FORECAST', icon: '🌤️', question: 'How will wave heights change tonight?' },
  { category: 'ANALYSIS', icon: '📊', question: 'Explain the current marine safety index.' },
]

export default function SuggestedQuestions({ onSelectQuestion }) {
  return (
    <div className="suggested-questions-bar">
      <p className="eyebrow">SUGGESTED QUESTIONS</p>
      <div className="chips-grid">
        {suggestedPromptCategories.map((item) => (
          <button
            key={item.category}
            type="button"
            className="suggestion-chip"
            onClick={() => onSelectQuestion(item.question)}
          >
            <span className="chip-icon">{item.icon}</span>
            <div className="chip-text">
              <small>{item.category}</small>
              <strong>{item.question}</strong>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
