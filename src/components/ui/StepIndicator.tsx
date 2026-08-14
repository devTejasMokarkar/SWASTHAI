interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-2 mb-6">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1
          const isActive = stepNum === currentStep
          const isCompleted = stepNum < currentStep
          return (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-primary shadow-[0_0_8px_-2px_rgba(79,70,229,0.6)] scale-125"
                    : isCompleted
                      ? "bg-primary/60"
                      : "bg-slate-300"
                }`}
              />
              {i < totalSteps - 1 && (
                <div
                  className={`w-6 h-[2px] rounded-full transition-colors duration-300 ${
                    isCompleted ? "bg-primary/60" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>
      <span className="text-[10px] font-bold text-on-surface-variant tracking-wide">
        Step {currentStep} of {totalSteps}
      </span>
    </div>
  )
}
