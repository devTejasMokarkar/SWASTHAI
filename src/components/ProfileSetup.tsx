import React, { useState, useEffect, useRef, useCallback } from "react";
import { User } from "../types";
import { ShieldCheck, ArrowRight, CheckCircle2, Info, Coins, RefreshCw, History, Plus, ChevronDown, Check, Search, X } from "lucide-react";
import { motion } from "motion/react";
import { MedicationInput, type Medication } from "./ui/MedicationInput";

interface ProfileSetupProps {
  user: User;
  onSaveProfile: (updates: Partial<User>) => Promise<void>;
  onFinishOnboarding: () => void;
  token: string | null;
  onRefillCredits?: (amount: number) => Promise<void>;
}

const dietOptions = [
  "Vegetarian", "Vegan", "Non Vegetarian", "Eggetarian",
  "Gluten Free", "Ketogenic", "Jain", "Low Carb",
  "High Protein", "No Preference",
];

const mainGoals = [
  "Maintain good health",
  "Lose weight",
  "Gain weight",
  "Better nutrition",
];

const extraGoals = [
  "Improve fitness", "Manage diabetes", "Manage blood pressure",
  "Better sleep", "Stress management", "Healthy lifestyle",
  "Heart health", "Women's health", "Men's health",
  "Senior care", "Family health", "Personalized meal plans",
  "Daily health tips", "Medicine reminders", "Track symptoms",
];

const allDiseases = [
  "Diabetes Type 2", "High Blood Pressure", "Thyroid",
  "Diabetes Type 1", "Prediabetes",
  "Low Blood Pressure", "Heart Disease",
  "Asthma", "Kidney Stone",
  "Chronic Kidney Disease", "Fatty Liver", "Arthritis",
  "High Cholesterol", "Obesity", "PCOS", "Migraine",
  "Gastric Issues", "Acid Reflux (GERD)", "Anemia",
  "Vitamin D Deficiency", "Vitamin B12 Deficiency",
];

