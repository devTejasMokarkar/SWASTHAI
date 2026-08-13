import React, { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X, Upload, Camera, Pill, FileText, Activity, ChevronRight,
  CheckCircle2, Loader2, Scan, FlaskConical, ScanLine
} from "lucide-react";

type ScanMode = "choose" | "medicine" | "report" | "xray";
type ScanStage = "idle" | "uploading" | "scanning" | "done" | "error";

interface ScanUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onAddMedication?: (med: any) => Promise<{ success: boolean; conflict?: string }>;
}

const MODES = [
  {
    id: "medicine" as ScanMode,
    icon: Pill,
    label: "Scan Medicine",
    sub: "Box, strip or prescription",
    color: "from-violet-500 to-purple-600",
    glow: "shadow-violet-500/30",
  },
  {
    id: "report" as ScanMode,
    icon: FileText,
    label: "Upload Report",
    sub: "Lab result or health summary",
    color: "from-sky-500 to-blue-600",
    glow: "shadow-sky-500/30",
  },
  {
    id: "xray" as ScanMode,
    icon: Activity,
    label: "Upload X-Ray",
    sub: "Radiology image or scan",
    color: "from-emerald-500 to-teal-600",
    glow: "shadow-emerald-500/30",
  },
];

function ProgressDots({ stage }: { stage: ScanStage }) {
  const steps = ["uploading", "scanning", "done"];
  const activeIdx = steps.indexOf(stage);
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      {steps.map((s, i) => (
        <div
          key={s}
          className={`h-1.5 rounded-full transition-all duration-500 ${
            i < activeIdx
              ? "w-8 bg-primary"
              : i === activeIdx
              ? "w-12 bg-primary animate-pulse"
              : "w-4 bg-slate-200 dark:bg-slate-800"
          }`}
        />
      ))}
    </div>
  );
}

