import React, { useState, useEffect } from "react";
import { User, SmartActions, Vitals } from "../types";
import { Activity, Droplet, Pill, Wind, Heart, Footprints, Moon, Flame, Plus, ChevronRight, X, Sparkles, Clock, Calendar, Utensils, Apple, Info, ShieldAlert, Candy, Zap, MessageSquare } from "lucide-react";
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
}: DashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [logSteps, setLogSteps] = useState(vitals.steps);
  const [logHeartRate, setLogHeartRate] = useState(vitals.heartRate);
  const [logCalories, setLogCalories] = useState(vitals.calories);
  const [showFullReport, setShowFullReport] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState<Date>(new Date());
  
  const [prevWater, setPrevWater] = useState(smartActions.waterLoggedMl);
  const [triggerConfetti, setTriggerConfetti] = useState(false);

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
  } else if (currentHour >= 12 && currentHour < 17) {
    greeting = "Good afternoon";
  } else if (currentHour >= 17 && currentHour < 21) {
    greeting = "Good evening";
  } else {
    greeting = "Good night";
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
            className="text-3xl md:text-5xl font-black tracking-tight flex items-center flex-wrap gap-2 md:gap-3"
          >
            <span className="bg-gradient-to-br from-primary via-blue-500 to-emerald-400 bg-clip-text text-transparent pb-1 drop-shadow-sm">
              {greeting}, {user.fullName || "Sarah"}.
            </span>
            {user.dob && (
              <span className="text-xs md:text-sm font-bold text-slate-500 dark:text-slate-400 tracking-wide border border-slate-200/60 dark:border-slate-700/60 bg-white/50 dark:bg-slate-800/50 px-2.5 py-1 rounded-full shadow-sm">
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
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-row items-center gap-3 shrink-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/40 dark:border-slate-700/40 px-3 py-2 md:px-4 md:py-2.5 rounded-xl shadow-sm dark:shadow-[0_4px_20px_rgb(0,0,0,0.15)] hover:scale-[1.02] transition-transform duration-300 self-start xl:self-auto"
        >
          <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
            <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
            <span>{formattedDate}</span>
          </div>
          <div className="w-px h-4 md:h-5 bg-slate-300 dark:bg-slate-700"></div>
          <div className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm font-black text-on-surface dark:text-slate-200 tracking-wider">
            <Clock className="w-3.5 h-3.5 md:w-4 md:h-4 text-secondary animate-pulse" />
            <span className="font-mono bg-gradient-to-r from-slate-700 to-slate-500 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">{formattedTime}</span>
          </div>
        </motion.div>
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
                      <span className={`text-[10px] px-3.5 py-1.5 rounded-full font-black uppercase tracking-widest shadow-sm border ${currentHour >= 5 && currentHour < 17 ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30" : "bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/30"}`}>
                        {user.dietaryPreferences?.some(p => p.toLowerCase().includes("diabet") || p.toLowerCase().includes("sugar") || p.toLowerCase().includes("glucose") || p.toLowerCase().includes("metformin")) ? "Diabetic Protocol" : "Balanced Protocol"}
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

                {/* Dynamic meal listing based on local time */}
                <div className="space-y-4 mt-6">
                  {currentHour >= 5 && currentHour < 17 ? (
                    <>
                      <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Nutrition Window: Breakfast & Lunch</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-900/80 p-5 border border-slate-200/60 dark:border-slate-700/60 rounded-3xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                          <span className="text-xs font-black text-primary uppercase block mb-2 tracking-wide">Breakfast suggestion</span>
                          {user.dietaryPreferences?.some(p => p.toLowerCase().includes("diabet") || p.toLowerCase().includes("sugar") || p.toLowerCase().includes("glucose") || p.toLowerCase().includes("metformin")) ? (
                            <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                              <Utensils className="w-4 h-4 inline-block mr-1 text-primary" />
                              Warm steel-cut oatmeal topped with sugar-free walnuts and chia seeds. <span className="text-rose-500 dark:text-rose-400 font-bold font-mono text-[11px] block mt-2 bg-rose-50 dark:bg-rose-500/10 p-2 rounded-lg border border-rose-100 dark:border-rose-500/20"><ShieldAlert className="w-3 h-3 inline-block mr-1" />Glycemic spike control: No sweet fruits!</span>
                            </p>
                          ) : (
                            <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                              <Apple className="w-4 h-4 inline-block mr-1 text-primary" />
                              Fresh Whole Apple or sliced pear accompanied by simple high-fiber grains and mixed raw nuts.
                            </p>
                          )}
                        </div>
                        <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/80 dark:to-slate-900/80 p-5 border border-slate-200/60 dark:border-slate-700/60 rounded-3xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
                          <span className="text-xs font-black text-secondary uppercase block mb-2 tracking-wide">Lunch suggestion</span>
                          <p className="text-sm text-slate-700 dark:text-slate-300 font-semibold leading-relaxed">
                              <Utensils className="w-4 h-4 inline-block mr-1 text-secondary" />
                              Complete vegetarian balanced lunch: 2-3 soft whole-wheat chapatis, protein-packed lentil dal, seasonal dry curry, and a small portion of steamed brown rice.
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
                            Light Evening Dinner: 1-2 soft chapatis paired with a healthy seasonal dry vegetable curry, nutritious warm dal, and a light portion of steamed rice. Take at least 2 hours before resting.
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
                <span>Hydration Goal</span>
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
                <p className="font-extrabold text-on-surface dark:text-white text-sm sm:text-base truncate">Take Vitamin D</p>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 sm:mt-1 font-semibold truncate">Morning Dosage</p>
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
                <p className="font-extrabold text-on-surface dark:text-white text-sm sm:text-base truncate">3min Breathing</p>
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

      {/* Health Insights Grid */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6" id="vitals-grid">
        {/* Heart Rate */}
        <div className="group bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/90 dark:to-slate-800/80 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 p-3 sm:p-4 md:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center text-center shadow-lg shadow-slate-200/50 dark:shadow-black/20 hover:shadow-[0_10px_40px_-10px_rgba(239,68,68,0.3)] transition-all duration-300 hover:-translate-y-2 cursor-default" id="vital-heart-rate">
          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-100 to-red-200 dark:from-red-500/20 dark:to-red-600/10 text-red-600 flex items-center justify-center mb-2 sm:mb-3 md:mb-4 shadow-inner group-hover:scale-110 transition-transform duration-300">
            <Heart className="w-5 h-5 sm:w-6 sm:h-6 fill-red-500/80 dark:fill-red-500" />
          </div>
          <p className="text-[10px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Heart Rate</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-on-surface dark:text-white mt-1 sm:mt-2 flex items-baseline gap-1">
            {vitals.heartRate} <span className="text-[10px] sm:text-sm font-bold text-slate-400 dark:text-slate-500">BPM</span>
          </p>
        </div>

        {/* Steps */}
        <div className="group bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/90 dark:to-slate-800/80 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 p-3 sm:p-4 md:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center text-center shadow-lg shadow-slate-200/50 dark:shadow-black/20 hover:shadow-[0_10px_40px_-10px_rgba(59,130,246,0.3)] transition-all duration-300 hover:-translate-y-2 cursor-default" id="vital-steps">
          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-500/20 dark:to-blue-600/10 text-primary flex items-center justify-center mb-2 sm:mb-3 md:mb-4 shadow-inner group-hover:scale-110 transition-transform duration-300">
            <Footprints className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
          <p className="text-[10px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Steps</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-on-surface dark:text-white mt-1 sm:mt-2 flex items-baseline gap-1">
            {vitals.steps.toLocaleString()}
          </p>
        </div>

        {/* Sleep */}
        <div className="group bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/90 dark:to-slate-800/80 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 p-3 sm:p-4 md:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center text-center shadow-lg shadow-slate-200/50 dark:shadow-black/20 hover:shadow-[0_10px_40px_-10px_rgba(139,92,246,0.3)] transition-all duration-300 hover:-translate-y-2 cursor-default" id="vital-sleep">
          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-500/20 dark:to-purple-600/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2 sm:mb-3 md:mb-4 shadow-inner group-hover:scale-110 transition-transform duration-300">
            <Moon className="w-5 h-5 sm:w-6 sm:h-6 fill-purple-500/80 dark:fill-purple-400" />
          </div>
          <p className="text-[10px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Sleep</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-on-surface dark:text-white mt-1 sm:mt-2 flex items-baseline gap-1">
            {vitals.sleep}
          </p>
        </div>

        {/* Calories */}
        <div className="group bg-gradient-to-br from-white to-slate-50 dark:from-slate-900/90 dark:to-slate-800/80 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 p-3 sm:p-4 md:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col items-center text-center shadow-lg shadow-slate-200/50 dark:shadow-black/20 hover:shadow-[0_10px_40px_-10px_rgba(249,115,22,0.3)] transition-all duration-300 hover:-translate-y-2 cursor-default" id="vital-calories">
          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 dark:from-orange-500/20 dark:to-orange-600/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-2 sm:mb-3 md:mb-4 shadow-inner group-hover:scale-110 transition-transform duration-300">
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 fill-orange-500/80 dark:fill-orange-400" />
          </div>
          <p className="text-[10px] sm:text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Calories</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-black text-on-surface dark:text-white mt-1 sm:mt-2 flex items-baseline gap-1">
            {vitals.calories} <span className="text-[10px] sm:text-sm font-bold text-slate-400 dark:text-slate-500">kcal</span>
          </p>
        </div>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

    </motion.div>
  );
}
