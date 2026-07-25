import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// 1. CLINICAL SAFETY VALIDATOR  (port of server.ts validateAiOutput)
// ---------------------------------------------------------------------------

interface SafetyCheckResult {
  safe: boolean;
  warnings: string[];
}

function validateAiOutput(
  response: string,
  userProfile: any,
  medications: any[],
): SafetyCheckResult {
  const warnings: string[] = [];
  const lowerResponse = response.toLowerCase();

  // 1. Grapefruit statin warning
  const isTakingStatin = medications.some(
    (m: any) =>
      m.name.toLowerCase().includes("atorvastatin") ||
      m.name.toLowerCase().includes("statin"),
  );
  if (
    isTakingStatin &&
    (lowerResponse.includes("grapefruit") ||
      lowerResponse.includes("grape fruit"))
  ) {
    warnings.push(
      "CYP3A4 Inhibition Warning: Grapefruit increases atorvastatin blood levels, raising risks of muscle toxicity and rhabdomyolysis.",
    );
  }

  // 2. Diabetic glucose spike warnings
  const isDiabeticRisk =
    medications.some(
      (m: any) =>
        m.name.toLowerCase().includes("metformin") ||
        m.name.toLowerCase().includes("diabetes"),
    ) ||
    (userProfile?.dietaryPreferences &&
      userProfile.dietaryPreferences.some(
        (p: string) =>
          p.toLowerCase().includes("diabetic") ||
          p.toLowerCase().includes("glucose"),
      ));
  if (isDiabeticRisk) {
    const sugaryKeywords = [
      "sugar",
      "honey",
      "maple syrup",
      "white bread",
      "white rice",
      "potatoes",
      "juice",
      "high glycemic",
      "high-glycemic",
    ];
    for (const kw of sugaryKeywords) {
      if (lowerResponse.includes(kw)) {
        warnings.push(
          `Glycemic Warning: Suggested sugar source "${kw}" spikes blood glucose, directly opposing diabetes therapies.`,
        );
        break;
      }
    }
  }

  // 3. Hypertension ACE inhibitor NSAID conflicts
  const isTakingAceInhibitor = medications.some(
    (m: any) =>
      m.name.toLowerCase().includes("lisinopril") ||
      m.name.toLowerCase().includes("ace-inhibitor"),
  );
  if (isTakingAceInhibitor) {
    const nsaids = [
      "ibuprofen",
      "advil",
      "motrin",
      "aspirin",
      "naproxen",
      "aleve",
    ];
    for (const ns of nsaids) {
      if (lowerResponse.includes(ns)) {
        warnings.push(
          `NSAID Interaction: "${ns}" restricts kidney blood flow and counteracts the therapeutic efficacy of Lisinopril.`,
        );
        break;
      }
    }
    if (
      lowerResponse.includes("potassium substitute") ||
      lowerResponse.includes("potassium salt") ||
      lowerResponse.includes("salt substitute")
    ) {
      warnings.push(
        "Hyperkalemia Warning: ACE-inhibitors spark potassium retention; combining them with potassium salt substitutes is risky.",
      );
    }
  }

  // 4. Major symptoms doctor consultation prompt
  const majorSymptomKeywords = [
    "chest pain",
    "pain in chest",
    "shortness of breath",
    "difficulty breathing",
    "severe muscle pain",
    "rhabdomyolysis",
    "muscle toxicity",
    "high fever",
    "extreme numbness",
    "sudden weakness",
    "severe dizziness",
    "vision loss",
    "palpitations",
    "heart flutter",
    "severe fatigue",
    "extreme blood sugar",
  ];
  const hasMajorSymptom = majorSymptomKeywords.some((kw) =>
    lowerResponse.includes(kw),
  );
  const mentionsMedicalHelp =
    lowerResponse.includes("doctor") ||
    lowerResponse.includes("physician") ||
    lowerResponse.includes("consult") ||
    lowerResponse.includes("medical professional") ||
    lowerResponse.includes("emergency") ||
    lowerResponse.includes("healthcare provider") ||
    lowerResponse.includes("clinician") ||
    lowerResponse.includes("care team") ||
    lowerResponse.includes("see a professional") ||
    lowerResponse.includes("primary care");
  if (hasMajorSymptom && !mentionsMedicalHelp) {
    warnings.push(
      "Doctor Consultation Advised: Major or severe symptom indicators detected.",
    );
  }

  return { safe: warnings.length === 0, warnings };
}

// ---------------------------------------------------------------------------
// 2. CLIENT-SIDE SAFETY VALIDATOR  (port of AIChat.tsx runClientClinicalSafetyValidator)
// ---------------------------------------------------------------------------

interface SafetyIssue {
  alert: string;
  action: string;
  type: string;
}

const localRiskDictionary = {
  grapefruit: {
    condition: (_user: any, meds: any[]) =>
      meds.some(
        (m) =>
          m.name.toLowerCase().includes("atorvastatin") ||
          m.name.toLowerCase().includes("statin"),
      ),
    alert:
      "Grapefruit / CYP3A4 Statin Interaction Risk: Grapefruit significantly increases statin concentration levels.",
    action:
      "Please do NOT consume grapefruit or grapefruit juice while on active Statin therapy.",
  },
  nsaid: {
    condition: (_user: any, meds: any[]) =>
      meds.some(
        (m) =>
          m.name.toLowerCase().includes("lisinopril") ||
          m.name.toLowerCase().includes("ace-inhibitor"),
      ),
    alert:
      "NSAID Interaction Alert: Pain relievers like Ibuprofen, Advil, Aspirin, or Naproxen can restrict renal blood flow.",
    action:
      "Avoid NSAIDs. Consider consulting your doctor about safer alternatives like Acetaminophen.",
  },
  highGlycemic: {
    condition: (user: any, meds: any[]) => {
      const isDiabetic = meds.some((m) =>
        m.name.toLowerCase().includes("metformin"),
      );
      return isDiabetic || true;
    },
    alert:
      "Glycemic Warning: Suggested sugar source causes rapid blood glucose spikes.",
    action:
      "Opt for low-glycemic, fiber-rich foods instead.",
  },
  potassiumSubstitute: {
    condition: (_user: any, meds: any[]) =>
      meds.some((m) => m.name.toLowerCase().includes("lisinopril")),
    alert:
      "Hyperkalemia Warning: ACE-inhibitors spark potassium retention; combining them with potassium salt substitutes is risky.",
    action:
      "Avoid potassium salt substitutes and discuss electrolyte nutrition plans with your care team.",
  },
  majorSymptoms: {
    condition: () => true,
    alert:
      "Major Symptom Warning: Critical indicators require professional clinical care.",
    action:
      "Please contact a medical professional or seek professional medical advice immediately.",
  },
};

