import { useEffect, useMemo, useState } from "react"
import { LoginButton } from "../LoginButton"
import { StepIndicator } from "../ui/StepIndicator"
import "./OnboardingWizard.css"

const totalSteps = 8

const initialState = {
  fullName: "",
  email: "",
  age: "",
  gender: "",
  height: "",
  weight: "",
  goals: [] as string[],
  activity: "",
  conditions: [] as string[],
  notes: "",
}

const STEPS = [
  { label: "What’s your full name?", hint: "We’ll use this to personalize your experience." },
  { label: "How can we reach you?", hint: "We’ll send your health summaries and reminders here." },
  { label: "Tell us a bit about you", hint: "This helps us tailor recommendations accurately." },
  { label: "Height & weight", hint: "Used to calculate your baseline health metrics." },
  { label: "What are you hoping to achieve?", hint: "Pick as many as apply — you can change these later." },
  { label: "How active are you?", hint: "A rough weekly average is fine." },
  { label: "Any medical conditions?", hint: "Optional, but it helps us give safer guidance." },
  { label: "You’re all set", hint: "Here’s a quick summary before we get started." },
]

const GOALS = [
  "Weight loss",
  "Muscle gain",
  "Better sleep",
  "Stress management",
  "Manage a condition",
  "General wellness",
]

const ACTIVITY_LEVELS = [
  { value: "Sedentary", title: "Sedentary", description: "Little to no exercise" },
  { value: "Light", title: "Light", description: "1–2 workouts a week" },
  { value: "Moderate", title: "Moderate", description: "3–4 workouts a week" },
  { value: "Active", title: "Active", description: "5–6 workouts a week" },
]

const CONDITIONS = ["Diabetes", "Hypertension", "Asthma", "None"]

