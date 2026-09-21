import orcaLogo from '../../assets/orcalogo.png'

const PROMPT_SUGGESTIONS = [
  {
    id: 'productivity_decline',
    category: 'ISRO MARINE ANOMALY',
    icon: '🔬',
    title: 'Fish Productivity Decline',
    query: 'Why has fish productivity declined in this coastal region?',
    desc: 'Marine heatwaves & chlorophyll deficit analysis'
  },
  {
    id: 'safe_route',
    category: 'ISRO ROUTE OPTIMIZER',
    icon: '🧭',
    title: 'Safest Navigable Route',
    query: 'What is the safest route for a fishing vessel considering weather and sea-state conditions?',
    desc: 'A* Waypoint pathfinding avoiding hazards'
  },
  {
    id: 'tide_conditions',
    category: 'TIDE & HYDRODYNAMICS',
    icon: '🌊',
    title: 'Tide, Sea State & Weather',
    query: 'What are the tide, weather, and sea conditions near my fishing location?',
    desc: 'High/Low tides, tidal currents & MSI'
  },
  {
    id: 'safety_check',
    category: 'SAFETY (MSI)',
    icon: '🛡️',
    title: 'Marine Safety Index (MSI)',
    query: 'Is it safe for small craft vessels to venture into the sea tomorrow morning?',
    desc: '0-100 continuous safety index'
  },
  {
    id: 'fishing_conditions',
    category: 'PFZ / FISHING',
    icon: '🎣',
    title: 'Nearest Potential Fishing Zone',
    query: 'Where is the nearest Potential Fishing Zone (PFZ) today?',
    desc: 'INCOIS PFZ tracks & ocean fronts'
  },
  {
    id: 'scenario_simulation',
    category: 'WHAT-IF SIMULATION',
    icon: '🧪',
    title: 'What-If Climate & Wind Simulation',
    query: 'What if SST rises by 1.5°C and wind reaches 30 knots next week?',
    desc: 'Simulate MSI shift, pelagic fish dispersal & vessel restrictions'
  },
]

const PROMPT_SUGGESTIONS_HI = [
  {
    id: 'productivity_decline',
    category: 'पारिस्थितिकी तंत्र',
    icon: '🔬',
    title: 'मछली उत्पादन में गिरावट',
    query: 'इस तटीय क्षेत्र में मछली उत्पादन में गिरावट के क्या कारण हैं?',
    desc: 'समुद्री हीटवेव और क्लोरोफिल विश्लेषण'
  },
  {
    id: 'safe_route',
    category: 'सुरक्षित नौकायन',
    icon: '🧭',
    title: 'सबसे सुरक्षित समुद्री मार्ग',
    query: 'मौसम और लहरों को ध्यान में रखते हुए नाव के लिए सबसे सुरक्षित मार्ग कौन सा है?',
    desc: 'खतरों से बचते हुए वेपॉइंट्स'
  },
  {
    id: 'tide_conditions',
    category: 'ज्वार-भाटा व मौसम',
    icon: '🌊',
    title: 'ज्वार-भाटा और समुद्री स्थिति',
    query: 'मेरे मछली पकड़ने के स्थान के पास ज्वार-भाटा, मौसम और समुद्र की स्थिति क्या है?',
    desc: 'उच्च/निम्न ज्वार और लहरों की स्थिति'
  },
  {
    id: 'safety_check',
    category: 'सुरक्षा जांच',
    icon: '🛡️',
    title: 'समुद्री सुरक्षा सूचकांक',
    query: 'क्या कल सुबह समुद्र में जाना सुरक्षित है?',
    desc: '0-100 समुद्री सुरक्षा स्कोर'
  },
  {
    id: 'fishing_conditions',
    category: 'मत्स्य पालन / PFZ',
    icon: '🎣',
    title: 'निकटतम मत्स्य क्षेत्र (PFZ)',
    query: 'आज सबसे नजदीकी संभावित मत्स्य पालन क्षेत्र (PFZ) कहाँ है?',
    desc: 'INCOIS PFZ और थर्मल फ्रंट्स'
  },
  {
    id: 'scenario_simulation',
    category: 'परिदृश्य सिमुलेशन',
    icon: '🧪',
    title: 'जलवायु व हवा सिमुलेशन',
    query: 'क्या होगा अगर तापमान 1.5°C बढ़ जाए और हवा 30 समुद्री मील हो जाए?',
    desc: 'MSI बदलाव, मछली फैलाव और नाव प्रतिबंध'
  },
]

