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

const PROMPT_SUGGESTIONS_TA = [
  {
    id: 'sea_conditions',
    category: 'கடல் நிலை',
    icon: '🌊',
    title: 'கடல் நிலை (Sea Conditions)',
    query: 'தற்போதைய கடல் நிலை, அலை உயரம் மற்றும் ஸ்வெல் விவரங்கள் என்ன?',
    desc: 'அலை உயரம், காலம் மற்றும் ஸ்வெல்'
  },
  {
    id: 'safety_check',
    category: 'பாதுகாப்பு சோதனை',
    icon: '🛡️',
    title: 'பாதுகாப்பு சோதனை (Safety Check)',
    query: 'இன்று இந்த பகுதியில் சிறிய படகுகளை இயக்குவது பாதுகாப்பானதா?',
    desc: 'படகு இயக்க ஆபத்து மதிப்பீடு'
  },
  {
    id: 'route_risk',
    category: 'வழித்தட ஆபத்து',
    icon: '⚓',
    title: 'வழித்தட ஆபத்து (Route Risk)',
    query: 'கடலோரப் பாதைகளில் ஏதேனும் அபாயகரமான அல்லது தடைசெய்யப்பட்ட பகுதிகள் உள்ளனவா?',
    desc: 'ஆபத்து மற்றும் தடைசெய்யப்பட்ட மண்டலங்கள்'
  },
  {
    id: 'weather_forecast',
    category: 'வானிலை',
    icon: '🌦️',
    title: 'வானிலை முன்னறிவிப்பு (Weather)',
    query: 'தற்போதைய காற்றின் வேகம், திசை மற்றும் வானிலை முன்னறிவிப்பு என்ன?',
    desc: 'காற்றின் வேகம், பார்வைத்திறன் & அழுத்தம்'
  },
  {
    id: 'fishing_conditions',
    category: 'மீன்பிடித்தல் / PFZ',
    icon: '🎣',
    title: 'மீன்பிடி மண்டலங்கள் (PFZ)',
    query: 'அருகில் சாத்தியமான மீன்பிடி மண்டலங்கள் (PFZ) உள்ளனவா?',
    desc: 'PFZ தகவல் மற்றும் மீன்பிடி மண்டலங்கள்'
  }
]

const PROMPT_SUGGESTIONS_OR = [
  {
    id: 'sea_conditions',
    category: 'ସମୁଦ୍ର ସ୍ଥିତି',
    icon: '🌊',
    title: 'ସମୁଦ୍ର ସ୍ଥିତି (Sea Conditions)',
    query: 'ବର୍ତ୍ତମାନର ସମୁଦ୍ର ସ୍ଥିତି, ଲହଡ଼ିର ଉଚ୍ଚତା ଏବଂ ସ୍ୱେଲ୍ ସୂଚନା କ\'ଣ?',
    desc: 'ଲହଡ଼ିର ଉଚ୍ଚତା ଏବଂ ସମୁଦ୍ର ସ୍ୱେଲ୍'
  },
  {
    id: 'safety_check',
    category: 'ସୁରକ୍ଷା ଯାଞ୍ଚ',
    icon: '🛡️',
    title: 'ସୁରକ୍ଷା ଯାଞ୍ଚ (Safety Check)',
    query: 'ଆଜି ଏହି ଉପକୂଳ ଅଞ୍ଚଳରେ ଛୋଟ ଡଙ୍ଗା ଚଳାଇବା ସୁରକ୍ଷିତ କି?',
    desc: 'ନୌକାଚାଳନା ବିପଦ ଆକଳନ'
  },
  {
    id: 'route_risk',
    category: 'ମାର୍ଗ ବିପଦ',
    icon: '⚓',
    title: 'ମାର୍ଗ ବିପଦ (Route Risk)',
    query: 'ଉପକୂଳ ସାମୁଦ୍ରିକ ମାର୍ଗରେ କୌଣସି ବିପଦପୂର୍ଣ୍ଣ କିମ୍ବା ନିଷିଦ୍ଧ ଅଞ୍ଚଳ ଅଛି କି?',
    desc: 'ବିପଦ ଏବଂ ନିଷିଦ୍ଧ ଅଞ୍ଚଳ ସୂଚନା'
  },
  {
    id: 'weather_forecast',
    category: 'ପାଣିପାଗ',
    icon: '🌦️',
    title: 'ପାଣିପାଗ ପୂର୍ବାନୁମାନ (Weather)',
    query: 'ବର୍ତ୍ତମାନର ପବନର ବେଗ, ଦିଗ ଏବଂ ପାଣିପାଗ ପୂର୍ବାନୁମାନ କ\'ଣ?',
    desc: 'ପବନ, ଦୃଶ୍ୟମାନତା ଏବଂ ଚାପ'
  },
  {
    id: 'fishing_conditions',
    category: 'ମାଛ ଧରା / PFZ',
    icon: '🎣',
    title: 'ମାଛ ଧରିବା ଅଞ୍ଚଳ (PFZ)',
    query: 'ଆଖପାଖରେ କୌଣସି ସମ୍ଭାବ୍ୟ ମାଛ ଧରିବା ଅଞ୍ଚଳ (PFZ) ଉପଲବ୍ଧ ଅଛି କି?',
    desc: 'PFZ ସୂଚନା ଏବଂ ମାଛ ଧରିବା ମଣ୍ଡଳ'
  }
]

