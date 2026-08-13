import React, { useState, useEffect, useMemo } from "react";
import { User, SmartActions, Vitals, Medication, HealthReminder } from "../types";
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
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  let h = now.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if(h === 0) h = 12;
  const formattedTime = pad(h) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds()) + ' ' + ampm;

  return (
    <div className="inline-flex items-center gap-0 border border-[var(--border)] bg-[var(--surface-solid)] rounded-full p-1.5 opacity-0 animate-[rise_0.7s_ease_forwards_0.3s]">
      <span className="flex items-center gap-2.5 px-4 py-2 text-[12.5px] font-semibold text-[var(--ink-muted)] tracking-wider uppercase">
        <Calendar className="w-3.5 h-3.5 text-[var(--orange)] shrink-0" />
        {formattedDate}
      </span>
      <div className="w-[1px] self-stretch bg-[var(--border)] my-0.5"></div>
      <span className="flex items-center gap-2.5 px-4 py-2 text-[12.5px] font-semibold text-[var(--violet)] tracking-wider">
        <Clock className="w-3.5 h-3.5 text-[var(--orange)] shrink-0" />
        <span className="font-mono tracking-wide">{formattedTime}</span>
      </span>
    </div>
  );
};

const WaterConfetti = () => {
  const colors = ["#8B5CF6", "#6366F1", "#EC4899", "#22C55E", "#F59E0B"];
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
  onLogVitalsReading?: (reading: any) => Promise<any>;
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
  onOpenChat,
  medications = [],
  healthReminders = [],
  onReminderStatus,
  loading = false,
}: DashboardProps) {
  const [showLogModal, setShowLogModal] = useState(false);
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
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      const timer = setTimeout(() => setTriggerConfetti(false), 5000);
      setPrevWater(smartActions.waterLoggedMl);
      return () => clearTimeout(timer);
    }
    setPrevWater(smartActions.waterLoggedMl);
  }, [smartActions.waterLoggedMl, smartActions.waterGoalMl, prevWater]);

  const currentHour = new Date().getHours();
  const dietPlan = useMemo(() => getDietRecommendation(user), [user.dietaryPreferences, user.activeDiseases, user.weightKg, user.heightCm]);
  const displayName = user.fullName?.trim() || "there";
  
  const isDiabetic = (user.dietaryPreferences || []).some(p =>
    p.toLowerCase().includes("diabet") || p.toLowerCase().includes("sugar")
  ) || (user.activeDiseases || []).some(d => d.toLowerCase().includes("diabet"));

  let greeting = "Hello";
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

  const todayDay = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
  const todayReminders: any[] = [];
  medications.forEach(med => {
    if (med.reminderSet) todayReminders.push({ id: med.id, time: med.dueTime, label: med.name, detail: med.strength, type: "medication", status: med.taken ? "taken" : "pending" });
  });
  healthReminders.forEach(rem => {
    if (rem.enabled && rem.repeatDays.includes(todayDay)) {
      rem.times.forEach(time => todayReminders.push({ id: rem.id, time, label: rem.type === "Custom" ? rem.customLabel || "Custom" : rem.type, detail: rem.notes || rem.frequency, type: "health", status: "pending" }));
    }
  });
  todayReminders.sort((a, b) => a.time.localeCompare(b.time));
  const takenCount = todayReminders.filter(r => r.status === "taken").length;
  const adherencePct = todayReminders.length > 0 ? Math.round((takenCount / todayReminders.length) * 100) : 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 pb-24 text-[var(--ink)] font-sans min-h-screen">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes rise { from{ opacity:0; transform: translateY(10px); } to{ opacity:1; transform: translateY(0); } }
        @keyframes draw-beat { 0%{ stroke-dashoffset:60; } 45%{ stroke-dashoffset:0; } 100%{ stroke-dashoffset:-60; } }
        @keyframes dot-pulse { 0%{ box-shadow: 0 0 0 0 rgba(245,158,11,0.45); } 70%{ box-shadow: 0 0 0 7px rgba(245,158,11,0); } 100%{ box-shadow: 0 0 0 0 rgba(245,158,11,0); } }
        @keyframes travel { 0%{ stroke-dashoffset: 1400; } 60%{ stroke-dashoffset: 0; } 100%{ stroke-dashoffset: -1400; } }
        @keyframes fill-ring { to{ stroke-dashoffset: 46.4; } }
      `}} />

      <AnimatePresence>
        {triggerConfetti && <WaterConfetti />}
      </AnimatePresence>



      {/* Pulse Divider */}
      <div className="w-full h-8 mb-2 opacity-85">
        <svg viewBox="0 0 1180 34" preserveAspectRatio="none" className="w-full h-full block">
          <defs>
            <linearGradient id="pulseGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--violet)" stopOpacity="0"/>
              <stop offset="45%" stopColor="var(--orange)"/>
              <stop offset="55%" stopColor="var(--pink)"/>
              <stop offset="100%" stopColor="var(--pink)" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path style={{fill:'none', stroke:'url(#pulseGrad)', strokeWidth:1.4, strokeLinecap:'round', strokeLinejoin:'round', strokeDasharray:1400, strokeDashoffset:1400, animation:'travel 5.5s linear infinite'}} d="M0,17 H480 L505,17 L515,4 L528,30 L540,17 L555,17 L565,10 L575,17 H1180"/>
        </svg>
      </div>

      {/* Hero */}
      <div className="py-4 pb-6">
        <h1 className="font-serif font-medium text-[clamp(30px,4.4vw,44px)] leading-[1.1] mb-4 opacity-0 animate-[rise_0.7s_ease_forwards_0.15s]">
          {greeting}, <span className="italic bg-gradient-to-r from-[var(--orange)] to-[var(--pink)] bg-clip-text text-transparent">{displayName}</span>.
        </h1>
        <ClockDisplay />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.62fr_1fr] gap-6 mt-8">
        {/* Left Column: Today's Plan (AI Diet) */}
        <div className="bg-gradient-to-br from-[var(--surface-raised)] to-[var(--surface-solid)] border border-[var(--border)] rounded-[20px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.55)] p-8 opacity-0 animate-[rise_0.7s_ease_forwards_0.42s] flex flex-col">
          <span className="text-[11.5px] font-bold tracking-[0.14em] uppercase text-[var(--ink-faint)] mb-3.5 ml-0.5">Today's plan</span>
          
          <div className="flex flex-wrap gap-2.5 mb-3.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide bg-[rgba(139,92,246,0.12)] text-[var(--violet)] border border-[rgba(139,92,246,0.25)]">
              Daily analysis
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide bg-[rgba(245,158,11,0.14)] text-[var(--orange)] border border-[rgba(245,158,11,0.3)]">
              <Zap className="w-3 h-3" /> 1 credit / day auto-deducted
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide bg-[rgba(236,72,153,0.14)] text-[var(--pink)] border border-[rgba(236,72,153,0.3)]">
              {isDiabetic ? "Diabetic protocol" : "Balanced protocol"}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-5">
            <div className="w-14 h-14 rounded-[14px] bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shrink-0">
              <Utensils className="w-6 h-6 text-[var(--violet)]" />
            </div>
            <h2 className="font-serif font-medium text-3xl leading-[1.15] m-0 text-[var(--ink)]">AI Diet Recommendation</h2>
          </div>

          <p className="mt-5 text-[var(--ink-muted)] text-[14.5px] leading-[1.65] max-w-[46ch]">
            Built from yesterday's logs and your goals — a plate ratio tuned for steady energy through the afternoon, with a lighter dinner window.
          </p>

          <div className="flex flex-col gap-3 mt-6">
            <div className="flex items-center gap-3">
              <span className="text-[12.5px] text-[var(--ink-muted)] w-[72px] shrink-0">Protein</span>
              <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-raised)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-[1.2s] ease-[cubic-bezier(0.2,0.8,0.2,1)] bg-[var(--violet)] w-[78%]"></div>
              </div>
              <span className="text-xs text-[var(--ink-faint)] w-[34px] text-right shrink-0">78g</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12.5px] text-[var(--ink-muted)] w-[72px] shrink-0">Carbs</span>
              <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-raised)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-[1.2s] ease-[cubic-bezier(0.2,0.8,0.2,1)] bg-[var(--orange)] w-[64%]"></div>
              </div>
              <span className="text-xs text-[var(--ink-faint)] w-[34px] text-right shrink-0">210g</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12.5px] text-[var(--ink-muted)] w-[72px] shrink-0">Fats</span>
              <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-raised)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-[1.2s] ease-[cubic-bezier(0.2,0.8,0.2,1)] bg-[var(--pink)] w-[45%]"></div>
              </div>
              <span className="text-xs text-[var(--ink-faint)] w-[34px] text-right shrink-0">58g</span>
            </div>
          </div>

          <div className="flex items-center gap-3.5 mt-6">
            <button onClick={() => setShowFullReport(true)} className="px-5 py-3 rounded-xl border-none bg-gradient-to-br from-[var(--violet)] to-[#A855F7] text-white font-bold text-sm cursor-pointer shadow-[0_10px_24px_-10px_rgba(139,92,246,0.5)] transition-transform hover:-translate-y-0.5 active:scale-95">
              View full plan
            </button>
            <button className="px-4 py-3 rounded-xl bg-transparent border border-[var(--border)] text-[var(--ink-muted)] font-semibold text-sm cursor-pointer transition-colors hover:bg-[var(--surface-raised)] hover:text-[var(--ink)]">
              Regenerate
            </button>
          </div>
        </div>

        {/* Right Column: Smart Actions */}
        <div className="flex flex-col gap-4">
          <span className="text-[11.5px] font-bold tracking-[0.14em] uppercase text-[var(--ink-faint)] mb-0 ml-1">Smart actions</span>

          {/* Water Log */}
          <div className="bg-gradient-to-br from-[var(--surface-raised)] to-[var(--surface-solid)] border border-[var(--border)] rounded-[20px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.55)] p-5 opacity-0 animate-[rise_0.7s_ease_forwards_0.55s]">
            <div className="flex items-center gap-3.5">
              <div className="relative w-11 h-11 shrink-0">
                <svg viewBox="0 0 46 46" className="-rotate-90 w-11 h-11">
                  <circle cx="23" cy="23" r="18.5" fill="none" stroke="rgba(236,72,153,0.15)" strokeWidth="4" />
                  <circle cx="23" cy="23" r="18.5" fill="none" stroke="var(--pink)" strokeWidth="4" strokeLinecap="round" strokeDasharray="116" strokeDashoffset={116 - (116 * Math.min(smartActions.waterLoggedMl/smartActions.waterGoalMl, 1))} className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Droplet className="w-4 h-4 text-[var(--pink)]" />
                </div>
              </div>
              <div className="flex-1">
                <div className="font-bold text-[14.5px] text-[var(--ink)]">Log 500ml water</div>
                <div className="text-[12px] text-[var(--ink-faint)] mt-0.5">Progress: {smartActions.waterLoggedMl} / {smartActions.waterGoalMl}ml</div>
              </div>
              <button onClick={() => onUpdateWater(500)} className="w-8 h-8 rounded-lg border border-[rgba(236,72,153,0.3)] bg-[rgba(236,72,153,0.14)] text-[var(--pink)] flex items-center justify-center font-bold text-lg cursor-pointer transition-all hover:bg-[rgba(236,72,153,0.28)] hover:scale-105 shrink-0">
                +
              </button>
            </div>
          </div>

          {/* Evening Walk Reminder */}
          <div className="bg-gradient-to-br from-[var(--surface-raised)] to-[var(--surface-solid)] border border-[var(--border)] rounded-[20px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.55)] p-5 opacity-0 animate-[rise_0.7s_ease_forwards_0.68s]">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[rgba(236,72,153,0.14)] flex items-center justify-center shrink-0">
                <Moon className="w-5 h-5 text-[var(--pink)]" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-[14.5px] text-[var(--ink)]">Evening walk reminder</div>
                <div className="text-[12px] text-[var(--ink-faint)] mt-0.5">20 min · usually 6:30 PM</div>
              </div>
              <button className="w-8 h-8 rounded-lg border border-[rgba(236,72,153,0.3)] bg-[rgba(236,72,153,0.14)] text-[var(--pink)] flex items-center justify-center font-bold text-lg cursor-pointer transition-all hover:bg-[rgba(236,72,153,0.28)] hover:scale-105 shrink-0">
                +
              </button>
            </div>
            <div className="h-px bg-[var(--border)] my-4"></div>
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-bold text-[var(--orange)]">HeCo streak</span>
              <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--orange)] text-black text-[11px] font-bold">
                <Zap className="w-3 h-3" /> 5 days
              </span>
            </div>
          </div>

          {/* Today's Reminders (Injected here) */}
          {todayReminders.length > 0 && (
            <div className="bg-gradient-to-br from-[var(--surface-raised)] to-[var(--surface-solid)] border border-[var(--border)] rounded-[20px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.55)] p-5 opacity-0 animate-[rise_0.7s_ease_forwards_0.8s]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[var(--violet)]" />
                  <h3 className="text-xs font-black text-[var(--ink)] uppercase tracking-wider">Today's Reminders</h3>
                </div>
                <span className="text-[10px] font-bold text-[var(--ink-muted)]">
                  {takenCount}/{todayReminders.length}
                </span>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {todayReminders.map((r, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3 py-2 bg-[var(--surface-solid)] rounded-xl border border-[var(--border)]">
                    <span className="text-[10px] font-mono font-bold text-[var(--ink-muted)] w-12 shrink-0">{r.time}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-[var(--ink)] truncate">{r.label}</p>
                      <p className="text-[9px] text-[var(--ink-faint)] truncate">{r.detail}</p>
                    </div>
                    {r.status === "taken" ? (
                      <span className="px-2 py-1 rounded-lg bg-[rgba(34,197,94,0.15)] text-[var(--green)] text-[9px] font-bold flex items-center gap-1">
                        <Check className="w-2.5 h-2.5" /> Done
                      </span>
                    ) : (
                      <button onClick={() => onReminderStatus?.(r.id, r.type, "taken")} className="px-2 py-1 rounded-lg bg-[rgba(139,92,246,0.15)] text-[var(--violet)] text-[9px] font-bold hover:bg-[rgba(139,92,246,0.25)] transition-all cursor-pointer">
                        Take
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Quick Actions / Vitals Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-[var(--surface-raised)] border border-[var(--border)] p-4 rounded-[20px] flex flex-col items-center text-center shadow-lg transition-transform hover:-translate-y-1">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(236,72,153,0.1)] text-[var(--pink)] flex items-center justify-center mb-3">
            <Heart className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-faint)]">Heart Rate</span>
          <span className="text-2xl font-black text-[var(--ink)] mt-1">{vitals.heartRate > 0 ? vitals.heartRate : "—"} <span className="text-xs text-[var(--ink-muted)]">BPM</span></span>
        </div>
        <div className="bg-[var(--surface-raised)] border border-[var(--border)] p-4 rounded-[20px] flex flex-col items-center text-center shadow-lg transition-transform hover:-translate-y-1">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(139,92,246,0.1)] text-[var(--violet)] flex items-center justify-center mb-3">
            <Footprints className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-faint)]">Steps</span>
          <span className="text-2xl font-black text-[var(--ink)] mt-1">{vitals.steps > 0 ? vitals.steps.toLocaleString() : "—"}</span>
        </div>
        <div className="bg-[var(--surface-raised)] border border-[var(--border)] p-4 rounded-[20px] flex flex-col items-center text-center shadow-lg transition-transform hover:-translate-y-1">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(99,102,241,0.1)] text-[var(--blue)] flex items-center justify-center mb-3">
            <Moon className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-faint)]">Sleep</span>
          <span className="text-2xl font-black text-[var(--ink)] mt-1">{vitals.sleep || "—"}</span>
        </div>
        <div className="bg-[var(--surface-raised)] border border-[var(--border)] p-4 rounded-[20px] flex flex-col items-center text-center shadow-lg transition-transform hover:-translate-y-1">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(245,158,11,0.1)] text-[var(--orange)] flex items-center justify-center mb-3">
            <Flame className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ink-faint)]">Calories</span>
          <span className="text-2xl font-black text-[var(--ink)] mt-1">{vitals.calories > 0 ? vitals.calories : "—"} <span className="text-xs text-[var(--ink-muted)]">kcal</span></span>
        </div>
      </div>



      {/* Modals placeholders */}
      <WellnessHydrationModal isOpen={showWellnessModal} onClose={() => setShowWellnessModal(false)} waterLoggedMl={smartActions.waterLoggedMl} waterGoalMl={smartActions.waterGoalMl} onUpdateWater={onUpdateWater} />
      
      {/* Basic Full Report Modal Port */}
      <AnimatePresence>
        {showFullReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="bg-[var(--bg)] rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative border border-[var(--border)] max-h-[85vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[var(--ink)] flex items-center gap-2">
                  <Utensils className="w-6 h-6 text-[var(--violet)]" /> Clinical Dietary Report
                </h3>
                <button onClick={() => setShowFullReport(false)} className="p-1.5 hover:bg-[var(--surface-raised)] rounded-lg text-[var(--ink-muted)] transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-[var(--ink-muted)] text-sm leading-relaxed bg-[var(--surface)] p-4 rounded-xl border border-[var(--border)]">
                  {dietPlan.clinicalNote}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                    <div className="text-xs text-[var(--ink-faint)] uppercase tracking-wider mb-1">GI Target</div>
                    <div className="text-lg font-bold text-[var(--ink)]">{dietPlan.glycemicIndex}</div>
                  </div>
                  <div className="p-4 bg-[var(--surface)] rounded-xl border border-[var(--border)]">
                    <div className="text-xs text-[var(--ink-faint)] uppercase tracking-wider mb-1">Calories</div>
                    <div className="text-lg font-bold text-[var(--ink)]">{dietPlan.calorieEstimate}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes ripple { 0%{ transform: scale(0.9); opacity: 0.8; } 100%{ transform: scale(1.35); opacity: 0; } }
      `}} />
    </div>
  );
}
