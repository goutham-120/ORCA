/**
 * Deterministic spoken briefing summary generator for Ask ORCA.
 * Formats concise, non-technical marine safety briefings for fishermen and coastal operators.
 * Supports English (en), Hindi (hi), Telugu (te), and Tamil (ta).
 */

export function buildSpokenSummary(response, rawText = '', language = 'en') {
  const lang = (language || 'en').toLowerCase()
  const langPrefix = lang.startsWith('te') ? 'te' : lang.startsWith('ta') ? 'ta' : lang.startsWith('hi') ? 'hi' : lang.startsWith('or') ? 'or' : lang.startsWith('bn') ? 'bn' : lang.startsWith('kok') ? 'kok' : lang.startsWith('tcy') ? 'tcy' : lang.startsWith('gu') ? 'gu' : lang.startsWith('mr') ? 'mr' : 'en'

  const assessment = response?.assessment || {}
  const decision = response?.decision || {}
  const evidenceList = response?.evidence || []
  const recommendations = response?.recommendations || []
  const unavailableDomains = response?.unavailable_domains || []
  const pendingDomains = response?.pending_domains || []

  // Risk rank & score
  const riskRanks = { critical: 4, high: 3, moderate: 2, low: 1, unknown: 0 }
  const assessmentLevel = assessment?.level || 'unknown'
  const decisionLevel = decision?.risk_level && decision.risk_level !== 'unavailable' ? decision.risk_level : 'unknown'
  const level = (riskRanks[assessmentLevel] || 0) >= (riskRanks[decisionLevel] || 0) ? assessmentLevel : decisionLevel

  const scorePercent = assessment?.score != null ? Math.round(assessment.score * 100) : null
  const hasLimitations = Boolean(
    unavailableDomains.length ||
    pendingDomains.length ||
    decision?.unavailable_data?.length ||
    decision?.warnings?.length
  )

  // Extract observed parameters
  let windSpeed = null
  let waveHeight = null
  let precipitation = null

  for (const item of evidenceList) {
    const measurements = item.metadata?.measurements || {}
    if (measurements.wind_speed_mps != null && windSpeed == null) {
      windSpeed = measurements.wind_speed_mps
    }
    if (measurements.wave_height_m != null && waveHeight == null) {
      waveHeight = measurements.wave_height_m
    }
    if (measurements.precipitation_mm != null && precipitation == null) {
      precipitation = measurements.precipitation_mm
    }
  }

  // Fallback regex extraction from raw text if evidence list measurements absent
  if (windSpeed == null) {
    const match = rawText.match(/wind\s+([0-9.]+)/i)
    if (match) windSpeed = parseFloat(match[1])
  }
  if (waveHeight == null) {
    const match = rawText.match(/wave\s+height\s+([0-9.]+)/i)
    if (match) waveHeight = parseFloat(match[1])
  }

  // Primary action recommendation
  const primaryAction = recommendations.length > 0 ? recommendations[0].action : ''

  if (langPrefix === 'hi') {
    return buildHindiSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations })
  }
  if (langPrefix === 'te') {
    return buildTeluguSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations })
  }
  if (langPrefix === 'ta') {
    return buildTamilSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations })
  }
  if (langPrefix === 'or') {
    return buildOdiaSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations })
  }
  if (langPrefix === 'bn') {
    return buildBengaliSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations })
  }
  if (langPrefix === 'kok') {
    return buildKonkaniSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations })
  }
  if (langPrefix === 'tcy') {
    return buildTuluSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations })
  }
  if (langPrefix === 'gu') {
    return buildGujaratiSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations })
  }
  if (langPrefix === 'mr') {
    return buildMarathiSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations })
  }

  return buildEnglishSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations })
}

function buildEnglishSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations }) {
  const parts = []

  if (level === 'low') {
    parts.push('Fishing conditions today are generally favorable.')
  } else if (level === 'moderate') {
    parts.push('Marine conditions require caution due to moderate sea risks.')
  } else if (level === 'high' || level === 'critical') {
    parts.push('Warning: severe marine hazard conditions present high risk.')
  } else {
    parts.push('Marine assessment is based on current available evidence.')
  }

  const scoreText = scorePercent != null ? `, at ${scorePercent} percent.` : '.'
  parts.push(`The current risk level is ${level}${scoreText}`)

  const conds = []
  if (windSpeed != null) conds.push(`Winds are around ${windSpeed} meters per second`)
  if (waveHeight != null) conds.push(`wave height is around ${waveHeight} meters`)
  if (precipitation != null && precipitation > 0) conds.push(`precipitation is ${precipitation} mm`)
  else if (precipitation === 0) conds.push('no rainfall is currently reported')

  if (conds.length > 0) {
    parts.push(conds.join(', ') + '.')
  }

  if (primaryAction) {
    parts.push(primaryAction)
  } else {
    parts.push('Complete your safety checks, carry life jackets and a VHF radio, and continue monitoring official marine warnings.')
  }

  if (hasLimitations) {
    parts.push('Some location-specific information is unavailable, so this is not a complete safety clearance.')
  }

  return parts.join(' ')
}

function buildHindiSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations }) {
  const parts = []

  const statusMap = { low: 'कम', moderate: 'मध्यम', high: 'उच्च', critical: 'गंभीर', unknown: 'अज्ञात' }
  const hindiStatus = statusMap[level] || 'अज्ञात'

  if (level === 'low') {
    parts.push('आज मछली पकड़ने की स्थिति अनुकूल है।')
  } else if (level === 'moderate') {
    parts.push('समुद्री स्थिति के लिए सावधानी आवश्यक है।')
  } else {
    parts.push('चेतावनी: गंभीर समुद्री जोखिम उपस्थित है।')
  }

  const scoreText = scorePercent != null ? `, ${scorePercent} प्रतिशत पर।` : '।'
  parts.push(`वर्तमान जोखिम स्तर ${hindiStatus} है${scoreText}`)

  const conds = []
  if (windSpeed != null) conds.push(`हवा की गति लगभग ${windSpeed} मीटर प्रति सेकंड है`)
  if (waveHeight != null) conds.push(`लहरों की ऊंचाई लगभग ${waveHeight} मीटर है`)

  if (conds.length > 0) {
    parts.push(conds.join(', ') + '।')
  }

  parts.push('सुरक्षा जांच पूरी करें, लाइफ जैकेट और VHF रेडियो साथ रखें, और नवीनतम चेतावनियों का पालन करें।')

  if (hasLimitations) {
    parts.push('कुछ स्थान-विशिष्ट जानकारी उपलब्ध नहीं है, इसलिए यह पूर्ण सुरक्षा मंजूरी नहीं है।')
  }

  return parts.join(' ')
}

function buildTeluguSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations }) {
  const parts = []

  const statusMap = { low: 'తక్కువ', moderate: 'మధ్యస్థం', high: 'ఎక్కువ', critical: 'తీవ్రమైన', unknown: 'తెలియదు' }
  const teluguStatus = statusMap[level] || 'తెలియదు'

  if (level === 'low') {
    parts.push('ఈ రోజు చేపల వేట పరిస్థితులు అనుకూలంగా ఉన్నాయి.')
  } else if (level === 'moderate') {
    parts.push('సముద్ర పరిస్థితుల పట్ల జాగ్రత్త వహించాలి.')
  } else {
    parts.push('హెచ్చరిక: తీవ్రమైన సముద్ర ముప్పు ఉంది.')
  }

  const scoreText = scorePercent != null ? `, ${scorePercent} శాతంగా ఉంది.` : '.'
  parts.push(`ప్రస్తుత ముప్పు స్థాయి ${teluguStatus} గా ఉంది${scoreText}`)

  const conds = []
  if (windSpeed != null) conds.push(`గాలి వేగం దాదాపు సెకనుకు ${windSpeed} మీటర్లు`)
  if (waveHeight != null) conds.push(`అలల ఎత్తు దాదాపు ${waveHeight} మీటర్లు ఉంది`)

  if (conds.length > 0) {
    parts.push(conds.join(', ') + '.')
  }

  parts.push('రక్షణ పరికరాలు, లైఫ్ జాకెట్లు మరియు VHF రేడియో సిద్ధంగా ఉంచుకోండి, అధికారిక హెచ్చరికలను గమనించండి.')

  if (hasLimitations) {
    parts.push('కొన్ని ప్రాంతీయ వివరాలు అందుబాటులో లేవు, కాబట్టి ఇది పూర్తి రక్షణ హామీ కాదు.')
  }

  return parts.join(' ')
}

function buildTamilSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations }) {
  const parts = []

  const statusMap = { low: 'குறைந்த', moderate: 'மிதமான', high: 'அதிக', critical: 'ஆபத்தான', unknown: 'தெரியவில்லை' }
  const tamilStatus = statusMap[level] || 'தெரியவில்லை'

  if (level === 'low') {
    parts.push('இன்று மீன்பிடி நிலவரங்கள் சாதகமாக உள்ளன.')
  } else if (level === 'moderate') {
    parts.push('கடல் நிலவரங்களுக்கு எச்சரிக்கை தேவை.')
  } else {
    parts.push('எச்சரிக்கை: தீவிர கடல் ஆபத்து உள்ளது.')
  }

  const scoreText = scorePercent != null ? `, ${scorePercent} சதவீதம்.` : '.'
  parts.push(`தற்போதைய ஆபத்து மட்டம் ${tamilStatus} ஆக உள்ளது${scoreText}`)

  const conds = []
  if (windSpeed != null) conds.push(`காற்றின் வேகம் வினாடிக்கு சுமார் ${windSpeed} மீட்டர்`)
  if (waveHeight != null) conds.push(`அலை உயரம் சுமார் ${waveHeight} மீட்டர் உள்ளது`)

  if (conds.length > 0) {
    parts.push(conds.join(', ') + '.')
  }

  parts.push('பாதுகாப்பு சோதனைகளை முடித்து, லைஃப் ஜாக்கெட் மற்றும் VHF ரேடியோவை உடன் கொண்டு செல்லவும், அதிகாரப்பூர்வ எச்சரிக்கைகளை கவனிக்கவும்.')

  if (hasLimitations) {
    parts.push('சில குறிப்பிட்ட இடத் தகவல்கள் கிடைக்கவில்லை, எனவே இது முழுமையான பாதுகாப்பு சான்றிதழ் அல்ல.')
  }

  return parts.join(' ')
}

function buildOdiaSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations }) {
  const parts = []

  const statusMap = { low: 'କମ୍', moderate: 'ମଧ୍ୟମ', high: 'ଉଚ୍ଚ', critical: 'ଗମ୍ଭୀର', unknown: 'ଅଜ୍ଞାତ' }
  const odiaStatus = statusMap[level] || 'ଅଜ୍ଞାତ'

  if (level === 'low') {
    parts.push('ଆଜି ମାଛ ଧରିବା ପାଇଁ ସମୁଦ୍ର ପରିସ୍ଥିତି ଅନୁକୂଳ ଅଛି।')
  } else if (level === 'moderate') {
    parts.push('ସମୁଦ୍ର ପରିସ୍ଥିତି ପାଇଁ ସତର୍କତା ଆବଶ୍ୟକ।')
  } else {
    parts.push('ଚେତାବନୀ: ଗମ୍ଭୀର ସାମୁଦ୍ରିକ ବିପଦ ଉପସ୍ଥିତ ଅଛି।')
  }

  const scoreText = scorePercent != null ? `, ${scorePercent} ପ୍ରତିଶତରେ।` : '।'
  parts.push(`ବର୍ତ୍ତମାନର ବିପଦ ସ୍ତର ${odiaStatus} ଅଟେ${scoreText}`)

  const conds = []
  if (windSpeed != null) conds.push(`ପବନର ବେଗ ପ୍ରାୟ ସେକେଣ୍ଡ ପ୍ରତି ${windSpeed} ମିଟର`)
  if (waveHeight != null) conds.push(`ଲହଡ଼ିର ଉଚ୍ଚତା ପ୍ରାୟ ${waveHeight} ମିଟର ଅଛି`)

  if (conds.length > 0) {
    parts.push(conds.join(', ') + '।')
  }

  parts.push('ସୁରକ୍ଷା ଯାଞ୍ଚ ସମ୍ପୂର୍ଣ୍ଣ କରନ୍ତୁ, ଲାଇଫ୍ ଜାକେଟ୍ ଏବଂ VHF ରେଡିଓ ସାଥୀରେ ରଖନ୍ତୁ, ଏବଂ ସରକାରୀ ସୂଚନା ଉପରେ ନଜର ରଖନ୍ତୁ।')

  if (hasLimitations) {
    parts.push('କିଛି ଆଞ୍ଚଳିକ ତଥ୍ୟ ଉପଲବ୍ଧ ନାହିଁ, ତେଣୁ ଏହା ସମ୍ପୂର୍ଣ୍ଣ ସୁରକ୍ଷା ମଞ୍ଜୁରୀ ନୁହେଁ।')
  }

  return parts.join(' ')
}

function buildBengaliSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations }) {
  const parts = []

  const statusMap = { low: 'কম', moderate: 'মাঝারি', high: 'উচ্চ', critical: 'গুরুতর', unknown: 'অজানা' }
  const bengaliStatus = statusMap[level] || 'অজানা'

  if (level === 'low') {
    parts.push('আজ মাছ ধরার জন্য সমুদ্রের পরিস্থিতি অনুকূল রয়েছে।')
  } else if (level === 'moderate') {
    parts.push('সমুদ্রের পরিস্থিতির জন্য সতর্কতা অবলম্বন প্রয়োজন।')
  } else {
    parts.push('সতর্কতা: গুরুতর সামুদ্রিক ঝুঁকির সম্ভাবনা রয়েছে।')
  }

  const scoreText = scorePercent != null ? `, ${scorePercent} শতাংশে।` : '।'
  parts.push(`বর্তমানে ঝুঁকির মাত্রা ${bengaliStatus}${scoreText}`)

  const conds = []
  if (windSpeed != null) conds.push(`বাতাসের গতিবেগ প্রায় প্রতি সেকেন্ডে ${windSpeed} মিটার`)
  if (waveHeight != null) conds.push(`ঢেউয়ের উচ্চতা প্রায় ${waveHeight} মিটার রয়েছে`)

  if (conds.length > 0) {
    parts.push(conds.join(', ') + '।')
  }

  parts.push('সুরক্ষা পরীক্ষা সম্পন্ন করুন, লাইফ জ্যাকেট এবং VHF রেডিও সাথে রাখুন, এবং সরকারি নির্দেশিকা মেনে চলুন।')

  if (hasLimitations) {
    parts.push('কিছু নির্দিষ্ট এলাকার তথ্য উপলব্ধ নেই, তাই এটি সম্পূর্ণ নিরাপত্তা শংসাপত্র নয়।')
  }

  return parts.join(' ')
}

function buildKonkaniSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations }) {
  const parts = []

  const statusMap = { low: 'उणी', moderate: 'मध्यम', high: 'व्हड', critical: 'गंभीर', unknown: 'खबर ना' }
  const konkaniStatus = statusMap[level] || 'खबर ना'

  if (level === 'low') {
    parts.push('आयज नुस्तेमारा खातीर दर्याची स्थिती बरा आसा।')
  } else if (level === 'moderate') {
    parts.push('दर्याच्या परिस्थिती खातीर राखणदारी घेवप गरजेचें।')
  } else {
    parts.push('शिटकावणी: गंभीर दर्याचो धोको आसा।')
  }

  const scoreText = scorePercent != null ? `, ${scorePercent} टक्कयांनी।` : '।'
  parts.push(`सध्याच्या धोक्याचें प्रमाण ${konkaniStatus} आसा${scoreText}`)

  const conds = []
  if (windSpeed != null) conds.push(`वार्याची गती सुमार सेकंदाक ${windSpeed} मीटर`)
  if (waveHeight != null) conds.push(`ल्हारांची उंचाय सुमार ${waveHeight} मीटर आसा`)

  if (conds.length > 0) {
    parts.push(conds.join(', ') + '।')
  }

  parts.push('सुरक्षेची तपासणी पुराय करात, लाइफ जॅकेट आनी VHF रेडिओ सांगता दवरात, आनी सरकारी शिटकावण्यो पाळा।')

  if (hasLimitations) {
    parts.push('काही वाठारांची म्हायती मेळूंक ना, ताका लागून ही पुराय सुरक्षेची परवानगी न्हय।')
  }

  return parts.join(' ')
}

function buildTuluSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations }) {
  const parts = []

  const statusMap = { low: 'ಕಡಿಮೆ', moderate: 'ಮಧ್ಯಮ', high: 'ಹೆಚ್ಚು', critical: 'ಗಂಭೀರ', unknown: 'ಗೊತ್ತಿಜ್ಜಿ' }
  const tuluStatus = statusMap[level] || 'ಗೊತ್ತಿಜ್ಜಿ'

  if (level === 'low') {
    parts.push('ಇನಿ ಮೀನ್ ಪತ್ತುನೆಕ್ಅಡ್ ಕಡಲ ಪರಿಸ್ಥಿತಿ ಎಡ್ಡೆ ಉಂಡು.')
  } else if (level === 'moderate') {
    parts.push('ಕಡಲ ಪರಿಸ್ಥಿತಿನ್ ತೂದು ಜಾಗ್ರತೆಡ್ ಉಪ್ಪೊಡು.')
  } else {
    parts.push('ಎಚ್ಚರಿಕೆ: ಮಲ್ಲ ಕಡಲ ಅಪಾಯ ಉಂಡು.')
  }

  const scoreText = scorePercent != null ? `, ${scorePercent} ಶೇಕಡಾಡ್.` : '.'
  parts.push(`ಇತ್ತೆದ ಅಪಾಯೊದ ಪ್ರಮಾಣ ${tuluStatus} ಉಂಡು${scoreText}`)

  const conds = []
  if (windSpeed != null) conds.push(`ಗಾಳಿದ ವೇಗ ಸುಮಾರಾದ್ ಸೆಕೆಂಡ್‍ಗ್ ${windSpeed} ಮೀಟರ್`)
  if (waveHeight != null) conds.push(`ಅಲೆತ ಎತ್ತರ ಸುಮಾರಾದ್ ${waveHeight} ಮೀಟರ್ ಉಂಡು`)

  if (conds.length > 0) {
    parts.push(conds.join(', ') + '.')
  }

  parts.push('ರಕ್ಷಣೆ ಪರಿಕರೊಲು, ಲೈಫ್ ಜಾಕೆಟ್ ಬೊಕ್ಕ VHF ರೇಡಿಯೋ ದೀವೊನಿಲೆ, ಸರ್ಕಾರಿ ಸೂಚನೆಲೆನ್ ಕೇನ್ಲೆ.')

  if (hasLimitations) {
    parts.push('ಕೆಲವು ಜಾಗದ ಮಾಹಿತಿ ತಿಕ್‍ದಿಜ್ಜಿ, ಅಂಚಾದ್ ಉಂದು ಪೂರ್ತಿ ರಕ್ಷಣೆದ ಖಾತರಿ ಅತ್ತ್.')
  }

  return parts.join(' ')
}

function buildGujaratiSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations }) {
  const parts = []

  const statusMap = { low: 'ઓછું', moderate: 'મધ્યમ', high: 'ઉચ્ચ', critical: 'ગંભીર', unknown: 'અજ્ઞાત' }
  const gujaratiStatus = statusMap[level] || 'અજ્ઞાત'

  if (level === 'low') {
    parts.push('આજે માછીમારી માટે દરિયાઈ પરિસ્થિતિઓ સાનુકૂળ છે.')
  } else if (level === 'moderate') {
    parts.push('દરિયાઈ પરિસ્થિતિઓ માટે સાવચેતી રાખવી જરૂરી છે.')
  } else {
    parts.push('ચેતવણી: ગંભીર દરિયાઈ જોખમ હાજર છે.')
  }

  const scoreText = scorePercent != null ? `, ${scorePercent} ટકા પર.` : '.'
  parts.push(`વર્તમાન જોખમ સ્તર ${gujaratiStatus} છે${scoreText}`)

  const conds = []
  if (windSpeed != null) conds.push(`પવનની ઝડપ આશરે પ્રતિ સેકન્ડ ${windSpeed} મીટર છે`)
  if (waveHeight != null) conds.push(`મોજાની ઊંચાઈ આશરે ${waveHeight} મીટર છે`)

  if (conds.length > 0) {
    parts.push(conds.join(', ') + '.')
  }

  parts.push('સુરક્ષા તપાસ પૂર્ણ કરો, લાઈફ જેકેટ અને VHF રેડિયો સાથે રાખો, અને સત્તાવાર સૂચનાઓનું પાલન કરો.')

  if (hasLimitations) {
    parts.push('કેટલીક સ્થળ-વિશિષ્ટ માહિતી ઉપલબ્ધ નથી, તેથી આ સંપૂર્ણ સુરક્ષા મંજૂરી નથી.')
  }

  return parts.join(' ')
}

function buildMarathiSummary({ level, scorePercent, windSpeed, waveHeight, precipitation, primaryAction, hasLimitations }) {
  const parts = []

  const statusMap = { low: 'कमी', moderate: 'मध्यम', high: 'उच्च', critical: 'गंभीर', unknown: 'माहिती नाही' }
  const marathiStatus = statusMap[level] || 'माहिती नाही'

  if (level === 'low') {
    parts.push('आज मासेमारीसाठी समुद्राची स्थिती अनुकूल आहे.')
  } else if (level === 'moderate') {
    parts.push('समुद्राच्या परिस्थितीसाठी दक्षता घेणे गरजेचे आहे.')
  } else {
    parts.push('इशारा: गंभीर समुद्री धोका आहे.')
  }

  const scoreText = scorePercent != null ? `, ${scorePercent} टक्क्यांवर.` : '.'
  parts.push(`सध्याचा धोक्याचा स्तर ${marathiStatus} आहे${scoreText}`)

  const conds = []
  if (windSpeed != null) conds.push(`वाऱ्याचा वेग सुमारे सेकंदाला ${windSpeed} मीटर आहे`)
  if (waveHeight != null) conds.push(`लाटांची उंची सुमारे ${waveHeight} मीटर आहे`)

  if (conds.length > 0) {
    parts.push(conds.join(', ') + '.')
  }

  parts.push('सुरक्षेची तपासणी पूर्ण करा, लाइफ जॅकेट आणि VHF रेडिओ सोबत ठेवा, आणि शासकीय सूचनांचे पालन करा.')

  if (hasLimitations) {
    parts.push('काही ठिकाणांची माहिती उपलब्ध नाही, त्यामुळे ही पूर्ण सुरक्षेची परवानगी नाही.')
  }

  return parts.join(' ')
}