const PROMPT_SUGGESTIONS_BN = [
  {
    id: 'sea_conditions',
    category: 'সমুদ্রের অবস্থা',
    icon: '🌊',
    title: 'সমুদ্রের অবস্থা (Sea Conditions)',
    query: 'বর্তমান সমুদ্রের অবস্থা, ঢেউয়ের উচ্চতা এবং সোয়েল তথ্য কী?',
    desc: 'ঢেউয়ের উচ্চতা, সময়কাল এবং সোয়েল'
  },
  {
    id: 'safety_check',
    category: 'নিরাপত্তা পরীক্ষা',
    icon: '🛡️',
    title: 'নিরাপত্তা পরীক্ষা (Safety Check)',
    query: 'আজ এই উপকূলীয় এলাকায় ছোট নৌকা চালানো কি নিরাপদ?',
    desc: 'নৌচলাচল ঝুঁকি মূল্যায়ন'
  },
  {
    id: 'route_risk',
    category: 'রুট ঝুঁকি',
    icon: '⚓',
    title: 'রুট ঝুঁকি (Route Risk)',
    query: 'উপকূলীয় সামুদ্রিক রুটে কি কোনো সক্রিয় বিপদ বা নিষিদ্ধ এলাকা আছে?',
    desc: 'বিপদ এবং নিষিদ্ধ অঞ্চল তথ্য'
  },
  {
    id: 'weather_forecast',
    category: 'আবহাওয়া',
    icon: '🌦️',
    title: 'আবহাওয়ার পূর্বাভাস (Weather)',
    query: 'বর্তমান বাতাসের গতিবেগ, দিক এবং আবহাওয়ার পূর্বাভাস কী?',
    desc: 'বাতাসের গতি, দৃশ্যমানতা এবং চাপ'
  },
  {
    id: 'fishing_conditions',
    category: 'মাছ ধরা / PFZ',
    icon: '🎣',
    title: 'মাছ ধরার অঞ্চল (PFZ)',
    query: 'আশেপাশে কি কোনো সম্ভাব্য মাছ ধরার অঞ্চল (PFZ) উপলব্ধ আছে?',
    desc: 'PFZ তথ্য এবং মাছ ধরার অঞ্চল'
  }
]

const PROMPT_SUGGESTIONS_KOK = [
  {
    id: 'sea_conditions',
    category: 'दर्याची स्थिती',
    icon: '🌊',
    title: 'दर्याची स्थिती (Sea Conditions)',
    query: 'सद्याची दर्याची स्थिती, ल्हारांची उंचाय आनी स्वेल कशे आसात?',
    desc: 'ल्हाटांची उंचाय आनी दर्याची स्थिती'
  },
  {
    id: 'safety_check',
    category: 'सुरक्षाय तपासणी',
    icon: '🛡️',
    title: 'सुरक्षाय तपासणी (Safety Check)',
    query: 'आयज दर्यांत ल्हान व्हड्यां खातीर भोंवडी करप सुरक्षित आसा काय?',
    desc: 'व्हडेपणाचो धोको तपासप'
  },
  {
    id: 'route_risk',
    category: 'मार्ग धोको',
    icon: '⚓',
    title: 'मार्गाचो धोको (Route Risk)',
    query: 'तटवर्तीय दर्या मार्गांचेर काय धोक्याचे वा बंदी आशिले वाठार आसात?',
    desc: 'धोक्याचे आनी बंदी आशिले वाठार'
  },
  {
    id: 'weather_forecast',
    category: 'हवामान',
    icon: '🌦️',
    title: 'हवामान अंदाज (Weather)',
    query: 'सद्याचो वार्याचा वेग, दिशा आनी हवामानाचो अंदाज काय आसा?',
    desc: 'वारो, दृश्यता आनी हवेचो दाब'
  },
  {
    id: 'fishing_conditions',
    category: 'मासळी मारप / PFZ',
    icon: '🎣',
    title: 'मासळी मारपाचे वाठार (PFZ)',
    query: 'लागींच काय मासळी मारपाचे वाठार (PFZ) वा थर्मल फ्रंट उपलब्ध आसात?',
    desc: 'PFZ आनी मासळी मारपाची माहिती'
  }
]

