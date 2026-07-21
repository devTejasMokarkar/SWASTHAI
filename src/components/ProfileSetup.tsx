import React, { useState, useEffect } from "react";
import { User } from "../types";
import { ShieldCheck, ArrowRight, CheckCircle2, Heart, HelpCircle, Utensils, Apple, Info, Coins, RefreshCw, History, Plus } from "lucide-react";
import { motion } from "motion/react";

interface ProfileSetupProps {
  user: User;
  onSaveProfile: (updates: Partial<User>) => Promise<void>;
  onFinishOnboarding: () => void;
  debugMode: boolean;
  onToggleDebugMode: (val: boolean) => void;
  token: string | null;
  onRefillCredits?: (amount: number) => Promise<void>;
}

export default function ProfileSetup({
  user,
  onSaveProfile,
  onFinishOnboarding,
  debugMode,
  onToggleDebugMode,
  token,
  onRefillCredits,
}: ProfileSetupProps) {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState(user.fullName || "Alex Johnson");
  const [dob, setDob] = useState(user.dob || "1994-10-24");
  const [gender, setGender] = useState(user.gender || "Male");
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(
    user.dietaryPreferences || ["No Preferences"]
  );
  const [sugarUnitPreference, setSugarUnitPreference] = useState<"mg/dL" | "mmol/L">(
    user.sugarUnitPreference || "mg/dL"
  );
  
  const [creditLogs, setCreditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showLogsHistory, setShowLogsHistory] = useState(false);

  const fetchLogs = async () => {
    if (!token) return;
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/credits/logs", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCreditLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token, user.credits]);
  
  // Extra step questions for completeness & wow factor
  const [weightKg, setWeightKg] = useState("70");
  const [heightCm, setHeightCm] = useState("175");
  const [healthGoals, setHealthGoals] = useState<string[]>(["Energy levels"]);
  
  const handleDietToggle = (pref: string) => {
    if (pref === "No Preferences") {
      setDietaryPreferences(["No Preferences"]);
      return;
    }
    
    let updated = dietaryPreferences.filter((p) => p !== "No Preferences");
    if (updated.includes(pref)) {
      updated = updated.filter((p) => p !== pref);
      if (updated.length === 0) updated = ["No Preferences"];
    } else {
      updated.push(pref);
    }
    setDietaryPreferences(updated);
  };

  const handleNextStep = async () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      // Save all on backend
      await onSaveProfile({
        fullName,
        dob,
        gender,
        dietaryPreferences,
        sugarUnitPreference,
      });
      onFinishOnboarding();
    }
  };

  const dietPresets = ["Vegetarian", "Vegan", "Gluten-Free", "Ketogenic", "No Preferences"];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl mx-auto flex flex-col items-center space-y-8 pt-6"
      id="profile-setup-view"
    >
      {/* Multi-step Progress Bar */}
      <div className="w-full" id="onboarding-progress">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            Step {step} of 2
          </span>
          <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">
            {step === 1 ? "Profile Basics" : "Clinical Demographics"}
          </span>
        </div>
        <div className="flex gap-2">
          <div className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${step >= 1 ? "bg-primary" : "bg-slate-200 dark:bg-slate-800"}`}></div>
          <div className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${step >= 2 ? "bg-primary" : "bg-slate-200 dark:bg-slate-800"}`}></div>
        </div>
      </div>

      {/* Header Greeting */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface dark:text-slate-100 tracking-tight">
          Build your health profile
        </h1>
        <p className="text-sm text-on-surface-variant dark:text-slate-400 max-w-md mx-auto">
          Tell us a little about yourself so we can tailor your daily health insights and recommendations.
        </p>
      </div>

      {/* Bento Layout Form Card */}
      <div className="w-full bg-white/85 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/40 dark:border-slate-800 p-6 md:p-8 shadow-xl shadow-slate-950/5 space-y-8" id="profile-basics-form">
        
        {step === 1 ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1" htmlFor="full_name">
                  Full Name
                </label>
                <input 
                  type="text" 
                  id="full_name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Johnson"
                  className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none font-semibold text-sm"
                />
              </div>

              {/* DOB Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1" htmlFor="dob">
                  Date of Birth
                </label>
                <input 
                  type="date" 
                  id="dob"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none font-semibold text-sm"
                />
              </div>
            </div>

            {/* Gender Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
                Gender Identity
              </label>
              <div className="grid grid-cols-3 gap-3">
                {["Male", "Female", "Other"].map((gen) => (
                  <button
                    key={gen}
                    type="button"
                    onClick={() => setGender(gen)}
                    className={`h-12 flex items-center justify-center gap-2 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                      gender === gen
                        ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary"
                        : "border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-slate-400 hover:border-primary/50 dark:hover:border-primary/40"
                    }`}
                  >
                    {gen}
                  </button>
                ))}
              </div>
            </div>

            {/* Dietary Preferences */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
                Dietary Preferences
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {dietPresets.map((pref) => {
                  const isChecked = dietaryPreferences.includes(pref);
                  return (
                    <div 
                      key={pref}
                      onClick={() => handleDietToggle(pref)}
                      className={`px-4 py-2.5 rounded-full border flex items-center gap-2 cursor-pointer transition-all ${
                        isChecked 
                          ? "bg-primary/10 dark:bg-primary/20 border-primary/40 text-primary" 
                          : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-on-surface-variant dark:text-slate-400"
                      }`}
                    >
                      <span className="text-xs font-bold">{pref}</span>
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        readOnly
                        className="rounded-full text-primary focus:ring-0 w-3.5 h-3.5 border-slate-300 dark:border-slate-700"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sugar Unit Preference */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
                Blood Sugar Unit Preference
              </label>
              <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSugarUnitPreference("mg/dL")}
                    className={`h-12 flex items-center justify-center gap-2 rounded-xl border font-bold text-[11px] md:text-xs transition-all cursor-pointer ${
                      sugarUnitPreference === "mg/dL"
                        ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary"
                        : "border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-slate-400 hover:border-primary/50 dark:hover:border-primary/40"
                    }`}
                  >
                    mg/dL (US)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSugarUnitPreference("mmol/L")}
                    className={`h-12 flex items-center justify-center gap-2 rounded-xl border font-bold text-[11px] md:text-xs transition-all cursor-pointer ${
                      sugarUnitPreference === "mmol/L"
                        ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary"
                        : "border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-slate-400 hover:border-primary/50 dark:hover:border-primary/40"
                    }`}
                  >
                    mmol/L (UK/EU)
                  </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Weight */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
                  Weight (kg)
                </label>
                <input 
                  type="number" 
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="70"
                  className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none font-semibold text-sm"
                />
              </div>

              {/* Height */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
                  Height (cm)
                </label>
                <input 
                  type="number" 
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="175"
                  className="w-full h-12 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none font-semibold text-sm"
                />
              </div>
            </div>

            {/* Health Goals */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider px-1">
                Primary Health Milestones
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["Cardio endurance", "Sleep recovery", "Better nutrition", "Weight management", "Stress buffering"].map((goal) => {
                  const isSelected = healthGoals.includes(goal);
                  return (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setHealthGoals(healthGoals.filter((g) => g !== goal));
                        } else {
                          setHealthGoals([...healthGoals, goal]);
                        }
                      }}
                      className={`py-3.5 px-4 rounded-xl border text-left text-xs font-bold transition-all flex justify-between items-center cursor-pointer ${
                        isSelected 
                          ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary" 
                          : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-slate-400"
                      }`}
                    >
                      {goal}
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="flex flex-col gap-3 pt-2">
          <button 
            onClick={handleNextStep}
            className="w-full h-14 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/35 group cursor-pointer"
          >
            {step === 1 ? "Next Step" : "Complete Profile"}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button 
            onClick={onFinishOnboarding}
            className="w-full h-12 text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-slate-200 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all cursor-pointer"
          >
            Skip for now
          </button>
        </div>
      </div>

      {/* Credits Management Section */}
      <div className="w-full bg-white/85 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6" id="credit-management-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/30 rounded-full flex items-center justify-center text-amber-500 shrink-0">
              <Coins className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-base text-on-surface dark:text-slate-100 flex items-center gap-1.5">
                Swasth AI Credit Center
              </h4>
              <p className="text-xs text-on-surface-variant dark:text-slate-400 max-w-sm leading-relaxed">
                Tokens used to run advanced medical reasoning tasks. <strong>1 credit</strong> is deducted per AI Chat request, and <strong>1 credit</strong> is deducted automatically for daily AI diet recommendations.
              </p>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 px-5 py-3 rounded-2xl flex flex-col items-center justify-center min-w-[120px] shrink-0">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Available Balance</span>
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">{user.credits !== undefined ? user.credits : 120}</span>
            <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">Credits</span>
          </div>
        </div>

        {/* Action Buttons to Refill */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => onRefillCredits && onRefillCredits(50)}
            className="h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
            id="btn-refill-50"
          >
            <Plus className="w-4 h-4" />
            <span>Refill 50 Credits</span>
          </button>
          <button
            type="button"
            onClick={() => onRefillCredits && onRefillCredits(100)}
            className="h-12 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
            id="btn-refill-100"
          >
            <Plus className="w-4 h-4" />
            <span>Refill 100 Credits</span>
          </button>
        </div>

        {/* Collapsible History logs */}
        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <button
            type="button"
            onClick={() => {
              if (!showLogsHistory) fetchLogs();
              setShowLogsHistory(!showLogsHistory);
            }}
            className="w-full flex items-center justify-between text-xs font-bold text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <History className="w-4 h-4" />
              <span>Credit Usage & Transaction Logs</span>
            </span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">
              {showLogsHistory ? "Hide Logs" : `View Logs (${creditLogs.length || 0})`}
            </span>
          </button>

          {showLogsHistory && (
            <div className="mt-3.5 space-y-2 max-h-48 overflow-y-auto pr-1">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-6 text-xs text-slate-400 gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Fetching statements...</span>
                </div>
              ) : creditLogs.length > 0 ? (
                creditLogs.map((log: any) => {
                  const isDeduction = log.amount > 0;
                  return (
                    <div
                      key={log.id}
                      className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="font-bold text-on-surface dark:text-slate-200">{log.reason}</p>
                        <p className="text-[10px] text-on-surface-variant dark:text-slate-500 font-semibold">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className={`font-extrabold ${isDeduction ? "text-rose-500" : "text-emerald-500"}`}>
                          {isDeduction ? `-${log.amount}` : `+${Math.abs(log.amount)}`} Cr
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">
                          bal: {log.remaining}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 italic">
                  No credit operations recorded on this session.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Debug Mode Toggle */}
      <div className="w-full bg-white/85 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center justify-between shadow-sm" id="debug-mode-card">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/30 rounded-full flex items-center justify-center text-indigo-500 shrink-0">
            <Info className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-on-surface dark:text-slate-100">Swasth-AI Debug & Trace Mode</h4>
            <p className="text-xs text-on-surface-variant dark:text-slate-400 leading-relaxed">
              Output raw prompt context (Tier 1 deterministic profile data + Tier 2 semantically matched files) sent to the AI in the chat screen to verify the RAG system.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggleDebugMode(!debugMode)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            debugMode ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700"
          }`}
          id="debug-toggle-switch"
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              debugMode ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Privacy First Footer Card */}
      <div className="w-full bg-white/85 dark:bg-slate-900/80 border border-primary/20 dark:border-primary/30 rounded-2xl p-5 flex items-start gap-4 shadow-sm" id="privacy-card">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-sm text-on-surface dark:text-slate-100">Privacy First</h4>
          <p className="text-xs text-on-surface-variant dark:text-slate-400 leading-relaxed">
            Your health data is encrypted and stored securely. We never share your personal information with third parties without your explicit consent.
          </p>
        </div>
      </div>

      {/* Subtle Visual Context Bento graphics */}
      <div className="hidden md:grid grid-cols-3 gap-6 w-full max-w-[1200px] pt-8 opacity-75">
        <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex flex-col gap-3 shadow-sm">
          <img 
            className="w-full h-32 rounded-xl object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCmcWwWodfxpa6Fdlj8nkl--VdaqdMzR8s2yJaDFyUkmuhdlX7Hkh7n8jjnD3MnYa-e39q5GnMOPth0Ft1VdJY4G25y52TzXaCQOczY0XOYqjPFKlJ6T5FtnVrUCxslGG_x1MAMwmv_zQUiu24h6oIS70b13HgrkOy-gi4qj8lYKI7MEqwqMzV8W19jka9W73N7eIZ4MmkOWOxMkeMdncb4hvsJ1sDwvp1hraHBnIIOm_Q0O7PY-NsFl-K5bpeoDQR3nCH7Vq1aOg9s"
            alt="Personalized Nutrition"
          />
          <p className="text-xs font-bold text-center text-on-surface-variant dark:text-slate-400">Personalized Nutrition</p>
        </div>

        <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex flex-col gap-3 shadow-sm">
          <img 
            className="w-full h-32 rounded-xl object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2r0uwI41B8dnWjeOIWTj9cXHUnUruOSenBCGuM8axo8fhBS87wVMJU1SSIc9tn1rbshMvECSi4LeUxh69RbykdrajxuvkrInR_y_txo6-M4JIfoWKZ0tzmSetmYgWVyRazxmKjcmQ23EMvtbAvh-SnvVXH7Chfy7fJOGqeOIXO4C-Q0v4K_FnCb5mNkwQvvWmx2hVY93d74xBWvk1T-9iXmdrvtsEBHQIt2_IS24zrL0BSsX5TwJ_UeCaKUKN5ynj3b3dSDN7_IbC"
            alt="Vital Monitoring"
          />
          <p className="text-xs font-bold text-center text-on-surface-variant dark:text-slate-400">Vital Monitoring</p>
        </div>

        <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl flex flex-col gap-3 shadow-sm">
          <img 
            className="w-full h-32 rounded-xl object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVsqMXLOVDFgId1PQOPz0qnrHAw1p2Tmf5pJdyxZI9Y8EXpOxh2O3ue14tVzjPPL2Lxq7pd3b02KxKxm90SsF9941QaAPrMrPXQ8A8pJlji0adYbkv0TefBWCoglj1d_Muc32OuA7QGK2SlCE-34n_WBWtYphWMqHijJnqu-9glRHMRGN9KCMssmroHxTy47PsvRQmXI3wR5TvajvOiiiHk7AqG1xJ02zo16cB27sbMnGdihbcnlIH0aiyCK_yN6hvN6C43YcHUrKW"
            alt="Mental Wellness"
          />
          <p className="text-xs font-bold text-center text-on-surface-variant dark:text-slate-400">Mental Wellness</p>
        </div>
      </div>
    </motion.div>
  );
}
