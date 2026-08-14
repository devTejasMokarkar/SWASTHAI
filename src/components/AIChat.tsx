import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, User, Medication } from "../types";
import { 
  Send, Sparkles, Activity, ShieldAlert, Heart, Info, ArrowDown, 
  Clipboard, X, Database, ShieldCheck, CheckCircle2, ChevronDown, ChevronRight, FileText, Search,
  RefreshCw, Play, Cpu, Layers, CheckSquare, XCircle, Clock, Bot, AlertTriangle, Copy, Filter, ArrowUpDown, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AIChatProps {
  chatHistory: ChatMessage[];
  onSendMessage: (msg: string) => Promise<void>;
  onClearChat: () => Promise<void>;
  onClose?: () => void;
  auditLogs?: any[];
  user: User;
  medications: Medication[];
  token: string | null;
}

function extractGraphifyContext(auditLogs: any[]): string {
  const latest = [...auditLogs]
    .reverse()
    .find(entry => typeof entry?.retrieved_context?.graphify === "string" && entry.retrieved_context.graphify.trim());
  return latest?.retrieved_context?.graphify || "";
}

const localRiskDictionary = {
  grapefruit: {
    condition: (user: any, meds: Medication[]) => meds.some(m => m.name.toLowerCase().includes("atorvastatin") || m.name.toLowerCase().includes("statin")),
    alert: "Grapefruit / CYP3A4 Statin Interaction Risk: Grapefruit significantly increases statin concentration levels in the body, raising risks of muscle toxicity and rhabdomyolysis.",
    action: "Please do NOT consume grapefruit or grapefruit juice while on active Statin therapy. Seek professional medical evaluation if you experience unexplained muscle pain or weakness."
  },
  nsaid: {
    condition: (user: any, meds: Medication[]) => meds.some(m => m.name.toLowerCase().includes("lisinopril") || m.name.toLowerCase().includes("ace-inhibitor")),
    alert: "NSAID Interaction Alert: Pain relievers like Ibuprofen, Advil, Aspirin, or Naproxen can restrict renal blood flow and counteract lisinopril's blood pressure reduction efficacy.",
    action: "Avoid NSAIDs. Consider consulting your doctor or pharmacist about safer alternatives like Acetaminophen."
  },
  highGlycemic: {
    condition: (user: any, meds: Medication[]) => {
      const isDiabetic = meds.some(m => m.name.toLowerCase().includes("metformin")) || 
                         user?.dietaryPreferences?.some((p: string) => p.toLowerCase().includes("diabet"));
      return isDiabetic;
    },
    alert: "Glycemic Warning: Suggested sugar source (e.g., sugar, honey, juice, maple syrup, high-glycemic carb) causes rapid blood glucose spikes, directly opposing diabetes management.",
    action: "Opt for low-glycemic, fiber-rich foods instead. Seek medical consultation or check with a clinical provider to monitor long-term glucose patterns."
  },
  potassiumSubstitute: {
    condition: (user: any, meds: Medication[]) => meds.some(m => m.name.toLowerCase().includes("lisinopril")),
    alert: "Hyperkalemia Warning: ACE-inhibitors spark potassium retention; combining them with potassium salt substitutes is risky.",
    action: "Avoid potassium salt substitutes and discuss electrolyte nutrition plans with your care team."
  },
  majorSymptoms: {
    condition: () => true,
    alert: "Major Symptom Warning: Critical indicators (such as chest pain, severe breathlessness, extreme fatigue, sudden weakness, or palpitations) require professional clinical care.",
    action: "Please contact a medical professional or seek professional medical advice immediately. Do not attempt to manage severe symptoms with home remedies."
  }
};

interface SafetyIssue {
  alert: string;
  action: string;
  type: string;
}

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-bold text-on-surface">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function runClientClinicalSafetyValidator(text: string, user: User, meds: Medication[]): SafetyIssue[] {
  const issues: SafetyIssue[] = [];
  const lowerText = text.toLowerCase();

  // 1. Grapefruit statin
  if ((lowerText.includes("grapefruit") || lowerText.includes("grape fruit")) && localRiskDictionary.grapefruit.condition(user, meds)) {
    issues.push({
      type: "grapefruit",
      alert: localRiskDictionary.grapefruit.alert,
      action: localRiskDictionary.grapefruit.action
    });
  }

  // 2. NSAID
  const nsaidKeywords = ["ibuprofen", "advil", "motrin", "aspirin", "naproxen", "aleve"];
  const containsNsaid = nsaidKeywords.some(kw => lowerText.includes(kw));
  if (containsNsaid && localRiskDictionary.nsaid.condition(user, meds)) {
    issues.push({
      type: "nsaid",
      alert: localRiskDictionary.nsaid.alert,
      action: localRiskDictionary.nsaid.action
    });
  }

  // 3. High glycemic
  const glycemicKeywords = ["sugar", "honey", "juice", "maple syrup", "glycemic", "white bread", "white rice", "potatoes"];
  const containsGlycemic = glycemicKeywords.some(kw => lowerText.includes(kw));
  if (containsGlycemic && localRiskDictionary.highGlycemic.condition(user, meds)) {
    issues.push({
      type: "glycemic",
      alert: localRiskDictionary.highGlycemic.alert,
      action: localRiskDictionary.highGlycemic.action
    });
  }

  // 4. Potassium
  if ((lowerText.includes("potassium salt") || lowerText.includes("salt substitute")) && localRiskDictionary.potassiumSubstitute.condition(user, meds)) {
    issues.push({
      type: "potassium",
      alert: localRiskDictionary.potassiumSubstitute.alert,
      action: localRiskDictionary.potassiumSubstitute.action
    });
  }

  // 5. Major symptoms
  const symptomKeywords = ["chest pain", "pain in chest", "shortness of breath", "difficulty breathing", "severe muscle pain", "rhabdomyolysis", "extreme blood sugar", "heart palpitations", "sudden weakness", "severe fatigue"];
  if (symptomKeywords.some(kw => lowerText.includes(kw))) {
    issues.push({
      type: "symptom",
      alert: localRiskDictionary.majorSymptoms.alert,
      action: localRiskDictionary.majorSymptoms.action
    });
  }

  return issues;
}

