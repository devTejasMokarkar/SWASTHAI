# SwasthAI — AI-Powered Health Companion

**SwasthAI** (Swasth AI) is a full-stack, AI-driven pre-consultation health assistant and wellness companion. It helps users track vital health metrics, manage medications, scan and analyse health documents, perform AI-powered drug interaction checks, receive personalised diet recommendations, and converse with an intelligent health companion ("He-Co"). Built on Google AI Studio infrastructure, it leverages server-side Gemini API capabilities alongside Cohere for production-grade chat responses.

> **App URL (AI Studio):** <https://ai.studio/apps/f4db37c5-3831-4ca8-b3c8-4fa172ed2bca>

---

## Table of Contents

1. [Features](#1-features)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Getting Started](#4-getting-started)
5. [Environment Variables](#5-environment-variables)
6. [API Reference](#6-api-reference)
7. [Database Schema](#7-database-schema)
8. [Architecture Overview](#8-architecture-overview)
9. [AI & RAG Pipeline](#9-ai--rag-pipeline)
10. [Clinical Safety](#10-clinical-safety)
11. [Build & Deployment](#11-build--deployment)
12. [Security Notes](#12-security-notes)

---

## 1. Features

### 1.1 Dashboard / Today View
- **Time-aware greeting** — dynamically adjusts (Good Morning / Afternoon / Evening / Night) based on the client's local time.
- **Real-time clock & date** display.
- **AI Diet Recommendation** — context-aware suggestions based on time of day (breakfast + lunch vs. dinner only) with diabetic protocol awareness.
- **Smart Actions panel:**
  - Water intake logger (goal-based with progress bar + confetti celebration on completion).
  - Vitamin D supplement toggle.
  - 3-minute breathing exercise toggle.
- **Vitals snapshot cards** — Heart Rate, Steps, Sleep, Calories.
- **Quick-log modal** for steps, heart rate, and calories.
- **Full Dietary Report modal.**

### 1.2 AI Chat Companion ("He-Co")
- Floating chat overlay with a slide-out panel.
- Suggested queries: drug conflicts, lab results, diet advice.
- **RAG (Retrieval-Augmented Generation)** with two-tier context injection:
  - **Tier 1:** Deterministic profile + vitals + medications.
  - **Tier 2:** Semantic vector search over user health files via cosine similarity on Gemini embeddings (768-dim).
- Time-of-day-aware dietary rule engine (e.g., no breakfast suggestions at night).
- Credit-based usage: 1 credit per chat message.
- Clinical safety validation layer that checks for grapefruit–statin interactions, NSAID–ACE inhibitor conflicts, glycemic warnings, and major symptom alerts.
- Automatic medical disclaimer appending for diagnostic content.
- Full audit logging of all agent calls with context, response, and safety warnings.
- **Debug Mode:** shows raw RAG prompt context (Tier 1 + Tier 2) directly in the chat panel.

### 1.3 Medications Module
- List active medications with taken / untaken status.
- Add new medications with automatic AI conflict detection (Gemini-based or rule-based fallback).
- Toggle taken / untaken status and set reminders.
- **AI Interaction Scanner:** simulated camera viewfinder with preset scan buttons (Lisinopril, Ibuprofen) or manual text input; identifies the drug via Gemini and checks for interactions.
- Hydration synergy analysis modal.

### 1.4 Health Files Module
- Upload (mock) health documents — reports and prescriptions.
- AI-generated insights for each file (Gemini or rule-based fallback).
- Search and filter by category: All / Report / Prescription.
- Delete files.

### 1.5 Vitals Tracking
- **Log readings:**
  - Blood Sugar — with context (Fasting / Post-meal / Random / Bedtime) and unit toggle (mg/dL ↔ mmol/L).
  - Blood Pressure — systolic, diastolic, pulse.
  - Temperature, SpO₂.
- **AI-powered analysis** — rule-based clinical classification (Normal / Abnormal / Crisis) with optional Gemini enhancement.
- **Historical charts** (Recharts):
  - Blood Glucose trend line.
  - Blood Pressure dual-line (systolic + diastolic).
- **Time window filter:** 7 days / 30 days / 90 days.
- **Export to CSV.**
- **Vitals Calendar** view with daily markers.
- **Raw clinical logs table.**
- **Vitals Reminders** — create daily, weekly, or monthly reminders for blood sugar or BP checks.

### 1.6 Profile & Settings
- **2-step onboarding:** Name, DOB, Gender, Dietary Preferences → Weight, Height, Health Goals.
- **Credit Management:** view balance, refill (50 or 100 credits), transaction log history.
- **Debug Mode toggle** — enable raw RAG prompt visibility in chat.
- **Export Health Data Report** (JSON download).
- **Privacy-first** information card.

### 1.7 RAG Diagnostics Suite
- Built-in diagnostic endpoint (`POST /api/gemini/diagnostics/run`) that systematically tests:
  - Tier 1 deterministic retrieval.
  - Tier 2 semantic vector search.
  - RAG prompt assembly.
  - Clinical safety validator.
- Results presented in a step-by-step audit panel with timing.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript 5.8, JSX (`react-jsx`) |
| **Build Tool** | Vite 6 |
| **Styling** | Tailwind CSS 4.1 (via `@tailwindcss/vite`) + custom CSS variables |
| **Animation** | Motion 12 |
| **Icons** | Lucide React 0.546 |
| **Charts** | Recharts 3.9 |
| **Confetti** | Canvas Confetti 1.9 |
| **Backend** | Express 4.21 (Node.js) |
| **Server Runtime** | tsx 4.21 (dev), esbuild 0.25 (production build) |
| **Database** | JSON file-based (`data/db.json`) |
| **AI — Primary Chat** | Cohere API (`command-r-plus-08-2024`) |
| **AI — Fallback / Analysis** | Google Gemini 2.0 Flash (`@google/genai` v2.4) |
| **Embeddings** | Gemini Embedding 2 Preview (768-dim) with mock vector fallback |

### Key Dependencies

```json
{
  "dependencies": {
    "@google/genai": "^2.4.0",
    "@tailwindcss/vite": "^4.1.14",
    "@vitejs/plugin-react": "^5.0.4",
    "canvas-confetti": "^1.9.4",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "recharts": "^3.9.2"
  },
  "devDependencies": {
    "@types/canvas-confetti": "^1.9.0",
    "@types/express": "^4.17.21",
    "@types/node": "^22.14.0",
    "@types/react": "^19.2.17",
    "@types/react-dom": "^19.2.3",
    "autoprefixer": "^10.4.21",
    "esbuild": "^0.25.0",
    "tailwindcss": "^4.1.14",
    "tsx": "^4.21.0",
    "typescript": "~5.8.2",
    "vite": "^6.2.3"
  }
}
```

---

## 3. Project Structure

```
SwasthAI/
├── assets/
│   └── .aistudio/
│       └── .gitignore
├── data/
│   └── db.json                  # JSON file database (all users, meds, files, chats, etc.)
├── dist/                        # Production build output
├── node_modules/
├── src/
│   ├── components/
│   │   ├── AIChat.tsx           # AI chat overlay with RAG audit panel (1307 lines)
│   │   ├── Dashboard.tsx        # Home/today view with vitals, actions, diet (708 lines)
│   │   ├── ErrorBoundary.tsx    # React error boundary fallback UI
│   │   ├── HealthFiles.tsx      # Documents, vitals charts, calendar, reminders
│   │   ├── Medications.tsx      # Medication list, scanner, add med (602 lines)
│   │   ├── ProfileSetup.tsx     # Onboarding, credits, debug toggle (488 lines)
│   │   ├── SkeletonCard.tsx     # Loading skeleton component
│   │   └── VitalsLogModal.tsx   # Modal for logging vitals readings (187 lines)
│   ├── App.tsx                  # Main app with auth, routing, state management (937 lines)
│   ├── index.css                # Tailwind CSS + custom theme + scrollbar styling
│   ├── main.tsx                 # React entry point
│   └── types.ts                 # TypeScript interfaces (User, SmartActions, Vitals, etc.)
├── .env.example                 # Environment variable template
├── .env.local                   # Local env (API keys)
├── .gitignore
├── index.html                   # HTML entry point
├── metadata.json                # AI Studio metadata (capabilities, permissions)
├── package.json
├── README.md
├── server.ts                    # Express backend with all API routes (1834 lines)
├── tsconfig.json
└── vite.config.ts               # Vite configuration
```

---

## 4. Getting Started

### Prerequisites
- **Node.js** (v18+ recommended)

### Setup

```bash
# 1. Clone and install
npm install

# 2. Configure environment variables (see Section 5)
# Edit .env.local with your API keys

# 3. Start development server (backend + Vite middleware)
npm run dev

# 4. Open in browser
# http://localhost:3000 (default Express port)
```

### Demo Account
A pre-seeded demo account is available:
- **Email:** `sarah@companion.com`
- **Password:** `password123`

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (Express + Vite HMR) |
| `npm run build` | Production build (Vite frontend + esbuild server bundle) |
| `npm start` | Run production server from `dist/server.cjs` |
| `npm run clean` | Delete `dist/` directory |
| `npm run lint` | TypeScript type-checking (`tsc --noEmit`) |

---

## 5. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Recommended | Google Gemini AI API key for chat fallback, file insights, conflict detection, embeddings |
| `COHERE_API_KEY` | Recommended | Cohere API key — primary chat generation backend |
| `APP_URL` | No (auto-injected by AI Studio) | The URL where the applet is hosted |

Additional runtime variables used internally:
- `NODE_ENV` — switches between Vite dev middleware and static file serving.
- `DISABLE_HMR` — disables Vite HMR and file watching (used in AI Studio agent editing).

---

## 6. API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Register new user (`fullName`, `email`, `password`) |
| `POST` | `/api/auth/login` | — | Login (`email`, `password`) — returns bearer token |
| `GET` | `/api/auth/profile` | Bearer | Get user profile, smart actions, and vitals |
| `POST` | `/api/auth/profile/update` | Bearer | Update profile fields |

### Credits

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/credits/logs` | Bearer | Get credit transaction history |
| `POST` | `/api/credits/deduct` | Bearer | Deduct credits (default: 1) |
| `POST` | `/api/credits/refill` | Bearer | Refill credits (default: 50) |

### Smart Actions / Metrics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/metrics/water` | Bearer | Log water consumption (`amount` in ml) |
| `POST` | `/api/metrics/action/toggle` | Bearer | Toggle `vitaminD` or `breathing` action |

### Health Files

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/files` | Bearer | List user's health files |
| `POST` | `/api/files/add` | Bearer | Add file (with AI insight generation) |
| `DELETE` | `/api/files/:id` | Bearer | Delete a file |

### Medications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/medications` | Bearer | List user's medications |
| `POST` | `/api/medications/add` | Bearer | Add medication (with AI conflict check) |
| `POST` | `/api/medications/:id/take` | Bearer | Toggle taken / untaken status |
| `POST` | `/api/medications/:id/reminder` | Bearer | Toggle reminder on/off |
| `DELETE` | `/api/medications/:id` | Bearer | Delete medication |

### Vitals

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/vitals/readings` | Bearer | List vitals readings (sorted newest first) |
| `POST` | `/api/vitals/readings` | Bearer | Log a new reading (with AI analysis + trend engine) |
| `GET` | `/api/vitals/reminders` | Bearer | List vitals reminders |
| `POST` | `/api/vitals/reminders` | Bearer | Create a reminder |
| `POST` | `/api/vitals/reminders/:id/toggle` | Bearer | Toggle reminder active/inactive |
| `DELETE` | `/api/vitals/reminders/:id` | Bearer | Delete reminder |

### AI / Gemini / Chat

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/gemini/chat` | Bearer | Send message to AI chat (RAG-enhanced, credit deducted) |
| `GET` | `/api/gemini/chat` | Bearer | Get chat history |
| `POST` | `/api/gemini/chat/clear` | Bearer | Clear chat history |
| `GET` | `/api/gemini/audit` | Bearer | Get audit logs of AI calls |
| `POST` | `/api/gemini/scan` | Bearer | Scan drug for interactions (text name or base64 image) |
| `POST` | `/api/gemini/diagnostics/run` | Bearer | Run full RAG diagnostics suite |

---

## 7. Database Schema

The application uses a **single JSON file** (`data/db.json`) as its persistence layer. Below is the schema for each collection:

### `users[]`
```ts
{
  id: string;
  email: string;
  passwordHash: string;          // SHA-256 hashed
  fullName: string;
  dob: string;
  gender: string;
  dietaryPreferences: string[];
  credits: number;
  vitalityScoreUp: number;
  sleepRecovery: string;
}
```

### `smartActions{}` (keyed by userId)
```ts
{
  waterLoggedMl: number;
  waterGoalMl: number;
  vitaminD: boolean;
  breathing: boolean;
}
```

### `vitals{}` (keyed by userId)
```ts
{
  heartRate: number;
  steps: number;
  sleep: string;
  calories: number;
  activityTrends: number[];
}
```

### `files[]`
```ts
{
  id: string;
  userId: string;
  name: string;
  date: string;
  size: string;
  type: string;
  aiInsight: string;
  category: "report" | "prescription";
  embedding?: number[];           // 768-dim vector for semantic search
}
```

### `medications[]`
```ts
{
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
  conflictDetected?: boolean;
  conflictMessage?: string;
}
```

### `scans[]`
```ts
{
  id: string;
  userId: string;
  identifiedName: string;        // Drug name identified via AI scan
  interactionCheck: string;      // AI-generated analysis
  conflict: boolean;
  timestamp: string;
}
```

### `chats[]`
```ts
{
  userId: string;
  messages: Array<{
    sender: "user" | "ai";
    text: string;
    timestamp: string;
  }>;
}
```

### `vitalsReadings[]`
```ts
{
  id: string;
  userId: string;
  type: "blood_sugar" | "blood_pressure";
  timestamp: string;
  sugarValue?: number;
  sugarUnit?: "mg/dL" | "mmol/L";
  sugarContext?: "Fasting" | "Post-meal" | "Random" | "Bedtime";
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  severity?: string;              // "normal" | "abnormal" | "crisis"
  rangeStatus?: string;           // AI-generated status description
}
```

### `vitalsReminders[]`
```ts
{
  id: string;
  userId: string;
  type: "blood_sugar" | "blood_pressure";
  time: string;                   // e.g. "07:00 AM"
  label: string;                  // e.g. "fasting sugar"
  active: boolean;
  days: string[];                 // e.g. ["Mon", "Tue", ...]
  frequency?: string;             // "daily" | "weekly" | "monthly"
  dayOfMonth?: number;
}
```

### `creditLogs[]`
```ts
{
  id: string;
  userId: string;
  amount: number;
  reason: string;                 // e.g. "chat", "refill", "diagnostics"
  timestamp: string;
  remaining: number;
}
```

### `agentCalls[]` (Audit log)
```ts
{
  id: string;
  userId: string;
  query: string;
  retrievedContext: {
    profile: object;
    medications: object[];
    vitals: object;
    files: object[];
  };
  rawGeneratedResponse: string;
  safetyWarnings: string[];
  timestamp: string;
}
```

---

## 8. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser (React SPA)               │
│  ┌───────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Dashboard  │ │ AIChat   │ │ Medications      │   │
│  │ Today View │ │ "He-Co"  │ │ Scanner          │   │
│  ├───────────┤ ├──────────┤ ├──────────────────┤   │
│  │ Health     │ │ Vitals   │ │ Profile /        │   │
│  │ Files      │ │ Tracking │ │ Settings         │   │
│  └───────────┘ └──────────┘ └──────────────────┘   │
│                        │                             │
└────────────────────────┼─────────────────────────────┘
                         │ HTTP / JSON
                         ▼
┌─────────────────────────────────────────────────────┐
│              Express Server (server.ts)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Auth     │ │ CRUD     │ │ AI Orchestrator   │   │
│  │ Routes   │ │ Routes   │ │ (Cohere / Gemini)  │   │
│  ├──────────┤ ├──────────┤ ├──────────────────┤   │
│  │ Vitals   │ │ Files    │ │ RAG Engine         │   │
│  │ Engine   │ │ Manager  │ │ (Tier 1 + Tier 2)  │   │
│  └──────────┘ └──────────┘ └──────────────────┘   │
│                        │                             │
└────────────────────────┼─────────────────────────────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
       ┌─────────────┐   ┌──────────────────┐
       │ data/db.json │   │   Cohere API     │
       │ (JSON File)  │   │   Gemini API     │
       └─────────────┘   └──────────────────┘
```

### Key Architectural Decisions

1. **Monolithic Express server** — the same server serves both the SPA (via Vite dev middleware in development, or static files in production) and all API routes.
2. **JSON file persistence** — simple `fs.readFileSync` / `writeFileSync` operations against `data/db.json`. Data is loaded into memory on each request. No real database engine is required.
3. **Two AI providers** — Cohere (`command-r-plus-08-2024`) is the primary chat backend. Google Gemini 2.0 Flash serves as fallback for chat and as the primary engine for file insights, medication conflict detection, vital analysis, and drug scan identification.
4. **Two-tier RAG** — deterministic retrieval (Tier 1) is always injected into the prompt. Semantic vector search (Tier 2) enriches the context when relevant health file embeddings match the user's query via cosine similarity.
5. **Credit economy** — every AI chat message costs 1 credit. Credits can be refilled from the Profile page. Diagnostic runs also consume credits.
6. **No real file uploads** — file records are created by name only. AI insights are generated from the file name and category alone.

---

## 9. AI & RAG Pipeline

### 9.1 Chat Flow (`POST /api/gemini/chat`)

```
User Message
     │
     ▼
┌─────────────────────────────────┐
│ 1. Credit Check & Deduction     │
│    (1 credit per message)        │
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ 2. Tier 1 — Deterministic       │
│    Context Assembly              │
│    ├─ User Profile (name, age)   │
│    ├─ Vitals Snapshot            │
│    ├─ Medications (active list)  │
│    └─ Dietary Preferences        │
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ 3. Tier 2 — Semantic Search     │
│    ├─ Embed user query via Gemini│
│    ├─ Cosine similarity vs       │
│    │   health file embeddings     │
│    └─ Top-3 relevant files       │
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ 4. Prompt Assembly               │
│    ├─ System role + constraints   │
│    ├─ Dietary time-of-day rules   │
│    ├─ Tier 1 context              │
│    ├─ Tier 2 context              │
│    └─ User message                │
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ 5. Generation                    │
│    ├─ Primary: Cohere API        │
│    └─ Fallback: Gemini 2.0 Flash │
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ 6. Clinical Safety Validation    │
│    ├─ Grapefruit-statin check    │
│    ├─ NSAID-ACE inhibitor check  │
│    ├─ Glycemic warnings          │
│    ├─ Major symptom alerts       │
│    └─ Disclaimer appending       │
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│ 7. Audit Logging                 │
│    ├─ Full context snapshot      │
│    ├─ Raw response               │
│    ├─ Safety warnings            │
│    └─ Timestamp                  │
└─────────────────────────────────┘
     │
     ▼
   Response → Client
```

### 9.2 Safety Validator Rules (`validateAiOutput`)

The clinical safety validator (`server.ts`) performs the following checks on every AI-generated response before it reaches the user:

| Check | Pattern | Action |
|---|---|---|
| **Grapefruit–Statin interaction** | Mentions grapefruit while statin is in medication list | Warning appended |
| **NSAID–ACE inhibitor conflict** | NSAID (ibuprofen, naproxen, aspirin) + ACE inhibitor in medications | Warning appended |
| **Glycemic warnings** | Blood sugar > 300 mg/dL or < 54 mg/dL | Urgent care recommendation |
| **Major symptom alerts** | Mentions "chest pain", "shortness of breath", "severe headache", "vision changes" | Emergency disclaimer |
| **Diagnostic disclaimer** | Response contains diagnostic-sounding language | "Consult a qualified healthcare professional" appended |

### 9.3 RAG Diagnostics Suite

The diagnostics endpoint (`POST /api/gemini/diagnostics/run`) systematically tests each component:

1. **Tier 1 Retrieval** — verifies that profile, vitals, and medications are correctly fetched.
2. **Tier 2 Semantic Search** — tests embedding generation and cosine similarity against file vectors.
3. **RAG Prompt Assembly** — validates that the full prompt structure is correctly constructed.
4. **Safety Validator** — runs test cases against the validation rules.

Results are returned with per-step timing and pass/fail status.

---

## 10. Clinical Safety

SwasthAI implements multiple layers of clinical safety:

### 10.1 Server-Side Validation
- Rule-based pattern matching on AI responses for known drug interactions and emergency symptoms.
- Automatic medical disclaimer injection for any content that could be interpreted as diagnostic.

### 10.2 Client-Side Validation (`AIChat.tsx`)
- `runClientClinicalSafetyValidator()` provides a secondary safety layer in the browser.
- Runs independently of the server-side validator.

### 10.3 Dietary Time-of-Day Restrictions
- Breakfast and lunch suggestions are suppressed after 5 PM local time.
- No food recommendations after 9 PM.
- Diabetic protocol constraints are always active.

### 10.4 Disclaimer
All AI-generated health information includes the disclaimer: *"I'm an AI assistant and not a doctor. Please consult a qualified healthcare professional for medical advice."* when diagnostic content is detected.

---

## 11. Build & Deployment

### Development
```bash
npm run dev
# Starts Express server with Vite middleware on port 3000
# Hot Module Replacement (HMR) enabled
```

### Production Build
```bash
npm run build
# 1. Vite builds the React frontend into dist/static/
# 2. esbuild bundles server.ts into dist/server.cjs
```

### Production Start
```bash
npm start
# Runs the compiled server from dist/server.cjs
# Serves static files from dist/static/
```

### AI Studio Deployment
The app is designed to run as an **AI Studio applet**. The `metadata.json` declares:
- Camera frame permissions (for the drug scanner UI).
- Server-side Gemini API capability.

AI Studio automatically injects `GEMINI_API_KEY` and `APP_URL` at runtime from user-configured secrets.

---

## 12. Security Notes

> **⚠️ Important:** This application is designed as a **demonstration / prototype** and has several security considerations:

| Area | Current Implementation | Recommendation for Production |
|---|---|---|
| **Password Hashing** | SHA-256 | Use bcrypt or argon2 |
| **Authentication** | User ID stored in `localStorage` | Use JWT with expiry + HttpOnly cookies |
| **Authorization** | Token = user ID (no signature) | Implement proper JWT verification |
| **CORS** | Wide open (`*`) | Restrict to specific origins |
| **Rate Limiting** | None | Implement `express-rate-limit` |
| **Input Sanitization** | Minimal | Add Helmet, input validation, XSS protection |
| **Database** | Plain JSON file | Migrate to PostgreSQL / SQLite with proper access controls |
| **HTTPS** | Not enforced | Enforce HTTPS in production |
| **API Keys** | In `.env.local` | Use secrets manager / environment-specific vault |

---

## TypeScript Interfaces

All data models are defined in `src/types.ts`:

```ts
interface User {
  id: string;
  email: string;
  fullName: string;
  dob: string;
  gender: string;
  dietaryPreferences: string[];
  credits: number;
  vitalityScoreUp: number;
  sleepRecovery: string;
}

interface SmartActions {
  waterLoggedMl: number;
  waterGoalMl: number;
  vitaminD: boolean;
  breathing: boolean;
}

interface Vitals {
  heartRate: number;
  steps: number;
  sleep: string;
  calories: number;
  activityTrends: number[];
}

interface VitalReading {
  id: string;
  userId: string;
  type: "blood_sugar" | "blood_pressure";
  timestamp: string;
  sugarValue?: number;
  sugarUnit?: "mg/dL" | "mmol/L";
  sugarContext?: "Fasting" | "Post-meal" | "Random" | "Bedtime";
  systolic?: number;
  diastolic?: number;
  pulse?: number;
}

interface VitalReminder {
  id: string;
  userId: string;
  type: "blood_sugar" | "blood_pressure";
  time: string;
  label: string;
  active: boolean;
  days: string[];
}

interface FileRecord {
  id: string;
  userId: string;
  name: string;
  date: string;
  size: string;
  type: string;
  aiInsight: string;
  category: "report" | "prescription";
}

interface Medication {
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
  conflictDetected?: boolean;
  conflictMessage?: string;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

interface ScanResult {
  id: string;
  userId: string;
  identifiedName: string;
  interactionCheck: string;
  conflict: boolean;
  timestamp: string;
}
```

---

## Component Map

| Component | File | Purpose |
|---|---|---|
| `App.tsx` | `src/App.tsx` | Root component: routing, auth state, theme toggle, global layout (937 lines) |
| `Dashboard.tsx` | `src/components/Dashboard.tsx` | Today view: vitals cards, smart actions, diet recommendation, clock (708 lines) |
| `AIChat.tsx` | `src/components/AIChat.tsx` | Floating AI chat with RAG, audit panel, safety validator (1307 lines) |
| `Medications.tsx` | `src/components/Medications.tsx` | Medication list, AI scanner, add/edit meds (602 lines) |
| `HealthFiles.tsx` | `src/components/HealthFiles.tsx` | Files, vitals charts, calendar, reminders |
| `ProfileSetup.tsx` | `src/components/ProfileSetup.tsx` | Onboarding, credits, debug toggle, data export (488 lines) |
| `VitalsLogModal.tsx` | `src/components/VitalsLogModal.tsx` | Modal form for logging vitals readings (187 lines) |
| `SkeletonCard.tsx` | `src/components/SkeletonCard.tsx` | Loading placeholder component |
| `ErrorBoundary.tsx` | `src/components/ErrorBoundary.tsx` | React error boundary with fallback UI |
| `server.ts` | `server.ts` | Express server: all API routes, AI orchestration, RAG engine (1834 lines) |

---

*Generated for SwasthAI — AI-Powered Health Companion*
