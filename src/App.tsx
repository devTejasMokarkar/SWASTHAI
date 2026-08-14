import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { User, Vitals, HealthReminder, Medication } from "./types";
import {
  Heart, Calendar, FolderOpen, MessageSquare, User as UserIcon, Sparkles,
  ShieldAlert, CheckCircle2, Activity, Bell, X, Clock, Check,
  Download, Home, Pill, LogOut, ScanLine
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { apiFetch, logUserActivity } from "./lib/api";
import ScanUploadModal from "./components/ui/ScanUploadModal";

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
  const [showScanModal, setShowScanModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileMenuOpen]);

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("health_companion_dark");
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

  const googleName = session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || ""
  const resolvedName = (profile?.name && profile.name !== 'New user') ? profile.name : googleName

  const user: User = {
    id: session?.user?.id || profile?.user_id || "",
    fullName: resolvedName,
    email: profile?.email || session?.user?.email || "",
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
      if (result) {
        showToast(`${med.name} added`, "success");
        logUserActivity("add_medication", { name: med.name, strength: med.strength, frequency: med.frequency });
      }
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 animate-spin" style={{ borderColor: 'rgba(124,58,237,0.15)', borderTopColor: 'var(--violet)' }}></div>
            <div className="absolute inset-3 rounded-full border-4 animate-spin" style={{ borderColor: 'rgba(93,93,214,0.15)', borderBottomColor: 'var(--indigo)', animationDirection: 'reverse', animationDuration: '1s' }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="w-7 h-7 animate-pulse" style={{ color: 'var(--violet)' }} />
            </div>
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-dim)' }}>Signing you out...</p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 animate-spin" style={{ borderColor: 'rgba(124,58,237,0.15)', borderTopColor: 'var(--violet)' }}></div>
            <div className="absolute inset-3 rounded-full border-4 animate-spin" style={{ borderColor: 'rgba(93,93,214,0.15)', borderBottomColor: 'var(--indigo)', animationDirection: 'reverse', animationDuration: '1s' }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="w-7 h-7 animate-pulse" style={{ color: 'var(--violet)' }} />
            </div>
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--text-dim)' }}>Loading Swasth AI...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <ToastContainer toasts={toastList} dismiss={dismissToast} />
        <Login />
      </>
    );
  }

  return (
    <>
      <ToastContainer toasts={toastList} dismiss={dismissToast} />
      <div className="min-h-screen text-[var(--text)] antialiased" style={{ background: 'var(--bg)', fontFamily: 'var(--font-sans)' }}>
      <div className="h-dvh flex flex-col pb-32 md:pb-0 overflow-hidden max-w-[1600px] mx-auto">

        {/* ── Navbar ── */}
        <header className="fixed top-0 w-full z-50 flex justify-between items-center px-4 md:px-10 h-[60px]"
          style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>

          {/* Brand mark */}
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 overflow-hidden"
              style={{ background: 'var(--grad-brand)' }}>
              <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
                <path
                  className="ecg-path"
                  d="M4,16 H10 L13,8 L16,24 L19,13 L21,16 H28"
                  stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="text-[17px] font-semibold tracking-tight truncate"
              style={{ fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>
              Swasth <em className="not-italic italic" style={{ color: 'var(--violet)' }}>AI</em>
            </h1>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Credits pill */}
            {user && (
              <button
                onClick={() => handleRefillCredits(50)}
                className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all hover:scale-105 active:scale-95"
                style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.18)', color: 'var(--violet)' }}
                title="Add 50 credits"
              >
                <span className="w-2 h-2 rounded-full shrink-0 credits-dot"
                  style={{ background: 'var(--violet)' }} />
                {user.credits} credits
              </button>
            )}

            {/* Export button */}
            <button
              onClick={handleExportData}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all hover:scale-105 active:scale-95"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
              title="Export report"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </button>

            {/* Bell with dropdown */}
            <div className="relative">
              <button
                onClick={() => { setShowReminderModal(prev => !prev); setProfileMenuOpen(false); }}
                className="relative w-9 h-9 rounded-[10px] flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
                title="Reminders"
              >
                <Bell className="w-4 h-4" />
                {(medications.some(m => !m.taken) || healthReminders.some(r => r.enabled)) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                    style={{ background: 'var(--magenta)', boxShadow: '0 0 0 2px white' }} />
                )}
              </button>
            </div>

            {/* Avatar with dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => { setProfileMenuOpen(prev => !prev); setShowReminderModal(false); }}
                className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 font-bold text-sm"
                style={{ background: 'var(--grad-brand)', color: 'white', boxShadow: 'var(--shadow-sm)' }}
                title="Profile"
              >
                {profile?.name?.trim()
                  ? profile.name.trim().charAt(0).toUpperCase()
                  : <UserIcon className="w-4 h-4" />}
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-[var(--radius-md)] p-1.5 z-50"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}>
                  <div className="px-3 py-2.5 mb-1">
                    <p className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>{profile?.name || user.fullName || "Profile"}</p>
                    <p className="text-[11px]" style={{ color: 'var(--muted)' }}>{user.email}</p>
                  </div>
                  <div className="h-px mx-1 mb-1" style={{ background: 'var(--border)' }} />
                  <button
                    type="button"
                    onClick={() => { setActiveTab("profile"); setProfileMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] text-left transition-colors hover:bg-[rgba(124,58,237,0.06)] cursor-pointer"
                  >
                    <UserIcon className="w-4 h-4" style={{ color: 'var(--violet)' }} />
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab("profile"); setProfileMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] text-left transition-colors hover:bg-[rgba(124,58,237,0.06)] cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" style={{ color: 'var(--violet)' }} />
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text)' }}>Settings</span>
                  </button>
                  <div className="h-px mx-1 my-1" style={{ background: 'var(--border)' }} />
                  <button
                    type="button"
                    onClick={() => { handleLogout(); setProfileMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-sm)] text-left transition-colors hover:bg-[rgba(214,64,159,0.06)] cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" style={{ color: 'var(--magenta)' }} />
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--magenta)' }}>Log out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="pt-[60px] px-4 md:px-10 w-full mx-auto flex-1 flex flex-col min-h-0 overflow-y-auto">
          <AnimatePresence mode="wait">
            {user ? (
              <div key={activeTab} className="flex-1 flex flex-col min-h-0">
                <ErrorBoundary>
                  <Suspense fallback={
                    <div className="flex items-center justify-center py-20">
                      <div className="relative w-14 h-14">
                        <div className="absolute inset-0 rounded-full border-[3px] animate-spin"
                          style={{ borderColor: 'rgba(124,58,237,0.12)', borderTopColor: 'var(--violet)' }} />
                        <div className="absolute inset-2 rounded-full border-[3px] animate-spin"
                          style={{ borderColor: 'rgba(91,91,214,0.12)', borderBottomColor: 'var(--indigo)', animationDirection: 'reverse', animationDuration: '0.9s' }} />
                      </div>
                    </div>
                  }>
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

        <nav className="fixed bottom-0 left-0 w-full z-40 flex md:hidden justify-between items-center h-20 px-4 pb-safe rounded-t-2xl"
          style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid var(--border)', boxShadow: '0 -4px 20px rgba(124,58,237,0.06)' }}>
          <button
            onClick={() => setActiveTab("today")}
            className={`flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all active:scale-90 cursor-pointer min-w-[56px] min-h-[56px]`}
            style={activeTab === "today" ? { color: 'var(--violet)', background: 'rgba(124,58,237,0.08)' } : { color: 'var(--muted)' }}
          >
            <Home className="w-6 h-6" />
            <span className="text-[10px] font-bold mt-0.5">Home</span>
          </button>

          <button
            onClick={() => setActiveTab("medicine")}
            className={`flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all active:scale-90 cursor-pointer min-w-[56px] min-h-[56px]`}
            style={activeTab === "medicine" ? { color: 'var(--violet)', background: 'rgba(124,58,237,0.08)' } : { color: 'var(--muted)' }}
          >
            <Pill className="w-6 h-6" />
            <span className="text-[10px] font-bold mt-0.5">Meds</span>
          </button>

          <button
            onClick={() => setShowVitalsLogModal(true)}
            className="w-14 h-14 rounded-full text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all mt-[-18px]"
            style={{ background: 'var(--grad-brand)', boxShadow: '0 4px 20px -4px rgba(124,58,237,0.5)' }}
            title="Log Vitals"
          >
            <Heart className="w-6 h-6 fill-white" />
          </button>

          <button
            onClick={() => setActiveTab("files")}
            className={`flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all active:scale-90 cursor-pointer min-w-[56px] min-h-[56px]`}
            style={activeTab === "files" ? { color: 'var(--violet)', background: 'rgba(124,58,237,0.08)' } : { color: 'var(--muted)' }}
          >
            <FolderOpen className="w-6 h-6" />
            <span className="text-[10px] font-bold mt-0.5">Files</span>
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center justify-center px-2 py-2 rounded-xl transition-all active:scale-90 cursor-pointer min-w-[56px] min-h-[56px]`}
            style={activeTab === "profile" ? { color: 'var(--violet)', background: 'rgba(124,58,237,0.08)' } : { color: 'var(--muted)' }}
          >
            <UserIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold mt-0.5">Profile</span>
          </button>
        </nav>

        {user && (
          <div className="fixed right-4 sm:right-6 bottom-24 md:bottom-8 z-30 flex flex-col items-end gap-3">
            {/* Scan FAB */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.4 }}
              className="flex md:hidden flex-col items-center gap-1"
            >
              <motion.button
                onClick={() => setShowScanModal(true)}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                className="w-11 h-11 rounded-2xl text-white flex items-center justify-center cursor-pointer"
                style={{ background: 'linear-gradient(135deg,#10b981,#0d9488)', boxShadow: '0 6px 18px -4px rgba(16,185,129,0.45)' }}
                title="Scan Medicine / Upload Report"
                id="btn-scan-fab"
              >
                <ScanLine className="w-4.5 h-4.5" />
              </motion.button>
              <span className="text-[9px] font-bold tracking-wide uppercase" style={{ color: 'var(--muted)' }}>Scan</span>
            </motion.div>

            {/* HeCo Chat FAB */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.9, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col items-end gap-2"
            >
              {/* Label pill */}
              {!showChatOverlay && (
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.4, duration: 0.4 }}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full cursor-pointer select-none"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                  onClick={() => setShowChatOverlay(true)}
                >
                  <span className="relative flex w-2 h-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full rounded-full animate-ping opacity-60" style={{ background: 'var(--violet)' }} />
                    <span className="relative inline-flex rounded-full w-2 h-2" style={{ background: 'var(--violet)' }} />
                  </span>
                  <span className="text-[12px] font-black tracking-tight"
                    style={{ background: 'var(--grad-text)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    HeCo
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-dim)' }}>· Ask anything</span>
                </motion.div>
              )}

              <motion.button
                onClick={() => setShowChatOverlay(prev => !prev)}
                whileHover={{ scale: 1.07 }}
                whileTap={{ scale: 0.93 }}
                className="w-14 h-14 rounded-[18px] text-white flex items-center justify-center cursor-pointer relative overflow-hidden"
                style={{ background: 'var(--grad-brand)', boxShadow: '0 10px 32px -8px rgba(124,58,237,0.55)' }}
                title="Ask He-Co AI"
                id="btn-chat-fab"
              >
                <AnimatePresence mode="wait">
                  {showChatOverlay ? (
                    <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
                      <X className="w-5 h-5" />
                    </motion.span>
                  ) : (
                    <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}>
                      <MessageSquare className="w-5 h-5" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </motion.div>
          </div>
        )}

        <AnimatePresence>
          {showChatOverlay && (
            <>
              {/* Mobile backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-40 sm:hidden"
                style={{ background: 'rgba(33,25,53,0.55)', backdropFilter: 'blur(8px)' }}
                onClick={() => setShowChatOverlay(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.96 }}
                transition={{ duration: 0.28, ease: [0.34, 1.2, 0.64, 1] }}
                className="fixed inset-x-0 bottom-0 top-0 z-50 sm:inset-auto sm:left-auto sm:right-6 sm:bottom-[96px] sm:w-[390px] sm:max-w-[calc(100vw-2rem)] sm:h-[580px] sm:max-h-[68vh] overflow-hidden flex flex-col rounded-none sm:rounded-[24px]"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 32px 80px -16px rgba(124,58,237,0.22), 0 8px 32px rgba(0,0,0,0.10)',
                }}
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
            </>
          )}
        </AnimatePresence>

        <VitalsLogModal
          isOpen={showVitalsLogModal}
          onClose={() => setShowVitalsLogModal(false)}
          onLogVitalsReading={handleLogVitalsReading}
        />

        <ScanUploadModal
          isOpen={showScanModal}
          onClose={() => setShowScanModal(false)}
          token={session?.access_token ?? null}
        />

        <AnimatePresence>
          {showReminderModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowReminderModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl border border-slate-200"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-extrabold text-on-surface">All Reminders</h2>
                  </div>
                  <button onClick={() => setShowReminderModal(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer">
                    <X className="w-5 h-5 text-on-surface-variant" />
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  {/* Upcoming */}
                  <div>
                    <h3 className="text-xs font-black text-sky-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
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
                            <div key={i} className="flex items-center justify-between px-3.5 py-2.5 bg-sky-50 border border-sky-200 rounded-xl">
                              <div>
                                <p className="text-xs font-bold text-on-surface">{r.label}</p>
                                <p className="text-[10px] text-on-surface-variant">{r.detail}</p>
                              </div>
                              <span className="text-[10px] font-bold text-sky-600">{r.time}</span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-on-surface-variant italic">No upcoming reminders</p>
                    })()}
                  </div>

                  {/* Completed / Taken */}
                  <div>
                    <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
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
                            <div key={i} className="flex items-center justify-between px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl opacity-70">
                              <div>
                                <p className="text-xs font-bold text-on-surface line-through">{r.label}</p>
                                <p className="text-[10px] text-on-surface-variant">{r.detail}</p>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-600">{r.time}</span>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-xs text-on-surface-variant italic">No completed reminders yet</p>
                    })()}
                  </div>

                  {/* Summary */}
                  <div className="bg-slate-50 rounded-xl p-3.5 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-on-surface-variant">Total active</span>
                    <span className="font-black text-on-surface">
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