const PROMPT_SUGGESTIONS_TCY = [
  {
    id: 'sea_conditions',
    category: 'ಕಡಲ ಸ್ಥಿತಿ',
    icon: '🌊',
    title: 'ಕಡಲ ಸ್ಥಿತಿ (Sea Conditions)',
    query: 'ಇತ್ತೆದ ಕಡಲ ಸ್ಥಿತಿ, ಅಲೆತ ಎತ್ತರ ಬೊಕ್ಕ ಸ್ವೆಲ್ ಎಂಚ ಉಂಡು?',
    desc: 'ಅಲೆತ ಎತ್ತರ ಬೊಕ್ಕ ಕಡಲ ಸ್ಥಿತಿ'
  },
  {
    id: 'safety_check',
    category: 'ರಕ್ಷಣೆ ಪರಿಶೀಲನೆ',
    icon: '🛡️',
    title: 'ರಕ್ಷಣೆ ಪರಿಶೀಲನೆ (Safety Check)',
    query: 'ಇನಿ ಎಲ್ಯ ಓಡೊಡು ಕಡಲ್‌ಗ್ ಪೋಪಿನ ರಕ್ಷಣೆ ಉಂಡಾ?',
    desc: 'ಓಡೊದ ಅಪಾಯ ಪರಿಶೀಲನೆ'
  },
  {
    id: 'route_risk',
    category: 'ಸಾದಿದ ಅಪಾಯ',
    icon: '⚓',
    title: 'ಸಾದಿದ ಅಪಾಯ (Route Risk)',
    query: 'ಕಡಲ ಸಾದಿಡ್ ದಾಲಾ ಅಪಾಯ ಬೊಕ್ಕ ತಡೆ ಉಪ್ಪುನ ಜಾಗೊಲು ಉಂಡಾ?',
    desc: 'ಅಪಾಯ ಬೊಕ್ಕ ತಡೆ ಉಪ್ಪುನ ಜಾಗೊಲು'
  },
  {
    id: 'weather_forecast',
    category: 'ವಾತಾವರಣ',
    icon: '🌦️',
    title: 'ವಾತಾವರಣ (Weather)',
    query: 'ಇತ್ತೆದ ಗಾಳಿದ ವೇಗ, ದಿಕ್ಕ್ ಬೊಕ್ಕ ವಾತಾವರಣದ ಅಂದಾಜಿ ದಾನೆ?',
    desc: 'ಗಾಳಿ ಬೊಕ್ಕ ಗಾಳಿದ ಒತ್ತಡ'
  },
  {
    id: 'fishing_conditions',
    category: 'ಮೀನ್ ಪತ್ತುನೆ / PFZ',
    icon: '🎣',
    title: 'ಮೀನ್ ಪತ್ತುನ ಜಾಗ (PFZ)',
    query: 'ಕೈತಲ್ ದಾಲಾ ಮೀನ್ ಪತ್ತುನ ಜಾಗೊಲು (PFZ) ಉಂಡಾ?',
    desc: 'PFZ ಬೊಕ್ಕ ಮೀನ್ ಪತ್ತುನ ಮಾಹಿತಿ'
  }
]

