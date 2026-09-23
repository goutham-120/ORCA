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
    title: 'समुद्री सुरक्षा सूचकांक (MSI)',
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

const PROMPT_SUGGESTIONS_OR = [
  {
    id: 'productivity_decline',
    category: 'ପାରିସ୍ଥିତିକ ତନ୍ତ୍ର',
    icon: '🔬',
    title: 'ମାଛ ଉତ୍ପାଦନ ହ୍ରାସ',
    query: 'ଏହି ଉପକୂଳ ଅଞ୍ଚଳରେ ମାଛ ଉତ୍ପାଦନ କାହିଁକି ହ୍ରାସ ପାଇଛି?',
    desc: 'ସାମୁଦ୍ରିକ ଉତ୍ତାପ ଏବଂ କ୍ଲୋରୋଫିଲ୍ ବିଶ୍ଳେଷଣ'
  },
  {
    id: 'safe_route',
    category: 'ନିରାପଦ ମାର୍ଗ',
    icon: '🧭',
    title: 'ସୁରକ୍ଷିତ ନୌକାଚାଳନା ମାର୍ଗ',
    query: 'ପାଣିପାଗ ଏବଂ ଲହଡ଼ିକୁ ଧ୍ୟାନରେ ରଖି ଡଙ୍ଗା ପାଇଁ ସବୁଠାରୁ ସୁରକ୍ଷିତ ମାର୍ଗ କେଉଁଟି?',
    desc: 'ବିପଦ ଏଡ଼ାଇବା ପାଇଁ ସୁରକ୍ଷିତ ପଥ'
  },
  {
    id: 'tide_conditions',
    category: 'ଜୁଆର-ଭଟ୍ଟା ଓ ପାଣିପାଗ',
    icon: '🌊',
    title: 'ଜୁଆର ଏବଂ ସମୁଦ୍ର ସ୍ଥିତି',
    query: 'ମୋର ମାଛ ଧରିବା ସ୍ଥାନ ନିକଟରେ ଜୁଆର-ଭଟ୍ଟା ଏବଂ ପାଣିପାଗ କିପରି ଅଛି?',
    desc: 'ଜୁଆର ସମୟ ଏବଂ ଲହଡ଼ି ଉଚ୍ଚତା'
  },
  {
    id: 'safety_check',
    category: 'ସୁରକ୍ଷା ଯାଞ୍ଚ (MSI)',
    icon: '🛡️',
    title: 'ସାମୁଦ୍ରିକ ସୁରକ୍ଷା ସୂଚକାଙ୍କ',
    query: 'ଆଜି ଏହି ଉପକୂଳ ଅଞ୍ଚଳରେ ଛୋଟ ଡଙ୍ଗା ଚଳାଇବା ସୁରକ୍ଷିତ କି?',
    desc: '୦-୧୦୦ ସାମୁଦ୍ରିକ ସୁରକ୍ଷା ସ୍କୋର'
  },
  {
    id: 'fishing_conditions',
    category: 'ମାଛ ଧରା / PFZ',
    icon: '🎣',
    title: 'ମାଛ ଧରିବା ଅଞ୍ଚଳ (PFZ)',
    query: 'ଆଖପାଖରେ କୌଣସି ସମ୍ଭାବ୍ୟ ମାଛ ଧରିବା ଅଞ୍ଚଳ (PFZ) ଉପଲବ୍ଧ ଅଛି କି?',
    desc: 'INCOIS PFZ ଏବଂ ସାମୁଦ୍ରିକ ତଥ୍ୟ'
  },
  {
    id: 'scenario_simulation',
    category: 'ସିମ୍ୟୁଲେସନ',
    icon: '🧪',
    title: 'ଜଳବାୟୁ ଓ ପବନ ସିମ୍ୟୁଲେସନ',
    query: 'ଯଦି ସମୁଦ୍ର ତାପମାତ୍ରା ୧.୫°C ବୃଦ୍ଧି ପାଏ ଏବଂ ପବନ ୩୦ ନଟ୍ ହୁଏ ତେବେ କ\'ଣ ହେବ?',
    desc: 'MSI ପରିବର୍ତ୍ତନ ଓ ଡଙ୍ଗା ସତର୍କତା'
  },
]

