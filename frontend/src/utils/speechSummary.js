/**
 * Deterministic spoken briefing summary generator for Ask ORCA.
 * Formats concise, non-technical marine safety briefings for fishermen and coastal operators.
 * Supports English (en), Hindi (hi), Telugu (te), and Tamil (ta).
 */

export function buildSpokenSummary(response, rawText = '', language = 'en') {
  const lang = (language || 'en').toLowerCase()
  const langPrefix = lang.startsWith('te') ? 'te' : lang.startsWith('ta') ? 'ta' : lang.startsWith('hi') ? 'hi' : 'en'

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
