export interface SmartReminderDefaults {
  reminderName: string
  frequency: "Once Daily" | "Twice Daily" | "Three Times Daily" | "Four Times Daily" | "Weekly" | "Monthly" | "Custom"
  times: string[]
  foodRelation: "Empty Stomach" | "Before Meal" | "After Meal" | "With Food" | "Bedtime" | "Any Time"
  mealSelection: ("Breakfast" | "Lunch" | "Dinner")[]
  repeatDays: string[]
  notes: string
}

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export function getSmartDefaults(medicationName: string, diseases: string[]): SmartReminderDefaults[] {
  const name = medicationName.toLowerCase()
  const suggestions: SmartReminderDefaults[] = []

  for (const disease of diseases) {
    const defaults = DISEASE_REMINDERS[disease]
    if (!defaults) continue
    for (const d of defaults) {
      if (d.matches.some(m => name.includes(m))) {
        suggestions.push({
          reminderName: d.reminderName || medicationName,
          frequency: d.frequency,
          times: d.times,
          foodRelation: d.foodRelation,
          mealSelection: d.mealSelection,
          repeatDays: d.repeatDays ?? weekdays,
          notes: d.notes ?? "",
        })
      }
    }
  }

  if (suggestions.length === 0) {
    suggestions.push({
      reminderName: medicationName,
      frequency: "Once Daily",
      times: ["09:00"],
      foodRelation: "After Meal",
      mealSelection: ["Breakfast"],
      repeatDays: weekdays,
      notes: "",
    })
  }

  return suggestions
}

interface DiseaseRule {
  matches: string[]
  reminderName?: string
  frequency: SmartReminderDefaults["frequency"]
  times: string[]
  foodRelation: SmartReminderDefaults["foodRelation"]
  mealSelection: SmartReminderDefaults["mealSelection"]
  repeatDays?: string[]
  notes?: string
}