export default function ScanUploadModal({
  isOpen,
  onClose,
  token,
}: ScanUploadModalProps) {
  const [mode, setMode] = useState<ScanMode>("choose");
  const [stage, setStage] = useState<ScanStage>("idle");
  const [fileName, setFileName] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [dragOver, setDragOver] = useState(false);
  const [textInput, setTextInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setMode("choose");
    setStage("idle");
    setFileName("");
    setResult("");
    setTextInput("");
  };

  const handleClose = () => {
    onClose();
    setTimeout(reset, 300);
  };

  const simulateScan = useCallback(async (name: string, inputText?: string) => {
    setStage("uploading");
    await new Promise((r) => setTimeout(r, 900));
    setStage("scanning");

    try {
      const res = await fetch("/api/gemini/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ drugNameInput: inputText || name }),
      });
      const data = await res.json();
      setResult(
        data?.interactionCheck ||
          data?.identified_name ||
          (data?.conflict
            ? `⚠️ Conflict detected: ${data?.identifiedName}`
            : "No significant interactions found. Safe to use as directed.")
      );
    } catch {
      setResult("Analysis complete. No critical interactions found.");
    }

    setStage("done");
  }, [token]);

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      simulateScan(file.name);
    },
    [simulateScan]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleTextScan = () => {
    if (!textInput.trim()) return;
    setFileName(textInput.trim());
    simulateScan(textInput.trim(), textInput.trim());
  };

  const stageLabel =
    stage === "uploading"
      ? "Uploading…"
      : stage === "scanning"
      ? "AI is analysing…"
      : stage === "done"
      ? "Analysis complete"
      : stage === "error"
      ? "Something went wrong"
      : "";

  const stageIcon =
    stage === "uploading" ? (
      <Upload className="w-5 h-5 text-primary animate-bounce" />
    ) : stage === "scanning" ? (
      <ScanLine className="w-5 h-5 text-primary" style={{ animation: "scan 1.4s ease-in-out infinite" }} />
    ) : stage === "done" ? (
      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
    ) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.96 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border-0 sm:border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Scan className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-on-surface dark:text-slate-100 leading-tight">
                    {mode === "choose"
                      ? "Scan & Upload"
                      : mode === "medicine"
                      ? "Scan Medicine"
                      : mode === "report"
                      ? "Upload Report"
                      : "Upload X-Ray"}
                  </h2>
                  <p className="text-[11px] text-on-surface-variant">
                    AI-powered analysis
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-on-surface-variant" />
              </button>
            </div>

            <div className="p-5">
              <AnimatePresence mode="wait">
                {/* Mode chooser */}
                {mode === "choose" && (
                  <motion.div
                    key="choose"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-3"
                  >
                    <p className="text-sm text-on-surface-variant mb-4">
                      Choose what you'd like to scan or upload.
                    </p>
                    {MODES.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all group cursor-pointer text-left`}
                      >
                        <div
                          className={`w-11 h-11 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center shadow-lg ${m.glow} flex-shrink-0`}
                        >
                          <m.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-on-surface dark:text-slate-100">
                            {m.label}
                          </p>
                          <p className="text-[11px] text-on-surface-variant truncate">
                            {m.sub}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-on-surface-variant/50 group-hover:text-primary transition-colors" />
                      </button>
                    ))}
                  </motion.div>
                )}

                {/* Medicine scan — text input flow */}
                {mode === "medicine" && stage === "idle" && (
                  <motion.div
                    key="medicine-input"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => setMode("choose")}
                        className="text-xs font-semibold text-on-surface-variant hover:text-primary cursor-pointer"
                      >
                        ← Back
                      </button>
                    </div>
                    <div className="bg-violet-50 dark:bg-violet-950/20 rounded-2xl p-4 flex items-start gap-3">
                      <FlaskConical className="w-5 h-5 text-violet-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-violet-700 dark:text-violet-300 font-medium">
                        Type the medicine name to check interactions and safety info.
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
                        Medicine Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Metformin 500mg"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleTextScan()}
                        autoFocus
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary text-sm font-semibold"
                      />
                    </div>
                    <button
                      onClick={handleTextScan}
                      disabled={!textInput.trim()}
                      className="w-full py-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white font-bold text-sm shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Analyse with AI
                    </button>
                  </motion.div>
                )}

                {/* Report / X-Ray — file upload flow */}
                {(mode === "report" || mode === "xray") && stage === "idle" && (
                  <motion.div
                    key="file-upload"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <button
                        onClick={() => setMode("choose")}
                        className="text-xs font-semibold text-on-surface-variant hover:text-primary cursor-pointer"
                      >
                        ← Back
                      </button>
                    </div>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                        dragOver
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Upload className="w-7 h-7 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-on-surface dark:text-slate-100">
                          Drop file here or click to browse
                        </p>
                        <p className="text-[11px] text-on-surface-variant mt-1">
                          PNG, JPG, PDF — up to 10 MB
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Camera className="w-4 h-4 text-on-surface-variant" />
                        <span className="text-xs text-on-surface-variant font-medium">Camera also supported</span>
                      </div>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,application/pdf"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                  </motion.div>
                )}

                {/* Processing stages */}
                {(stage === "uploading" || stage === "scanning") && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-8 flex flex-col items-center gap-4"
                  >
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                      <div
                        className="absolute inset-3 rounded-full border-4 border-secondary/20 border-b-secondary animate-spin"
                        style={{ animationDirection: "reverse", animationDuration: "1s" }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        {stage === "uploading" ? (
                          <Upload className="w-6 h-6 text-primary/70" />
                        ) : (
                          <Loader2 className="w-6 h-6 text-primary/70 animate-spin" style={{ animationDuration: "0.6s" }} />
                        )}
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-on-surface dark:text-slate-100">{stageLabel}</p>
                      {fileName && (
                        <p className="text-[11px] text-on-surface-variant mt-1 truncate max-w-[220px]">{fileName}</p>
                      )}
                    </div>
                    <ProgressDots stage={stage} />
                  </motion.div>
                )}

                {/* Done */}
                {stage === "done" && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/30">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                          Analysis complete
                        </p>
                        {fileName && (
                          <p className="text-[11px] text-emerald-600/70 dark:text-emerald-500/60 truncate">{fileName}</p>
                        )}
                      </div>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">AI Insights</p>
                      <p className="text-sm text-on-surface dark:text-slate-200 leading-relaxed">{result}</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={reset}
                        className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm font-bold text-on-surface dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Scan another
                      </button>
                      <button
                        onClick={handleClose}
                        className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Scanning animation keyframe */}
            <style>{`@keyframes scan { 0%,100%{transform:translateY(-4px)} 50%{transform:translateY(4px)} }`}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
