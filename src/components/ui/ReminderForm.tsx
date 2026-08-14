import { useState } from "react"
import { Bell, ChevronDown, ChevronRight, X, Plus, Clock } from "lucide-react"
import { type MedicationReminder } from "../../types"

const FREQUENCIES = ["Once Daily", "Twice Daily", "Three Times Daily", "Four Times Daily", "Weekly", "Monthly", "Custom"] as const
const FOOD_RELATIONS = ["Empty Stomach", "Before Meal", "After Meal", "With Food", "Bedtime", "Any Time"] as const
const MEALS = ["Breakfast", "Lunch", "Dinner"] as const
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const
const SNOOZE_OPTIONS = [5, 10, 15, 30] as const

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function emptyReminder(): Omit<MedicationReminder, "id" | "medicationId" | "userId"> {
  return {
    reminderName: "",
    frequency: "Once Daily",
    times: ["09:00"],
    foodRelation: "Any Time",
    mealSelection: [],
    startDate: new Date().toISOString().split("T")[0],
    endDate: null,
    noEndDate: true,
    repeatDays: [...weekdays],
    notificationSound: "default",
    snooze: 10,
    notes: "",
    enabled: true,
  }
}

interface ReminderFormProps {
  reminders: Omit<MedicationReminder, "id" | "medicationId" | "userId">[]
  onChange: (reminders: Omit<MedicationReminder, "id" | "medicationId" | "userId">[]) => void
  medicationName: string
  activeDiseases?: string[]
}