const PROMPT_SUGGESTIONS_GU = [
  {
    id: 'sea_conditions',
    category: 'દરિયાઈ સ્થિતિ',
    icon: '🌊',
    title: 'દરિયાઈ સ્થિતિ (Sea Conditions)',
    query: 'વર્તમાન દરિયાઈ સ્થિતિ, મોજાની ઊંચાઈ અને સ્વેલની વિગતો શું છે?',
    desc: 'મોજાની ઊંચાઈ અને દરિયાઈ સ્થિતિ'
  },
  {
    id: 'safety_check',
    category: 'સુરક્ષા તપાસ',
    icon: '🛡️',
    title: 'સુરક્ષા તપાસ (Safety Check)',
    query: 'શું આજે આ દરિયાકાંઠાના વિસ્તારમાં નાની હોડીઓ ચલાવવી સલામત છે?',
    desc: 'હોડી ચલાવવાનું જોખમ આકારણી'
  },
  {
    id: 'route_risk',
    category: 'માર્ગ જોખમ',
    icon: '⚓',
    title: 'માર્ગ જોખમ (Route Risk)',
    query: 'શું દરિયાકાંઠાના નૌકાયન માર્ગો પર કોઈ સક્રિય જોખમો કે પ્રતિબંધિત વિસ્તારો છે?',
    desc: 'જોખમો અને પ્રતિબંધિત વિસ્તારો'
  },
  {
    id: 'weather_forecast',
    category: 'હવામાન',
    icon: '🌦️',
    title: 'હવામાન આગાહી (Weather)',
    query: 'વર્તમાન પવનની ઝડપ, દિશા અને હવામાનની આગાહી શું છે?',
    desc: 'પવન, દ્રશ્યતા અને હવાનું દબાણ'
  },
  {
    id: 'fishing_conditions',
    category: 'માછીમારી / PFZ',
    icon: '🎣',
    title: 'માછીમારી વિસ્તારો (PFZ)',
    query: 'શું નજીકમાં સંભવિત માછીમારી વિસ્તારો (PFZ) કે થર્મલ ફ્રન્ટ ઉપલબ્ધ છે?',
    desc: 'PFZ અને માછીમારીની માહિતી'
  }
]

const PROMPT_SUGGESTIONS_MR = [
  {
    id: 'sea_conditions',
    category: 'समुद्री स्थिती',
    icon: '🌊',
    title: 'समुद्री स्थिती (Sea Conditions)',
    query: 'सध्याची समुद्री स्थिती, लाटांची उंची आणि स्वेल कसे आहेत?',
    desc: 'लाटांची उंची आणि समुद्री स्थिती'
  },
  {
    id: 'safety_check',
    category: 'सुरक्षा तपासणी',
    icon: '🛡️',
    title: 'सुरक्षा तपासणी (Safety Check)',
    query: 'आज या किनारी भागात लहान बोटी चालवणे सुरक्षित आहे का?',
    desc: 'बोटींच्या धोक्याचे मूल्यांकन'
  },
  {
    id: 'route_risk',
    category: 'मार्ग धोका',
    icon: '⚓',
    title: 'मार्ग धोका (Route Risk)',
    query: 'किनारी जलमार्गांवर काही सक्रिय धोके किंवा प्रतिबंधित क्षेत्र आहेत का?',
    desc: 'धोके आणि प्रतिबंधित क्षेत्र'
  },
  {
    id: 'weather_forecast',
    category: 'हवामान',
    icon: '🌦️',
    title: 'हवामान अंदाज (Weather)',
    query: 'सध्याचा वाऱ्याचा वेग, दिशा आणि हवामानाचा अंदाज काय आहे?',
    desc: 'वारा, दृश्यमानता आणि हवेचा दाब'
  },
  {
    id: 'fishing_conditions',
    category: 'मासेमारी / PFZ',
    icon: '🎣',
    title: 'मासेमारी क्षेत्र (PFZ)',
    query: 'जवळ काही संभाव्य मासेमारी क्षेत्रे (PFZ) किंवा थर्मल फ्रंट उपलब्ध आहेत का?',
    desc: 'PFZ आणि मासेमारी माहिती'
  }
]

