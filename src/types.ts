export interface User {
  id: string;
  email: string;
  fullName: string;
  dob: string;
  gender: string;
  dietaryPreferences: string[];
  credits: number;
  vitalityScoreUp: number;
  sleepRecovery: string;
  avatarUrl?: string;
  provider?: string;
  weightKg?: string;
  heightCm?: string;
  healthGoals?: string[];
  activeDiseases?: string[];
  otherDisease?: string;
  medicalHistory?: string;
  noMedication?: boolean;
}

export interface MedicationReminder {
  id: string;
  medicationId: string;
  userId: string;
  reminderName: string;
  frequency: "Once Daily" | "Twice Daily" | "Three Times Daily" | "Four Times Daily" | "Weekly" | "Monthly" | "Custom";
  times: string[];
  foodRelation: "Empty Stomach" | "Before Meal" | "After Meal" | "With Food" | "Bedtime" | "Any Time";
  mealSelection: ("Breakfast" | "Lunch" | "Dinner")[];
  startDate: string;
  endDate: string | null;
  noEndDate: boolean;
  repeatDays: string[];
  notificationSound: string;
  snooze: number;
  notes: string;
  enabled: boolean;
}

export interface HealthReminder {
  id: string;
  userId: string;
  type: "Drink Water" | "Exercise" | "Walk" | "Blood Sugar Check" | "Blood Pressure Check" | "Weight Check" | "Sleep" | "Doctor Appointment" | "Lab Test" | "Refill Medicine" | "Custom";
  customLabel?: string;
  times: string[];
  frequency: "Once Daily" | "Twice Daily" | "Three Times Daily" | "Custom";
  repeatDays: string[];
  notes: string;
  enabled: boolean;
}

export interface ReminderStatus {
  id: string;
  reminderId: string;
  reminderType: "medication" | "health";
  date: string;
  time: string;
  status: "pending" | "taken" | "skipped" | "snoozed";
  snoozedUntil?: string;
}

export interface SmartActions {
  waterLoggedMl: number;
  waterGoalMl: number;
  vitaminD: boolean;
  breathing: boolean;
}

export interface Vitals {
  heartRate: number;
  steps: number;
  sleep: string;
  calories: number;
  activityTrends: number[];
}

export interface VitalReading {
  id: string;
  userId: string;
  type: "blood_sugar" | "blood_pressure";
  timestamp: string; // ISO String or customizable local ISO
  sugarValue?: number; // raw value as input
  sugarUnit?: "mg/dL" | "mmol/L";
  sugarContext?: "Fasting" | "Post-meal" | "Random" | "Bedtime";
  systolic?: number;
  diastolic?: number;
  pulse?: number; // optional pulse rate for BP
}

export interface VitalReminder {
  id: string;
  userId: string;
  type: "blood_sugar" | "blood_pressure";
  time: string; // e.g. "07:00 AM" or "19:00"
  label: string; // e.g. "fasting sugar" or "evening BP"
  active: boolean;
  days: string[]; // e.g. ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
}

export interface FileRecord {
  id: string;
  userId: string;
  name: string;
  date: string;
  size: string;
  type: string;
  aiInsight: string;
  category: "report" | "prescription";
}

export interface Medication {
  id: string;
  userId: string;
  name: string;
  strength: string;
  form: string;
  frequency: string;
  dueTime: string;
  taken: boolean;
  loggedAt: string | null;
  reminderSet: boolean;
  reminderInterval?: string;
  duration_months?: number;
  conflictDetected?: boolean;
  conflictMessage?: string;
}

export interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export interface ScanResult {
  id: string;
  userId: string;
  identifiedName: string;
  interactionCheck: string;
  conflict: boolean;
  timestamp: string;
}
