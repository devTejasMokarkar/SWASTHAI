import { useState } from "react"
import { motion } from "motion/react"
import { Pill, X } from "lucide-react"

interface MedicationFormData {
  name: string
  strength: string
  timing: string
}

interface MedicationFormModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: MedicationFormData) => void
  initial?: MedicationFormData
}

const STRENGTH_UNITS = ["mg", "mcg", "g", "ml", "%", "IU"]

const TIMING_OPTIONS = [
  "Before Breakfast", "After Breakfast",
  "Before Lunch", "After Lunch",
  "Before Dinner", "After Dinner",
  "Bedtime",
]

function parseStrength(s: string): { num: string; unit: string } {
  const match = s.trim().match(/^([\d.]+)\s*(mg|mcg|g|ml|%|IU)?$/i)
  if (match) return { num: match[1], unit: (match[2] || "mg").toLowerCase() }
  return { num: s.replace(/\s*(mg|mcg|g|ml|%|IU).*/i, "").trim(), unit: "mg" }
}

export type { MedicationFormData }

export default function MedicationFormModal({
  open,
  onClose,
  onSave,
  initial,
}: MedicationFormModalProps) {
  const parsed = parseStrength(initial?.strength || "")
  const [name, setName] = useState(initial?.name || "")
  const [strengthNum, setStrengthNum] = useState(parsed.num)
  const [strengthUnit, setStrengthUnit] = useState(parsed.unit)
  const [timing, setTiming] = useState(initial?.timing || "After Breakfast")
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleSave = () => {
    if (!name.trim()) {
      setError("Medicine name is required")
      return
    }
    if (!strengthNum) {
      setError("Strength is required")
      return
    }
    setError(null)
    onSave({ name: name.trim(), strength: `${strengthNum} ${strengthUnit}`, timing })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
                <Pill className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-on-surface dark:text-slate-100">
                {initial ? "Edit Medication" : "Add Medication"}
              </h3>
            </div>
            <button type="button" onClick={onClose}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Medicine Name</label>
              <input type="text" value={name} onChange={e => { setError(null); setName(e.target.value) }}
                placeholder="e.g. Metformin"
                className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary outline-none text-sm font-semibold" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Strength</label>
              <div className="flex gap-2">
                <input type="number" value={strengthNum} onChange={e => { setError(null); setStrengthNum(e.target.value) }}
                  placeholder="500" min="0" step="0.1"
                  className="flex-1 h-11 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary outline-none text-sm font-semibold" />
                <select value={strengthUnit} onChange={e => setStrengthUnit(e.target.value)}
                  className="w-20 h-11 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary outline-none text-sm font-semibold appearance-none cursor-pointer">
                  {STRENGTH_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Timing</label>
              <div className="flex flex-wrap gap-1.5">
                {TIMING_OPTIONS.map(t => {
                  const active = timing === t
                  return (
                    <button key={t} type="button" onClick={() => setTiming(t)}
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
          </div>

          {error && <p className="text-[11px] font-semibold text-red-500">{error}</p>}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button type="button" onClick={onClose}
            className="flex-1 h-11 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer">
            Cancel
          </button>
          <button type="button" onClick={handleSave}
            className="flex-1 h-11 text-sm font-semibold text-white bg-primary hover:bg-primary-container rounded-xl transition-colors shadow-md shadow-primary/15 cursor-pointer">
            {initial ? "Save Changes" : "Add Medicine"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