export default function WelcomeScreen({ onSelectPrompt, language = 'en' }) {
  const isHindi = language === 'hi'
  const isTelugu = language === 'te'
  const isTamil = language === 'ta'
  const isOdia = language === 'or'
  const isBengali = language === 'bn'
  const isKonkani = language === 'kok'
  const isTulu = language === 'tcy'
  const isGujarati = language === 'gu'
  const isMarathi = language === 'mr'
  const promptList = isMarathi ? PROMPT_SUGGESTIONS_MR : isGujarati ? PROMPT_SUGGESTIONS_GU : isTulu ? PROMPT_SUGGESTIONS_TCY : isKonkani ? PROMPT_SUGGESTIONS_KOK : isBengali ? PROMPT_SUGGESTIONS_BN : isOdia ? PROMPT_SUGGESTIONS_OR : isTamil ? PROMPT_SUGGESTIONS_TA : isTelugu ? PROMPT_SUGGESTIONS_TE : isHindi ? PROMPT_SUGGESTIONS_HI : PROMPT_SUGGESTIONS

  return (
    <div className="welcome-command-screen font-inter">
      <div className="welcome-hero-card">
        <div className="welcome-avatar-orb">
          <img src={orcaLogo} alt="ORCA Logo" className="orb-logo-img" />
          <div className="orb-pulse-ring"></div>
        </div>
        <h2 className="welcome-title font-sora">
          {isMarathi
            ? 'तुम्ही कोणती समुद्री स्थिती विश्लेषित करू इच्छिता?'
            : isGujarati
            ? 'તમે કઈ દરિયાઈ સ્થિતિનું વિશ્લેષણ કરવા માંગો છો?'
            : isTulu
            ? 'ಈರ್ ಒವ್ವು ಕಡಲ ಸ್ಥಿತಿನ್ ವಿಶ್ಲೇಷಣೆ ಮಲ್ಪೆರೆ ಇಷ್ಟ ಪಡ್ಪುರ್?'
            : isKonkani
            ? 'तुमी कसली दर्याची स्थिती तपासायंक सोदतात?'
            : isBengali
            ? 'আপনি কোন সামুদ্রিক অবস্থা বিশ্লেষণ করতে চান?'
            : isOdia
            ? 'ଆପଣ କେଉଁ ସାମୁଦ୍ରିକ ସ୍ଥିତିର ବିଶ୍ଲେଷଣ କରିବାକୁ ଚାହୁଁଛନ୍ତି?'
            : isTamil
            ? 'எந்த கடல் சூழ்நிலையை பகுப்பாய்வு செய்ய விரும்புகிறீர்கள்?'
            : isTelugu
            ? 'మీరు ఏ సముద్ర పరిస్థితిని విశ్లేషించాలనుకుంటున్నారు?'
            : isHindi
            ? 'आप किस समुद्री स्थिति का विश्लेषण करना चाहते हैं?'
            : 'What would you like to analyze?'}
        </h2>
        <p className="welcome-subtitle font-inter">
          {isMarathi
            ? 'ORCA कडून समुद्री स्थिती, हवामान, सुरक्षा, धोके किंवा मासेमारी क्षेत्रांबद्दल (PFZ) विचारा.'
            : isGujarati
            ? 'ORCA ને દરિયાઈ સ્થિતિ, હવામાન, સુરક્ષા, જોખમો અથવા માછીમારી વિસ્તારો (PFZ) વિશે પૂછો.'
            : isTulu
            ? 'ORCA ಡ್ ಕಡಲ ಸ್ಥಿತಿ, ವಾತಾವರಣ, ಕಡಲ ರಕ್ಷಣೆ, ಅಪಾಯೊಲು ಬೊಕ್ಕ ಮೀನ್ ಪತ್ತುನ ಜಾಗೊಲೆ (PFZ) ಬಗೆಟ್ ಕೇನ್ಲೆ.'
            : isKonkani
            ? 'ORCA कडल्यान दर्याची स्थिती, हवामान, सुरक्षाय, धोके वा मासळी मारपाच्या वाठारां (PFZ) विशीं विचारात.'
            : isBengali
            ? 'ORCA-কে সমুদ্রের অবস্থা, আবহাওয়া, সামুদ্রিক নিরাপত্তা, ঝুঁকি বা মাছ ধরার অঞ্চল (PFZ) সম্পর্কে জিজ্ঞাসা করুন।'
            : isOdia
            ? 'ORCA କୁ ସମୁଦ୍ର ସ୍ଥିତି, ପାଣିପାଗ, ସାମୁଦ୍ରିକ ସୁରକ୍ଷା, ବିପଦ କିମ୍ବା ମାଛ ଧରିବା ଅଞ୍ଚଳ (PFZ) ବିଷୟରେ ପଚାରନ୍ତୁ।'
            : isTamil
            ? 'ORCA விடம் கடல் நிலைமைகள், வானிலை, கடல் பாதுகாப்பு, ஆபத்துகள் அல்லது மீன்பிடி மண்டலங்கள் (PFZ) பற்றி கேளுங்கள்.'
            : isTelugu
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
              <span>{isMarathi ? 'ORCA ला विचारा' : isGujarati ? 'ORCA ને પૂછો' : isTulu ? 'ORCA ಡ್ ಕೇನ್ಲೆ' : isKonkani ? 'ORCA कडेन विचारात' : isBengali ? 'ORCA-কে জিজ্ঞাসা করুন' : isOdia ? 'ORCA କୁ ପଚାରନ୍ତୁ' : isTamil ? 'ORCA விடம் கேட்க' : isHindi ? 'ORCA से पूछें' : 'Ask ORCA'}</span> <i>→</i>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
