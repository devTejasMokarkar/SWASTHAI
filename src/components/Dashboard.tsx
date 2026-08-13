import React, { useState, useEffect, useMemo } from "react";
import { User, SmartActions, Vitals, Medication, MedicationReminder, HealthReminder, ReminderStatus } from "../types";
import { Activity, Droplet, Pill, Wind, Heart, Footprints, Moon, Flame, Plus, ChevronRight, X, Sparkles, Clock, Calendar, Utensils, Apple, Info, ShieldAlert, Candy, Zap, MessageSquare, Bell, Check, ChevronDown, RotateCcw, Settings } from "lucide-react";
import WellnessHydrationModal from "./WellnessHydrationModal";
import { getDietRecommendation } from "../utils/dietRecommendations";

import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";

const ClockDisplay = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  const formattedDate = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric"
  });
  const formattedTime = now.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true
  });
  return (
    <div className="flex flex-row items-center gap-3 shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/40 dark:border-slate-700/40 px-3 py-2 md:px-4 md:py-2.5 rounded-xl shadow-sm dark:shadow-[0_4px_20px_rgb(0,0,0,0.15)] hover:scale-[1.02] transition-transform duration-300 self-start xl:self-auto">
      <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
        <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
        <span>{formattedDate}</span>
      </div>
      <div className="w-px h-4 md:h-5 bg-slate-300 dark:bg-slate-700"></div>
      <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-black text-on-surface dark:text-slate-200 tracking-wider">
        <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-secondary animate-pulse" />
        <span className="font-mono bg-gradient-to-r from-slate-700 to-slate-500 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">{formattedTime}</span>
      </div>
    </div>
  );
};