const DISEASE_REMINDERS: Record<string, DiseaseRule[]> = {
  "Diabetes Type 1": [
    { matches: ["insulin"], reminderName: "Insulin", frequency: "Twice Daily", times: ["07:00", "19:00"], foodRelation: "Before Meal", mealSelection: ["Breakfast", "Dinner"], notes: "Take insulin 30 min before meals" },
  ],
  "Diabetes Type 2": [
    { matches: ["metformin"], reminderName: "Metformin", frequency: "Twice Daily", times: ["08:30", "20:00"], foodRelation: "After Meal", mealSelection: ["Breakfast", "Dinner"], notes: "Take after meals to reduce GI side effects" },
    { matches: ["glipizide", "glimepiride", "sulfonylurea"], frequency: "Once Daily", times: ["08:00"], foodRelation: "Before Meal", mealSelection: ["Breakfast"], notes: "Take 30 min before breakfast" },
  ],
  "Prediabetes": [
    { matches: ["lifestyle", "walk"], reminderName: "Morning Walk", frequency: "Once Daily", times: ["06:30"], foodRelation: "Any Time", mealSelection: [], notes: "30 min brisk walk" },
    { matches: ["metformin"], frequency: "Once Daily", times: ["08:30"], foodRelation: "After Meal", mealSelection: ["Breakfast"] },
  ],
  "High Blood Pressure": [
    { matches: ["amlodipine", "lisinopril", "losartan", "bp", "blood pressure"], frequency: "Once Daily", times: ["08:00"], foodRelation: "After Meal", mealSelection: ["Breakfast"], notes: "Take same time daily" },
  ],
  "Low Blood Pressure": [
    { matches: ["fludrocortisone", "midodrine"], frequency: "Once Daily", times: ["08:00"], foodRelation: "After Meal", mealSelection: ["Breakfast"] },
  ],
  "Heart Disease": [
    { matches: ["aspirin"], reminderName: "Aspirin", frequency: "Once Daily", times: ["08:00"], foodRelation: "After Meal", mealSelection: ["Breakfast"], notes: "Take with food to protect stomach" },
    { matches: ["statin", "atorvastatin", "rosuvastatin"], reminderName: "Statin", frequency: "Once Daily", times: ["21:00"], foodRelation: "Bedtime", mealSelection: [], notes: "Take at bedtime for maximum efficacy" },
    { matches: ["clopidogrel", "ticagrelor"], frequency: "Once Daily", times: ["08:00"], foodRelation: "After Meal", mealSelection: ["Breakfast"] },
  ],
  "Thyroid": [
    { matches: ["thyroxine", "levothyroxine", "thyronorm", "eltroxin"], reminderName: "Thyroid Medication", frequency: "Once Daily", times: ["06:00"], foodRelation: "Empty Stomach", mealSelection: [], notes: "Take 30-60 min before breakfast on empty stomach. Avoid calcium/iron within 4 hours." },
  ],
  "Asthma": [
    { matches: ["inhaler", "ventolin", "budesonide", "fluticasone"], frequency: "Twice Daily", times: ["08:00", "20:00"], foodRelation: "Any Time", mealSelection: [], notes: "Morning and evening doses" },
  ],
  "Kidney Stone": [
    { matches: ["water", "hydration"], reminderName: "Water Reminder", frequency: "Custom", times: ["09:00", "11:00", "13:00", "15:00", "17:00", "19:00"], foodRelation: "Any Time", mealSelection: [], notes: "Drink 200-250ml water every 2-3 hours" },
  ],
  "Chronic Kidney Disease": [
    { matches: ["water"], reminderName: "Water Reminder (Doctor Configured)", frequency: "Custom", times: ["09:00", "12:00", "15:00", "18:00"], foodRelation: "Any Time", mealSelection: [] },
  ],
  "Fatty Liver": [
    { matches: ["exercise"], reminderName: "Exercise Reminder", frequency: "Once Daily", times: ["07:00"], foodRelation: "Any Time", mealSelection: [], notes: "30 min cardio recommended" },
  ],
  "Arthritis": [
    { matches: ["pain", "analgesic", "naproxen"], frequency: "Once Daily", times: ["08:00"], foodRelation: "After Meal", mealSelection: ["Breakfast"], notes: "Take with food to protect stomach" },
  ],
  "High Cholesterol": [
    { matches: ["statin", "atorvastatin", "rosuvastatin", "simvastatin"], frequency: "Once Daily", times: ["21:00"], foodRelation: "Bedtime", mealSelection: [], notes: "Take at bedtime - liver produces most cholesterol at night" },
  ],
  "Obesity": [
    { matches: ["exercise"], reminderName: "Exercise Reminder", frequency: "Once Daily", times: ["07:00"], foodRelation: "Any Time", mealSelection: [] },
    { matches: ["water"], reminderName: "Water Reminder", frequency: "Custom", times: ["09:00", "12:00", "15:00", "18:00"], foodRelation: "Any Time", mealSelection: [] },
  ],
  "PCOS": [
    { matches: ["metformin"], frequency: "Once Daily", times: ["08:30"], foodRelation: "After Meal", mealSelection: ["Breakfast"] },
  ],
  "Migraine": [
    { matches: ["preventive", "propranolol", "topiramate"], reminderName: "Preventive Medicine", frequency: "Once Daily", times: ["21:00"], foodRelation: "Bedtime", mealSelection: [], notes: "Preventive dose at bedtime" },
  ],
  "Gastric Issues": [
    { matches: ["pantoprazole", "omeprazole", "ppit", "ppi"], frequency: "Once Daily", times: ["06:30"], foodRelation: "Empty Stomach", mealSelection: [], notes: "Take 30 min before breakfast on empty stomach" },
  ],
  "Acid Reflux (GERD)": [
    { matches: ["pantoprazole", "omeprazole", "ppi"], frequency: "Once Daily", times: ["06:30"], foodRelation: "Empty Stomach", mealSelection: [], notes: "Take 30 min before breakfast" },
  ],
  "Anemia": [
    { matches: ["iron", "ferrous"], reminderName: "Iron Supplement", frequency: "Once Daily", times: ["10:00"], foodRelation: "Empty Stomach", mealSelection: [], notes: "Take on empty stomach. Avoid milk, tea, coffee within 1 hour." },
  ],
  "Vitamin D Deficiency": [
    { matches: ["vitamin d", "calcitriol", "cholecalciferol"], reminderName: "Vitamin D Supplement", frequency: "Weekly", times: ["10:00"], foodRelation: "After Meal", mealSelection: ["Breakfast"], notes: "Take with a fat-containing meal for better absorption" },
  ],
  "Vitamin B12 Deficiency": [
    { matches: ["vitamin b12", "methylcobalamin", "cyanocobalamin"], reminderName: "Vitamin B12", frequency: "Once Daily", times: ["09:00"], foodRelation: "After Meal", mealSelection: ["Breakfast"] },
  ],
}
