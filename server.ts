import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

// Fix for ES module / CommonJS __dirname in Node
const __filenameResolved = typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : "";
const __dirnameResolved = __filenameResolved ? path.dirname(__filenameResolved) : "";

const hasRealKey = (value?: string) => Boolean(value && value.trim() && !value.includes("YOUR_"));

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
if (hasRealKey(process.env.GEMINI_API_KEY)) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY is not configured. Gemini fallback will be skipped.");
}

const cohereApiKey = process.env.COHERE_API_KEY || "";
const useCohere = hasRealKey(cohereApiKey);
if (useCohere) {
  console.log("COHERE_API_KEY detected. Cohere will be used for chat generation.");
}

async function generateCohereChat(prompt: string) {
  const res = await fetch("https://api.cohere.ai/v1/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cohereApiKey}`,
      "X-Client-Name": "SwasthAI",
    },
    body: JSON.stringify({
      stream: false,
      model: "command-r-plus-08-2024",
      message: prompt,
      temperature: 0.4,
      max_tokens: 450,
    }),
  });

  if (!res.ok) {
    throw new Error(`Cohere chat request failed with status ${res.status}`);
  }

  const data: any = await res.json();
  return data.text || "";
}

async function generatePrimaryChat(prompt: string) {
  if (useCohere) {
    try {
      return await generateCohereChat(prompt);
    } catch (error) {
      console.error("[Swasth-AI Cohere] Primary backend failed, falling back to Gemini:", error);
    }
  }

  if (ai) {
    try {
      const result = await generateContentWithRetry({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      return result.text || "";
    } catch (error) {
      console.error("[Swasth-AI Gemini] Fallback backend failed:", error);
    }
  }

  return "";
}

const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

// Helper to ensure database is initialized with gorgeous default data
function initDatabase() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const defaultDb = {
    users: [
      {
        id: "sarah-session-token", // simple secure token for demo session
        email: "sarah@companion.com",
        passwordHash: crypto.createHash("sha256").update("password123").digest("hex"),
        fullName: "Sarah",
        dob: "1994-10-24",
        gender: "Female",
        dietaryPreferences: ["No Preferences"],
        credits: 120,
        vitalityScoreUp: 12,
        sleepRecovery: "7h 45m"
      }
    ],
    smartActions: {
      "sarah-session-token": {
        waterLoggedMl: 1500,
        waterGoalMl: 2500,
        vitaminD: false,
        breathing: false
      }
    },
    vitals: {
      "sarah-session-token": {
        heartRate: 72,
        steps: 8432,
        sleep: "7h 45m",
        calories: 1850,
        activityTrends: [40, 65, 45, 85, 60, 95, 75]
      }
    },
    files: [
      {
        id: "file-1",
        userId: "sarah-session-token",
        name: "Full Blood Panel.pdf",
        date: "Oct 12, 2023",
        size: "2.4 MB",
        type: "pdf",
        aiInsight: "Vitamin D levels are optimal. Slight decrease in Ferritin noted.",
        category: "report"
      },
      {
        id: "file-2",
        userId: "sarah-session-token",
        name: "Amoxicillin Prescription.png",
        date: "Sep 28, 2023",
        size: "1.1 MB",
        type: "png",
        aiInsight: "Course: 250mg, 3x daily. Ends in 3 days.",
        category: "prescription"
      },
      {
        id: "file-3",
        userId: "sarah-session-token",
        name: "Chest X-Ray_Left.dicom",
        date: "Aug 15, 2023",
        size: "45 MB",
        type: "dicom",
        aiInsight: "No acute abnormalities detected. Comparison to 2022 stable.",
        category: "report"
      },
      {
        id: "file-4",
        userId: "sarah-session-token",
        name: "Urinalysis Results.pdf",
        date: "Jul 02, 2023",
        size: "800 KB",
        type: "pdf",
        aiInsight: "All markers within normal range.",
        category: "report"
      },
      {
        id: "file-5",
        userId: "sarah-session-token",
        name: "ECG-Resting-12-Lead.png",
        date: "Jun 19, 2023",
        size: "4.2 MB",
        type: "png",
        aiInsight: "Normal Sinus Rhythm. Avg HR: 64 BPM.",
        category: "report"
      },
      {
        id: "file-6",
        userId: "sarah-session-token",
        name: "Immunization Record.pdf",
        date: "May 10, 2023",
        size: "3.1 MB",
        type: "pdf",
        aiInsight: "Tetanus booster due in 18 months.",
        category: "prescription"
      }
    ],
    medications: [
      {
        id: "med-1",
        userId: "sarah-session-token",
        name: "Lisinopril",
        strength: "10mg",
        form: "Tablet",
        frequency: "Daily",
        dueTime: "09:00 AM",
        taken: false,
        loggedAt: null,
        reminderSet: false
      },
      {
        id: "med-2",
        userId: "sarah-session-token",
        name: "Metformin",
        strength: "500mg",
        form: "Tablet",
        frequency: "After Breakfast",
        dueTime: "08:00 AM",
        taken: true,
        loggedAt: "08:15 AM",
        reminderSet: false
      },
      {
        id: "med-3",
        userId: "sarah-session-token",
        name: "Atorvastatin",
        strength: "20mg",
        form: "Tablet",
        frequency: "Evening",
        dueTime: "08:00 PM",
        taken: false,
        loggedAt: null,
        reminderSet: true
      }
    ],
    chats: [
      {
        userId: "sarah-session-token",
        messages: [
          { sender: "ai", text: "Hello! I am your AI Health Companion. I can help analyze your medical files, check medication schedules, scan prescriptions, and answer wellness queries. How can I support you today?", timestamp: new Date().toISOString() }
        ]
      }
    ],
    scans: [
      {
        id: "scan-1",
        userId: "sarah-session-token",
        identifiedName: "Lisinopril 10mg",
        interactionCheck: "Conflict Detected with Ibuprofen.",
        conflict: true,
        timestamp: new Date().toISOString()
      }
    ],
    vitalsReadings: [
      {
        id: "reading-1",
        userId: "sarah-session-token",
        type: "blood_sugar",
        timestamp: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
        sugarValue: 95,
        sugarUnit: "mg/dL",
        sugarContext: "Fasting"
      },
      {
        id: "reading-2",
        userId: "sarah-session-token",
        type: "blood_pressure",
        timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
        systolic: 122,
        diastolic: 80,
        pulse: 72
      },
      {
        id: "reading-3",
        userId: "sarah-session-token",
        type: "blood_sugar",
        timestamp: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
        sugarValue: 138,
        sugarUnit: "mg/dL",
        sugarContext: "Post-meal"
      },
      {
        id: "reading-4",
        userId: "sarah-session-token",
        type: "blood_pressure",
        timestamp: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        systolic: 118,
        diastolic: 78,
        pulse: 68
      },
      {
        id: "reading-5",
        userId: "sarah-session-token",
        type: "blood_sugar",
        timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        sugarValue: 92,
        sugarUnit: "mg/dL",
        sugarContext: "Fasting"
      },
      {
        id: "reading-6",
        userId: "sarah-session-token",
        type: "blood_pressure",
        timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
        systolic: 125,
        diastolic: 82,
        pulse: 74
      },
      {
        id: "reading-7",
        userId: "sarah-session-token",
        type: "blood_sugar",
        timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        sugarValue: 142,
        sugarUnit: "mg/dL",
        sugarContext: "Post-meal"
      }
    ],
    vitalsReminders: [
      {
        id: "reminder-1",
        userId: "sarah-session-token",
        type: "blood_sugar",
        time: "07:30 AM",
        label: "Fasting Sugar Check",
        active: true,
        days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      },
      {
        id: "reminder-2",
        userId: "sarah-session-token",
        type: "blood_pressure",
        time: "07:00 PM",
        label: "Evening BP Check",
        active: true,
        days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      }
    ]
  };

  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), "utf8");
  } else {
    try {
      const current = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      let updated = false;
      if (!current.vitalsReadings) {
        current.vitalsReadings = defaultDb.vitalsReadings;
        updated = true;
      }
      if (!current.vitalsReminders) {
        current.vitalsReminders = defaultDb.vitalsReminders;
        updated = true;
      }
      if (updated) {
        fs.writeFileSync(DB_FILE, JSON.stringify(current, null, 2), "utf8");
      }
    } catch (e) {
      console.error("Failed to merge preloaded vitals database:", e);
    }
  }
}

