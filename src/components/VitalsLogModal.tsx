import React, { useState } from "react";
import { Activity, X, Sparkles, ShieldAlert } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { VitalReading } from "../types";

interface VitalsLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogVitalsReading: (reading: any) => Promise<{ feedback?: any }>;
}

export default function VitalsLogModal({ isOpen, onClose, onLogVitalsReading }: VitalsLogModalProps) {
  const [vitalsType, setVitalsType] = useState<"blood_sugar" | "blood_pressure" | "temperature" | "spo2">("blood_sugar");
  const [sugarVal, setSugarVal] = useState("");
  const [sugarUnit, setSugarUnit] = useState("mg/dL");
  const [sugarContext, setSugarContext] = useState("Fasting");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [tempVal, setTempVal] = useState("");
  const [tempUnit, setTempUnit] = useState("F");
  const [spo2Val, setSpo2Val] = useState("");
  const [logTime, setLogTime] = useState(() => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzoffset).toISOString().slice(0, 16);
  });
  const [isLoggingVitals, setIsLoggingVitals] = useState(false);
  const [vitalsFeedback, setVitalsFeedback] = useState<any | null>(null);
  const [vitalErrors, setVitalErrors] = useState<Record<string, string>>({});

  const validateVitals = (): boolean => {
    const errs: Record<string, string> = {};
    if (vitalsType === "blood_sugar") {
      const v = parseFloat(sugarVal);
      if (!sugarVal || isNaN(v)) errs.sugar = "Glucose value is required";
      else if (sugarUnit === "mg/dL" && (v < 20 || v > 600)) errs.sugar = "Must be 20-600 mg/dL";
      else if (sugarUnit === "mmol/L" && (v < 1.1 || v > 33.3)) errs.sugar = "Must be 1.1-33.3 mmol/L";
    } else if (vitalsType === "blood_pressure") {
      const s = parseInt(systolic);
      const d = parseInt(diastolic);
      if (!systolic || isNaN(s) || s < 50 || s > 250) errs.systolic = "Systolic must be 50-250 mmHg";
      if (!diastolic || isNaN(d) || d < 30 || d > 150) errs.diastolic = "Diastolic must be 30-150 mmHg";
      if (s && d && s <= d) errs.diastolic = "Diastolic must be lower than systolic";
      if (pulse) {
        const p = parseInt(pulse);
        if (isNaN(p) || p < 30 || p > 250) errs.pulse = "Pulse must be 30-250 BPM";
      }
    } else if (vitalsType === "temperature") {
      const v = parseFloat(tempVal);
      if (!tempVal || isNaN(v)) errs.temp = "Temperature is required";
      else if (tempUnit === "F" && (v < 86 || v > 113)) errs.temp = "Must be 86-113 °F";
      else if (tempUnit === "C" && (v < 30 || v > 45)) errs.temp = "Must be 30-45 °C";
    } else if (vitalsType === "spo2") {
      const v = parseInt(spo2Val);
      if (!spo2Val || isNaN(v) || v < 50 || v > 100) errs.spo2 = "SpO2 must be 50-100%";
    }
    setVitalErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleLogVitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVitalErrors({});
    if (!validateVitals()) return;
    setIsLoggingVitals(true);
    try {
      let payload: any = { type: vitalsType };
      if (vitalsType === "blood_sugar") {
        payload = { ...payload, sugarValue: Number(sugarVal), sugarUnit, sugarContext };
      } else if (vitalsType === "blood_pressure") {
        payload = { ...payload, systolic: Number(systolic), diastolic: Number(diastolic), pulse: pulse ? Number(pulse) : undefined };
      } else if (vitalsType === "temperature") {
        payload = { ...payload, tempValue: Number(tempVal), tempUnit };
      } else if (vitalsType === "spo2") {
        payload = { ...payload, spo2Value: Number(spo2Val) };
      }

      const overrideTime = new Date(logTime).getTime();
      const res = await onLogVitalsReading({ ...payload, overrideTimestamp: overrideTime });
      if (res?.feedback) {
        setVitalsFeedback(res.feedback);
      } else {
        handleReset();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingVitals(false);
    }
  };

  const handleReset = () => {
    setSugarVal(""); setSystolic(""); setDiastolic(""); setPulse(""); setTempVal(""); setSpo2Val("");
    setVitalsFeedback(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" id="vitals-log-modal">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white rounded-3xl p-4 sm:p-6 w-full max-w-md shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-black text-on-surface flex items-center gap-2">
            <Activity className="w-5 h-5 text-pink-500 animate-pulse" />
            Log Vital Reading
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-on-surface-variant transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!vitalsFeedback ? (
          <form onSubmit={handleLogVitalSubmit} className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1 p-1 bg-slate-100 border border-slate-200/40 rounded-xl">
              <button type="button" onClick={() => setVitalsType("blood_sugar")} className={`py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${vitalsType === "blood_sugar" ? "bg-white text-pink-500 shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}>Blood Sugar</button>
              <button type="button" onClick={() => setVitalsType("blood_pressure")} className={`py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${vitalsType === "blood_pressure" ? "bg-white text-pink-500 shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}>Blood Pressure</button>
              <button type="button" onClick={() => setVitalsType("temperature")} className={`py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${vitalsType === "temperature" ? "bg-white text-pink-500 shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}>Temperature</button>
              <button type="button" onClick={() => setVitalsType("spo2")} className={`py-2 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${vitalsType === "spo2" ? "bg-white text-pink-500 shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}>SpO2</button>
            </div>

            {vitalsType === "blood_sugar" ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Glucose Value</label>
                    <div className="flex gap-1 bg-slate-50 p-0.5 rounded-md border border-slate-200/40">
                      <button type="button" onClick={() => setSugarUnit("mg/dL")} className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${sugarUnit === "mg/dL" ? "bg-white text-pink-500 shadow-sm" : "text-slate-400"}`}>mg/dL</button>
                      <button type="button" onClick={() => setSugarUnit("mmol/L")} className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${sugarUnit === "mmol/L" ? "bg-white text-pink-500 shadow-sm" : "text-slate-400"}`}>mmol/L</button>
                    </div>
                  </div>
                  <input type="number" step="0.1" placeholder={sugarUnit === "mg/dL" ? "e.g. 110" : "e.g. 6.1"} value={sugarVal} onChange={(e) => { setSugarVal(e.target.value); setVitalErrors(p => ({ ...p, sugar: '' })); }} className={`w-full px-4 py-3 rounded-xl bg-slate-50 border text-on-surface focus:outline-none text-sm font-semibold ${vitalErrors.sugar ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-pink-500'}`} />
                  {vitalErrors.sugar && <p className="text-[10px] font-semibold text-rose-500 mt-1">{vitalErrors.sugar}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Reading Context</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["Fasting", "Post-meal", "Random", "Bedtime"] as const).map((ctx) => (
                      <button key={ctx} type="button" onClick={() => setSugarContext(ctx)} className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${sugarContext === ctx ? "border-pink-500 bg-pink-500/5 text-pink-500 font-extrabold" : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300"}`}>{ctx}</button>
                    ))}
                  </div>
                </div>
              </div>
            ) : vitalsType === "blood_pressure" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Systolic (mmHg)</label>
                    <input type="number" placeholder="e.g. 120" value={systolic} onChange={(e) => { setSystolic(e.target.value); setVitalErrors(p => ({ ...p, systolic: '' })); }} className={`w-full px-4 py-3 rounded-xl bg-slate-50 border text-on-surface focus:outline-none text-sm font-semibold ${vitalErrors.systolic ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-pink-500'}`} />
                    {vitalErrors.systolic && <p className="text-[10px] font-semibold text-rose-500 mt-1">{vitalErrors.systolic}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Diastolic (mmHg)</label>
                    <input type="number" placeholder="e.g. 80" value={diastolic} onChange={(e) => { setDiastolic(e.target.value); setVitalErrors(p => ({ ...p, diastolic: '' })); }} className={`w-full px-4 py-3 rounded-xl bg-slate-50 border text-on-surface focus:outline-none text-sm font-semibold ${vitalErrors.diastolic ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-pink-500'}`} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Pulse Rate (BPM) <span className="text-[10px] text-slate-400 lowercase">(optional)</span></label>
                  <input type="number" placeholder="e.g. 72" value={pulse} onChange={(e) => { setPulse(e.target.value); setVitalErrors(p => ({ ...p, pulse: '' })); }} className={`w-full px-4 py-3 rounded-xl bg-slate-50 border text-on-surface focus:outline-none text-sm font-semibold ${vitalErrors.pulse ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-pink-500'}`} />
                  {vitalErrors.pulse && <p className="text-[10px] font-semibold text-rose-500 mt-1">{vitalErrors.pulse}</p>}
                </div>
              </div>
            ) : vitalsType === "temperature" ? (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider">Body Temperature</label>
                    <div className="flex gap-1 bg-slate-50 p-0.5 rounded-md border border-slate-200/40">
                      <button type="button" onClick={() => setTempUnit("F")} className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${tempUnit === "F" ? "bg-white text-pink-500 shadow-sm" : "text-slate-400"}`}>°F</button>
                      <button type="button" onClick={() => setTempUnit("C")} className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${tempUnit === "C" ? "bg-white text-pink-500 shadow-sm" : "text-slate-400"}`}>°C</button>
                    </div>
                  </div>
                  <input type="number" step="0.1" placeholder={tempUnit === "F" ? "e.g. 98.6" : "e.g. 37.0"} value={tempVal} onChange={(e) => { setTempVal(e.target.value); setVitalErrors(p => ({ ...p, temp: '' })); }} className={`w-full px-4 py-3 rounded-xl bg-slate-50 border text-on-surface focus:outline-none text-sm font-semibold ${vitalErrors.temp ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-pink-500'}`} />
                  {vitalErrors.temp && <p className="text-[10px] font-semibold text-rose-500 mt-1">{vitalErrors.temp}</p>}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Blood Oxygen (SpO2 %)</label>
                  <input type="number" placeholder="e.g. 98" value={spo2Val} onChange={(e) => { setSpo2Val(e.target.value); setVitalErrors(p => ({ ...p, spo2: '' })); }} className={`w-full px-4 py-3 rounded-xl bg-slate-50 border text-on-surface focus:outline-none text-sm font-semibold ${vitalErrors.spo2 ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-pink-500'}`} />
                  {vitalErrors.spo2 && <p className="text-[10px] font-semibold text-rose-500 mt-1">{vitalErrors.spo2}</p>}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">Reading Time</label>
              <input type="datetime-local" required value={logTime} onChange={(e) => setLogTime(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-on-surface focus:outline-none focus:border-pink-500 text-sm font-semibold" />
            </div>

            <div className="mt-6 flex gap-3 pt-2 border-t border-slate-100">
              <button type="button" onClick={onClose} className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer">Cancel</button>
              <button type="submit" disabled={isLoggingVitals} className="flex-1 py-3 text-sm font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-xl transition-all shadow-md shadow-pink-500/10 cursor-pointer disabled:opacity-50 active:scale-95">{isLoggingVitals ? "Saving..." : "Save Reading"}</button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 py-2 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-extrabold text-on-surface flex items-center gap-1.5"><Sparkles className="w-4.5 h-4.5 text-pink-500 animate-pulse" />Immediate AI Analysis</h4>
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider border ${vitalsFeedback.severity === "crisis" ? "bg-rose-500/10 text-rose-500 border-rose-500/30 animate-bounce" : vitalsFeedback.severity === "abnormal" ? "bg-amber-500/10 text-amber-500 border-amber-500/30" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"}`}>{vitalsFeedback.severity === "crisis" ? "Urgent Critical" : vitalsFeedback.isNormal ? "Optimal Range" : "Attention Needed"}</span>
            </div>
            {vitalsFeedback.severity === "crisis" && (
              <div className="bg-red-50 border-2 border-red-500 p-4 rounded-2xl animate-pulse flex items-start gap-3"><ShieldAlert className="w-6 h-6 text-red-500 shrink-0 mt-0.5" /><div><p className="text-xs text-red-600 font-extrabold uppercase tracking-wide">⚠️ EMERGENCY CRISIS THRESHOLD MET</p><p className="text-[11px] text-red-500 font-semibold leading-normal mt-1">This is an extremely critical level. Please contact a qualified doctor or go to the nearest emergency room immediately. Do not delay!</p></div></div>
            )}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 space-y-3">
              <div className="text-xs text-on-surface font-medium leading-relaxed whitespace-pre-wrap">{vitalsFeedback.analysis}</div>
            </div>
            <div className="pt-2 flex gap-3">
              <button onClick={handleReset} className="flex-1 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-sm font-bold shadow-md shadow-pink-500/10 cursor-pointer active:scale-95 transition-all">Done</button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
