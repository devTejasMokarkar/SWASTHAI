export interface SafetyCheckResult {
  safe: boolean
  warnings: string[]
}

export function validateAiOutput(
  response: string,
  medications: Array<{ name: string; strength?: string }>,
  dietaryPreferences: string[] = [],
): SafetyCheckResult {
  const warnings: string[] = []
  const lower = response.toLowerCase()

  const isTakingStatin = medications.some(m =>
    m.name.toLowerCase().includes('atorvastatin') || m.name.toLowerCase().includes('statin'),
  )
  if (isTakingStatin && (lower.includes('grapefruit') || lower.includes('grape fruit'))) {
    warnings.push(
      'CYP3A4 Inhibition Warning: Grapefruit increases atorvastatin blood levels, raising risks of muscle toxicity and rhabdomyolysis. If you experience severe muscle weakness or pain, consult a doctor immediately.',
    )
  }

  const isDiabetic =
    medications.some(m => m.name.toLowerCase().includes('metformin') || m.name.toLowerCase().includes('diabetes')) ||
    dietaryPreferences.some(p => p.toLowerCase().includes('diabetic') || p.toLowerCase().includes('glucose'))

  if (isDiabetic) {
    const sugary = ['sugar', 'honey', 'maple syrup', 'white bread', 'white rice', 'potatoes', 'juice', 'high glycemic', 'high-glycemic']
    for (const kw of sugary) {
      if (lower.includes(kw)) {
        warnings.push(
          `Glycemic Warning: Suggested sugar source "${kw}" spikes blood glucose, directly opposing diabetes therapies. Focus on low-glycemic foods and consult a primary care physician.`,
        )
        break
      }
    }
  }

  const isTakingAce = medications.some(m =>
    m.name.toLowerCase().includes('lisinopril') || m.name.toLowerCase().includes('ace-inhibitor'),
  )
  if (isTakingAce) {
    const nsaids = ['ibuprofen', 'advil', 'motrin', 'aspirin', 'naproxen', 'aleve']
    for (const ns of nsaids) {
      if (lower.includes(ns)) {
        warnings.push(
          `NSAID Interaction: "${ns}" restricts kidney blood flow and counteracts Lisinopril efficacy. Use safer alternatives.`,
        )
        break
      }
    }
    if (lower.includes('potassium substitute') || lower.includes('potassium salt') || lower.includes('salt substitute')) {
      warnings.push(
        'Hyperkalemia Warning: ACE-inhibitors retain potassium; combining with salt substitutes is risky. Consult a physician.',
      )
    }
  }

  const majorSymptoms = [
    'chest pain', 'pain in chest', 'shortness of breath', 'difficulty breathing',
    'severe muscle pain', 'rhabdomyolysis', 'muscle toxicity', 'high fever',
    'extreme numbness', 'sudden weakness', 'severe dizziness', 'vision loss',
    'palpitations', 'heart flutter', 'severe fatigue', 'extreme blood sugar',
  ]
  const hasMajorSymptom = majorSymptoms.some(kw => lower.includes(kw))
  const mentionsHelp =
    ['doctor', 'physician', 'consult', 'medical professional', 'emergency', 'healthcare provider', 'clinician', 'primary care'].some(w =>
      lower.includes(w),
    )

  if (hasMajorSymptom && !mentionsHelp) {
    warnings.push(
      'Doctor Consultation Advised: Major or severe symptom indicators detected. Consult a licensed doctor immediately.',
    )
  }

  return { safe: warnings.length === 0, warnings }
}

export function containsDiagnosticContent(text: string): boolean {
  const keywords = [
    'diagnostic', 'lab', 'report', 'blood panel', 'medication',
    'prescription', 'symptom', 'blood pressure', 'vital', 'heart rate',
    'glucose', 'insulin', 'diabetic', 'glycemic', 'cholesterol', 'diet',
    'breakfast', 'lunch', 'dinner',
  ]
  const lower = text.toLowerCase()
  return keywords.some(kw => lower.includes(kw))
}

export function hasDisclaimer(text: string): boolean {
  const lower = text.toLowerCase()
  return (
    lower.includes('disclaimer:') ||
    lower.includes('consult a medical doctor') ||
    lower.includes('consult a physician') ||
    lower.includes('seek professional medical attention')
  )
}