export function ReminderForm({ reminders, onChange, medicationName, activeDiseases }: ReminderFormProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(reminders.length > 0 ? 0 : null)

  const update = (index: number, field: string, value: any) => {
    onChange(reminders.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  const add = () => {
    const newReminder = { ...emptyReminder(), reminderName: medicationName }
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

  const toggleMeal = (index: number, meal: string) => {
    const current = reminders[index].mealSelection
    const updated = current.includes(meal as any) ? current.filter(m => m !== meal) : [...current, meal]
    update(index, "mealSelection", updated)
  }

  const getTimeCount = (freq: string) => {
    if (freq === "Twice Daily") return 2
    if (freq === "Three Times Daily") return 3
    if (freq === "Four Times Daily") return 4
    return null
  }

  const syncTimesToFrequency = (index: number, freq: string) => {
    const count = getTimeCount(freq)
    if (count && reminders[index].times.length !== count) {
      const times = Array.from({ length: count }, (_, i) => reminders[index].times[i] || "09:00")
      update(index, "times", times)
    }
  }

  const showFoodMeals = (relation: string) => {
    return ["Before Meal", "After Meal", "With Food"].includes(relation)
  }

  if (reminders.length === 0) {
    return (
      <button type="button" onClick={add}
        className="w-full h-8 border-2 border-dashed border-slate-300 rounded-lg text-[10px] font-bold text-on-surface-variant hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-1 cursor-pointer">
        <Bell className="w-3 h-3" />
        Add Medication Reminder
      </button>
    )
  }

  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
        <Bell className="w-3 h-3" />
        Medication Reminder{reminders.length > 1 ? "s" : ""}
        <span className="text-primary font-semibold">({reminders.length})</span>
        <button type="button" onClick={add}
          className="ml-auto text-[9px] text-primary hover:text-primary-container font-bold underline-offset-2 hover:underline cursor-pointer">
          + Add
        </button>
      </label>

      <div className="space-y-1">
        {reminders.map((rem, i) => {
          const isExpanded = expandedIndex === i
          const summary = `${rem.times[0] || "—"} • ${rem.frequency}${rem.foodRelation !== "Any Time" ? ` • ${rem.foodRelation}` : ""}`

          return (
            <div key={i} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              {isExpanded ? (
                <div className="p-2.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => setExpandedIndex(null)}
                        className="p-0.5 text-slate-400 hover:text-primary transition-colors cursor-pointer">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[9px] font-bold text-primary uppercase">Reminder #{i + 1}</span>
                    </div>
                    <button type="button" onClick={() => remove(i)}
                      className="p-0.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-500 transition-colors cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2 space-y-0.5">
                      <label className="text-[8px] font-bold text-on-surface-variant uppercase">Reminder Name</label>
                      <input type="text" value={rem.reminderName} onChange={e => update(i, "reminderName", e.target.value)}
                        className="w-full h-7 px-2.5 bg-slate-50 border border-slate-200 text-on-surface rounded-lg focus:border-primary outline-none text-[10px] font-semibold" />
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[8px] font-bold text-on-surface-variant uppercase">Frequency</label>
                      <select value={rem.frequency} onChange={e => { const v = e.target.value; update(i, "frequency", v); syncTimesToFrequency(i, v) }}
                        className="w-full h-7 px-2.5 bg-slate-50 border border-slate-200 text-on-surface rounded-lg focus:border-primary outline-none text-[10px] font-semibold">
                        {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[8px] font-bold text-on-surface-variant uppercase">Food Relation</label>
                      <select value={rem.foodRelation} onChange={e => update(i, "foodRelation", e.target.value)}
                        className="w-full h-7 px-2.5 bg-slate-50 border border-slate-200 text-on-surface rounded-lg focus:border-primary outline-none text-[10px] font-semibold">
                        {FOOD_RELATIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[8px] font-bold text-on-surface-variant uppercase">Reminder Time{rem.times.length > 1 ? "s" : ""}</label>
                    <div className="flex flex-wrap gap-1">
                      {rem.times.map((t, tIdx) => (
                        <div key={tIdx} className="flex items-center gap-0.5">
                          <input type="time" value={t} onChange={e => updateTime(i, tIdx, e.target.value)}
                            className="w-[100px] h-7 px-2 bg-slate-50 border border-slate-200 text-on-surface rounded-lg focus:border-primary outline-none text-[10px] font-semibold" />
                          {rem.times.length > 1 && (
                            <button type="button" onClick={() => removeTime(i, tIdx)}
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

                  {showFoodMeals(rem.foodRelation) && (
                    <div className="space-y-0.5">
                      <label className="text-[8px] font-bold text-on-surface-variant uppercase">Meal</label>
                      <div className="flex gap-1">
                        {MEALS.map(m => {
                          const active = rem.mealSelection.includes(m)
                          return (
                            <button key={m} type="button" onClick={() => toggleMeal(i, m)}
                              className={`px-2 h-6 rounded-lg border text-[8px] font-bold transition-all cursor-pointer ${active ? "bg-primary/10 border-primary/40 text-primary" : "bg-slate-50 border-slate-200 text-on-surface-variant"}`}>
                              {m}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[8px] font-bold text-on-surface-variant uppercase">Start Date</label>
                      <input type="date" value={rem.startDate} onChange={e => update(i, "startDate", e.target.value)}
                        className="w-full h-7 px-2.5 bg-slate-50 border border-slate-200 text-on-surface rounded-lg focus:border-primary outline-none text-[10px] font-semibold" />
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[8px] font-bold text-on-surface-variant uppercase">End Date</label>
                      <div className="flex items-center gap-1">
                        <input type="date" value={rem.endDate || ""} onChange={e => update(i, "endDate", e.target.value || null)}
                          disabled={rem.noEndDate}
                          className="w-full h-7 px-2.5 bg-slate-50 border border-slate-200 text-on-surface rounded-lg focus:border-primary outline-none text-[10px] font-semibold disabled:opacity-40" />
                        <label className="flex items-center gap-1 text-[8px] text-on-surface-variant cursor-pointer shrink-0">
                          <input type="checkbox" checked={rem.noEndDate} onChange={e => update(i, "noEndDate", e.target.checked)}
                            className="rounded text-primary w-3 h-3" />
                          Ongoing
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[8px] font-bold text-on-surface-variant uppercase">Repeat Days</label>
                    <div className="flex gap-1">
                      {DAYS.map(d => {
                        const active = rem.repeatDays.includes(d)
                        return (
                          <button key={d} type="button" onClick={() => toggleDay(i, d)}
                            className={`w-7 h-6 rounded-lg text-[8px] font-bold transition-all cursor-pointer ${active ? "bg-primary/10 border border-primary/40 text-primary" : "bg-slate-50 border border-slate-200 text-on-surface-variant"}`}>
                            {d}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[8px] font-bold text-on-surface-variant uppercase">Snooze (min)</label>
                      <select value={rem.snooze} onChange={e => update(i, "snooze", Number(e.target.value))}
                        className="w-full h-7 px-2.5 bg-slate-50 border border-slate-200 text-on-surface rounded-lg focus:border-primary outline-none text-[10px] font-semibold">
                        {SNOOZE_OPTIONS.map(s => <option key={s} value={s}>{s} min</option>)}
                      </select>
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-[8px] font-bold text-on-surface-variant uppercase">Sound</label>
                      <select value={rem.notificationSound} onChange={e => update(i, "notificationSound", e.target.value)}
                        className="w-full h-7 px-2.5 bg-slate-50 border border-slate-200 text-on-surface rounded-lg focus:border-primary outline-none text-[10px] font-semibold">
                        <option value="default">Default</option>
                        <option value="gentle">Gentle Chime</option>
                        <option value="urgent">Urgent</option>
                        <option value="none">Silent</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[8px] font-bold text-on-surface-variant uppercase">Notes <span className="font-normal normal-case">(optional)</span></label>
                    <input type="text" value={rem.notes} onChange={e => update(i, "notes", e.target.value)} placeholder="Take with plenty of water"
                      className="w-full h-7 px-2.5 bg-slate-50 border border-slate-200 text-on-surface rounded-lg focus:border-primary outline-none text-[10px] font-semibold" />
                  </div>

                  <label className="flex items-center gap-1.5 cursor-pointer pt-0.5">
                    <input type="checkbox" checked={rem.enabled} onChange={e => update(i, "enabled", e.target.checked)}
                      className="rounded text-primary focus:ring-primary/30 w-3 h-3" />
                    <span className="text-[8px] font-bold text-on-surface-variant">Reminder Active</span>
                  </label>
                </div>
              ) : (
                <button type="button" onClick={() => setExpandedIndex(i)}
                  className="w-full flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50 transition-colors cursor-pointer text-left">
                  <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                  <Clock className="w-3 h-3 text-primary shrink-0" />
                  <span className="text-[10px] font-semibold text-on-surface truncate flex-1">{summary}</span>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${rem.enabled ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
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
