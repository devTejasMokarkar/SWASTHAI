import { useState } from "react"
import { Bell, Plus, X, ChevronDown, ChevronRight, Clock } from "lucide-react"
import { type HealthReminder } from "../../types"

const REMINDER_TYPES = [
  "Drink Water", "Exercise", "Walk", "Blood Sugar Check",
  "Blood Pressure Check", "Weight Check", "Sleep",
  "Doctor Appointment", "Lab Test", "Refill Medicine", "Custom",
] as const

const FREQUENCIES = ["Once Daily", "Twice Daily", "Three Times Daily", "Custom"] as const
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

interface HealthReminderInputProps {
  reminders: HealthReminder[]
  onChange: (reminders: HealthReminder[]) => void
}

function emptyReminder(): Omit<HealthReminder, "id" | "userId"> {
  return {
    type: "Drink Water",
    customLabel: "",
    times: ["09:00"],
    frequency: "Once Daily",
    repeatDays: [...weekdays],
    notes: "",
    enabled: true,
  }
}

export function HealthReminderInput({ reminders, onChange }: HealthReminderInputProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(reminders.length > 0 ? 0 : null)

  const update = (index: number, field: string, value: any) => {
    onChange(reminders.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  const add = () => {
    const newReminder = emptyReminder() as HealthReminder
    onChange([...reminders, newReminder])
    setExpandedIndex(reminders.length)
  }

  const remove = (index: number) => {
    onChange(reminders.filter((_, i) => i !== index))
    if (expandedIndex === index) setExpandedIndex(reminders.length > 0 ? Math.min(index, reminders.length - 1) : null)
  }

  const addTime = (index: number) => {
    update(index, "times", [...reminders[index].times, "12:00"])
  }

  const updateTime = (index: number, timeIdx: number, value: string) => {
    const times = [...reminders[index].times]
    times[timeIdx] = value
    update(index, "times", times)
  }

  const removeTime = (index: number, timeIdx: number) => {
    const times = reminders[index].times.filter((_, i) => i !== timeIdx)
    update(index, "times", times.length > 0 ? times : ["09:00"])
  }

  const toggleDay = (index: number, day: string) => {
    const current = reminders[index].repeatDays
    const updated = current.includes(day) ? current.filter(d => d !== day) : [...current, day]
    update(index, "repeatDays", updated)
  }

  const icons: Record<string, string> = {
    "Drink Water": "💧", "Exercise": "🏃", "Walk": "🚶", "Blood Sugar Check": "🩸",
    "Blood Pressure Check": "❤️", "Weight Check": "⚖️", "Sleep": "😴",
    "Doctor Appointment": "🏥", "Lab Test": "🔬", "Refill Medicine": "💊", "Custom": "📌",
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
          <Bell className="w-3 h-3" />
          Health Reminders
        </label>
        <button type="button" onClick={add}
          className="text-[10px] font-bold text-primary hover:text-primary-container flex items-center gap-0.5 cursor-pointer">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>

      <div className="space-y-1">
        {reminders.length === 0 && (
          <p className="text-[10px] text-on-surface-variant dark:text-slate-500 italic">No health reminders set.</p>
        )}
        {reminders.map((rem, i) => {
          const isExpanded = expandedIndex === i
          return (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              {isExpanded ? (
                <div className="p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setExpandedIndex(null)}
                        className="p-0.5 text-slate-400 hover:text-primary transition-colors cursor-pointer">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[9px] font-bold text-primary uppercase">Health Reminder #{i + 1}</span>
                    </div>
                    <button type="button" onClick={() => remove(i)}
                      className="p-0.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded text-slate-400 hover:text-rose-500 transition-colors cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[8px] font-bold text-on-surface-variant uppercase">Type</label>
                      <select value={rem.type} onChange={e => update(i, "type", e.target.value)}
                        className="w-full h-7 px-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-on-surface dark:text-slate-100 rounded-lg focus:border-primary outline-none text-[10px] font-semibold">
                        {REMINDER_TYPES.map(t => <option key={t} value={t}>{icons[t]} {t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[8px] font-bold text-on-surface-variant uppercase">Frequency</label>
                      <select value={rem.frequency} onChange={e => update(i, "frequency", e.target.value)}
                        className="w-full h-7 px-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-on-surface dark:text-slate-100 rounded-lg focus:border-primary outline-none text-[10px] font-semibold">
                        {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>

                  {rem.type === "Custom" && (
                    <div className="space-y-0.5">
                      <label className="text-[8px] font-bold text-on-surface-variant uppercase">Custom Label</label>
                      <input type="text" value={rem.customLabel || ""} onChange={e => update(i, "customLabel", e.target.value)} placeholder="e.g. Stretch breaks"
                        className="w-full h-7 px-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-on-surface dark:text-slate-100 rounded-lg focus:border-primary outline-none text-[10px] font-semibold" />
                    </div>
                  )}

                  <div className="space-y-0.5">
                    <label className="text-[8px] font-bold text-on-surface-variant uppercase">Time{rem.times.length > 1 ? "s" : ""}</label>
                    <div className="flex flex-wrap gap-1">
                      {rem.times.map((t, tIdx) => (
                        <div key={tIdx} className="flex items-center gap-0.5">
                          <input type="time" value={t} onChange={e => updateTime(i, tIdx, e.target.value)}
                            className="w-[100px] h-7 px-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-on-surface dark:text-slate-100 rounded-lg focus:border-primary outline-none text-[10px] font-semibold" />
                          {rem.times.length > 1 && (
                            <button onClick={() => removeTime(i, tIdx)}
                              className="p-0.5 text-slate-400 hover:text-rose-500 cursor-pointer">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      ))}
                      {rem.frequency === "Custom" && (
                        <button type="button" onClick={() => addTime(i)}
                          className="h-7 px-2 border border-dashed border-slate-300 rounded-lg text-[9px] text-slate-400 hover:text-primary hover:border-primary/50 transition-all flex items-center gap-0.5 cursor-pointer">
                          <Plus className="w-2.5 h-2.5" /> Add
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[8px] font-bold text-on-surface-variant uppercase">Repeat Days</label>
                    <div className="flex gap-1">
                      {DAYS.map(d => {
                        const active = rem.repeatDays.includes(d)
                        return (
                          <button key={d} type="button" onClick={() => toggleDay(i, d)}
                            className={`w-7 h-6 rounded-lg text-[8px] font-bold transition-all cursor-pointer ${active ? "bg-primary/10 border border-primary/40 text-primary" : "bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-on-surface-variant dark:text-slate-400"}`}>
                            {d}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[8px] font-bold text-on-surface-variant uppercase">Notes <span className="font-normal normal-case">(optional)</span></label>
                    <input type="text" value={rem.notes} onChange={e => update(i, "notes", e.target.value)} placeholder="e.g. 30 min walk after lunch"
                      className="w-full h-7 px-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-on-surface dark:text-slate-100 rounded-lg focus:border-primary outline-none text-[10px] font-semibold" />
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer pt-0.5">
                    <input type="checkbox" checked={rem.enabled} onChange={e => update(i, "enabled", e.target.checked)}
                      className="rounded text-primary focus:ring-primary/30 w-3 h-3" />
                    <span className="text-[8px] font-bold text-on-surface-variant">Reminder Active</span>
                  </label>
                </div>
              ) : (
                <button type="button" onClick={() => setExpandedIndex(i)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-950 transition-colors cursor-pointer text-left">
                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-xs">{icons[rem.type] || "📌"}</span>
                  <span className="text-[10px] font-semibold text-on-surface dark:text-slate-200 truncate flex-1">
                    {rem.type === "Custom" ? rem.customLabel || "Custom" : rem.type} • {rem.times[0] || "—"}
                  </span>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${rem.enabled ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                    {rem.enabled ? "On" : "Off"}
                  </span>
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