const PROMPT_SUGGESTIONS_BN = [
  {
    id: 'productivity_decline',
    category: 'বাস্তুতন্ত্র বিশ্লেষণ',
    icon: '🔬',
    title: 'মাছ উৎপাদন হ্রাস',
    query: 'এই উপকূলীয় অঞ্চলে মাছ উৎপাদন কেন হ্রাস পেয়েছে?',
    desc: 'সামুদ্রিক তাপপ্রবাহ ও ক্লোরোফিল বিশ্লেষণ'
  },
  {
    id: 'safe_route',
    category: 'নিরাপদ রুট',
    icon: '🧭',
    title: 'সবচেয়ে নিরাপদ নৌপথ',
    query: 'আবহাওয়া এবং ঢেউয়ের পরিস্থিতি বিবেচনা করে নৌকার জন্য সবচেয়ে নিরাপদ রুট কোনটি?',
    desc: 'ঝুঁকিমুক্ত ন্যাভিগেশন ওয়েপয়েন্ট'
  },
  {
    id: 'tide_conditions',
    category: 'জোয়ার-ভাটা ও আবহাওয়া',
    icon: '🌊',
    title: 'জোয়ার-ভাটা ও সমুদ্রের অবস্থা',
    query: 'আমার মাছ ধরার এলাকার কাছে জোয়ার-ভাটা এবং সমুদ্রের অবস্থা কেমন?',
    desc: 'জোয়ারের উচ্চতা ও ঢেউয়ের মাত্রা'
  },
  {
    id: 'safety_check',
    category: 'নিরাপত্তা পরীক্ষা (MSI)',
    icon: '🛡️',
    title: 'সামুদ্রিক নিরাপত্তা সূচক',
    query: 'আজ এই উপকূলীয় এলাকায় ছোট নৌকা চালানো কি নিরাপদ?',
    desc: '০-১০০ সামুদ্রিক নিরাপত্তা মূল্যায়ন'
  },
  {
    id: 'fishing_conditions',
    category: 'মাছ ধরা / PFZ',
    icon: '🎣',
    title: 'মাছ ধরার অঞ্চল (PFZ)',
    query: 'আশেপাশে কি কোনো সম্ভাব্য মাছ ধরার অঞ্চল (PFZ) উপলব্ধ আছে?',
    desc: 'INCOIS PFZ এবং থার্মাল ফ্রন্ট'
  },
  {
    id: 'scenario_simulation',
    category: 'সিমুলেশন',
    icon: '🧪',
    title: 'জলবায়ু ও বাতাস সিমুলেশন',
    query: 'যদি তাপমাত্রা ১.৫°C বৃদ্ধি পায় এবং বাতাস ৩০ নট হয় তবে কি ঘটবে?',
    desc: 'MSI পরিবর্তন ও নৌযান সতর্কতা'
  },
]

const PROMPT_SUGGESTIONS_KOK = [
  {
    id: 'productivity_decline',
    category: 'पर्यावरण अभ्यास',
    icon: '🔬',
    title: 'मासळी उत्पादनांत घट',
    query: 'ह्या दर्या वाठारांत मासळी उत्पादनांत घट कित्याक जाल्या?',
    desc: 'दर्याचें तापमान आनी क्लोरोफिल विश्लेषण'
  },
  {
    id: 'safe_route',
    category: 'सुरक्षित मार्ग',
    icon: '🧭',
    title: 'सगळ्यांत सुरक्षित दर्या मार्ग',
    query: 'हवामान आनी ल्हारांची स्थिती पळोवन व्हड्या खातीर सगळ्यांत सुरक्षित मार्ग खंयचो?',
    desc: 'धोके टाळपी वेपॉईंट्स'
  },
  {
    id: 'tide_conditions',
    category: 'भरती-सुकेती आनी हवामान',
    icon: '🌊',
    title: 'भरती-सुकेती आनी दर्या स्थिती',
    query: 'मासळी मारपाच्या जाग्या लागीं भरती-सुकेती आनी दर्याची स्थिती कशी आसा?',
    desc: 'भरतीची वेळ आनी ल्हाटांची उंचाय'
  },
  {
    id: 'safety_check',
    category: 'सुरक्षाय तपासणी (MSI)',
    icon: '🛡️',
    title: 'दर्या सुरक्षाय निर्देशांक',
    query: 'आयज दर्यांत ल्हान व्हड्यां खातीर भोंवडी करप सुरक्षित आसा काय?',
    desc: '०-१०० सुरक्षाय गुण'
  },
  {
    id: 'fishing_conditions',
    category: 'मासळी मारप / PFZ',
    icon: '🎣',
    title: 'मासळी मारपाचे वाठार (PFZ)',
    query: 'लागींच काय मासळी मारपाचे वाठार (PFZ) उपलब्ध आसात?',
    desc: 'INCOIS PFZ आनी दर्या म्हायती'
  },
  {
    id: 'scenario_simulation',
    category: 'सिम्युलेशन',
    icon: '🧪',
    title: 'हवामान आनी वारो सिम्युलेशन',
    query: 'तापमान १.५°C वाडल्यार आनी वारो ३० नॉट्स जाल्यार कितें घडटलें?',
    desc: 'MSI बदल आनी व्हड्यांक शिटकावणी'
  },
]

