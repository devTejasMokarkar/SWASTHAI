import { useState, useEffect, useRef } from "react"
import { motion } from "motion/react"
import { Droplets, Eye, ChevronRight, ChevronLeft, X, Play, Pause, Check } from "lucide-react"

const STORAGE_KEY = "swasth_wellness_settings"

interface WellnessSettings {
  activityLevel: "sedentary" | "lightly_active" | "moderately_active" | "very_active"
  environment: "cold" | "mild" | "warm" | "hot"
  workHours: "9to5" | "early_bird" | "night_owl" | "custom"
  customStartHour: number
  customEndHour: number
  waterEnabled: boolean
  waterInterval: number
  waterGoalOverride: number
  eyeCareEnabled: boolean
  eyeCareInterval: number
  eyeBreaksToday: number
  dayStreak: number
  lastWaterDate: string
  activeHoursStart: number
  activeHoursEnd: number
}

const defaultSettings: WellnessSettings = {
  activityLevel: "sedentary",
  environment: "mild",
  workHours: "9to5",
  customStartHour: 9,
  customEndHour: 18,
  waterEnabled: false,
  waterInterval: 30,
  waterGoalOverride: 0,
  eyeCareEnabled: false,
  eyeCareInterval: 20,
  eyeBreaksToday: 0,
  dayStreak: 0,
  lastWaterDate: "",
  activeHoursStart: 9,
  activeHoursEnd: 18,
}

const ACTIVITY_LEVELS = [
  { value: "sedentary" as const, label: "Sedentary", desc: "Desk job, minimal exercise", icon: "🪑" },
  { value: "lightly_active" as const, label: "Lightly active", desc: "Light walks, 1–2x gym/week", icon: "🚶" },
  { value: "moderately_active" as const, label: "Moderately active", desc: "3–5 workouts per week", icon: "🏋️" },
  { value: "very_active" as const, label: "Very active", desc: "Daily intense exercise / manual work", icon: "🔥" },
]

const ENVIRONMENTS = [
  { value: "cold" as const, label: "Cold", desc: "Below 18°C", icon: "❄️" },
  { value: "mild" as const, label: "Mild", desc: "18–24°C", icon: "🌤️" },
  { value: "warm" as const, label: "Warm", desc: "24–32°C", icon: "☀️" },
  { value: "hot" as const, label: "Hot / humid", desc: "Above 32°C", icon: "🔥" },
]

const WORK_HOURS = [
  { value: "9to5" as const, label: "9 to 5", desc: "Classic office hours", icon: "🏢" },
  { value: "early_bird" as const, label: "Early bird", desc: "6am – 3pm", icon: "🌅" },
  { value: "night_owl" as const, label: "Night owl", desc: "12pm – 9pm", icon: "🌙" },
  { value: "custom" as const, label: "Custom", desc: "Set your own hours", icon: "⚙️" },
]

const QUICK_ADD = [
  { label: "¼ bottle", ml: 38 },
  { label: "½ bottle", ml: 75 },
  { label: "1 bottle", ml: 150 },
  { label: "250ml", ml: 250 },
  { label: "500ml", ml: 500 },
]

const STEPS = [
  "activity",
  "environment",
  "workHours",
  "waterReminders",
  "eyeCare",
  "activeHours",
  "start",
  "quickAdd",
  "progress",
] as const

function loadSettings(): WellnessSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) }
  } catch {}
  return defaultSettings
}

function calcGoal(activity: string, env: string): number {
  let ml = 1600
  if (activity === "lightly_active") ml = 1900
  else if (activity === "moderately_active") ml = 2200
  else if (activity === "very_active") ml = 2600
  if (env === "warm") ml += 300
  else if (env === "hot") ml += 600
  return ml
}

interface WellnessHydrationModalProps {
  isOpen: boolean
  onClose: () => void
  waterLoggedMl: number
  waterGoalMl: number
  onUpdateWater: (amount: number) => void
}