export default function ProfileSetup({
  user,
  onSaveProfile,
  onFinishOnboarding,
  token,
  onRefillCredits,
}: ProfileSetupProps) {
  const [fullName, setFullName] = useState(user.fullName || "Guest User");
  const [dob, setDob] = useState(user.dob || "1990-01-01");
  const [gender, setGender] = useState(user.gender || "Other");
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(
    user.dietaryPreferences || ["No Preferences"]
  );
  const [creditLogs, setCreditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showLogsHistory, setShowLogsHistory] = useState(false);

  const [weightKg, setWeightKg] = useState(user.weightKg || "70");
  const [heightCm, setHeightCm] = useState(user.heightCm || "175");
  const [healthGoals, setHealthGoals] = useState<string[]>(user.healthGoals || []);
  const [activeDiseases, setActiveDiseases] = useState<string[]>(user.activeDiseases || []);
  const [otherDisease, setOtherDisease] = useState(user.otherDisease || "");
  const [medicalHistory, setMedicalHistory] = useState(user.medicalHistory || "");
  const [medications, setMedications] = useState<Medication[]>([]);
  const [noMedication, setNoMedication] = useState(user.noMedication ?? true);

  const [showMoreGoals, setShowMoreGoals] = useState(false);
  const [showDiseaseDropdown, setShowDiseaseDropdown] = useState(false);
  const [diseaseSearch, setDiseaseSearch] = useState("");

  const goalsRef = useRef<HTMLDivElement>(null);
  const diseasesRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
  }, [token]);

  useEffect(() => {
    if (!showMoreGoals) return;
    const handleClick = (e: MouseEvent) => {
      if (goalsRef.current && !goalsRef.current.contains(e.target as Node)) {
        setShowMoreGoals(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showMoreGoals]);

  useEffect(() => {
    if (!showDiseaseDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (diseasesRef.current && !diseasesRef.current.contains(e.target as Node)) {
        setShowDiseaseDropdown(false);
        setDiseaseSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDiseaseDropdown]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight, 64) + "px";
  }, []);

  useEffect(() => {
    autoResize();
  }, [medicalHistory, autoResize]);

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

  const toggleExtraGoal = (goal: string) => {
    const updated = healthGoals.includes(goal)
      ? healthGoals.filter(g => g !== goal)
      : [...healthGoals, goal];
    setHealthGoals(updated);
  };

  const toggleDisease = (disease: string) => {
    setActiveDiseases(prev =>
      prev.includes(disease)
        ? prev.filter(d => d !== disease)
        : [...prev, disease]
    );
  };

  const removeDisease = (disease: string) => {
    setActiveDiseases(prev => prev.filter(d => d !== disease));
  };

  const selectedExtraCount = extraGoals.filter(g => healthGoals.includes(g)).length;
  const filteredDiseases = diseaseSearch
    ? allDiseases.filter(d => d.toLowerCase().includes(diseaseSearch.toLowerCase()))
    : allDiseases;

  const handleSave = async () => {
    await onSaveProfile({
      fullName, dob, gender, dietaryPreferences,
      weightKg, heightCm, healthGoals,
      activeDiseases, otherDisease, medicalHistory, noMedication,
    });
    onFinishOnboarding();
  };

  const dietPresets = ["Vegetarian", "Vegan", "Gluten-Free", "Ketogenic", "Non Veg", "No Preferences"];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-2xl mx-auto flex flex-col items-center space-y-6 pt-6"
      id="profile-setup-view"
    >
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface dark:text-slate-100 tracking-tight">
          Edit Profile
        </h1>
        <p className="text-sm text-on-surface-variant dark:text-slate-400 max-w-md mx-auto">
          Update your personal details, health info, and preferences.
        </p>
      </div>

      <div className="w-full bg-white/85 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/40 dark:border-slate-800 p-6 md:p-8 shadow-xl shadow-slate-950/5 space-y-6" id="profile-basics-form">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider" htmlFor="full_name">
              Full Name
            </label>
            <input type="text" id="full_name" value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none font-semibold text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider" htmlFor="dob">
              Date of Birth
            </label>
            <input type="date" id="dob" value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none font-semibold text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Gender</label>
            <div className="grid grid-cols-3 gap-1">
              {["Male", "Female", "Other"].map((gen) => (
                <button key={gen} type="button" onClick={() => setGender(gen)}
                  className={`h-10 flex items-center justify-center rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                    gender === gen
                      ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary"
                      : "border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-slate-400 hover:border-primary/50"
                  }`}>{gen}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Weight (kg)</label>
            <input type="number" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="70" min="20" max="300"
              className="w-full h-10 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none font-semibold text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Height (cm)</label>
            <input type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="170" min="50" max="300"
              className="w-full h-10 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none font-semibold text-sm" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Dietary Preferences</label>
          <div className="flex flex-wrap gap-2">
            {dietPresets.map((pref) => {
              const isChecked = dietaryPreferences.includes(pref);
              return (
                <div key={pref} onClick={() => handleDietToggle(pref)}
                  className={`px-3 py-2 rounded-full border flex items-center gap-1.5 cursor-pointer transition-all ${
                    isChecked
                      ? "bg-primary/10 dark:bg-primary/20 border-primary/40 text-primary"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-on-surface-variant dark:text-slate-400"
                  }`}>
                  <span className="text-[10px] font-bold">{pref}</span>
                  <input type="checkbox" checked={isChecked} readOnly
                    className="rounded-full text-primary focus:ring-0 w-3.5 h-3.5 border-slate-300 dark:border-slate-700" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">
            Health Goals
          </label>
          <div className="flex flex-wrap gap-1.5">
            {mainGoals.map(goal => {
              const active = healthGoals.includes(goal);
              return (
                <button key={goal} type="button" onClick={() => toggleExtraGoal(goal)}
                  className={`h-10 px-3.5 rounded-full border font-bold text-xs transition-all cursor-pointer ${
                    active
                      ? "bg-primary/10 dark:bg-primary/20 border-primary/40 text-primary"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-slate-400 hover:border-primary/50"
                  }`}>{goal}</button>
              );
            })}
            <div ref={goalsRef} className="relative">
              <button type="button" onClick={() => setShowMoreGoals(!showMoreGoals)}
                className={`h-10 px-3.5 rounded-full border font-bold text-xs transition-all cursor-pointer flex items-center gap-1 ${
                  selectedExtraCount > 0
                    ? "bg-primary/10 dark:bg-primary/20 border-primary/40 text-primary"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-slate-400 hover:border-primary/50"
                }`}>
                {selectedExtraCount > 0 ? `Other (${selectedExtraCount})` : "Other"}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMoreGoals ? "rotate-180" : ""}`} />
              </button>
              {showMoreGoals && (
                <div className="absolute top-full left-0 mt-1 z-20 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 max-h-60 overflow-y-auto">
                  {extraGoals.map(goal => {
                    const active = healthGoals.includes(goal);
                    return (
                      <button key={goal} type="button" onClick={() => toggleExtraGoal(goal)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${active ? "bg-primary border-primary" : "border-slate-300 dark:border-slate-600"}`}>
                          {active && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-xs font-semibold text-on-surface dark:text-slate-200">{goal}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">
            Active Diseases / Conditions
          </label>
          <div ref={diseasesRef} className="relative">
            <button type="button" onClick={() => setShowDiseaseDropdown(!showDiseaseDropdown)}
              className="w-full h-10 px-4 flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-left text-sm font-semibold text-on-surface-variant dark:text-slate-400 hover:border-primary/50 transition-all cursor-pointer">
              <span className="flex-1 truncate">
                {activeDiseases.length > 0
                  ? `${activeDiseases.length} condition${activeDiseases.length > 1 ? "s" : ""} selected`
                  : "Search or select conditions..."}
              </span>
              <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${showDiseaseDropdown ? "rotate-180" : ""}`} />
            </button>
            {showDiseaseDropdown && (
              <div className="absolute top-full left-0 mt-1 z-20 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input type="text" value={diseaseSearch} onChange={e => setDiseaseSearch(e.target.value)} placeholder="Search conditions..."
                    className="flex-1 bg-transparent text-xs font-semibold text-on-surface dark:text-slate-200 outline-none placeholder:text-slate-400" autoFocus />
                </div>
                <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5">
                  {filteredDiseases.map(disease => {
                    const active = activeDiseases.includes(disease);
                    return (
                      <button key={disease} type="button" onClick={() => toggleDisease(disease)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${active ? "bg-primary border-primary" : "border-slate-300 dark:border-slate-600"}`}>
                          {active && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="text-xs font-semibold text-on-surface dark:text-slate-200">{disease}</span>
                      </button>
                    );
                  })}
                  {filteredDiseases.length === 0 && (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <input type="text" value={otherDisease} onChange={e => { setOtherDisease(e.target.value); if (e.target.value.trim() && !activeDiseases.includes(e.target.value.trim())) setActiveDiseases(prev => [...prev, e.target.value.trim()]); }}
                        placeholder="Add custom condition..."
                        className="flex-1 h-8 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-semibold outline-none focus:border-primary" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {activeDiseases.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeDiseases.map(d => (
                <span key={d} className="inline-flex items-center gap-1 h-8 px-3 bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-full text-[10px] font-bold text-primary">
                  {d}
                  <button type="button" onClick={() => removeDisease(d)} className="hover:bg-primary/20 rounded-full p-0.5 cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">
            Medical History & Allergies
          </label>
          <textarea ref={textareaRef} value={medicalHistory} onChange={e => { setMedicalHistory(e.target.value); autoResize(); }}
            placeholder={`Diabetes Type 2 diagnosed in 2021\nPenicillin allergy\nAsthma during childhood\nUnderwent appendix surgery in 2018`}
            rows={2}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none font-semibold text-sm resize-none overflow-hidden" />
          <p className="text-[10px] text-on-surface-variant dark:text-slate-500 italic">
            Include previous illnesses, surgeries, allergies, or chronic conditions.
          </p>
        </div>

        <MedicationInput
          medications={medications}
          onChange={setMedications}
          noMedication={noMedication}
          onNoMedicationChange={setNoMedication}
        />

        <div className="flex flex-col gap-3 pt-2">
          <button onClick={handleSave}
            className="w-full h-14 bg-primary hover:bg-primary-container text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/35 cursor-pointer">
            Save Profile
          </button>
        </div>
      </div>

      <div className="w-full bg-white/85 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 sm:space-y-6" id="credit-management-card">
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
          <div className="bg-amber-500/10 border border-amber-500/20 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl flex flex-col items-center justify-center min-w-[100px] sm:min-w-[120px] shrink-0">
            <span className="text-[9px] sm:text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">Available</span>
            <span className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-0.5 sm:mt-1">{user.credits !== undefined ? user.credits : 120}</span>
            <span className="text-[8px] sm:text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">Credits</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2">
          <button type="button" onClick={() => onRefillCredits && onRefillCredits(50)}
            className="h-10 sm:h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer" id="btn-refill-50">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Refill 50</span>
          </button>
          <button type="button" onClick={() => onRefillCredits && onRefillCredits(100)}
            className="h-10 sm:h-12 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-[10px] sm:text-xs flex items-center justify-center gap-1 sm:gap-1.5 active:scale-95 transition-all cursor-pointer border border-slate-200 dark:border-slate-700" id="btn-refill-100">
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Refill 100</span>
          </button>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
          <button type="button" onClick={() => { if (!showLogsHistory) fetchLogs(); setShowLogsHistory(!showLogsHistory); }}
            className="w-full flex items-center justify-between text-xs font-bold text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-slate-200 transition-colors cursor-pointer">
            <span className="flex items-center gap-1.5">
              <History className="w-4 h-4" />
              <span>Credit Usage & Transaction Logs</span>
            </span>
            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">
              {showLogsHistory ? "Hide Logs" : `View Logs (${creditLogs.length || 0})`}
            </span>
          </button>
          {showLogsHistory && (
            <div className="mt-3.5 space-y-2 max-h-64 sm:max-h-48 overflow-y-auto pr-1">
              {loadingLogs ? (
                <div className="flex items-center justify-center py-6 text-xs text-slate-400 gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Fetching statements...</span>
                </div>
              ) : creditLogs.length > 0 ? (
                creditLogs.map((log: any) => {
                  const isDeduction = log.amount > 0;
                  return (
                    <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                      <div className="space-y-0.5">
                        <p className="font-bold text-on-surface dark:text-slate-200">{log.reason}</p>
                        <p className="text-[10px] text-on-surface-variant dark:text-slate-500 font-semibold">{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className={`font-extrabold ${isDeduction ? "text-rose-500" : "text-emerald-500"}`}>{isDeduction ? `-${log.amount}` : `+${Math.abs(log.amount)}`} Cr</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">bal: {log.remaining}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 italic">No credit operations recorded on this session.</p>
              )}
            </div>
          )}
        </div>
      </div>

    </motion.div>
  );
}