const PROMPT_SUGGESTIONS_TCY = [
  {
    id: 'productivity_decline',
    category: 'ಪರಿಸರ ವಿಶ್ಲೇಷಣೆ',
    icon: '🔬',
    title: 'ಮೀನ್ ಉತ್ಪಾದನೆ ಕಮ್ಮಿ ಆಯಿನೆಕ್ ಕಾರಣ',
    query: 'ಈ ಕಡಲ ಜಾಗೊಡು ಮೀನ್ ಉತ್ಪಾದನೆ ದಾಯೆ ಕಮ್ಮಿ ಆತ್ಂಡ್?',
    desc: 'ಕಡಲ ಶಾಖ ಬೊಕ್ಕ ಕ್ಲೋರೋಫಿಲ್ ವಿಶ್ಲೇಷಣೆ'
  },
  {
    id: 'safe_route',
    category: 'ರಕ್ಷಣೆದ ಸಾದಿ',
    icon: '🧭',
    title: 'ಎಡ್ಡೆ ರಕ್ಷಣೆದ ಕಡಲ ಸಾದಿ',
    query: 'ವಾತಾವರಣ ಬೊಕ್ಕ ಅಲೆತ ಸ್ಥಿತಿ ತೂದು ಓಡೊಡು ಪೋಪೆರೆ ಎಡ್ಡೆ ಸಾದಿ ಒವ್ವು?',
    desc: 'ಅಪಾಯ ದಾಂತಿನ ವೇಪಾಯಿಂಟ್‍ಲು'
  },
  {
    id: 'tide_conditions',
    category: 'ಉಬ್ಬರ-ಇಳಿತ & ವಾತಾವರಣ',
    icon: '🌊',
    title: 'ಉಬ್ಬರ-ಇಳಿತ ಬೊಕ್ಕ ಕಡಲ ಸ್ಥಿತಿ',
    query: 'ಮೀನ್ ಪತ್ತುನ ಜಾಗದ ಕೈತಲ್ ಉಬ್ಬರ-ಇಳಿತ ಬೊಕ್ಕ ಕಡಲ ಸ್ಥಿತಿ ಎಂಚ ಉಂಡು?',
    desc: 'ಉಬ್ಬರ ಇಳಿತ ಸಮಯ ಬೊಕ್ಕ ಅಲೆತ ಎತ್ತರ'
  },
  {
    id: 'safety_check',
    category: 'ರಕ್ಷಣೆ ಪರಿಶೀಲನೆ (MSI)',
    icon: '🛡️',
    title: 'ಕಡಲ ರಕ್ಷಣೆ ಸೂಚ್ಯಂಕ',
    query: 'ಇನಿ ಎಲ್ಯ ಓಡೊಡು ಕಡಲ್‌ಗ್ ಪೋಪಿನ ರಕ್ಷಣೆ ಉಂಡಾ?',
    desc: '೦-೧೦೦ ರಕ್ಷಣೆ ಸ್ಕೋರ್'
  },
  {
    id: 'fishing_conditions',
    category: 'ಮೀನ್ ಪತ್ತುನೆ / PFZ',
    icon: '🎣',
    title: 'ಮೀನ್ ಪತ್ತುನ ಜಾಗ (PFZ)',
    query: 'ಕೈತಲ್ ದಾಲಾ ಮೀನ್ ಪತ್ತುನ ಜಾಗೊಲು (PFZ) ಉಂಡಾ?',
    desc: 'INCOIS PFZ ಬೊಕ್ಕ ಮಾಹಿತಿ'
  },
  {
    id: 'scenario_simulation',
    category: 'ಸಿಮ್ಯುಲೇಶನ್',
    icon: '🧪',
    title: 'ವಾತಾವರಣ ಸಿಮ್ಯುಲೇಶನ್',
    query: 'ಶಾಖ ೧.೫°C ಹೆಚ್ಚಾದ್ ಗಾಳಿ ೩೦ ನಾಟ್ಸ್ ಆದ್ ಬತ್ತಿಂಡ ದಾನೆ ಆಪುಂಡು?',
    desc: 'MSI ಬದಲಾವಣೆ ಬೊಕ್ಕ ಓಡೊದ ಎಚ್ಚರಿಕೆ'
  },
]

