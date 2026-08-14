import { motion } from "motion/react"

interface ChipSelectProps {
  label?: string
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  allowOther?: boolean
  otherValue?: string
  onOtherChange?: (value: string) => void
  size?: "sm" | "md"
  className?: string
}

export function ChipSelect({
  label,
  options,
  selected,
  onChange,
  allowOther,
  otherValue,
  onOtherChange,
  size = "md",
  className = "",
}: ChipSelectProps) {
  const toggleOption = (opt: string) => {
    if (opt === "No Preference" || opt === "No Current Medication") {
      onChange([opt])
      return
    }
    let updated = selected.filter(s => s !== "No Preference" && s !== "No Current Medication")
    if (updated.includes(opt)) {
      updated = updated.filter(s => s !== opt)
      if (updated.length === 0) updated = []
    } else {
      updated.push(opt)
    }
    onChange(updated)
  }

  const isSelected = (opt: string) => selected.includes(opt)
  const hasNonNone = selected.length > 0 && !selected.includes("No Preference") && !selected.includes("No Current Medication")

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider px-1">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-1">
        {options.map(opt => {
          const active = isSelected(opt)
          const isNoneOpt = opt === "No Preference" || opt === "No Current Medication"
          const show = !isNoneOpt || !hasNonNone
          if (!show) return null
          return (
            <motion.button
              key={opt}
              type="button"
              onClick={() => toggleOption(opt)}
              whileTap={{ scale: 0.95 }}
              className={`h-[44px] px-3 rounded-full border font-bold transition-all cursor-pointer select-none flex items-center ${
                size === "sm" ? "text-[10px]" : "text-xs"
              } ${
                active
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-slate-50 border-slate-200 text-on-surface-variant hover:border-primary/50 hover:bg-slate-100"
              }`}
            >
              {opt}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
