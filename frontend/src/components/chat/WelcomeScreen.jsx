import orcaLogo from '../../assets/orcalogo.png'

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

const PROMPT_SUGGESTIONS_HI = [
  {
    id: 'sea_conditions',
    category: 'समुद्री स्थिति',
    icon: '🌊',
    title: 'समुद्री स्थिति (Sea Conditions)',
    query: 'वर्तमान समुद्री स्थिति, लहरों की ऊंचाई और स्वेल विक्टर्स क्या हैं?',
    desc: 'लहरों की ऊंचाई और समुद्री स्वेल'
  },
  {
    id: 'safety_check',
    category: 'सुरक्षा जांच',
    icon: '🛡️',
    title: 'सुरक्षा जांच (Safety Check)',
    query: 'क्या आज इस तटीय क्षेत्र में छोटी नौकाएं चलाना सुरक्षित है?',
    desc: 'नौकायन जोखिम का आकलन'
  },
  {
    id: 'route_risk',
    category: 'मार्ग जोखिम',
    icon: '⚓',
    title: 'मार्ग जोखिम (Route Risk)',
    query: 'क्या तटीय नौकायन मार्गों पर कोई सक्रिय समुद्री खतरे हैं?',
    desc: 'खतरे और प्रतिबंधित क्षेत्र'
  },
  {
    id: 'weather_forecast',
    category: 'मौसम पूर्वाणुकूल',
    icon: '🌦️',
    title: 'मौसम पूर्वानुमान (Weather)',
    query: 'वर्तमान हवा की गति, दिशा और मौसम का पूर्वानुमान क्या है?',
    desc: 'हवा, दृश्यता और वायु दबाव'
  },
  {
    id: 'fishing_conditions',
    category: 'मत्स्य पालन / PFZ',
    icon: '🎣',
    title: 'मछली पकड़ने के क्षेत्र (PFZ)',
    query: 'क्या आसपास संभावित मत्स्य पालन क्षेत्र (PFZ) या थर्मल फ्रंट उपलब्ध हैं?',
    desc: 'थर्मल फ्रंट और PFZ डेटा'
  }
]

const PROMPT_SUGGESTIONS_TE = [
  {
    id: 'sea_conditions',
    category: 'సముద్ర పరిస్థితి',
    icon: '🌊',
    title: 'సముద్ర పరిస్థితి (Sea Conditions)',
    query: 'ప్రస్తుత సముద్ర పరిస్థితి, అలల ఎత్తు మరియు స్వెల్ వివరాలు ఏమిటి?',
    desc: 'అలల ఎత్తు మరియు సముద్ర స్వెల్'
  },
  {
    id: 'safety_check',
    category: 'భద్రత తనిఖీ',
    icon: '🛡️',
    title: 'భద్రత తనిఖీ (Safety Check)',
    query: 'ఈ రోజు చిన్న పడవలు నడపడం సురక్షితమేనా?',
    desc: 'పడవ ప్రయాణ ప్రమాద అంచనా'
  },
  {
    id: 'route_risk',
    category: 'మార్గం ప్రమాదం',
    icon: '⚓',
    title: 'మార్గాలు & ప్రమాదాలు (Route Risk)',
    query: 'సముద్ర మార్గాల్లో ఏవైనా ప్రమాదకర లేదా నిషిద్ధ ప్రాంతాలు ఉన్నాయా?',
    desc: 'సముద్ర ప్రమాదాలు & జోన్ల వివరాలు'
  },
  {
    id: 'weather_forecast',
    category: 'వాతావరణం',
    icon: '🌦️',
    title: 'వాతావరణ ముందస్తు అంచనా (Weather)',
    query: 'ప్రస్తుత గాలి వేగం, దిశ మరియు వాతావరణ అంచనా ఏమిటి?',
    desc: 'గాలి వేగం, దృశ్యమానత & ఒత్తిడి'
  },
  {
    id: 'fishing_conditions',
    category: 'చేపల వేట / PFZ',
    icon: '🎣',
    title: 'చేపల వేట ప్రాంతాలు (PFZ)',
    query: 'సమీపంలో చేపల వేట ప్రాంతాలు (PFZ) అందుబాటులో ఉన్నాయా?',
    desc: 'PFZ సమాచారం & చేపల వేట మండలలు'
  }
]

export default function WelcomeScreen({ onSelectPrompt, language = 'en' }) {
  const isHindi = language === 'hi'
  const isTelugu = language === 'te'
  const promptList = isTelugu ? PROMPT_SUGGESTIONS_TE : isHindi ? PROMPT_SUGGESTIONS_HI : PROMPT_SUGGESTIONS

  return (
    <div className="welcome-command-screen font-inter">
      <div className="welcome-hero-card">
        <div className="welcome-avatar-orb">
          <img src={orcaLogo} alt="ORCA Logo" className="orb-logo-img" />
          <div className="orb-pulse-ring"></div>
        </div>
        <h2 className="welcome-title font-sora">
          {isTelugu
            ? 'మీరు ఏ సముద్ర పరిస్థితిని విశ్లేషించాలనుకుంటున్నారు?'
            : isHindi
            ? 'आप किस समुद्री स्थिति का विश्लेषण करना चाहते हैं?'
            : 'What would you like to analyze?'}
        </h2>
        <p className="welcome-subtitle font-inter">
          {isTelugu
            ? 'ORCA ని సముద్ర పరిస్థితులు, వాతావరణం, సముద్ర భద్రత, ప్రమాదాలు లేదా చేపల వేట ప్రాంతాల (PFZ) గురించి అడగండి.'
            : isHindi
            ? 'ORCA से समुद्री स्थिति, मौसम, तटीय सुरक्षा, खतरों या संभावित मत्स्य क्षेत्रों (PFZ) के बारे में प्रश्न पूछें।'
            : 'Ask ORCA about ocean conditions, weather, marine safety, hazards, routes, or fishing conditions.'}
        </p>
      </div>

      <div className="welcome-prompts-grid font-inter">
        {promptList.map((item) => (
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
              <span>{isHindi ? 'ORCA से पूछें' : 'Ask ORCA'}</span> <i>→</i>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
