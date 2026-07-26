import { useState } from "react"
import { motion } from "motion/react"
import { Bell, X } from "lucide-react"

export interface ProfileReminder {
  timeOfDay: string
  frequency: string
  repeatDays: string[]
  startDate: string
  endDate: string | null
}

interface ReminderModalProps {
  open: boolean
  onClose: () => void
  medicationName: string
  medicationStrength: string
  onSave: (reminder: ProfileReminder) => void
  initial?: ProfileReminder
}

const TIME_OPTIONS = [
  "Before Breakfast", "After Breakfast",
  "Before Lunch", "After Lunch",
  "Before Dinner", "After Dinner",
  "Bedtime",
]

const FREQ_OPTIONS = ["Once Daily", "Twice Daily", "Three Times Weekly", "Weekly", "Custom"]
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function emptyReminder(): ProfileReminder {
  return {
    timeOfDay: "Before Breakfast",
    frequency: "Once Daily",
    repeatDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    startDate: new Date().toISOString().split("T")[0],
    endDate: null,
  }
}

export default function ReminderModal({
  open,
  onClose,
  medicationName,
  medicationStrength,
  onSave,
  initial,
}: ReminderModalProps) {
  const [reminder, setReminder] = useState<ProfileReminder>(initial || emptyReminder())
  const [dateError, setDateError] = useState<string | null>(null)

  if (!open) return null

  const update = (field: keyof ProfileReminder, value: any) => {
    setReminder(prev => ({ ...prev, [field]: value }))
  }

  const toggleDay = (day: string) => {
    const current = reminder.repeatDays
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day]
    update("repeatDays", updated)
  }

  const handleSave = () => {
    if (reminder.endDate && reminder.startDate > reminder.endDate) {
      setDateError("Start date must be before end date")
      return
    }
    setDateError(null)
    onSave(reminder)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface dark:text-slate-100">Reminder</h3>
                <p className="text-xs text-on-surface-variant dark:text-slate-400 font-medium">
                  {medicationName}{medicationStrength ? `, ${medicationStrength}` : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">
              Time of Day
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TIME_OPTIONS.map(t => {
                const active = reminder.timeOfDay === t
                return (
                  <button key={t} type="button" onClick={() => update("timeOfDay", t)}
                    className={`px-3 h-9 rounded-full border text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? "bg-primary border-primary text-white"
                        : "bg-transparent border-slate-200 dark:border-slate-700 text-on-surface dark:text-slate-300 hover:border-primary/50"
                    }`}>
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">
              Frequency
            </label>
            <select value={reminder.frequency} onChange={e => update("frequency", e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary outline-none text-sm font-semibold appearance-none">
              {FREQ_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">
              Repeat On
            </label>
            <div className="flex gap-2">
              {DAYS.map(d => {
                const active = reminder.repeatDays.includes(d)
                return (
                  <button key={d} type="button" onClick={() => toggleDay(d)}
                    className={`w-10 h-10 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                      active
                        ? "bg-primary text-white"
                        : "bg-transparent border border-slate-200 dark:border-slate-700 text-on-surface dark:text-slate-300 hover:border-primary/50"
                    }`}>
                    {d}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">
              Duration
            </label>
            <div className="flex gap-3">
              <div className="flex-1">
                <input type="date" value={reminder.startDate} onChange={e => { setDateError(null); update("startDate", e.target.value) }}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary outline-none text-sm font-semibold" />
              </div>
              <div className="flex-1">
                <input type="date" value={reminder.endDate || ""} onChange={e => { setDateError(null); update("endDate", e.target.value || null) }}
                  className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary outline-none text-sm font-semibold" />
              </div>
            </div>
            {dateError && (
              <p className="text-[10px] font-semibold text-red-500 mt-0.5">{dateError}</p>
            )}
            <p className="text-[9px] text-on-surface-variant dark:text-slate-500">Start — End date (leave end blank for ongoing)</p>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button type="button" onClick={onClose}
            className="flex-1 h-11 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer">
            Cancel
          </button>
          <button type="button" onClick={handleSave}
            className="flex-1 h-11 text-sm font-semibold text-white bg-primary hover:bg-primary-container rounded-xl transition-colors shadow-md shadow-primary/15 cursor-pointer">
            Save Reminder
          </button>
        </div>
      </motion.div>
    </div>
  )
}
