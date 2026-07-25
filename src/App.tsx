import React, { useState, useEffect, lazy, Suspense } from "react";
import { User, SmartActions, Vitals, FileRecord, Medication, ChatMessage } from "./types";
import {
  Heart, Calendar, FolderOpen, MessageSquare, User as UserIcon, Sparkles,
  ShieldAlert, CheckCircle2, Activity,
  Sun, Moon, Download, Home, Pill
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const Dashboard = lazy(() => import("./components/Dashboard"));
const Medications = lazy(() => import("./components/Medications"));
const HealthFiles = lazy(() => import("./components/HealthFiles"));
const ProfileSetup = lazy(() => import("./components/ProfileSetup"));
const AIChat = lazy(() => import("./components/AIChat"));
const VitalsLogModal = lazy(() => import("./components/VitalsLogModal"));
import ErrorBoundary from "./components/ErrorBoundary";

function TypingText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, 40);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span>
      {displayed}
      <span className={`inline-block w-[2px] h-3 bg-primary ml-0.5 align-middle transition-opacity ${done ? 'opacity-0' : 'opacity-100'}`} />
    </span>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"today" | "files" | "profile" | "medicine">("today");
  const [showChatOverlay, setShowChatOverlay] = useState(false);
  const [showVitalsLogModal, setShowVitalsLogModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem("health_companion_dark");
    return stored === null ? true : stored === "true";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("health_companion_dark", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("health_companion_dark", "false");
    }
  }, [darkMode]);

  const [user, setUser] = useState<User>({
    fullName: "Guest User",
    email: "guest@swasth.ai",
    dob: "1990-01-01",
    gender: "Other",
    dietaryPreferences: ["No Preferences"],
    credits: 120,
    vitalityScoreUp: 72,
    sleepRecovery: 65,
  });
  const [smartActions, setSmartActions] = useState<SmartActions>({
    waterLoggedMl: 0,
    waterGoalMl: 2500,
    vitaminD: false,
    breathing: false,
  });
  const [vitals, setVitals] = useState<Vitals>({
    heartRate: 72,
    steps: 8432,
    sleep: "7h 45m",
    calories: 1850,
    activityTrends: [40, 65, 45, 85, 60, 95, 75],
  });
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [vitalsReadings, setVitalsReadings] = useState<any[]>([]);
  const [vitalsReminders, setVitalsReminders] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [debugMode, setDebugMode] = useState<boolean>(() => {
    return localStorage.getItem("swasth_debug_mode") === "true";
  });

  const handleToggleDebugMode = (val: boolean) => {
    setDebugMode(val);
    localStorage.setItem("swasth_debug_mode", String(val));
  };

  const handleUpdateWater = async (amount: number) => {
    setSmartActions(prev => ({ ...prev, waterLoggedMl: prev.waterLoggedMl + amount }));
    try {
      await fetch("/api/metrics/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
    } catch {}
  };

  const handleToggleAction = async (action: "vitaminD" | "breathing") => {
    setSmartActions(prev => ({ ...prev, [action]: !prev[action] }));
    try {
      await fetch("/api/metrics/action/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } catch {}
  };

  const handleUpdateVitals = async (updated: Partial<Vitals>) => {
    const newVitals = { ...vitals, ...updated };
    setVitals(newVitals);
  };

  const handleLogVitalsReading = async (reading: any) => {
    try {
      const res = await fetch("/api/vitals/readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reading)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reading) {
          setVitalsReadings(prev => [data.reading, ...prev]);
        }
        if (data.reading && data.reading.pulse) {
          setVitals(prev => ({ ...prev, heartRate: data.reading.pulse }));
        }
        return data;
      }
    } catch (err) {
      console.error("Failed to log vital reading:", err);
    }
    return { reading: null, analysis: "Reading logged.", isNormal: true, severity: "normal" };
  };

  const handleAddVitalReminder = async (reminder: any) => {
    try {
      const res = await fetch("/api/vitals/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reminder)
      });
      if (res.ok) {
        const data = await res.json();
        setVitalsReminders(prev => [...prev, data.reminder || data]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleVitalReminder = async (id: string) => {
    try {
      const res = await fetch(`/api/vitals/reminders/${id}/toggle`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setVitalsReminders(prev => prev.map(r => r.id === id ? (data.reminder || data) : r));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVitalReminder = async (id: string) => {
    try {
      const res = await fetch(`/api/vitals/reminders/${id}`, { method: "DELETE" });
      if (res.ok) {
        setVitalsReminders(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportData = () => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      userProfile: user ? {
        fullName: user.fullName,
        email: user.email,
        dob: user.dob,
        gender: user.gender,
        vitalityScoreUp: user.vitalityScoreUp,
        sleepRecovery: user.sleepRecovery,
        dietaryPreferences: user.dietaryPreferences,
        credits: user.credits,
      } : null,
      recentVitals: vitals,
      smartActionsProgress: smartActions,
      medications: medications.map(m => ({
        id: m.id, name: m.name, strength: m.strength, form: m.form,
        frequency: m.frequency, dueTime: m.dueTime, taken: m.taken,
        loggedAt: m.loggedAt, reminderSet: m.reminderSet,
        conflictDetected: m.conflictDetected, conflictMessage: m.conflictMessage
      })),
      healthFiles: files.map(f => ({
        id: f.id, name: f.name, category: f.category, size: f.size,
        type: f.type, date: f.date, aiInsight: f.aiInsight
      }))
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `health_companion_report_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleSaveProfile = async (updates: Partial<User>) => {
    try {
      const res = await fetch("/api/auth/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRefillCredits = async (amount: number = 50) => {
    try {
      const res = await fetch("/api/credits/refill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMedication = async (med: Partial<Medication>): Promise<{ success: boolean; conflict?: string }> => {
    try {
      const res = await fetch("/api/medications/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(med),
      });
      if (res.ok) {
        const data = await res.json();
        setMedications((prev) => [...prev, data.medication]);
        return { success: true, conflict: data.conflict || undefined };
      }
      return { success: false };
    } catch (err) {
      console.error(err);
      return { success: false };
    }
  };

  const handleToggleTaken = async (id: string) => {
    try {
      const res = await fetch(`/api/medications/${id}/take`, { method: "POST" });
      if (res.ok) {
        const updatedMed = await res.json();
        setMedications((prev) => prev.map((m) => (m.id === id ? updatedMed : m)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleReminder = async (id: string) => {
    setMedications((prev) => prev.map((m) => m.id === id ? { ...m, reminderSet: !m.reminderSet } : m));
    try {
      await fetch(`/api/medications/${id}/reminder`, { method: "POST" });
    } catch {}
  };

  const handleDeleteMedication = async (id: string) => {
    try {
      const res = await fetch(`/api/medications/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMedications((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFile = async (file: { name: string; category: "report" | "prescription"; size: string }) => {
    try {
      const res = await fetch("/api/files/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(file),
      });
      if (res.ok) {
        const data = await res.json();
        setFiles((prev) => [data, ...prev]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFile = async (id: string) => {
    try {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (msg: string) => {
    const optimisticUserMsg: ChatMessage = { sender: "user", text: msg, timestamp: new Date().toISOString() };
    setChatHistory((prev) => [...prev, optimisticUserMsg]);
    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, clientDateTime: new Date().toISOString() }),
      });
      if (res.ok) {
        const updatedHistory = await res.json();
        setChatHistory(updatedHistory);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearChat = async () => {
    setChatHistory([]);
    try {
      const res = await fetch("/api/gemini/chat/clear", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setChatHistory(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const renderContent = () => {
    if (!user) return null;

    switch (activeTab) {
      case "today":
        return (
          <Dashboard
            user={user}
            smartActions={smartActions}
            vitals={vitals}
            onUpdateWater={handleUpdateWater}
            onToggleAction={handleToggleAction}
            onUpdateVitals={handleUpdateVitals}
            onLogVitalsReading={handleLogVitalsReading}
            onOpenChat={() => setShowChatOverlay(true)}
          />
        );
      case "files":
        return (
          <HealthFiles
            files={files}
            onAddFile={handleAddFile}
            onDeleteFile={handleDeleteFile}
            vitalsReadings={vitalsReadings}
            vitalsReminders={vitalsReminders}
            onToggleVitalReminder={handleToggleVitalReminder}
            onDeleteReminder={handleDeleteVitalReminder}
            onAddReminder={handleAddVitalReminder}
            medications={medications}
            onAddMedication={handleAddMedication}
            onToggleTaken={handleToggleTaken}
            onToggleReminder={handleToggleReminder}
            onDeleteMedication={handleDeleteMedication}
            token={null}
          />
        );
      case "medicine":
        return (
          <Medications
            medications={medications}
            onAddMedication={handleAddMedication}
            onToggleTaken={handleToggleTaken}
            onToggleReminder={handleToggleReminder}
            onDeleteMedication={handleDeleteMedication}
            token={null}
          />
        );
      case "profile":
        return (
          <ProfileSetup
            user={user}
            onSaveProfile={handleSaveProfile}
            onFinishOnboarding={() => setActiveTab("today")}
            debugMode={debugMode}
            onToggleDebugMode={handleToggleDebugMode}
            token={null}
            onRefillCredits={handleRefillCredits}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-on-surface dark:text-slate-100 font-sans antialiased transition-colors duration-300">
      <div className="h-dvh flex flex-col pb-32 overflow-hidden">
        <header className="fixed top-0 w-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 z-50 flex justify-between items-center px-4 md:px-12 h-16 shadow-sm transition-colors duration-300">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-primary truncate">Swasth AI</h1>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
            {user && (
              <div className="hidden md:flex bg-primary/10 px-4 py-1.5 rounded-full border border-primary/10 shadow-sm">
                <span className="font-bold text-xs text-primary">{user.credits || 120} Credits</span>
              </div>
            )}

            <button
              onClick={handleExportData}
              className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-transparent hover:bg-primary/5 text-primary border-2 border-primary/30 hover:border-primary rounded-xl text-xs font-black transition-all hover:scale-[1.02] cursor-pointer shadow-sm"
              title="Export Health Data Report"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Report</span>
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 text-on-surface-variant dark:text-slate-400 hover:text-primary dark:hover:text-primary rounded-lg transition-colors cursor-pointer"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            <div
              onClick={() => setActiveTab("profile")}
              className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 shadow-inner cursor-pointer hover:border-primary transition-all relative group flex items-center justify-center bg-slate-50 dark:bg-slate-800"
              title="Profile Settings"
            >
              <UserIcon className="w-5 h-5 text-primary" />
            </div>
          </div>
        </header>

        <main className="pt-24 px-4 md:px-12 max-w-[1440px] w-full mx-auto flex-1 flex flex-col min-h-0 overflow-y-auto">
          <AnimatePresence mode="wait">
            {user ? (
              <div key={activeTab} className="flex-1 flex flex-col min-h-0">
                <ErrorBoundary>
                  <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="relative w-16 h-16"><div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div><div className="absolute inset-2 rounded-full border-4 border-secondary/20 border-b-secondary animate-spin animate-pulse" style={{animationDirection: 'reverse', animationDuration: '1s'}}></div><div className="absolute inset-0 flex items-center justify-center"><Activity className="w-6 h-6 text-primary/60" /></div></div></div>}>
                    {renderContent()}
                  </Suspense>
                </ErrorBoundary>
              </div>
            ) : (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                    <div className="absolute inset-3 rounded-full border-4 border-secondary/20 border-b-secondary animate-spin" style={{animationDirection: 'reverse', animationDuration: '1s'}}></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Activity className="w-7 h-7 text-primary/70 animate-pulse" />
                    </div>
                  </div>
                  <p className="text-sm font-bold text-on-surface-variant">Loading Swasth AI...</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </main>

        <nav className="fixed bottom-0 left-0 w-full z-40 flex justify-between items-center h-20 px-4 pb-safe bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 shadow-xl rounded-t-2xl transition-colors duration-300">
          <button
            onClick={() => setActiveTab("today")}
            className={`flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all active:scale-90 cursor-pointer min-w-[56px] min-h-[56px] ${activeTab === "today" ? "text-primary bg-primary/10 dark:bg-primary/20" : "text-on-surface-variant hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-bold mt-0.5">Home</span>
          </button>

          <button
            onClick={() => setActiveTab("medicine")}
            className={`flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all active:scale-90 cursor-pointer min-w-[56px] min-h-[56px] ${activeTab === "medicine" ? "text-primary bg-primary/10 dark:bg-primary/20" : "text-on-surface-variant hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            <Pill className="w-6 h-6" />
            <span className="text-[10px] font-bold mt-0.5">Meds</span>
          </button>

          <button
            onClick={() => setShowVitalsLogModal(true)}
            className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-[0_4px_20px_-4px_rgba(244,63,94,0.5)] hover:shadow-[0_8px_25px_-4px_rgba(244,63,94,0.6)] flex items-center justify-center hover:scale-105 active:scale-95 transition-all mt-[-18px]"
            title="Log Vitals"
          >
            <Heart className="w-6 h-6 fill-white" />
          </button>

          <button
            onClick={() => setActiveTab("files")}
            className={`flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all active:scale-90 cursor-pointer min-w-[56px] min-h-[56px] ${activeTab === "files" ? "text-primary bg-primary/10 dark:bg-primary/20" : "text-on-surface-variant hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            <FolderOpen className="w-6 h-6" />
            <span className="text-[10px] font-bold mt-0.5">Files</span>
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all active:scale-90 cursor-pointer min-w-[56px] min-h-[56px] ${activeTab === "profile" ? "text-primary bg-primary/10 dark:bg-primary/20" : "text-on-surface-variant hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            <UserIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold mt-0.5">Profile</span>
          </button>
        </nav>

        {user && (
          <div className="fixed right-6 bottom-28 md:bottom-24 z-30 flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-bold text-transparent bg-gradient-to-r from-secondary via-purple-500 to-primary bg-clip-text bg-[length:200%_100%] animate-gradient whitespace-nowrap drop-shadow-sm">
              <TypingText text="I am HeCo AI Health Advisor" />
            </span>
            <button
              onClick={() => setShowChatOverlay(true)}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-indigo-600 text-white shadow-xl hover:shadow-primary/35 flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Ask He-Co AI"
              id="btn-chat-fab"
            >
              <MessageSquare className="w-6 h-6" />
            </button>
          </div>
        )}

        <AnimatePresence>
          {showChatOverlay && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed inset-x-0 bottom-0 top-0 z-50 sm:inset-auto sm:left-auto sm:right-6 sm:bottom-28 sm:w-[360px] sm:max-w-[calc(100vw-2rem)] sm:h-[520px] sm:max-h-[60vh] bg-white dark:bg-slate-950 shadow-[0_2px_20px_-4px_rgba(0,0,0,0.08),0_8px_40px_-8px_rgba(0,0,0,0.12)] dark:shadow-[0_2px_20px_-4px_rgba(0,0,0,0.3),0_8px_40px_-8px_rgba(0,0,0,0.4)] border-0 sm:border border-slate-200/80 dark:border-slate-800/60 overflow-hidden flex flex-col rounded-none sm:rounded-3xl"
            >
              <AIChat
                chatHistory={chatHistory}
                onSendMessage={handleSendMessage}
                onClearChat={handleClearChat}
                onClose={() => setShowChatOverlay(false)}
                auditLogs={auditLogs}
                user={user}
                medications={medications}
                debugMode={debugMode}
                token={null}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <VitalsLogModal
          isOpen={showVitalsLogModal}
          onClose={() => setShowVitalsLogModal(false)}
          onLogVitalsReading={handleLogVitalsReading}
        />
      </div>
    </div>
  );
}
