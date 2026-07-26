import { useState, useRef, useEffect, useCallback } from "react"
import { MedicationInput, type Medication } from "../ui/MedicationInput"
import { ChevronDown, Check, X, Search } from "lucide-react"

export interface Step2Data {
  activeDiseases: string[]
  otherDisease: string
  medicalHistory: string
  medications: Medication[]
  noMedication: boolean
}

interface Step2Props {
  data: Step2Data
  onChange: (data: Step2Data) => void
}

const allDiseases = [
  "Diabetes Type 2", "High Blood Pressure", "Thyroid",
  "Diabetes Type 1", "Prediabetes",
  "Low Blood Pressure", "Heart Disease",
  "Asthma", "Kidney Stone",
  "Chronic Kidney Disease", "Fatty Liver", "Arthritis",
  "High Cholesterol", "Obesity", "PCOS", "Migraine",
  "Gastric Issues", "Acid Reflux (GERD)", "Anemia",
  "Vitamin D Deficiency", "Vitamin B12 Deficiency",
]

export function Step2MedicalInfo({ data, onChange }: Step2Props) {
  const [showDiseaseDropdown, setShowDiseaseDropdown] = useState(false)
  const [diseaseSearch, setDiseaseSearch] = useState("")
  const diseasesRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!showDiseaseDropdown) return
    const handleClick = (e: MouseEvent) => {
      if (diseasesRef.current && !diseasesRef.current.contains(e.target as Node)) {
        setShowDiseaseDropdown(false)
        setDiseaseSearch("")
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [showDiseaseDropdown])

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.max(el.scrollHeight, 64) + "px"
  }, [])

  useEffect(() => {
    autoResize()
  }, [data.medicalHistory, autoResize])

  const update = (field: keyof Step2Data, value: any) => {
    onChange({ ...data, [field]: value })
  }

  const toggleDisease = (disease: string) => {
    const current = data.activeDiseases
    const updated = current.includes(disease)
      ? current.filter(d => d !== disease)
      : [...current, disease]
    update("activeDiseases", updated)
  }

  const removeDisease = (disease: string) => {
    update("activeDiseases", data.activeDiseases.filter(d => d !== disease))
  }

  const filteredDiseases = diseaseSearch
    ? allDiseases.filter(d => d.toLowerCase().includes(diseaseSearch.toLowerCase()))
    : allDiseases

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-extrabold text-on-surface dark:text-slate-100">
          Help us understand your health
        </h2>
        <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
          This information improves AI accuracy.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
          Active Diseases / Conditions
        </label>
        <div ref={diseasesRef} className="relative">
          <button
            type="button"
            onClick={() => setShowDiseaseDropdown(!showDiseaseDropdown)}
            className="w-full min-h-[40px] px-4 py-2.5 flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-left text-sm font-semibold text-on-surface-variant dark:text-slate-400 hover:border-primary/50 transition-all cursor-pointer"
          >
            <span className="flex-1 truncate">
              {data.activeDiseases.length > 0
                ? data.activeDiseases.join(", ")
                : "Search or select conditions..."}
            </span>
            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${showDiseaseDropdown ? "rotate-180" : ""}`} />
          </button>

          {showDiseaseDropdown && (
            <div className="absolute top-full left-0 mt-1 z-20 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={diseaseSearch}
                  onChange={e => setDiseaseSearch(e.target.value)}
                  placeholder="Search conditions..."
                  className="flex-1 bg-transparent text-xs font-semibold text-on-surface dark:text-slate-200 outline-none placeholder:text-slate-400"
                  autoFocus
                />
              </div>
              <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5">
                {filteredDiseases.map(disease => {
                  const active = data.activeDiseases.includes(disease)
                  return (
                    <button
                      key={disease}
                      type="button"
                      onClick={() => toggleDisease(disease)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        active ? "bg-primary border-primary" : "border-slate-300 dark:border-slate-600"
                      }`}>
                        {active && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs font-semibold text-on-surface dark:text-slate-200">{disease}</span>
                    </button>
                  )
                })}
                {filteredDiseases.length === 0 && (
                  <div className="flex items-center gap-2 px-3 py-2">
                    <input
                      type="text"
                      value={data.otherDisease}
                      onChange={e => {
                        const val = e.target.value
                        update("otherDisease", val)
                        if (val.trim() && !data.activeDiseases.includes(val.trim())) {
                          update("activeDiseases", [...data.activeDiseases, val.trim()])
                        }
                      }}
                      placeholder="Add custom condition..."
                      className="flex-1 h-8 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-semibold outline-none focus:border-primary"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {data.activeDiseases.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.activeDiseases.map(d => (
              <span key={d}
                className="inline-flex items-center gap-1 h-[32px] px-2.5 bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-full text-[10px] font-bold text-primary"
              >
                {d}
                <button type="button" onClick={() => removeDisease(d)} className="hover:bg-primary/20 rounded-full p-0.5 cursor-pointer">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
          Medical History & Allergies
        </label>
        <textarea
          ref={textareaRef}
          value={data.medicalHistory}
          onChange={e => { update("medicalHistory", e.target.value); autoResize() }}
          placeholder="E.g. Diabetes Type 2 diagnosed in 2021, penicillin allergy, appendix surgery in 2018, family history of hypertension..."
          rows={2}
          className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-700 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary focus:bg-white dark:focus:bg-slate-900 outline-none font-semibold text-sm resize-y min-h-[64px] cursor-text"
        />
        <p className="text-[10px] text-on-surface-variant dark:text-slate-500 italic">
          Include previous illnesses, surgeries, allergies, family medical history, or chronic conditions.
        </p>
      </div>

      <MedicationInput
        medications={data.medications}
        onChange={val => update("medications", val)}
        noMedication={data.noMedication}
        onNoMedicationChange={val => update("noMedication", val)}
        activeDiseases={data.activeDiseases}
      />
    </div>
  )
}