const PROMPT_SUGGESTIONS_GU = [
  {
    id: 'productivity_decline',
    category: 'ઇકોસિસ્ટમ વિશ્લેષણ',
    icon: '🔬',
    title: 'માછલી ઉત્પાદનમાં ઘટાડો',
    query: 'આ દરિયાકાંઠાના વિસ્તારમાં માછલીના ઉત્પાદનમાં કેમ ઘટાડો થયો છે?',
    desc: 'દરિયાઈ હીટવેવ અને ક્લોરોફિલ વિશ્લેષણ'
  },
  {
    id: 'safe_route',
    category: 'સુરક્ષિત માર્ગ',
    icon: '🧭',
    title: 'સૌથી સુરક્ષિત નૌકાયન માર્ગ',
    query: 'હવામાન અને મોજાંની સ્થિતિને ધ્યાનમાં રાખીને બોટ માટે સૌથી સુરક્ષિત માર્ગ કયો છે?',
    desc: 'જોખમો ટાળતા વેપોઇન્ટ્સ'
  },
  {
    id: 'tide_conditions',
    category: 'ભરતી-ઓટ અને હવામાન',
    icon: '🌊',
    title: 'ભરતી-ઓટ અને દરિયાઈ સ્થિતિ',
    query: 'મારી માછીમારીની જગ્યા પાસે ભરતી-ઓટ અને દરિયાઈ સ્થિતિ કેવી છે?',
    desc: 'ભરતીનો સમય અને મોજાંની ઊંચાઈ'
  },
  {
    id: 'safety_check',
    category: 'સુરક્ષા તપાસ (MSI)',
    icon: '🛡️',
    title: 'દરિયાઈ સુરક્ષા સૂચકાંક',
    query: 'શું આજે આ દરિયાકાંઠાના વિસ્તારમાં નાની હોડીઓ ચલાવવી સલામત છે?',
    desc: '૦-૧૦૦ દરિયાઈ સુરક્ષા સ્કોર'
  },
  {
    id: 'fishing_conditions',
    category: 'માછીમારી / PFZ',
    icon: '🎣',
    title: 'માછીમારી વિસ્તારો (PFZ)',
    query: 'શું નજીકમાં સંભવિત માછીમારી વિસ્તારો (PFZ) ઉપલબ્ધ છે?',
    desc: 'INCOIS PFZ અને દરિયાઈ ફ્રન્ટ્સ'
  },
  {
    id: 'scenario_simulation',
    category: 'પરિદ્રશ્ય સિમ્યુલેશન',
    icon: '🧪',
    title: 'આબોહવા અને પવન સિમ્યુલેશન',
    query: 'જો તાપમાન ૧.૫°C વધે અને પવન ૩૦ નોટ્સ પહોંચે તો શું થશે?',
    desc: 'MSI ફેરફાર અને બોટ પ્રતિબંધ સલાહ'
  },
]