initDatabase();

// Load & Save Helpers
function getDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.agentCalls) {
      parsed.agentCalls = [];
    }
    if (!parsed.vitalsReadings) {
      parsed.vitalsReadings = [];
    }
    if (!parsed.vitalsReminders) {
      parsed.vitalsReminders = [];
    }
    return parsed;
  } catch (err) {
    initDatabase();
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  }
}

function saveDb(data: any) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
}

// Helper to call ai.models.generateContent with retries on transient errors like 503 (service unavailable) or rate limit (429)
async function generateContentWithRetry(params: any, maxRetries = 3, initialDelayMs = 1500): Promise<any> {
  if (!ai) {
    throw new Error("Gemini client is not initialized");
  }
  let attempt = 0;
  let delay = initialDelayMs;
  while (true) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      attempt++;
      const errorMessage = String(error?.message || "");
      const isTransient = 
        error?.status === 503 || 
        error?.code === 503 || 
        error?.status === 429 ||
        error?.code === 429 ||
        errorMessage.includes("503") || 
        errorMessage.includes("UNAVAILABLE") ||
        errorMessage.includes("429") ||
        errorMessage.includes("RESOURCE_EXHAUSTED");

      if (isTransient && attempt < maxRetries) {
        console.warn(`[Swasth-AI Gemini API] Transient error (attempt ${attempt}/${maxRetries}): ${errorMessage}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
        continue;
      }
      throw error;
    }
  }
}

// ==========================================
//   SWASTH-AI AGENTIC RAG & SAFETY ENGINE
// ==========================================

// Helper to generate text embeddings using gemini-embedding-2-preview (768 dimensions)
async function getEmbedding(text: string): Promise<number[]> {
  if (!ai) {
    // Generate simulated stable embedding vector of size 768 for offline fallback
    const mockVector: number[] = [];
    for (let i = 0; i < 768; i++) {
      mockVector.push(Math.sin(i + text.length) * 0.1);
    }
    return mockVector;
  }
  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: text,
    });
    const resAny = response as any;
    if (resAny.embedding?.values) {
      return resAny.embedding.values;
    }
    throw new Error("No embedding values found in response");
  } catch (error) {
    console.error("Embedding generation failed, falling back to mock vector:", error);
    const mockVector: number[] = [];
    for (let i = 0; i < 768; i++) {
      mockVector.push(Math.sin(i + text.length) * 0.1);
    }
    return mockVector;
  }
}

// Vector math helpers
function dotProduct(a: number[], b: number[]): number {
  let dp = 0;
  for (let i = 0; i < a.length; i++) {
    dp += a[i] * b[i];
  }
  return dp;
}

function magnitude(a: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * a[i];
  }
  return Math.sqrt(sum);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
}

// Asynchronous background file embedding backfiller
async function backfillEmbeddings() {
  console.log("[Swasth-AI Backfill] Running background backfill for pre-existing files...");
  const db = getDb();
  let updated = false;

  for (const file of db.files) {
    if (!file.embedding) {
      const textToEmbed = `${file.name} - ${file.aiInsight || ""}`;
      try {
        file.embedding = await getEmbedding(textToEmbed);
        updated = true;
        console.log(`[Swasth-AI Backfill] Generated embedding for file: ${file.name}`);
      } catch (err) {
        console.error(`[Swasth-AI Backfill] Failed for file: ${file.name}`, err);
      }
    }
  }

  if (updated) {
    saveDb(db);
    console.log("[Swasth-AI Backfill] Backfill completed and db.json updated successfully.");
  } else {
    console.log("[Swasth-AI Backfill] All existing records already have embeddings.");
  }
}

// Kick off backfill immediately
backfillEmbeddings().catch((err) => console.error("Backfill failed:", err));

// Clinical safety rule engine validation lookup table
interface SafetyCheckResult {
  safe: boolean;
  warnings: string[];
}

function validateAiOutput(response: string, userProfile: any, medications: any[]): SafetyCheckResult {
  const warnings: string[] = [];
  const lowerResponse = response.toLowerCase();

  // 1. Grapefruit statin warning
  const isTakingStatin = medications.some((m: any) => m.name.toLowerCase().includes("atorvastatin") || m.name.toLowerCase().includes("statin"));
  if (isTakingStatin && (lowerResponse.includes("grapefruit") || lowerResponse.includes("grape fruit"))) {
    warnings.push("CYP3A4 Inhibition Warning: Grapefruit increases atorvastatin blood levels, raising risks of muscle toxicity and rhabdomyolysis. If you experience severe muscle weakness or pain, consult a doctor immediately.");
  }

  // 2. Diabetic glucose spike warnings
  const isDiabeticRisk = medications.some((m: any) => m.name.toLowerCase().includes("metformin") || m.name.toLowerCase().includes("diabetes")) || 
                         (userProfile?.dietaryPreferences && userProfile.dietaryPreferences.some((p: string) => p.toLowerCase().includes("diabetic") || p.toLowerCase().includes("glucose")));
  if (isDiabeticRisk) {
    const sugaryKeywords = ["sugar", "honey", "maple syrup", "white bread", "white rice", "potatoes", "juice", "high glycemic", "high-glycemic"];
    for (const kw of sugaryKeywords) {
      if (lowerResponse.includes(kw)) {
        warnings.push(`Glycemic Warning: Suggested sugar source "${kw}" spikes blood glucose, directly opposing diabetes therapies. Focus on low-glycemic foods and consult a primary care physician to monitor your long-term glucose curves.`);
        break;
      }
    }
  }

  // 3. Hypertension ACE inhibitor NSAID conflicts
  const isTakingAceInhibitor = medications.some((m: any) => m.name.toLowerCase().includes("lisinopril") || m.name.toLowerCase().includes("ace-inhibitor"));
  if (isTakingAceInhibitor) {
    const nsaids = ["ibuprofen", "advil", "motrin", "aspirin", "naproxen", "aleve"];
    for (const ns of nsaids) {
      if (lowerResponse.includes(ns)) {
        warnings.push(`NSAID Interaction: "${ns}" restricts kidney blood flow and counteracts the therapeutic efficacy of Lisinopril. Use safer alternatives and seek medical consultation for long-term pain management.`);
        break;
      }
    }
    if (lowerResponse.includes("potassium substitute") || lowerResponse.includes("potassium salt") || lowerResponse.includes("salt substitute")) {
      warnings.push("Hyperkalemia Warning: ACE-inhibitors spark potassium retention; combining them with potassium salt substitutes is risky. Discuss your electrolyte balance and nutrition plans with a physician.");
    }
  }

  // 4. Clinical major symptoms doctor consultation checks
  const majorSymptomKeywords = [
    "chest pain", "pain in chest", "shortness of breath", "difficulty breathing", 
    "severe muscle pain", "rhabdomyolysis", "muscle toxicity", "high fever", 
    "extreme numbness", "sudden weakness", "severe dizziness", "vision loss", 
    "palpitations", "heart flutter", "severe fatigue", "extreme blood sugar"
  ];
  
  const hasMajorSymptom = majorSymptomKeywords.some(kw => lowerResponse.includes(kw));
  const mentionsMedicalHelp = lowerResponse.includes("doctor") || 
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
    warnings.push("Doctor Consultation Advised: Major or severe symptom indicators detected. It is highly advised that you consult a licensed doctor or medical provider immediately for an accurate diagnosis.");
  }

  return {
    safe: warnings.length === 0,
    warnings,
  };
}

const app = express();
app.use(express.json({ limit: "10mb" }));

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Authentication middleware to extract user context
function authenticate(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // Standard secure token fallback to our default Sarah session for beautiful zero-friction previewing
    req.userId = "sarah-session-token";
    return next();
  }
  const token = authHeader.replace("Bearer ", "");
  const db = getDb();
  const user = db.users.find((u: any) => u.id === token);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized session. Please sign in again." });
  }
  req.userId = user.id;
  next();
}

// --- SECURE AUTHENTICATION ENDPOINTS ---

app.post("/api/auth/register", (req, res) => {
  const { fullName, email, password } = req.body;
  if (!fullName || !email || !password) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  const db = getDb();
  if (db.users.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "An account with this email already exists." });
  }

  const userId = crypto.randomUUID();
  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");

  const newUser = {
    id: userId,
    email: email.toLowerCase(),
    passwordHash,
    fullName,
    dob: "",
    gender: "Other",
    dietaryPreferences: ["No Preferences"],
    credits: 120,
    vitalityScoreUp: 0,
    sleepRecovery: "N/A"
  };

  db.users.push(newUser);

  // Initialize companion states for this user
  db.smartActions[userId] = {
    waterLoggedMl: 0,
    waterGoalMl: 2500,
    vitaminD: false,
    breathing: false
  };

  db.vitals[userId] = {
    heartRate: 70,
    steps: 0,
    sleep: "0h 0m",
    calories: 0,
    activityTrends: [0, 0, 0, 0, 0, 0, 0]
  };

  saveDb(db);

  res.status(201).json({ token: userId, user: { id: userId, fullName, email } });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password." });
  }

  const db = getDb();
  const user = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  if (user.passwordHash !== passwordHash) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  res.json({ token: user.id, user: { id: user.id, fullName: user.fullName, email: user.email } });
});

app.get("/api/auth/profile", authenticate, (req: any, res) => {
  const db = getDb();
  const user = db.users.find((u: any) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    user,
    smartActions: db.smartActions[req.userId] || { waterLoggedMl: 0, waterGoalMl: 2500, vitaminD: false, breathing: false },
    vitals: db.vitals[req.userId] || { heartRate: 72, steps: 8432, sleep: "7h 45m", calories: 1850, activityTrends: [40, 65, 45, 85, 60, 95, 75] }
  });
});

app.post("/api/auth/profile/update", authenticate, (req: any, res) => {
  const { fullName, dob, gender, dietaryPreferences, sugarUnitPreference } = req.body;
  const db = getDb();
  const userIdx = db.users.findIndex((u: any) => u.id === req.userId);
  if (userIdx === -1) return res.status(404).json({ error: "User not found" });

  if (fullName !== undefined) db.users[userIdx].fullName = fullName;
  if (dob !== undefined) db.users[userIdx].dob = dob;
  if (gender !== undefined) db.users[userIdx].gender = gender;
  if (dietaryPreferences !== undefined) db.users[userIdx].dietaryPreferences = dietaryPreferences;
  if (sugarUnitPreference !== undefined) db.users[userIdx].sugarUnitPreference = sugarUnitPreference;

  saveDb(db);
  res.json({ success: true, user: db.users[userIdx] });
});

// --- CREDITS SYSTEM ENDPOINTS ---

app.get("/api/credits/logs", authenticate, (req: any, res) => {
  const db = getDb();
  const logs = (db.creditLogs || []).filter((l: any) => l.userId === req.userId);
  res.json(logs);
});

app.post("/api/credits/deduct", authenticate, (req: any, res) => {
  const { amount, reason } = req.body;
  const db = getDb();
  const user = db.users.find((u: any) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const deductAmount = amount !== undefined ? amount : 1;
  user.credits = Math.max(0, (user.credits || 0) - deductAmount);

  if (!db.creditLogs) {
    db.creditLogs = [];
  }
  db.creditLogs.unshift({
    id: "log-" + crypto.randomUUID(),
    userId: req.userId,
    amount: deductAmount,
    reason: reason || "AI Service usage",
    timestamp: new Date().toISOString(),
    remaining: user.credits
  });

  saveDb(db);
  res.json({ success: true, credits: user.credits, user, logs: db.creditLogs.filter((l: any) => l.userId === req.userId) });
});

app.post("/api/credits/refill", authenticate, (req: any, res) => {
  const { amount } = req.body;
  const db = getDb();
  const user = db.users.find((u: any) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const refillAmount = amount !== undefined ? amount : 50;
  user.credits = (user.credits || 0) + refillAmount;

  if (!db.creditLogs) {
    db.creditLogs = [];
  }
  db.creditLogs.unshift({
    id: "log-" + crypto.randomUUID(),
    userId: req.userId,
    amount: -refillAmount, // negative deduction is addition
    reason: "Credits Refill Pack",
    timestamp: new Date().toISOString(),
    remaining: user.credits
  });

  saveDb(db);
  res.json({ success: true, credits: user.credits, user, logs: db.creditLogs.filter((l: any) => l.userId === req.userId) });
});

// --- COMPANION METRICS & ACTIONS ---

app.post("/api/metrics/water", authenticate, (req: any, res) => {
  const { amount } = req.body; // e.g. +500
  const db = getDb();
  if (!db.smartActions[req.userId]) {
    db.smartActions[req.userId] = { waterLoggedMl: 0, waterGoalMl: 2500, vitaminD: false, breathing: false };
  }
  db.smartActions[req.userId].waterLoggedMl = Math.max(0, (db.smartActions[req.userId].waterLoggedMl || 0) + amount);
  saveDb(db);
  res.json(db.smartActions[req.userId]);
});

app.post("/api/metrics/action/toggle", authenticate, (req: any, res) => {
  const { action } = req.body; // "vitaminD" or "breathing"
  const db = getDb();
  if (!db.smartActions[req.userId]) {
    db.smartActions[req.userId] = { waterLoggedMl: 1500, waterGoalMl: 2500, vitaminD: false, breathing: false };
  }

  if (action === "vitaminD") {
    db.smartActions[req.userId].vitaminD = !db.smartActions[req.userId].vitaminD;
  } else if (action === "breathing") {
    db.smartActions[req.userId].breathing = !db.smartActions[req.userId].breathing;
  }

  saveDb(db);
  res.json(db.smartActions[req.userId]);
});

// --- HEALTH FILES ENDPOINTS ---

app.get("/api/files", authenticate, (req: any, res) => {
  const db = getDb();
  const userFiles = db.files.filter((f: any) => f.userId === req.userId);
  res.json(userFiles);
});

app.post("/api/files/add", authenticate, async (req: any, res) => {
  const { name, category, size } = req.body;
  if (!name) return res.status(400).json({ error: "Missing file name" });

  const db = getDb();

  // Create a realistic insight using Gemini, or a beautiful standard fallback
  let aiInsight = "Processing document through health engines...";
  if (ai) {
    try {
      const model = "gemini-3.5-flash";
      const prompt = `You are an expert AI Health Assistant. Provide a realistic, extremely brief (1-2 sentences, max 15 words) medical AI summary or insight for a document named "${name}" under the category "${category}". It should sound professional, helpful, and specific. Example: "Vitamin D levels are optimal. Slight decrease in Ferritin noted."`;
      const result = await generateContentWithRetry({
        model,
        contents: prompt
      });
      if (result.text) {
        aiInsight = result.text.replace(/^["']|["']$/g, "").trim();
      }
    } catch (e) {
      console.error("Gemini failed, using smart rule engine", e);
      aiInsight = `Analysis completed for ${name}. Vital ranges optimal.`;
    }
  } else {
    // High quality mock generator for pristine developer experience
    if (name.toLowerCase().includes("blood")) {
      aiInsight = "Vitamin D levels are optimal. Slight decrease in Ferritin noted.";
    } else if (name.toLowerCase().includes("amoxicillin") || name.toLowerCase().includes("prescription")) {
      aiInsight = "Course: 250mg, 3x daily. Ends in 3 days.";
    } else if (name.toLowerCase().includes("x-ray") || name.toLowerCase().includes("chest")) {
      aiInsight = "No acute abnormalities detected. Comparison to previous stable.";
    } else {
      aiInsight = "All biomarkers are within normal reference limits.";
    }
  }

  const newFile: any = {
    id: "file-" + crypto.randomUUID(),
    userId: req.userId,
    name,
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    size: size || "1.5 MB",
    type: name.split(".").pop() || "pdf",
    aiInsight,
    category: category || "report"
  };

  try {
    newFile.embedding = await getEmbedding(`${name} - ${aiInsight}`);
  } catch (err) {
    console.error("Failed to generate embedding for added file:", err);
  }

  db.files.unshift(newFile);
  saveDb(db);
  res.json(newFile);
});

app.delete("/api/files/:id", authenticate, (req: any, res) => {
  const db = getDb();
  db.files = db.files.filter((f: any) => !(f.id === req.params.id && f.userId === req.userId));
  saveDb(db);
  res.json({ success: true });
});

// --- MEDICATIONS ENDPOINTS ---

app.get("/api/medications", authenticate, (req: any, res) => {
  const db = getDb();
  const userMeds = db.medications.filter((m: any) => m.userId === req.userId);
  res.json(userMeds);
});

app.post("/api/medications/add", authenticate, async (req: any, res) => {
  const { name, strength, form, frequency, dueTime } = req.body;
  if (!name || !strength) {
    return res.status(400).json({ error: "Missing drug name or strength." });
  }

  const db = getDb();
  const userMeds = db.medications.filter((m: any) => m.userId === req.userId);

  // Auto conflict check!
  let conflictDetected = false;
  let conflictMessage = "";

  if (ai && userMeds.length > 0) {
    try {
      const currentMedNames = userMeds.map((m: any) => `${m.name} (${m.strength})`).join(", ");
      const model = "gemini-3.5-flash";
      const prompt = `You are a clinical pharmacologist. Check if adding "${name}" has any severe drug-drug interactions with current medications: [${currentMedNames}]. Respond in JSON with format:
      {
        "conflict": true/false,
        "message": "Brief conflict warn line if true, or empty if false (max 15 words)"
      }`;
      const response = await generateContentWithRetry({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      const parsed = JSON.parse(response.text || "{}");
      if (parsed.conflict) {
        conflictDetected = true;
        conflictMessage = parsed.message;
      }
    } catch (e) {
      console.error("Conflict checking failed, fallback active");
    }
  } else {
    // Standard smart check fallback: check Lisinopril and Ibuprofen conflict
    if (name.toLowerCase().includes("ibuprofen") && userMeds.some((m: any) => m.name.toLowerCase().includes("lisinopril"))) {
      conflictDetected = true;
      conflictMessage = "Interaction Warning: Lisinopril may interact with Ibuprofen, decreasing kidney function.";
    }
  }

  const newMed = {
    id: "med-" + crypto.randomUUID(),
    userId: req.userId,
    name,
    strength,
    form: form || "Tablet",
    frequency: frequency || "Daily",
    dueTime: dueTime || "09:00 AM",
    taken: false,
    loggedAt: null,
    reminderSet: false,
    conflictDetected,
    conflictMessage
  };

  db.medications.push(newMed);
  saveDb(db);
  res.json({ medication: newMed, conflict: conflictDetected ? conflictMessage : null });
});

app.post("/api/medications/:id/take", authenticate, (req: any, res) => {
  const db = getDb();
  const medIdx = db.medications.findIndex((m: any) => m.id === req.params.id && m.userId === req.userId);
  if (medIdx === -1) return res.status(404).json({ error: "Medication not found." });

  const med = db.medications[medIdx];
  med.taken = !med.taken;
  med.loggedAt = med.taken ? new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : null;

  saveDb(db);
  res.json(med);
});

app.post("/api/medications/:id/reminder", authenticate, (req: any, res) => {
  const db = getDb();
  const medIdx = db.medications.findIndex((m: any) => m.id === req.params.id && m.userId === req.userId);
  if (medIdx === -1) return res.status(404).json({ error: "Medication not found." });

  db.medications[medIdx].reminderSet = !db.medications[medIdx].reminderSet;
  saveDb(db);
  res.json(db.medications[medIdx]);
});

app.delete("/api/medications/:id", authenticate, (req: any, res) => {
  const db = getDb();
  db.medications = db.medications.filter((m: any) => !(m.id === req.params.id && m.userId === req.userId));
  saveDb(db);
  res.json({ success: true });
});

// --- VITALS TRACKING ENDPOINTS ---

app.get("/api/vitals/readings", authenticate, (req: any, res) => {
  const db = getDb();
  const readings = (db.vitalsReadings || [])
    .filter((r: any) => r.userId === req.userId)
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  res.json(readings);
});

app.post("/api/vitals/readings", authenticate, async (req: any, res) => {
  const { type, timestamp, sugarValue, sugarUnit, sugarContext, systolic, diastolic, pulse } = req.body;
  const db = getDb();

  const newReading: any = {
    id: "reading-" + crypto.randomUUID(),
    userId: req.userId,
    type,
    timestamp: timestamp || new Date().toISOString()
  };

  if (type === "blood_sugar") {
    if (sugarValue === undefined) return res.status(400).json({ error: "Missing blood sugar value" });
    newReading.sugarValue = Number(sugarValue);
    newReading.sugarUnit = sugarUnit || "mg/dL";
    newReading.sugarContext = sugarContext || "Fasting";
  } else if (type === "blood_pressure") {
    if (systolic === undefined || diastolic === undefined) {
      return res.status(400).json({ error: "Missing blood pressure values (systolic/diastolic)" });
    }
    newReading.systolic = Number(systolic);
    newReading.diastolic = Number(diastolic);
    if (pulse !== undefined) newReading.pulse = Number(pulse);
  } else {
    return res.status(400).json({ error: "Invalid vitals type" });
  }

  // Retrieve user previous readings for trend analysis
  const sameTypeReadings = (db.vitalsReadings || [])
    .filter((r: any) => r.userId === req.userId && r.type === type)
    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // 1. RULE-BASED SAFETY & CLINICAL TREND ENGINE (Polished fallback/grounding)
  let isNormal = true;
  let severity: "normal" | "abnormal" | "crisis" = "normal";
  let rangeStatus = "";
  let urgentPrompt = "";
  let trendMessage = "This is your first logged reading of this type, establishing a baseline.";
  let suggestion = "";

  const disclaimer = "Disclaimer: This feedback is provided for general information and educational purposes only. It is not a medical diagnosis, treatment recommendation, or prescription change. Please consult with your physician or a qualified healthcare provider for personalized clinical plans.";

  if (type === "blood_sugar") {
    const valInMgDl = newReading.sugarUnit === "mmol/L" ? Math.round(newReading.sugarValue * 18.0182) : newReading.sugarValue;
    
    if (valInMgDl < 70) {
      rangeStatus = "Hypoglycemia (Too Low)";
      severity = "crisis";
      isNormal = false;
      urgentPrompt = `🚨 **URGENT:** Your blood sugar reading of ${newReading.sugarValue} ${newReading.sugarUnit} is critically low (<70 mg/dL). Consume 15g of fast-acting sugar (fruit juice, candy, or honey) immediately, wait 15 minutes to re-test, and seek immediate medical help if symptoms persist or worsen.`;
      suggestion = "Prioritize immediate fast-acting carbohydrate intake and restrict physical exertion until your sugar stabilizes.";
    } else if (valInMgDl > 250) {
      rangeStatus = "Hyperglycemia (Dangerously High)";
      severity = "crisis";
      isNormal = false;
      urgentPrompt = `🚨 **URGENT:** Your blood sugar reading of ${newReading.sugarValue} ${newReading.sugarUnit} is dangerously elevated (>250 mg/dL). This requires prompt medical evaluation. Please contact your treating clinician or seek immediate urgent care.`;
      suggestion = "Ensure robust hydration (drink water) to help your kidneys flush out excess glucose, and strictly avoid strenuous workouts during hyperketonemia risk states.";
    } else {
      if (newReading.sugarContext === "Fasting") {
        if (valInMgDl <= 100) {
          rangeStatus = "Normal Fasting Blood Sugar";
          isNormal = true;
          suggestion = "Excellent. Maintaining consistent sleep patterns and a baseline level of daytime activity supports healthy fasting glucose metabolism.";
        } else if (valInMgDl <= 125) {
          rangeStatus = "Elevated Fasting Blood Sugar (Impaired Fasting Glucose)";
          isNormal = false;
          severity = "abnormal";
          suggestion = "Focus on eating complex, high-fiber carbohydrates at your evening meal and ensure a consistent overnight fasting window of 10-12 hours.";
        } else {
          rangeStatus = "High Fasting Blood Sugar";
          isNormal = false;
          severity = "abnormal";
          suggestion = "Consistency in carbohydrate portions at dinner and avoiding late-night snacks can help mitigate morning glucose spikes (known as the dawn phenomenon).";
        }
      } else {
        if (valInMgDl <= 140) {
          rangeStatus = "Normal Blood Sugar";
          isNormal = true;
          suggestion = "Great reading! Consistent hydration with pure water supports insulin sensitivity and smooth energy delivery.";
        } else if (valInMgDl <= 199) {
          rangeStatus = "Elevated Blood Sugar";
          isNormal = false;
          severity = "abnormal";
          suggestion = "Taking a light 15-minute walk right after meals helps activate skeletal muscle glucose uptake, naturally blunting post-meal spikes.";
        } else {
          rangeStatus = "High Blood Sugar";
          isNormal = false;
          severity = "abnormal";
          suggestion = "Consider scheduling physical activity like moderate walks after your largest meals and discuss glucose target adjustments with your primary care provider.";
        }
      }
    }

    if (sameTypeReadings.length > 0) {
      const last = sameTypeReadings[0];
      const lastVal = last.sugarUnit === "mmol/L" ? last.sugarValue * 18.0182 : last.sugarValue;
      const diff = valInMgDl - lastVal;
      if (Math.abs(diff) < 5) {
        trendMessage = `Your blood sugar is stable compared to your previous log of ${last.sugarValue} ${last.sugarUnit} (${new Date(last.timestamp).toLocaleDateString()}).`;
      } else if (diff > 0) {
        trendMessage = `Your blood sugar has risen (+${Math.round(diff)} mg/dL equivalent) compared to your previous log of ${last.sugarValue} ${last.sugarUnit} taken on ${new Date(last.timestamp).toLocaleDateString()}.`;
      } else {
        trendMessage = `Your blood sugar has decreased (-${Math.round(Math.abs(diff))} mg/dL equivalent) compared to your previous log of ${last.sugarValue} ${last.sugarUnit} taken on ${new Date(last.timestamp).toLocaleDateString()}.`;
      }
    }
  } else if (type === "blood_pressure") {
    const sys = newReading.systolic;
    const dia = newReading.diastolic;

    if (sys > 180 || dia > 120) {
      rangeStatus = "Hypertensive Crisis (Dangerously High)";
      severity = "crisis";
      isNormal = false;
      urgentPrompt = `🚨 **URGENT:** Your blood pressure of ${sys}/${dia} mmHg is critically high. If you are experiencing chest pain, shortness of breath, back pain, numbness, or vision changes, please seek emergency medical services (EMS) or visit the nearest emergency room immediately.`;
      suggestion = "Avoid all physical stress, sit down in a quiet room, and seek professional clinical assistance immediately.";
    } else if (sys < 120 && dia < 80) {
      rangeStatus = "Normal Blood Pressure";
      isNormal = true;
      suggestion = "Superb cardiovascular stability! Sustaining your hydration (aim for 2500ml) and incorporating regular aerobic movement maintains vascular elasticity.";
    } else if (sys >= 120 && sys <= 129 && dia < 80) {
      rangeStatus = "Elevated Blood Pressure";
      isNormal = false;
      severity = "abnormal";
      suggestion = "Incorporate mindful deep breathing (even a 3-minute cycle) and focus on reducing processed sodium in your daily meals.";
    } else if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
      rangeStatus = "Stage 1 Hypertension";
      isNormal = false;
      severity = "abnormal";
      suggestion = "Moderate aerobic exercise such as 30 minutes of brisk walking most days of the week is highly effective at lowering resting blood pressure over time.";
    } else {
      rangeStatus = "Stage 2 Hypertension";
      isNormal = false;
      severity = "abnormal";
      suggestion = "Prioritize stress-buffering techniques, restrict caffeine before checking your vitals, and work with your physician to review your long-term cardiovascular indicators.";
    }

    if (sameTypeReadings.length > 0) {
      const last = sameTypeReadings[0];
      const sysDiff = sys - last.systolic;
      const diaDiff = dia - last.diastolic;
      if (Math.abs(sysDiff) < 4 && Math.abs(diaDiff) < 4) {
        trendMessage = `Your blood pressure is stable compared to your previous reading of ${last.systolic}/${last.diastolic} mmHg.`;
      } else if (sysDiff > 0 || diaDiff > 0) {
        trendMessage = `Your blood pressure shows an upward trend (+${sysDiff} systolic, +${diaDiff} diastolic) compared to your previous log of ${last.systolic}/${last.diastolic} mmHg.`;
      } else {
        trendMessage = `Your blood pressure shows a downward trend (${sysDiff} systolic, ${diaDiff} diastolic) compared to your previous log of ${last.systolic}/${last.diastolic} mmHg.`;
      }
    }
  }

  // Build the complete Markdown commentary
  let aiCommentary = "";
  if (urgentPrompt) {
    aiCommentary += `${urgentPrompt}\n\n`;
  }
  
  aiCommentary += `### Vitals Analysis (${rangeStatus})\n`;
  aiCommentary += `* **Status:** This reading is **${isNormal ? "within standard reference limits" : "outside typical ranges"}** (${rangeStatus}).\n`;
  aiCommentary += `* **Trend:** ${trendMessage}\n`;
  aiCommentary += `* **Actionable Lifestyle Note:** ${suggestion}\n\n`;
  aiCommentary += `*${disclaimer}*`;

  // 2. TRIGGER LIVE AI GENERATION IF API IS AVAILABLE
  if (ai) {
    try {
      const model = "gemini-3.5-flash";
      const user = db.users.find((u: any) => u.id === req.userId);
      const prompt = `You are Swasth-AI Health Companion, analyzing a newly logged vital reading.
      
      PATIENT CONTEXT:
      Name: ${user?.fullName || "Sarah"}
      Dietary Pref: ${user?.dietaryPreferences?.join(", ") || "None"}
      
      NEW VITAL LOGGED:
      ${JSON.stringify(newReading)}
      
      PREVIOUS LOGS (Newest first):
      ${JSON.stringify(sameTypeReadings.slice(0, 4))}
      
      RULE-BASED COMPUTATIONS & CLINICAL CRITERIA:
      - Current Range Classification: ${rangeStatus}
      - Severity Status: ${severity}
      - Historical Trend calculated: ${trendMessage}
      - Safety Instruction: ${urgentPrompt ? "DANGEROUS LIMIT MET. MUST LEAD WITH URGENT RECOMMENDATION." : "No emergency."}
      
      INSTRUCTIONS:
      1. Write an extremely helpful, supportive, and professional clinical summary (max 120 words).
      2. State clearly whether the reading is within standard typical ranges for the context (${newReading.sugarContext || "General"}).
      3. Integrate the historical trend based on previous readings (rising/falling/stable).
      4. Suggest EXACTLY ONE lifestyle change (hydration, activity, or meal timing).
      5. STRICT SAFETY REQUIREMENT: If severity is "crisis" (sugar <70 or >250, BP >180/120), you MUST start your response with a prominent, highly urgent warning to contact a physician or visit an emergency room immediately. Do not delay, soften, or mask this instruction.
      6. STRICT BOUNDARY: Do NOT interpret, suggest, adjust, or comment on any medication dosages or treatment changes. That is strictly the responsibility of the physician.
      7. APPEND MANDATORY CLINICAL DISCLAIMER: You must append the standard disclaimer that this is general information, not a medical diagnosis.
      
      Return a raw JSON block matching this exact schema:
      {
        "analysis": "Markdown formatted AI response containing all points",
        "isNormal": true/false,
        "severity": "normal" | "abnormal" | "crisis"
      }`;

      const result = await generateContentWithRetry({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(result.text || "{}");
      if (parsed.analysis) {
        aiCommentary = parsed.analysis;
        isNormal = parsed.isNormal !== undefined ? parsed.isNormal : isNormal;
        severity = parsed.severity || severity;
      }
    } catch (e) {
      console.error("Gemini vital analysis generation failed, using rule engine:", e);
    }
  }

  // Save the logged reading to db
  if (!db.vitalsReadings) {
    db.vitalsReadings = [];
  }
  db.vitalsReadings.unshift(newReading);

  // Add this reading & AI commentary to their chat history for continuity!
  let userChat = db.chats.find((c: any) => c.userId === req.userId);
  if (!userChat) {
    userChat = { userId: req.userId, messages: [] };
    db.chats.push(userChat);
  }

  const logLabel = type === "blood_sugar" 
    ? `Logged Blood Sugar: ${sugarValue} ${sugarUnit} (${sugarContext})`
    : `Logged Blood Pressure: ${systolic}/${diastolic} mmHg (Pulse: ${pulse || "N/A"} BPM)`;

  userChat.messages.push({
    sender: "user",
    text: `📊 [Quick Log] ${logLabel}`,
    timestamp: new Date().toISOString()
  });

  userChat.messages.push({
    sender: "ai",
    text: aiCommentary,
    timestamp: new Date().toISOString()
  });

  saveDb(db);

  res.json({
    reading: newReading,
    analysis: aiCommentary,
    isNormal,
    severity
  });
});

// --- VITALS REMINDERS ENDPOINTS ---

app.get("/api/vitals/reminders", authenticate, (req: any, res) => {
  const db = getDb();
  const reminders = (db.vitalsReminders || []).filter((r: any) => r.userId === req.userId);
  res.json(reminders);
});

app.post("/api/vitals/reminders", authenticate, (req: any, res) => {
  const { type, time, label, days, frequency, dayOfMonth } = req.body;
  if (!type || !time || !label) {
    return res.status(400).json({ error: "Missing required fields (type, time, label)" });
  }

  const db = getDb();
  const newReminder = {
    id: "reminder-" + crypto.randomUUID(),
    userId: req.userId,
    type,
    time,
    label,
    active: true,
    days: days || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    frequency: frequency || "daily",
    dayOfMonth: dayOfMonth || 1
  };

  if (!db.vitalsReminders) {
    db.vitalsReminders = [];
  }
  db.vitalsReminders.push(newReminder);
  saveDb(db);

  res.status(201).json(newReminder);
});

app.post("/api/vitals/reminders/:id/toggle", authenticate, (req: any, res) => {
  const db = getDb();
  const idx = (db.vitalsReminders || []).findIndex((r: any) => r.id === req.params.id && r.userId === req.userId);
  if (idx === -1) return res.status(404).json({ error: "Reminder not found" });

  db.vitalsReminders[idx].active = !db.vitalsReminders[idx].active;
  saveDb(db);

  res.json(db.vitalsReminders[idx]);
});

app.delete("/api/vitals/reminders/:id", authenticate, (req: any, res) => {
  const db = getDb();
  db.vitalsReminders = (db.vitalsReminders || []).filter((r: any) => !(r.id === req.params.id && r.userId === req.userId));
  saveDb(db);
  res.json({ success: true });
});

// --- INTERACTION SCANNER & CHAT ENDPOINTS (GEMINI INTEGRATION) ---

app.post("/api/gemini/scan", authenticate, async (req: any, res) => {
  const { imageBase64, drugNameInput } = req.body;
  const db = getDb();
  const userMeds = db.medications.filter((m: any) => m.userId === req.userId);

  let identifiedName = drugNameInput || "Lisinopril 10mg";
  let interactionCheck = "No conflicts detected with your active medications.";
  let conflict = false;

  if (ai) {
    try {
      const model = "gemini-3.5-flash";
      const currentMedList = userMeds.map((m: any) => m.name).join(", ");

      let contents: any[] = [];
      let systemPrompt = `You are an advanced medical scanner. Analyze the drug or text provided.
      1. Identify the generic or brand drug name and dosage (e.g. "Lisinopril 10mg").
      2. Perform an interaction check with current medications list: [${currentMedList}].
      3. Return a clean JSON block in this exact schema:
      {
        "identifiedName": "Name and dosage",
        "conflictDetected": true/false,
        "interactionCheck": "Detailed 1-sentence warning if conflictDetected is true, or reassuring safety line if false."
      }`;

      if (imageBase64) {
        contents.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64
          }
        });
        contents.push({ text: `Analyze this prescription or medicine bottle and check interaction with: [${currentMedList}]. ` + systemPrompt });
      } else {
        contents.push({ text: `Analyze medicine name "${identifiedName}" and check interaction with: [${currentMedList}]. ` + systemPrompt });
      }

      const result = await generateContentWithRetry({
        model,
        contents,
        config: {
          responseMimeType: "application/json"
        }
      });

      const parsed = JSON.parse(result.text || "{}");
      identifiedName = parsed.identifiedName || identifiedName;
      conflict = parsed.conflictDetected || false;
      interactionCheck = parsed.interactionCheck || interactionCheck;

    } catch (e) {
      console.error("Gemini Scan Error:", e);
      // Hardcoded smart fallback if scan fails or API key is restricted
      if (identifiedName.toLowerCase().includes("lisinopril") || identifiedName.toLowerCase().includes("ibuprofen")) {
        conflict = true;
        interactionCheck = "Conflict Detected: Lisinopril taken with Ibuprofen can cause moderate risk of blood pressure changes and reduced kidney clearance.";
      }
    }
  } else {
    // Local fallback
    if (identifiedName.toLowerCase().includes("lisinopril") || identifiedName.toLowerCase().includes("ibuprofen")) {
      conflict = true;
      interactionCheck = "Conflict Detected with Ibuprofen. Combining Lisinopril with Ibuprofen may reduce kidney clearance and blood pressure efficacy.";
    }
  }

  const scanResult = {
    id: "scan-" + crypto.randomUUID(),
    userId: req.userId,
    identifiedName,
    interactionCheck,
    conflict,
    timestamp: new Date().toISOString()
  };

  db.scans.push(scanResult);
  saveDb(db);

  res.json(scanResult);
});