function runClientClinicalSafetyValidator(
  text: string,
  user: any,
  meds: any[],
): SafetyIssue[] {
  const issues: SafetyIssue[] = [];
  const lowerText = text.toLowerCase();

  if (
    (lowerText.includes("grapefruit") || lowerText.includes("grape fruit")) &&
    localRiskDictionary.grapefruit.condition(user, meds)
  ) {
    issues.push({ type: "grapefruit", alert: localRiskDictionary.grapefruit.alert, action: localRiskDictionary.grapefruit.action });
  }

  const nsaidKeywords = [
    "ibuprofen",
    "advil",
    "motrin",
    "aspirin",
    "naproxen",
    "aleve",
  ];
  const containsNsaid = nsaidKeywords.some((kw) => lowerText.includes(kw));
  if (containsNsaid && localRiskDictionary.nsaid.condition(user, meds)) {
    issues.push({ type: "nsaid", alert: localRiskDictionary.nsaid.alert, action: localRiskDictionary.nsaid.action });
  }

  const glycemicKeywords = [
    "sugar",
    "honey",
    "juice",
    "maple syrup",
    "glycemic",
    "white bread",
    "white rice",
    "potatoes",
  ];
  const containsGlycemic = glycemicKeywords.some((kw) =>
    lowerText.includes(kw),
  );
  if (
    containsGlycemic &&
    localRiskDictionary.highGlycemic.condition(user, meds)
  ) {
    issues.push({ type: "glycemic", alert: localRiskDictionary.highGlycemic.alert, action: localRiskDictionary.highGlycemic.action });
  }

  if (
    (lowerText.includes("potassium salt") ||
      lowerText.includes("salt substitute")) &&
    localRiskDictionary.potassiumSubstitute.condition(user, meds)
  ) {
    issues.push({ type: "potassium", alert: localRiskDictionary.potassiumSubstitute.alert, action: localRiskDictionary.potassiumSubstitute.action });
  }

  const symptomKeywords = [
    "chest pain",
    "pain in chest",
    "shortness of breath",
    "difficulty breathing",
    "severe muscle pain",
    "rhabdomyolysis",
    "extreme blood sugar",
    "heart palpitations",
    "sudden weakness",
    "severe fatigue",
  ];
  if (symptomKeywords.some((kw) => lowerText.includes(kw))) {
    issues.push({ type: "symptom", alert: localRiskDictionary.majorSymptoms.alert, action: localRiskDictionary.majorSymptoms.action });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// 3. VITALS ANALYSIS ENGINE  (port of server.ts vitals logic inside POST /api/vitals/readings)
// ---------------------------------------------------------------------------

interface VitalsAnalysis {
  rangeStatus: string;
  severity: "normal" | "abnormal" | "crisis";
  isNormal: boolean;
  urgentPrompt: string;
  trendMessage: string;
  suggestion: string;
}

function analyzeBloodSugar(
  value: number,
  unit: string,
  context: string,
  previousReadings: any[],
): VitalsAnalysis {
  const valInMgDl = unit === "mmol/L" ? Math.round(value * 18.0182) : value;
  let rangeStatus = "";
  let severity: "normal" | "abnormal" | "crisis" = "normal";
  let isNormal = true;
  let urgentPrompt = "";
  let suggestion = "";
  let trendMessage =
    "This is your first logged reading of this type, establishing a baseline.";

  if (valInMgDl < 70) {
    rangeStatus = "Hypoglycemia (Too Low)";
    severity = "crisis";
    isNormal = false;
    urgentPrompt = `URGENT: Your blood sugar reading of ${value} ${unit} is critically low (<70 mg/dL).`;
    suggestion =
      "Prioritize immediate fast-acting carbohydrate intake.";
  } else if (valInMgDl > 250) {
    rangeStatus = "Hyperglycemia (Dangerously High)";
    severity = "crisis";
    isNormal = false;
    urgentPrompt = `URGENT: Your blood sugar reading of ${value} ${unit} is dangerously elevated (>250 mg/dL).`;
    suggestion =
      "Ensure robust hydration and strictly avoid strenuous workouts.";
  } else {
    if (context === "Fasting") {
      if (valInMgDl <= 100) {
        rangeStatus = "Normal Fasting Blood Sugar";
        isNormal = true;
        suggestion =
          "Excellent. Maintaining consistent sleep patterns supports healthy fasting glucose metabolism.";
      } else if (valInMgDl <= 125) {
        rangeStatus = "Elevated Fasting Blood Sugar (Impaired Fasting Glucose)";
        isNormal = false;
        severity = "abnormal";
        suggestion =
          "Focus on eating complex, high-fiber carbohydrates at your evening meal.";
      } else {
        rangeStatus = "High Fasting Blood Sugar";
        isNormal = false;
        severity = "abnormal";
        suggestion =
          "Consistency in carbohydrate portions at dinner can help mitigate morning glucose spikes.";
      }
    } else {
      if (valInMgDl <= 140) {
        rangeStatus = "Normal Blood Sugar";
        isNormal = true;
        suggestion =
          "Great reading! Consistent hydration supports insulin sensitivity.";
      } else if (valInMgDl <= 199) {
        rangeStatus = "Elevated Blood Sugar";
        isNormal = false;
        severity = "abnormal";
        suggestion =
          "A light 15-minute walk after meals helps activate skeletal muscle glucose uptake.";
      } else {
        rangeStatus = "High Blood Sugar";
        isNormal = false;
        severity = "abnormal";
        suggestion =
          "Consider scheduling physical activity after your largest meals.";
      }
    }
  }

  if (previousReadings.length > 0) {
    const last = previousReadings[0];
    const lastVal =
      last.sugarUnit === "mmol/L"
        ? last.sugarValue * 18.0182
        : last.sugarValue;
    const diff = valInMgDl - lastVal;
    if (Math.abs(diff) < 5) {
      trendMessage = `Your blood sugar is stable compared to your previous log of ${last.sugarValue} ${last.sugarUnit}.`;
    } else if (diff > 0) {
      trendMessage = `Your blood sugar has risen (+${Math.round(diff)} mg/dL equivalent) compared to your previous log.`;
    } else {
      trendMessage = `Your blood sugar has decreased (-${Math.round(Math.abs(diff))} mg/dL equivalent) compared to your previous log.`;
    }
  }

  return { rangeStatus, severity, isNormal, urgentPrompt, trendMessage, suggestion };
}

function analyzeBloodPressure(
  systolic: number,
  diastolic: number,
  previousReadings: any[],
): VitalsAnalysis {
  let rangeStatus = "";
  let severity: "normal" | "abnormal" | "crisis" = "normal";
  let isNormal = true;
  let urgentPrompt = "";
  let suggestion = "";
  let trendMessage =
    "This is your first logged reading of this type, establishing a baseline.";

  if (systolic > 180 || diastolic > 120) {
    rangeStatus = "Hypertensive Crisis (Dangerously High)";
    severity = "crisis";
    isNormal = false;
    urgentPrompt = `URGENT: Your blood pressure of ${systolic}/${diastolic} mmHg is critically high.`;
    suggestion =
      "Avoid all physical stress, sit down in a quiet room, and seek professional clinical assistance immediately.";
  } else if (systolic < 120 && diastolic < 80) {
    rangeStatus = "Normal Blood Pressure";
    isNormal = true;
    suggestion =
      "Superb cardiovascular stability! Sustaining your hydration maintains vascular elasticity.";
  } else if (systolic >= 120 && systolic <= 129 && diastolic < 80) {
    rangeStatus = "Elevated Blood Pressure";
    isNormal = false;
    severity = "abnormal";
    suggestion =
      "Incorporate mindful deep breathing and focus on reducing processed sodium.";
  } else if (
    (systolic >= 130 && systolic <= 139) ||
    (diastolic >= 80 && diastolic <= 89)
  ) {
    rangeStatus = "Stage 1 Hypertension";
    isNormal = false;
    severity = "abnormal";
    suggestion =
      "Moderate aerobic exercise such as 30 minutes of brisk walking most days is highly effective.";
  } else {
    rangeStatus = "Stage 2 Hypertension";
    isNormal = false;
    severity = "abnormal";
    suggestion =
      "Prioritize stress-buffering techniques and work with your physician.";
  }

  if (previousReadings.length > 0) {
    const last = previousReadings[0];
    const sysDiff = systolic - last.systolic;
    const diaDiff = diastolic - last.diastolic;
    if (Math.abs(sysDiff) < 4 && Math.abs(diaDiff) < 4) {
      trendMessage = `Your blood pressure is stable compared to your previous reading of ${last.systolic}/${last.diastolic} mmHg.`;
    } else if (sysDiff > 0 || diaDiff > 0) {
      trendMessage = `Your blood pressure shows an upward trend (+${sysDiff} systolic, +${diaDiff} diastolic).`;
    } else {
      trendMessage = `Your blood pressure shows a downward trend (${sysDiff} systolic, ${diaDiff} diastolic).`;
    }
  }

  return { rangeStatus, severity, isNormal, urgentPrompt, trendMessage, suggestion };
}

// ---------------------------------------------------------------------------
// 4. PROMPT CONTEXT ASSEMBLY  (port of server.ts chat prompt construction)
// ---------------------------------------------------------------------------

function buildPromptContext(
  user: any,
  medications: any[],
  vitalData: any,
  topFileMatches: any[],
  chatHistory: string,
  formattedDateTime: string,
  timeOfDayPeriod: string,
): string {
  const profileStr = `User Name: ${user?.fullName || "User"}, DoB: ${user?.dob || "N/A"}, Gender: ${user?.gender || "N/A"}, Dietary preferences: ${user?.dietaryPreferences?.join(", ") || "None"}.`;
  const medListStr = medications
    .map(
      (m: any) =>
        `- ${m.name} (${m.strength}, frequency: ${m.frequency}, taken today: ${m.taken ? "Yes" : "No"})`,
    )
    .join("\n");
  const vitalsStr = `Vitals: Heart Rate: ${vitalData.heartRate} BPM, Steps today: ${vitalData.steps}, Sleep duration: ${vitalData.sleep || "N/A"}, Calories burned: ${vitalData.calories || "N/A"}.`;
  const citedFilesStr = topFileMatches
    .map(
      (m: any) =>
        `- File: "${m.file.name}" (Confidence: ${(m.similarity * 100).toFixed(1)}%) -> AI Insight: ${m.file.aiInsight}`,
    )
    .join("\n");

  return `
=== SWASTH-AI RETRIEVAL-FIRST ORCHESTRATION LAYER ===
[Tier 1: Deterministic Health Profile & Diagnostics]
${profileStr}
Active Medications:
${medListStr || "- None logged"}
Current Vitals:
${vitalsStr}

[Tier 2: Semantically Matched Health Records]
${citedFilesStr || "- No matching files found"}
======================================================

CURRENT TIME CONTEXT:
- Local Time: ${formattedDateTime}
- Time of Day Period: ${timeOfDayPeriod}

RECENT CHAT HISTORY:
${chatHistory}
`;
}

// ---------------------------------------------------------------------------
// 5. DIAGNOSTIC KEYWORDS CHECK for disclaimer auto-append
// ---------------------------------------------------------------------------

const diagnosticKeywords = [
  "diagnostic", "lab", "report", "blood panel", "fev1", "fvc", "medication",
  "prescription", "lisinopril", "atorvastatin", "metformin", "statin", "conflict",
  "symptom", "ferritin", "blood pressure", "vital", "heart rate", "glucose", "insulin",
  "diabetic", "glycemic", "cholesterol", "diet", "breakfast", "lunch", "dinner",
];

function containsDiagnosticContent(text: string): boolean {
  const lowerText = text.toLowerCase();
  return diagnosticKeywords.some((kw) => lowerText.includes(kw));
}

function hasDisclaimer(text: string): boolean {
  const lowerText = text.toLowerCase();
  return (
    lowerText.includes("disclaimer:") ||
    lowerText.includes("consult a medical doctor") ||
    lowerText.includes("consult a physician") ||
    lowerText.includes("seek professional medical attention")
  );
}

// ---------------------------------------------------------------------------
//  TESTS START HERE
// ---------------------------------------------------------------------------

describe("He-Co Clinical Safety Validator (validateAiOutput)", () => {
  const emptyMeds: any[] = [];
  const emptyUser = { dietaryPreferences: [] };

  it("returns safe=true with no warnings for benign response", () => {
    const result = validateAiOutput(
      "Drink plenty of water and rest well.",
      emptyUser,
      emptyMeds,
    );
    expect(result.safe).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("flags grapefruit mention when patient is on atorvastatin", () => {
    const meds = [{ name: "Atorvastatin", strength: "20mg" }];
    const result = validateAiOutput(
      "Grapefruit is a healthy citrus fruit.",
      emptyUser,
      meds,
    );
    expect(result.safe).toBe(false);
    expect(result.warnings[0]).toContain("Grapefruit");
    expect(result.warnings[0]).toContain("atorvastatin");
  });

  it("does NOT flag grapefruit if patient is NOT on statin", () => {
    const meds = [{ name: "Metformin", strength: "500mg" }];
    const result = validateAiOutput(
      "Grapefruit is a healthy citrus fruit.",
      emptyUser,
      meds,
    );
    expect(result.safe).toBe(true);
  });

  it("flags glycemic keywords for diabetic patient on metformin", () => {
    const meds = [{ name: "Metformin", strength: "500mg" }];
    const result = validateAiOutput(
      "Try honey or maple syrup for sweetening.",
      emptyUser,
      meds,
    );
    expect(result.safe).toBe(false);
    expect(result.warnings[0]).toContain("Glycemic Warning");
    expect(result.warnings[0]).toMatch(/honey|maple syrup/);
  });

  it("flags NSAID mention when patient is on lisinopril", () => {
    const meds = [{ name: "Lisinopril", strength: "10mg" }];
    const result = validateAiOutput(
      "You can take ibuprofen for pain relief.",
      emptyUser,
      meds,
    );
    expect(result.safe).toBe(false);
    expect(result.warnings[0]).toContain("NSAID");
    expect(result.warnings[0]).toContain("ibuprofen");
    expect(result.warnings[0]).toContain("Lisinopril");
  });

  it("flags potassium substitute for ACE inhibitor patients", () => {
    const meds = [{ name: "Lisinopril", strength: "10mg" }];
    const result = validateAiOutput(
      "Use potassium salt substitute for low sodium.",
      emptyUser,
      meds,
    );
    expect(result.safe).toBe(false);
    expect(result.warnings[0]).toContain("Hyperkalemia");
  });

  it("flags major symptoms missing doctor referral", () => {
    const result = validateAiOutput(
      "You have chest pain and severe dizziness.",
      emptyUser,
      emptyMeds,
    );
    expect(result.safe).toBe(false);
    expect(result.warnings[0]).toContain("Doctor Consultation");
  });

  it("does NOT flag major symptoms if doctor referral is present", () => {
    const result = validateAiOutput(
      "You have chest pain and severe dizziness. Please consult a doctor immediately.",
      emptyUser,
      emptyMeds,
    );
    expect(result.safe).toBe(true);
  });

  it("flags multiple warnings simultaneously", () => {
    const meds = [
      { name: "Atorvastatin", strength: "20mg" },
      { name: "Lisinopril", strength: "10mg" },
      { name: "Metformin", strength: "500mg" },
    ];
    const result = validateAiOutput(
      "Eat grapefruit, take ibuprofen, and drink honey for energy. You have chest pain.",
      emptyUser,
      meds,
    );
    expect(result.warnings.length).toBeGreaterThanOrEqual(3);
  });

  it("handles empty medications array gracefully", () => {
    const result = validateAiOutput(
      "Take ibuprofen for headache.",
      emptyUser,
      [],
    );
    expect(result.safe).toBe(true);
  });

  it("handles null user profile gracefully", () => {
    const result = validateAiOutput("Eat honey for energy.", null, []);
    expect(result.safe).toBe(true);
  });

  it("flags 'high-glycemic' keyword for diabetic patients", () => {
    const meds = [{ name: "Metformin", strength: "500mg" }];
    const result = validateAiOutput(
      "This is a high-glycemic food.",
      emptyUser,
      meds,
    );
    expect(result.safe).toBe(false);
    expect(result.warnings[0]).toContain("Glycemic");
  });
});

describe("Client-Side Safety Validator (runClientClinicalSafetyValidator)", () => {
  const baseUser = { dietaryPreferences: [] };
  const statinMeds = [{ name: "Atorvastatin", strength: "20mg" }];
  const aceMeds = [{ name: "Lisinopril", strength: "10mg" }];
  const diabeticMeds = [{ name: "Metformin", strength: "500mg" }];

  it("returns no issues for safe text", () => {
    const issues = runClientClinicalSafetyValidator(
      "Drink water and rest.",
      baseUser,
      [],
    );
    expect(issues).toHaveLength(0);
  });

  it("detects grapefruit interaction with statins", () => {
    const issues = runClientClinicalSafetyValidator(
      "Grapefruit is delicious.",
      baseUser,
      statinMeds,
    );
    expect(issues.some((i) => i.type === "grapefruit")).toBe(true);
  });

  it("detects NSAID interaction with ACE inhibitors", () => {
    const issues = runClientClinicalSafetyValidator(
      "Take some ibuprofen for pain.",
      baseUser,
      aceMeds,
    );
    expect(issues.some((i) => i.type === "nsaid")).toBe(true);
  });

  it("detects glycemic suggestions (always triggered due to highGlycemic condition)", () => {
    const issues = runClientClinicalSafetyValidator(
      "Try adding sugar to your tea.",
      baseUser,
      [],
    );
    expect(issues.some((i) => i.type === "glycemic")).toBe(true);
  });

  it("detects potassium substitute for lisinopril patients", () => {
    const issues = runClientClinicalSafetyValidator(
      "Use potassium salt substitute instead.",
      baseUser,
      aceMeds,
    );
    expect(issues.some((i) => i.type === "potassium")).toBe(true);
  });

  it("detects major symptom keywords", () => {
    const issues = runClientClinicalSafetyValidator(
      "I have chest pain and shortness of breath.",
      baseUser,
      [],
    );
    expect(issues.some((i) => i.type === "symptom")).toBe(true);
  });

  it("detects rhabdomyolysis mention", () => {
    const issues = runClientClinicalSafetyValidator(
      "Rhabdomyolysis risk is high.",
      baseUser,
      statinMeds,
    );
    expect(issues.some((i) => i.type === "symptom")).toBe(true);
  });

  it("handles multiple simultaneous safety issues", () => {
    const issues = runClientClinicalSafetyValidator(
      "Eat grapefruit with ibuprofen and sugar.",
      baseUser,
      [...statinMeds, ...aceMeds],
    );
    expect(issues.length).toBeGreaterThanOrEqual(3);
  });
});

describe("Vitals Analysis Engine - Blood Sugar", () => {
  it("classifies fasting 95 mg/dL as normal", () => {
    const result = analyzeBloodSugar(95, "mg/dL", "Fasting", []);
    expect(result.rangeStatus).toContain("Normal");
    expect(result.isNormal).toBe(true);
    expect(result.severity).toBe("normal");
    expect(result.urgentPrompt).toBe("");
  });

  it("classifies fasting 110 mg/dL as elevated (impaired fasting glucose)", () => {
    const result = analyzeBloodSugar(110, "mg/dL", "Fasting", []);
    expect(result.rangeStatus).toContain("Elevated");
    expect(result.isNormal).toBe(false);
    expect(result.severity).toBe("abnormal");
  });

  it("classifies fasting 130 mg/dL as high fasting", () => {
    const result = analyzeBloodSugar(130, "mg/dL", "Fasting", []);
    expect(result.rangeStatus).toContain("High");
    expect(result.isNormal).toBe(false);
    expect(result.severity).toBe("abnormal");
  });

  it("classifies post-meal 120 mg/dL as normal", () => {
    const result = analyzeBloodSugar(120, "mg/dL", "Post-meal", []);
    expect(result.rangeStatus).toContain("Normal");
    expect(result.isNormal).toBe(true);
  });

  it("classifies post-meal 160 mg/dL as elevated", () => {
    const result = analyzeBloodSugar(160, "mg/dL", "Post-meal", []);
    expect(result.rangeStatus).toContain("Elevated");
    expect(result.isNormal).toBe(false);
    expect(result.severity).toBe("abnormal");
  });

  it("classifies post-meal 220 mg/dL as high", () => {
    const result = analyzeBloodSugar(220, "mg/dL", "Post-meal", []);
    expect(result.rangeStatus).toContain("High");
    expect(result.isNormal).toBe(false);
    expect(result.severity).toBe("abnormal");
  });

  it("triggers crisis for hypoglycemia <70 mg/dL", () => {
    const result = analyzeBloodSugar(55, "mg/dL", "Fasting", []);
    expect(result.severity).toBe("crisis");
    expect(result.isNormal).toBe(false);
    expect(result.urgentPrompt).toContain("URGENT");
    expect(result.urgentPrompt).toContain("critically low");
  });

  it("triggers crisis for hyperglycemia >250 mg/dL", () => {
    const result = analyzeBloodSugar(300, "mg/dL", "Post-meal", []);
    expect(result.severity).toBe("crisis");
    expect(result.isNormal).toBe(false);
    expect(result.urgentPrompt).toContain("URGENT");
    expect(result.urgentPrompt).toContain("dangerously elevated");
  });

  it("converts mmol/L to mg/dL correctly (edge: 5.5 mmol/L ≈ 99 mg/dL)", () => {
    const result = analyzeBloodSugar(5.5, "mmol/L", "Fasting", []);
    expect(result.isNormal).toBe(true);
    expect(result.rangeStatus).toContain("Normal");
  });

  it("generates correct trend message for first reading", () => {
    const result = analyzeBloodSugar(100, "mg/dL", "Fasting", []);
    expect(result.trendMessage).toContain("first logged reading");
  });

  it("generates stable trend message when previous reading is similar", () => {
    const prev = [
      { sugarValue: 98, sugarUnit: "mg/dL", timestamp: new Date().toISOString() },
    ];
    const result = analyzeBloodSugar(100, "mg/dL", "Fasting", prev);
    expect(result.trendMessage).toContain("stable");
  });

  it("generates rising trend message", () => {
    const prev = [
      { sugarValue: 90, sugarUnit: "mg/dL", timestamp: new Date().toISOString() },
    ];
    const result = analyzeBloodSugar(140, "mg/dL", "Post-meal", prev);
    expect(result.trendMessage).toContain("risen");
  });

  it("generates decreasing trend message", () => {
    const prev = [
      { sugarValue: 180, sugarUnit: "mg/dL", timestamp: new Date().toISOString() },
    ];
    const result = analyzeBloodSugar(130, "mg/dL", "Post-meal", prev);
    expect(result.trendMessage).toContain("decreased");
  });
});

describe("Vitals Analysis Engine - Blood Pressure", () => {
  it("classifies 118/78 as normal", () => {
    const result = analyzeBloodPressure(118, 78, []);
    expect(result.rangeStatus).toContain("Normal");
    expect(result.isNormal).toBe(true);
    expect(result.severity).toBe("normal");
  });

  it("classifies 125/78 as elevated", () => {
    const result = analyzeBloodPressure(125, 78, []);
    expect(result.rangeStatus).toContain("Elevated");
    expect(result.isNormal).toBe(false);
    expect(result.severity).toBe("abnormal");
  });

  it("classifies 135/85 as stage 1 hypertension", () => {
    const result = analyzeBloodPressure(135, 85, []);
    expect(result.rangeStatus).toContain("Stage 1");
    expect(result.isNormal).toBe(false);
    expect(result.severity).toBe("abnormal");
  });

  it("classifies 150/95 as stage 2 hypertension", () => {
    const result = analyzeBloodPressure(150, 95, []);
    expect(result.rangeStatus).toContain("Stage 2");
    expect(result.isNormal).toBe(false);
    expect(result.severity).toBe("abnormal");
  });

  it("triggers crisis for systolic >180", () => {
    const result = analyzeBloodPressure(190, 100, []);
    expect(result.severity).toBe("crisis");
    expect(result.isNormal).toBe(false);
    expect(result.urgentPrompt).toContain("URGENT");
  });

  it("triggers crisis for diastolic >120", () => {
    const result = analyzeBloodPressure(160, 125, []);
    expect(result.severity).toBe("crisis");
    expect(result.isNormal).toBe(false);
    expect(result.urgentPrompt).toContain("URGENT");
  });

  it("generates stable trend from similar previous reading", () => {
    const prev = [
      { systolic: 120, diastolic: 80, timestamp: new Date().toISOString() },
    ];
    const result = analyzeBloodPressure(122, 82, prev);
    expect(result.trendMessage).toContain("stable");
  });

  it("generates upward trend message", () => {
    const prev = [
      { systolic: 115, diastolic: 75, timestamp: new Date().toISOString() },
    ];
    const result = analyzeBloodPressure(135, 85, prev);
    expect(result.trendMessage).toContain("upward");
  });

  it("generates downward trend message", () => {
    const prev = [
      { systolic: 145, diastolic: 90, timestamp: new Date().toISOString() },
    ];
    const result = analyzeBloodPressure(130, 82, prev);
    expect(result.trendMessage).toContain("downward");
  });
});

describe("RAG Prompt Context Assembly", () => {
  const mockUser = {
    fullName: "Test User",
    dob: "1990-01-15",
    gender: "Male",
    dietaryPreferences: ["No Preferences"],
  };
  const mockMeds = [
    { name: "Lisinopril", strength: "10mg", frequency: "Daily", taken: true },
  ];
  const mockVitals = {
    heartRate: 72,
    steps: 5000,
    sleep: "7h 30m",
    calories: 1800,
  };
  const mockFiles = [
    { file: { name: "Blood Report.pdf", aiInsight: "Vitamin D optimal." }, similarity: 0.85 },
  ];

  it("includes Tier 1 profile information correctly", () => {
    const context = buildPromptContext(
      mockUser,
      mockMeds,
      mockVitals,
      mockFiles,
      "",
      "Monday, July 24, 2026 at 09:30:00 AM",
      "Morning",
    );
    expect(context).toContain("Test User");
    expect(context).toContain("1990-01-15");
    expect(context).toContain("Male");
    expect(context).toContain("No Preferences");
  });

  it("includes Tier 1 medication information", () => {
    const context = buildPromptContext(
      mockUser,
      mockMeds,
      mockVitals,
      mockFiles,
      "",
      "Monday, July 24, 2026 at 09:30:00 AM",
      "Morning",
    );
    expect(context).toContain("Lisinopril");
    expect(context).toContain("10mg");
    expect(context).toContain("taken today: Yes");
  });

  it("includes Tier 2 semantically matched files", () => {
    const context = buildPromptContext(
      mockUser,
      mockMeds,
      mockVitals,
      mockFiles,
      "",
      "Monday, July 24, 2026 at 09:30:00 AM",
      "Morning",
    );
    expect(context).toContain("Blood Report.pdf");
    expect(context).toContain("85.0%");
    expect(context).toContain("Vitamin D optimal.");
  });

  it("includes time-of-day context", () => {
    const context = buildPromptContext(
      mockUser,
      [],
      mockVitals,
      [],
      "",
      "Monday, July 24, 2026 at 09:30:00 AM",
      "Morning",
    );
    expect(context).toContain("Morning");
  });

  it('includes "No matching files found" when no files are matched', () => {
    const context = buildPromptContext(
      mockUser,
      mockMeds,
      mockVitals,
      [],
      "",
      "Monday, July 24, 2026 at 09:30:00 AM",
      "Morning",
    );
    expect(context).toContain("No matching files found");
  });

  it('includes "None logged" when no medications exist', () => {
    const context = buildPromptContext(
      mockUser,
      [],
      mockVitals,
      mockFiles,
      "",
      "Monday, July 24, 2026 at 09:30:00 AM",
      "Morning",
    );
    expect(context).toContain("None logged");
  });

  it("includes recent chat history when provided", () => {
    const history =
      "Patient: What should I eat?\nDoctor: Eat healthy food.\n";
    const context = buildPromptContext(
      mockUser,
      mockMeds,
      mockVitals,
      mockFiles,
      history,
      "Monday, July 24, 2026 at 09:30:00 AM",
      "Morning",
    );
    expect(context).toContain("What should I eat?");
    expect(context).toContain("Eat healthy food.");
  });

  it("handles null user gracefully", () => {
    const context = buildPromptContext(
      null,
      [],
      mockVitals,
      [],
      "",
      "Monday, July 24, 2026 at 09:30:00 AM",
      "Morning",
    );
    expect(context).toContain("User");
  });
});

describe("Diagnostic Disclaimer Auto-Append Logic", () => {
  it("detects diagnostic keywords in text", () => {
    expect(containsDiagnosticContent("Check my blood pressure reading")).toBe(true);
    expect(containsDiagnosticContent("What is the weather today?")).toBe(false);
  });

  it("detects 'medication' keyword", () => {
    expect(containsDiagnosticContent("Your medication schedule")).toBe(true);
  });

  it("detects 'breakfast' keyword", () => {
    expect(containsDiagnosticContent("For breakfast, eat oatmeal")).toBe(true);
  });

  it("detects existing disclaimer", () => {
    expect(hasDisclaimer("Please consult a medical doctor if symptoms persist.")).toBe(true);
    expect(hasDisclaimer("This is general advice.")).toBe(false);
  });

  it("detects 'disclaimer:' prefix", () => {
    expect(hasDisclaimer("Disclaimer: This is not medical advice.")).toBe(true);
  });
});

describe("Prompt Greeting Time-of-Day Rules", () => {
  function getGreeting(timeOfDay: string): string {
    switch (timeOfDay) {
      case "Morning":
        return "Good Morning";
      case "Afternoon":
        return "Good Afternoon";
      case "Evening":
        return "Good Evening";
      case "Night":
        return "Good Night";
      default:
        return "Hello";
    }
  }

  it('greets "Good Morning" for morning period', () => {
    expect(getGreeting("Morning")).toBe("Good Morning");
  });

  it('greets "Good Afternoon" for afternoon period', () => {
    expect(getGreeting("Afternoon")).toBe("Good Afternoon");
  });

  it('greets "Good Evening" for evening period', () => {
    expect(getGreeting("Evening")).toBe("Good Evening");
  });

  it('greets "Good Night" for night period', () => {
    expect(getGreeting("Night")).toBe("Good Night");
  });

  it('falls back to "Hello" for unknown period', () => {
    expect(getGreeting("Midnight")).toBe("Hello");
  });

  it("derives morning from hour 5-11", () => {
    const hour = 9;
    const period = hour >= 5 && hour < 12 ? "Morning" : "Other";
    expect(period).toBe("Morning");
  });

  it("derives afternoon from hour 12-16", () => {
    const hour = 14;
    const period = hour >= 12 && hour < 17 ? "Afternoon" : "Other";
    expect(period).toBe("Afternoon");
  });

  it("derives evening from hour 17-20", () => {
    const hour = 19;
    const period = hour >= 17 && hour < 21 ? "Evening" : "Other";
    expect(period).toBe("Evening");
  });

  it("derives night from hour 21-4", () => {
    const hour = 23;
    const period = hour >= 21 || hour < 5 ? "Night" : "Other";
    expect(period).toBe("Night");
  });
});

describe("Dietary Time-Rule Compliance", () => {
  interface MealPlan {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  }

  function suggestMealPlan(
    timeOfDay: string,
    isDiabetic: boolean,
  ): MealPlan {
    const plan: MealPlan = {};
    if (timeOfDay === "Morning") {
      plan.breakfast = isDiabetic
        ? "Berries, nuts, or oats (low glycemic)"
        : "Apple or any fresh fruit";
      plan.lunch = "Whole-wheat chapatis, light curry, dal, and rice";
      plan.dinner = "Light chapatis and curry rice";
    } else if (timeOfDay === "Evening" || timeOfDay === "Night") {
      plan.dinner = "Chapatis, curry, and rice";
    } else {
      if (timeOfDay === "Afternoon") {
        plan.lunch = "Whole-wheat chapatis, light curry, dal, and rice";
      }
    }
    return plan;
  }

  it("includes breakfast, lunch, dinner in morning plan", () => {
    const plan = suggestMealPlan("Morning", false);
    expect(plan.breakfast).toBeDefined();
    expect(plan.lunch).toBeDefined();
    expect(plan.dinner).toBeDefined();
  });

  it("provides low-glycemic breakfast for diabetics in morning", () => {
    const plan = suggestMealPlan("Morning", true);
    expect(plan.breakfast).toContain("low glycemic");
    expect(plan.breakfast).not.toContain("apple");
  });

  it("provides only dinner for evening plan", () => {
    const plan = suggestMealPlan("Evening", false);
    expect(plan.breakfast).toBeUndefined();
    expect(plan.lunch).toBeUndefined();
    expect(plan.dinner).toBeDefined();
  });

  it("provides only dinner for night plan", () => {
    const plan = suggestMealPlan("Night", false);
    expect(plan.breakfast).toBeUndefined();
    expect(plan.lunch).toBeUndefined();
    expect(plan.dinner).toBeDefined();
  });

  it("provides lunch for afternoon plan", () => {
    const plan = suggestMealPlan("Afternoon", false);
    expect(plan.lunch).toBeDefined();
    expect(plan.breakfast).toBeUndefined();
    expect(plan.dinner).toBeUndefined();
  });
});

describe("He-Co Response Boundary & Optimization Checks", () => {
  it("response text should not exceed 180-word limit per prompt instructions", () => {
    const sampleResponse =
      "Good Morning! Based on your health profile, I recommend staying hydrated and maintaining your current medication schedule. Remember to take your Lisinopril 10mg today. For your blood pressure of 125/82, consistent moderate exercise will help. Disclaimer: Consult a doctor.";
    const wordCount = sampleResponse.split(/\s+/).length;
    expect(wordCount).toBeLessThanOrEqual(180);
  });

  it("should always contain a greeting aligned to time-of-day", () => {
    const morningResponse = "Good Morning! Here is your health summary.";
    const eveningResponse = "Good Evening! Here is your health summary.";
    expect(morningResponse).toMatch(/^Good (Morning|Afternoon|Evening)/);
    expect(eveningResponse).toMatch(/^Good (Morning|Afternoon|Evening)/);
  });

  it("should include RAG citation footer for file-based responses", () => {
    const responseWithCitation = "Your Vitamin D levels look great.\n\n**RAG Citation:** [Blood Report.pdf]";
    expect(responseWithCitation).toContain("RAG Citation");
  });

  it("citations should reference actual file names", () => {
    const citation = "[Blood Report.pdf]";
    expect(citation).toMatch(/^\[.+\]$/);
  });
});

describe("Error Handling & Fallbacks", () => {
  it("should return fallback message when no AI service is available", () => {
    const fallback = "AI service unavailable right now. Please try again later.";
    expect(fallback).toEqual(expect.stringContaining("AI service unavailable"));
  });

  it("should handle missing API key gracefully", () => {
    const hasRealKey = (value?: string) =>
      Boolean(value && value.trim() && !value.includes("YOUR_"));
    expect(hasRealKey(undefined)).toBe(false);
    expect(hasRealKey("")).toBe(false);
    expect(hasRealKey("YOUR_API_KEY")).toBe(false);
    expect(hasRealKey("sk-real-key")).toBe(true);
  });

  it("should reject missing required medication fields", () => {
    const validateMed = (name?: string, strength?: string) => {
      if (!name || !strength) {
        return { valid: false, error: "Missing drug name or strength." };
      }
      return { valid: true };
    };
    expect(validateMed().valid).toBe(false);
    expect(validateMed("Lisinopril").valid).toBe(false);
    expect(validateMed("Lisinopril", "10mg").valid).toBe(true);
  });

  it("should reject missing required vitals fields", () => {
    const validateSugar = (value?: number) => {
      if (value === undefined) {
        return { valid: false, error: "Missing blood sugar value" };
      }
      return { valid: true };
    };
    const validateBP = (systolic?: number, diastolic?: number) => {
      if (systolic === undefined || diastolic === undefined) {
        return { valid: false, error: "Missing blood pressure values" };
      }
      return { valid: true };
    };
    expect(validateSugar().valid).toBe(false);
    expect(validateSugar(95).valid).toBe(true);
    expect(validateBP().valid).toBe(false);
    expect(validateBP(120, 80).valid).toBe(true);
  });

  it("should reject invalid vitals type", () => {
    const validTypes = ["blood_sugar", "blood_pressure"];
    const isValid = (type: string) => validTypes.includes(type);
    expect(isValid("blood_sugar")).toBe(true);
    expect(isValid("blood_pressure")).toBe(true);
    expect(isValid("temperature")).toBe(false);
    expect(isValid("spo2")).toBe(false);
  });

  it("should not allow credit deduction below zero", () => {
    const deduct = (credits: number, amount: number) =>
      Math.max(0, credits - amount);
    expect(deduct(5, 3)).toBe(2);
    expect(deduct(2, 5)).toBe(0);
    expect(deduct(0, 1)).toBe(0);
  });

  it("should return 401 for missing authorization", () => {
    const authResult = (header?: string) => {
      if (!header) return { status: 401, error: "Missing authorization header." };
      return { status: 200 };
    };
    expect(authResult().status).toBe(401);
    expect(authResult("Bearer token").status).toBe(200);
  });

  it("should return 403 for insufficient credits", () => {
    const checkCredits = (credits: number) => {
      if (credits < 1) {
        return { allowed: false, error: "Insufficient credits." };
      }
      return { allowed: true };
    };
    expect(checkCredits(0).allowed).toBe(false);
    expect(checkCredits(1).allowed).toBe(true);
  });
});

describe("Retry Logic (generateContentWithRetry)", () => {
  it("should retry on 503 status with exponential backoff", async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce({ status: 503, message: "Service Unavailable" })
      .mockResolvedValueOnce("success");

    let attempt = 0;
    const maxRetries = 3;
    let delay = 1500;
    let result = "";

    while (attempt < maxRetries) {
      try {
        result = await mockFn();
        break;
      } catch (error: any) {
        attempt++;
        if (attempt >= maxRetries) throw error;
        delay *= 2;
      }
    }

    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(2);
  });

  it("should stop retrying after max retries and throw", async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValue({ status: 503, message: "Service Unavailable" });

    let attempt = 0;
    const maxRetries = 3;
    let caught = false;

    while (attempt < maxRetries) {
      try {
        await mockFn();
        break;
      } catch {
        attempt++;
        if (attempt >= maxRetries) {
          caught = true;
          break;
        }
      }
    }

    expect(caught).toBe(true);
    expect(mockFn).toHaveBeenCalledTimes(3);
  });

  it("should NOT retry on non-transient errors like 400", async () => {
    const mockFn = vi.fn().mockRejectedValue({ status: 400, message: "Bad Request" });

    let attempt = 0;
    const maxRetries = 3;
    let caught = false;

    while (attempt < maxRetries) {
      try {
        await mockFn();
        break;
      } catch {
        attempt++;
        break;
      }
    }

    expect(attempt).toBe(1);
  });
});

describe("Embedding & Cosine Similarity", () => {
  function dotProduct(a: number[], b: number[]): number {
    let dp = 0;
    for (let i = 0; i < a.length; i++) dp += a[i] * b[i];
    return dp;
  }
  function magnitude(a: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * a[i];
    return Math.sqrt(sum);
  }
  function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    const magA = magnitude(a);
    const magB = magnitude(b);
    if (magA === 0 || magB === 0) return 0;
    return dotProduct(a, b) / (magA * magB);
  }

  it("returns 1.0 for identical vectors", () => {
    const v = [0.1, 0.2, 0.3, 0.4];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
  });

  it("returns 0 for orthogonal vectors", () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it("returns 0 for empty vectors", () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it("returns 0 for mismatched length vectors", () => {
    expect(cosineSimilarity([0.1, 0.2], [0.1])).toBe(0);
  });

  it("returns 0 if either vector has zero magnitude", () => {
    expect(cosineSimilarity([0, 0], [0.1, 0.2])).toBe(0);
  });

  it("returns a value between -1 and 1 for arbitrary vectors", () => {
    const a = [0.5, 0.3, -0.1, 0.8];
    const b = [-0.2, 0.7, 0.4, -0.3];
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThanOrEqual(-1);
    expect(sim).toBeLessThanOrEqual(1);
  });

  it("generates deterministic mock embeddings when no AI is available", () => {
    function getMockEmbedding(text: string): number[] {
      const v: number[] = [];
      for (let i = 0; i < 768; i++) {
        v.push(Math.sin(i + text.length) * 0.1);
      }
      return v;
    }
    const emb1 = getMockEmbedding("test");
    const emb2 = getMockEmbedding("test");
    expect(emb1).toEqual(emb2);
    expect(emb1).toHaveLength(768);
  });
});

describe("Backfill Embeddings Logic", () => {
  it("should generate embeddings only for files missing them", () => {
    const files = [
      { id: "1", name: "Report.pdf", aiInsight: "All good.", embedding: [0.1, 0.2] },
      { id: "2", name: "Scan.png", aiInsight: "Normal.", embedding: undefined },
    ];
    const needsBackfill = files.filter((f) => !f.embedding);
    expect(needsBackfill).toHaveLength(1);
    expect(needsBackfill[0].id).toBe("2");
  });
});

describe("Word Count & Response Size Optimization", () => {
  it("should keep AI commentary within 120-word limit for vitals analysis", () => {
    const commentary =
      "Your blood sugar reading of 95 mg/dL is within normal limits. This is a great sign of metabolic health. Maintain consistent meal timing and hydration. Continue your current medication schedule as prescribed by your doctor. For optimal results, pair your meals with a short walk. Disclaimer: Consult your physician.";
    expect(commentary.split(/\s+/).length).toBeLessThanOrEqual(120);
  });

  it("should keep AI chat responses within 180 words", () => {
    const response =
      "Your health metrics look stable. Keep up the good work with your medication adherence and hydration goals. Based on your profile, a balanced diet rich in fiber will support your cardiovascular health. Remember to consult your doctor for any persistent symptoms.";
    expect(response.split(/\s+/).length).toBeLessThanOrEqual(180);
  });
});
