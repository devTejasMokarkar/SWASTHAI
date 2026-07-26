import { useState, useRef, useEffect } from "react"
import { ChipSelect } from "../ui/ChipSelect"
import { ChevronDown, Check } from "lucide-react"

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

const dietOptions = [
  "Vegetarian", "Vegan", "Non Vegetarian", "Eggetarian",
  "Gluten Free", "Ketogenic", "Jain", "Low Carb",
  "High Protein", "No Preference",
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
  const [showMoreGoals, setShowMoreGoals] = useState(false)
  const goalsRef = useRef<HTMLDivElement>(null)

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

  const toggleExtraGoal = (goal: string) => {
    const current = data.healthGoals
    const updated = current.includes(goal)
      ? current.filter(g => g !== goal)
      : [...current, goal]
    update("healthGoals", updated)
  }

  const selectedExtraCount = extraGoals.filter(g => data.healthGoals.includes(g)).length
  const selectedMain = data.healthGoals.filter(g => mainGoals.includes(g))

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
            onChange={e => update("fullName", e.target.value)}
            placeholder="Your full name"
            className="w-full h-10 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none font-semibold text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
            Date of Birth
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={data.dob}
              onChange={e => update("dob", e.target.value)}
              className="flex-1 h-10 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none font-semibold text-sm"
            />
            {data.dob && (
              <span className="text-[11px] font-bold text-primary whitespace-nowrap shrink-0">
                {calculateAge(data.dob)} yrs
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
            Gender
          </label>
          <div className="grid grid-cols-3 gap-1">
            {["Male", "Female", "Other"].map(gen => (
              <button
                key={gen}
                type="button"
                onClick={() => update("gender", gen)}
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
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
            Weight (kg)
          </label>
          <input
            type="number"
            value={data.weight}
            onChange={e => update("weight", e.target.value)}
            placeholder="70"
            min="20"
            max="300"
            className="w-full h-10 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none font-semibold text-sm"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
            Height (cm) <span className="font-normal normal-case">opt.</span>
          </label>
          <input
            type="number"
            value={data.height}
            onChange={e => update("height", e.target.value)}
            placeholder="170"
            min="50"
            max="300"
            className="w-full h-10 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none font-semibold text-sm"
          />
        </div>
      </div>

      <ChipSelect
        label="Dietary Preference"
        options={dietOptions}
        selected={data.dietaryPreferences}
        onChange={val => update("dietaryPreferences", val)}
      />

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
          What do you want from Swasth AI?
        </label>
        <div className="flex flex-wrap gap-1">
          {mainGoals.map(goal => {
            const active = data.healthGoals.includes(goal)
            return (
              <button
                key={goal}
                type="button"
                onClick={() => toggleExtraGoal(goal)}
                className={`h-[44px] px-3 rounded-full border font-bold text-xs transition-all cursor-pointer select-none ${
                  active
                    ? "bg-primary/10 dark:bg-primary/20 border-primary/40 text-primary"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-slate-400 hover:border-primary/50 hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                {goal}
              </button>
            )
          })}

          <div ref={goalsRef} className="relative">
            <button
              type="button"
              onClick={() => setShowMoreGoals(!showMoreGoals)}
              className={`h-[44px] px-3 rounded-full border font-bold text-xs transition-all cursor-pointer select-none flex items-center gap-1 ${
                selectedExtraCount > 0
                  ? "bg-primary/10 dark:bg-primary/20 border-primary/40 text-primary"
                  : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-slate-400 hover:border-primary/50"
              }`}
            >
              {selectedExtraCount > 0 ? `Other (${selectedExtraCount})` : "Other"}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMoreGoals ? "rotate-180" : ""}`} />
            </button>

            {showMoreGoals && (
              <div className="absolute top-full left-0 mt-1 z-20 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 max-h-60 overflow-y-auto">
                {extraGoals.map(goal => {
                  const active = data.healthGoals.includes(goal)
                  return (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => toggleExtraGoal(goal)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        active
                          ? "bg-primary border-primary"
                          : "border-slate-300 dark:border-slate-600"
                      }`}>
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
        {selectedMain.length > 0 && (
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