const PROMPT_SUGGESTIONS_TE = [
  {
    id: 'productivity_decline',
    category: 'పర్యావరణ విశ్లేషణ',
    icon: '🔬',
    title: 'చేపల ఉత్పత్తి క్షీణత',
    query: 'ఈ తీరప్రాంతంలో చేపల ఉత్పత్తి ఎందుకు తగ్గింది?',
    desc: 'సముద్ర ఉష్ణోగ్రత పెరుగుదల & క్లోరోఫిల్ లోపం'
  },
  {
    id: 'safe_route',
    category: 'సురక్షిత మార్గం',
    icon: '🧭',
    title: 'సురక్షితమైన నావిగేషన్ మార్గం',
    query: 'వాతావరణం మరియు సముద్ర పరిస్థితిని బట్టి పడవ ప్రయాణానికి అత్యంత సురక్షితమైన మార్గం ఏది?',
    desc: 'ప్రమాదాలను తప్పించే వేపాయింట్లు'
  },
  {
    id: 'tide_conditions',
    category: 'పోటు-పాటు & వాతావరణం',
    icon: '🌊',
    title: 'పోటు-పాటు మరియు సముద్ర పరిస్థితి',
    query: 'నా చేపల వేట ప్రాంతం దగ్గర పోటు-పాటు, వాతావరణం మరియు సముద్ర పరిస్థితి ఏమిటి?',
    desc: 'హై/లో టైడ్ సమయాలు & అలల ఎత్తు'
  },
  {
    id: 'safety_check',
    category: 'భద్రత తనిఖీ',
    icon: '🛡️',
    title: 'సముద్ర భద్రతా సూచిక (MSI)',
    query: 'రేపు ఉదయం సముద్రంలోకి వెళ్లడం సురక్షితమేనా?',
    desc: '0-100 భద్రతా స్కోరు'
  },
  {
    id: 'fishing_conditions',
    category: 'చేపల వేట / PFZ',
    icon: '🎣',
    title: 'చేపల వేట ప్రాంతాలు (PFZ)',
    query: 'నేడు సమీపంలో ఉన్న సంభావ్య చేపల వేట ప్రాంతం (PFZ) ఎక్కడ ఉంది?',
    desc: 'INCOIS PFZ జోన్లు & దిశ'
  },
  {
    id: 'scenario_simulation',
    category: 'సిమ్యులేషన్',
    icon: '🧪',
    title: 'వాతావరణ మార్పు సిమ్యులేషన్',
    query: 'ఒకవేళ ఉష్ణోగ్రత 1.5°C పెరిగి గాలి 30 నాట్లు చేరితే ఏమి జరుగుతుంది?',
    desc: 'భద్రతా సూచిక మార్పు & పడవ ప్రయాణ సలహాలు'
  },
]

