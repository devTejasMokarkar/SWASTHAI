import { useState, useEffect, useRef, useCallback } from "react";
import { User } from "../types";
import { Coins, RefreshCw, History, Plus, ChevronDown, Check, Search, X, Pencil, Trash2, Bell, Settings, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import MedicationFormModal, { type MedicationFormData } from "./ui/MedicationFormModal";
import ReminderModal, { type ProfileReminder } from "./ui/ReminderModal";

interface ProfileSetupProps {
  user: User;
  onSaveProfile: (updates: Partial<User>) => Promise<void>;
  onFinishOnboarding: () => void;
  token: string | null;
  onRefillCredits?: (amount: number) => Promise<void>;
}

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

const DIET_OPTIONS = ["Vegetarian", "Vegan", "Non Veg", "No Preference"]
const GOAL_OPTIONS = ["Maintain health", "Lose weight", "Gain weight"]

const TIME_OPTIONS = [
  "Before Breakfast", "After Breakfast",
  "Before Lunch", "After Lunch",
  "Before Dinner", "After Dinner",
  "Bedtime",
]

interface ProfileMed {
  id: string;
  name: string;
  strength: string;
  timing: string;
  reminder: ProfileReminder | null;
}

let medIdCounter = 0;
function nextMedId() { return `med_${++medIdCounter}` }

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
  const [diet, setDiet] = useState(
    user.dietaryPreferences?.[0] && DIET_OPTIONS.includes(user.dietaryPreferences[0])
      ? user.dietaryPreferences[0] : "No Preference"
  );
  const [goal, setGoal] = useState(
    user.healthGoals?.find(g => GOAL_OPTIONS.includes(g)) || "Maintain health"
  );
  const [creditLogs, setCreditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showLogsHistory, setShowLogsHistory] = useState(false);

  const [weightKg, setWeightKg] = useState(user.weightKg || "70");
  const [heightCm, setHeightCm] = useState(user.heightCm || "175");
  const [activeDiseases, setActiveDiseases] = useState<string[]>(user.activeDiseases || []);
  const [otherDisease, setOtherDisease] = useState(user.otherDisease || "");
  const [medicalHistory, setMedicalHistory] = useState(user.medicalHistory || "");

  const initialMeds = (user as any).profileMedications || [];
  const [medications, setMedications] = useState<ProfileMed[]>(
    initialMeds.length > 0 ? initialMeds.map((m: any) => ({ ...m, id: m.id || nextMedId() })) : []
  );

  const [showDiseaseDropdown, setShowDiseaseDropdown] = useState(false);
  const [diseaseSearch, setDiseaseSearch] = useState("");

  const [showMedForm, setShowMedForm] = useState(false);
  const [editingMedIndex, setEditingMedIndex] = useState<number | null>(null);

  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderMedIndex, setReminderMedIndex] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

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

  const filteredDiseases = diseaseSearch
    ? allDiseases.filter(d => d.toLowerCase().includes(diseaseSearch.toLowerCase()))
    : allDiseases;

  const validateProfile = () => {
    const errors: Record<string, string> = {};
    const name = fullName.trim();
    if (!name) errors.fullName = "Name is required";
    else if (name.length < 2 || name.length > 100) errors.fullName = "Name must be 2-100 characters";
    if (!dob) errors.dob = "Date of birth is required";
    else {
      const birth = new Date(dob);
      const age = Math.floor((Date.now() - birth.getTime()) / 3.15576e+10);
      if (isNaN(age) || age < 1 || age > 120) errors.dob = "Enter a valid date of birth";
    }
    if (!gender) errors.gender = "Gender is required";
    const w = parseFloat(weightKg);
    if (!weightKg || isNaN(w) || w < 20 || w > 300) errors.weightKg = "Enter a valid weight (20-300 kg)";
    const h = parseFloat(heightCm);
    if (!heightCm || isNaN(h) || h < 50 || h > 250) errors.heightCm = "Enter a valid height (50-250 cm)";
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateProfile()) return;
    await onSaveProfile({
      fullName: fullName.trim(), dob, gender,
      dietaryPreferences: [diet],
      weightKg, heightCm,
      healthGoals: [goal],
      activeDiseases, otherDisease, medicalHistory,
      noMedication: medications.length === 0,
      profileMedications: medications,
    } as any);
    onFinishOnboarding();
  };

  // Medication handlers
  const openAddMed = () => {
    setEditingMedIndex(null);
    setShowMedForm(true);
  };

  const openEditMed = (index: number) => {
    setEditingMedIndex(index);
    setShowMedForm(true);
  };

  const handleMedSave = (data: MedicationFormData) => {
    if (editingMedIndex !== null) {
      setMedications(prev => prev.map((m, i) =>
        i === editingMedIndex ? { ...m, name: data.name, strength: data.strength, timing: data.timing } : m
      ));
    } else {
      setMedications(prev => [...prev, {
        id: nextMedId(),
        name: data.name,
        strength: data.strength,
        timing: data.timing,
        reminder: null,
      }]);
    }
  };

  const deleteMed = (index: number) => {
    if (window.confirm("Remove this medication? Its reminder will also be deleted.")) {
      setMedications(prev => prev.filter((_, i) => i !== index));
    }
  };

  const openReminder = (index: number) => {
    setReminderMedIndex(index);
    setShowReminderModal(true);
  };

  const handleReminderSave = (reminder: ProfileReminder) => {
    if (reminderMedIndex !== null) {
      setMedications(prev => prev.map((m, i) =>
        i === reminderMedIndex ? { ...m, reminder } : m
      ));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-xl mx-auto flex flex-col items-center space-y-5 pt-6 pb-10"
      id="profile-setup-view"
    >
      <div className="text-center space-y-2 relative w-full">
        <button type="button" onClick={() => setShowSettings(true)}
          className="absolute right-0 top-0 w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-on-surface-variant dark:text-slate-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-all cursor-pointer">
          <Settings className="w-5 h-5" />
        </button>
        <h1 className="text-3xl md:text-4xl font-extrabold text-on-surface dark:text-slate-100 tracking-tight">
          Edit Profile
        </h1>
        <p className="text-sm text-on-surface-variant dark:text-slate-400">
          Update your personal details, health info, and preferences.
        </p>
      </div>

      {/* Card 1: Personal details */}
      <div className="w-full bg-white/85 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/40 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-950/5 p-6 space-y-4">
        <p className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Personal Details</p>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider" htmlFor="full_name">Full Name</label>
          <input type="text" id="full_name" value={fullName} onChange={e => { setFullName(e.target.value); setProfileErrors(p => ({ ...p, fullName: '' })); }}
            className={`w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border text-on-surface dark:text-slate-100 rounded-xl focus:outline-none font-semibold text-sm ${profileErrors.fullName ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-primary focus:bg-white dark:focus:bg-slate-900'}`} />
          {profileErrors.fullName && <p className="text-[10px] font-semibold text-rose-500">{profileErrors.fullName}</p>}
        </div>

        <div className="flex gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="flex-1 min-w-[140px] space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Date of Birth</label>
            <input type="date" value={dob} onChange={e => { setDob(e.target.value); setProfileErrors(p => ({ ...p, dob: '' })); }}
              className={`w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border text-on-surface dark:text-slate-100 rounded-xl focus:outline-none font-semibold text-sm ${profileErrors.dob ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-primary'}`} />
            {profileErrors.dob && <p className="text-[10px] font-semibold text-rose-500">{profileErrors.dob}</p>}
          </div>
          <div className="flex-1 min-w-[100px] space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Weight (kg)</label>
            <input type="number" value={weightKg} onChange={e => { setWeightKg(e.target.value); setProfileErrors(p => ({ ...p, weightKg: '' })); }} placeholder="70"
              className={`w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border text-on-surface dark:text-slate-100 rounded-xl focus:outline-none font-semibold text-sm ${profileErrors.weightKg ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-primary'}`} />
            {profileErrors.weightKg && <p className="text-[10px] font-semibold text-rose-500">{profileErrors.weightKg}</p>}
          </div>
          <div className="flex-1 min-w-[100px] space-y-1.5">
            <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Height (cm)</label>
            <input type="number" value={heightCm} onChange={e => { setHeightCm(e.target.value); setProfileErrors(p => ({ ...p, heightCm: '' })); }} placeholder="170"
              className={`w-full h-11 px-4 bg-slate-50 dark:bg-slate-950 border text-on-surface dark:text-slate-100 rounded-xl focus:outline-none font-semibold text-sm ${profileErrors.heightCm ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 dark:border-slate-800 focus:border-primary'}`} />
            {profileErrors.heightCm && <p className="text-[10px] font-semibold text-rose-500">{profileErrors.heightCm}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Gender</label>
          <div className="flex gap-2">
            {["Male", "Female", "Other"].map(gen => {
              const active = gender === gen;
              return (
                <button key={gen} type="button" onClick={() => { setGender(gen); setProfileErrors(p => ({ ...p, gender: '' })); }}
                  className={`flex-1 h-11 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-primary border-primary text-white"
                      : "bg-transparent border-slate-200 dark:border-slate-700 text-on-surface dark:text-slate-300 hover:border-primary/50"
                  }`}>{gen}</button>
              );
            })}
          </div>
          {profileErrors.gender && <p className="text-[10px] font-semibold text-rose-500">{profileErrors.gender}</p>}
        </div>
      </div>

      {/* Card 2: Diet and goal */}
      <div className="w-full bg-white/85 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/40 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-950/5 p-6 space-y-4">
        <p className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Diet and Goal</p>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Diet</label>
          <div className="flex flex-wrap gap-1.5">
            {DIET_OPTIONS.map(d => {
              const active = diet === d;
              return (
                <button key={d} type="button" onClick={() => setDiet(d)}
                  className={`px-4 h-9 rounded-full border text-[11px] font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-primary border-primary text-white"
                      : "bg-transparent border-slate-200 dark:border-slate-700 text-on-surface dark:text-slate-300 hover:border-primary/50"
                  }`}>{d}</button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Goal</label>
          <div className="flex flex-wrap gap-1.5">
            {GOAL_OPTIONS.map(g => {
              const active = goal === g;
              return (
                <button key={g} type="button" onClick={() => setGoal(g)}
                  className={`px-4 h-9 rounded-full border text-[11px] font-bold transition-all cursor-pointer ${
                    active
                      ? "bg-primary border-primary text-white"
                      : "bg-transparent border-slate-200 dark:border-slate-700 text-on-surface dark:text-slate-300 hover:border-primary/50"
                  }`}>{g}</button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Card 3: Medical history */}
      <div className="w-full bg-white/85 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/40 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-950/5 p-6 space-y-4">
        <p className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Medical History</p>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Conditions</label>
          <div ref={diseasesRef} className="relative">
            <button type="button" onClick={() => setShowDiseaseDropdown(!showDiseaseDropdown)}
              className="w-full h-11 px-4 flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-left text-sm font-semibold text-on-surface-variant dark:text-slate-400 hover:border-primary/50 transition-all cursor-pointer">
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
            <div className="flex flex-wrap gap-1.5 pt-1">
              {activeDiseases.map(d => (
                <span key={d} className="inline-flex items-center gap-1 h-7 px-3 bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-full text-[10px] font-bold text-primary">
                  {d}
                  <button type="button" onClick={() => removeDisease(d)} className="hover:bg-primary/20 rounded-full p-0.5 cursor-pointer">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Notes</label>
          <textarea ref={textareaRef} value={medicalHistory} onChange={e => { setMedicalHistory(e.target.value); autoResize(); }}
            placeholder="Past conditions, allergies, surgeries"
            rows={2}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl focus:border-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none font-semibold text-sm resize-none overflow-hidden" />
        </div>
      </div>

      {/* Card 4: Medications */}
      <div className="w-full bg-white/85 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/40 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-950/5 p-6 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider">Medications</p>
          <button type="button" onClick={openAddMed}
            className="w-9 h-9 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors cursor-pointer">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {medications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-sm text-on-surface-variant dark:text-slate-400 font-medium">No medications added</p>
            <button type="button" onClick={openAddMed}
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Add your first medicine
            </button>
          </div>
        ) : (
          <div className="space-y-0">
            {medications.map((med, i) => {
              const timingLabel = med.reminder?.timeOfDay || med.timing
              const summary = [med.strength, timingLabel].filter(Boolean).join(", ")
              return (
                <div key={med.id}>
                  {i > 0 && <hr className="border-slate-100 dark:border-slate-800" />}
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-on-surface dark:text-slate-100 truncate">{med.name}</p>
                      <p className="text-[11px] text-on-surface-variant dark:text-slate-400 truncate">{summary.toLowerCase()}</p>
                    </div>
                    <button type="button" onClick={() => openReminder(i)}
                      className={`p-2 rounded-lg transition-colors cursor-pointer ${
                        med.reminder
                          ? "text-primary bg-primary/10 dark:bg-primary/20"
                          : "text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800"
                      }`}
                      title={med.reminder ? "Edit reminder" : "Set reminder"}>
                      <Bell className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => openEditMed(i)}
                      className="p-2 rounded-lg text-slate-400 hover:text-on-surface dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => deleteMed(i)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Save button */}
      <button onClick={handleSave}
        className="w-full h-14 bg-primary hover:bg-primary-container text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/35 cursor-pointer text-base">
        Save Profile
      </button>

      {/* Settings modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-5 h-5 text-primary" />
                    <h3 className="text-base font-bold text-on-surface dark:text-slate-100">Settings</h3>
                  </div>
                  <button type="button" onClick={() => setShowSettings(false)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition-colors cursor-pointer">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950/50 rounded-full flex items-center justify-center text-amber-500 shrink-0">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-on-surface dark:text-slate-100">Swasth AI Credit Center</h4>
                      <p className="text-[11px] text-on-surface-variant dark:text-slate-400 mt-0.5 leading-relaxed">
                        1 credit deducted per AI Chat request and daily AI diet recommendation.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-white dark:bg-slate-950 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold text-on-surface-variant dark:text-slate-400">Available Credits</span>
                    <span className="text-xl font-black text-amber-600 dark:text-amber-400">{user.credits !== undefined ? user.credits : 120}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => onRefillCredits && onRefillCredits(50)}
                      className="h-10 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                      <Plus className="w-3.5 h-3.5" /> Refill 50
                    </button>
                    <button type="button" onClick={() => onRefillCredits && onRefillCredits(100)}
                      className="h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 dark:border-slate-700">
                      <Plus className="w-3.5 h-3.5" /> Refill 100
                    </button>
                  </div>
                  <button type="button" onClick={() => { if (!showLogsHistory) fetchLogs(); setShowLogsHistory(!showLogsHistory); }}
                    className="w-full flex items-center justify-between text-[11px] font-bold text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-slate-200 transition-colors cursor-pointer pt-1">
                    <span className="flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      <span>Transaction Logs</span>
                    </span>
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full font-bold">
                      {showLogsHistory ? "Hide" : `View (${creditLogs.length || 0})`}
                    </span>
                  </button>
                  {showLogsHistory && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {loadingLogs ? (
                        <div className="flex items-center justify-center py-4 text-xs text-slate-400 gap-1.5">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Loading...</span>
                        </div>
                      ) : creditLogs.length > 0 ? (
                        creditLogs.map((log: any) => {
                          const isDeduction = log.amount > 0;
                          return (
                            <div key={log.id} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px]">
                              <div className="space-y-0.5">
                                <p className="font-bold text-on-surface dark:text-slate-200">{log.reason}</p>
                                <p className="text-[9px] text-on-surface-variant dark:text-slate-500">{new Date(log.timestamp).toLocaleString()}</p>
                              </div>
                              <span className={`font-extrabold shrink-0 ${isDeduction ? "text-rose-500" : "text-emerald-500"}`}>
                                {isDeduction ? `-${log.amount}` : `+${Math.abs(log.amount)}`}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-center py-4 text-xs text-slate-400 italic">No transactions recorded.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Medication form modal */}
      <MedicationFormModal
        open={showMedForm}
        onClose={() => { setShowMedForm(false); setEditingMedIndex(null) }}
        onSave={handleMedSave}
        initial={editingMedIndex !== null ? medications[editingMedIndex] : undefined}
      />

      {/* Reminder modal */}
      {reminderMedIndex !== null && (
        <ReminderModal
          open={showReminderModal}
          onClose={() => { setShowReminderModal(false); setReminderMedIndex(null) }}
          medicationName={medications[reminderMedIndex]?.name || ""}
          medicationStrength={medications[reminderMedIndex]?.strength || ""}
          onSave={handleReminderSave}
          initial={medications[reminderMedIndex]?.reminder || undefined}
        />
      )}
    </motion.div>
  );
}