export default function WellnessHydrationModal({ isOpen, onClose, waterLoggedMl, waterGoalMl, onUpdateWater }: WellnessHydrationModalProps) {
  const [settings, setSettings] = useState<WellnessSettings>(loadSettings)
  const [step, setStep] = useState(0)
  const [running, setRunning] = useState(false)
  const waterTimer = useRef<NodeJS.Timeout | null>(null)
  const eyeTimer = useRef<NodeJS.Timeout | null>(null)
  const today = new Date().toISOString().split("T")[0]

  const effectiveGoal = settings.waterGoalOverride > 0 ? settings.waterGoalOverride * 1000 : waterGoalMl
  const progressPct = Math.min(Math.round((waterLoggedMl / effectiveGoal) * 100), 100)
  const remaining = Math.max(effectiveGoal - waterLoggedMl, 0)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    if (settings.lastWaterDate !== today && waterLoggedMl >= effectiveGoal) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yStr = yesterday.toISOString().split("T")[0]
      const streak = settings.lastWaterDate === yStr ? settings.dayStreak + 1 : 1
      setSettings(s => ({ ...s, dayStreak: streak, lastWaterDate: today }))
    }
  }, [waterLoggedMl, effectiveGoal, today])

  useEffect(() => {
    if (settings.lastWaterDate !== today) {
      setSettings(s => ({ ...s, eyeBreaksToday: 0 }))
    }
  }, [today])

  const update = <K extends keyof WellnessSettings>(field: K, value: WellnessSettings[K]) => {
    setSettings(prev => {
      const next = { ...prev, [field]: value }
      if (field === "workHours" && value !== "custom") {
        const hours: Record<string, [number, number]> = { "9to5": [9, 18], early_bird: [6, 15], night_owl: [12, 21] }
        const [s, e] = hours[value as string] || [9, 18]
        next.activeHoursStart = s
        next.activeHoursEnd = e
      }
      return next
    })
  }

  const toggleRunning = () => {
    if (running) {
      if (waterTimer.current) clearInterval(waterTimer.current)
      if (eyeTimer.current) clearInterval(eyeTimer.current)
      waterTimer.current = null
      eyeTimer.current = null
      setRunning(false)
    } else {
      setRunning(true)
    }
  }

  useEffect(() => {
    if (!running) return
    const hour = new Date().getHours()
    const inActiveHours = hour >= settings.activeHoursStart && hour < settings.activeHoursEnd
    if (settings.waterEnabled && inActiveHours && Notification.permission === "granted") {
      waterTimer.current = setInterval(() => {
        new Notification("💧 Hydration Reminder", { body: "Time to drink water!", icon: "/favicon.ico" })
      }, settings.waterInterval * 60 * 1000)
    }
    if (settings.eyeCareEnabled && inActiveHours && Notification.permission === "granted") {
      eyeTimer.current = setInterval(() => {
        setSettings(s => ({ ...s, eyeBreaksToday: s.eyeBreaksToday + 1 }))
        new Notification("👁️ Eye Break", { body: "Look at something 20 feet away for 20 seconds.", icon: "/favicon.ico" })
      }, settings.eyeCareInterval * 60 * 1000)
    }
    return () => {
      if (waterTimer.current) clearInterval(waterTimer.current)
      if (eyeTimer.current) clearInterval(eyeTimer.current)
    }
  }, [running, settings.waterEnabled, settings.eyeCareInterval, settings.activeHoursStart, settings.activeHoursEnd, settings.waterInterval, settings.eyeCareEnabled])

  useEffect(() => {
    if (Notification.permission === "default") Notification.requestPermission()
  }, [])

  const totalSteps = STEPS.length
  const isFirst = step === 0
  const isLast = step === totalSteps - 1

  const chipClass = (active: boolean) =>
    `px-3 py-2.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer text-left w-full ${
      active
        ? "bg-primary/10 dark:bg-primary/20 border-primary/40 text-primary"
        : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-slate-400 hover:border-primary/50"
    }`

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl relative border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-sky-500" />
            <h3 className="text-lg font-black text-on-surface dark:text-slate-100">Wellness & Hydration</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 mb-5">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`} />
          ))}
        </div>

        {/* Step: Activity Level */}
        {STEPS[step] === "activity" && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-on-surface dark:text-slate-100">🏃 How active are you?</p>
            <p className="text-[11px] text-on-surface-variant -mt-1">(affects water needs)</p>
            <div className="space-y-1.5">
              {ACTIVITY_LEVELS.map(a => (
                <button key={a.value} type="button" onClick={() => update("activityLevel", a.value)} className={chipClass(settings.activityLevel === a.value)}>
                  <span className="text-base">{a.icon}</span>
                  <p className="font-bold text-xs mt-0.5">{a.label}</p>
                  <p className="text-[10px] font-medium opacity-70">{a.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Environment */}
        {STEPS[step] === "environment" && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-on-surface dark:text-slate-100">🌡️ What's your environment like?</p>
            <div className="space-y-1.5">
              {ENVIRONMENTS.map(e => (
                <button key={e.value} type="button" onClick={() => update("environment", e.value)} className={chipClass(settings.environment === e.value)}>
                  <span className="text-base">{e.icon}</span>
                  <p className="font-bold text-xs mt-0.5">{e.label}</p>
                  <p className="text-[10px] font-medium opacity-70">{e.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Work Hours */}
        {STEPS[step] === "workHours" && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-on-surface dark:text-slate-100">🕐 What are your work hours?</p>
            <div className="space-y-1.5">
              {WORK_HOURS.map(w => (
                <button key={w.value} type="button" onClick={() => update("workHours", w.value)} className={chipClass(settings.workHours === w.value)}>
                  <span className="text-base">{w.icon}</span>
                  <p className="font-bold text-xs mt-0.5">{w.label}</p>
                  <p className="text-[10px] font-medium opacity-70">{w.desc}</p>
                </button>
              ))}
            </div>
            {settings.workHours === "custom" && (
              <div className="flex gap-3 mt-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-on-surface-variant">Start hour</label>
                  <input type="number" value={settings.customStartHour} onChange={e => { const v = Number(e.target.value); update("customStartHour", v); update("activeHoursStart", v) }}
                    min="0" max="23" className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-center outline-none focus:border-primary" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-on-surface-variant">End hour</label>
                  <input type="number" value={settings.customEndHour} onChange={e => { const v = Number(e.target.value); update("customEndHour", v); update("activeHoursEnd", v) }}
                    min="0" max="23" className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-center outline-none focus:border-primary" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step: Water Reminders */}
        {STEPS[step] === "waterReminders" && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-on-surface dark:text-slate-100">💧 Water Reminders</p>
            <div className="bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/50 dark:border-sky-900/30 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Enable reminders</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={settings.waterEnabled} onChange={e => update("waterEnabled", e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-sky-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
              {settings.waterEnabled && (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-on-surface-variant">Interval</span>
                    <input type="number" value={settings.waterInterval} onChange={e => update("waterInterval", Number(e.target.value))}
                      min="1" className="w-20 h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-center outline-none focus:border-primary" />
                    <span className="text-[11px] font-semibold text-on-surface-variant">min</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-on-surface-variant">Daily goal</span>
                    <input type="number" value={settings.waterGoalOverride} onChange={e => update("waterGoalOverride", Number(e.target.value))}
                      min="0" step="0.1" className="w-20 h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-center outline-none focus:border-primary" />
                    <span className="text-[11px] font-semibold text-on-surface-variant">L</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step: Eye Care */}
        {STEPS[step] === "eyeCare" && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-on-surface dark:text-slate-100">👁️ Eye Care</p>
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/50 dark:border-indigo-900/30 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Enable 20-20-20 reminders</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={settings.eyeCareEnabled} onChange={e => update("eyeCareEnabled", e.target.checked)} className="sr-only peer" />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
              {settings.eyeCareEnabled && (
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-semibold text-on-surface-variant">Interval</span>
                  <input type="number" value={settings.eyeCareInterval} onChange={e => update("eyeCareInterval", Number(e.target.value))}
                    min="1" className="w-20 h-9 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-center outline-none focus:border-primary" />
                  <span className="text-[11px] font-semibold text-on-surface-variant">min</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Active Hours */}
        {STEPS[step] === "activeHours" && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-on-surface dark:text-slate-100">🕐 Active Hours</p>
            <p className="text-[11px] text-on-surface-variant -mt-1">Reminders will only fire during these hours</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-on-surface-variant">Start</label>
                <input type="number" value={settings.activeHoursStart} onChange={e => update("activeHoursStart", Number(e.target.value))}
                  min="0" max="23" className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-center outline-none focus:border-primary" />
              </div>
              <span className="text-sm text-on-surface-variant mt-5">to</span>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-on-surface-variant">End</label>
                <input type="number" value={settings.activeHoursEnd} onChange={e => update("activeHoursEnd", Number(e.target.value))}
                  min="0" max="23" className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-center outline-none focus:border-primary" />
              </div>
            </div>
          </div>
        )}

        {/* Step: Start Reminders */}
        {STEPS[step] === "start" && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-on-surface dark:text-slate-100">Ready to go?</p>
            <p className="text-[11px] text-on-surface-variant">
              {settings.waterEnabled || settings.eyeCareEnabled
                ? "Tap the button below to start your reminders."
                : "Enable water or eye care reminders in the previous steps first."}
            </p>
            {(settings.waterEnabled || settings.eyeCareEnabled) && (
              <button type="button" onClick={toggleRunning}
                className={`w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  running
                    ? "bg-rose-500 hover:bg-rose-600 text-white"
                    : "bg-primary hover:bg-primary-container text-white"
                }`}>
                {running ? <><Pause className="w-4 h-4" /> Stop Reminders</> : <><Play className="w-4 h-4" /> Start Reminders</>}
              </button>
            )}
            {running && (
              <div className="space-y-2">
                {settings.waterEnabled && (
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/30 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <Droplets className="w-4 h-4 text-sky-500" />
                      <div>
                        <p className="text-[11px] font-bold text-on-surface dark:text-slate-100">Hydration reminder</p>
                        <p className="text-[9px] text-on-surface-variant">Every {settings.waterInterval}min · {settings.activeHoursStart}:00–{settings.activeHoursEnd}:00</p>
                      </div>
                    </div>
                    <Check className="w-4 h-4 text-emerald-500" />
                  </div>
                )}
                {settings.eyeCareEnabled && (
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/30 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <Eye className="w-4 h-4 text-indigo-500" />
                      <div>
                        <p className="text-[11px] font-bold text-on-surface dark:text-slate-100">20-20-20 eye break</p>
                        <p className="text-[9px] text-on-surface-variant">Every {settings.eyeCareInterval}min</p>
                      </div>
                    </div>
                    <Check className="w-4 h-4 text-emerald-500" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step: Quick Add */}
        {STEPS[step] === "quickAdd" && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-on-surface dark:text-slate-100">🍶 Quick add water</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ADD.map(q => (
                <button key={q.label} type="button" onClick={() => onUpdateWater(q.ml)}
                  className="h-11 bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-950/50 border border-sky-200 dark:border-sky-800 rounded-xl text-xs font-bold text-sky-700 dark:text-sky-300 transition-all cursor-pointer">
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Progress */}
        {STEPS[step] === "progress" && (
          <div className="space-y-4">
            <p className="text-sm font-bold text-on-surface dark:text-slate-100">📊 Progress</p>
            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-on-surface dark:text-slate-100">Water intake</span>
                <span className="text-[10px] font-bold text-on-surface-variant">{settings.dayStreak} day streak</span>
              </div>
              {settings.eyeCareEnabled && (
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                  <span>👁️ Eye breaks today</span>
                  <span className="font-bold">{settings.eyeBreaksToday}</span>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant mb-1.5">
                  <span>{waterLoggedMl / 1000}L / {effectiveGoal / 1000}L</span>
                  <span className="font-bold">{remaining > 0 ? `${(remaining / 1000).toFixed(2)}L left` : "✅ Goal met!"}</span>
                </div>
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.5 }}
                    className={`h-full rounded-full ${progressPct >= 100 ? "bg-emerald-500" : "bg-sky-500"}`} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={isFirst}
            className="flex items-center gap-1.5 px-4 h-10 rounded-xl text-xs font-bold text-on-surface-variant hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-[10px] font-bold text-on-surface-variant">{step + 1} / {totalSteps}</span>
          {isLast ? (
            <button type="button" onClick={onClose}
              className="flex items-center gap-1.5 px-5 h-10 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container transition-all cursor-pointer">
              Done <Check className="w-4 h-4" />
            </button>
          ) : (
            <button type="button" onClick={() => setStep(s => Math.min(totalSteps - 1, s + 1))}
              className="flex items-center gap-1.5 px-5 h-10 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-container transition-all cursor-pointer">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