const PROMPT_SUGGESTIONS_MR = [
  {
    id: 'productivity_decline',
    category: 'पर्यावरण विश्लेषण',
    icon: '🔬',
    title: 'मासे उत्पादनात घट',
    query: 'या किनारी भागात मासे उत्पादनात घट का झाली आहे?',
    desc: 'समुद्री उष्णतेची लाट आणि क्लोरोफिल विश्लेषण'
  },
  {
    id: 'safe_route',
    category: 'सुरक्षित मार्ग',
    icon: '🧭',
    title: 'सर्वात सुरक्षित सागरी मार्ग',
    query: 'हवामान आणि लाटांची स्थिती लक्षात घेऊन बोटीसाठी सर्वात सुरक्षित मार्ग कोणता आहे?',
    desc: 'धोके टाळणारे वेपॉईंट्स'
  },
  {
    id: 'tide_conditions',
    category: 'भरती-ओहोटी व हवामान',
    icon: '🌊',
    title: 'भरती-ओहोटी आणि समुद्री स्थिती',
    query: 'माझ्या मासेमारीच्या जागेजवळ भरती-ओहोटी आणि समुद्राची स्थिती कशी आहे?',
    desc: 'भरतीची वेळ आणि लाटांची उंची'
  },
  {
    id: 'safety_check',
    category: 'सुरक्षा तपासणी (MSI)',
    icon: '🛡️',
    title: 'सागरी सुरक्षा निर्देशांक',
    query: 'आज या किनारी भागात लहान बोटी चालवणे सुरक्षित आहे का?',
    desc: '०-१०० सागरी सुरक्षा गुण'
  },
  {
    id: 'fishing_conditions',
    category: 'मासेमारी / PFZ',
    icon: '🎣',
    title: 'मासेमारी क्षेत्र (PFZ)',
    query: 'आज सर्वात जवळचे संभाव्य मासेमारी क्षेत्र कुठे आहे?',
    desc: 'उपग्रह आधारित PFZ क्षेत्र'
  }
]

const PROMPT_SUGGESTIONS_ML = [
  {
    id: 'productivity_decline',
    category: 'പരിസ്ഥിതി വിശകലനം',
    icon: '🔬',
    title: 'മത്സ്യ ലഭ്യതയിലെ കുറവ്',
    query: 'ഈ തീരദേശ മേഖലയിൽ മത്സ്യ ലഭ്യത കുറയാൻ എന്താണ് കാരണം?',
    desc: 'സമുദ്ര താപനില ഉയർച്ചയും ക്ലോറോഫിൽ കുറവും'
  },
  {
    id: 'safe_route',
    category: 'സുരക്ഷിത പാത',
    icon: '🧭',
    title: 'സുരക്ഷിതമായ സമുദ്ര റൂട്ട്',
    query: 'കാലാവസ്ഥയും തിരമാലകളും കണക്കിലെടുത്ത് ബോട്ടിന് ഏറ്റവും സുരക്ഷിതമായ റൂട്ട് ഏതാണ്?',
    desc: 'അപകടങ്ങൾ ഒഴിവാക്കുന്ന വേപോയിന്റുകൾ'
  },
  {
    id: 'tide_conditions',
    category: 'വേലിയേറ്റം & കാലാവസ്ഥ',
    icon: '🌊',
    title: 'വേലിയേറ്റം & സമുദ്രാവസ്ഥ',
    query: 'എന്റെ മീൻപിടുത്ത സ്ഥലത്തിന് സമീപമുള്ള വേലിയേറ്റവും സമുദ്രാവസ്ഥയും എങ്ങനെയാണ്?',
    desc: 'വേലിയേറ്റ സമയം & തിരമാല ഉയരം'
  },
  {
    id: 'safety_check',
    category: 'സുരക്ഷാ പരിശോധന (MSI)',
    icon: '🛡️',
    title: 'സമുദ്ര സുരക്ഷാ സൂചിക',
    query: 'ഇന്ന് ചെറിയ വള്ളങ്ങൾ കടലിൽ പോകുന്നത് സുരക്ഷിതമാണോ?',
    desc: '0-100 സമുദ്ര സുരക്ഷാ സ്കോർ'
  },
  {
    id: 'fishing_conditions',
    category: 'മത്സ്യബന്ധന മേഖല (PFZ)',
    icon: '🎣',
    title: 'സാധ്യതാ മത്സ്യബന്ധന മേഖല (PFZ)',
    query: 'സമീപത്ത് സാധ്യതയുള്ള മത്സ്യബന്ധന മേഖലകൾ (PFZ) ലഭ്യമാണോ?',
    desc: 'INCOIS PFZ സാറ്റലൈറ്റ് വിവരങ്ങൾ'
  },
  {
    id: 'scenario_simulation',
    category: 'സിമുലേഷൻ',
    icon: '🧪',
    title: 'കാലാവസ്ഥാ സിമുലേഷൻ',
    query: 'താപനില 1.5°C ഉയരുകയും കാറ്റ് 30 നോട്ട്സ് ആവുകയും ചെയ്താൽ എന്ത് സംഭവിക്കും?',
    desc: 'MSI മാറ്റവും ബോട്ട് നിയന്ത്രണ മുന്നറിയിപ്പും'
  },
]

