import React, { useState, useEffect } from "react";
import { User, SmartActions, Vitals } from "../types";
import { Activity, Droplet, Pill, Wind, Heart, Footprints, Moon, Flame, Plus, ChevronRight, X, Sparkles, Clock, Calendar, Utensils, Apple, Info, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import SkeletonCard from "./SkeletonCard";
import confetti from "canvas-confetti";

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
    type: "blood_sugar" | "blood_pressure";
    timestamp: string;
    sugarValue?: number;
    sugarUnit?: "mg/dL" | "mmol/L";
    sugarContext?: "Fasting" | "Post-meal" | "Random" | "Bedtime";
    systolic?: number;
    diastolic?: number;
    pulse?: number;
  }) => Promise<{ reading: any; analysis: string; isNormal: boolean; severity: string }>;
}

export default function Dashboard({
  user,
  smartActions,
  vitals,
  onUpdateWater,
  onToggleAction,
  onUpdateVitals,
  onLogVitalsReading,
}: DashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logSteps, setLogSteps] = useState(vitals.steps);
  const [logHeartRate, setLogHeartRate] = useState(vitals.heartRate);
  const [logCalories, setLogCalories] = useState(vitals.calories);
  const [showFullReport, setShowFullReport] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
  
  const [prevWater, setPrevWater] = useState(smartActions.waterLoggedMl);
  const [triggerConfetti, setTriggerConfetti] = useState(false);

  // Vitals Tracker States
  const [showVitalsLogModal, setShowVitalsLogModal] = useState(false);
  const [vitalsType, setVitalsType] = useState<"blood_sugar" | "blood_pressure">("blood_sugar");
  const [sugarVal, setSugarVal] = useState("");
  const [sugarUnit, setSugarUnit] = useState<"mg/dL" | "mmol/L">(user.sugarUnitPreference || "mg/dL");
  const [sugarContext, setSugarContext] = useState<"Fasting" | "Post-meal" | "Random" | "Bedtime">("Fasting");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [logTime, setLogTime] = useState("");
  const [isLoggingVitals, setIsLoggingVitals] = useState(false);
  const [vitalsFeedback, setVitalsFeedback] = useState<{
    reading: any;
    analysis: string;
    isNormal: boolean;
    severity: string;
  } | null>(null);

  // Initialize logTime dynamically to current local time on open
  useEffect(() => {
    if (showVitalsLogModal) {
      const now = new Date();
      const offsetMs = now.getTimezoneOffset() * 60 * 1000;
      const localISO = new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
      setLogTime(localISO);
      setVitalsFeedback(null); // clear previous feedback
    }
  }, [showVitalsLogModal]);

  useEffect(() => {
    if (smartActions.waterLoggedMl >= smartActions.waterGoalMl && prevWater < smartActions.waterGoalMl) {
      setTriggerConfetti(true);
      
      // Fire premium high-performance canvas confetti bursts
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 }
      });
      
      setTimeout(() => {
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { y: 0.7 }
        });
      }, 250);

      const timer = setTimeout(() => setTriggerConfetti(false), 5000);
      setPrevWater(smartActions.waterLoggedMl);
      return () => clearTimeout(timer);
    }
    setPrevWater(smartActions.waterLoggedMl);
  }, [smartActions.waterLoggedMl, smartActions.waterGoalMl, prevWater]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentHour = currentDateTime.getHours();
  let greeting = "Hello";
  let greetingSubtext = "";
  if (currentHour >= 5 && currentHour < 12) {
    greeting = "Good morning";
    greetingSubtext = `Your vitality score is up by ${user.vitalityScoreUp || 12}% today. The AI recommends a light morning stretch based on your deep sleep recovery of ${user.sleepRecovery || "7h 45m"}.`;
  } else if (currentHour >= 12 && currentHour < 17) {
    greeting = "Good afternoon";
    greetingSubtext = `Your vitality score is up by ${user.vitalityScoreUp || 12}% today. Ensure you're drinking water to stay hydrated! Your hydration progress is logged below.`;
  } else if (currentHour >= 17 && currentHour < 21) {
    greeting = "Good evening";
    greetingSubtext = `Your vitality score is up by ${user.vitalityScoreUp || 12}% today. Wind down with some deep breathing exercises. Your Atorvastatin medication is scheduled for 08:00 PM.`;
  } else {
    greeting = "Good night";
    greetingSubtext = `Your vitality score is up by ${user.vitalityScoreUp || 12}% today. Prioritize restful sleep to recover. The system has paused active notifications until morning.`;
  }

  const formattedDate = currentDateTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });

  const formattedTime = currentDateTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 900);
    return () => clearTimeout(timer);
  }, []);

  const handleSaveLogs = () => {
    onUpdateVitals({
      steps: Number(logSteps),
      heartRate: Number(logHeartRate),
      calories: Number(logCalories),
    });
    setShowLogModal(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse" id="dashboard-skeleton">
        {/* Skeleton Greeting */}
        <div className="space-y-3">
          <div className="h-10 w-2/3 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>

        {/* Skeleton Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Featured Card Skeleton */}
          <div className="md:col-span-8 bg-slate-200/50 dark:bg-slate-800/40 rounded-3xl p-6 h-[300px] flex flex-col justify-between border border-slate-200/30 dark:border-slate-800/30">
            <div className="space-y-4">
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
              <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
              <div className="space-y-2 mt-4">
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-800 rounded"></div>
              </div>
            </div>
            <div className="h-12 w-40 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          </div>

          {/* Smart Actions Panel Skeleton */}
          <div className="md:col-span-4 flex flex-col justify-between gap-4 h-[300px]">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-200/50 dark:bg-slate-800/40 border border-slate-200/30 dark:border-slate-800/30 p-4 rounded-2xl flex justify-between items-center h-20">
                <div className="flex items-center gap-4 w-full">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-3 w-1/2 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  </div>
                </div>
                <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton Vitals Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} id={`skeleton-vital-card-${i}`} />
          ))}
        </div>

        {/* Skeleton Chart */}
        <div className="bg-slate-200/50 dark:bg-slate-800/40 border border-slate-200/30 dark:border-slate-800/30 p-8 rounded-3xl h-64 flex flex-col justify-between animate-pulse">
          <div className="space-y-2">
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
          </div>
          <div className="h-32 flex items-end justify-between gap-3 pt-4">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="flex-1 flex flex-col items-center h-full justify-end gap-2">
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-t-lg" style={{ height: `${20 + i * 10}%` }}></div>
                <div className="h-3 w-8 bg-slate-200 dark:bg-slate-800 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleLogVitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onLogVitalsReading) return;

    setIsLoggingVitals(true);
    setVitalsFeedback(null);
    try {
      const payload: any = {
        type: vitalsType,
        timestamp: new Date(logTime).toISOString(),
      };

      if (vitalsType === "blood_sugar") {
        if (!sugarVal) return;
        payload.sugarValue = Number(sugarVal);
        payload.sugarUnit = sugarUnit;
        payload.sugarContext = sugarContext;
      } else {
        if (!systolic || !diastolic) return;
        payload.systolic = Number(systolic);
        payload.diastolic = Number(diastolic);
        if (pulse) payload.pulse = Number(pulse);
      }

      const res = await onLogVitalsReading(payload);
      if (res && res.reading) {
        setVitalsFeedback(res);
        // Reset state variables for sugar or pressure values
        setSugarVal("");
        setSystolic("");
        setDiastolic("");
        setPulse("");
      } else {
        setVitalsFeedback({
          reading: payload,
          analysis: "Vital reading successfully logged on the server. Always maintain baseline hydration and balanced clinical nutrition.",
          isNormal: true,
          severity: "normal"
        });
      }
    } catch (err) {
      console.error("Vitals quick log failed:", err);
    } finally {
      setIsLoggingVitals(false);
    }
  };

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
      <section className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4" id="greeting-section">
        <div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent pb-1">
            {greeting}, {user.fullName || "Sarah"}.
          </h1>
          <p className="text-lg text-on-surface-variant dark:text-slate-400 max-w-2xl mt-2 leading-relaxed">
            {greetingSubtext}
          </p>
        </div>
        
        {/* Date and Time display */}
        <div className="flex flex-col md:items-end gap-1.5 shrink-0 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md border border-slate-100 dark:border-slate-800/80 px-4 py-3 rounded-2xl shadow-sm md:self-center">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <Calendar className="w-3.5 h-3.5 text-primary" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-black text-on-surface dark:text-slate-100 tracking-wider">
            <Clock className="w-4 h-4 text-secondary animate-pulse" />
            <span className="font-mono">{formattedTime}</span>
          </div>
        </div>
      </section>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6" id="bento-grid">
        {/* Featured Insight Card: AI Diet Recommendation */}
        <div className="md:col-span-8 bg-white/85 dark:bg-slate-900/80 backdrop-blur-3xl border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 relative overflow-hidden group shadow-lg shadow-slate-950/5 dark:shadow-black/20 flex flex-col justify-between min-h-[300px] transition-all hover:shadow-xl hover:scale-[1.01]" id="ai-diet-recommendation-card">
          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="bg-primary/10 text-primary text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                      Daily Analysis
                    </span>
                    <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-wider flex items-center gap-1">
                      ⚡ 1 Credit/Day Auto-Deducted
                    </span>
                    <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${currentHour >= 5 && currentHour < 17 ? "bg-emerald-500/10 text-emerald-400" : "bg-indigo-500/10 text-indigo-400"}`}>
                      {user.dietaryPreferences?.some(p => p.toLowerCase().includes("diabet") || p.toLowerCase().includes("sugar") || p.toLowerCase().includes("glucose") || p.toLowerCase().includes("metformin")) ? "Diabetic Care Protocol" : "Balanced Diet Protocol"}
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-on-surface dark:text-slate-100 tracking-tight flex items-center gap-2">
                    <Utensils className="w-5.5 h-5.5 text-primary" />
                    AI Diet Recommendation
                  </h2>
                </div>
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <Apple className="w-6 h-6" />
                </div>
              </div>

              {/* Dynamic meal listing based on local time */}
              <div className="space-y-4 mt-3">
                {currentHour >= 5 && currentHour < 17 ? (
                  <>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Nutrition Window: Breakfast & Lunch</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-100 dark:border-slate-800/60 rounded-2xl">
                        <span className="text-xs font-black text-primary uppercase block mb-1">Breakfast suggestion</span>
                        {user.dietaryPreferences?.some(p => p.toLowerCase().includes("diabet") || p.toLowerCase().includes("sugar") || p.toLowerCase().includes("glucose") || p.toLowerCase().includes("metformin")) ? (
                          <p className="text-xs text-on-surface dark:text-slate-300 font-semibold leading-relaxed">
                            🥣 Warm steel-cut oatmeal topped with sugar-free walnuts and chia seeds. <span className="text-rose-500 dark:text-rose-400 font-bold font-mono text-[10px] block mt-1">⚠️ Glycemic spike control: No sweet fruits!</span>
                          </p>
                        ) : (
                          <p className="text-xs text-on-surface dark:text-slate-300 font-semibold leading-relaxed">
                            🍎 Fresh Whole Apple or sliced pear accompanied by simple high-fiber grains and mixed raw nuts.
                          </p>
                        )}
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-100 dark:border-slate-800/60 rounded-2xl">
                        <span className="text-xs font-black text-secondary uppercase block mb-1">Lunch suggestion</span>
                        <p className="text-xs text-on-surface dark:text-slate-300 font-semibold leading-relaxed">
                          🍛 Complete vegetarian balanced lunch: 2-3 soft whole-wheat chapatis, protein-packed lentil dal, seasonal dry curry, and a small portion of steamed brown rice.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Nutrition Window: Dinner Focus Only</p>
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-4 border border-slate-100 dark:border-slate-800/60 rounded-2xl">
                      <span className="text-xs font-black text-primary uppercase block mb-1">Dinner suggestion</span>
                      <p className="text-xs text-on-surface dark:text-slate-300 font-semibold leading-relaxed">
                        🍛 Light Evening Dinner: 1-2 soft chapatis paired with a healthy seasonal dry vegetable curry, nutritious warm dal, and a light portion of steamed rice. Take at least 2 hours before resting.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Home Remedy / Safety clause prioritization */}
              <div className="mt-4 flex gap-2.5 items-start bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/40 p-3.5 rounded-2xl">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal font-semibold">
                  <span className="text-primary font-bold">Clinical Care Note:</span> Always prioritize proven supportive home remedies (such as solid physical rest, deep steam inhalation, warm salt-water gargling, and robust hydration) for minor self-limiting symptoms before seeking in-person clinical physician appointments.
                </p>
              </div>
            </div>
            
            <div className="mt-5 flex flex-wrap gap-4 items-center">
              <button 
                onClick={() => setShowFullReport(true)}
                className="bg-primary hover:bg-primary-container text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-all active:scale-95 text-sm flex items-center gap-2 cursor-pointer"
                id="btn-view-report"
              >
                View Full Dietary Report
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Smart Actions List */}
        <div className="md:col-span-4 flex flex-col justify-between gap-4" id="smart-actions-panel">
          <h3 className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-widest px-1">
            Smart Actions
          </h3>

          {/* Water log action */}
          <div 
            onClick={() => onUpdateWater(500)}
            className="bg-white/85 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800/60 p-5 rounded-3xl flex flex-col gap-4 group cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]"
            id="action-water"
          >
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center transition-transform group-hover:scale-110">
                  <Droplet className="w-5 h-5 fill-primary/20 animate-bounce" />
                </div>
                <div>
                  <p className="font-extrabold text-on-surface dark:text-slate-100 text-sm">Log 500ml Water</p>
                  <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5 font-medium">
                    Progress: {smartActions.waterLoggedMl}ml / {smartActions.waterGoalMl}ml
                  </p>
                </div>
              </div>
              <button 
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all text-xs font-bold ${
                  smartActions.waterLoggedMl >= smartActions.waterGoalMl 
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500" 
                    : "border-primary/30 group-hover:border-primary text-primary"
                }`}
              >
                {smartActions.waterLoggedMl >= smartActions.waterGoalMl ? "✓" : "+"}
              </button>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full">
              <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">
                <span>Hydration Goal</span>
                <span className={smartActions.waterLoggedMl >= smartActions.waterGoalMl ? "text-emerald-500 font-extrabold" : "text-primary"}>
                  {Math.round(Math.min((smartActions.waterLoggedMl / smartActions.waterGoalMl) * 100, 100))}% Complete
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden border border-slate-200/40 dark:border-slate-700/30 p-0.5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((smartActions.waterLoggedMl / smartActions.waterGoalMl) * 100, 100)}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    smartActions.waterLoggedMl >= smartActions.waterGoalMl 
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400" 
                      : "bg-gradient-to-r from-primary to-blue-400"
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Vitamin D action */}
          <div 
            onClick={() => onToggleAction("vitaminD")}
            className="bg-white/85 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800/60 p-4 rounded-2xl flex justify-between items-center group cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]"
            id="action-vitamin"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/5 text-secondary flex items-center justify-center transition-transform group-hover:scale-110">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-on-surface dark:text-slate-100 text-sm">Take Vitamin D</p>
                <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">Morning Dosage</p>
              </div>
            </div>
            <button 
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                smartActions.vitaminD 
                  ? "border-secondary bg-secondary text-white" 
                  : "border-secondary/30 group-hover:border-secondary text-secondary"
              }`}
            >
              {smartActions.vitaminD && "✓"}
            </button>
          </div>

          {/* Breathing exercise action */}
          <div 
            onClick={() => onToggleAction("breathing")}
            className="bg-white/85 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800/80 border border-slate-100 dark:border-slate-800/60 p-4 rounded-2xl flex justify-between items-center group cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]"
            id="action-breathing"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-tertiary/5 text-tertiary flex items-center justify-center transition-transform group-hover:scale-110">
                <Wind className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-on-surface dark:text-slate-100 text-sm">3min Breathing</p>
                <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">Stress reduction</p>
              </div>
            </div>
            <button 
              className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                smartActions.breathing 
                  ? "border-tertiary bg-tertiary text-white" 
                  : "border-tertiary/30 group-hover:border-tertiary text-tertiary"
              }`}
            >
              {smartActions.breathing && "✓"}
            </button>
          </div>

          {/* Vitals Log Quick Action Card */}
          <div 
            onClick={() => setShowVitalsLogModal(true)}
            className="bg-white/85 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800/80 border border-pink-100 dark:border-pink-950/25 p-4 rounded-2xl flex justify-between items-center group cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]"
            id="action-log-vitals"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-pink-500/5 text-pink-500 flex items-center justify-center transition-transform group-hover:scale-110">
                <Heart className="w-5 h-5 fill-pink-500/10" />
              </div>
              <div>
                <p className="font-semibold text-on-surface dark:text-slate-100 text-sm">Log Vitals Reading</p>
                <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">Sugar, pressure, or pulse</p>
              </div>
            </div>
            <button className="w-6 h-6 rounded-lg border-2 border-pink-500/30 group-hover:border-pink-500 text-pink-500 flex items-center justify-center font-extrabold text-xs">
              +
            </button>
          </div>
        </div>
      </div>

      {/* Health Insights Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-6" id="vitals-grid">
        {/* Heart Rate */}
        <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/60 p-6 rounded-2xl flex flex-col items-center text-center shadow-lg shadow-slate-950/5 dark:shadow-black/20 transition-transform hover:scale-[1.02]" id="vital-heart-rate">
          <div className="w-12 h-12 rounded-full bg-red-100/60 dark:bg-red-950/30 text-red-600 flex items-center justify-center mb-4 shadow-inner">
            <Heart className="w-5 h-5 fill-red-600" />
          </div>
          <p className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Heart Rate</p>
          <p className="text-2xl font-black text-on-surface dark:text-slate-100 mt-1">
            {vitals.heartRate} <span className="text-xs font-medium text-on-surface-variant dark:text-slate-400">BPM</span>
          </p>
        </div>

        {/* Steps */}
        <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/60 p-6 rounded-2xl flex flex-col items-center text-center shadow-lg shadow-slate-950/5 dark:shadow-black/20 transition-transform hover:scale-[1.02]" id="vital-steps">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 shadow-inner">
            <Footprints className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Steps</p>
          <p className="text-2xl font-black text-on-surface dark:text-slate-100 mt-1">
            {vitals.steps.toLocaleString()}
          </p>
        </div>

        {/* Sleep */}
        <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/60 p-6 rounded-2xl flex flex-col items-center text-center shadow-lg shadow-slate-950/5 dark:shadow-black/20 transition-transform hover:scale-[1.02]" id="vital-sleep">
          <div className="w-12 h-12 rounded-full bg-secondary/10 text-secondary flex items-center justify-center mb-4 shadow-inner">
            <Moon className="w-5 h-5 fill-secondary" />
          </div>
          <p className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Sleep</p>
          <p className="text-2xl font-black text-on-surface dark:text-slate-100 mt-1">
            {vitals.sleep}
          </p>
        </div>

        {/* Calories */}
        <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/60 p-6 rounded-2xl flex flex-col items-center text-center shadow-lg shadow-slate-950/5 dark:shadow-black/20 transition-transform hover:scale-[1.02]" id="vital-calories">
          <div className="w-12 h-12 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center mb-4 shadow-inner">
            <Flame className="w-5 h-5 fill-tertiary" />
          </div>
          <p className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Calories</p>
          <p className="text-2xl font-black text-on-surface dark:text-slate-100 mt-1">
            {vitals.calories} <span className="text-xs font-medium text-on-surface-variant dark:text-slate-400">kcal</span>
          </p>
        </div>
      </section>

      {/* Activity Trends Section Removed */}

      {/* Floating Action Button (FAB) and Dialog for metric additions */}
      <button 
        onClick={() => {
          setLogSteps(vitals.steps);
          setLogHeartRate(vitals.heartRate);
          setLogCalories(vitals.calories);
          setShowLogModal(true);
        }}
        className="fixed right-6 bottom-24 w-14 h-14 bg-primary text-white rounded-2xl shadow-xl hover:shadow-primary/35 flex items-center justify-center active:scale-95 transition-all hover:scale-105 z-40"
        title="Quick Log Metrics"
        id="quick-log-fab"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Quick Log Modal Overlay */}
      <AnimatePresence>
        {showLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" id="quick-log-modal">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl relative border border-slate-100 dark:border-slate-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-on-surface dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
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
                    onChange={(e) => setLogSteps(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-2">
                    Heart Rate (BPM)
                  </label>
                  <input 
                    type="number"
                    value={logHeartRate}
                    onChange={(e) => setLogHeartRate(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-2">
                    Calories Burned (kcal)
                  </label>
                  <input 
                    type="number"
                    value={logCalories}
                    onChange={(e) => setLogCalories(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary text-sm font-semibold"
                  />
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
                    AI Clinical Dietitian Note: Your plan dynamically accommodates your {user.dietaryPreferences?.some(p => p.toLowerCase().includes("diabet") || p.toLowerCase().includes("sugar") || p.toLowerCase().includes("glucose") || p.toLowerCase().includes("metformin")) ? "Diabetic profile" : "Standard Vegetarian profile"} and active time window. We strictly restrict sweet fruits and optimize glycemic index bounds to preserve systemic glucose harmony.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 rounded-xl">
                    <span className="text-xs text-on-surface-variant dark:text-slate-400 block font-medium">Glycemic Index (GI) Target</span>
                    <span className="text-lg font-bold text-on-surface dark:text-slate-100 mt-1 block">&lt; 53 GI (Low)</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 inline-block">✓ Glucose spike safe</span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 rounded-xl">
                    <span className="text-xs text-on-surface-variant dark:text-slate-400 block font-medium">Est. Daily Calorie Intake</span>
                    <span className="text-lg font-bold text-on-surface dark:text-slate-100 mt-1 block">1,850 - 2,100 kcal</span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 inline-block">✓ Balanced energy output</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-on-surface dark:text-slate-100 mb-2">Dynamic Time-of-Day Dietary Rules</h4>
                  <p className="text-xs">
                    Your nourishment roadmap enforces strict circadian windows. In the morning and afternoon, a robust balanced breakfast and wholesome lunch (e.g. wheat chapatis, curry, protein dal, and small portion of rice) are essential to drive baseline metabolism. Conversely, evening and night hours restrict intake to a lighter, streamlined dinner (omitting heavy breakfast/lunch grains) to minimize overnight glycemic drift and cardiovascular load.
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-on-surface dark:text-slate-100 mb-2">Clinical Pre-Consultation Home Care Priority</h4>
                  <p className="text-xs">
                    Swasth-AI champions conservative home-based supportive remedies for minor self-limiting health disturbances (e.g. common cold, mild throat scratchiness, simple fatigue). Utilizing pure steam therapy, steady warm saline gargles, physical rest, and maintaining a robust 2500ml water hydration budget are powerful primary interventions. You should seek formal doctor visits and clinical care primarily for major, severe, or persistent symptoms.
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

      {/* Quick Log Vitals Modal (Blood Sugar & Blood Pressure) */}
      <AnimatePresence>
        {showVitalsLogModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" id="vitals-log-modal">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl relative border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-lg font-black text-on-surface dark:text-slate-100 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-pink-500 animate-pulse" />
                  Log Vital Reading
                </h3>
                <button 
                  onClick={() => setShowVitalsLogModal(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-on-surface-variant dark:text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!vitalsFeedback ? (
                <form onSubmit={handleLogVitalSubmit} className="space-y-5">
                  {/* Category Switcher Tabs */}
                  <div className="flex p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/60 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setVitalsType("blood_sugar")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        vitalsType === "blood_sugar"
                          ? "bg-white dark:bg-slate-900 text-pink-500 shadow-sm"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      Blood Sugar
                    </button>
                    <button
                      type="button"
                      onClick={() => setVitalsType("blood_pressure")}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        vitalsType === "blood_pressure"
                          ? "bg-white dark:bg-slate-900 text-pink-500 shadow-sm"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      Blood Pressure
                    </button>
                  </div>

                  {vitalsType === "blood_sugar" ? (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">
                            Glucose Value
                          </label>
                          {/* Unit Selector */}
                          <div className="flex gap-1 bg-slate-50 dark:bg-slate-950 p-0.5 rounded-md border border-slate-200/40 dark:border-slate-800/40">
                            <button
                              type="button"
                              onClick={() => setSugarUnit("mg/dL")}
                              className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                sugarUnit === "mg/dL"
                                  ? "bg-white dark:bg-slate-900 text-pink-500 shadow-sm"
                                  : "text-slate-400"
                              }`}
                            >
                              mg/dL
                            </button>
                            <button
                              type="button"
                              onClick={() => setSugarUnit("mmol/L")}
                              className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                sugarUnit === "mmol/L"
                                  ? "bg-white dark:bg-slate-900 text-pink-500 shadow-sm"
                                  : "text-slate-400"
                              }`}
                            >
                              mmol/L
                            </button>
                          </div>
                        </div>
                        <input
                          type="number"
                          step="0.1"
                          required
                          placeholder={sugarUnit === "mg/dL" ? "e.g. 110" : "e.g. 6.1"}
                          value={sugarVal}
                          onChange={(e) => setSugarVal(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-pink-500 text-sm font-semibold"
                        />
                      </div>

                      {/* Context selector tags */}
                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-2">
                          Reading Context (Sugar Targets Differ)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {(["Fasting", "Post-meal", "Random", "Bedtime"] as const).map((ctx) => (
                            <button
                              key={ctx}
                              type="button"
                              onClick={() => setSugarContext(ctx)}
                              className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                sugarContext === ctx
                                  ? "border-pink-500 bg-pink-500/5 text-pink-500 font-extrabold"
                                  : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:border-slate-300"
                              }`}
                            >
                              {ctx}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Systolic (mmHg)
                          </label>
                          <input
                            type="number"
                            required
                            placeholder="e.g. 120"
                            value={systolic}
                            onChange={(e) => setSystolic(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-pink-500 text-sm font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1.5">
                            Diastolic (mmHg)
                          </label>
                          <input
                            type="number"
                            required
                            placeholder="e.g. 80"
                            value={diastolic}
                            onChange={(e) => setDiastolic(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-pink-500 text-sm font-semibold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1.5">
                          Pulse Rate (BPM) <span className="text-[10px] text-slate-400 lowercase">(optional)</span>
                        </label>
                        <input
                          type="number"
                          placeholder="e.g. 72"
                          value={pulse}
                          onChange={(e) => setPulse(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-pink-500 text-sm font-semibold"
                        />
                      </div>
                    </div>
                  )}

                  {/* Manual Time Override */}
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-1.5">
                      Reading Time
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={logTime}
                      onChange={(e) => setLogTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-pink-500 text-sm font-semibold"
                    />
                  </div>

                  <div className="mt-6 flex gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setShowVitalsLogModal(false)}
                      className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoggingVitals}
                      className="flex-1 py-3 text-sm font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-xl transition-all shadow-md shadow-pink-500/10 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      {isLoggingVitals ? "Saving..." : "Save Reading"}
                    </button>
                  </div>
                </form>
              ) : (
                /* Interactive AI Feedback Overlay */
                <div className="space-y-4 py-2 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h4 className="text-sm font-extrabold text-on-surface dark:text-slate-100 flex items-center gap-1.5">
                      <Sparkles className="w-4.5 h-4.5 text-pink-500 animate-pulse" />
                      Immediate AI Analysis
                    </h4>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider border ${
                      vitalsFeedback.severity === "crisis" 
                        ? "bg-rose-500/10 text-rose-500 border-rose-500/30 animate-bounce"
                        : vitalsFeedback.severity === "abnormal"
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/30"
                        : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                    }`}>
                      {vitalsFeedback.severity === "crisis" ? "Urgent Critical" : vitalsFeedback.isNormal ? "Optimal Range" : "Attention Needed"}
                    </span>
                  </div>

                  {vitalsFeedback.severity === "crisis" && (
                    <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-500 p-4 rounded-2xl animate-pulse flex items-start gap-3">
                      <ShieldAlert className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-red-600 dark:text-red-400 font-extrabold uppercase tracking-wide">
                          ⚠️ EMERGENCY CRISIS THRESHOLD MET
                        </p>
                        <p className="text-[11px] text-red-500 dark:text-red-300 font-semibold leading-normal mt-1">
                          This is an extremely critical level. Please contact a qualified doctor or go to the nearest emergency room immediately. Do not delay!
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3">
                    <div className="text-xs text-on-surface dark:text-slate-200 font-medium leading-relaxed whitespace-pre-wrap">
                      {vitalsFeedback.analysis}
                    </div>
                  </div>

                  {/* Standard Medical Disclaimer */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/40 rounded-xl text-[10px] text-slate-400 leading-normal">
                    <span className="font-bold text-slate-500">Disclaimer:</span> Swasth AI provides supplementary general support based on standard values. This information is not a substitute for professional medical care, diagnosis, or treatment.
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setVitalsFeedback(null)}
                      className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all hover:bg-slate-200 cursor-pointer text-center"
                    >
                      Log Another
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowVitalsLogModal(false)}
                      className="flex-1 py-3 bg-pink-500 text-white rounded-xl text-xs font-bold transition-all hover:bg-pink-600 cursor-pointer text-center"
                    >
                      Close feedback
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
