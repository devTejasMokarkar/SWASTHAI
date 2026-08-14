import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { User, SmartActions, Vitals, Medication, HealthReminder } from "../types";
import {
  Droplet, Flame, Heart, Footprints, Moon, Zap, Utensils,
  X, Clock, Calendar, Check, Bell,
} from "lucide-react";
import WellnessHydrationModal from "./WellnessHydrationModal";
import { getDietRecommendation } from "../utils/dietRecommendations";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";

/* ─── Clock ─────────────────────────────────────────────────────────── */
const ClockDisplay = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const formattedDate = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const pad = (n: number) => n.toString().padStart(2, "0");
  let h = now.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const time = `${pad(h)}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${ampm}`;

  return (
    <div className="inline-flex items-center gap-0 rounded-full p-1 opacity-0 animate-[rise_0.7s_ease_forwards_0.3s]"
      style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <span className="flex items-center gap-2 px-4 py-2 text-[12px] font-semibold tracking-wider uppercase"
        style={{ color: 'var(--text-dim)' }}>
        <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--amber)' }} />
        {formattedDate}
      </span>
      <div className="w-px self-stretch my-1" style={{ background: 'var(--border)' }} />
      <span className="flex items-center gap-2 px-4 py-2 text-[12px] font-semibold tracking-wider"
        style={{ color: 'var(--violet)', fontFamily: 'var(--font-mono)' }}>
        <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--amber)' }} />
        {time}
      </span>
    </div>
  );
};

/* ─── Water confetti ────────────────────────────────────────────────── */
const WaterConfetti = () => {
  const colors = ["#7C3AED", "#5B5BD6", "#D6409F", "#22C55E", "#E8952F"];
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
        <motion.div key={p.id} className="absolute"
          style={{ left: `${p.left}%`, width: p.size, height: p.size, backgroundColor: p.color, borderRadius: p.shape === "circle" ? "50%" : "0%", top: "-20px" }}
          initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", x: p.xOffset, opacity: [1, 1, 0.8, 0], rotate: 720 * (Math.random() > 0.5 ? 1 : -1) }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
};