const WaterConfetti = () => {
  const colors = ["#3b82f6", "#60a5fa", "#10b981", "#34d399", "#fbbf24", "#f43f5e", "#a855f7"];
  const pieces = Array.from({ length: 100 }).map((_, i) => ({
    id: i,
    color: colors[i % colors.length],
    size: Math.random() * 8 + 6,
    shape: Math.random() > 0.5 ? "circle" : "square",
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: Math.random() * 2.5 + 2,
    xOffset: Math.random() * 300 - 150,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[9999]">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === "circle" ? "50%" : "0%",
            top: "-20px",
          }}
          initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
          animate={{
            y: "110vh",
            x: p.xOffset,
            opacity: [1, 1, 0.8, 0],
            rotate: 720 * (Math.random() > 0.5 ? 1 : -1),
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
};

interface DashboardProps {
  user: User;
  smartActions: SmartActions;
  vitals: Vitals;
  onUpdateWater: (amount: number) => void;
  onToggleAction: (action: "vitaminD" | "breathing") => void;
  onUpdateVitals: (updated: Partial<Vitals>) => void;
  onLogVitalsReading?: (reading: {
    type: "blood_sugar" | "blood_pressure" | "temperature" | "spo2";
    timestamp: string;
    sugarValue?: number;
    sugarUnit?: "mg/dL" | "mmol/L";
    sugarContext?: "Fasting" | "Post-meal" | "Random" | "Bedtime";
    systolic?: number;
    diastolic?: number;
    pulse?: number;
    temperatureValue?: number;
    temperatureUnit?: "F" | "C";
    spo2Value?: number;
  }) => Promise<{ reading: any; analysis: string; isNormal: boolean; severity: string }>;
  onOpenChat?: () => void;
  medications?: Medication[];
  healthReminders?: HealthReminder[];
  onReminderStatus?: (reminderId: string, type: "medication" | "health", action: "taken" | "skipped" | "snoozed") => void;
  loading?: boolean;
}

export default function Dashboard({
  user,
  smartActions,
  vitals,
  onUpdateWater,
  onToggleAction,
  onUpdateVitals,
  onLogVitalsReading,
  onOpenChat,
  medications = [],
  healthReminders = [],
  onReminderStatus,
  loading = false,
}: DashboardProps) {
  const [showLogModal, setShowLogModal] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [logSteps, setLogSteps] = useState(vitals.steps);
  const [logHeartRate, setLogHeartRate] = useState(vitals.heartRate);
  const [logCalories, setLogCalories] = useState(vitals.calories);
  const [showFullReport, setShowFullReport] = useState(false);
  const [showWellnessModal, setShowWellnessModal] = useState(false);
  const [quickLogErrors, setQuickLogErrors] = useState<Record<string, string>>({});
  
  const [prevWater, setPrevWater] = useState(smartActions.waterLoggedMl);
  const [triggerConfetti, setTriggerConfetti] = useState(false);

  useEffect(() => {
    if (smartActions.waterLoggedMl >= smartActions.waterGoalMl && prevWater < smartActions.waterGoalMl) {
      setTriggerConfetti(true);
      
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
      
      const timer = setTimeout(() => setTriggerConfetti(false), 5000);
      setPrevWater(smartActions.waterLoggedMl);
      return () => clearTimeout(timer);
    }
    setPrevWater(smartActions.waterLoggedMl);
  }, [smartActions.waterLoggedMl, smartActions.waterGoalMl, prevWater]);

  const currentHour = new Date().getHours();
  const dietPlan = useMemo(() => getDietRecommendation(user), [user.dietaryPreferences, user.activeDiseases, user.weightKg, user.heightCm]);
  const displayName = user.fullName?.trim() || "there";
  const hasProfileDetails = Boolean(
    user.dietaryPreferences?.length ||
    user.activeDiseases?.length ||
    user.weightKg ||
    user.heightCm ||
    user.healthGoals?.length ||
    user.medicalHistory?.trim()
  );
  const isDiabetic = (user.dietaryPreferences || []).some(p =>
    p.toLowerCase().includes("diabet") || p.toLowerCase().includes("sugar") || p.toLowerCase().includes("glucose") || p.toLowerCase().includes("metformin")
  ) || (user.activeDiseases || []).some(d =>
    d.toLowerCase().includes("diabet")
  );

  let greeting = "Hello";
  let greetingSubtext = hasProfileDetails
    ? "Your dashboard is synced to the latest profile and health data."
    : "Complete your profile to unlock personalized insights and recommendations.";
  if (currentHour >= 5 && currentHour < 12) {
    greeting = "Good morning";
  } else if (currentHour >= 12 && currentHour < 17) {
    greeting = "Good afternoon";
  } else if (currentHour >= 17 && currentHour < 21) {
    greeting = "Good evening";
  } else {
    greeting = "Good night";
  }

  const handleSaveLogs = () => {
    const errs: Record<string, string> = {};
    const s = Number(logSteps);
    if (isNaN(s) || s < 0 || s > 100000) errs.steps = "Steps: 0-100,000";
    const hr = Number(logHeartRate);
    if (isNaN(hr) || hr < 30 || hr > 250) errs.hr = "Heart rate: 30-250 BPM";
    const c = Number(logCalories);
    if (isNaN(c) || c < 0 || c > 10000) errs.calories = "Calories: 0-10,000 kcal";
    setQuickLogErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onUpdateVitals({ steps: s, heartRate: hr, calories: c });
    setShowLogModal(false);
  };

  const todayStr = new Date().toISOString().split("T")[0]
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const todayDay = dayNames[new Date().getDay()]

  const todayReminders: { id: string; time: string; label: string; detail: string; type: "medication" | "health"; status: string }[] = []

  medications.forEach(med => {
    if (med.reminderSet) {
      todayReminders.push({
        id: med.id,
        time: med.dueTime,
        label: med.name,
        detail: med.strength,
        type: "medication",
        status: med.taken ? "taken" : "pending",
      })
    }
  })

  healthReminders.forEach(rem => {
    if (rem.enabled && rem.repeatDays.includes(todayDay)) {
      rem.times.forEach(time => {
        todayReminders.push({
          id: rem.id,
          time,
          label: rem.type === "Custom" ? rem.customLabel || "Custom" : rem.type,
          detail: rem.notes || rem.frequency,
          type: "health",
          status: "pending",
        })
      })
    }
  })

  todayReminders.sort((a, b) => a.time.localeCompare(b.time))
  const takenCount = todayReminders.filter(r => r.status === "taken").length
  const adherencePct = todayReminders.length > 0 ? Math.round((takenCount / todayReminders.length) * 100) : 0

  const handleAction = (id: string, type: "medication" | "health", action: "taken" | "skipped" | "snoozed") => {
    onReminderStatus?.(id, type, action)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
      id="dashboard-view"
    >
      <AnimatePresence>
        {triggerConfetti && <WaterConfetti />}
      </AnimatePresence>

      {/* Flash Greeting Section */}
      <section className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-6 relative" id="greeting-section">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="relative z-10 flex flex-col items-start">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-xl md:text-3xl font-extrabold tracking-tight flex items-center flex-wrap gap-2"
          >
            <span className="bg-gradient-to-br from-primary via-blue-500 to-emerald-400 bg-clip-text text-transparent pb-0.5 drop-shadow-sm break-words">
              {greeting}, {displayName}.
            </span>
            {user.dob && (
              <span className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wide border border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/50 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                {Math.floor((new Date().getTime() - new Date(user.dob).getTime()) / 3.15576e+10)} yrs
              </span>
            )}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            className="text-sm md:text-base text-on-surface-variant dark:text-slate-400 max-w-2xl mt-1 leading-relaxed font-medium"
          >
            {greetingSubtext}
          </motion.p>
        </div>
        
        {/* Date and Time display */}
        <ClockDisplay />
      </section>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6" id="bento-grid">
        {/* Featured Insight Card: AI Diet Recommendation */}
        <div className="md:col-span-8 relative rounded-[2rem] p-[1px] overflow-hidden group hover:shadow-[0_20px_60px_-15px_rgba(59,130,246,0.3)] transition-all duration-500" id="ai-diet-recommendation-card">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/50 via-secondary/30 to-emerald-400/50 opacity-50 group-hover:opacity-100 transition-opacity duration-500 blur-xl"></div>
          <div className="relative h-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl rounded-[2rem] p-5 md:p-8 flex flex-col gap-6 border border-white/40 dark:border-slate-700/50">
            <div className="relative z-10 flex flex-col gap-6">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex flex-wrap gap-2.5 mb-3">
                      <span className="bg-gradient-to-r from-primary to-blue-500 text-white text-[10px] px-3.5 py-1.5 rounded-full font-black uppercase tracking-widest shadow-md">
                        Daily Analysis
                      </span>
                      <span className="bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] px-3.5 py-1.5 rounded-full font-black uppercase tracking-widest flex items-center gap-1 border border-amber-200 dark:border-amber-500/30">
                        <Zap className="w-3 h-3" /> 1 Credit/Day Auto-Deducted
                      </span>
                      <span className={`text-[10px] px-3.5 py-1.5 rounded-full font-black uppercase tracking-widest shadow-sm border ${isDiabetic ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30" : currentHour >= 5 && currentHour < 17 ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30" : "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30"}`}>
                        {isDiabetic ? "Diabetic Protocol" : "Balanced Protocol"}
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-on-surface dark:text-white tracking-tight flex items-center gap-2 sm:gap-3">
                      <div className="p-1.5 sm:p-2.5 bg-primary/10 rounded-xl sm:rounded-2xl">
                        <Utensils className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-primary" />
                      </div>
                      AI Diet Recommendation
                    </h2>
                  </div>
                </div>

                <div className="space-y-4 mt-6">
                  {currentHour >= 5 && currentHour < 17 ? (
                    <>
                      <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Nutrition Window: Breakfast & Lunch</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-900/80 p-5 border border-slate-200/60 dark:border-slate-700/60 rounded-3xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                          <span className="text-xs font-black text-primary uppercase block mb-2 tracking-wide">Breakfast suggestion</span>
                          <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                            <Apple className="w-4 h-4 inline-block mr-1 text-primary" />
                            {dietPlan.breakfast}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-900/80 p-5 border border-slate-200/60 dark:border-slate-700/60 rounded-3xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                          <span className="text-xs font-black text-secondary uppercase block mb-2 tracking-wide">Lunch suggestion</span>
                          <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                              <Utensils className="w-4 h-4 inline-block mr-1 text-secondary" />
                              {dietPlan.lunch}
                          </p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Nutrition Window: Dinner Focus Only</p>
                      <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-900/80 p-5 border border-slate-200/60 dark:border-slate-700/60 rounded-3xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                        <span className="text-xs font-black text-primary uppercase block mb-2 tracking-wide">Dinner suggestion</span>
                        <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                            <Utensils className="w-4 h-4 inline-block mr-1 text-primary" />
                            {dietPlan.dinner}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-4 items-center">
                <button 
                  onClick={() => setShowFullReport(true)}
                  className="bg-gradient-to-r from-primary to-blue-500 hover:from-primary-container hover:to-blue-600 text-white px-5 py-3 md:px-7 md:py-3.5 rounded-2xl font-bold shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all active:scale-95 text-sm flex items-center gap-2.5 cursor-pointer w-full sm:w-auto justify-center"
                  id="btn-view-report"
                >
                  View Full Dietary Report
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Actions List */}
        <div className="md:col-span-4 flex flex-col justify-between gap-5" id="smart-actions-panel">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 pb-1.5">
            Smart Actions
          </h3>

          {/* Water log action */}
          <div 
            onClick={() => onUpdateWater(500)}
            className="bg-white/90 dark:bg-slate-900/90 hover:bg-gradient-to-r hover:from-white hover:to-blue-50/50 dark:hover:from-slate-800 dark:hover:to-slate-800/80 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col gap-3 sm:gap-5 group cursor-pointer transition-all duration-300 hover:shadow-[0_10px_30px_-10px_rgba(59,130,246,0.3)] hover:-translate-y-1"
            id="action-water"
          >
            <div className="flex justify-between items-center w-full gap-2">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-500/20 dark:to-blue-600/10 text-primary flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-inner shrink-0">
                  <Droplet className="w-5 h-5 sm:w-6 sm:h-6 fill-primary/20 dark:fill-primary/40" />
                </div>
                <div className="min-w-0">
                  <p className="font-extrabold text-on-surface dark:text-white text-sm sm:text-base truncate">Log 500ml Water</p>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 font-semibold truncate">
                    Progress: {smartActions.waterLoggedMl}ml / {smartActions.waterGoalMl}ml
                  </p>
                </div>
              </div>
              <button 
                className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-300 font-black shadow-sm shrink-0 ${
                  smartActions.waterLoggedMl >= smartActions.waterGoalMl 
                    ? "border-emerald-500 bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-emerald-500/30" 
                    : "border-primary/30 group-hover:border-primary text-primary group-hover:bg-primary/5"
                }`}
              >
                {smartActions.waterLoggedMl >= smartActions.waterGoalMl ? "✓" : "+"}
              </button>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                <div className="flex items-center gap-2">
                  <span>Hydration Goal</span>
                  <button type="button" onClick={e => { e.stopPropagation(); setShowWellnessModal(true); }}
                    className="p-1 hover:bg-primary/10 rounded-lg transition-colors cursor-pointer" title="Wellness settings">
                    <Settings className="w-3 h-3 text-slate-400 hover:text-primary" />
                  </button>
                </div>
                <span className={smartActions.waterLoggedMl >= smartActions.waterGoalMl ? "text-emerald-500" : "text-primary"}>
                  {Math.round(Math.min((smartActions.waterLoggedMl / smartActions.waterGoalMl) * 100, 100))}%
                </span>
              </div>
              <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden border border-slate-200/40 dark:border-slate-700/30 p-0.5 shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((smartActions.waterLoggedMl / smartActions.waterGoalMl) * 100, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className={`h-full rounded-full shadow-sm ${
                    smartActions.waterLoggedMl >= smartActions.waterGoalMl 
                      ? "bg-gradient-to-r from-emerald-400 to-teal-400" 
                      : "bg-gradient-to-r from-primary via-blue-400 to-cyan-400"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Vitamin D action */}
          <div 
            onClick={() => onToggleAction("vitaminD")}
            className="bg-white/90 dark:bg-slate-900/90 hover:bg-gradient-to-r hover:from-white hover:to-purple-50/50 dark:hover:from-slate-800 dark:hover:to-slate-800/80 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] flex justify-between items-center group cursor-pointer transition-all duration-300 hover:shadow-[0_10px_30px_-10px_rgba(168,85,247,0.3)] hover:-translate-y-1"
            id="action-vitamin"
          >
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-500/20 dark:to-purple-600/10 text-secondary flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-inner shrink-0">
                <Pill className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                  <p className="font-extrabold text-on-surface dark:text-white text-sm sm:text-base truncate">
                    {user.dietaryPreferences?.length ? "Vitamin D Reminder" : "Vitamin D"}
                  </p>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 font-semibold truncate">
                    {user.dietaryPreferences?.length ? "Profile-aware reminder" : "No profile-specific schedule yet"}
                  </p>
              </div>
            </div>
            <button 
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border-2 flex items-center justify-center transition-all duration-300 font-black shadow-sm shrink-0 ${
                smartActions.vitaminD 
                  ? "border-secondary bg-gradient-to-br from-secondary to-purple-600 text-white shadow-secondary/30" 
                  : "border-secondary/30 group-hover:border-secondary text-secondary group-hover:bg-secondary/5"
              }`}
            >
              {smartActions.vitaminD && "✓"}
            </button>
          </div>

          {/* Breathing exercise action */}
          <div 
            onClick={() => onToggleAction("breathing")}
            className="bg-white/90 dark:bg-slate-900/90 hover:bg-gradient-to-r hover:from-white hover:to-orange-50/50 dark:hover:from-slate-800 dark:hover:to-slate-800/80 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 p-4 sm:p-5 rounded-[1.5rem] sm:rounded-[2rem] flex justify-between items-center group cursor-pointer transition-all duration-300 hover:shadow-[0_10px_30px_-10px_rgba(249,115,22,0.3)] hover:-translate-y-1"
            id="action-breathing"
          >
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-500/20 dark:to-orange-600/10 text-tertiary flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-inner shrink-0">
                <Wind className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                  <p className="font-extrabold text-on-surface dark:text-white text-sm sm:text-base truncate">Breathing</p>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 font-semibold truncate">Stress reduction</p>
              </div>
            </div>
            <button 
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border-2 flex items-center justify-center transition-all duration-300 font-black shadow-sm shrink-0 ${
                smartActions.breathing 
                  ? "border-tertiary bg-gradient-to-br from-tertiary to-orange-600 text-white shadow-tertiary/30" 
                  : "border-tertiary/30 group-hover:border-tertiary text-tertiary group-hover:bg-tertiary/5"
              }`}
            >
              {smartActions.breathing && "✓"}
            </button>
          </div>

        </div>
      </div>

      <WellnessHydrationModal
        isOpen={showWellnessModal}
        onClose={() => setShowWellnessModal(false)}
        waterLoggedMl={smartActions.waterLoggedMl}
        waterGoalMl={smartActions.waterGoalMl}
        onUpdateWater={onUpdateWater}
      />

      {/* Today's Reminders */}
      {todayReminders.length > 0 && (
        <section className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-100 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-3" id="todays-reminders">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <h3 className="text-xs font-black text-on-surface dark:text-slate-200 uppercase tracking-wider">Today's Reminders</h3>
              <span className="text-[9px] font-bold text-on-surface-variant dark:text-slate-400">
                {takenCount}/{todayReminders.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${adherencePct}%` }}
                  transition={{ duration: 0.8 }}
                  className={`h-full rounded-full ${adherencePct >= 80 ? "bg-emerald-500" : adherencePct >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
                />
              </div>
              <span className="text-[9px] font-bold text-on-surface-variant dark:text-slate-400">{adherencePct}%</span>
            </div>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {todayReminders.map((r, i) => (
              <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-mono font-bold text-on-surface-variant dark:text-slate-400 w-12 shrink-0">{r.time}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-on-surface dark:text-slate-200 truncate">{r.label}</p>
                  <p className="text-[8px] text-on-surface-variant dark:text-slate-500 truncate">{r.detail}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {r.status === "taken" ? (
                    <span className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 text-[8px] font-bold flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> Done
                    </span>
                  ) : (
                    <>
                      <button type="button" onClick={() => handleAction(r.id, r.type, "taken")}
                        className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-[8px] font-bold hover:bg-primary/20 transition-all cursor-pointer">
                        Take
                      </button>
                      <button type="button" onClick={() => handleAction(r.id, r.type, "snoozed")}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-on-surface-variant text-[8px] font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer">
                        Snooze
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Health Insights Grid */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6" id="vitals-grid">
        {loading ? (
          <>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="bg-white/90 dark:bg-slate-900/90 border border-slate-100 dark:border-slate-800 p-3 sm:p-4 md:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center text-center shadow-sm animate-pulse">
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-slate-200 dark:bg-slate-700 mb-2 sm:mb-3 md:mb-4" />
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
                <div className="h-6 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            ))}
          </>
        ) : (
        <>
        {/* Heart Rate */}
        <div className="group bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/90 dark:to-slate-800/80 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 p-3 sm:p-4 md:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center text-center shadow-lg shadow-slate-200/50 dark:shadow-black/20 hover:shadow-[0_10px_40px_-10px_rgba(239,68,68,0.3)] transition-all duration-300 hover:-translate-y-2 cursor-default" id="vital-heart-rate">
          <motion.div
            animate={{ scale: [1, 1.18, 1, 1, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-100 to-red-200 dark:from-red-500/20 dark:to-red-600/10 text-red-600 flex items-center justify-center mb-2 sm:mb-3 md:mb-4 shadow-inner group-hover:scale-110 transition-transform duration-300"
          >
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 fill-red-500/80 dark:fill-red-500" />
          </motion.div>
          <p className="text-[10px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Heart Rate</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-on-surface dark:text-white mt-1 sm:mt-2 flex items-baseline gap-1">
            {vitals.heartRate > 0 ? vitals.heartRate : "—"} <span className="text-[10px] sm:text-sm font-bold text-slate-400 dark:text-slate-500">BPM</span>
          </p>
        </div>

        {/* Steps */}
        <div className="group bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/90 dark:to-slate-800/80 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 p-3 sm:p-4 md:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center text-center shadow-lg shadow-slate-200/50 dark:shadow-black/20 hover:shadow-[0_10px_40px_-10px_rgba(59,130,246,0.3)] transition-all duration-300 hover:-translate-y-2 cursor-default" id="vital-steps">
          <motion.div
            animate={{ y: [0, -3, 0, 3, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-500/20 dark:to-blue-600/10 text-primary flex items-center justify-center mb-2 sm:mb-3 md:mb-4 shadow-inner group-hover:scale-110 transition-transform duration-300"
          >
            <Footprints className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </motion.div>
          <p className="text-[10px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Steps</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-on-surface dark:text-white mt-1 sm:mt-2 flex items-baseline gap-1">
            {vitals.steps > 0 ? vitals.steps.toLocaleString() : "—"}
          </p>
        </div>

        {/* Sleep */}
        <div className="group bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/90 dark:to-slate-800/80 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 p-3 sm:p-4 md:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center text-center shadow-lg shadow-slate-200/50 dark:shadow-black/20 hover:shadow-[0_10px_40px_-10px_rgba(139,92,246,0.3)] transition-all duration-300 hover:-translate-y-2 cursor-default" id="vital-sleep">
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-500/20 dark:to-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 sm:mb-3 md:mb-4 shadow-inner group-hover:scale-110 transition-transform duration-300"
          >
            <Moon className="w-5 h-5 sm:w-6 sm:h-6 fill-purple-500/80 dark:fill-purple-400" />
          </motion.div>
          <p className="text-[10px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sleep</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-on-surface dark:text-white mt-1 sm:mt-2 flex items-baseline gap-1">
            {vitals.sleep || "—"}
          </p>
        </div>

        {/* Calories */}
        <div className="group bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/90 dark:to-slate-800/80 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 p-3 sm:p-4 md:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center text-center shadow-lg shadow-slate-200/50 dark:shadow-black/20 hover:shadow-[0_10px_40px_-10px_rgba(249,115,22,0.3)] transition-all duration-300 hover:-translate-y-2 cursor-default" id="vital-calories">
          <motion.div
            animate={{ scale: [1, 1.08, 1, 0.95, 1], rotate: [0, 2, 0, -2, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-500/20 dark:to-orange-600/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-2 sm:mb-3 md:mb-4 shadow-inner group-hover:scale-110 transition-transform duration-300"
          >
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 fill-orange-500/80 dark:fill-orange-400" />
          </motion.div>
          <p className="text-[10px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Calories</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-on-surface dark:text-white mt-1 sm:mt-2 flex items-baseline gap-1">
            {vitals.calories > 0 ? vitals.calories : "—"} <span className="text-[10px] sm:text-sm font-bold text-slate-400 dark:text-slate-500">kcal</span>
          </p>
        </div>
        </>)}
      </section>

      {/* Activity Trends Section Removed */}



      {/* Quick Log Modal Overlay */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" id="quick-log-modal">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 w-full max-w-md shadow-2xl relative border border-slate-100 dark:border-slate-800"
            >
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-bold text-on-surface dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Quick Log Vitals
                </h3>
                <button 
                  onClick={() => setShowLogModal(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-on-surface-variant dark:text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-2">
                    Steps Logged
                  </label>
                  <input 
                    type="number"
                    value={logSteps}
                    onChange={(e) => { setLogSteps(Number(e.target.value)); setQuickLogErrors(p => ({ ...p, steps: '' })); }}
                    className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border text-on-surface dark:text-slate-100 focus:outline-none text-sm font-semibold ${quickLogErrors.steps ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-primary'}`}
                  />
                  {quickLogErrors.steps && <p className="text-[10px] font-semibold text-rose-500 mt-1">{quickLogErrors.steps}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-2">
                    Heart Rate (BPM)
                  </label>
                  <input 
                    type="number"
                    value={logHeartRate}
                    onChange={(e) => { setLogHeartRate(Number(e.target.value)); setQuickLogErrors(p => ({ ...p, hr: '' })); }}
                    className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border text-on-surface dark:text-slate-100 focus:outline-none text-sm font-semibold ${quickLogErrors.hr ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-primary'}`}
                  />
                  {quickLogErrors.hr && <p className="text-[10px] font-semibold text-rose-500 mt-1">{quickLogErrors.hr}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-2">
                    Calories Burned (kcal)
                  </label>
                  <input 
                    type="number"
                    value={logCalories}
                    onChange={(e) => { setLogCalories(Number(e.target.value)); setQuickLogErrors(p => ({ ...p, calories: '' })); }}
                    className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border text-on-surface dark:text-slate-100 focus:outline-none text-sm font-semibold ${quickLogErrors.calories ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-primary'}`}
                  />
                  {quickLogErrors.calories && <p className="text-[10px] font-semibold text-rose-500 mt-1">{quickLogErrors.calories}</p>}
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setShowLogModal(false)}
                  className="flex-1 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveLogs}
                  className="flex-1 py-3 text-sm font-semibold text-white bg-primary hover:bg-primary-container rounded-xl transition-colors shadow-md shadow-primary/10 cursor-pointer"
                >
                  Save Logs
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Full Report Modal Dialogue */}
      <AnimatePresence>
        {showFullReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" id="report-modal">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative border border-slate-100 dark:border-slate-800 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-extrabold text-on-surface dark:text-slate-100 flex items-center gap-2">
                  <Utensils className="w-6 h-6 text-primary" />
                  Clinical Dietary & Wellness Analysis
                </h3>
                <button 
                  onClick={() => setShowFullReport(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-on-surface-variant dark:text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6 text-sm text-on-surface-variant dark:text-slate-300 leading-relaxed">
                <div className="p-4 bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 rounded-2xl flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-primary dark:text-slate-200 font-medium text-xs leading-normal">
                    {dietPlan.clinicalNote}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 rounded-xl">
                    <span className="text-xs text-on-surface-variant dark:text-slate-400 block font-medium">Glycemic Index (GI) Target</span>
                    <span className="text-lg font-bold text-on-surface dark:text-slate-100 mt-1 block">{dietPlan.glycemicIndex}</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 inline-block">✓ Glucose spike safe</span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 rounded-xl">
                    <span className="text-xs text-on-surface-variant dark:text-slate-400 block font-medium">Est. Daily Calorie Intake</span>
                    <span className="text-lg font-bold text-on-surface dark:text-slate-100 mt-1 block">{dietPlan.calorieEstimate}</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 inline-block">✓ Balanced energy output</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-on-surface dark:text-slate-100 mb-2">Dietary Notes</h4>
                  <p className="text-xs">
                    {dietPlan.notes}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-on-surface dark:text-slate-100 mb-2">Clinical Pre-Consultation Home Care Priority</h4>
                  <p className="text-xs">
                    {dietPlan.homeCareNote}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <button 
                  onClick={() => setShowFullReport(false)}
                  className="w-full py-3 text-sm font-semibold text-white bg-primary hover:bg-primary-container rounded-xl transition-colors shadow-md shadow-primary/10 cursor-pointer"
                >
                  Close Dietary Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
