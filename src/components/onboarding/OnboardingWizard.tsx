import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ArrowLeft, ArrowRight, Activity } from "lucide-react"
import { StepIndicator } from "../ui/StepIndicator"
import { Step1PersonalProfile, type Step1Data } from "./Step1PersonalProfile"
import { Step2MedicalInfo, type Step2Data } from "./Step2MedicalInfo"
import { LoginButton } from "../LoginButton"
import { GoogleOneTap } from "../GoogleOneTap"

const STORAGE_KEY = "swasth_onboarding_data"

const defaultStep1: Step1Data = {
  fullName: "",
  dob: "",
  gender: "",
  weight: "",
  height: "",
  dietaryPreferences: [],
  healthGoals: [],
}

const defaultStep2: Step2Data = {
  activeDiseases: [],
  otherDisease: "",
  medicalHistory: "",
  medications: [],
  noMedication: false,
}

interface OnboardingData {
  step1: Step1Data
  step2: Step2Data
}

function loadSavedData(): OnboardingData {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return { step1: defaultStep1, step2: defaultStep2 }
}

export function OnboardingWizard() {
  const [step, setStep] = useState(1)
  const [direction, setDirection] = useState(1)
  const [data, setData] = useState<OnboardingData>(loadSavedData)

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  const updateStep1 = useCallback((step1: Step1Data) => {
    setData(prev => ({ ...prev, step1 }))
  }, [])

  const updateStep2 = useCallback((step2: Step2Data) => {
    setData(prev => ({ ...prev, step2 }))
  }, [])

  const validateStep1 = () => {
    const s1 = data.step1
    const errs: string[] = []
    if (!s1.fullName.trim()) errs.push("Name is required")
    else if (s1.fullName.trim().length < 2) errs.push("Name must be at least 2 characters")
    if (!s1.dob) errs.push("Date of birth is required")
    else {
      const age = Math.floor((Date.now() - new Date(s1.dob).getTime()) / 3.15576e+10)
      if (isNaN(age) || age < 1 || age > 120) errs.push("Enter a valid date of birth")
    }
    if (!s1.gender) errs.push("Gender is required")
    if (s1.weight) {
      const w = parseFloat(s1.weight)
      if (isNaN(w) || w < 20 || w > 300) errs.push("Weight must be 20-300 kg")
    }
    if (s1.height) {
      const h = parseFloat(s1.height)
      if (isNaN(h) || h < 50 || h > 250) errs.push("Height must be 50-250 cm")
    }
    return errs
  }

  const goNext = () => {
    if (step === 1) {
      const errs = validateStep1()
      if (errs.length > 0) return
      sessionStorage.setItem("swasth_pending_profile", JSON.stringify({
        fullName: data.step1.fullName.trim(),
        dob: data.step1.dob,
        gender: data.step1.gender,
        weightKg: data.step1.weight ? parseFloat(data.step1.weight) : null,
        heightCm: data.step1.height ? parseFloat(data.step1.height) : null,
        dietaryPreferences: data.step1.dietaryPreferences.length ? data.step1.dietaryPreferences : ["No Preference"],
        healthGoals: data.step1.healthGoals,
        activeDiseases: data.step2.activeDiseases,
        medicalHistory: data.step2.medicalHistory,
        medications: data.step2.noMedication ? [] : data.step2.medications,
        noMedication: data.step2.noMedication,
      }))
    }
    if (step === 2) {
      sessionStorage.setItem("swasth_pending_profile", JSON.stringify({
        fullName: data.step1.fullName.trim(),
        dob: data.step1.dob,
        gender: data.step1.gender,
        weightKg: data.step1.weight ? parseFloat(data.step1.weight) : null,
        heightCm: data.step1.height ? parseFloat(data.step1.height) : null,
        dietaryPreferences: data.step1.dietaryPreferences.length ? data.step1.dietaryPreferences : ["No Preference"],
        healthGoals: data.step1.healthGoals,
        activeDiseases: data.step2.activeDiseases,
        medicalHistory: data.step2.medicalHistory,
        medications: data.step2.noMedication ? [] : data.step2.medications,
        noMedication: data.step2.noMedication,
      }))
    }
    setDirection(1)
    setStep(s => Math.min(s + 1, 3))
  }

  const goBack = () => {
    setDirection(-1)
    setStep(s => Math.max(s - 1, 1))
  }

  const stepVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 320 : -320,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -320 : 320,
      opacity: 0,
    }),
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary/5 dark:from-slate-950 dark:via-slate-900 dark:to-primary/10 flex items-start justify-center p-4 pt-6 md:pt-10">
      <div className="w-full max-w-lg">
        <div className="text-center mb-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
            <Activity className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-extrabold tracking-tight text-primary">Swasth AI</h1>
        </div>

        {step < 3 && (
          <div className="flex items-center justify-end mb-2">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span>Already registered?</span>
              <LoginButton size="medium" shape="pill" text="signin_with" />
            </div>
          </div>
        )}

        <StepIndicator currentStep={step} totalSteps={3} />

        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-5 md:p-6 min-h-[300px] overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <Step1PersonalProfile
                  data={data.step1}
                  onChange={updateStep1}
                />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <Step2MedicalInfo
                  data={data.step2}
                  onChange={updateStep2}
                />
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={stepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <Activity className="w-6 h-6" />
                  </div>
                  <h2 className="text-base font-extrabold text-on-surface dark:text-slate-100">
                    You're all set!
                  </h2>
                  {data.step1.fullName && (
                    <p className="text-sm font-semibold text-on-surface-variant dark:text-slate-400 mt-1">
                      Profile for {data.step1.fullName}
                      {data.step1.dob && `, ${calculateAge(data.step1.dob)} yrs`}
                    </p>
                  )}
                  <p className="text-xs text-on-surface-variant dark:text-slate-500 mt-1 mb-5">
                    Sign in with Google to save your health profile.
                  </p>

                  <div className="flex justify-center" id="google-signin-button">
                    <LoginButton />
                  </div>

                  <GoogleOneTap />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between mt-3 px-1">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={goBack}
                className="flex items-center gap-1.5 h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-on-surface-variant dark:text-slate-400 hover:border-primary/50 hover:text-primary font-bold text-xs transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Previous
              </button>
            )}
          </div>
          <div>
            {step < 3 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={step === 1 && !data.step1.fullName.trim()}
                className="flex items-center gap-1.5 h-10 px-5 rounded-xl bg-primary hover:bg-primary-container disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white disabled:text-slate-500 font-bold text-xs transition-all shadow-lg shadow-primary/20 hover:shadow-primary/35 cursor-pointer disabled:cursor-not-allowed"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function calculateAge(dob: string): number {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}
