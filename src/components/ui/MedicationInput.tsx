import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Plus, X, ChevronDown, ChevronRight, Bell } from "lucide-react"
import { ReminderForm } from "./ReminderForm"
import { type MedicationReminder } from "../../types"
import { getSmartDefaults } from "../../utils/smartDefaults"

export interface Medication {
  name: string
  strength: string
  dosage: string
  timing: string[]
  duration: string
  notes: string
  reminders: Omit<MedicationReminder, "id" | "medicationId" | "userId">[]
}

interface MedicationInputProps {
  medications: Medication[]
  onChange: (medications: Medication[]) => void
  noMedication: boolean
  onNoMedicationChange: (checked: boolean) => void
  activeDiseases?: string[]
}

const dosageOptions = [
  "Once Daily", "Twice Daily", "Three Times Daily",
  "Weekly", "Monthly", "As Needed",
]

const timingOptions = [
  "Before Breakfast", "After Breakfast",
  "Before Lunch", "After Lunch",
  "Before Dinner", "After Dinner",
  "Bedtime",
]

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function emptyMedication(): Medication {
  return { name: "", strength: "", dosage: "", timing: [], duration: "", notes: "", reminders: [] }
}

export function MedicationInput({
  medications,
  onChange,
  noMedication,
  onNoMedicationChange,
  activeDiseases,
}: MedicationInputProps) {
  const [expandedIndex, setExpandedIndex] = useState<number>(() =>
    medications.length > 0 ? 0 : -1
  )

  const updateMed = (index: number, field: keyof Medication, value: any) => {
    onChange(medications.map((m, i) => (i === index ? { ...m, [field]: value } : m)))
  }

  const addMedication = () => {
    const newIdx = medications.length
    onChange([...medications, emptyMedication()])
    setExpandedIndex(newIdx)
  }

  const removeMedication = (index: number) => {
    const updated = medications.filter((_, i) => i !== index)
    onChange(updated)
    if (expandedIndex === index) {
      setExpandedIndex(updated.length > 0 ? Math.min(index, updated.length - 1) : -1)
    }
  }

  const toggleTiming = (index: number, timing: string) => {
    const med = medications[index]
    const updated = med.timing.includes(timing)
      ? med.timing.filter(t => t !== timing)
      : [...med.timing, timing]
    updateMed(index, "timing", updated)
  }

  const handleAddReminder = (medIdx: number) => {
    const med = medications[medIdx]
    const defaults = getSmartDefaults(med.name, activeDiseases || [])
    const reminders = defaults.length > 0 ? defaults : [{
      reminderName: med.name || "Medication",
      frequency: "Once Daily" as const,
      times: ["09:00"],
      foodRelation: "Any Time" as const,
      mealSelection: [],
      startDate: new Date().toISOString().split("T")[0],
      endDate: null,
      noEndDate: true,
      repeatDays: [...weekdays],
      notificationSound: "default",
      snooze: 10,
      notes: "",
      enabled: true,
    }]
    updateMed(medIdx, "reminders", reminders)
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">
          Current Medications
        </label>
        {medications.length > 0 && (
          <span className="text-[10px] font-semibold text-primary">
            {medications.length} Medication{medications.length > 1 ? "s" : ""} Added
          </span>
        )}
      </div>

      {noMedication ? (
        <div className="text-xs text-on-surface-variant dark:text-slate-500 italic py-1">
          Skipped medication details.
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {medications.map((med, i) => {
              const isExpanded = expandedIndex === i
              const summary = [med.name, med.strength, med.dosage, med.duration]
                .filter(Boolean)
                .join(" • ")

              return (
                <motion.div
                  key={i}
                  layout
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
                >
                  {isExpanded ? (
                    <div className="p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedIndex(-1)}
                            className="p-0.5 text-slate-400 hover:text-primary transition-colors cursor-pointer"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                            Medicine #{i + 1}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMedication(i)}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Medicine Name</label>
                          <input type="text" value={med.name} onChange={e => updateMed(i, "name", e.target.value)} placeholder="Metformin"
                            className="w-full h-8 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-on-surface dark:text-slate-100 rounded-lg focus:border-primary outline-none text-xs font-semibold" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Strength</label>
                          <div className="flex gap-1">
                            <input type="number" min="0.1" step="0.1"
                              value={med.strength.replace(/[^0-9.]/g, '')}
                              onChange={e => {
                                const val = e.target.value;
                                const unit = med.strength.replace(/[\d.\s]/g, '').trim() || 'mg';
                                updateMed(i, "strength", val ? `${val} ${unit}` : '');
                              }}
                              placeholder="500"
                              className="flex-1 min-w-0 h-8 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-on-surface dark:text-slate-100 rounded-lg focus:border-primary outline-none text-xs font-semibold"
                            />
                            <select
                              value={med.strength.replace(/[\d.\s]/g, '').trim() || 'mg'}
                              onChange={e => {
                                const num = med.strength.replace(/[a-zA-Z%\/\s]/g, '').trim();
                                const unit = e.target.value;
                                updateMed(i, "strength", num ? `${num} ${unit}` : `${unit}`);
                              }}
                              className="w-14 h-8 px-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-on-surface dark:text-slate-100 rounded-lg focus:border-primary outline-none text-xs font-semibold appearance-none"
                            >
                              <option value="mg">mg</option>
                              <option value="mcg">mcg</option>
                              <option value="g">g</option>
                              <option value="ml">ml</option>
                              <option value="IU">IU</option>
                              <option value="%">%</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Dosage</label>
                          <select value={med.dosage} onChange={e => updateMed(i, "dosage", e.target.value)}
                            className="w-full h-8 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-on-surface dark:text-slate-100 rounded-lg focus:border-primary outline-none text-xs font-semibold appearance-none">
                            <option value="">Select</option>
                            {dosageOptions.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Duration</label>
                          <input type="text" value={med.duration} onChange={e => updateMed(i, "duration", e.target.value)} placeholder="6 months"
                            className="w-full h-8 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-on-surface dark:text-slate-100 rounded-lg focus:border-primary outline-none text-xs font-semibold" />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">Timing</label>
                        <div className="flex flex-wrap gap-1">
                          {timingOptions.map(t => {
                            const active = med.timing.includes(t)
                            return (
                              <button key={t} type="button" onClick={() => toggleTiming(i, t)}
                                className={`px-2 h-[28px] rounded-lg border text-[9px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                                  active
                                    ? "bg-primary/10 dark:bg-primary/20 border-primary/40 text-primary"
                                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-on-surface-variant dark:text-slate-400 hover:border-primary/50"
                                }`}>
                                {t}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="border-t border-slate-200 dark:border-slate-800 pt-2">
                        {med.reminders.length > 0 ? (
                          <ReminderForm
                            reminders={med.reminders}
                            onChange={val => updateMed(i, "reminders", val)}
                            medicationName={med.name}
                            activeDiseases={activeDiseases}
                          />
                        ) : (
                          <button type="button" onClick={() => handleAddReminder(i)}
                            className="w-full h-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-[10px] font-bold text-on-surface-variant dark:text-slate-400 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-1 cursor-pointer">
                            <Bell className="w-3.5 h-3.5" />
                            Add Medication Reminder
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setExpandedIndex(i)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer text-left"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-[10px] font-bold text-primary shrink-0">#{i + 1}</span>
                      <span className="text-xs font-semibold text-on-surface dark:text-slate-200 truncate">
                        {summary || "New medication"}
                      </span>
                      {med.reminders.length > 0 && (
                        <span className="flex items-center gap-0.5 text-[8px] font-bold text-secondary shrink-0">
                          <Bell className="w-2.5 h-2.5" />
                          {med.reminders.length}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); removeMedication(i) }}
                        className="ml-auto p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg text-slate-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </button>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={noMedication}
              onChange={e => onNoMedicationChange(e.target.checked)}
              className="rounded text-primary focus:ring-primary/30 w-3.5 h-3.5 border-slate-300 dark:border-slate-700"
            />
            <span className="text-[10px] font-semibold text-on-surface-variant dark:text-slate-400">
              No Current Medication
            </span>
          </label>
          <button
            type="button"
            onClick={addMedication}
            className="w-full h-9 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-on-surface-variant dark:text-slate-400 hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Another Medicine
          </button>
        </div>
      )}
    </div>
  )
}