const PROMPT_SUGGESTIONS_KN = [
  {
    id: 'productivity_decline',
    category: 'ಪರಿಸರ ವಿಶ್ಲೇಷಣೆ',
    icon: '🔬',
    title: 'ಮೀನು ಉತ್ಪಾದನೆ ಇಳಿಕೆ',
    query: 'ಈ ಕರಾವಳಿ ಪ್ರದೇಶದಲ್ಲಿ ಮೀನು ಉತ್ಪಾದನೆ ಏಕೆ ಕಡಿಮೆಯಾಗಿದೆ?',
    desc: 'ಸಮುದ್ರ ಶಾಖದ ಅಲೆ ಮತ್ತು ಕ್ಲೋರೋಫಿಲ್ ಕೊರತೆ'
  },
  {
    id: 'safe_route',
    category: 'ಸುರಕ್ಷಿತ ಮಾರ್ಗ',
    icon: '🧭',
    title: 'ಅತ್ಯಂತ ಸುರಕ್ಷಿತ ನೌಕಾಯಾನ ಮಾರ್ಗ',
    query: 'ಹವಾಮಾನ ಮತ್ತು ಅಲೆಗಳ ಪರಿಸ್ಥಿತಿಯನ್ನು ಗಮನದಲ್ಲಿಟ್ಟುಕೊಂಡು ದೋಣಿಗೆ ಸುರಕ್ಷಿತ ಮಾರ್ಗ ಯಾವುದು?',
    desc: 'ಅಪಾಯಗಳನ್ನು ತಪ್ಪಿಸುವ ವೇಪಾಯಿಂಟ್‌ಗಳು'
  },
  {
    id: 'tide_conditions',
    category: 'ಉಬ್ಬರ-ಇಳಿತ & ಹವಾಮಾನ',
    icon: '🌊',
    title: 'ಉಬ್ಬರ-ಇಳಿತ ಮತ್ತು ಸಾಗರ ಸ್ಥಿತಿ',
    query: 'ನನ್ನ ಮೀನುಗಾರಿಕಾ ಪ್ರದೇಶದ ಬಳಿ ಉಬ್ಬರ-ಇಳಿತ ಮತ್ತು ಸಾಗರ ಪರಿಸ್ಥಿತಿ ಹೇಗಿದೆ?',
    desc: 'ಉಬ್ಬರ ಸಮಯ ಮತ್ತು ಅಲೆಗಳ ಎತ್ತರ'
  },
  {
    id: 'safety_check',
    category: 'ಸುರಕ್ಷತಾ ತಪಾಸಣೆ (MSI)',
    icon: '🛡️',
    title: 'ಸಾಗರ ಸುರಕ್ಷತಾ ಸೂಚ್ಯಂಕ',
    query: 'ಇಂದು ಈ ಕರಾವಳಿ ಪ್ರದೇಶದಲ್ಲಿ ಸಣ್ಣ ದೋಣಿಗಳನ್ನು ಚಲಾಯಿಸುವುದು ಸುರಕ್ಷಿತವೇ?',
    desc: '0-100 ಸಾಗರ ಸುರಕ್ಷತಾ ಸ್ಕೋರ್'
  },
  {
    id: 'fishing_conditions',
    category: 'ಮೀನುಗಾರಿಕೆ / PFZ',
    icon: '🎣',
    title: 'ಮೀನುಗಾರಿಕಾ ವಲಯಗಳು (PFZ)',
    query: 'ಸಮೀಪದಲ್ಲಿ ಸಂಭಾವ್ಯ ಮೀನುಗಾರಿಕಾ ವಲಯಗಳು (PFZ) ಲಭ್ಯವಿದೆಯೇ?',
    desc: 'INCOIS PFZ ಮತ್ತು ಸಾಗರ ಮಾಹಿತಿ'
  },
  {
    id: 'scenario_simulation',
    category: 'ಸಿಮ್ಯುಲೇಶನ್',
    icon: '🧪',
    title: 'ಹವಾಮಾನ ಮತ್ತು ಗಾಳಿ ಸಿಮ್ಯುಲೇಶನ್',
    query: 'ತಾಪಮಾನ 1.5°C ಹೆಚ್ಚಾದರೆ ಮತ್ತು ಗಾಳಿ 30 ನಾಟ್ಸ್ ತಲುಪಿದರೆ ಏನಾಗುತ್ತದೆ?',
    desc: 'MSI ಬದಲಾವಣೆ ಮತ್ತು ದೋಣಿ ಎಚ್ಚರಿಕೆ'
  },
]

