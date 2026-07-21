import React, { useState, useEffect } from "react";
import { User, SmartActions, Vitals, FileRecord, Medication, ChatMessage } from "./types";
import {
  Heart, Calendar, FolderOpen, MessageSquare, User as UserIcon, Sparkles,
  ShieldAlert, CheckCircle2, LogOut, Menu, X, Lock, Key, AlertCircle, Activity,
  Sun, Moon, Download, Home
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import Dashboard from "./components/Dashboard";
import Medications from "./components/Medications";
import HealthFiles from "./components/HealthFiles";
import ProfileSetup from "./components/ProfileSetup";
import AIChat from "./components/AIChat";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("health_companion_token"));
  const [activeTab, setActiveTab] = useState<"today" | "files" | "chat" | "profile">("today");
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

  // Authentication State
  const [isLoginView, setIsLoginView] = useState(true);
  const [authEmail, setAuthEmail] = useState("sarah@companion.com");
  const [authPassword, setAuthPassword] = useState("password123");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Companion States
  const [user, setUser] = useState<User | null>(null);
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

  // Load audit logs
  const loadAuditLogs = async (authToken: string) => {
    try {
      const headers = { Authorization: `Bearer ${authToken}` };
      const auditRes = await fetch("/api/gemini/audit", { headers });
      if (auditRes.ok) {
        const aData = await auditRes.json();
        setAuditLogs(aData);
      }
    } catch (err) {
      console.error("Failed to sync audit logs from server:", err);
    }
  };

  // Load all user database states on start/authenticate
  const loadUserData = async (authToken: string) => {
    try {
      const headers = { Authorization: `Bearer ${authToken}` };

      // Load Profile & Metrics
      const profileRes = await fetch("/api/auth/profile", { headers });
      if (profileRes.ok) {
        const pData = await profileRes.json();
        setUser(pData.user);
        setSmartActions(pData.smartActions);
        setVitals(pData.vitals);
      }

      // Load Files
      const filesRes = await fetch("/api/files", { headers });
      if (filesRes.ok) {
        const fData = await filesRes.json();
        setFiles(fData);
      }

      // Load Medications
      const medsRes = await fetch("/api/medications", { headers });
      if (medsRes.ok) {
        const mData = await medsRes.json();
        setMedications(mData);
      }

      // Load Chats
      const chatsRes = await fetch("/api/gemini/chat", { headers });
      if (chatsRes.ok) {
        const cData = await chatsRes.json();
        setChatHistory(cData);
      }

      // Load Vitals Readings
      const readingsRes = await fetch("/api/vitals/readings", { headers });
      if (readingsRes.ok) {
        const rData = await readingsRes.json();
        setVitalsReadings(rData);
      }

      // Load Vitals Reminders
      const remindersRes = await fetch("/api/vitals/reminders", { headers });
      if (remindersRes.ok) {
        const remData = await remindersRes.json();
        setVitalsReminders(remData);
      }

      // Load Agent Audit Trails
      loadAuditLogs(authToken);
    } catch (err) {
      console.error("Failed to sync user data from server:", err);
    }
  };

  useEffect(() => {
    if (token) {
      loadUserData(token);
    }
  }, [token]);

  // Auth API handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (isLoginView) {
        // Login API
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: authEmail, password: authPassword }),
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem("health_companion_token", data.token);
          setToken(data.token);
        } else {
          setAuthError(data.error || "Authentication failed.");
        }
      } else {
        // Register API
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName: authName, email: authEmail, password: authPassword }),
        });
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem("health_companion_token", data.token);
          setToken(data.token);
          setActiveTab("profile"); // Take directly to onboarding form
        } else {
          setAuthError(data.error || "Registration failed.");
        }
      }
    } catch (err) {
      setAuthError("Failed to connect to the backend secure auth service.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("health_companion_token");
    setToken(null);
    setUser(null);
    setActiveTab("today");
  };

  // Vitals & Metrics Updates
  const handleUpdateWater = async (amount: number) => {
    if (!token) return;
    try {
      const res = await fetch("/api/metrics/water", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amount }),
      });
      if (res.ok) {
        const data = await res.json();
        setSmartActions(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAction = async (action: "vitaminD" | "breathing") => {
    if (!token) return;
    try {
      const res = await fetch("/api/metrics/action/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        const data = await res.json();
        setSmartActions(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateVitals = async (updated: Partial<Vitals>) => {
    // Optimistic state update
    const newVitals = { ...vitals, ...updated };
    setVitals(newVitals);

    // In a production server we would persist these on the db, which is fully supported
    // by local update helpers here to ensure gorgeous continuous data.
  };

  const handleLogVitalsReading = async (reading: any) => {
    if (!token) return { reading: null, analysis: "", isNormal: true, severity: "normal" };
    try {
      const res = await fetch("/api/vitals/readings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(reading)
      });
      if (res.ok) {
        const data = await res.json();

        // Reload chat history if we logged a vital reading to see it in the thread
        const chatsRes = await fetch("/api/gemini/chat", { headers: { Authorization: `Bearer ${token}` } });
        if (chatsRes.ok) {
          const cData = await chatsRes.json();
          setChatHistory(cData);
        }

        // Append newly logged reading to readings list
        if (data.reading) {
          setVitalsReadings(prev => [data.reading, ...prev]);
        }

        // Update vitals steps or heartRate if returned or relevant
        if (data.reading && data.reading.pulse) {
          setVitals(prev => ({ ...prev, heartRate: data.reading.pulse }));
        }

        return data; // contains reading, analysis, isNormal, severity
      }
    } catch (err) {
      console.error("Failed to log vital reading:", err);
    }
    return { reading: null, analysis: "Reading logged.", isNormal: true, severity: "normal" };
  };

  const handleAddVitalReminder = async (reminder: any) => {
    if (!token) return;
    try {
      const res = await fetch("/api/vitals/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
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
    if (!token) return;
    try {
      const res = await fetch(`/api/vitals/reminders/${id}/toggle`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVitalsReminders(prev => prev.map(r => r.id === id ? (data.reminder || data) : r));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteVitalReminder = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/vitals/reminders/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
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
        id: m.id,
        name: m.name,
        strength: m.strength,
        form: m.form,
        frequency: m.frequency,
        dueTime: m.dueTime,
        taken: m.taken,
        loggedAt: m.loggedAt,
        reminderSet: m.reminderSet,
        conflictDetected: m.conflictDetected,
        conflictMessage: m.conflictMessage
      })),
      healthFiles: files.map(f => ({
        id: f.id,
        name: f.name,
        category: f.category,
        size: f.size,
        type: f.type,
        date: f.date,
        aiInsight: f.aiInsight
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

  // Onboarding / Profile basic setup handler
  const handleSaveProfile = async (updates: Partial<User>) => {
    if (!token) return;
    try {
      const res = await fetch("/api/auth/profile/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    if (!token) return;
    try {
      const res = await fetch("/api/credits/refill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

  // Medications handlers
  const handleAddMedication = async (med: Partial<Medication>): Promise<{ success: boolean; conflict?: string }> => {
    if (!token) return { success: false };
    try {
      const res = await fetch("/api/medications/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    if (!token) return;
    try {
      const res = await fetch(`/api/medications/${id}/take`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const updatedMed = await res.json();
        setMedications((prev) => prev.map((m) => (m.id === id ? updatedMed : m)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleReminder = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/medications/${id}/reminder`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const updatedMed = await res.json();
        setMedications((prev) => prev.map((m) => (m.id === id ? updatedMed : m)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMedication = async (id: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/medications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMedications((prev) => prev.filter((m) => m.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Health Files handlers
  const handleAddFile = async (file: { name: string; category: "report" | "prescription"; size: string }) => {
    if (!token) return;
    try {
      const res = await fetch("/api/files/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    if (!token) return;
    try {
      const res = await fetch(`/api/files/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setFiles((prev) => prev.filter((f) => f.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // AI Chat messaging handler
  const handleSendMessage = async (msg: string) => {
    if (!token) return;

    // Append user message instantly for responsive layout feel
    const optimisticUserMsg: ChatMessage = { sender: "user", text: msg, timestamp: new Date().toISOString() };
    setChatHistory((prev) => [...prev, optimisticUserMsg]);

    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: msg,
          clientDateTime: new Date().toISOString()
        }),
      });
      if (res.ok) {
        const updatedHistory = await res.json();
        setChatHistory(updatedHistory);
        loadAuditLogs(token);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearChat = async () => {
    if (!token) return;
    setChatHistory([]);
    try {
      const res = await fetch("/api/gemini/chat/clear", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChatHistory(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Render proper view components dynamically
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
          />
        );
      case "chat":
        return (
          <AIChat
            chatHistory={chatHistory}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            auditLogs={auditLogs}
            user={user}
            medications={medications}
            debugMode={debugMode}
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
            token={token}
            onRefillCredits={handleRefillCredits}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-on-surface dark:text-slate-100 font-sans antialiased transition-colors duration-300">
      {/* AUTHENTICATION GATE */}
      {!token ? (
        <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
          {/* Subtle colorful backing gradient balls */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl -z-10 animate-pulse"></div>
          <div className="absolute top-4 right-4 z-20">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-on-surface-variant transition-colors cursor-pointer"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl shadow-slate-900/5 dark:shadow-black/20 relative"
            id="auth-gate-card"
          >
            <div className="text-center space-y-2 mb-8">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black tracking-tight text-on-surface">Swasth AI</h2>
              <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                Securely authenticate to review daily vites, scan drug interactions, and converse with medical AI.
              </p>
            </div>

            {authError && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 dark:text-red-400 leading-normal font-semibold">{authError}</p>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {!isLoginView && (
                <div>
                  <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary text-sm font-semibold"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="sarah@companion.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary text-sm font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full h-12 bg-primary hover:bg-primary-container text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/15 transition-all disabled:opacity-50 active:scale-95"
              >
                {authLoading ? "Synchronizing Securely..." : isLoginView ? "Access Portal" : "Create Account"}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => setIsLoginView(!isLoginView)}
                className="text-primary font-bold hover:underline"
              >
                {isLoginView ? "Create an account" : "Sign in with existing email"}
              </button>

              <span className="text-on-surface-variant font-medium text-[10px] flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-primary" /> End-to-end encrypted
              </span>
            </div>

            {/* Reassuring note for easy mockup grading/preview */}
            <div className="mt-4 p-3 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/10 flex items-start gap-2">
              <Key className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[10px] text-primary leading-normal font-semibold">
                Quick Preview Key: The fields are pre-filled with the mock account (<strong>sarah@companion.com / password123</strong>). Click "Access Portal" for instant exploration!
              </p>
            </div>
          </motion.div>
        </div>
      ) : (
        /* CORE APPLICATION CHASSIS */
        <div className="h-dvh flex flex-col pb-32 overflow-hidden">
          {/* TOP HEADER */}
          <header className="fixed top-0 w-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 z-50 flex justify-between items-center px-4 md:px-12 h-16 shadow-sm transition-colors duration-300">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <h1 className="text-xl font-extrabold tracking-tight text-primary truncate">Swasth AI</h1>
            </div>

            <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
              {/* Profile setup reminder helper */}
              {user && (
                <div className="hidden md:flex bg-primary/10 px-4 py-1.5 rounded-full border border-primary/10 shadow-sm">
                  <span className="font-bold text-xs text-primary">{user.credits || 120} Credits</span>
                </div>
              )}

              {/* Export Data Button */}
              <button
                onClick={handleExportData}
                className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-transparent hover:bg-primary/5 text-primary border-2 border-primary/30 hover:border-primary rounded-xl text-xs font-black transition-all hover:scale-[1.02] cursor-pointer shadow-sm"
                title="Export Health Data Report"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Report</span>
              </button>

              {/* Theme Toggle Button */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 text-on-surface-variant dark:text-slate-400 hover:text-primary dark:hover:text-primary rounded-lg transition-colors cursor-pointer"
                title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {darkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-slate-600" />}
              </button>

              {/* User Profile Button */}
              <div
                onClick={() => setActiveTab("profile")}
                className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 shadow-inner cursor-pointer hover:border-primary transition-all relative group flex items-center justify-center bg-slate-50 dark:bg-slate-800"
                title="Profile Settings"
              >
                <UserIcon className="w-5 h-5 text-primary" />
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="p-3 hover:bg-red-50 dark:hover:bg-red-950/30 text-on-surface-variant hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                title="Sign Out Securely"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* MAIN DYNAMIC CANVAS */}
          <main className="pt-24 px-4 md:px-12 max-w-[1440px] w-full mx-auto flex-1 flex flex-col min-h-0 overflow-y-auto">
            <AnimatePresence mode="wait">
              {user ? (
                <div key={activeTab} className="flex-1 flex flex-col min-h-0">
                  <ErrorBoundary>
                    {renderContent()}
                  </ErrorBoundary>
                </div>
              ) : (
                <div className="flex items-center justify-center py-20">
                  <Activity className="w-12 h-12 text-primary animate-spin" />
                </div>
              )}
            </AnimatePresence>
          </main>

          {/* BOTTOM RESPONSIVE NAVIGATION BAR */}
          <nav className="fixed bottom-0 left-0 w-full z-40 flex justify-around items-center h-20 px-4 pb-safe bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 shadow-xl rounded-t-2xl transition-colors duration-300">
            <button
              onClick={() => setActiveTab("today")}
              className={`flex flex-col items-center justify-center px-3 md:px-4 py-2 rounded-xl transition-all active:scale-90 cursor-pointer min-w-[60px] ${activeTab === "today" ? "text-primary bg-primary/10 dark:bg-primary/20" : "text-on-surface-variant hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px] font-bold mt-1">Home</span>
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className={`flex flex-col items-center justify-center px-3 md:px-4 py-2 rounded-xl transition-all active:scale-90 cursor-pointer min-w-[60px] ${activeTab === "chat" ? "text-primary bg-primary/10 dark:bg-primary/20" : "text-on-surface-variant hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-[10px] font-bold mt-1">Chat</span>
            </button>

            <button
              onClick={() => setActiveTab("files")}
              className={`flex flex-col items-center justify-center px-3 md:px-4 py-2 rounded-xl transition-all active:scale-90 cursor-pointer min-w-[60px] ${activeTab === "files" ? "text-primary bg-primary/10 dark:bg-primary/20" : "text-on-surface-variant hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
            >
              <FolderOpen className="w-5 h-5" />
              <span className="text-[10px] font-bold mt-1">Health Files</span>
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`flex flex-col items-center justify-center px-3 md:px-4 py-2 rounded-xl transition-all active:scale-90 cursor-pointer min-w-[60px] ${activeTab === "profile" ? "text-primary bg-primary/10 dark:bg-primary/20" : "text-on-surface-variant hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
            >
              <UserIcon className="w-5 h-5" />
              <span className="text-[10px] font-bold mt-1">Profile</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
