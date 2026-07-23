import React, { useState, useEffect } from "react";
import { Medication, ScanResult } from "../types";
import { Pill, Activity, Plus, Search, ShieldAlert, Sparkles, Check, Bell, BellOff, Trash2, Camera, AlertCircle, X, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MedicationsProps {
  medications: Medication[];
  onAddMedication: (med: Partial<Medication>) => Promise<{ success: boolean; conflict?: string }>;
  onToggleTaken: (id: string) => void;
  onToggleReminder: (id: string) => void;
  onDeleteMedication: (id: string) => void;
}

export default function Medications({
  medications,
  onAddMedication,
  onToggleTaken,
  onToggleReminder,
  onDeleteMedication,
}: MedicationsProps) {
  const [isLoading, setIsLoading] = useState(true);
  // Add Medication Form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newStrength, setNewStrength] = useState("");
  const [newForm, setNewForm] = useState("Tablet");
  const [newFrequency, setNewFrequency] = useState("Daily");
  const [newTime, setNewTime] = useState("09:00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addConflictWarn, setAddConflictWarn] = useState<string | null>(null);

  // Scanner states
  const [scannerActive, setScannerActive] = useState(false);
  const [scanResult, setScanResult] = useState<Partial<ScanResult> | null>({
    identifiedName: "Lisinopril 10mg",
    interactionCheck: "Conflict Detected with Ibuprofen. Lisinopril reduces clearance of NSAIDs.",
    conflict: true,
  });
  const [customScanInput, setCustomScanInput] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  // Hydration detail state
  const [showHydrationDetail, setShowHydrationDetail] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 900);
    return () => clearTimeout(timer);
  }, []);

  const handleAddMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newStrength) return;

    setIsSubmitting(true);
    setAddConflictWarn(null);

    try {
      const res = await onAddMedication({
        name: newName,
        strength: newStrength,
        form: newForm,
        frequency: newFrequency,
        dueTime: newTime,
      });

      if (res.conflict) {
        setAddConflictWarn(res.conflict);
      } else {
        // Reset and close
        setNewName("");
        setNewStrength("");
        setShowAddModal(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRunScan = async (drugName: string) => {
    setIsScanning(true);
    setScannerActive(true);

    // Call backend scan endpoint
    try {
      const token = localStorage.getItem("health_companion_token");
      const response = await fetch("/api/gemini/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ drugNameInput: drugName }),
      });
      const data = await response.json();
      
      // Simulate real high-tech delay for user enchantment
      setTimeout(() => {
        setScanResult(data);
        setIsScanning(false);
      }, 1500);
    } catch (err) {
      console.error(err);
      setIsScanning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-10 animate-pulse" id="medications-skeleton">
        {/* Scanner Hero Skeleton */}
        <section className="space-y-6">
          <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          <div className="w-full aspect-video md:aspect-[21/9] rounded-3xl bg-slate-200/50 dark:bg-slate-800/40 border border-slate-200/30 dark:border-slate-800/30 flex items-center justify-center">
            {/* Pulsing overlay scanner lens */}
            <div className="w-44 h-44 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex items-center justify-center">
              <div className="h-10 w-24 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            </div>
          </div>
          <div className="flex gap-2 max-w-md">
            <div className="flex-1 h-12 bg-slate-200/50 dark:bg-slate-800/40 rounded-xl"></div>
            <div className="w-24 h-12 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          </div>
        </section>

        {/* Medications List Skeleton */}
        <section className="space-y-6">
          <div className="flex justify-between items-end">
            <div className="space-y-2">
              <div className="h-7 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
              <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
            <div className="h-10 w-28 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-200/50 dark:bg-slate-800/40 border border-slate-200/30 dark:border-slate-800/30 p-6 rounded-2xl h-[280px] flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
                    <div className="h-8 w-16 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
                  </div>
                  <div className="space-y-2 mt-6">
                    <div className="h-5 w-2/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  </div>
                </div>
                <div className="flex gap-2 mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                  <div className="flex-1 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                  <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="space-y-10"
      id="medications-view"
    >
      {/* Scanner Hero Section */}
      <section id="scanner-section">
        <h2 className="text-3xl font-bold tracking-tight text-on-surface mb-6">AI Interaction Scanner</h2>
        
        <div className="relative w-full aspect-video md:aspect-[21/9] rounded-3xl overflow-hidden shadow-xl border border-white/40 group max-h-[220px] sm:max-h-[300px] md:max-h-none" id="scanner-viewfinder">
          {/* Camera Viewfinder Mockup */}
          <div className="absolute inset-0 z-0 bg-slate-900">
            <img 
              className="w-full h-full object-cover opacity-75" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDVLZZPlrl7S8oyO234WGLODwqMsPMM6LtBDK6JBw2Fk7YOJ17jAMRByvgIylcnXWhSipJv44iY9T6Krmoa4JEttR2MB5TDMCBUvUwKtryNHzKPiD0AW9Qj3Ot38WpWsIf9bGS6Zqt5rx8frfNI3RcweMEECiTTZ0JGblnzA-wTnLC_yvXHWFoUy3nNJfTOnYqYdnajS4qz0wEChUEWGuvfbGTZ6CO-63lE5hZ3nvFaAWGWVa6YnS6qaqYHDlFZ8Hi--1gqG1CpbrTh"
              alt="Prescription Scan View"
            />
          </div>

          {/* High Tech Overlay Grid */}
          <div className="absolute inset-0 bg-black/10 flex items-center justify-center pointer-events-none z-10">
            <div className={`w-44 h-44 md:w-56 md:h-56 border-2 border-dashed border-white/70 rounded-3xl relative transition-all duration-300 ${isScanning ? "scale-105 border-primary" : ""}`}>
              {/* Scanline element */}
              <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-[scan_3s_ease-in-out_infinite]" style={{ top: "45%" }}></div>
            </div>
          </div>

          {/* Floating Action / Preset Pill Scan triggers */}
          <div className="absolute top-4 left-4 z-20 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 flex items-center gap-2" id="lens-badge">
            <Camera className="w-4 h-4 text-white animate-pulse" />
            <span className="text-white text-xs font-semibold tracking-wider uppercase">Active AI Lens</span>
          </div>

          {/* Quick interactive buttons to trigger dynamic scans */}
          <div className="absolute bottom-2 left-2 right-2 z-20 flex flex-wrap gap-1.5" id="preset-scanners">
            <button 
              onClick={() => handleRunScan("Lisinopril 10mg")}
              className="bg-white/80 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-on-surface text-[9px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1 sm:gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-primary" />
              <span className="truncate">Scan: Lisinopril</span>
            </button>
            <button 
              onClick={() => handleRunScan("Ibuprofen 400mg")}
              className="bg-white/80 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-on-surface text-[9px] sm:text-xs font-bold px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1 sm:gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-red-600" />
              <span className="truncate">Scan: Ibuprofen</span>
            </button>
          </div>

          {/* Floating Glass Result Overlays */}
          <div className="absolute bottom-14 sm:bottom-4 left-2 right-2 sm:left-auto sm:right-4 z-20 max-w-none sm:max-w-xs md:max-w-sm" id="scanner-result-overlay">
            <AnimatePresence mode="wait">
              {isScanning ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-black/70 backdrop-blur-xl border border-white/20 p-5 rounded-2xl flex items-center gap-3 text-white shadow-2xl"
                >
                  <Activity className="w-5 h-5 text-primary animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-widest">Checking Drug Interaction Database...</span>
                </motion.div>
              ) : scanResult ? (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-100 dark:border-slate-800 p-5 rounded-2xl shadow-2xl space-y-2 max-w-[280px] md:max-w-[320px]"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-5 h-5 ${scanResult.conflict ? "text-red-500" : "text-emerald-500"}`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${scanResult.conflict ? "text-red-500" : "text-emerald-500"}`}>
                      {scanResult.conflict ? "Identified Conflict" : "Identified & Safe"}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-on-surface dark:text-slate-100">{scanResult.identifiedName}</h3>
                  <p className="text-xs text-on-surface-variant dark:text-slate-400 leading-relaxed">
                    {scanResult.interactionCheck}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Viewfinder corner indicators */}
          <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-white/50 rounded-tl-lg pointer-events-none"></div>
          <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-white/50 rounded-tr-lg pointer-events-none"></div>
          <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-white/50 rounded-bl-lg pointer-events-none"></div>
          <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-white/50 rounded-br-lg pointer-events-none"></div>
        </div>

        {/* Manual Text Scan check tool */}
        <div className="mt-4 flex gap-2 max-w-md">
          <input 
            type="text"
            placeholder="Type drug name manually (e.g. Lisinopril, Ibuprofen)"
            value={customScanInput}
            onChange={(e) => setCustomScanInput(e.target.value)}
            className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:border-primary font-semibold"
          />
          <button 
            onClick={() => {
              if (customScanInput) {
                handleRunScan(customScanInput);
                setCustomScanInput("");
              }
            }}
            className="bg-primary hover:bg-primary-container text-white px-5 rounded-xl text-sm font-bold shadow-md shadow-primary/10 transition-colors cursor-pointer"
          >
            Check API
          </button>
        </div>
      </section>

      {/* Medications Section */}
      <section id="active-medications-list">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-on-surface dark:text-slate-100">Active Medications</h2>
            <p className="text-sm text-on-surface-variant dark:text-slate-400 mt-0.5">Scheduled for today, Oct 24</p>
          </div>
          <button 
            onClick={() => {
              setAddConflictWarn(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 text-primary font-bold text-sm bg-primary/10 hover:bg-primary/20 px-4 py-2.5 rounded-xl transition-colors active:scale-95"
            id="btn-add-med"
          >
            <Plus className="w-4 h-4" />
            Add New
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="medications-grid">
          <AnimatePresence>
            {medications.map((med) => (
              <motion.div
                key={med.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className={`bg-white dark:bg-slate-900 border p-4 sm:p-6 rounded-2xl flex flex-col justify-between group shadow-md shadow-slate-950/5 dark:shadow-black/20 relative ${
                  med.conflictDetected ? "border-red-300 ring-2 ring-red-50 dark:ring-red-950/20" : "border-slate-100 dark:border-slate-800"
                }`}
                id={`med-card-${med.id}`}
              >
                {/* Delete medication button */}
                <button 
                  onClick={() => onDeleteMedication(med.id)}
                  className="absolute top-4 right-4 text-on-surface-variant dark:text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded"
                  title="Remove Medication"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Pill className="w-5 h-5" />
                    </div>
                    
                    {med.taken ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-sm">
                        <Check className="w-3 h-3" /> Taken
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-on-surface-variant dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                        Due {med.dueTime}
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    <h3 className="text-xl font-bold text-on-surface dark:text-slate-100">{med.name}</h3>
                    <p className="text-sm text-on-surface-variant dark:text-slate-400 mt-1">
                      {med.strength} {med.form} • {med.frequency}
                    </p>
                  </div>

                  {med.taken && med.loggedAt && (
                    <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-3 italic font-medium">
                      Logged at {med.loggedAt}
                    </p>
                  )}

                  {/* Drug interaction warner label */}
                  {med.conflictDetected && med.conflictMessage && (
                    <div className="mt-3 p-2.5 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-100 dark:border-red-900/30 flex items-start gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-red-600 dark:text-red-400 leading-normal font-semibold">
                        {med.conflictMessage}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-2">
                  <button 
                    onClick={() => onToggleTaken(med.id)}
                    className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      med.taken 
                        ? "bg-slate-100 dark:bg-slate-800 text-on-surface-variant dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700" 
                        : "bg-primary hover:bg-primary-container text-white shadow-lg shadow-primary/20 hover:shadow-primary/35"
                    }`}
                  >
                    {med.taken ? "Undo Log" : "Mark as Taken"}
                  </button>
                  
                  <button 
                    onClick={() => onToggleReminder(med.id)}
                    className={`p-3 border rounded-xl transition-all cursor-pointer ${
                      med.reminderSet 
                        ? "border-secondary bg-secondary/5 dark:bg-secondary/10 text-secondary" 
                        : "border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                    title={med.reminderSet ? "Reminder Active" : "Set Reminder"}
                  >
                    {med.reminderSet ? <Bell className="w-4 h-4 fill-secondary" /> : <BellOff className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* AI Insight Block */}
      <section id="ai-insight-block">
        <div className="bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-primary/10 dark:to-secondary/10 rounded-3xl p-8 border border-primary/10 dark:border-slate-800/60 relative overflow-hidden group shadow-inner">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-[100px] group-hover:bg-primary/20 transition-all duration-700"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-primary shrink-0 animate-pulse">
              <Sparkles className="w-8 h-8 fill-primary/10" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg font-extrabold text-on-surface dark:text-slate-100 mb-2">Health Insight: Hydration Synergy</h3>
              <p className="text-sm text-on-surface-variant dark:text-slate-400 max-w-2xl leading-relaxed">
                Based on your Lisinopril intake today, increasing water consumption by 500ml could help minimize potential mild side effects like dizziness. I've adjusted your water goal for this afternoon.
              </p>
            </div>
            <div className="shrink-0 w-full md:w-auto">
              <button 
                onClick={() => setShowHydrationDetail(true)}
                className="w-full md:w-auto bg-primary hover:bg-primary-container text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/15 hover:shadow-primary/30 transition-all active:scale-95 text-sm cursor-pointer"
              >
                View Detailed Analysis
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Analysis Modal Dialog */}
      <AnimatePresence>
        {showHydrationDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md" id="hydration-detail-modal">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-xl shadow-2xl relative border border-slate-100 dark:border-slate-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-on-surface dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Hydration & Pharmacological Synergy
                </h3>
                <button 
                  onClick={() => setShowHydrationDetail(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-on-surface-variant dark:text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-sm text-on-surface-variant dark:text-slate-400 leading-relaxed">
                <p>
                  <strong>Clinical Correlation:</strong> Lisinopril operates as an Angiotensin-Converting Enzyme (ACE) inhibitor. By dilating systemic blood vessels, it reduces renal arterial resistance and lowers systemic blood pressure.
                </p>
                <p>
                  <strong>Dizziness Pathogenesis:</strong> Under moderate dehydration, blood volume drops, amplifying the antihypertensive dynamics of Lisinopril. This frequently induces transient orthostatic hypotension (a brief head-rush upon standing).
                </p>
                <p>
                  <strong>AI Synergy Buffer:</strong> Compensating with an additional 500ml hydration cushion maintains intravascular volume, neutralizing orthostatic blood pressure variations without diminishing Lisinopril's core cardioprotective efficacy.
                </p>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setShowHydrationDetail(false)}
                  className="w-full py-3 text-sm font-semibold text-white bg-primary hover:bg-primary-container rounded-xl transition-colors shadow-md shadow-primary/10 cursor-pointer"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Medication Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" id="add-medication-modal">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl relative border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-extrabold text-on-surface dark:text-slate-100 flex items-center gap-2">
                  <Pill className="w-5 h-5 text-primary" />
                  Add New Medication
                </h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-on-surface-variant dark:text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {addConflictWarn && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-2xl flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-red-700 text-xs block">AI Clinical Conflict Alert</span>
                    <p className="text-red-600 dark:text-red-400 text-xs leading-normal mt-0.5">{addConflictWarn}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleAddMed} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-2">
                    Medication Name
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Lisinopril, Amoxicillin, Ibuprofen"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary text-sm font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-2">
                      Strength
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. 10mg, 500mg"
                      value={newStrength}
                      onChange={(e) => setNewStrength(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-2">
                      Form
                    </label>
                    <select 
                      value={newForm}
                      onChange={(e) => setNewForm(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary text-sm font-semibold"
                    >
                      <option>Tablet</option>
                      <option>Capsule</option>
                      <option>Injection</option>
                      <option>Liquid</option>
                      <option>Inhaler</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-2">
                      Frequency
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Daily, 3x daily"
                      value={newFrequency}
                      onChange={(e) => setNewFrequency(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-2">
                      Due Time
                    </label>
                    <input 
                      type="time"
                      placeholder="e.g. 09:00 AM"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary text-sm font-semibold"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 text-sm font-semibold text-white bg-primary hover:bg-primary-container rounded-xl transition-colors shadow-md shadow-primary/15 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? "Running Check..." : "Add Medication"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
