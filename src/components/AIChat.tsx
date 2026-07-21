import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, User, Medication } from "../types";
import { 
  Send, Sparkles, Activity, ShieldAlert, Heart, Info, ArrowDown, 
  Clipboard, X, Database, ShieldCheck, CheckCircle2, ChevronDown, ChevronRight, FileText, Search,
  RefreshCw, Play, Cpu, Layers, CheckSquare, XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AIChatProps {
  chatHistory: ChatMessage[];
  onSendMessage: (msg: string) => Promise<void>;
  onClearChat: () => Promise<void>;
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
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const [auditTab, setAuditTab] = useState<"logs" | "diagnostics">("logs");
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState<boolean>(false);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setRunningDiagnostics(true);
    setDiagnosticError(null);
    try {
      const token = localStorage.getItem("swasth_auth_token") || "sarah-session-token";
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

  // Filter audit logs based on search query
  const filteredAudits = auditLogs.filter(log => {
    const qMatch = log.query.toLowerCase().includes(searchAuditQuery.toLowerCase());
    const rMatch = log.rawGeneratedResponse?.toLowerCase().includes(searchAuditQuery.toLowerCase());
    const fileMatch = log.retrievedContext?.files?.some((f: any) => f.name.toLowerCase().includes(searchAuditQuery.toLowerCase()));
    return qMatch || rMatch || fileMatch;
  });

  return (
    <div className="flex flex-col md:flex-row gap-6 max-w-7xl mx-auto h-[calc(100vh-14rem)] md:h-[calc(100vh-12rem)] relative" id="ai-chat-view-container">
      {/* Primary Chat Interface */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.4 }}
        className={`flex flex-col h-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border border-slate-100 dark:border-slate-800/60 rounded-3xl overflow-hidden shadow-xl transition-all duration-300 flex-1`}
        id="ai-chat-view"
      >
        {/* Companion Title Header */}
        <div className="bg-gradient-to-r from-primary/5 via-secondary/5 to-transparent border-b border-slate-100 dark:border-slate-800 p-5 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/10">
            <Sparkles className="w-5 h-5 fill-white/20 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-on-surface dark:text-slate-100 flex items-center gap-1.5">
              He-Co • Clinical Companion
            </h3>
            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              Online • HIPAA Secure Proxy
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAudit(!showAudit)}
            className={`ml-auto flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              showAudit 
                ? "bg-primary text-white shadow-md shadow-primary/25" 
                : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:scale-105 active:scale-95"
            }`}
            id="btn-toggle-rag-audit"
          >
            <Database className="w-3.5 h-3.5" />
            <span>RAG Audit Trails</span>
            {auditLogs.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${showAudit ? "bg-white/20 text-white" : "bg-primary/10 text-primary"}`}>
                {auditLogs.length}
              </span>
            )}
          </button>
        </div>

        {/* Message History area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0" id="chat-messages-container">
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

            // Client-side clinical safety validation check
            const clientSafetyIssues = isAI ? runClientClinicalSafetyValidator(regularContent, user, medications) : [];

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
                className={`flex ${isAI ? "justify-start" : "justify-end"}`}
                id={`chat-bubble-${index}`}
              >
                <div 
                  className={`max-w-[85%] p-4 rounded-2xl shadow-sm text-xs leading-relaxed ${
                    isAI 
                      ? "bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-on-surface dark:text-slate-200 rounded-tl-sm font-medium" 
                      : "bg-primary text-white rounded-tr-sm font-semibold"
                  }`}
                >
                  {/* Server-side Clinical Safety Alerts */}
                  {isSafetyAlert && (
                    <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 rounded-r-xl text-[11px] text-red-700 dark:text-red-400 font-semibold flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-red-800 dark:text-red-300 font-bold uppercase tracking-wider">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-red-600" />
                        <span>Server Safety Alert</span>
                      </div>
                      <div className="pl-5 text-[10px] opacity-90">
                        {alertContent.split("\n").map((line, lIdx) => (
                          <p key={lIdx} className="leading-relaxed">{line}</p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Client-side Clinical Safety Validator Warning Banner */}
                  {isAI && clientSafetyIssues.length > 0 && (
                    <div className="mb-3.5 p-3 bg-amber-50 dark:bg-amber-955/20 border-l-4 border-amber-500 rounded-r-xl shadow-sm flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-300 font-extrabold uppercase tracking-wide">
                        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>Client Safety Detector</span>
                      </div>
                      <div className="space-y-1.5 pl-5 text-[10px] leading-relaxed text-amber-900 dark:text-amber-200">
                        {clientSafetyIssues.map((issue, idx) => (
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
                          tLine.includes("Always seek professional medical guidance. Swasth-AI is a wellness companion")) {
                        return null;
                      }
                      
                      // Format RAG Citations nicely
                      if (tLine.startsWith("RAG Citation:") || tLine.startsWith("*Swasth-AI Citations")) {
                        const citationText = tLine.replace("RAG Citation:", "").replace("*Swasth-AI Citations*", "").trim();
                        // Extract bracketed items
                        const matches = citationText.match(/\[(.*?)\]/g) || [citationText];
                        return (
                          <div key={lIdx} className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                            {matches.map((match, mIdx) => (
                              <span key={mIdx} className="bg-primary/10 text-primary dark:text-primary-container px-2 py-0.5 rounded-md text-[9px] font-bold flex items-center gap-1 border border-primary/20">
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
                            <Info className="w-3 h-3 inline-block mr-1 text-slate-400" />
                            {tLine.replace("⚠️ **Disclaimer**:", "").replace("Disclaimer:", "").trim()}
                          </p>
                        );
                      }

                      return <p key={lIdx} className="leading-relaxed text-sm">{line}</p>;
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
                              <p className="italic text-slate-400">No semantically matched files were found above the relevance threshold.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <span className={`text-[9px] block mt-2 text-right ${isAI ? "text-on-surface-variant dark:text-slate-400" : "text-white/70"}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start" id="chat-bubble-loading">
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl rounded-tl-sm text-xs text-on-surface-variant dark:text-slate-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
                <span className="font-semibold text-[10px] ml-1 uppercase tracking-widest text-primary">Companion Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Queries list */}
        {chatHistory.length <= 1 && (
          <div className="px-5 py-2 overflow-x-auto shrink-0 flex gap-2 no-scrollbar border-t border-slate-50 dark:border-slate-800" id="suggested-queries-bar">
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSuggestedQuery(sug.text)}
                className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950 hover:bg-primary/5 dark:hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-slate-200 dark:border-slate-800 text-[10px] font-bold rounded-xl transition-all whitespace-nowrap active:scale-95 cursor-pointer text-on-surface dark:text-slate-300"
              >
                {sug.text}
              </button>
            ))}
          </div>
        )}

        {/* Input query field */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex gap-2">
            <input 
              type="text"
              required
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Query dosage rules, file findings, or nutritional advice..."
              className="flex-1 h-12 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all text-on-surface dark:text-slate-100"
            />
            <button 
              type="button"
              onClick={(e) => void handleSend(e)}
              disabled={!userInput.trim() || isLoading}
              className="w-12 h-12 rounded-xl bg-primary hover:bg-primary-container text-white flex items-center justify-center shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-all disabled:opacity-50 active:scale-95 shrink-0 cursor-pointer"
            >
              <Send className="w-5 h-5 fill-white/10" />
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 px-1">
              <Info className="w-3 h-3 text-on-surface-variant dark:text-slate-400" />
              <span className="text-[9px] text-on-surface-variant dark:text-slate-400 font-medium">
                AI medical companion guidance represents supplementary educational analysis. Consult actual physicians for diagnoses.
              </span>
            </div>
            <button
              type="button"
              onClick={onClearChat}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-slate-400 hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              Clear Chat
            </button>
          </div>
        </div>
      </motion.div>

      {/* Slide-out RAG Audit Trail Console Panel */}
      <AnimatePresence>
        {showAudit && (
          <motion.div
            initial={{ opacity: 0, x: 100, width: 0 }}
            animate={{ opacity: 1, x: 0, width: "24rem" }}
            exit={{ opacity: 0, x: 100, width: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="hidden lg:flex flex-col h-full bg-slate-900 text-slate-100 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative"
            id="rag-audit-sidebar"
          >
            {/* Sidebar Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider">Transparency Panel</h4>
                  <p className="text-[9px] text-slate-400 font-semibold">Agent Audit Logs & Grounding</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAudit(false)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/40 shrink-0 text-xs font-bold uppercase tracking-wider">
              <button
                onClick={() => setAuditTab("logs")}
                className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
                  auditTab === "logs" 
                    ? "border-primary text-primary bg-slate-900/60" 
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Audit Trails
              </button>
              <button
                onClick={() => setAuditTab("diagnostics")}
                className={`flex-1 py-3 text-center border-b-2 transition-all cursor-pointer ${
                  auditTab === "diagnostics" 
                    ? "border-primary text-primary bg-slate-900/60" 
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                RAG Diagnostics
              </button>
            </div>

            {auditTab === "logs" ? (
              <>
                {/* Live Search bar */}
                <div className="p-4 bg-slate-900 border-b border-slate-800 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
                    <input 
                      type="text"
                      placeholder="Filter audit logs..."
                      value={searchAuditQuery}
                      onChange={(e) => setSearchAuditQuery(e.target.value)}
                      className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>

                {/* Logs collection scroll area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3" id="audit-logs-container">
                  {filteredAudits.length > 0 ? (
                    filteredAudits.map((log) => {
                      const isExpanded = expandedLogId === log.id;
                      const isSafe = !log.safetyWarnings || log.safetyWarnings.length === 0;
                      
                      return (
                        <div 
                          key={log.id}
                          className="p-3.5 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 rounded-xl space-y-2.5 transition-all duration-200"
                        >
                          <div 
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="flex justify-between items-start gap-2 cursor-pointer"
                          >
                            <div className="space-y-1 flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-200 truncate">
                                Query: "{log.query}"
                              </p>
                              <span className="text-[9px] text-slate-500 block font-semibold">
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isSafe ? (
                                <span className="bg-emerald-500/10 text-emerald-400 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase border border-emerald-500/15">
                                  Safe
                                </span>
                              ) : (
                                <span className="bg-rose-500/10 text-rose-400 text-[8px] px-1.5 py-0.5 rounded font-bold uppercase border border-rose-500/15">
                                  Alert
                                </span>
                              )}
                              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                            </div>
                          </div>

                          {/* Expanded View detailing retrieved data */}
                          {isExpanded && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="pt-2 border-t border-slate-900 text-[10px] space-y-3.5 leading-normal"
                            >
                              {/* Profile & Vitals (Tier 1) */}
                              <div className="space-y-1.5">
                                <span className="text-primary font-extrabold uppercase tracking-widest text-[8px] block">
                                  Tier 1: Deterministic Retrieval
                                </span>
                                <div className="bg-slate-900/60 p-2.5 border border-slate-800 rounded-lg space-y-1 text-slate-300 font-semibold">
                                  <p>• Profile: {log.retrievedContext?.profile?.fullName || "Sarah"} ({log.retrievedContext?.profile?.gender || "Female"}, diet: {log.retrievedContext?.profile?.dietaryPreferences?.join(", ")})</p>
                                  <p>• Checked Vitals: {log.retrievedContext?.vitals?.heartRate} BPM, {log.retrievedContext?.vitals?.steps} steps, {log.retrievedContext?.vitals?.sleep} sleep</p>
                                  <p>• Medications Checked: {log.retrievedContext?.medications?.length > 0 ? log.retrievedContext.medications.map((m: any) => m.name).join(", ") : "None logged"}</p>
                                </div>
                              </div>

                              {/* Files similarity context (Tier 2) */}
                              <div className="space-y-1.5">
                                <span className="text-secondary font-extrabold uppercase tracking-widest text-[8px] block">
                                  Tier 2: Semantic Similarity Search
                                </span>
                                <div className="space-y-1">
                                  {log.retrievedContext?.files && log.retrievedContext.files.length > 0 ? (
                                    log.retrievedContext.files.map((f: any, fIdx: number) => (
                                      <div key={fIdx} className="bg-slate-900/60 p-2 border border-slate-800 rounded-lg flex justify-between items-start gap-2 text-slate-300">
                                        <div className="flex gap-1.5 items-start">
                                          <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                          <div>
                                            <p className="font-bold text-slate-200">{f.name}</p>
                                            <p className="text-[9px] text-slate-500 italic mt-0.5">"{f.aiInsight}"</p>
                                          </div>
                                        </div>
                                        <span className="text-secondary font-bold shrink-0">
                                          {(f.similarity * 100).toFixed(1)}%
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-slate-500 italic font-semibold pl-1">No health reports matches above threshold.</p>
                                  )}
                                </div>
                              </div>

                              {/* Safety Report rules triggered */}
                              <div className="space-y-1.5">
                                <span className="text-rose-400 font-extrabold uppercase tracking-widest text-[8px] block">
                                  Clinical Safety Validation
                                </span>
                                <div className="bg-slate-900/60 p-2.5 border border-slate-800 rounded-lg space-y-1 font-semibold">
                                  {!isSafe ? (
                                    <div className="space-y-1 text-rose-400">
                                      {log.safetyWarnings.map((warn: string, wIdx: number) => (
                                        <p key={wIdx}>⚠️ {warn}</p>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-emerald-400 flex items-center gap-1.5">
                                      <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                                      Zero drug-diet conflicts triggered. Safe clinical dispatch.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-slate-500 space-y-2">
                      <Database className="w-10 h-10 text-slate-700 mx-auto" />
                      <p className="text-xs font-semibold">No audit logs match criteria.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Diagnostics Verification tab content */
              <div className="flex-1 overflow-y-auto p-5 space-y-5" id="diagnostics-verification-panel">
                <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl space-y-3 shadow-inner">
                  <h5 className="text-xs font-black uppercase text-slate-200 tracking-wider flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-primary" />
                    RAG Integrity Diagnostics
                  </h5>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Execute a diagnostic routine to verify that **Tier 1 (deterministic)** and **Tier 2 (semantic)** health record parameters are correctly resolved, injected, and audited in the Swasth-AI context before calling the LLM generation stage.
                  </p>
                  <button
                    type="button"
                    onClick={runDiagnostics}
                    disabled={runningDiagnostics}
                    className="w-full h-10 rounded-xl bg-primary hover:bg-primary-container text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {runningDiagnostics ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
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
                  <div className="p-4 bg-rose-500/10 border-2 border-rose-500/20 rounded-xl text-xs text-rose-400 flex gap-2.5 items-start">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="font-semibold leading-relaxed">{diagnosticError}</p>
                  </div>
                )}

                {diagnosticResult ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-slate-950 p-3 border border-slate-800 rounded-xl text-[10px]">
                      <span className="font-extrabold text-slate-300 uppercase tracking-wider">Test Suite Status:</span>
                      {diagnosticResult.success ? (
                        <span className="bg-emerald-500/10 text-emerald-400 font-extrabold px-2.5 py-1 rounded border border-emerald-500/20 uppercase tracking-widest text-[9px] animate-pulse">
                          VERIFIED PASS
                        </span>
                      ) : (
                        <span className="bg-rose-500/10 text-rose-400 font-extrabold px-2.5 py-1 rounded border border-rose-500/20 uppercase tracking-widest text-[9px]">
                          VERIFIED FAIL
                        </span>
                      )}
                    </div>

                    {/* Steps timeline */}
                    <div className="space-y-3">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Verification Pipeline:</span>
                      {diagnosticResult.steps?.map((step: any, sIdx: number) => (
                        <div 
                          key={sIdx}
                          className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl flex gap-3 items-start"
                        >
                          <div className="mt-0.5 shrink-0">
                            {step.status === "pass" ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-rose-400" />
                            )}
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex justify-between items-center">
                              <p className="text-xs font-extrabold text-slate-200 leading-normal truncate">{step.name}</p>
                              <span className="text-[9px] font-mono text-slate-500 font-bold shrink-0">{step.durationMs}ms</span>
                            </div>
                            <p className="text-[10px] text-slate-400 leading-normal font-semibold">{step.details}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Retrieved Context Block */}
                    <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2.5">
                      <span className="text-[9px] font-black uppercase text-primary tracking-widest flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        Context Payload Dump
                      </span>
                      <div className="text-[10px] text-slate-300 font-mono space-y-2 pl-1 leading-normal border-l border-slate-800 font-semibold">
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
                    <div className="text-center py-10 text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                      <CheckSquare className="w-8 h-8 text-slate-700 mx-auto" />
                      <p className="text-xs font-semibold">Test suite has not been executed yet.</p>
                    </div>
                  )
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Audit Logs Drawer for Mobile screens */}
      <AnimatePresence>
        {showAudit && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden flex items-end justify-center" id="mobile-audit-modal">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-slate-900 text-slate-100 w-full max-h-[80vh] rounded-t-3xl flex flex-col overflow-hidden shadow-2xl relative border-t border-slate-800"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider">Transparency Panel</h4>
                    <p className="text-[9px] text-slate-400">Agent Audit Logs & Grounding (Mobile)</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAudit(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Search */}
              <div className="p-3 bg-slate-900 border-b border-slate-800 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-3.5 h-3.5" />
                  <input 
                    type="text"
                    placeholder="Search logs..."
                    value={searchAuditQuery}
                    onChange={(e) => setSearchAuditQuery(e.target.value)}
                    className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200"
                  />
                </div>
              </div>

              {/* Logs List scroll area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredAudits.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const isSafe = !log.safetyWarnings || log.safetyWarnings.length === 0;

                  return (
                    <div key={log.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                      <div 
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="flex justify-between items-start gap-2 cursor-pointer"
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-200 truncate max-w-[180px]">
                            Query: "{log.query}"
                          </p>
                          <span className="text-[8px] text-slate-500 font-semibold">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isSafe ? (
                            <span className="bg-emerald-500/10 text-emerald-400 text-[8px] px-1 py-0.5 rounded font-bold uppercase">
                              Safe
                            </span>
                          ) : (
                            <span className="bg-rose-500/10 text-rose-400 text-[8px] px-1 py-0.5 rounded font-bold uppercase">
                              Alert
                            </span>
                          )}
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="pt-2 border-t border-slate-900 text-[10px] space-y-3 leading-relaxed">
                          <div className="bg-slate-900/60 p-2 rounded-lg space-y-1 font-semibold text-slate-300">
                            <p className="text-primary text-[8px] uppercase font-bold tracking-widest">Tier 1 Retrieval</p>
                            <p>• Profile: {log.retrievedContext?.profile?.fullName || "Sarah"}</p>
                            <p>• Checked Vitals: {log.retrievedContext?.vitals?.heartRate} BPM, {log.retrievedContext?.vitals?.steps} steps</p>
                            <p>• Meds Checked: {log.retrievedContext?.medications?.length || 0} active</p>
                          </div>

                          <div className="bg-slate-900/60 p-2 rounded-lg space-y-1 font-semibold text-slate-300">
                            <p className="text-secondary text-[8px] uppercase font-bold tracking-widest">Tier 2 Semantic Files</p>
                            {log.retrievedContext?.files && log.retrievedContext.files.length > 0 ? (
                              log.retrievedContext.files.map((f: any, idx: number) => (
                                <p key={idx}>• {f.name} (Match: {(f.similarity * 100).toFixed(0)}%)</p>
                              ))
                            ) : (
                              <p className="text-slate-500 italic">None matched.</p>
                            )}
                          </div>

                          <div className="bg-slate-900/60 p-2 rounded-lg font-semibold text-slate-300">
                            <p className="text-rose-400 text-[8px] uppercase font-bold tracking-widest">Clinical Safety</p>
                            {!isSafe ? (
                              <p className="text-rose-400">⚠️ {log.safetyWarnings[0]}</p>
                            ) : (
                              <p className="text-emerald-400">✓ All clinical rules passed safely.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
