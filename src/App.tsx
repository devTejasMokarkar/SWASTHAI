import React, { useState, useEffect, lazy, Suspense } from "react";
import { User, Vitals, HealthReminder, Medication } from "./types";
import {
  Heart, Calendar, FolderOpen, MessageSquare, User as UserIcon, Sparkles,
  ShieldAlert, CheckCircle2, Activity, Bell, X, Clock, Check,
  Sun, Moon, Download, Home, Pill, LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch } from "./lib/api";

const Dashboard = lazy(() => import("./components/Dashboard"));
const Medications = lazy(() => import("./components/Medications"));
const HealthFiles = lazy(() => import("./components/HealthFiles"));
const ProfileSetup = lazy(() => import("./components/ProfileSetup"));
const AIChat = lazy(() => import("./components/AIChat"));
const VitalsLogModal = lazy(() => import("./components/VitalsLogModal"));
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./hooks/useAuth";
import { useDailyActions } from "./hooks/useDailyActions";
import { useVitals } from "./hooks/useVitals";
import { useMedications } from "./hooks/useMedications";
import { useFiles } from "./hooks/useFiles";
import { useChat } from "./hooks/useChat";
import { useUserProfile } from "./hooks/useUserProfile";
import { useSessions } from "./hooks/useSessions";
import { Login } from "./pages/Login";
import { useToast, ToastContainer, showToast } from "./hooks/useToast";

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
  const { toasts: toastList, dismiss: dismissToast } = useToast();
  const [activeTab, setActiveTab] = useState<"today" | "files" | "profile" | "medicine">("today");
  const [showChatOverlay, setShowChatOverlay] = useState(false);
  const [showVitalsLogModal, setShowVitalsLogModal] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
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

  useEffect(() => {
    if (localStorage.getItem("health_companion_dark") === null) {
      setDarkMode(true);
    }
  }, []);

  const { session, profile, loading: authLoading, signOut } = useAuth();
  const [creditBalance, setCreditBalance] = useState(0);

  useEffect(() => {
    if (!session?.access_token) return;
    fetch('/api/credits/balance', {
      headers: { Authorization: `Bearer ${session.access_token}` }
    }).then(r => r.json()).then(d => {
      if (d?.success) setCreditBalance(d.data?.balance ?? 0);
    }).catch(() => {});
  }, [session]);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut();
    setTimeout(() => setLoggingOut(false), 600);
  };

  const handleToggleDarkMode = () => setDarkMode(prev => !prev);

  const { actions: smartActions, logWater, toggleAction } = useDailyActions();
  const { readings: vitalsReadings, reminders: vitalsReminders, addReading: logVitalsReading, addReminder: addVitalReminder, toggleReminder: toggleVitalReminder, deleteReminder: deleteVitalReminder } = useVitals();
  const { medications, add: addMedication, remove: removeMedication, toggleTaken, toggleReminder: toggleMedReminder } = useMedications();
  const { files, add: addFile, remove: deleteFile } = useFiles();
  const { messages: chatHistory, auditLogs, sendMessage: sendChatMessage, clearChat: clearChatHistory } = useChat();
  const { start: startSession, end: endSession } = useSessions();
  const [healthReminders, setHealthReminders] = useState<HealthReminder[]>([]);
  const { update: saveProfile } = useUserProfile({} as User);
  const latestPulse = vitalsReadings.find((r: any) => r.pulse)?.pulse;
  const vitals: Vitals = {
    heartRate: latestPulse || 0,
    steps: 0,
    sleep: "",
    calories: 0,
    activityTrends: [],
  };

  const user: User = {
    id: session?.user?.id || profile?.user_id || "",
    fullName: profile?.name || "",
    email: profile?.email || "",
    dob: profile?.dob || "",
    gender: profile?.gender || "Other",
    dietaryPreferences: profile?.conditions?.length ? profile.conditions : [],
    credits: creditBalance || 0,
    vitalityScoreUp: 0,
    sleepRecovery: "",
    weightKg: profile?.weight_kg?.toString() || "",
    heightCm: profile?.height_cm?.toString() || "",
    healthGoals: profile?.health_goals || [],
    activeDiseases: profile?.active_diseases || [],
    otherDisease: "",
    medicalHistory: profile?.medical_history || "",
    noMedication: false,
  };

  useEffect(() => {
    if (session) startSession()
    return () => { endSession() }
  }, [])

  const handleUpdateWater = logWater;
  const handleToggleAction = toggleAction;

  const handleUpdateVitals = async () => {};

  const handleLogVitalsReading = async (reading: any) => {
    try {
      const data = await logVitalsReading(reading);
      if (data?.success) showToast("Vitals logged", "success");
      return data || { reading: null, analysis: "Reading logged.", isNormal: true, severity: "normal" };
    } catch {
      showToast("Failed to log vitals", "error");
      return { reading: null, analysis: "Reading logged.", isNormal: true, severity: "normal" };
    }
  };

  const handleAddVitalReminder = addVitalReminder;
  const handleToggleVitalReminder = toggleVitalReminder;
  const handleDeleteVitalReminder = deleteVitalReminder;

  const handleExportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      user: { fullName: user.fullName, email: user.email },
      medications: medications.map(m => ({ id: m.id, name: m.name, taken: m.taken })),
      files: files.map(f => ({ id: f.id, name: f.name })),
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `swasthai_report_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleSaveProfile = async (updates: Partial<any>) => {
    try {
      await saveProfile(updates);
      showToast("Profile saved successfully", "success");
    } catch { showToast("Failed to save profile", "error"); }
  };

  const handleRefillCredits = async (amount: number = 50) => {
    try {
      await apiFetch('/api/credits/refill', {
        method: 'POST',
        body: JSON.stringify({ amount, feature: 'manual_refill' }),
      });
      showToast(`${amount} credits added`, "success");
      if (session?.access_token) {
        const d = await fetch('/api/credits/balance', { headers: { Authorization: `Bearer ${session.access_token}` } }).then(r => r.json());
        if (d?.success) setCreditBalance(d.data?.balance ?? 0);
      }
    } catch { showToast("Failed to refill credits", "error"); }
  };

  const handleAddMedication = async (med: Partial<Medication>): Promise<{ success: boolean; conflict?: string }> => {
    try {
      const result = await addMedication(med);
      if (result) showToast(`${med.name} added`, "success");
      return { success: !!result, conflict: undefined };
    } catch {
      showToast("Failed to add medication", "error");
      return { success: false };
    }
  };

  const handleToggleTaken = toggleTaken;
  const handleToggleReminder = toggleMedReminder;
  const handleDeleteMedication = removeMedication;

  const handleAddFile = async (file: any) => {
    try {
      const result = await addFile(file);
      if (result) showToast("File uploaded", "success");
      return result;
    } catch {
      showToast("Failed to upload file", "error");
    }
  };
  const handleDeleteFile = async (id: string) => {
    try {
      await deleteFile(id);
      showToast("File deleted", "info");
    } catch {
      showToast("Failed to delete file", "error");
    }
  };

  const handleSendMessage = sendChatMessage;
  const handleClearChat = clearChatHistory;

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
            medications={medications}
            healthReminders={healthReminders}
            loading={false}
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
            token={session?.access_token ?? null}
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
            token={session?.access_token ?? null}
            activeDiseases={user.activeDiseases}
            healthReminders={healthReminders}
            onHealthRemindersChange={setHealthReminders}
          />
        );
      case "profile":
        return (
          <ProfileSetup
            user={user}
            onSaveProfile={handleSaveProfile}
            onFinishOnboarding={() => setActiveTab("today")}
            token={session?.access_token ?? null}
            onRefillCredits={handleRefillCredits}
          />
        );
    }
  };

  if (loggingOut) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
            <div className="absolute inset-3 rounded-full border-4 border-secondary/20 border-b-secondary animate-spin" style={{animationDirection: 'reverse', animationDuration: '1s'}}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="w-7 h-7 text-primary/70 animate-pulse" />
            </div>
          </div>
          <p className="text-sm font-bold text-on-surface-variant">Signing you out...</p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex items-center justify-center">
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
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <>
      <ToastContainer toasts={toastList} dismiss={dismissToast} />
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.10),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_55%,_#eef2ff_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.16),_transparent_34%),linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#020617_100%)] text-on-surface dark:text-slate-100 font-sans antialiased transition-colors duration-300">
      <div className="h-dvh flex flex-col pb-32 overflow-hidden max-w-[1600px] mx-auto">
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
                <span className="font-bold text-xs text-primary">{user.credits} Credits</span>
              </div>
            )}

            <button
              onClick={() => setShowReminderModal(true)}
              className="relative p-3 hover:bg-slate-100 dark:hover:bg-slate-800 text-on-surface-variant dark:text-slate-400 hover:text-primary dark:hover:text-primary rounded-lg transition-colors cursor-pointer"
              title="View All Reminders"
            >
              <Bell className="w-5 h-5" />
              {(medications.some(m => !m.taken) || healthReminders.some(r => r.enabled)) && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(prev => !prev)}
                className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 shadow-inner cursor-pointer hover:border-primary transition-all relative group flex items-center justify-center bg-slate-50 dark:bg-slate-800"
                title="Profile Settings"
              >
                {profile?.name?.trim() ? (
                  <span className="text-xs font-bold text-primary">{profile.name.trim().charAt(0).toUpperCase()}</span>
                ) : (
                  <UserIcon className="w-5 h-5 text-primary" />
                )}
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-2xl p-2 z-50">
                  <button
                    type="button"
                    onClick={() => { setActiveTab("profile"); setProfileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-primary/5 text-left transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-on-surface dark:text-slate-100">Edit Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleExportData(); setProfileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-primary/5 text-left transition-colors"
                  >
                    <Download className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-on-surface dark:text-slate-100">Export Report</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowReminderModal(true); setProfileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-primary/5 text-left transition-colors"
                  >
                    <Bell className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-on-surface dark:text-slate-100">View Reminders</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleToggleDarkMode(); setProfileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-primary/5 text-left transition-colors"
                  >
                    {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />}
                    <span className="text-sm font-semibold text-on-surface dark:text-slate-100">{darkMode ? "Light Mode" : "Dark Mode"}</span>
                  </button>
                  <div className="my-2 h-px bg-slate-200/80 dark:bg-slate-800/80" />
                  <button
                    type="button"
                    onClick={() => { handleLogout(); setProfileMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span className="text-sm font-semibold text-rose-500">Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="pt-24 px-4 md:px-12 w-full mx-auto flex-1 flex flex-col min-h-0 overflow-y-auto">
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

        <nav className="fixed bottom-0 left-0 w-full z-40 flex md:hidden justify-between items-center h-20 px-4 pb-safe bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 shadow-xl rounded-t-2xl transition-colors duration-300">
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
          <div className="fixed right-4 sm:right-6 bottom-24 md:bottom-24 z-30 flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="flex items-center gap-1.5 mb-1.5"
            >
              <motion.span
                animate={{ rotate: [0, 15, -10, 15, 0] }}
                transition={{ repeat: Infinity, duration: 2, repeatDelay: 3, ease: "easeInOut" }}
                className="text-lg"
              >
                👋
              </motion.span>
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.4, duration: 0.4 }}
                className="text-[13px] font-black bg-gradient-to-r from-primary via-purple-500 to-indigo-500 bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient drop-shadow-sm"
              >
                HeCo
              </motion.span>
            </motion.div>

            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.12, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full bg-primary/30 dark:bg-primary/20 blur-xl"
              />

              <motion.button
                onClick={() => setShowChatOverlay(true)}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(99,102,241,0.4)",
                    "0 0 0 14px rgba(99,102,241,0)",
                    "0 0 0 0 rgba(99,102,241,0)",
                  ],
                }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }}
                className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-indigo-600 text-white shadow-xl hover:shadow-primary/35 flex items-center justify-center cursor-pointer relative z-10"
                title="Ask He-Co AI"
                id="btn-chat-fab"
              >
                <MessageSquare className="w-6 h-6" />
              </motion.button>
            </div>
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
                token={session?.access_token ?? null}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <VitalsLogModal
          isOpen={showVitalsLogModal}
          onClose={() => setShowVitalsLogModal(false)}
          onLogVitalsReading={handleLogVitalsReading}
        />

        <AnimatePresence>
          {showReminderModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800"
              >
                <div className="sticky top-0 bg-white dark:bg-slate-900 z-10 flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-extrabold text-on-surface dark:text-slate-100">All Reminders</h2>
                  </div>
                  <button onClick={() => setShowReminderModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer">
                    <X className="w-5 h-5 text-on-surface-variant" />
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  {/* Upcoming */}
                  <div>
                    <h3 className="text-xs font-black text-sky-600 dark:text-sky-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Upcoming
                    </h3>
                    {(() => {
                      const upcoming: { label: string; detail: string; time: string }[] = []
                      medications.filter(m => !m.taken).forEach(m => upcoming.push({ label: m.name, detail: m.strength, time: m.dueTime }))
                      healthReminders.filter(r => r.enabled).forEach(r => upcoming.push({ label: r.customLabel || r.type, detail: r.type, time: r.times[0] || "—" }))
                      vitalsReminders.filter((r: any) => !r.completed).forEach((r: any) => upcoming.push({ label: r.name || "Vitals check", detail: r.type || "", time: r.time || "—" }))
                      return upcoming.length > 0 ? (
                        <div className="space-y-1.5">
                          {upcoming.map((r, i) => (
                            <div key={i} className="flex items-center justify-between px-3.5 py-2.5 bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/30 rounded-xl">
                              <div>
                                <p className="text-xs font-bold text-on-surface dark:text-slate-100">{r.label}</p>
                                <p className="text-[10px] text-on-surface-variant">{r.detail}</p>
                              </div>
                              <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">{r.time}</span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-on-surface-variant italic">No upcoming reminders</p>
                    })()}
                  </div>

                  {/* Completed / Taken */}
                  <div>
                    <h3 className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> Completed
                    </h3>
                    {(() => {
                      const done: { label: string; detail: string; time: string }[] = []
                      medications.filter(m => m.taken).forEach(m => done.push({ label: m.name, detail: m.strength, time: m.dueTime }))
                      healthReminders.filter(r => !r.enabled).forEach(r => done.push({ label: r.customLabel || r.type, detail: r.type, time: r.times[0] || "—" }))
                      vitalsReminders.filter((r: any) => r.completed).forEach((r: any) => done.push({ label: r.name || "Vitals check", detail: r.type || "", time: r.time || "—" }))
                      return done.length > 0 ? (
                        <div className="space-y-1.5">
                          {done.map((r, i) => (
                            <div key={i} className="flex items-center justify-between px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 rounded-xl opacity-70">
                              <div>
                                <p className="text-xs font-bold text-on-surface dark:text-slate-100 line-through">{r.label}</p>
                                <p className="text-[10px] text-on-surface-variant">{r.detail}</p>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{r.time}</span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-on-surface-variant italic">No completed reminders yet</p>
                    })()}
                  </div>

                  {/* Summary */}
                  <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3.5 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-on-surface-variant">Total active</span>
                    <span className="font-black text-on-surface dark:text-slate-100">
                      {medications.filter(m => !m.taken).length + healthReminders.filter(r => r.enabled).length + vitalsReminders.filter((r: any) => !r.completed).length}
                    </span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </>
  );
}
