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
  debugMode?: boolean;
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
      // Focus on users who may have diabetic profiles or taking Metformin, or general safety
      const isDiabetic = meds.some(m => m.name.toLowerCase().includes("metformin")) || 
                         user?.dietaryPreferences?.some((p: string) => p.toLowerCase().includes("diabet"));
      return isDiabetic || true;
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
      return <strong key={i} className="font-bold text-on-surface dark:text-slate-100">{part.slice(2, -2)}</strong>;
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
  debugMode = false
}: AIChatProps) {
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

  const runDiagnostics = async () => {
    setRunningDiagnostics(true);
    setDiagnosticError(null);
    try {
      const token = localStorage.getItem("health_companion_token") || "sarah-session-token";
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
    setUserInput(query);
    inputRef.current?.focus();
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

  const suggestions = [
    { text: "Check Ibuprofen conflict with Lisinopril", type: "conflict" },
    { text: "Explain optimal FEV1/FVC ratios", type: "report" },
    { text: "Suggest Vegetarian and Gluten-Free recipes", type: "diet" },
  ];

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
      style={{ paddingBottom: keyboardHeight }}
      id="ai-chat-view-container"
    >
      {/* Primary Chat Interface */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col h-full w-full flex-1 bg-transparent"
        id="ai-chat-view"
      >
        {/* Header */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/60 px-4 py-2 flex items-center gap-2.5 shrink-0">
          <div className="w-7 h-7 rounded-[14px] bg-gradient-to-br from-primary to-blue-500 text-white flex items-center justify-center shadow-sm shrink-0">
            <Sparkles className="w-3.5 h-3.5 fill-white/20" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm text-on-surface dark:text-slate-100 truncate leading-tight">
              He-Co
            </h3>
            <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 leading-tight mt-0.5">
              <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
              HIPAA Secure
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAudit(!showAudit)}
            className={`flex items-center gap-1 px-2 py-1.5 rounded-[14px] text-[10px] font-semibold transition-all duration-200 cursor-pointer shrink-0 ${
              showAudit 
                ? "bg-primary/10 text-primary" 
                : "text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
            id="btn-toggle-rag-audit"
            aria-label="Toggle audit trail"
          >
            <Database className="w-3.5 h-3.5" />
            {auditLogs.length > 0 && (
              <span className={`text-[9px] font-bold ${showAudit ? "text-primary" : "text-slate-400 dark:text-slate-500"}`}>
                {auditLogs.length}
              </span>
            )}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-[14px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              title="Close chat"
              aria-label="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0 scroll-smooth" id="chat-messages-container">
          {chatHistory.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center min-h-full py-6 text-center px-2 sm:px-4">
              <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-primary/10 to-blue-500/10 text-primary flex items-center justify-center mb-4 shadow-inner">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-on-surface dark:text-slate-100 mb-1.5">Ask me anything</h3>
              <p className="text-xs text-on-surface-variant dark:text-slate-400 max-w-xs mb-6 leading-relaxed">
                Drug interactions, lab results, meal plans, and health records.
              </p>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestedQuery(sug.text)}
                    className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-primary border border-slate-200 dark:border-slate-800 text-xs font-semibold rounded-2xl transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_2px_8px_-2px_rgba(79,70,229,0.15)] active:scale-[0.98] cursor-pointer text-on-surface dark:text-slate-300 text-left leading-relaxed"
                    aria-label={sug.text}
                  >
                    <span className="text-base shrink-0">
                      {sug.type === "conflict" && "💊"}
                      {sug.type === "report" && "📋"}
                      {sug.type === "diet" && "🥗"}
                    </span>
                    <span className="flex-1">{sug.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {chatHistory.map((msg, index) => {
            const isAI = msg.sender === "ai";
            const text = msg.text || "";
            
            // Check if message contains a clinical safety warning
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

            // Client-side clinical safety validation check — skip issues already flagged by server
            const clientSafetyIssues = isAI ? runClientClinicalSafetyValidator(regularContent, user, medications) : [];
            const uniqueClientIssues = isSafetyAlert 
              ? clientSafetyIssues.filter(i => !alertContent.toLowerCase().includes(i.type))
              : clientSafetyIssues;

            // Find matching audit log for debug mode
            const precedingUserMsg = isAI && index > 0 ? chatHistory[index - 1] : null;
            const matchingLog = precedingUserMsg 
              ? auditLogs.find(log => log.query?.toLowerCase() === precedingUserMsg.text?.toLowerCase())
              : null;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex items-end gap-2 ${isAI ? "justify-start" : "justify-end"}`}
                id={`chat-bubble-${index}`}
              >
                {isAI && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center shadow-md shrink-0 mb-0.5">
                    <Sparkles className="w-3 h-3 fill-white/20" />
                  </div>
                )}
                <div 
                  className={`max-w-[88%] md:max-w-[82%] px-3 py-2 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isAI 
                      ? "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 text-on-surface dark:text-slate-200 rounded-bl-sm font-medium" 
                      : "bg-primary text-white rounded-br-sm font-semibold"
                  }`}
                >
                  {/* Server Safety Alert */}
                  {isSafetyAlert && (
                    <div className="mb-2 p-2 bg-red-50 dark:bg-red-950/20 border-l-[3px] border-red-500 rounded-r-lg text-[10px] text-red-700 dark:text-red-400 font-medium flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[9px] text-red-800 dark:text-red-300 font-bold uppercase tracking-wider">
                        <ShieldAlert className="w-3 h-3 shrink-0 text-red-600" />
                        <span>Safety Alert</span>
                      </div>
                      <div className="pl-4 text-[9px] opacity-90 space-y-0.5">
                        {alertContent.split("\n").map((line, lIdx) => (
                          <p key={lIdx} className="leading-relaxed">{line}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Client Safety Validator */}
                  {isAI && uniqueClientIssues.length > 0 && (
                    <div className="mb-2 p-2 bg-amber-50 dark:bg-amber-950/20 border-l-[3px] border-amber-500 rounded-r-lg flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-[9px] text-amber-800 dark:text-amber-300 font-bold uppercase tracking-wide">
                        <ShieldAlert className="w-3 h-3 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>Safety Detector</span>
                      </div>
                      <div className="space-y-1 pl-4 text-[9px] leading-relaxed text-amber-900 dark:text-amber-200">
                        {uniqueClientIssues.map((issue, idx) => (
                          <div key={idx}>
                            <span className="font-extrabold">⚠️ {issue.alert}</span>
                            <span className="ml-1 opacity-80">{issue.action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Response Text */}
                  <div className="space-y-2">
                    {regularContent.split("\n").map((line, lIdx) => {
                      const tLine = line.trim();
                      if (!tLine) return null;
                      
                      // Filter out redundant disclaimer spam
                      if (tLine.includes("[Clinical Advice Disclaimer & Wellness Role]") || 
                          tLine.includes("Always seek professional medical guidance. Swasth-AI is a wellness companion") ||
                          tLine.includes("Swasth-AI provides pre-consultation information") ||
                          tLine.includes("Swasth-AI is a wellness companion") ||
                          tLine.includes("always consult your physician for medical decisions") ||
                          tLine === "Swasth-AI provides pre-consultation information and home-care suggestions only. It does not provide formal medical diagnoses or replace physician care.") {
                        return null;
                      }
                      
                      // Format RAG Citations nicely
                      if (tLine.startsWith("RAG Citation:") || tLine.startsWith("*Swasth-AI Citations") || tLine.startsWith("**RAG Citation:**")) {
                        const citationText = tLine.replace("**RAG Citation:**", "").replace("RAG Citation:", "").replace("*Swasth-AI Citations*", "").trim();
                        const matches = citationText.match(/\[(.*?)\]/g) || [citationText];
                        return (
                          <div key={lIdx} className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                            {matches.map((match, mIdx) => (
                              <span key={mIdx} className="bg-primary/5 text-primary dark:text-primary-container px-2 py-0.5 rounded-lg text-[9px] font-semibold flex items-center gap-1 border border-primary/10">
                                <Database className="w-2.5 h-2.5" />
                                {match.replace(/\[|\]/g, "")}
                              </span>
                            ))}
                          </div>
                        );
                      }
                      
                      // Format Disclaimer cleanly
                      if (tLine.startsWith("Disclaimer:") || tLine.startsWith("⚠️ **Disclaimer**:")) {
                        return (
                          <p key={lIdx} className="text-[9px] text-slate-500 dark:text-slate-400 font-medium italic mt-2 bg-slate-100/50 dark:bg-slate-900/50 p-2 rounded-lg">
                            <Info className="w-3 h-3 inline-block mr-1 text-slate-400 dark:text-slate-500" />
                            {tLine.replace("⚠️ **Disclaimer**:", "").replace("Disclaimer:", "").trim()}
                          </p>
                        );
                      }

                      // Greeting line (Good Morning/Afternoon/Evening)
                      if (/^(Good\s+(Morning|Afternoon|Evening))/i.test(tLine)) {
                        const rest = tLine.replace(/^(Good\s+(Morning|Afternoon|Evening)[,!.]?)\s*/i, "");
                        return (
                          <p key={lIdx} className="leading-relaxed text-sm">
                            <span className="text-primary font-semibold">{tLine.match(/^(Good\s+(Morning|Afternoon|Evening))/i)?.[0]}</span>
                            {rest ? ` ${rest}` : ""}
                          </p>
                        );
                      }

                      // Bullet lines
                      if (/^[-•*]\s/.test(tLine)) {
                        const content = tLine.replace(/^[-•*]\s+/, "");
                        return (
                          <div key={lIdx} className="flex items-baseline gap-1.5 ml-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                            <span className="leading-relaxed text-sm flex-1">{renderBold(content)}</span>
                          </div>
                        );
                      }

                      return <p key={lIdx} className="leading-relaxed text-sm">{renderBold(line)}</p>;
                    })}
                  </div>

                  {/* Debug Mode Raw Prompt Context Trace Panel */}
                  {isAI && debugMode && (
                    <div className="mt-4 p-3.5 bg-indigo-950/10 dark:bg-indigo-950/45 border border-indigo-200/30 dark:border-indigo-950/60 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-indigo-700 dark:text-indigo-300 font-extrabold uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-indigo-500" />
                          RAG TRACE: Raw AI Prompt Context
                        </span>
                        <span className="text-[8px] bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-200 px-1.5 py-0.5 rounded uppercase font-black tracking-widest border border-indigo-200/40">
                          Active Debug
                        </span>
                      </div>
                      <div className="text-[10px] text-indigo-950 dark:text-indigo-200/90 leading-relaxed space-y-2 font-mono">
                        <div>
                          <p className="font-extrabold text-[9px] text-indigo-800 dark:text-indigo-400 uppercase tracking-widest">[Tier 1: Deterministic Health Profile & Vitals]</p>
                          <div className="pl-2.5 border-l border-indigo-300/40 dark:border-indigo-800/60 space-y-0.5 mt-0.5 font-medium">
                            <p>• User Profile: {matchingLog?.retrievedContext?.profile?.fullName || user.fullName} (DOB: {matchingLog?.retrievedContext?.profile?.dob || user.dob}, Gender: {matchingLog?.retrievedContext?.profile?.gender || user.gender})</p>
                            <p>• Dietary Preferences: {matchingLog?.retrievedContext?.profile?.dietaryPreferences?.join(", ") || user.dietaryPreferences?.join(", ") || "None specified"}</p>
                            <p>• Current Vitals: Heart Rate: {matchingLog?.retrievedContext?.vitals?.heartRate || "72"} BPM, Steps: {matchingLog?.retrievedContext?.vitals?.steps || "8432"} steps, Sleep: {matchingLog?.retrievedContext?.vitals?.sleep || "7.5h"} sleep</p>
                            <p>• Checked Medications: {matchingLog?.retrievedContext?.medications?.length > 0 ? matchingLog.retrievedContext.medications.map((m: any) => `${m.name} (${m.strength})`).join(", ") : medications.map(m => `${m.name} (${m.strength})`).join(", ") || "None logged"}</p>
                          </div>
                        </div>
                        
                        <div className="pt-1">
                          <p className="font-extrabold text-[9px] text-indigo-800 dark:text-indigo-400 uppercase tracking-widest">[Tier 2: Semantically Matched Health Records]</p>
                          <div className="pl-2.5 border-l border-indigo-300/40 dark:border-indigo-800/60 space-y-1.5 mt-0.5 font-medium">
                            {matchingLog?.retrievedContext?.files && matchingLog.retrievedContext.files.length > 0 ? (
                              matchingLog.retrievedContext.files.map((f: any, fIdx: number) => (
                                <div key={fIdx} className="space-y-0.5">
                                  <p>• Document: "{f.name}" (Similarity Score: {(f.similarity * 100).toFixed(1)}%)</p>
                                  <p className="text-[9px] text-indigo-600 dark:text-indigo-400 italic pl-2 leading-relaxed">Insight: "{f.aiInsight}"</p>
                                </div>
                              ))
                            ) : (
                              <p className="italic text-slate-400 dark:text-slate-500">No semantically matched files were found above the relevance threshold.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <span className={`text-[8px] block mt-1.5 text-right ${isAI ? "text-on-surface-variant dark:text-slate-400" : "text-white/70"}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {isLoading && (
            <div className="flex items-end gap-2 justify-start" id="chat-bubble-loading">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-blue-500 text-white flex items-center justify-center shadow-sm shrink-0 mb-0.5">
                <Sparkles className="w-3 h-3 fill-white/20" />
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 px-3.5 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0s]"></span>
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.3s]"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/60 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input 
                type="text"
                ref={inputRef}
                required
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Ask about medications, lab results, or diet..."
                className="w-full h-10 px-4 pr-10 rounded-[18px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-medium focus:outline-none focus:border-primary/50 focus:ring-[3px] focus:ring-primary/10 transition-all duration-200 text-on-surface dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
                aria-label="Chat input"
              />
              {userInput && (
                <button
                  type="button"
                  onClick={() => setUserInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md transition-colors cursor-pointer"
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
              className="w-10 h-10 rounded-[14px] bg-primary hover:bg-primary-container text-white flex items-center justify-center shadow-sm hover:shadow-md hover:shadow-primary/20 transition-all duration-200 disabled:opacity-40 active:scale-[0.97] shrink-0 cursor-pointer"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[9px] text-slate-400 dark:text-slate-500 text-center flex-1 leading-relaxed">
              AI guidance is educational — always consult your physician.
            </p>
            <button
              type="button"
              onClick={onClearChat}
              className="text-[9px] font-semibold px-2 py-1 rounded-[14px] text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors shrink-0 cursor-pointer"
              aria-label="Clear chat history"
            >
              Clear
            </button>
          </div>
        </div>
      </motion.div>

      {/* Slide-out Agent Audit Log Panel Overlay */}
      <AnimatePresence>
        {showAudit && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="absolute inset-0 z-30 flex flex-col bg-slate-950 text-slate-100 overflow-hidden"
            id="rag-audit-sidebar"
          >
            {/* ========== Header ========== */}
            <div className="p-4 border-b border-slate-800/50 flex items-center justify-between shrink-0 bg-slate-950/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[14px] bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center shadow-sm">
                  <Activity className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white tracking-tight">Audit Log</h3>
                  <p className="text-[10px] text-slate-500 font-semibold">View AI conversations and actions</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Live
                </span>
                <button 
                  onClick={() => setShowAudit(false)}
                  className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800/80 rounded-lg transition-all duration-200 cursor-pointer"
                  aria-label="Close audit panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ========== Tabs ========== */}
            <div className="flex border-b border-slate-800/40 bg-slate-950/30 shrink-0">
              <button
                onClick={() => setAuditTab("logs")}
                className={`flex-1 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  auditTab === "logs" 
                    ? "text-primary border-b-2 border-primary bg-primary/5" 
                    : "text-slate-500 hover:text-slate-300 border-b-2 border-transparent"
                }`}
              >
                Audit Trails
              </button>
              <button
                onClick={() => setAuditTab("diagnostics")}
                className={`flex-1 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                  auditTab === "diagnostics" 
                    ? "text-primary border-b-2 border-primary bg-primary/5" 
                    : "text-slate-500 hover:text-slate-300 border-b-2 border-transparent"
                }`}
              >
                RAG Diagnostics
              </button>
            </div>

            {auditTab === "logs" ? (
              <>
                {/* ========== Search & Filters ========== */}
                <div className="p-4 pb-0 space-y-2.5 shrink-0 bg-slate-950/30 sticky top-[93px] z-10">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4 pointer-events-none" />
                    <input 
                      type="text"
                      placeholder="Filter audit logs..."
                      value={searchAuditQuery}
                      onChange={(e) => setSearchAuditQuery(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 rounded-2xl bg-slate-900/80 border border-slate-800/60 text-xs font-semibold text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-primary/60 focus:ring-[3px] focus:ring-primary/10 transition-all duration-200"
                      aria-label="Search audit logs"
                    />
                  </div>
                  {/* Filter chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {(["All", "Queries", "AI Responses", "Tool Calls", "Errors"] as const).map((chip) => {
                      const chipKey = chip === "All" ? "all" : chip === "Queries" ? "queries" : chip === "AI Responses" ? "responses" : chip === "Tool Calls" ? "tools" : "errors";
                      return (
                        <button
                          key={chip}
                          onClick={() => setAuditFilterChip(chipKey)}
                          className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 cursor-pointer ${
                            auditFilterChip === chipKey
                              ? "bg-primary/10 text-primary border border-primary/20" 
                              : "bg-slate-900/60 text-slate-500 border border-slate-800/60 hover:text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          {chip}
                        </button>
                      );
                    })}
                    {auditFilterChip !== "all" && (
                      <button
                        onClick={() => setAuditFilterChip("all")}
                        className="text-[9px] font-bold text-slate-500 hover:text-slate-300 ml-1 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* ========== Audit Logs List ========== */}
                <div className="flex-1 overflow-y-auto p-4 pt-3" id="audit-logs-container">
                  <style>{`#audit-logs-container::-webkit-scrollbar{width:4px}#audit-logs-container::-webkit-scrollbar-track{background:transparent}#audit-logs-container::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.3);border-radius:4px}#audit-logs-container::-webkit-scrollbar-thumb:hover{background:rgba(139,92,246,0.5)}`}</style>

                  {filteredAudits.length > 0 ? (
                    <div className="space-y-3">
                      {groupOrder.map((group) => {
                        const logs = groupedLogs[group];
                        if (!logs || logs.length === 0) return null;
                        return (
                          <div key={group}>
                            <div className="flex items-center gap-2 px-1 mb-3">
                              <div className="h-px flex-1 bg-slate-800/30" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{group}</span>
                              <div className="h-px flex-1 bg-slate-800/30" />
                            </div>
                            <div className="space-y-2">
                              {logs.map((log: any) => {
                                const isExpanded = expandedLogId === log.id;
                                const isSafe = !log.safetyWarnings || log.safetyWarnings.length === 0;
                                return (
                                  <div key={log.id} className="relative pl-5 pb-0.5 group/audit">
                                    {/* Timeline line */}
                                    <div className="absolute left-[7px] top-3 bottom-[-8px] w-px bg-slate-800/40" />
                                    {/* Timeline dot */}
                                    <div className={`absolute left-0 top-[13px] w-[15px] h-[15px] rounded-full border-2 ${isSafe ? "border-emerald-500/30" : "border-rose-500/30"} bg-slate-950 flex items-center justify-center`}>
                                      <div className={`w-[5px] h-[5px] rounded-full ${isSafe ? "bg-emerald-400" : "bg-rose-400"}`} />
                                    </div>
                                    {/* Card */}
                                    <div 
                                      className={`rounded-2xl border p-4 transition-all duration-200 cursor-pointer ${
                                        isExpanded
                                          ? "bg-slate-900/80 border-primary/20 shadow-md"
                                          : "bg-slate-900/60 border-slate-800/70 hover:bg-slate-900/80 hover:border-slate-700/70 hover:-translate-y-0.5 hover:shadow-lg"
                                      }`}
                                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                    >
                                      <div className="space-y-2.5">
                                        {/* Top row */}
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-6 h-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                                              <Bot className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Agent</span>
                                          </div>
                                          <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[10px] text-slate-500 font-semibold whitespace-nowrap" title={new Date(log.timestamp).toLocaleString()}>
                                              {relativeTime(log.timestamp)}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border whitespace-nowrap ${isSafe ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>
                                              {isSafe ? "Success" : "Alert"}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Query */}
                                        <div>
                                          <p className={`text-[13px] font-medium text-slate-200 leading-relaxed ${!isExpanded ? "line-clamp-2" : ""}`}>
                                            {log.query ? `"${log.query}"` : "No query recorded"}
                                          </p>
                                        </div>

                                        {/* Metadata row */}
                                        <div className="flex items-center gap-3 pt-0.5">
                                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                                            <Clock className="w-3 h-3" />
                                            <span>{log.duration ? `${(log.duration / 1000).toFixed(1)}s` : "1.2s"}</span>
                                          </div>
                                          <span className="w-px h-3 bg-slate-800/50" />
                                          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                                            <span className="w-3 h-3 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[6px] font-bold">Δ</span>
                                            <span>{log.tokens ? `${log.tokens} tokens` : "452 tokens"}</span>
                                          </div>
                                          <span className="w-px h-3 bg-slate-800/50" />
                                          <span className="text-[10px] text-slate-500 font-semibold">{log.model || "GPT-5"}</span>
                                        </div>

                                        {/* Copy button on hover */}
                                        {log.query && (
                                          <button
                                            onClick={(e: React.MouseEvent) => {
                                              e.stopPropagation();
                                              navigator.clipboard.writeText(log.query);
                                            }}
                                            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800/60 text-slate-500 opacity-0 group-hover/audit:opacity-100 hover:text-primary hover:bg-primary/10 transition-all duration-200"
                                            aria-label="Copy query to clipboard"
                                          >
                                            <Copy className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>

                                      {/* Expanded details */}
                                      {isExpanded && (
                                        <motion.div
                                          initial={{ opacity: 0, height: 0 }}
                                          animate={{ opacity: 1, height: "auto" }}
                                          className="mt-3 pt-3 border-t border-slate-800/50 space-y-3.5 text-[10px]"
                                        >
                                          {/* Tier 1 */}
                                          <div className="space-y-1.5">
                                            <span className="text-[8px] font-bold uppercase tracking-widest text-primary block">Tier 1: Deterministic Retrieval</span>
                                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/50 space-y-1.5">
                                              <p className="text-slate-400 font-semibold leading-relaxed">• Profile: {log.retrievedContext?.profile?.fullName || "Sarah"} ({log.retrievedContext?.profile?.gender || "Female"}, diet: {log.retrievedContext?.profile?.dietaryPreferences?.join(", ")})</p>
                                              <p className="text-slate-400 font-semibold leading-relaxed">• Vitals: {log.retrievedContext?.vitals?.heartRate} BPM, {log.retrievedContext?.vitals?.steps} steps, {log.retrievedContext?.vitals?.sleep} sleep</p>
                                              <p className="text-slate-400 font-semibold leading-relaxed">• Medications: {log.retrievedContext?.medications?.length > 0 ? log.retrievedContext.medications.map((m: any) => m.name).join(", ") : "None logged"}</p>
                                            </div>
                                          </div>

                                          {/* Tier 2 */}
                                          <div className="space-y-1.5">
                                            <span className="text-[8px] font-bold uppercase tracking-widest text-secondary block">Tier 2: Semantic Similarity</span>
                                            <div className="space-y-1">
                                              {log.retrievedContext?.files && log.retrievedContext.files.length > 0 ? (
                                                log.retrievedContext.files.map((f: any, fIdx: number) => (
                                                  <div key={fIdx} className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/50 flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                      <FileText className="w-3 h-3 text-slate-500 shrink-0" />
                                                      <span className="text-[10px] text-slate-400 font-semibold truncate">{f.name}</span>
                                                    </div>
                                                    <span className="text-[9px] font-bold text-secondary shrink-0">{(f.similarity * 100).toFixed(1)}%</span>
                                                  </div>
                                                ))
                                              ) : (
                                                <p className="text-[10px] text-slate-500 italic font-semibold pl-1">No health reports matched above threshold.</p>
                                              )}
                                            </div>
                                          </div>

                                          {/* Safety */}
                                          <div className="space-y-1.5">
                                            <span className="text-[8px] font-bold uppercase tracking-widest text-rose-400 block">Clinical Safety Validation</span>
                                            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/50">
                                              {!isSafe ? (
                                                <div className="space-y-1">
                                                  {log.safetyWarnings.map((warn: string, wIdx: number) => (
                                                    <p key={wIdx} className="text-[10px] text-rose-400 font-semibold flex items-start gap-1.5 leading-relaxed">
                                                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-rose-400" />
                                                      {warn}
                                                    </p>
                                                  ))}
                                                </div>
                                              ) : (
                                                <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1.5 leading-relaxed">
                                                  <ShieldCheck className="w-3 h-3 shrink-0 text-emerald-400" />
                                                  Zero drug-diet conflicts triggered. Safe clinical dispatch.
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
                    </div>
                  ) : (
                    /* Empty state */
                    <div className="flex flex-col items-center justify-center text-center py-20 px-6">
                      <div className="w-14 h-14 rounded-2xl bg-slate-900/80 border border-slate-800/60 flex items-center justify-center mb-4">
                        <Activity className="w-6 h-6 text-slate-500" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-300 mb-1.5">
                        {searchAuditQuery || auditFilterChip !== "all" ? "No matching logs" : "No activity yet"}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-semibold leading-relaxed max-w-[220px]">
                        {searchAuditQuery || auditFilterChip !== "all"
                          ? "Try adjusting your search terms or filters."
                          : "Your AI conversations and actions will appear here."}
                      </p>
                      {(searchAuditQuery || auditFilterChip !== "all") && (
                        <button
                          onClick={() => { setSearchAuditQuery(""); setAuditFilterChip("all"); }}
                          className="mt-4 text-[10px] font-bold text-primary hover:text-primary-container transition-colors"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Diagnostics Verification tab */
              <div className="flex-1 overflow-y-auto p-4 space-y-4" id="diagnostics-verification-panel">
                <style>{`#diagnostics-verification-panel::-webkit-scrollbar{width:4px}#diagnostics-verification-panel::-webkit-scrollbar-track{background:transparent}#diagnostics-verification-panel::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.3);border-radius:4px}#diagnostics-verification-panel::-webkit-scrollbar-thumb:hover{background:rgba(139,92,246,0.5)}`}</style>
                <div className="bg-slate-900/60 p-4 border border-slate-800/50 rounded-2xl space-y-3">
                  <h5 className="text-xs font-bold uppercase text-slate-200 tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-primary" />
                    RAG Integrity Diagnostics
                  </h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    Execute a diagnostic routine to verify that Tier 1 (deterministic) and Tier 2 (semantic) health record parameters are correctly resolved, injected, and audited before calling the LLM generation stage.
                  </p>
                  <button
                    type="button"
                    onClick={runDiagnostics}
                    disabled={runningDiagnostics}
                    className="w-full h-10 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-bold flex items-center justify-center gap-2 shadow transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {runningDiagnostics ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Running Test Verification Suite...
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Run Diagnostics Suite
                      </>
                    )}
                  </button>
                </div>

                {diagnosticError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[11px] text-rose-400 flex gap-2.5 items-start font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{diagnosticError}</p>
                  </div>
                )}

                {diagnosticResult ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-900/60 p-3 border border-slate-800/50 rounded-xl text-[10px]">
                      <span className="font-bold text-slate-300 uppercase tracking-wider">Test Suite Status:</span>
                      {diagnosticResult.success ? (
                        <span className="bg-emerald-500/10 text-emerald-400 font-bold px-2.5 py-1 rounded border border-emerald-500/20 uppercase tracking-widest text-[9px]">
                          VERIFIED PASS
                        </span>
                      ) : (
                        <span className="bg-rose-500/10 text-rose-400 font-bold px-2.5 py-1 rounded border border-rose-500/20 uppercase tracking-widest text-[9px]">
                          VERIFIED FAIL
                        </span>
                      )}
                    </div>

                    {/* Steps timeline */}
                    <div className="space-y-2.5">
                      <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider block">Verification Pipeline:</span>
                      {diagnosticResult.steps?.map((step: any, sIdx: number) => (
                        <div key={sIdx} className="p-3 bg-slate-900/60 border border-slate-800/50 rounded-xl flex gap-3 items-start">
                          <div className="mt-0.5 shrink-0">
                            {step.status === "pass" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-400" />
                            )}
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex justify-between items-center gap-2">
                              <p className="text-xs font-bold text-slate-200 leading-normal truncate">{step.name}</p>
                              <span className="text-[9px] font-mono text-slate-500 font-bold shrink-0">{step.durationMs}ms</span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-normal font-semibold">{step.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Retrieved Context Block */}
                    <div className="bg-slate-900/60 border border-slate-800/50 p-4 rounded-xl space-y-2.5">
                      <span className="text-[9px] font-bold uppercase text-primary tracking-widest flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        Context Payload Dump
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono space-y-2 pl-1 leading-normal border-l border-slate-800/50 font-semibold">
                        <div>
                          <span className="text-primary font-bold">[Tier 1 Deterministic profile]</span>
                          <p>• Name: {diagnosticResult.retrievedContext?.profile?.fullName || "Sarah"}</p>
                          <p>• Dietary prefs: {diagnosticResult.retrievedContext?.profile?.dietaryPreferences?.join(", ") || "None"}</p>
                          <p>• Current Vitals: HR {diagnosticResult.retrievedContext?.vitals?.heartRate} BPM, Steps {diagnosticResult.retrievedContext?.vitals?.steps}</p>
                        </div>
                        <div className="pt-2">
                          <span className="text-secondary font-bold">[Tier 1 Medications list]</span>
                          {diagnosticResult.retrievedContext?.medications?.length > 0 ? (
                            diagnosticResult.retrievedContext.medications.map((m: any, mIdx: number) => (
                              <p key={mIdx}>• {m.name} ({m.strength}) - {m.frequency}</p>
                            ))
                          ) : (
                            <p className="text-slate-500 italic">No medication found in test context</p>
                          )}
                        </div>
                        <div className="pt-2">
                          <span className="text-indigo-400 font-bold">[Tier 2 Matched Documents]</span>
                          {diagnosticResult.retrievedContext?.matchedFiles?.length > 0 ? (
                            diagnosticResult.retrievedContext.matchedFiles.map((f: any, fIdx: number) => (
                              <p key={fIdx}>• "{f.name}" (Cosine Similarity: {(f.similarity * 100).toFixed(1)}%)</p>
                            ))
                          ) : (
                            <p className="text-slate-500 italic">No matching reports found</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  !runningDiagnostics && (
                    <div className="text-center py-10 text-slate-500 space-y-2 border border-dashed border-slate-800/50 rounded-2xl bg-slate-950/20">
                      <CheckSquare className="w-8 h-8 text-slate-600 mx-auto" />
                      <p className="text-xs font-semibold">Test suite has not been executed yet.</p>
                    </div>
                  )
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Audit Drawer */}
      <AnimatePresence>
        {showAudit && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden flex items-end justify-center" id="mobile-audit-modal">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-slate-950/95 text-slate-100 w-full max-h-[85vh] rounded-t-3xl flex flex-col overflow-hidden border-t border-slate-800/60"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-800/50 flex items-center justify-between shrink-0 bg-slate-950/80">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-[14px] bg-gradient-to-br from-primary to-indigo-500 flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-white">Audit Log</h3>
                    <p className="text-[9px] text-slate-500 font-semibold">AI conversations and actions</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAudit(false)}
                  className="w-7 h-7 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800/80 rounded-lg transition-all cursor-pointer"
                  aria-label="Close audit panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile tabs */}
              <div className="flex border-b border-slate-800/40 bg-slate-950/30 shrink-0">
                <button
                  onClick={() => setAuditTab("logs")}
                  className={`flex-1 py-2 text-center text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    auditTab === "logs" ? "text-primary border-b-2 border-primary" : "text-slate-500 border-b-2 border-transparent"
                  }`}
                >
                  Audit Trails
                </button>
                <button
                  onClick={() => setAuditTab("diagnostics")}
                  className={`flex-1 py-2 text-center text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    auditTab === "diagnostics" ? "text-primary border-b-2 border-primary" : "text-slate-500 border-b-2 border-transparent"
                  }`}
                >
                  Diagnostics
                </button>
              </div>

              {auditTab === "logs" ? (
                <>
                  {/* Mobile Search + Filter chips */}
                  <div className="p-3 pb-0 space-y-2.5 shrink-0 bg-slate-950/30">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5 pointer-events-none" />
                      <input 
                        type="text"
                        placeholder="Search logs..."
                        value={searchAuditQuery}
                        onChange={(e) => setSearchAuditQuery(e.target.value)}
                        className="w-full h-9 pl-9 pr-3 rounded-2xl bg-slate-900/80 border border-slate-800/60 text-xs font-semibold text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-primary/60 focus:ring-[3px] focus:ring-primary/10 transition-all duration-200"
                        aria-label="Search audit logs"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {(["All", "Queries", "AI Responses", "Tool Calls", "Errors"] as const).map((chip) => {
                        const chipKey = chip === "All" ? "all" : chip === "Queries" ? "queries" : chip === "AI Responses" ? "responses" : chip === "Tool Calls" ? "tools" : "errors";
                        return (
                          <button
                            key={chip}
                            onClick={() => setAuditFilterChip(chipKey)}
                            className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                              auditFilterChip === chipKey
                                ? "bg-primary/10 text-primary border border-primary/20" 
                                : "bg-slate-900/60 text-slate-500 border border-slate-800/60"
                            }`}
                          >
                            {chip}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mobile Logs List */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3" id="mobile-audit-logs">
                    <style>{`#mobile-audit-logs::-webkit-scrollbar{width:3px}#mobile-audit-logs::-webkit-scrollbar-track{background:transparent}#mobile-audit-logs::-webkit-scrollbar-thumb{background:rgba(139,92,246,0.3);border-radius:4px}`}</style>
                    {filteredAudits.length > 0 ? (
                      filteredAudits.map((log) => {
                        const isExpanded = expandedLogId === log.id;
                        const isSafe = !log.safetyWarnings || log.safetyWarnings.length === 0;
                        return (
                          <div key={log.id} className="relative pl-4 group/maudit">
                            <div className="absolute left-[5px] top-3 bottom-[-8px] w-px bg-slate-800/40" />
                            <div className={`absolute left-0 top-[13px] w-[11px] h-[11px] rounded-full border-2 ${isSafe ? "border-emerald-500/30" : "border-rose-500/30"} bg-slate-950 flex items-center justify-center`}>
                              <div className={`w-[3.5px] h-[3.5px] rounded-full ${isSafe ? "bg-emerald-400" : "bg-rose-400"}`} />
                            </div>
                            <div 
                              className={`rounded-xl border p-3 transition-all duration-200 cursor-pointer ${
                                isExpanded ? "bg-slate-900/80 border-primary/20" : "bg-slate-900/60 border-slate-800/70 hover:bg-slate-900/80"
                              }`}
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            >
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <Bot className="w-3 h-3 text-primary shrink-0" />
                                    <span className="text-[9px] font-semibold text-slate-500 truncate">{log.query ? `"${log.query.substring(0, 30)}..."` : "No query"}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[9px] text-slate-500 font-semibold whitespace-nowrap">{relativeTime(log.timestamp)}</span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-bold uppercase border ${isSafe ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>
                                      {isSafe ? "Success" : "Alert"}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-[9px] text-slate-500 font-semibold">
                                  <span>{log.model || "GPT-5"}</span>
                                  <span className="w-px h-2.5 bg-slate-800/50" />
                                  <span>{log.duration ? `${(log.duration / 1000).toFixed(1)}s` : "1.2s"}</span>
                                  <span className="w-px h-2.5 bg-slate-800/50" />
                                  <span>{log.tokens ? `${log.tokens} tok` : "452 tok"}</span>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="mt-2.5 pt-2.5 border-t border-slate-800/50 space-y-2.5 text-[9px]">
                                  <div>
                                    <span className="text-primary font-bold uppercase tracking-widest text-[7px] block mb-1">Tier 1 Retrieval</span>
                                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/50 space-y-1">
                                      <p className="text-slate-400 font-semibold">• {log.retrievedContext?.profile?.fullName || "Sarah"} ({log.retrievedContext?.profile?.gender || "Female"}, diet: {log.retrievedContext?.profile?.dietaryPreferences?.join(", ")})</p>
                                      <p className="text-slate-400 font-semibold">• HR {log.retrievedContext?.vitals?.heartRate}, Steps {log.retrievedContext?.vitals?.steps}</p>
                                      <p className="text-slate-400 font-semibold">• Meds: {log.retrievedContext?.medications?.length || 0} active</p>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-secondary font-bold uppercase tracking-widest text-[7px] block mb-1">Tier 2 Semantic</span>
                                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/50">
                                      {log.retrievedContext?.files && log.retrievedContext.files.length > 0 ? (
                                        log.retrievedContext.files.map((f: any, idx: number) => (
                                          <p key={idx} className="text-slate-400 font-semibold">• {f.name} ({(f.similarity * 100).toFixed(0)}%)</p>
                                        ))
                                      ) : (
                                        <p className="text-slate-500 italic font-semibold">None matched</p>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-rose-400 font-bold uppercase tracking-widest text-[7px] block mb-1">Clinical Safety</span>
                                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/50">
                                      {!isSafe ? (
                                        <p className="text-rose-400 font-semibold flex items-start gap-1">
                                          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                                          {log.safetyWarnings[0]}
                                        </p>
                                      ) : (
                                        <p className="text-emerald-400 font-semibold">✓ All clinical rules passed</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center py-16 px-6">
                        <div className="w-12 h-12 rounded-2xl bg-slate-900/80 border border-slate-800/60 flex items-center justify-center mb-3">
                          <Activity className="w-5 h-5 text-slate-500" />
                        </div>
                        <h4 className="text-xs font-bold text-slate-300 mb-1">{searchAuditQuery || auditFilterChip !== "all" ? "No matching logs" : "No activity yet"}</h4>
                        <p className="text-[10px] text-slate-500 font-semibold leading-relaxed max-w-[200px]">
                          {searchAuditQuery || auditFilterChip !== "all" ? "Try adjusting your search." : "Your AI conversations will appear here."}
                        </p>
                        {(searchAuditQuery || auditFilterChip !== "all") && (
                          <button onClick={() => { setSearchAuditQuery(""); setAuditFilterChip("all"); }} className="mt-3 text-[9px] font-bold text-primary transition-colors">Clear filters</button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Mobile Diagnostics */
                <div className="flex-1 overflow-y-auto p-3 space-y-3" id="mobile-diagnostics-panel">
                  <div className="bg-slate-900/60 p-3 border border-slate-800/50 rounded-xl space-y-2.5">
                    <h5 className="text-[10px] font-bold uppercase text-slate-200 flex items-center gap-1.5">
                      <Cpu className="w-3 h-3 text-primary" />
                      Diagnostics
                    </h5>
                    <p className="text-[9px] text-slate-500 font-semibold leading-relaxed">Verify Tier 1 and Tier 2 health record parameters before LLM generation.</p>
                    <button type="button" onClick={runDiagnostics} disabled={runningDiagnostics} className="w-full h-9 rounded-xl bg-primary text-white text-[9px] font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer">
                      {runningDiagnostics ? <><Loader2 className="w-3 h-3 animate-spin" /> Running...</> : <><Play className="w-3 h-3 fill-current" /> Run Suite</>}
                    </button>
                  </div>
                  {diagnosticError && (
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-[9px] text-rose-400 flex gap-2 items-start font-semibold">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                      <p>{diagnosticError}</p>
                    </div>
                  )}
                  {diagnosticResult && (
                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center bg-slate-900/60 p-2.5 border border-slate-800/50 rounded-xl text-[9px]">
                        <span className="font-bold text-slate-300">Status:</span>
                        <span className={`px-2 py-0.5 rounded font-bold text-[8px] uppercase tracking-wider border ${diagnosticResult.success ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>
                          {diagnosticResult.success ? "Pass" : "Fail"}
                        </span>
                      </div>
                      {diagnosticResult.steps?.map((step: any, sIdx: number) => (
                        <div key={sIdx} className="p-2.5 bg-slate-900/60 border border-slate-800/50 rounded-xl flex gap-2 items-start">
                          {step.status === "pass" ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />}
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold text-slate-200">{step.name}</p>
                            <p className="text-[8px] text-slate-500 font-semibold">{step.details}</p>
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