export default function AIChat({ 
  chatHistory, 
  onSendMessage, 
  onClearChat,
  onClose,
  auditLogs = [],
  user,
  medications,
  token
}: AIChatProps) {
  const [suggestions, setSuggestions] = useState<{ text: string; type: string }[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [searchAuditQuery, setSearchAuditQuery] = useState("");
  const [auditFilterChip, setAuditFilterChip] = useState<string>("all");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const handleViewport = () => {
      const vh = window.innerHeight;
      const vp = window.visualViewport?.height || vh;
      const diff = vh - vp;
      setKeyboardHeight(diff > 50 ? diff : 0);
    };
    handleViewport();
    window.visualViewport?.addEventListener("resize", handleViewport);
    return () => window.visualViewport?.removeEventListener("resize", handleViewport);
  }, []);

  const [auditTab, setAuditTab] = useState<"logs" | "diagnostics">("logs");
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState<boolean>(false);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const graphifyContext = extractGraphifyContext(auditLogs);

  const runDiagnostics = async () => {
    setRunningDiagnostics(true);
    setDiagnosticError(null);
    try {
      const res = await fetch("/api/gemini/diagnostics/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error(`Diagnostics failed with status ${res.status}`);
      }
      const data = await res.json();
      setDiagnosticResult(data);
    } catch (err: any) {
      console.error(err);
      setDiagnosticError(err.message || "An unexpected error occurred during the test suite execution.");
    } finally {
      setRunningDiagnostics(false);
    }
  };

  const handleSend = async (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!userInput.trim() || isLoading) return;

    const msg = userInput;
    setUserInput("");
    setIsLoading(true);

    try {
      await onSendMessage(msg);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuery = async (query: string) => {
    const context = buildProfileContext(user, medications);
    setUserInput(query);
    await onSendMessage(`${context}${graphifyContext ? `\n\n[Project Graph]\n${graphifyContext}` : ""}\n\n${query}`);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      void handleSend(e);
    }
  };

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isLoading]);

  useEffect(() => {
    setSuggestions(buildSuggestions(user, medications));
  }, [user, medications]);

  function buildProfileContext(u: User, meds: Medication[]): string {
    const parts: string[] = [];
    if (u.fullName) parts.push(`Name: ${u.fullName}`);
    if (u.gender) parts.push(`Gender: ${u.gender}`);
    if (u.dob) {
      const age = Math.floor((new Date().getTime() - new Date(u.dob).getTime()) / 31557600000);
      parts.push(`Age: ${age}`);
    }
    if (u.weightKg) parts.push(`Weight: ${u.weightKg} kg`);
    if (u.heightCm) parts.push(`Height: ${u.heightCm} cm`);
    if (u.activeDiseases?.length) parts.push(`Conditions: ${u.activeDiseases.join(", ")}`);
    const diet = u.dietaryPreferences?.filter(d => d !== "No Preference");
    if (diet?.length) parts.push(`Diet: ${diet.join(", ")}`);
    if (u.healthGoals?.length) parts.push(`Goals: ${u.healthGoals.join(", ")}`);
    if (u.medicalHistory) parts.push(`Medical History: ${u.medicalHistory}`);
    if (meds.length > 0) parts.push(`Medications: ${meds.map(m => `${m.name}${m.strength ? " "+m.strength : ""}`).join(", ")}`);
    if (graphifyContext) parts.push(`Project Graph: ${graphifyContext}`);
    return `[User Profile: ${parts.join(" | ")}]`;
  }

  function buildSuggestions(u: User, meds: Medication[]): { text: string; type: string }[] {
    const result: { text: string; type: string }[] = [];

    if (meds.length >= 2) {
      result.push({ text: `Check ${meds[0].name} conflict with ${meds[1].name}`, type: "conflict" });
    } else if (meds.length === 1) {
      result.push({ text: `How does ${meds[0].name} work?`, type: "report" });
    } else if (u.activeDiseases?.length) {
      result.push({ text: `Check ${u.activeDiseases[0]} medication interactions`, type: "conflict" });
    } else {
      result.push({ text: "Check Ibuprofen conflict with Lisinopril", type: "conflict" });
    }

    if (u.activeDiseases?.length) {
      result.push({ text: `Explain optimal management for ${u.activeDiseases[0]}`, type: "report" });
    } else if (meds.length > 0) {
      result.push({ text: `How to take ${meds[0].name} correctly?`, type: "report" });
    } else {
      result.push({ text: "Explain optimal FEV1/FVC ratios", type: "report" });
    }

    const dietPref = u.dietaryPreferences?.find(d => d !== "No Preference");
    const goal = u.healthGoals?.[0] || "general health";
    if (dietPref) {
      result.push({ text: `Suggest ${dietPref.toLowerCase()} recipes for ${goal.toLowerCase()}`, type: "diet" });
    } else {
      result.push({ text: "Suggest healthy meal plans for balanced nutrition", type: "diet" });
    }

    return result;
  }

  // Filter audit logs based on search query and filter chip
  const filteredAudits = auditLogs.filter(log => {
    const qMatch = log.query.toLowerCase().includes(searchAuditQuery.toLowerCase());
    const rMatch = log.rawGeneratedResponse?.toLowerCase().includes(searchAuditQuery.toLowerCase());
    const fileMatch = log.retrievedContext?.files?.some((f: any) => f.name.toLowerCase().includes(searchAuditQuery.toLowerCase()));
    const searchMatch = qMatch || rMatch || fileMatch;

    // Filter chip logic
    if (auditFilterChip !== "all") {
      const hasErrors = log.safetyWarnings && log.safetyWarnings.length > 0;
      const hasFiles = log.retrievedContext?.files && log.retrievedContext.files.length > 0;
      const hasResponse = log.rawGeneratedResponse;
      switch (auditFilterChip) {
        case "queries": return searchMatch && !hasErrors && !hasFiles;
        case "responses": return searchMatch && !!hasResponse;
        case "tools": return searchMatch && !!hasFiles;
        case "errors": return searchMatch && !!hasErrors;
        default: return searchMatch;
      }
    }

    return searchMatch;
  });

  function relativeTime(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  }

  // Group logs by Today / Yesterday / Older
  const groupedLogs = filteredAudits.reduce((groups, log) => {
    const logDate = new Date(log.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    let group: string;
    if (logDate.toDateString() === today.toDateString()) group = "Today";
    else if (logDate.toDateString() === yesterday.toDateString()) group = "Yesterday";
    else group = "Older";
    if (!groups[group]) groups[group] = [];
    groups[group].push(log);
    return groups;
  }, {} as Record<string, any[]>);

  const groupOrder = ["Today", "Yesterday", "Older"];

  return (
    <div
      className="flex flex-col w-full h-full relative overflow-hidden"
      style={{ paddingBottom: keyboardHeight, background: 'var(--surface)', fontFamily: 'var(--font-sans)' }}
      id="ai-chat-view-container"
    >
      {/* ── Primary Chat Interface ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col h-full w-full flex-1"
        id="ai-chat-view"
      >

        {/* ── Header ── */}
        <div className="shrink-0 px-4 pt-4 pb-3 flex items-center gap-3"
          style={{ borderBottom: '1px solid var(--border)' }}>

          {/* Brand mark */}
          <div className="w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0"
            style={{ background: 'var(--grad-brand)', boxShadow: '0 4px 12px -4px rgba(124,58,237,0.45)' }}>
            <Sparkles className="w-4 h-4 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-black tracking-tight leading-none"
                style={{ fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>
                He‑Co
              </h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide"
                style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', color: '#16a34a' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                online
              </span>
            </div>
            <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
              Clinical AI · Drug interactions · Diet plans
            </p>
          </div>

          {/* Audit toggle */}
          <button
            type="button"
            onClick={() => setShowAudit(!showAudit)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-[10px] font-bold transition-all duration-200 cursor-pointer shrink-0"
            style={showAudit
              ? { background: 'rgba(124,58,237,0.10)', color: 'var(--violet)', border: '1px solid rgba(124,58,237,0.20)' }
              : { background: 'var(--surface-2)', color: 'var(--muted)', border: '1px solid var(--border)' }}
            id="btn-toggle-rag-audit"
            aria-label="Toggle audit trail"
          >
            <Database className="w-3.5 h-3.5" />
            {auditLogs.length > 0 && (
              <span className="font-black">{auditLogs.length}</span>
            )}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-[10px] transition-colors cursor-pointer"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
              title="Close chat"
              aria-label="Close chat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* ── Messages ── */}
        <div ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0 scroll-smooth"
          id="chat-messages-container"
          style={{ background: 'var(--bg)' }}>

          {/* Empty state */}
          {chatHistory.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center min-h-full py-8 text-center px-4">
              {/* Icon */}
              <div className="w-14 h-14 rounded-[18px] mb-5 flex items-center justify-center"
                style={{ background: 'var(--grad-brand)', boxShadow: '0 8px 24px -8px rgba(124,58,237,0.45)' }}>
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-[17px] font-black mb-1.5"
                style={{ fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>
                Ask He‑Co
              </h3>
              <p className="text-[12px] leading-relaxed mb-6 max-w-[22ch]" style={{ color: 'var(--text-dim)' }}>
                Drug interactions, lab results, meal plans, and health records.
              </p>

              {/* Suggestion cards */}
              <div className="w-full max-w-[320px] space-y-2">
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestedQuery(sug.text)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer rounded-[14px]"
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                    aria-label={sug.text}
                  >
                    <span className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 text-base"
                      style={{
                        background: sug.type === "conflict" ? 'rgba(214,64,159,0.10)' : sug.type === "diet" ? 'rgba(34,197,94,0.10)' : 'rgba(124,58,237,0.10)',
                        border: sug.type === "conflict" ? '1px solid rgba(214,64,159,0.22)' : sug.type === "diet" ? '1px solid rgba(34,197,94,0.22)' : '1px solid rgba(124,58,237,0.22)',
                      }}>
                      {sug.type === "conflict" ? "💊" : sug.type === "diet" ? "🥗" : "📋"}
                    </span>
                    <span className="text-[12px] font-semibold flex-1 leading-snug" style={{ color: 'var(--text)' }}>
                      {sug.text}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--muted)' }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message bubbles */}
          {chatHistory.map((msg, index) => {
            const isAI = msg.sender === "ai";
            const text = msg.text || "";

            const isSafetyAlert = text.includes("⚠️ [SWASTH-AI CLINICAL SAFETY ALERT]");
            let alertContent = "";
            let regularContent = text;

            if (isSafetyAlert) {
              const parts = text.split("--------------------------------------------");
              if (parts.length > 1) {
                alertContent = parts[0].replace("⚠️ [SWASTH-AI CLINICAL SAFETY ALERT]", "").trim();
                regularContent = parts.slice(1).join("--------------------------------------------").trim();
              }
            }

            const clientSafetyIssues = isAI ? runClientClinicalSafetyValidator(regularContent, user, medications) : [];
            const uniqueClientIssues = isSafetyAlert
              ? clientSafetyIssues.filter(i => !alertContent.toLowerCase().includes(i.type))
              : clientSafetyIssues;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex items-end gap-2.5 ${isAI ? "justify-start" : "justify-end"}`}
                id={`chat-bubble-${index}`}
              >
                {isAI && (
                  <div className="w-7 h-7 rounded-[10px] flex items-center justify-center shrink-0 mb-0.5"
                    style={{ background: 'var(--grad-brand)', boxShadow: '0 4px 10px -4px rgba(124,58,237,0.4)' }}>
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                )}

                <div className={`max-w-[86%] flex flex-col gap-1.5 ${isAI ? "items-start" : "items-end"}`}>

                  {/* Server Safety Alert banner */}
                  {isSafetyAlert && (
                    <div className="w-full px-3 py-2.5 rounded-[14px] rounded-bl-sm"
                      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" style={{ color: '#dc2626' }} />
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#dc2626' }}>
                          Clinical Safety Alert
                        </span>
                      </div>
                      <div className="space-y-0.5 pl-5">
                        {alertContent.split("\n").map((line, lIdx) => (
                          <p key={lIdx} className="text-[10px] leading-relaxed" style={{ color: '#b91c1c' }}>{line}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Client safety warnings */}
                  {isAI && uniqueClientIssues.length > 0 && (
                    <div className="w-full px-3 py-2.5 rounded-[14px] rounded-bl-sm"
                      style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.28)' }}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" style={{ color: '#d97706' }} />
                        <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: '#d97706' }}>
                          Safety Detector
                        </span>
                      </div>
                      <div className="space-y-1 pl-5">
                        {uniqueClientIssues.map((issue, idx) => (
                          <div key={idx} className="text-[10px] leading-relaxed" style={{ color: '#92400e' }}>
                            <span className="font-bold">⚠️ {issue.alert}</span>
                            <span className="ml-1 opacity-75">{issue.action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Main bubble */}
                  <div
                    className="px-3.5 py-2.5 rounded-[16px] text-[12.5px] leading-relaxed"
                    style={isAI ? {
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      borderBottomLeftRadius: '4px',
                      boxShadow: 'var(--shadow-sm)',
                    } : {
                      background: 'var(--grad-btn)',
                      color: 'white',
                      borderBottomRightRadius: '4px',
                      boxShadow: '0 4px 14px -4px rgba(124,58,237,0.45)',
                    }}
                  >
                    <div className="space-y-1.5">
                      {regularContent.split("\n").map((line, lIdx) => {
                        const tLine = line.trim();
                        if (!tLine) return null;

                        if (tLine.includes("[Clinical Advice Disclaimer & Wellness Role]") ||
                          tLine.includes("Always seek professional medical guidance. Swasth-AI is a wellness companion") ||
                          tLine.includes("Swasth-AI provides pre-consultation information") ||
                          tLine.includes("Swasth-AI is a wellness companion") ||
                          tLine.includes("always consult your physician for medical decisions") ||
                          tLine === "Swasth-AI provides pre-consultation information and home-care suggestions only. It does not provide formal medical diagnoses or replace physician care.") {
                          return null;
                        }

                        if (tLine.startsWith("RAG Citation:") || tLine.startsWith("*Swasth-AI Citations") || tLine.startsWith("**RAG Citation:**")) {
                          const citationText = tLine.replace("**RAG Citation:**", "").replace("RAG Citation:", "").replace("*Swasth-AI Citations*", "").trim();
                          const matches = citationText.match(/\[(.*?)\]/g) || [citationText];
                          return (
                            <div key={lIdx} className="flex flex-wrap gap-1.5 mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                              {matches.map((match, mIdx) => (
                                <span key={mIdx} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                                  style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.18)', color: 'var(--violet)' }}>
                                  <Database className="w-2.5 h-2.5" />
                                  {match.replace(/\[|\]/g, "")}
                                </span>
                              ))}
                            </div>
                          );
                        }

                        if (tLine.startsWith("Disclaimer:") || tLine.startsWith("⚠️ **Disclaimer**:")) {
                          return (
                            <p key={lIdx} className="text-[10px] italic mt-1.5 px-2 py-1.5 rounded-lg"
                              style={{ color: 'var(--muted)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                              <Info className="w-3 h-3 inline-block mr-1" style={{ color: 'var(--muted)' }} />
                              {tLine.replace("⚠️ **Disclaimer**:", "").replace("Disclaimer:", "").trim()}
                            </p>
                          );
                        }

                        if (/^(Good\s+(Morning|Afternoon|Evening))/i.test(tLine)) {
                          const rest = tLine.replace(/^(Good\s+(Morning|Afternoon|Evening)[,!.]?)\s*/i, "");
                          return (
                            <p key={lIdx} className="leading-relaxed">
                              <span className="font-semibold" style={{ color: isAI ? 'var(--violet)' : 'rgba(255,255,255,0.9)' }}>
                                {tLine.match(/^(Good\s+(Morning|Afternoon|Evening))/i)?.[0]}
                              </span>
                              {rest ? ` ${rest}` : ""}
                            </p>
                          );
                        }

                        if (/^[-•*]\s/.test(tLine)) {
                          const content = tLine.replace(/^[-•*]\s+/, "");
                          return (
                            <div key={lIdx} className="flex items-baseline gap-2 ml-1">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-2"
                                style={{ background: isAI ? 'var(--violet)' : 'rgba(255,255,255,0.7)' }} />
                              <span className="leading-relaxed flex-1">{renderBold(content)}</span>
                            </div>
                          );
                        }

                        return <p key={lIdx} className="leading-relaxed">{renderBold(line)}</p>;
                      })}
                    </div>

                    <span className="text-[9px] block mt-2 text-right"
                      style={{ color: isAI ? 'var(--muted)' : 'rgba(255,255,255,0.6)' }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Loading bubble */}
          {isLoading && (
            <div className="flex items-end gap-2.5 justify-start" id="chat-bubble-loading">
              <div className="w-7 h-7 rounded-[10px] flex items-center justify-center shrink-0 mb-0.5"
                style={{ background: 'var(--grad-brand)' }}>
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="px-4 py-3 rounded-[16px] rounded-bl-sm flex items-center gap-1.5"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:0s]" style={{ background: 'var(--violet)' }} />
                <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:0.14s]" style={{ background: 'var(--indigo)' }} />
                <span className="w-2 h-2 rounded-full animate-bounce [animation-delay:0.28s]" style={{ background: 'var(--magenta)' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input bar ── */}
        <div className="shrink-0 px-3 py-3"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                ref={inputRef}
                required
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Ask about meds, labs, or diet…"
                className="w-full h-10 px-4 pr-10 text-[13px] font-medium focus:outline-none transition-all duration-200 rounded-[14px]"
                style={{
                  background: 'var(--surface-2)',
                  border: '1.5px solid var(--border)',
                  color: 'var(--text)',
                }}
                aria-label="Chat input"
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--violet)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.10)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              {userInput && (
                <button
                  type="button"
                  onClick={() => setUserInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full transition-colors cursor-pointer"
                  style={{ color: 'var(--muted)' }}
                  aria-label="Clear input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => void handleSend(e)}
              disabled={!userInput.trim() || isLoading}
              className="w-10 h-10 rounded-[12px] text-white flex items-center justify-center transition-all duration-200 disabled:opacity-35 active:scale-[0.95] shrink-0 cursor-pointer"
              style={{ background: 'var(--grad-btn)', boxShadow: userInput.trim() ? '0 4px 14px -4px rgba(124,58,237,0.45)' : 'none' }}
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 px-1">
            <p className="text-[9.5px] leading-relaxed" style={{ color: 'var(--muted)' }}>
              For education only — always consult your physician.
            </p>
            <button
              type="button"
              onClick={() => void onClearChat()}
              className="text-[9.5px] font-bold px-2.5 py-1 rounded-[8px] transition-colors shrink-0 cursor-pointer hover:text-rose-500 hover:bg-rose-50"
              style={{ color: 'var(--muted)' }}
              aria-label="Clear chat history"
            >
              Clear
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Audit Log Slide-over ── */}
      <AnimatePresence>
        {showAudit && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 260 }}
            className="absolute inset-0 z-30 flex flex-col overflow-hidden"
            style={{ background: 'var(--surface)', fontFamily: 'var(--font-sans)' }}
            id="rag-audit-sidebar"
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3 flex items-center justify-between shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[12px] flex items-center justify-center shrink-0"
                  style={{ background: 'var(--grad-brand)' }}>
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-[14px] font-black tracking-tight"
                    style={{ fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>
                    Audit Log
                  </h3>
                  <p className="text-[10px]" style={{ color: 'var(--muted)' }}>AI conversations & actions</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)', color: '#16a34a' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </span>
                <button
                  onClick={() => setShowAudit(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-[10px] transition-colors cursor-pointer"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
                  aria-label="Close audit panel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              {(["logs", "diagnostics"] as const).map(tab => (
                <button key={tab}
                  onClick={() => setAuditTab(tab)}
                  className="flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer"
                  style={auditTab === tab
                    ? { color: 'var(--violet)', borderBottom: '2px solid var(--violet)', background: 'rgba(124,58,237,0.04)' }
                    : { color: 'var(--muted)', borderBottom: '2px solid transparent' }}>
                  {tab === "logs" ? "Audit Trails" : "RAG Diagnostics"}
                </button>
              ))}
            </div>

            {auditTab === "logs" ? (
              <>
                {/* Search + Filter chips */}
                <div className="px-3 pt-3 pb-2 shrink-0 space-y-2" style={{ background: 'var(--surface)' }}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--muted)' }} />
                    <input
                      type="text"
                      placeholder="Filter audit logs…"
                      value={searchAuditQuery}
                      onChange={(e) => setSearchAuditQuery(e.target.value)}
                      className="w-full h-9 pl-9 pr-4 rounded-[12px] text-[12px] font-medium focus:outline-none transition-all"
                      style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)', color: 'var(--text)' }}
                      aria-label="Search audit logs"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    {(["All", "Queries", "AI Responses", "Tool Calls", "Errors"] as const).map(chip => {
                      const chipKey = chip === "All" ? "all" : chip === "Queries" ? "queries" : chip === "AI Responses" ? "responses" : chip === "Tool Calls" ? "tools" : "errors";
                      return (
                        <button key={chip}
                          onClick={() => setAuditFilterChip(chipKey)}
                          className="px-2.5 py-1 rounded-full text-[9px] font-bold tracking-wide whitespace-nowrap transition-all cursor-pointer"
                          style={auditFilterChip === chipKey
                            ? { background: 'rgba(124,58,237,0.10)', color: 'var(--violet)', border: '1px solid rgba(124,58,237,0.22)' }
                            : { background: 'var(--surface-2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                          {chip}
                        </button>
                      );
                    })}
                    {auditFilterChip !== "all" && (
                      <button onClick={() => setAuditFilterChip("all")}
                        className="text-[9px] font-bold ml-1 transition-colors cursor-pointer"
                        style={{ color: 'var(--muted)' }}>
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Log list */}
                <div className="flex-1 overflow-y-auto px-3 pb-3 pt-2 space-y-3">
                  {filteredAudits.length > 0 ? (
                    <>
                      {groupOrder.map(group => {
                        const logs = groupedLogs[group];
                        if (!logs?.length) return null;
                        return (
                          <div key={group}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                              <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>{group}</span>
                              <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                            </div>
                            <div className="space-y-2">
                              {logs.map((log: any) => {
                                const isExpanded = expandedLogId === log.id;
                                const isSafe = !log.safetyWarnings || log.safetyWarnings.length === 0;
                                return (
                                  <div key={log.id} className="relative pl-4 group/audit">
                                    {/* Timeline */}
                                    <div className="absolute left-[5px] top-3 bottom-0 w-px" style={{ background: 'var(--border)' }} />
                                    <div className="absolute left-0 top-[11px] w-[11px] h-[11px] rounded-full flex items-center justify-center"
                                      style={{
                                        background: 'var(--surface)',
                                        border: `2px solid ${isSafe ? '#22c55e' : '#ef4444'}`,
                                      }}>
                                      <div className="w-[4px] h-[4px] rounded-full"
                                        style={{ background: isSafe ? '#22c55e' : '#ef4444' }} />
                                    </div>
                                    {/* Card */}
                                    <div
                                      className="rounded-[14px] p-3.5 transition-all duration-200 cursor-pointer relative"
                                      style={isExpanded
                                        ? { background: 'var(--surface)', border: '1px solid rgba(124,58,237,0.25)', boxShadow: 'var(--shadow-sm)' }
                                        : { background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                    >
                                      <div className="space-y-2">
                                        {/* Top row */}
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-1.5">
                                            <div className="w-5 h-5 rounded-[7px] flex items-center justify-center"
                                              style={{ background: 'rgba(124,58,237,0.10)', color: 'var(--violet)' }}>
                                              <Bot className="w-3 h-3" />
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Agent</span>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] font-semibold" style={{ color: 'var(--muted)' }}>
                                              {relativeTime(log.timestamp)}
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider"
                                              style={isSafe
                                                ? { background: 'rgba(34,197,94,0.10)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.25)' }
                                                : { background: 'rgba(239,68,68,0.10)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.25)' }}>
                                              {isSafe ? "OK" : "Alert"}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Query */}
                                        <p className={`text-[12px] font-medium leading-relaxed ${!isExpanded ? "line-clamp-2" : ""}`}
                                          style={{ color: 'var(--text)' }}>
                                          {log.query ? `"${log.query}"` : "No query recorded"}
                                        </p>

                                        {/* Metadata */}
                                        <div className="flex items-center gap-2.5">
                                          <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: 'var(--muted)' }}>
                                            <Clock className="w-3 h-3" />
                                            {log.duration ? `${(log.duration / 1000).toFixed(1)}s` : "—"}
                                          </span>
                                          <span className="w-px h-3" style={{ background: 'var(--border)' }} />
                                          <span className="text-[10px] font-semibold" style={{ color: 'var(--muted)' }}>
                                            {log.tokens ? `${log.tokens} tok` : "—"}
                                          </span>
                                          <span className="w-px h-3" style={{ background: 'var(--border)' }} />
                                          <span className="text-[10px] font-semibold truncate" style={{ color: 'var(--muted)' }}>
                                            {log.model || "—"}
                                          </span>
                                        </div>

                                        {/* Copy hover */}
                                        {log.query && (
                                          <button
                                            onClick={(e: React.MouseEvent) => { e.stopPropagation(); navigator.clipboard.writeText(log.query); }}
                                            className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-[8px] opacity-0 group-hover/audit:opacity-100 transition-all cursor-pointer"
                                            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--muted)' }}
                                            aria-label="Copy query"
                                          >
                                            <Copy className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>

                                      {/* Expanded */}
                                      {isExpanded && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: "auto" }}
                                          className="mt-3 pt-3 space-y-3 text-[10px]"
                                          style={{ borderTop: '1px solid var(--border)' }}
                                        >
                                          {/* Tier 1 */}
                                          <div className="space-y-1">
                                            <span className="text-[8px] font-black uppercase tracking-widest block" style={{ color: 'var(--violet)' }}>
                                              Tier 1 · Deterministic
                                            </span>
                                            <div className="px-3 py-2.5 rounded-[10px] space-y-1"
                                              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                                              <p style={{ color: 'var(--text-dim)' }}>Profile: {log.retrievedContext?.profile?.fullName || "—"} ({log.retrievedContext?.profile?.gender || "—"})</p>
                                              <p style={{ color: 'var(--text-dim)' }}>Vitals: {log.retrievedContext?.vitals?.heartRate} BPM · {log.retrievedContext?.vitals?.steps} steps</p>
                                              <p style={{ color: 'var(--text-dim)' }}>Meds: {log.retrievedContext?.medications?.length > 0 ? log.retrievedContext.medications.map((m: any) => m.name).join(", ") : "None"}</p>
                                            </div>
                                          </div>

                                          {/* Tier 2 */}
                                          <div className="space-y-1">
                                            <span className="text-[8px] font-black uppercase tracking-widest block" style={{ color: 'var(--indigo)' }}>
                                              Tier 2 · Semantic
                                            </span>
                                            {log.retrievedContext?.files?.length > 0 ? (
                                              <div className="space-y-1">
                                                {log.retrievedContext.files.map((f: any, fIdx: number) => (
                                                  <div key={fIdx} className="flex items-center justify-between px-3 py-2 rounded-[10px]"
                                                    style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                      <FileText className="w-3 h-3 shrink-0" style={{ color: 'var(--muted)' }} />
                                                      <span className="truncate" style={{ color: 'var(--text-dim)' }}>{f.name}</span>
                                                    </div>
                                                    <span className="font-black shrink-0" style={{ color: 'var(--indigo)' }}>{(f.similarity * 100).toFixed(0)}%</span>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <p className="italic" style={{ color: 'var(--muted)' }}>No documents matched threshold.</p>
                                            )}
                                          </div>

                                          {/* Safety */}
                                          <div className="space-y-1">
                                            <span className="text-[8px] font-black uppercase tracking-widest block" style={{ color: '#dc2626' }}>
                                              Clinical Safety
                                            </span>
                                            <div className="px-3 py-2.5 rounded-[10px]"
                                              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                                              {!isSafe ? (
                                                <div className="space-y-1">
                                                  {log.safetyWarnings.map((warn: string, wIdx: number) => (
                                                    <p key={wIdx} className="flex items-start gap-1.5 leading-relaxed" style={{ color: '#dc2626' }}>
                                                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                                                      {warn}
                                                    </p>
                                                  ))}
                                                </div>
                                              ) : (
                                                <p className="flex items-center gap-1.5" style={{ color: '#16a34a' }}>
                                                  <ShieldCheck className="w-3 h-3 shrink-0" />
                                                  No drug-diet conflicts. Safe dispatch.
                                                </p>
                                              )}
                                            </div>
                                          </div>
                                        </motion.div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
                      <div className="w-12 h-12 rounded-[14px] flex items-center justify-center mb-3"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <Activity className="w-5 h-5" style={{ color: 'var(--muted)' }} />
                      </div>
                      <h4 className="text-[13px] font-black mb-1" style={{ color: 'var(--text)' }}>
                        {searchAuditQuery || auditFilterChip !== "all" ? "No matching logs" : "No activity yet"}
                      </h4>
                      <p className="text-[11px] leading-relaxed max-w-[200px]" style={{ color: 'var(--muted)' }}>
                        {searchAuditQuery || auditFilterChip !== "all"
                          ? "Adjust your search or filters."
                          : "Your AI conversations will appear here."}
                      </p>
                      {(searchAuditQuery || auditFilterChip !== "all") && (
                        <button onClick={() => { setSearchAuditQuery(""); setAuditFilterChip("all"); }}
                          className="mt-4 text-[10px] font-bold transition-colors cursor-pointer"
                          style={{ color: 'var(--violet)' }}>
                          Clear filters
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Diagnostics tab */
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <div className="p-4 rounded-[14px] space-y-3"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <h5 className="text-[11px] font-black uppercase tracking-wide flex items-center gap-2"
                    style={{ color: 'var(--text)' }}>
                    <Cpu className="w-4 h-4" style={{ color: 'var(--violet)' }} />
                    RAG Integrity Diagnostics
                  </h5>
                  <p className="text-[10.5px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                    Verify Tier 1 (deterministic) and Tier 2 (semantic) retrieval before the LLM generation stage.
                  </p>
                  <button
                    type="button"
                    onClick={runDiagnostics}
                    disabled={runningDiagnostics}
                    className="w-full h-10 rounded-[12px] text-white text-[11px] font-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                    style={{ background: 'var(--grad-btn)', boxShadow: '0 4px 14px -4px rgba(124,58,237,0.45)' }}
                  >
                    {runningDiagnostics ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" />Running Diagnostics…</>
                    ) : (
                      <><Play className="w-3.5 h-3.5 fill-current" />Run Diagnostics Suite</>
                    )}
                  </button>
                </div>

                {diagnosticError && (
                  <div className="p-3 rounded-[12px] flex gap-2 items-start"
                    style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)' }}>
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
                    <p className="text-[10.5px] leading-relaxed" style={{ color: '#dc2626' }}>{diagnosticError}</p>
                  </div>
                )}

                {diagnosticResult ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 rounded-[12px]"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: 'var(--text-dim)' }}>
                        Test Suite Status
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
                        style={diagnosticResult.success
                          ? { background: 'rgba(34,197,94,0.10)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.25)' }
                          : { background: 'rgba(239,68,68,0.10)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.25)' }}>
                        {diagnosticResult.success ? "PASS" : "FAIL"}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase tracking-widest block" style={{ color: 'var(--muted)' }}>
                        Verification Pipeline
                      </span>
                      {diagnosticResult.steps?.map((step: any, sIdx: number) => (
                        <div key={sIdx} className="p-3 rounded-[12px] flex gap-3 items-start"
                          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                          <div className="mt-0.5 shrink-0">
                            {step.status === "pass"
                              ? <CheckCircle2 className="w-4 h-4" style={{ color: '#22c55e' }} />
                              : <XCircle className="w-4 h-4" style={{ color: '#ef4444' }} />}
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex justify-between gap-2">
                              <p className="text-[11px] font-bold truncate" style={{ color: 'var(--text)' }}>{step.name}</p>
                              <span className="text-[9px] shrink-0" style={{ fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>{step.durationMs}ms</span>
                            </div>
                            <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{step.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 rounded-[12px] space-y-2"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1" style={{ color: 'var(--violet)' }}>
                        <Layers className="w-3.5 h-3.5" /> Context Payload
                      </span>
                      <div className="pl-1 space-y-2 text-[10px]" style={{ borderLeft: '2px solid var(--border)', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                        <div>
                          <span className="font-bold" style={{ color: 'var(--violet)' }}>[Tier 1 Profile]</span>
                          <p>Name: {diagnosticResult.retrievedContext?.profile?.fullName || "—"}</p>
                          <p>Prefs: {diagnosticResult.retrievedContext?.profile?.dietaryPreferences?.join(", ") || "None"}</p>
                          <p>HR: {diagnosticResult.retrievedContext?.vitals?.heartRate} BPM, Steps: {diagnosticResult.retrievedContext?.vitals?.steps}</p>
                        </div>
                        <div>
                          <span className="font-bold" style={{ color: 'var(--indigo)' }}>[Tier 1 Medications]</span>
                          {diagnosticResult.retrievedContext?.medications?.length > 0
                            ? diagnosticResult.retrievedContext.medications.map((m: any, mIdx: number) => (
                                <p key={mIdx}>{m.name} ({m.strength}) - {m.frequency}</p>
                              ))
                            : <p className="italic" style={{ color: 'var(--muted)' }}>No medications</p>}
                        </div>
                        <div>
                          <span className="font-bold" style={{ color: 'var(--indigo)' }}>[Tier 2 Documents]</span>
                          {diagnosticResult.retrievedContext?.matchedFiles?.length > 0
                            ? diagnosticResult.retrievedContext.matchedFiles.map((f: any, fIdx: number) => (
                                <p key={fIdx}>"{f.name}" ({(f.similarity * 100).toFixed(1)}%)</p>
                              ))
                            : <p className="italic" style={{ color: 'var(--muted)' }}>No matching reports</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  !runningDiagnostics && (
                    <div className="flex flex-col items-center justify-center py-10 text-center rounded-[14px]"
                      style={{ border: '1.5px dashed var(--border)' }}>
                      <CheckSquare className="w-8 h-8 mb-2" style={{ color: 'var(--muted)' }} />
                      <p className="text-[11px] font-semibold" style={{ color: 'var(--muted)' }}>
                        Test suite not yet executed.
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Audit Drawer — same design, bottom sheet on small screens */}
      <AnimatePresence>
        {showAudit && (
          <div className="fixed inset-0 z-50 lg:hidden flex items-end justify-center"
            style={{ background: 'rgba(33,25,53,0.55)', backdropFilter: 'blur(8px)' }}
            id="mobile-audit-modal">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-h-[88vh] flex flex-col overflow-hidden rounded-t-[24px]"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderBottom: 'none' }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--border)' }} />
              </div>

              {/* Header */}
              <div className="px-4 pb-3 pt-1 flex items-center justify-between shrink-0"
                style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-[10px] flex items-center justify-center shrink-0"
                    style={{ background: 'var(--grad-brand)' }}>
                    <Activity className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-black" style={{ fontFamily: 'var(--font-serif)', color: 'var(--text)' }}>
                      Audit Log
                    </h3>
                    <p className="text-[9px]" style={{ color: 'var(--muted)' }}>AI conversations & actions</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAudit(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-[10px] cursor-pointer"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
                  aria-label="Close audit"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                {(["logs", "diagnostics"] as const).map(tab => (
                  <button key={tab}
                    onClick={() => setAuditTab(tab)}
                    className="flex-1 py-2.5 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    style={auditTab === tab
                      ? { color: 'var(--violet)', borderBottom: '2px solid var(--violet)' }
                      : { color: 'var(--muted)', borderBottom: '2px solid transparent' }}>
                    {tab === "logs" ? "Audit Trails" : "Diagnostics"}
                  </button>
                ))}
              </div>

              {auditTab === "logs" ? (
                <>
                  {/* Search */}
                  <div className="px-3 pt-3 pb-2 space-y-2 shrink-0">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--muted)' }} />
                      <input
                        type="text"
                        placeholder="Search logs…"
                        value={searchAuditQuery}
                        onChange={(e) => setSearchAuditQuery(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 rounded-[12px] text-[12px] focus:outline-none"
                        style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)', color: 'var(--text)' }}
                      />
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                      {(["All", "Queries", "AI Responses", "Tool Calls", "Errors"] as const).map(chip => {
                        const chipKey = chip === "All" ? "all" : chip === "Queries" ? "queries" : chip === "AI Responses" ? "responses" : chip === "Tool Calls" ? "tools" : "errors";
                        return (
                          <button key={chip}
                            onClick={() => setAuditFilterChip(chipKey)}
                            className="px-2 py-0.5 rounded-full text-[8px] font-bold whitespace-nowrap cursor-pointer"
                            style={auditFilterChip === chipKey
                              ? { background: 'rgba(124,58,237,0.10)', color: 'var(--violet)', border: '1px solid rgba(124,58,237,0.22)' }
                              : { background: 'var(--surface-2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>
                            {chip}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Logs */}
                  <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
                    {filteredAudits.length > 0 ? (
                      filteredAudits.map((log) => {
                        const isExpanded = expandedLogId === log.id;
                        const isSafe = !log.safetyWarnings || log.safetyWarnings.length === 0;
                        return (
                          <div key={log.id} className="relative pl-4">
                            <div className="absolute left-[5px] top-3 bottom-0 w-px" style={{ background: 'var(--border)' }} />
                            <div className="absolute left-0 top-[11px] w-[11px] h-[11px] rounded-full flex items-center justify-center"
                              style={{ background: 'var(--surface)', border: `2px solid ${isSafe ? '#22c55e' : '#ef4444'}` }}>
                              <div className="w-[3.5px] h-[3.5px] rounded-full" style={{ background: isSafe ? '#22c55e' : '#ef4444' }} />
                            </div>
                            <div
                              className="rounded-[12px] p-3 transition-all cursor-pointer"
                              style={isExpanded
                                ? { background: 'var(--surface)', border: '1px solid rgba(124,58,237,0.25)' }
                                : { background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            >
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-[10px] font-semibold truncate" style={{ color: 'var(--text)' }}>
                                    {log.query ? `"${log.query.substring(0, 30)}…"` : "No query"}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase shrink-0"
                                    style={isSafe
                                      ? { background: 'rgba(34,197,94,0.10)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.25)' }
                                      : { background: 'rgba(239,68,68,0.10)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.25)' }}>
                                    {isSafe ? "OK" : "Alert"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[9px]" style={{ color: 'var(--muted)' }}>
                                  <span>{log.model || "—"}</span>
                                  <span className="w-px h-2.5" style={{ background: 'var(--border)' }} />
                                  <span>{log.duration ? `${(log.duration / 1000).toFixed(1)}s` : "—"}</span>
                                  <span className="w-px h-2.5" style={{ background: 'var(--border)' }} />
                                  <span>{log.tokens ? `${log.tokens} tok` : "—"}</span>
                                </div>
                              </div>
                              {isExpanded && (
                                <div className="mt-2.5 pt-2.5 space-y-2 text-[9px]" style={{ borderTop: '1px solid var(--border)' }}>
                                  <div>
                                    <span className="text-[7px] font-black uppercase tracking-widest block mb-1" style={{ color: 'var(--violet)' }}>T1 Profile</span>
                                    <p style={{ color: 'var(--text-dim)' }}>{log.retrievedContext?.profile?.fullName || "—"} · HR {log.retrievedContext?.vitals?.heartRate} · Meds: {log.retrievedContext?.medications?.length || 0}</p>
                                  </div>
                                  <div>
                                    <span className="text-[7px] font-black uppercase tracking-widest block mb-1" style={{ color: 'var(--indigo)' }}>T2 Files</span>
                                    {log.retrievedContext?.files?.length > 0
                                      ? log.retrievedContext.files.map((f: any, idx: number) => (
                                          <p key={idx} style={{ color: 'var(--text-dim)' }}>• {f.name} ({(f.similarity * 100).toFixed(0)}%)</p>
                                        ))
                                      : <p style={{ color: 'var(--muted)' }}>None matched</p>}
                                  </div>
                                  <div>
                                    <span className="text-[7px] font-black uppercase tracking-widest block mb-1" style={{ color: '#dc2626' }}>Safety</span>
                                    {!isSafe
                                      ? <p style={{ color: '#dc2626' }}>{log.safetyWarnings[0]}</p>
                                      : <p style={{ color: '#16a34a' }}>✓ All rules passed</p>}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                        <Activity className="w-8 h-8 mb-2" style={{ color: 'var(--muted)' }} />
                        <p className="text-[11px] font-black mb-1" style={{ color: 'var(--text)' }}>
                          {searchAuditQuery || auditFilterChip !== "all" ? "No matching logs" : "No activity yet"}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
                          {searchAuditQuery || auditFilterChip !== "all" ? "Try adjusting your search." : "AI conversations appear here."}
                        </p>
                        {(searchAuditQuery || auditFilterChip !== "all") && (
                          <button onClick={() => { setSearchAuditQuery(""); setAuditFilterChip("all"); }}
                            className="mt-3 text-[9px] font-bold cursor-pointer" style={{ color: 'var(--violet)' }}>
                            Clear filters
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Mobile Diagnostics */
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  <div className="p-3 rounded-[12px] space-y-2"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <h5 className="text-[10px] font-black uppercase flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
                      <Cpu className="w-3 h-3" style={{ color: 'var(--violet)' }} /> Diagnostics
                    </h5>
                    <p className="text-[9px] leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                      Verify Tier 1 and Tier 2 retrieval before LLM generation.
                    </p>
                    <button type="button" onClick={runDiagnostics} disabled={runningDiagnostics}
                      className="w-full h-9 rounded-[10px] text-white text-[9px] font-black flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
                      style={{ background: 'var(--grad-btn)' }}>
                      {runningDiagnostics
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Running…</>
                        : <><Play className="w-3 h-3 fill-current" /> Run Suite</>}
                    </button>
                  </div>
                  {diagnosticError && (
                    <div className="p-2.5 rounded-[10px] flex gap-2 items-start"
                      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.22)' }}>
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" style={{ color: '#dc2626' }} />
                      <p className="text-[9px]" style={{ color: '#dc2626' }}>{diagnosticError}</p>
                    </div>
                  )}
                  {diagnosticResult && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2.5 rounded-[10px]"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <span className="text-[9px] font-black uppercase" style={{ color: 'var(--text-dim)' }}>Status</span>
                        <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase"
                          style={diagnosticResult.success
                            ? { background: 'rgba(34,197,94,0.10)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.25)' }
                            : { background: 'rgba(239,68,68,0.10)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.25)' }}>
                          {diagnosticResult.success ? "Pass" : "Fail"}
                        </span>
                      </div>
                      {diagnosticResult.steps?.map((step: any, sIdx: number) => (
                        <div key={sIdx} className="p-2.5 rounded-[10px] flex gap-2 items-start"
                          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                          {step.status === "pass"
                            ? <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" style={{ color: '#22c55e' }} />
                            : <XCircle className="w-3 h-3 shrink-0 mt-0.5" style={{ color: '#ef4444' }} />}
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold" style={{ color: 'var(--text)' }}>{step.name}</p>
                            <p className="text-[8px]" style={{ color: 'var(--text-dim)' }}>{step.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
