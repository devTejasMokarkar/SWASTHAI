import { useState, useRef, useEffect } from "react"
import { Check } from "lucide-react"

export interface Step1Data {
  fullName: string
  dob: string
  gender: string
  weight: string
  height: string
  dietaryPreferences: string[]
  healthGoals: string[]
}

interface Step1Props {
  data: Step1Data
  onChange: (data: Step1Data) => void
}

const mainDietOptions = ["Vegetarian", "Vegan", "Non Vegetarian", "No Preference"]
const extraDietOptions = [
  "Eggetarian", "Gluten Free", "Ketogenic", "Jain",
  "Low Carb", "High Protein",
]

const mainGoals = [
  "Maintain good health",
  "Lose weight",
  "Gain weight",
  "Better nutrition",
]

const extraGoals = [
  "Improve fitness",
  "Manage diabetes",
  "Manage blood pressure",
  "Better sleep",
  "Stress management",
  "Healthy lifestyle",
  "Heart health",
  "Women's health",
  "Men's health",
  "Senior care",
  "Family health",
  "Personalized meal plans",
  "Daily health tips",
  "Medicine reminders",
  "Track symptoms",
]

export function Step1PersonalProfile({ data, onChange }: Step1Props) {
  const [showMoreDiet, setShowMoreDiet] = useState(false)
  const [showMoreGoals, setShowMoreGoals] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const dietRef = useRef<HTMLDivElement>(null)
  const goalsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showMoreDiet) return
    const handleClick = (e: MouseEvent) => {
      if (dietRef.current && !dietRef.current.contains(e.target as Node)) {
        setShowMoreDiet(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showMoreDiet])

  useEffect(() => {
    if (!showMoreGoals) return
    const handleClick = (e: MouseEvent) => {
      if (goalsRef.current && !goalsRef.current.contains(e.target as Node)) {
        setShowMoreGoals(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showMoreGoals])

  const update = (field: keyof Step1Data, value: any) => {
    onChange({ ...data, [field]: value })
  }

  const toggleDiet = (pref: string) => {
    const current = data.dietaryPreferences
    if (pref === "No Preference") {
      update("dietaryPreferences", ["No Preference"])
      return
    }
    let updated = current.filter(p => p !== "No Preference")
    if (updated.includes(pref)) {
      updated = updated.filter(p => p !== pref)
      if (updated.length === 0) updated = ["No Preference"]
    } else {
      updated.push(pref)
    }
    update("dietaryPreferences", updated)
  }

  const toggleExtraGoal = (goal: string) => {
    const current = data.healthGoals
    const updated = current.includes(goal)
      ? current.filter(g => g !== goal)
      : [...current, goal]
    update("healthGoals", updated)
  }

  const selectedExtraDietCount = extraDietOptions.filter(d => data.dietaryPreferences.includes(d)).length
  const selectedExtraGoalCount = extraGoals.filter(g => data.healthGoals.includes(g)).length
  const selectedMainGoals = data.healthGoals.filter(g => mainGoals.includes(g))

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-extrabold text-on-surface dark:text-slate-100">
          Tell us about yourself
        </h2>
        <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
          This helps Swasth AI personalize recommendations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={data.fullName}
            onChange={e => { update("fullName", e.target.value); setErrors(p => ({ ...p, fullName: '' })); }}
            placeholder="Your full name"
            className={`w-full h-10 px-4 bg-slate-50 dark:bg-slate-950 border text-on-surface dark:text-slate-100 rounded-xl focus:outline-none font-semibold text-sm ${errors.fullName ? 'border-rose-400' : 'border-slate-200 dark:border-slate-800 focus:border-primary focus:bg-white dark:focus:bg-slate-900'}`}
          />
          {errors.fullName && <p className="text-[10px] text-rose-500 font-semibold">{errors.fullName}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
            Date of Birth <span className="text-rose-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={data.dob}
              onChange={e => { update("dob", e.target.value); setErrors(p => ({ ...p, dob: '' })); }}
              className={`flex-1 h-10 px-4 bg-slate-50 dark:bg-slate-950 border text-on-surface dark:text-slate-100 rounded-xl focus:outline-none font-semibold text-sm ${errors.dob ? 'border-rose-400' : 'border-slate-200 dark:border-slate-800 focus:border-primary focus:bg-white dark:focus:bg-slate-900'}`}
            />
            {data.dob && (
              <span className="text-[11px] font-bold text-primary whitespace-nowrap shrink-0">
                {calculateAge(data.dob)} yrs
              </span>
            )}
          </div>
          {errors.dob && <p className="text-[10px] text-rose-500 font-semibold">{errors.dob}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
            Gender <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-1">
            {["Male", "Female", "Other"].map(gen => (
              <button
                key={gen}
                type="button"
                onClick={() => { update("gender", gen); setErrors(p => ({ ...p, gender: '' })); }}
                className={`h-9 flex items-center justify-center rounded-lg border font-bold text-[10px] md:text-xs transition-all cursor-pointer ${
                  data.gender === gen
                    ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary"
                    : "border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-slate-400 hover:border-primary/50"
                }`}
              >
                {gen}
              </button>
            ))}
          </div>
          {errors.gender && <p className="text-[10px] text-rose-500 font-semibold">{errors.gender}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
            Weight (kg)
          </label>
          <input
            type="number"
            value={data.weight}
            onChange={e => { update("weight", e.target.value); setErrors(p => ({ ...p, weight: '' })); }}
            placeholder="70"
            className={`w-full h-10 px-4 bg-slate-50 dark:bg-slate-950 border text-on-surface dark:text-slate-100 rounded-xl focus:outline-none font-semibold text-sm ${errors.weight ? 'border-rose-400' : 'border-slate-200 dark:border-slate-800 focus:border-primary focus:bg-white dark:focus:bg-slate-900'}`}
          />
          {errors.weight && <p className="text-[10px] text-rose-500 font-semibold">{errors.weight}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
            Height (cm)
          </label>
          <input
            type="number"
            value={data.height}
            onChange={e => { update("height", e.target.value); setErrors(p => ({ ...p, height: '' })); }}
            placeholder="170"
            className={`w-full h-10 px-4 bg-slate-50 dark:bg-slate-950 border text-on-surface dark:text-slate-100 rounded-xl focus:outline-none font-semibold text-sm ${errors.height ? 'border-rose-400' : 'border-slate-200 dark:border-slate-800 focus:border-primary focus:bg-white dark:focus:bg-slate-900'}`}
          />
          {errors.height && <p className="text-[10px] text-rose-500 font-semibold">{errors.height}</p>}
        </div>
      </div>

      {/* Dietary Preference */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
          Dietary Preference
        </label>
        <div className="flex flex-wrap gap-1">
          {mainDietOptions.map(d => {
            const active = data.dietaryPreferences.includes(d)
            const isNone = d === "No Preference"
            const show = !isNone || data.dietaryPreferences.length === 0 || data.dietaryPreferences.includes("No Preference")
            if (!show) return null
            return (
              <button key={d} type="button" onClick={() => toggleDiet(d)}
                className={`h-[44px] px-3 rounded-full border font-bold text-xs transition-all cursor-pointer select-none ${
                  active
                    ? "bg-primary/10 dark:bg-primary/20 border-primary/40 text-primary"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-slate-400 hover:border-primary/50 hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}>
                {d}
              </button>
            )
          })}
          <div ref={dietRef} className="relative">
            <button type="button" onClick={() => setShowMoreDiet(!showMoreDiet)}
              className={`h-[44px] px-3 rounded-full border font-bold text-xs transition-all cursor-pointer select-none ${
                selectedExtraDietCount > 0
                  ? "bg-primary/10 dark:bg-primary/20 border-primary/40 text-primary"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-slate-400 hover:border-primary/50 hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}>
              {selectedExtraDietCount > 0 ? `More (${selectedExtraDietCount})` : "More options"}
            </button>
            {showMoreDiet && (
              <div className="absolute top-full left-0 mt-1 z-20 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 max-h-60 overflow-y-auto">
                {extraDietOptions.map(d => {
                  const active = data.dietaryPreferences.includes(d)
                  return (
                    <button key={d} type="button" onClick={() => toggleDiet(d)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${active ? "bg-primary border-primary" : "border-slate-300 dark:border-slate-600"}`}>
                        {active && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs font-semibold text-on-surface dark:text-slate-200">{d}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        {data.dietaryPreferences.filter(p => p !== "No Preference").length > 0 && (
          <p className="text-[10px] text-on-surface-variant dark:text-slate-500">
            {data.dietaryPreferences.filter(p => p !== "No Preference").length} selected
          </p>
        )}
      </div>

      {/* Goals */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
          What do you want from Swasth AI?
        </label>
        <div className="flex flex-wrap gap-1">
          {mainGoals.map(goal => {
            const active = data.healthGoals.includes(goal)
            return (
              <button key={goal} type="button" onClick={() => toggleExtraGoal(goal)}
                className={`h-[44px] px-3 rounded-full border font-bold text-xs transition-all cursor-pointer select-none ${
                  active
                    ? "bg-primary/10 dark:bg-primary/20 border-primary/40 text-primary"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-slate-400 hover:border-primary/50 hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}>
                {goal}
              </button>
            )
          })}
          <div ref={goalsRef} className="relative">
            <button type="button" onClick={() => setShowMoreGoals(!showMoreGoals)}
              className={`h-[44px] px-3 rounded-full border font-bold text-xs transition-all cursor-pointer select-none ${
                selectedExtraGoalCount > 0
                  ? "bg-primary/10 dark:bg-primary/20 border-primary/40 text-primary"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-slate-400 hover:border-primary/50 hover:bg-slate-100 dark:hover:bg-slate-900"
              }`}>
              {selectedExtraGoalCount > 0 ? `Other (${selectedExtraGoalCount})` : "Other"}
            </button>
            {showMoreGoals && (
              <div className="absolute top-full left-0 mt-1 z-20 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 max-h-60 overflow-y-auto">
                {extraGoals.map(goal => {
                  const active = data.healthGoals.includes(goal)
                  return (
                    <button key={goal} type="button" onClick={() => toggleExtraGoal(goal)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${active ? "bg-primary border-primary" : "border-slate-300 dark:border-slate-600"}`}>
                        {active && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs font-semibold text-on-surface dark:text-slate-200">{goal}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        {selectedMainGoals.length > 0 && (
          <p className="text-[10px] text-on-surface-variant dark:text-slate-500">
            {data.healthGoals.length} selected
          </p>
        )}
      </div>

      <p className="text-[10px] text-on-surface-variant dark:text-slate-500 italic">
        You can always update these later in your profile.
      </p>
    </div>
  )
}

function calculateAge(dob: string): number {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}
