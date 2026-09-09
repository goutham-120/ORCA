import orcaLogo from '../../assets/orcologo.jpeg'

const PROMPT_SUGGESTIONS = [
  {
    id: 'sea_conditions',
    category: 'CONDITIONS',
    icon: '🌊',
    title: 'Sea Conditions',
    query: 'What are the current sea conditions, wave heights, and swell vectors?',
    desc: 'Wave heights, period & swell'
  },
  {
    id: 'safety_check',
    category: 'SAFETY',
    icon: '🛡️',
    title: 'Safety Check',
    query: 'Is it safe for small craft vessels to operate today in this area?',
    desc: 'Operational risk assessment'
  },
  {
    id: 'route_risk',
    category: 'ROUTES',
    icon: '⚓',
    title: 'Route Risk',
    query: 'Are there any active marine hazards or restricted zones along coastal routes?',
    desc: 'Hazard & zone clearance'
  },
  {
    id: 'weather_forecast',
    category: 'WEATHER',
    icon: '🌦️',
    title: 'Weather Forecast',
    query: 'What is the current wind speed, atmospheric pressure, and weather forecast?',
    desc: 'Wind, visibility & pressure'
  },
  {
    id: 'fishing_conditions',
    category: 'PFZ / FISHING',
    icon: '🎣',
    title: 'Fishing Conditions',
    query: 'Are there potential fishing zones (PFZ) or thermal fronts nearby?',
    desc: 'Thermal fronts & PFZ data'
  }
]

export default function WelcomeScreen({ onSelectPrompt }) {
  return (
    <div className="welcome-command-screen font-inter">
      <div className="welcome-hero-card">
        <div className="welcome-avatar-orb">
          <img src={orcaLogo} alt="ORCA Logo" className="orb-logo-img" />
          <div className="orb-pulse-ring"></div>
        </div>
        <h2 className="welcome-title font-sora">What would you like to analyze?</h2>
        <p className="welcome-subtitle font-inter">
          Ask ORCA about ocean conditions, weather, marine safety, hazards, routes, or fishing conditions.
        </p>
      </div>

      <div className="welcome-prompts-grid font-inter">
        {PROMPT_SUGGESTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="welcome-prompt-card font-inter"
            onClick={() => onSelectPrompt(item.query)}
          >
            <div className="card-top-row">
              <span className="card-icon">{item.icon}</span>
              <span className="card-category-tag font-inter">{item.category}</span>
            </div>
            <h4 className="card-title font-sora">{item.title}</h4>
            <p className="card-desc font-inter">{item.desc}</p>
            <div className="card-arrow font-inter">
              <span>Ask ORCA</span> <i>→</i>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
