import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Droplets, Eye, Clock, Sun, Moon, Zap, ChevronDown, ChevronUp, Play, Pause, Plus, Minus, Bike, Flame, Snowflake, Thermometer, Briefcase, Sunrise, Users, Settings, Activity } from "lucide-react"

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

function loadSettings(): WellnessSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return { ...defaultSettings, ...JSON.parse(saved) }
  } catch {}
  return defaultSettings
}

function calcGoal(activity: string, env: string, baseKg: number): number {
  let ml = 1600
  if (activity === "lightly_active") ml = 1900
  else if (activity === "moderately_active") ml = 2200
  else if (activity === "very_active") ml = 2600
  if (env === "warm") ml += 300
  else if (env === "hot") ml += 600
  if (baseKg > 0) ml = Math.max(ml, baseKg * 30)
  return ml
}

interface WellnessPanelProps {
  waterLoggedMl: number
  waterGoalMl: number
  onUpdateWater: (amount: number) => void
}

export default function WellnessPanel({ waterLoggedMl, waterGoalMl, onUpdateWater }: WellnessPanelProps) {
  const [settings, setSettings] = useState<WellnessSettings>(loadSettings)
  const [showPanel, setShowPanel] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [showEnv, setShowEnv] = useState(false)
  const [showHours, setShowHours] = useState(false)
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

  // Day streak tracking
  useEffect(() => {
    if (settings.lastWaterDate !== today && waterLoggedMl >= effectiveGoal) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yStr = yesterday.toISOString().split("T")[0]
      const streak = settings.lastWaterDate === yStr ? settings.dayStreak + 1 : 1
      setSettings(s => ({ ...s, dayStreak: streak, lastWaterDate: today }))
    }
  }, [waterLoggedMl, effectiveGoal, today])

  // Reset daily counters
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

  const toggleRunning = useCallback(() => {
    if (running) {
      if (waterTimer.current) clearInterval(waterTimer.current)
      if (eyeTimer.current) clearInterval(eyeTimer.current)
      waterTimer.current = null
      eyeTimer.current = null
      setRunning(false)
    } else {
      setRunning(true)
    }
  }, [running])

  useEffect(() => {
    if (!running) return
    const now = new Date()
    const hour = now.getHours()
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

  const chipClass = (active: boolean) =>
    `px-3 py-2 rounded-xl border text-[11px] font-bold transition-all cursor-pointer text-left ${
      active
        ? "bg-primary/10 border-primary/40 text-primary"
        : "bg-slate-50 border-slate-200 text-on-surface-variant hover:border-primary/50"
    }`

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => setShowPanel(!showPanel)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-on-surface hover:border-primary/50 transition-all cursor-pointer">
        <span className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-sky-500" />
          Wellness & Hydration
        </span>
        {showPanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">

              {/* Activity Level */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1.5">
                  🏃 How active are you? <span className="font-normal normal-case text-[10px]">(affects water needs)</span>
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {ACTIVITY_LEVELS.map(a => (
                    <button key={a.value} type="button" onClick={() => update("activityLevel", a.value)}
                      className={chipClass(settings.activityLevel === a.value)}>
                      <span className="text-sm">{a.icon}</span>
                      <p className="font-bold text-[11px] mt-0.5">{a.label}</p>
                      <p className="text-[9px] font-medium opacity-70">{a.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Environment */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1.5">
                  🌡️ What's your environment like?
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {ENVIRONMENTS.map(e => (
                    <button key={e.value} type="button" onClick={() => update("environment", e.value)}
                      className={chipClass(settings.environment === e.value)}>
                      <span className="text-sm">{e.icon}</span>
                      <p className="font-bold text-[11px] mt-0.5">{e.label}</p>
                      <p className="text-[9px] font-medium opacity-70">{e.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Work Hours */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1.5">
                  🕐 What are your work hours?
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {WORK_HOURS.map(w => (
                    <button key={w.value} type="button" onClick={() => update("workHours", w.value)}
                      className={chipClass(settings.workHours === w.value)}>
                      <span className="text-sm">{w.icon}</span>
                      <p className="font-bold text-[11px] mt-0.5">{w.label}</p>
                      <p className="text-[9px] font-medium opacity-70">{w.desc}</p>
                    </button>
                  ))}
                </div>
                {settings.workHours === "custom" && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-on-surface-variant">Start</label>
                      <input type="number" value={settings.customStartHour} onChange={e => { const v = Number(e.target.value); update("customStartHour", v); update("activeHoursStart", v) }}
                        min="0" max="23" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-primary" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-on-surface-variant">End</label>
                      <input type="number" value={settings.customEndHour} onChange={e => { const v = Number(e.target.value); update("customEndHour", v); update("activeHoursEnd", v) }}
                        min="0" max="23" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold outline-none focus:border-primary" />
                    </div>
                  </div>
                )}
              </div>

              {/* Water Reminders */}
              <div className="bg-sky-50/50 border border-sky-200/50 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                    💧 Water Reminders
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.waterEnabled} onChange={e => update("waterEnabled", e.target.checked)} className="sr-only peer" />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-sky-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
                </div>
                {settings.waterEnabled && (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-on-surface-variant shrink-0">Interval</span>
                      <input type="number" value={settings.waterInterval} onChange={e => update("waterInterval", Number(e.target.value))}
                        min="1" className="w-16 h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center outline-none focus:border-primary" />
                      <span className="text-[10px] font-semibold text-on-surface-variant">min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-on-surface-variant shrink-0">Daily goal override</span>
                      <input type="number" value={settings.waterGoalOverride} onChange={e => update("waterGoalOverride", Number(e.target.value))}
                        min="0" step="0.1" className="w-16 h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center outline-none focus:border-primary" />
                      <span className="text-[10px] font-semibold text-on-surface-variant">L</span>
                    </div>
                  </>
                )}
              </div>

              {/* Eye Care */}
              <div className="bg-indigo-50/50 border border-indigo-200/50 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                    👁️ Eye Care
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings.eyeCareEnabled} onChange={e => update("eyeCareEnabled", e.target.checked)} className="sr-only peer" />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-indigo-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
                </div>
                {settings.eyeCareEnabled && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-on-surface-variant shrink-0">Interval</span>
                    <input type="number" value={settings.eyeCareInterval} onChange={e => update("eyeCareInterval", Number(e.target.value))}
                      min="1" className="w-16 h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center outline-none focus:border-primary" />
                    <span className="text-[10px] font-semibold text-on-surface-variant">min</span>
                  </div>
                )}
              </div>

              {/* Active Hours */}
              <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-3.5 space-y-2">
                <p className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  🕐 Active Hours
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[9px] font-bold text-on-surface-variant">Start</label>
                    <input type="number" value={settings.activeHoursStart} onChange={e => update("activeHoursStart", Number(e.target.value))}
                      min="0" max="23" className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center outline-none focus:border-primary" />
                  </div>
                  <span className="text-xs text-on-surface-variant mt-5">to</span>
                  <div className="flex-1">
                    <label className="text-[9px] font-bold text-on-surface-variant">End</label>
                    <input type="number" value={settings.activeHoursEnd} onChange={e => update("activeHoursEnd", Number(e.target.value))}
                      min="0" max="23" className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center outline-none focus:border-primary" />
                  </div>
                </div>
              </div>

              <button type="button" onClick={toggleRunning}
                className={`w-full h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  running
                    ? "bg-rose-500 hover:bg-rose-600 text-white"
                    : "bg-primary hover:bg-primary-container text-white"
                }`}>
                {running ? <><Pause className="w-4 h-4" /> Stop Reminders</> : <><Play className="w-4 h-4" /> Start Reminders</>}
              </button>

              {/* Quick Add */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-on-surface-variant">🍶 Quick add water</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ADD.map(q => (
                    <button key={q.label} type="button" onClick={() => onUpdateWater(q.ml)}
                      className="px-3 h-8 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg text-[10px] font-bold text-sky-700 transition-all cursor-pointer">
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface">Progress</span>
                  <span className="text-[10px] font-bold text-on-surface-variant">{settings.dayStreak} Day Streak</span>
                </div>
                {settings.eyeCareEnabled && (
                  <div className="flex items-center justify-between text-[10px] text-on-surface-variant">
                    <span>👁️ Eye breaks today</span>
                    <span className="font-bold">{settings.eyeBreaksToday}</span>
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between text-[10px] text-on-surface-variant mb-1">
                    <span>{waterLoggedMl / 1000}L / {effectiveGoal / 1000}L</span>
                    <span className="font-bold">{remaining > 0 ? `${(remaining / 1000).toFixed(2)}L remaining` : "✅ Goal met!"}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.5 }}
                      className={`h-full rounded-full ${progressPct >= 100 ? "bg-emerald-500" : "bg-sky-500"}`} />
                  </div>
                </div>
              </div>

              {/* Active Reminders */}
              {(settings.waterEnabled || settings.eyeCareEnabled) && running && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold text-on-surface-variant">🔔 Active Reminders</p>
                  {settings.waterEnabled && (
                    <div className="flex items-center justify-between px-3 py-2 bg-sky-50 rounded-lg border border-sky-200">
                      <div className="flex items-center gap-2">
                        <Droplets className="w-4 h-4 text-sky-500" />
                        <div>
                          <p className="text-[10px] font-bold text-on-surface">Hydration reminder</p>
                          <p className="text-[8px] text-on-surface-variant">Every {settings.waterInterval}min · {settings.activeHoursStart}:00–{settings.activeHoursEnd}:00</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-sky-600">{settings.waterInterval}m</span>
                    </div>
                  )}
                  {settings.eyeCareEnabled && (
                    <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 rounded-lg border border-indigo-200">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-indigo-500" />
                        <div>
                          <p className="text-[10px] font-bold text-on-surface">20-20-20 eye break</p>
                          <p className="text-[8px] text-on-surface-variant">Every {settings.eyeCareInterval}min · 20-20-20 rule</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-indigo-600">{settings.eyeCareInterval}m</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