export function OnboardingWizard() {
  const [current, setCurrent] = useState(1)
  const [state, setState] = useState(initialState)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }

  const validateStep = (step: number) => {
    const nextErrors: Record<string, string> = {}

    if (step === 1) {
      if (!state.fullName.trim()) {
        nextErrors.fullName = "Full name is required"
      } else if (state.fullName.trim().length < 2) {
        nextErrors.fullName = "Please enter a valid full name"
      }
    }

    if (step === 2) {
      if (!state.email.trim()) {
        nextErrors.email = "Email is required"
      } else if (!validateEmail(state.email.trim())) {
        nextErrors.email = "Please enter a valid email"
      }
    }

    if (step === 3) {
      if (!state.age.trim()) {
        nextErrors.age = "Age is required"
      } else {
        const age = Number(state.age)
        if (Number.isNaN(age) || age < 1 || age > 120) {
          nextErrors.age = "Enter a valid age"
        }
      }
      if (!state.gender) {
        nextErrors.gender = "Please select a gender"
      }
    }

    if (step === 4) {
      if (!state.height.trim()) {
        nextErrors.height = "Height is required"
      } else {
        const height = Number(state.height)
        if (Number.isNaN(height) || height < 50 || height > 250) {
          nextErrors.height = "Enter a valid height"
        }
      }
      if (!state.weight.trim()) {
        nextErrors.weight = "Weight is required"
      } else {
        const weight = Number(state.weight)
        if (Number.isNaN(weight) || weight < 20 || weight > 300) {
          nextErrors.weight = "Enter a valid weight"
        }
      }
    }

    if (step === 5) {
      if (state.goals.length === 0) {
        nextErrors.goals = "Select at least one goal"
      }
    }

    if (step === 6) {
      if (!state.activity) {
        nextErrors.activity = "Choose your activity level"
      }
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  useEffect(() => {
    const saved = sessionStorage.getItem("swasth_pending_profile")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setState(prev => ({ ...prev, ...parsed }))
      } catch {
        return
      }
    }
  }, [])

  useEffect(() => {
    sessionStorage.setItem("swasth_pending_profile", JSON.stringify(state))
  }, [state])

  const progressPct = useMemo(() => (current / totalSteps) * 100, [current])

  const updateField = (key: keyof typeof initialState, value: string | string[]) => {
    setState(prev => ({ ...prev, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: "" }))
  }

  const toggleArray = (key: "goals" | "conditions", value: string) => {
    setState(prev => {
      const currentList = prev[key]
      const nextList = currentList.includes(value)
        ? currentList.filter(item => item !== value)
        : [...currentList, value]
      return { ...prev, [key]: nextList }
    })
    if (key === "goals") {
      setErrors(prev => ({ ...prev, goals: "" }))
    }
  }

  const goTo = (step: number) => {
    if (step < 1 || step > totalSteps) return
    const fromStep = document.querySelector(`.step[data-step="${current}"]`)
    if (fromStep) fromStep.classList.add("leaving")
    setTimeout(() => {
      if (fromStep) fromStep.classList.remove("active", "leaving")
      setCurrent(step)
      const toStep = document.querySelector(`.step[data-step="${step}"]`)
      toStep?.classList.add("active")
    }, 320)
  }

  const handleNext = () => {
    if (current === totalSteps) {
      return
    }

    if (!validateStep(current)) {
      return
    }

    goTo(current + 1)
  }

  const summaryRows = useMemo(() => [
    ["Name", state.fullName || "—"],
    ["Email", state.email || "—"],
    ["Age / Gender", `${state.age || "—"} · ${state.gender || "—"}`],
    ["Height / Weight", `${state.height || "—"} cm · ${state.weight || "—"} kg`],
    ["Goals", state.goals.length ? state.goals.join(", ") : "—"],
    ["Activity level", state.activity || "—"],
    ["Conditions", state.conditions.length ? state.conditions.join(", ") : "None reported"],
  ], [state])

  return (
    <div className="onboarding-theme">
      <div className="ambient">
        <div className="blob one"></div>
        <div className="blob two"></div>
      </div>

      <div className="app">
        <div className="brand">
          <div className="logo-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12h4l2 -7 4 14 2 -7h4" />
            </svg>
          </div>
          <h1 className="wordmark">Swasth AI</h1>
        </div>

        <div className="topline">
          <span>Already registered?</span>
          <LoginButton size="medium" shape="pill" text="signin_with" />
        </div>

        <svg className="ecg-strip" viewBox="0 0 400 26" preserveAspectRatio="none">
          <path d="M0,13 L60,13 L68,4 L76,22 L84,13 L140,13 L148,4 L156,22 L164,13 L220,13 L228,4 L236,22 L244,13 L300,13 L308,4 L316,22 L324,13 L400,13" />
        </svg>

        <div className="progress-row">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
            <div className="progress-dot" style={{ left: `${progressPct}%` }} />
          </div>
        </div>
        <StepIndicator currentStep={current} totalSteps={totalSteps} />

        <form className="card-stack" autoComplete="off" onSubmit={(e) => e.preventDefault()}>
          <div className={`step ${current === 1 ? "active" : ""}`} data-step="1">
            <h2>{STEPS[0].label}</h2>
            <p className="hint">{STEPS[0].hint}</p>
            <input type="text" placeholder="Your full name" value={state.fullName} onChange={(e) => updateField("fullName", e.target.value)} />
            {errors.fullName && <p className="field-error">{errors.fullName}</p>}
            <div className="spacer" />
          </div>

          <div className={`step ${current === 2 ? "active" : ""}`} data-step="2">
            <h2>{STEPS[1].label}</h2>
            <p className="hint">{STEPS[1].hint}</p>
            <input type="email" placeholder="you@email.com" value={state.email} onChange={(e) => updateField("email", e.target.value)} />
            {errors.email && <p className="field-error">{errors.email}</p>}
            <div className="spacer" />
          </div>

          <div className={`step ${current === 3 ? "active" : ""}`} data-step="3">
            <h2>{STEPS[2].label}</h2>
            <p className="hint">{STEPS[2].hint}</p>
            <div className="field-row">
              <div className="field-col">
                <label>Age</label>
                <input type="number" placeholder="e.g. 28" value={state.age} onChange={(e) => updateField("age", e.target.value)} />
                {errors.age && <p className="field-error">{errors.age}</p>}
              </div>
            </div>
            <div className="field-col">
              <label>Gender</label>
              <div className="segmented">
                {["Female", "Male", "Other"].map((option) => (
                  <button key={option} type="button" className={state.gender === option ? "selected" : ""} onClick={() => updateField("gender", option)}>{option}</button>
                ))}
              </div>
              {errors.gender && <p className="field-error">{errors.gender}</p>}
            </div>
            <div className="spacer" />
          </div>

          <div className={`step ${current === 4 ? "active" : ""}`} data-step="4">
            <h2>{STEPS[3].label}</h2>
            <p className="hint">{STEPS[3].hint}</p>
            <div className="field-row">
              <div className="field-col">
                <label>Height (cm)</label>
                <input type="number" placeholder="e.g. 170" value={state.height} onChange={(e) => updateField("height", e.target.value)} />
                {errors.height && <p className="field-error">{errors.height}</p>}
              </div>
              <div className="field-col">
                <label>Weight (kg)</label>
                <input type="number" placeholder="e.g. 65" value={state.weight} onChange={(e) => updateField("weight", e.target.value)} />
                {errors.weight && <p className="field-error">{errors.weight}</p>}
              </div>
            </div>
            <div className="spacer" />
          </div>

          <div className={`step ${current === 5 ? "active" : ""}`} data-step="5">
            <h2>{STEPS[4].label}</h2>
            <p className="hint">{STEPS[4].hint}</p>
            <div className="chip-grid">
              {GOALS.map((goal) => (
                <div key={goal} className={`chip ${state.goals.includes(goal) ? "selected" : ""}`} onClick={() => toggleArray("goals", goal)}>{goal}</div>
              ))}
            </div>
            {errors.goals && <p className="field-error">{errors.goals}</p>}
            <div className="spacer" />
          </div>

          <div className={`step ${current === 6 ? "active" : ""}`} data-step="6">
            <h2>{STEPS[5].label}</h2>
            <p className="hint">{STEPS[5].hint}</p>
            <div className="radio-cards">
              {ACTIVITY_LEVELS.map((option) => (
                <div key={option.value} className={`radio-card ${state.activity === option.value ? "selected" : ""}`} onClick={() => updateField("activity", option.value)}>
                  <div className="dot" />
                  <div className="txt">
                    <b>{option.title}</b>
                    <span>{option.description}</span>
                  </div>
                </div>
              ))}
            </div>
            {errors.activity && <p className="field-error">{errors.activity}</p>}
            <div className="spacer" />
          </div>

          <div className={`step ${current === 7 ? "active" : ""}`} data-step="7">
            <h2>{STEPS[6].label}</h2>
            <p className="hint">{STEPS[6].hint}</p>
            <div className="chip-grid" style={{ marginBottom: "14px" }}>
              {CONDITIONS.map((condition) => (
                <div key={condition} className={`chip ${state.conditions.includes(condition) ? "selected" : ""}`} onClick={() => toggleArray("conditions", condition)}>{condition}</div>
              ))}
            </div>
            <textarea placeholder="Anything else we should know? (optional)" value={state.notes} onChange={(e) => updateField("notes", e.target.value)} />
            <div className="spacer" />
          </div>

          <div className={`step ${current === 8 ? "active" : ""}`} data-step="8">
            <h2>{STEPS[7].label}</h2>
            <p className="hint">{STEPS[7].hint}</p>
            <div className="summary-list">
              {summaryRows.map(([k, v]) => (
                <div key={k} className="summary-row"><span className="k">{k}</span><span className="v">{v}</span></div>
              ))}
            </div>
            <div className="finish-cta">
              <p>Sign in with Google to save this profile and enter your dashboard.</p>
              <LoginButton size="large" shape="pill" text="signin_with" />
            </div>
            <div className="spacer" />
          </div>

          <div className="nav-buttons">
            <button type="button" className="nav back" onClick={() => goTo(current - 1)} disabled={current === 1}>← Back</button>
            <button type="button" className={`nav next ${current === totalSteps ? "finish" : ""}`} onClick={handleNext} disabled={current === totalSteps}>
              <span id="nextLabel">{current === totalSteps ? "Get started" : "Next"}</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