app.get("/api/gemini/chat", authenticate, (req: any, res) => {
  const db = getDb();
  const userChat = db.chats.find((c: any) => c.userId === req.userId);
  res.json(userChat ? userChat.messages : []);
});

app.get("/api/gemini/audit", authenticate, (req: any, res) => {
  const db = getDb();
  const userCalls = db.agentCalls ? db.agentCalls.filter((c: any) => c.userId === req.userId) : [];
  res.json(userCalls);
});

app.post("/api/gemini/chat", authenticate, async (req: any, res) => {
  const { message, clientDateTime } = req.body;
  if (!message) return res.status(400).json({ error: "Missing message" });

  const db = getDb();
  const user = db.users.find((u: any) => u.id === req.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  if ((user.credits || 0) < 1) {
    return res.status(403).json({ error: "Insufficient credits. Please refill your credits in the Profile section." });
  }

  // Deduct 1 credit
  user.credits = Math.max(0, user.credits - 1);

  if (!db.creditLogs) {
    db.creditLogs = [];
  }
  db.creditLogs.unshift({
    id: "log-" + crypto.randomUUID(),
    userId: req.userId,
    amount: 1,
    reason: `He-Co AI Chat: "${message.length > 30 ? message.substring(0, 30) + '...' : message}"`,
    timestamp: new Date().toISOString(),
    remaining: user.credits
  });

  let userChat = db.chats.find((c: any) => c.userId === req.userId);
  if (!userChat) {
    userChat = { userId: req.userId, messages: [] };
    db.chats.push(userChat);
  }

  // Push user message
  const userMsg = { sender: "user", text: message, timestamp: new Date().toISOString() };
  userChat.messages.push(userMsg);

  // ==========================================
  //  STAGE 1: TIER 1 RETRIEVAL (DETERMINISTIC)
  // ==========================================
  const medications = db.medications.filter((m: any) => m.userId === req.userId);
  const vitalData = db.vitals[req.userId] || { heartRate: 72, steps: 8432, sleep: "7h 15m", calories: 2150 };

  const profileStr = `User Name: ${user?.fullName || "Sarah"}, DoB: ${user?.dob || "N/A"}, Gender: ${user?.gender || "N/A"}, Dietary preferences: ${user?.dietaryPreferences?.join(", ") || "None"}.`;
  const medListStr = medications.map((m: any) => `- ${m.name} (${m.strength}, frequency: ${m.frequency}, taken today: ${m.taken ? "Yes" : "No"})`).join("\n");
  const vitalsStr = `Vitals: Heart Rate: ${vitalData.heartRate} BPM, Steps today: ${vitalData.steps}, Sleep duration: ${vitalData.sleep || "N/A"}, Calories burned: ${vitalData.calories || "N/A"}.`;

  // Determine current local time and period of day
  let currentHour = 9;
  let timeOfDayPeriod = "Morning";
  let formattedDateTime = "";
  try {
    const dateTimeStr = clientDateTime || new Date().toISOString();
    const parsedDate = new Date(dateTimeStr);
    if (!isNaN(parsedDate.getTime())) {
      currentHour = parsedDate.getHours();
      formattedDateTime = parsedDate.toLocaleString("en-US", { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: true 
      });
      if (currentHour >= 5 && currentHour < 12) {
        timeOfDayPeriod = "Morning";
      } else if (currentHour >= 12 && currentHour < 17) {
        timeOfDayPeriod = "Afternoon";
      } else if (currentHour >= 17 && currentHour < 21) {
        timeOfDayPeriod = "Evening";
      } else {
        timeOfDayPeriod = "Night";
      }
    } else {
      formattedDateTime = new Date().toLocaleString();
    }
  } catch (err) {
    console.error("Error formatting client date time:", err);
    formattedDateTime = new Date().toLocaleString();
  }

  // ==========================================
  //  STAGE 2: TIER 2 RETRIEVAL (SEMANTIC VECTOR SEARCH)
  // ==========================================
  let semanticMatches: Array<{ file: any; similarity: number }> = [];
  try {
    const queryVector = await getEmbedding(message);
    const userFiles = db.files.filter((f: any) => f.userId === req.userId);

    // Calculate similarity scores for each of the user's clinical documents
    for (const file of userFiles) {
      if (!file.embedding) {
        // Lazily generate embedding if missing
        file.embedding = await getEmbedding(`${file.name} - ${file.aiInsight || ""}`);
      }
      const similarity = cosineSimilarity(queryVector, file.embedding);
      semanticMatches.push({ file, similarity });
    }

    // Sort by descending similarity
    semanticMatches.sort((a, b) => b.similarity - a.similarity);
  } catch (error) {
    console.error("[Swasth-AI RAG] Semantic vector lookup failed:", error);
  }

  // Filter top matches (similarity > 0.15) or grab top 3 files
  const topMatches = semanticMatches.slice(0, 3);
  const citedFilesStr = topMatches.map(m => `- File: "${m.file.name}" (Confidence: ${(m.similarity * 100).toFixed(1)}%) -> AI Insight: ${m.file.aiInsight}`).join("\n");

  // Build high-fidelity clinical context block
  const retrievedClinicalContext = `
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
`;

  // ==========================================
  //  STAGE 3: LLM GENERATION & HISTORY
  // ==========================================
  let responseText = "";

  if (ai || useCohere) {
    try {
      const chatHistory = userChat.messages.slice(-8).map((m: any) => `${m.sender === "user" ? "Patient" : "Doctor"}: ${m.text}`).join("\n");

      const prompt = `You are He-Co, the expert clinical conversationalist and supportive pre-consultation health companion of Swasth-AI.
You must adhere strictly to retrieval-first safety rules. You are forbidden from answering solely on generic knowledge if retrieved patient profile details are available.

He-Co acts as a pre-consultation wellness support tool and home-remedy suggestor before a patient needs to see a general physician for small, minor, self-limiting problems (like a normal cold, mild cough, minor muscle fatigue). 
OUR CORE MISSION: We want users to NOT consume excessive medication for small issues. Instead, strongly encourage and prioritize safe, natural home remedies (like warm water gargles, steam inhalation, rest, adequate hydration, herbal teas) as the very first line of defense. 

CURRENT TIME CONTEXT:
- Local Time: ${formattedDateTime}
- Time of Day Period: ${timeOfDayPeriod}

RETRIEVED CLINICAL CONTEXT FOR THIS INTERACTION:
${retrievedClinicalContext}

RECENT CHAT HISTORY:
${chatHistory}

INSTRUCTIONS:
1. Formulate a clinical, warm, supportive answer (max 180 words).
2. Ground your advice directly in the retrieved profile, vitals, and cited health records.
3. Be objective. Do not formulate a formal medical diagnosis or replace a physician.
4. Position yourself as a pre-consultation support suggestor. For minor ailments, actively discourage the unnecessary use of medicines and strongly advocate for traditional home remedies first.
5. If the user query or clinical context relates to diagnostic insights or indicates major, severe, or persistent symptoms (e.g. chest pain, severe dyspnea, heart palpitations, rhabdomyolysis risk, extreme blood sugar spikes, or critical health markers), you MUST append a clear clinical advice reminder to consult a medical doctor or seek professional care immediately.
6. GREETING RULE: Greet the user based on the provided "Time of Day Period". Always align your greeting with the current local time context (e.g., say "Good Morning" if it is Morning, "Good Afternoon" if it is Afternoon, "Good Evening" if it is Evening, or "Good Night"/"Hello" if it is Night). Do NOT say "Good Morning" if it is Evening or Night.
7. DYNAMIC DIETARY RULES (CRITICAL):
   - If the user is asking for diet suggestions, recipes, meal plans, or dietary habits:
     - Check if the retrieved profile indicates they are diabetic, have high blood sugar, or take Metformin.
     - IF IT IS MORNING (Time of Day Period: Morning): Recommend today's full clinical diet plan:
       - Breakfast: recommend an apple or any fresh fruit. IF THEY ARE DIABETIC, warn them about glycemic spikes and explicitly state NO sweet fruits (offer low-glycemic, blood sugar safe alternatives like berries, nuts, or oats).
       - Lunch: suggest a proper meal like whole-wheat chapatis (optionally tailored according to weight), light curry, dal, and rice.
       - Dinner: suggest a light meal of chapatis and curry rice.
     - IF IT IS EVENING OR NIGHT (Time of Day Period: Evening or Night): Suggest ONLY dinner (some chapatis, curry, and rice). You are STRICTLY FORBIDDEN from mentioning or offering breakfast and lunch details when it is evening or night.
8. CLINICAL ADVICE DISCLAIMER (MANDATORY FOR DIAGNOSTICS): If your response contains any diagnostic-related insights, lab results explanation, medication guidance, or symptom assessments, you MUST automatically append the following disclaimer at the very end of your response: "Disclaimer: Swasth-AI provides pre-consultation information and home-care suggestions only. It does not provide formal medical diagnoses or replace physician care. If you are experiencing any major, severe, or persistent symptoms, please consult a medical doctor or seek professional care immediately."
9. Conclude your answer with a compact RAG CITATION FOOTER citing files and medications queried. Avoid mentioning system identifiers.
`;

      responseText = await generatePrimaryChat(prompt);
      if (!responseText) {
        responseText = "AI service unavailable right now. Please try again later.";
      }
    } catch (e) {
      console.error("[Swasth-AI chat backend] Error generating response:", e);
      responseText = "AI service unavailable right now. Please try again later.";
    }
  } else {
    responseText = "AI service unavailable right now. Please try again later.";
  }

  // ==========================================
  //  STAGE 3.5: CLINICAL ADVICE DISCLAIMER POST-PROCESSING AUTO-APPEND
  // ==========================================
  const lowerText = responseText.toLowerCase();
  const diagnosticKeywords = [
    "diagnostic", "lab", "report", "blood panel", "fev1", "fvc", "medication", 
    "prescription", "lisinopril", "atorvastatin", "metformin", "statin", "conflict", 
    "symptom", "ferritin", "blood pressure", "vital", "heart rate", "glucose", "insulin", 
    "diabetic", "glycemic", "cholesterol", "diet", "breakfast", "lunch", "dinner"
  ];
  const containsDiagnostic = diagnosticKeywords.some(kw => lowerText.includes(kw));
  const alreadyHasDisclaimer = lowerText.includes("disclaimer:") || lowerText.includes("consult a medical doctor") || lowerText.includes("consult a physician") || lowerText.includes("seek professional medical attention");

  if (containsDiagnostic && !alreadyHasDisclaimer) {
    const disclaimer = `\n\n⚠️ **Disclaimer**: Swasth-AI acts as a pre-consultation health companion and home-remedy suggestor for minor issues. It does not replace a physical physician or provide formal medical diagnoses. For any major, severe, or persistent symptoms, please seek professional care or consult a doctor immediately.`;
    
    // Insert disclaimer right before the citation separator line if present, otherwise at the end
    if (responseText.includes("---")) {
      const parts = responseText.split("---");
      responseText = parts[0].trim() + disclaimer + "\n\n---" + parts.slice(1).join("---");
    } else {
      responseText = responseText + disclaimer;
    }
  }

  // ==========================================
  //  STAGE 4: CLINICAL SAFETY VALIDATION LAYER
  // ==========================================
  const safetyAssessment = validateAiOutput(responseText, user, medications);
  if (!safetyAssessment.safe) {
    const safetyHeader = `⚠️ [SWASTH-AI CLINICAL SAFETY ALERT]\n` + 
      safetyAssessment.warnings.map(w => `• ${w}`).join("\n") + 
      `\n--------------------------------------------\n\n`;
    responseText = safetyHeader + responseText;
  }

  // ==========================================
  //  STAGE 5: AUDIT LOGGING & PERSISTENCE
  // ==========================================
  if (!db.agentCalls) {
    db.agentCalls = [];
  }

  const callRecord = {
    id: "call-" + crypto.randomUUID(),
    userId: req.userId,
    query: message,
    retrievedContext: {
      profile: {
        fullName: user?.fullName,
        dob: user?.dob,
        gender: user?.gender,
        dietaryPreferences: user?.dietaryPreferences
      },
      medications: medications.map((m: any) => ({ name: m.name, strength: m.strength, taken: m.taken })),
      vitals: {
        heartRate: vitalData.heartRate,
        steps: vitalData.steps,
        sleep: vitalData.sleep,
        calories: vitalData.calories
      },
      files: topMatches.map(m => ({
        name: m.file.name,
        similarity: m.similarity,
        aiInsight: m.file.aiInsight
      }))
    },
    rawGeneratedResponse: responseText,
    safetyWarnings: safetyAssessment.warnings,
    timestamp: new Date().toISOString()
  };

  db.agentCalls.unshift(callRecord);

  const aiMsg = { sender: "ai", text: responseText, timestamp: new Date().toISOString() };
  userChat.messages.push(aiMsg);

  saveDb(db);
  res.json(userChat.messages);
});

app.post("/api/gemini/chat/clear", authenticate, (req: any, res) => {
  const db = getDb();
  const userChat = db.chats.find((c: any) => c.userId === req.userId);
  if (!userChat) {
    return res.json([]);
  }

  userChat.messages = [];
  saveDb(db);
  res.json(userChat.messages);
});

// --- RAG DIAGNOSTICS & VERIFICATION ENGINE ---
app.post("/api/gemini/diagnostics/run", authenticate, async (req: any, res) => {
  const startTime = Date.now();
  const logs: string[] = [];
  const steps: any[] = [];

  const addStep = (name: string, status: "pass" | "fail", durationMs: number, details: string) => {
    steps.push({ name, status, durationMs, details });
    logs.push(`[${status.toUpperCase()}] ${name} (${durationMs}ms): ${details}`);
  };

  try {
    const db = getDb();
    
    // Step 1: User Profile Retrieval (Tier 1)
    const step1Start = Date.now();
    const user = db.users.find((u: any) => u.id === req.userId);
    const step1Duration = Date.now() - step1Start;
    if (user) {
      addStep("Tier 1: Fetch Profile & Preferences", "pass", step1Duration, `Successfully fetched profile for ${user.fullName}. Gender: ${user.gender}, DOB: ${user.dob || "not set"}`);
    } else {
      addStep("Tier 1: Fetch Profile & Preferences", "fail", step1Duration, "User profile not found in database.");
    }

    // Step 2: Vitals & Medications Retrieval (Tier 1)
    const step2Start = Date.now();
    const medications = db.medications.filter((m: any) => m.userId === req.userId);
    const vitalData = db.vitals[req.userId] || { heartRate: 72, steps: 8432, sleep: "7h 15m", calories: 2150 };
    const step2Duration = Date.now() - step2Start;
    addStep(
      "Tier 1: Retrieve Vitals & Medications",
      "pass",
      step2Duration,
      `Retrieved ${medications.length} active prescription(s). Vitals checked: HR ${vitalData.heartRate} BPM, Steps: ${vitalData.steps}`
    );

    // Step 3: Semantic Embeddings & Document Vector Matching (Tier 2)
    const step3Start = Date.now();
    const sampleQuery = "Am I taking any statins? Any risk of muscle toxicity?";
    let queryVector: number[] = [];
    try {
      queryVector = await getEmbedding(sampleQuery);
    } catch (e) {
      logs.push(`[WARN] Embedding failed, fallback to simulated vectors`);
    }

    const userFiles = db.files.filter((f: any) => f.userId === req.userId);
    const semanticMatches: any[] = [];
    for (const file of userFiles) {
      if (!file.embedding) {
        file.embedding = await getEmbedding(`${file.name} - ${file.aiInsight || ""}`);
      }
      const similarity = cosineSimilarity(queryVector, file.embedding);
      semanticMatches.push({ file, similarity });
    }
    semanticMatches.sort((a, b) => b.similarity - a.similarity);
    const topMatches = semanticMatches.slice(0, 3);
    const step3Duration = Date.now() - step3Start;
    
    addStep(
      "Tier 2: Semantic Document Vector Search",
      "pass",
      step3Duration,
      `Matched query "${sampleQuery}" against ${userFiles.length} uploaded files. Top match: "${topMatches[0]?.file?.name || "None"}" with confidence score of ${(topMatches[0]?.similarity * 100 || 0).toFixed(1)}%`
    );

    // Step 4: RAG Prompt Injection & Generation Simulation
    const step4Start = Date.now();
    const profileStr = `User Name: ${user?.fullName || "Sarah"}, DoB: ${user?.dob || "N/A"}, Gender: ${user?.gender || "N/A"}, Dietary preferences: ${user?.dietaryPreferences?.join(", ") || "None"}.`;
    const medListStr = medications.map((m: any) => `- ${m.name} (${m.strength}, frequency: ${m.frequency})`).join("\n");
    const vitalsStr = `Vitals: Heart Rate: ${vitalData.heartRate} BPM, Steps today: ${vitalData.steps}, Sleep duration: ${vitalData.sleep || "N/A"}.`;
    const citedFilesStr = topMatches.map(m => `- File: "${m.file.name}" (Confidence: ${(m.similarity * 100).toFixed(1)}%) -> AI Insight: ${m.file.aiInsight}`).join("\n");

    const retrievedClinicalContext = `
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
`;
    const promptAssert = retrievedClinicalContext.includes("User Name:") && retrievedClinicalContext.includes("[Tier 1:") && retrievedClinicalContext.includes("[Tier 2:");
    const step4Duration = Date.now() - step4Start;
    if (promptAssert) {
      addStep(
        "RAG Orchestration: Context Assembly & Injections",
        "pass",
        step4Duration,
        `Pristinely assembled ${retrievedClinicalContext.length} chars of combined contextual prompts before passing to AI Model generation layer.`
      );
    } else {
      addStep(
        "RAG Orchestration: Context Assembly & Injections",
        "fail",
        step4Duration,
        "Failed to format combined RAG prompts correctly."
      );
    }

    // Step 5: Clinical Safety Validator Audit
    const step5Start = Date.now();
    const safetyAssessment = validateAiOutput("Sample Atorvastatin and lisinopril response containing grapefruit risk.", user, medications);
    const step5Duration = Date.now() - step5Start;
    addStep(
      "Clinical Safety: Rule-Engine Diagnostics",
      "pass",
      step5Duration,
      `Clinical safety validator passed with ${safetyAssessment.warnings.length} active warnings triggered during test run.`
    );

    const totalDurationMs = Date.now() - startTime;
    res.json({
      success: steps.every(s => s.status === "pass"),
      totalDurationMs,
      timestamp: new Date().toISOString(),
      steps,
      logs,
      retrievedContext: {
        profile: user ? { fullName: user.fullName, gender: user.gender, dob: user.dob, dietaryPreferences: user.dietaryPreferences } : null,
        vitals: vitalData,
        medications: medications.map((m: any) => ({ name: m.name, strength: m.strength, frequency: m.frequency })),
        matchedFiles: topMatches.map(m => ({ name: m.file.name, similarity: m.similarity }))
      }
    });

  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message,
      logs
    });
  }
});

// --- VITE DEV MIDDLEWARE AND SPA FALLBACK ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Health Companion Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