const PROMPT_SUGGESTIONS_TA = [
  {
    id: 'productivity_decline',
    category: 'சூழலியல் ஆய்வு',
    icon: '🔬',
    title: 'மீன் உற்பத்தி குறைவு',
    query: 'இந்த கடலோரப் பகுதியில் மீன் உற்பத்தி ஏன் குறைந்துள்ளது?',
    desc: 'கடல் வெப்ப உயர்வு மற்றும் குளோரோபில் பகுப்பாய்வு'
  },
  {
    id: 'safe_route',
    category: 'பாதுகாப்பான பாதை',
    icon: '🧭',
    title: 'பாதுகாப்பான வழித்தடம்',
    query: 'வானிலை மற்றும் கடல் நிலையை கருத்தில் கொண்டு படகுக்கான பாதுகாப்பான வழித்தடம் எது?',
    desc: 'ஆபத்துகளை தவிர்க்கும் வழிப்புள்ளிகள்'
  },
  {
    id: 'tide_conditions',
    category: 'ஓதம் மற்றும் வானிலை',
    icon: '🌊',
    title: 'ஓதம் மற்றும் கடல் நிலை',
    query: 'மீன்பிடி பகுதிக்கு அருகில் ஓதம், வானிலை மற்றும் கடல் நிலை எப்படி உள்ளது?',
    desc: 'அலை ஏற்றம்/இறக்கம் & காற்று நிலை'
  },
  {
    id: 'safety_check',
    category: 'பாதுகாப்பு குறியீடு',
    icon: '🛡️',
    title: 'கடல் பாதுகாப்பு குறியீடு (MSI)',
    query: 'நாளை காலை கடலுக்குள் செல்வது பாதுகாப்பானதா?',
    desc: '0-100 பாதுகாப்பு மதிப்பீடு'
  },
  {
    id: 'fishing_conditions',
    category: 'மீன்பிடி மண்டலம் (PFZ)',
    icon: '🎣',
    title: 'சாத்தியமான மீன்பிடி மண்டலம்',
    query: 'இன்று அருகிலுள்ள சாத்தியமான மீன்பிடி மண்டலம் (PFZ) எங்குள்ளது?',
    desc: 'INCOIS PFZ மற்றும் கடல் வெப்பமுனைகள்'
  },
  {
    id: 'scenario_simulation',
    category: 'மாதிரி உருவகப்படுத்துதல்',
    icon: '🧪',
    title: 'வானிலை மாதிரி உருவகப்படுத்துதல்',
    query: 'ஒருவேளை வெப்பநிலை 1.5°C உயர்ந்து காற்று 30 நாட்டுகள் எட்டினால் என்ன நடக்கும்?',
    desc: 'பாதுகாப்பு குறியீட்டு மாற்றம் & படகு எச்சரிக்கை'
  },
]

export default function WelcomeScreen({ onSelectPrompt, language = 'en' }) {
  const langLower = (language || 'en').toLowerCase()
  const promptList = langLower.startsWith('te')
    ? PROMPT_SUGGESTIONS_TE
    : langLower.startsWith('ta')
    ? PROMPT_SUGGESTIONS_TA
    : langLower.startsWith('hi')
    ? PROMPT_SUGGESTIONS_HI
    : PROMPT_SUGGESTIONS

  return (
    <div className="welcome-command-screen font-inter">
      <div className="welcome-hero-card">
        <div className="welcome-avatar-orb">
          <img src={orcaLogo} alt="ORCA Logo" className="orb-logo-img" />
          <div className="orb-pulse-ring"></div>
        </div>
        <h2 className="welcome-title font-sora">
          {langLower.startsWith('te')
            ? 'మీరు ఏ సముద్ర పరిస్థితిని విశ్లేషించాలనుకుంటున్నారు?'
            : langLower.startsWith('ta')
            ? 'நீங்கள் எந்த கடல் நிலையை பகுப்பாய்வு செய்ய விரும்புகிறீர்கள்?'
            : langLower.startsWith('hi')
            ? 'आप किस समुद्री स्थिति का विश्लेषण करना चाहते हैं?'
            : 'What marine intelligence would you like to analyze?'}
        </h2>
        <p className="welcome-subtitle font-inter">
          {langLower.startsWith('te')
            ? 'ORCA ని సముద్ర భద్రతా సూచిక (MSI), పోటు-పాటు, సురక్షిత మార్గాలు, ప్రమాదాలు లేదా చేపల ఉత్పత్తి క్షీణత గురించి అడగండి.'
            : langLower.startsWith('ta')
            ? 'ORCA விடம் கடல் பாதுகாப்பு குறியீடு (MSI), ஓதம், பாதுகாப்பான வழித்தடங்கள் அல்லது மீன் உற்பத்தி குறைவு குறித்து கேளுங்கள்.'
            : langLower.startsWith('hi')
            ? 'ORCA से समुद्री सुरक्षा सूचकांक (MSI), ज्वार-भाटा, सुरक्षित मार्ग, या मछली उत्पादन में गिरावट के बारे में प्रश्न पूछें।'
            : 'Ask ORCA about Marine Safety Index (MSI), safe routes with waypoints, tide hydrodynamics, PFZs, or fish productivity decline.'}
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
              <span>{langLower.startsWith('hi') ? 'ORCA से पूछें' : langLower.startsWith('te') ? 'ORCA ని అడగండి' : langLower.startsWith('ta') ? 'ORCA-விடம் கேட்கவும்' : 'Ask ORCA'}</span> <i>→</i>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