/* ─── Count-up hook ─────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 900, start = true) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start || target === 0) { setValue(target); return; }
    let startTs: number | null = null;
    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const progress = Math.min((ts - startTs) / duration, 1);
      setValue(Math.round(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

/* ─── Stat card ──────────────────────────────────────────────────────── */
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  unit?: string;
  detail?: string;
  accentColor: string;
  accentBg: string;
  delay?: string;
  animate?: boolean;
}
const StatCard: React.FC<StatCardProps> = ({ icon, label, value, unit, detail, accentColor, accentBg, delay = "0s", animate = false }) => {
  const [revealed, setRevealed] = useState(false);
  const numVal = typeof value === "number" ? value : 0;
  const displayVal = useCountUp(numVal, 900, animate && typeof value === "number");

  return (
    <div
      onClick={() => detail && setRevealed(r => !r)}
      className="rounded-[var(--radius-lg)] p-5 flex flex-col items-center text-center transition-all hover:-translate-y-1 opacity-0 animate-[rise_0.7s_ease_forwards]"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        animationDelay: delay,
        cursor: detail ? 'pointer' : 'default',
      }}
    >
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: accentBg, color: accentColor }}>
        {icon}
      </div>
      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{label}</span>
      <AnimatePresence mode="wait">
        {revealed && detail ? (
          <motion.span key="detail" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="text-[13px] font-semibold mt-1.5 leading-tight" style={{ color: 'var(--text-dim)' }}>
            {detail}
          </motion.span>
        ) : (
          <motion.span key="val" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="text-2xl font-black mt-1" style={{ color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>
            {typeof value === "number" && animate ? displayVal.toLocaleString() : (typeof value === "number" && value > 0 ? value.toLocaleString() : value || "—")}
            {unit && <span className="text-xs font-semibold ml-1" style={{ color: 'var(--muted)' }}>{unit}</span>}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── MacroBar ───────────────────────────────────────────────────────── */
interface MacroBarProps { label: string; pct: number; grams: number; color: string; delay?: string }
const MacroBar: React.FC<MacroBarProps> = ({ label, pct, grams, color, delay = "0s" }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="flex items-center gap-3">
      <span className="text-[12.5px] w-[68px] shrink-0" style={{ color: 'var(--text-dim)' }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full transition-all ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          style={{
            background: color,
            width: inView ? `${pct}%` : '0%',
            transitionDuration: '1.2s',
            transitionDelay: delay,
          }} />
      </div>
      <span className="text-[11px] w-[34px] text-right shrink-0" style={{ color: 'var(--muted)' }}>{grams}g</span>
    </div>
  );
};

/* ─── Props ──────────────────────────────────────────────────────────── */
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
  onUpdateVitals,
  onOpenChat,
  medications = [],
  healthReminders = [],
  onReminderStatus,
}: DashboardProps) {
  const [showFullReport, setShowFullReport] = useState(false);
  const [showWellnessModal, setShowWellnessModal] = useState(false);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  const [prevWater, setPrevWater] = useState(smartActions.waterLoggedMl);
  const [triggerConfetti, setTriggerConfetti] = useState(false);

  useEffect(() => {
    if (smartActions.waterLoggedMl >= smartActions.waterGoalMl && prevWater < smartActions.waterGoalMl) {
      setTriggerConfetti(true);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      setTimeout(() => setTriggerConfetti(false), 5000);
    }
    setPrevWater(smartActions.waterLoggedMl);
  }, [smartActions.waterLoggedMl, smartActions.waterGoalMl]);

  // Trigger count-up when stats row enters viewport
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true); }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const currentHour = new Date().getHours();
  const dietPlan = useMemo(() => getDietRecommendation(user), [user.dietaryPreferences, user.activeDiseases, user.weightKg, user.heightCm]);
  const displayName = user.fullName?.trim() || user.email?.split('@')[0]?.trim() || "there";

  const isDiabetic = (user.dietaryPreferences || []).some(p =>
    p.toLowerCase().includes("diabet") || p.toLowerCase().includes("sugar")
  ) || (user.activeDiseases || []).some(d => d.toLowerCase().includes("diabet"));

  let greeting = "Hello";
  if (currentHour >= 5 && currentHour < 12) greeting = "Good morning";
  else if (currentHour >= 12 && currentHour < 17) greeting = "Good afternoon";
  else if (currentHour >= 17 && currentHour < 21) greeting = "Good evening";
  else greeting = "Good night";

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

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 pb-24 min-h-screen" style={{ color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>

      <AnimatePresence>
        {triggerConfetti && <WaterConfetti />}
      </AnimatePresence>

      {/* ── Pulse Divider ── */}
      <div className="w-full h-8 mb-2 opacity-90">
        <svg viewBox="0 0 1180 34" preserveAspectRatio="none" className="w-full h-full block">
          <defs>
            <linearGradient id="pulseGradV2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="var(--violet)"  stopOpacity="0" />
              <stop offset="35%"  stopColor="var(--violet)"  stopOpacity="1" />
              <stop offset="65%"  stopColor="var(--magenta)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--magenta)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            className="pulse-travel"
            fill="none" stroke="url(#pulseGradV2)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
            d="M0,17 H480 L505,17 L515,4 L528,30 L540,17 L555,17 L565,10 L575,17 H1180"
          />
        </svg>
      </div>

      {/* ── Hero ── */}
      <div className="py-4 pb-6">
        <h1 className="font-medium leading-[1.1] mb-4 opacity-0 animate-[rise_0.7s_ease_forwards_0.15s]"
          style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px,4.2vw,44px)' }}>
          {greeting},{" "}
          <em className="not-italic italic" style={{
            background: 'linear-gradient(90deg, var(--violet) 0%, var(--magenta) 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {displayName}
          </em>.
        </h1>
        <ClockDisplay />
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.62fr_1fr] gap-6 mt-8">

        {/* Left: AI Diet Card */}
        <div className="rounded-[var(--radius-lg)] p-7 flex flex-col opacity-0 animate-[rise_0.7s_ease_forwards_0.42s]"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>

          <span className="text-[11px] font-bold tracking-[0.14em] uppercase mb-3" style={{ color: 'var(--muted)' }}>
            Today's plan
          </span>

          {/* Tag row */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide"
              style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.22)', color: 'var(--violet)' }}>
              Daily analysis
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide"
              style={{ background: 'rgba(232,149,47,0.12)', border: '1px solid rgba(232,149,47,0.28)', color: 'var(--amber)' }}>
              <Zap className="w-3 h-3" /> 1 credit / day
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide"
              style={{ background: 'rgba(214,64,159,0.12)', border: '1px solid rgba(214,64,159,0.28)', color: 'var(--magenta)' }}>
              {isDiabetic ? "Diabetic protocol" : "Balanced protocol"}
            </span>
          </div>

          {/* Icon tile + title */}
          <div className="flex items-center gap-4 mt-2">
            <div className="w-14 h-14 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
              style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid var(--border)', color: 'var(--violet)' }}>
              <Utensils className="w-6 h-6" />
            </div>
            <h2 className="font-medium text-[26px] leading-[1.2]"
              style={{ fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>
              AI Diet Recommendation
            </h2>
          </div>

          <p className="mt-4 text-[14px] leading-[1.7] max-w-[46ch]" style={{ color: 'var(--text-dim)' }}>
            Built from yesterday's logs and your goals — a plate ratio tuned for steady energy through the afternoon, with a lighter dinner window.
          </p>

          {/* Macro bars */}
          <div className="flex flex-col gap-3 mt-5">
            <MacroBar label="Protein" pct={78} grams={78} color="var(--violet)" delay="0.1s" />
            <MacroBar label="Carbs"   pct={64} grams={210} color="var(--amber)"  delay="0.2s" />
            <MacroBar label="Fats"    pct={45} grams={58} color="var(--magenta)" delay="0.3s" />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6">
            <button onClick={() => setShowFullReport(true)}
              className="px-5 py-2.5 rounded-[var(--radius-sm)] text-white text-sm font-bold cursor-pointer transition-all hover:-translate-y-0.5 active:scale-95"
              style={{ background: 'var(--grad-btn)', boxShadow: '0 8px 20px -8px rgba(124,58,237,0.5)' }}>
              View full plan
            </button>
            <button className="px-4 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold cursor-pointer transition-colors"
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
              Regenerate
            </button>
          </div>
        </div>

        {/* Right: Smart Actions */}
        <div className="flex flex-col gap-4">
          <span className="text-[11px] font-bold tracking-[0.14em] uppercase ml-1" style={{ color: 'var(--muted)' }}>
            Smart actions
          </span>

          {/* Water Log */}
          <div className="rounded-[var(--radius-lg)] p-5 opacity-0 animate-[rise_0.7s_ease_forwards_0.55s]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="flex items-center gap-3.5">
              {/* Ring progress */}
              <div className="relative w-11 h-11 shrink-0">
                <svg viewBox="0 0 46 46" className="-rotate-90 w-11 h-11">
                  <circle cx="23" cy="23" r="18.5" fill="none" stroke="rgba(214,64,159,0.15)" strokeWidth="4" />
                  <circle cx="23" cy="23" r="18.5" fill="none" stroke="var(--magenta)" strokeWidth="4"
                    strokeLinecap="round" strokeDasharray="116"
                    strokeDashoffset={116 - (116 * Math.min(smartActions.waterLoggedMl / smartActions.waterGoalMl, 1))}
                    className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Droplet className="w-4 h-4" style={{ color: 'var(--magenta)' }} />
                </div>
              </div>
              <div className="flex-1">
                <div className="font-bold text-[14px]" style={{ color: 'var(--text)' }}>Log 500ml water</div>
                <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  {smartActions.waterLoggedMl} / {smartActions.waterGoalMl} ml
                </div>
              </div>
              <button onClick={() => onUpdateWater(500)}
                className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center font-bold text-lg cursor-pointer transition-all hover:scale-105"
                style={{ background: 'rgba(214,64,159,0.12)', border: '1px solid rgba(214,64,159,0.28)', color: 'var(--magenta)' }}>
                +
              </button>
            </div>
          </div>

          {/* Evening Walk + Streak */}
          <div className="rounded-[var(--radius-lg)] p-5 opacity-0 animate-[rise_0.7s_ease_forwards_0.68s]"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                style={{ background: 'rgba(214,64,159,0.10)', color: 'var(--magenta)' }}>
                <Moon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-[14px]" style={{ color: 'var(--text)' }}>Evening walk reminder</div>
                <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--muted)' }}>20 min · usually 6:30 PM</div>
              </div>
              <button className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center font-bold text-lg cursor-pointer transition-all hover:scale-105"
                style={{ background: 'rgba(214,64,159,0.12)', border: '1px solid rgba(214,64,159,0.28)', color: 'var(--magenta)' }}>
                +
              </button>
            </div>
            <div className="h-px my-4" style={{ background: 'var(--border)' }} />
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-bold" style={{ color: 'var(--amber)' }}>HeCo streak</span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold text-black"
                style={{ background: 'var(--amber)' }}>
                <Zap className="w-3 h-3" /> 5 days
              </span>
            </div>
          </div>

          {/* Today's Reminders */}
          {todayReminders.length > 0 && (
            <div className="rounded-[var(--radius-lg)] p-5 opacity-0 animate-[rise_0.7s_ease_forwards_0.8s]"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" style={{ color: 'var(--violet)' }} />
                  <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text)' }}>Today's Reminders</h3>
                </div>
                <span className="text-[10px] font-bold" style={{ color: 'var(--muted)' }}>
                  {takenCount}/{todayReminders.length}
                </span>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {todayReminders.map((r, i) => (
                  <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-sm)]"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <span className="text-[10px] font-semibold w-12 shrink-0"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>{r.time}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold truncate" style={{ color: 'var(--text)' }}>{r.label}</p>
                      <p className="text-[9px] truncate" style={{ color: 'var(--muted)' }}>{r.detail}</p>
                    </div>
                    {r.status === "taken" ? (
                      <span className="px-2 py-1 rounded-lg text-[9px] font-bold flex items-center gap-1"
                        style={{ background: 'rgba(34,197,94,0.12)', color: '#16a34a' }}>
                        <Check className="w-2.5 h-2.5" /> Done
                      </span>
                    ) : (
                      <button onClick={() => onReminderStatus?.(r.id, r.type, "taken")}
                        className="px-2 py-1 rounded-lg text-[9px] font-bold cursor-pointer transition-all"
                        style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--violet)' }}>
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

      {/* ── Stats Row ── */}
      <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <StatCard
          icon={<Heart className="w-6 h-6" />}
          label="Heart Rate"
          value={vitals.heartRate > 0 ? vitals.heartRate : "—"}
          unit={vitals.heartRate > 0 ? "BPM" : undefined}
          detail="Normal resting range: 60–100 BPM"
          accentColor="var(--magenta)"
          accentBg="rgba(214,64,159,0.10)"
          delay="0.82s"
          animate={statsVisible && vitals.heartRate > 0}
        />
        <StatCard
          icon={<Footprints className="w-6 h-6" />}
          label="Steps"
          value={vitals.steps > 0 ? vitals.steps : "—"}
          detail="Goal: 10,000 steps / day"
          accentColor="var(--violet)"
          accentBg="rgba(124,58,237,0.10)"
          delay="0.92s"
          animate={statsVisible && vitals.steps > 0}
        />
        <StatCard
          icon={<Moon className="w-6 h-6" />}
          label="Sleep"
          value={vitals.sleep || "—"}
          detail="Aim for 7–9 hours of quality sleep"
          accentColor="var(--indigo)"
          accentBg="rgba(91,91,214,0.10)"
          delay="1.02s"
          animate={false}
        />
        <StatCard
          icon={<Flame className="w-6 h-6" />}
          label="Calories"
          value={vitals.calories > 0 ? vitals.calories : "—"}
          unit={vitals.calories > 0 ? "kcal" : undefined}
          detail="Daily target based on your profile"
          accentColor="var(--amber)"
          accentBg="rgba(232,149,47,0.10)"
          delay="1.12s"
          animate={statsVisible && vitals.calories > 0}
        />
      </div>

      {/* ── Modals ── */}
      <WellnessHydrationModal
        isOpen={showWellnessModal}
        onClose={() => setShowWellnessModal(false)}
        waterLoggedMl={smartActions.waterLoggedMl}
        waterGoalMl={smartActions.waterGoalMl}
        onUpdateWater={onUpdateWater}
      />

      <AnimatePresence>
        {showFullReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto relative"
              style={{ background: 'var(--bg)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)', padding: '1.5rem' }}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                  <Utensils className="w-6 h-6" style={{ color: 'var(--violet)' }} /> Clinical Dietary Report
                </h3>
                <button onClick={() => setShowFullReport(false)}
                  className="p-1.5 rounded-lg transition-colors cursor-pointer"
                  style={{ color: 'var(--text-dim)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-sm leading-relaxed p-4 rounded-[var(--radius-md)]"
                  style={{ color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  {dietPlan.clinicalNote}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-[var(--radius-md)]" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>GI Target</div>
                    <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{dietPlan.glycemicIndex}</div>
                  </div>
                  <div className="p-4 rounded-[var(--radius-md)]" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--muted)' }}>Calories</div>
                    <div className="text-lg font-bold" style={{ color: 'var(--text)' }}>{dietPlan.calorieEstimate}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