export default function WelcomeScreen({ onSelectPrompt, language = 'en' }) {
  const langLower = (language || 'en').toLowerCase()
  const promptList = langLower.startsWith('ml')
    ? PROMPT_SUGGESTIONS_ML
    : langLower.startsWith('kn')
    ? PROMPT_SUGGESTIONS_KN
    : langLower.startsWith('mr')
    ? PROMPT_SUGGESTIONS_MR
    : langLower.startsWith('gu')
    ? PROMPT_SUGGESTIONS_GU
    : langLower.startsWith('tcy')
    ? PROMPT_SUGGESTIONS_TCY
    : langLower.startsWith('kok')
    ? PROMPT_SUGGESTIONS_KOK
    : langLower.startsWith('bn')
    ? PROMPT_SUGGESTIONS_BN
    : langLower.startsWith('or')
    ? PROMPT_SUGGESTIONS_OR
    : langLower.startsWith('ta')
    ? PROMPT_SUGGESTIONS_TA
    : langLower.startsWith('te')
    ? PROMPT_SUGGESTIONS_TE
    : langLower.startsWith('hi')
    ? PROMPT_SUGGESTIONS_HI
    : PROMPT_SUGGESTIONS

  const getTitle = () => {
    if (langLower.startsWith('ml')) return 'ഏത് സമുദ്രാവസ്ഥയാണ് നിങ്ങൾ വിശകലനം ചെയ്യാൻ ആഗ്രഹിക്കുന്നത്?'
    if (langLower.startsWith('kn')) return 'ನೀವು ಯಾವ ಸಾಗರ ಪರಿಸ್ಥಿತಿಯನ್ನು ವಿಶ್ಲೇಷಿಸಲು ಬಯಸುತ್ತೀರಿ?'
    if (langLower.startsWith('mr')) return 'तुम्ही कोणती समुद्री स्थिती विश्लेषित करू इच्छिता?'
    if (langLower.startsWith('gu')) return 'તમે કઈ દરિયાઈ સ્થિતિનું વિશ્લેષણ કરવા માંગો છો?'
    if (langLower.startsWith('tcy')) return 'ಈರ್ ಒವ್ವು ಕಡಲ ಸ್ಥಿತಿನ್ ವಿಶ್ಲೇಷಣೆ ಮಲ್ಪೆರೆ ಇಷ್ಟ ಪಡ್ಪುರ್?'
    if (langLower.startsWith('kok')) return 'तुमी कसली दर्याची स्थिती तपासायंक सोदतात?'
    if (langLower.startsWith('bn')) return 'আপনি কোন সামুদ্রিক অবস্থা বিশ্লেষণ করতে চান?'
    if (langLower.startsWith('or')) return 'ଆପଣ କେଉଁ ସାମୁଦ୍ରିକ ସ୍ଥିତିର ବିଶ୍ଲେଷଣ କରିବାକୁ ଚାହୁଁଛନ୍ତି?'
    if (langLower.startsWith('ta')) return 'நீங்கள் எந்த கடல் நிலையை பகுப்பாய்வு செய்ய விரும்புகிறீர்கள்?'
    if (langLower.startsWith('te')) return 'మీరు ఏ సముద్ర పరిస్థితిని విశ్ಲೇషించాలనుకుంటున్నారు?'
    if (langLower.startsWith('hi')) return 'आप क्या जांचना चाहते हैं?'
    return 'What would you like to check?'
  }

  const getSubtitle = () => {
    if (langLower.startsWith('ml')) return 'ORCA-യോട് സമുദ്ര സുരക്ഷാ സൂചിക (MSI), വേലിയേറ്റം, സുരക്ഷിത റൂട്ടുകൾ, അല്ലെങ്കിൽ മത്സ്യബന്ധന മേഖലകൾ ചോദിക്കുക.'
    if (langLower.startsWith('kn')) return 'ORCA ನಿಂದ ಸಾಗರ ಸುರಕ್ಷತಾ ಸೂಚ್ಯಂಕ (MSI), ಉಬ್ಬರ-ಇಳಿತ, ಸುರಕ್ಷಿತ ಮಾರ್ಗಗಳು ಅಥವಾ ಮೀನುಗಾರಿಕಾ ವಲಯಗಳ பற்றி ಕೇಳಿ.'
    if (langLower.startsWith('mr')) return 'ORCA कडून समुद्री सुरक्षा निर्देशांक (MSI), भरती-ओहोटी, सुरक्षित मार्ग किंवा मासेमारी क्षेत्रांबद्दल विचारा.'
    if (langLower.startsWith('gu')) return 'ORCA ને દરિયાઈ સુરક્ષા સૂચકાંક (MSI), ભરતી-ઓટ, સુરક્ષિત માર્ગો અથવા માછીમારી વિસ્તારો વિશે પૂછો.'
    if (langLower.startsWith('tcy')) return 'ORCA ಡ್ ಕಡಲ ರಕ್ಷಣೆ ಸೂಚ್ಯಂಕ (MSI), ಉಬ್ಬರ-ಇಳಿತ, ರಕ್ಷಣೆದ ಸಾದಿ ಅತ್ತ್ಂಡ ಮೀನ್ ಪത്തുನ ಜಾಗೊಲೆ ಕೇನ್ಲೆ.'
    if (langLower.startsWith('kok')) return 'ORCA कडल्यान दर्या सुरक्षाय निर्देशांक (MSI), भरती-सुकेती, सुरक्षित मार्ग वा मासळी मारपाचे वाठार विचारात.'
    if (langLower.startsWith('bn')) return 'ORCA-কে সামুদ্রিক নিরাপত্তা সূচক (MSI), জোয়ার-ভাটা, নিরাপদ রুট বা মাছ ধরার অঞ্চল সম্পর্কে জিজ্ঞাসা করুন।'
    if (langLower.startsWith('or')) return 'ORCA କୁ ସାମୁଦ୍ରିକ ସୁରକ୍ଷା ସୂଚକାଙ୍କ (MSI), ଜୁଆର-ଭଟ୍ଟା, ସୁରକ୍ଷିତ ମାର୍ଗ କିମ୍ବା ମାଛ ଧରିବା ଅଞ୍ଚଳ ବିଷୟରେ ପଚାରନ୍ତୁ।'
    if (langLower.startsWith('ta')) return 'ORCA விடம் கடல் பாதுகாப்பு குறியீடு (MSI), ஓதம், பாதுகாப்பான வழித்தடங்கள் அல்லது மீன்பிடி மண்டலங்கள் குறித்து கேளுங்கள்.'
    if (langLower.startsWith('te')) return 'ORCA ని సముద్ర భద్రతా సూచిక (MSI), పోటు-పాటు, సురక్షిత మార్గాలు లేదా చేపల వేట ప్రాంతాల గురించి అడగండి.'
    if (langLower.startsWith('hi')) return 'ORCA से समुद्री सुरक्षा सूचकांक (MSI), ज्वार-भाटा, सुरक्षित मार्ग या मत्स्य क्षेत्र के बारे में पूछें।'
    return 'Ask about marine conditions, PFZs, weather, tides, or safe routes.'
  }

  const getButtonText = () => {
    if (langLower.startsWith('ml')) return 'ORCA-യോട് ചോദിക്കുക'
    if (langLower.startsWith('kn')) return 'ORCA ಗೆ ಕೇಳಿ'
    if (langLower.startsWith('mr')) return 'ORCA ला विचारा'
    if (langLower.startsWith('gu')) return 'ORCA ને પૂછો'
    if (langLower.startsWith('tcy')) return 'ORCA ಡ್ ಕೇನ್ಲೆ'
    if (langLower.startsWith('kok')) return 'ORCA कडेन विचारात'
    if (langLower.startsWith('bn')) return 'ORCA-কে জিজ্ঞাসা করুন'
    if (langLower.startsWith('or')) return 'ORCA କୁ ପଚାରନ୍ତୁ'
    if (langLower.startsWith('ta')) return 'ORCA-விடம் கேட்கவும்'
    if (langLower.startsWith('te')) return 'ORCA ని అడగండి'
    if (langLower.startsWith('hi')) return 'ORCA से पूछें'
    return 'Ask ORCA'
  }

  return (
    <div className="welcome-command-screen font-inter">
      <div className="welcome-hero-card">
        <div className="welcome-avatar-orb">
          <img src={orcaLogo} alt="ORCA Logo" className="orb-logo-img" />
        </div>
        <h2 className="welcome-title font-sora">{getTitle()}</h2>
        <p className="welcome-subtitle font-inter">{getSubtitle()}</p>
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
              <span>{getButtonText()}</span> <i>→</i>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
