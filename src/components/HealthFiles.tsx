import React, { useState, useEffect } from "react";
import { FileRecord, Medication } from "../types";
import { 
  Search, FolderOpen, FileText, MoreVertical, Sparkles, Plus, Trash2, X, AlertCircle,
  Activity, Clock, Download, Bell, Filter, TrendingUp, Calendar, Check, Loader2,
  ChevronLeft, ChevronRight, Pill
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import Medications from "./Medications";

interface HealthFilesProps {
  files: FileRecord[];
  onAddFile: (file: { name: string; category: "report" | "prescription"; size: string }) => Promise<void>;
  onDeleteFile: (id: string) => void;
  // New Vitals Integration Props
  vitalsReadings?: any[];
  vitalsReminders?: any[];
  onToggleVitalReminder?: (id: string) => Promise<void>;
  onDeleteReminder?: (id: string) => Promise<void>;
  onAddReminder?: (reminder: any) => Promise<void>;

  // Medications Integration Props
  medications: Medication[];
  onAddMedication: (med: Partial<Medication>) => Promise<{ success: boolean; conflict?: string }>;
  onToggleTaken: (id: string) => void;
  onToggleReminder: (id: string) => void;
  onDeleteMedication: (id: string) => void;
}

export default function HealthFiles({
  files,
  onAddFile,
  onDeleteFile,
  vitalsReadings = [],
  vitalsReminders = [],
  onToggleVitalReminder,
  onDeleteReminder,
  onAddReminder,
  
  medications,
  onAddMedication,
  onToggleTaken,
  onToggleReminder: onToggleMedReminder,
  onDeleteMedication,
}: HealthFilesProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [healthTab, setHealthTab] = useState<"files" | "medications">("files");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "report" | "prescription" | "vitals">("all");
  
  // Add file dialog states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newCategory, setNewCategory] = useState<"report" | "prescription">("report");
  const [newSize, setNewSize] = useState("2.4 MB");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Interactive options dropdown
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Vitals section states
  const [vitalsTimeWindow, setVitalsTimeWindow] = useState<"7d" | "30d" | "90d">("7d");
  const [vitalsContextFilter, setVitalsContextFilter] = useState<string>("All");
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [newReminderType, setNewReminderType] = useState<"blood_sugar" | "blood_pressure">("blood_sugar");
  const [newReminderTime, setNewReminderTime] = useState("08:00");
  const [newReminderLabel, setNewReminderLabel] = useState("");
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [newReminderFrequency, setNewReminderFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [newReminderDays, setNewReminderDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  const [newReminderDayOfMonth, setNewReminderDayOfMonth] = useState<number>(1);

  // Calendar View states
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 900);
    return () => clearTimeout(timer);
  }, []);

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName) return;

    setIsSubmitting(true);
    try {
      await onAddFile({
        name: newFileName,
        category: newCategory,
        size: newSize,
      });
      setNewFileName("");
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPreset = async (name: string, category: "report" | "prescription", size: string) => {
    setIsSubmitting(true);
    try {
      await onAddFile({ name, category, size });
      setShowAddModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter logic
  const filteredFiles = files.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          f.aiInsight.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" ? true : f.category === activeTab;
    return matchesSearch && matchesTab;
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse" id="health-files-skeleton">
        {/* Search input skeleton */}
        <div className="h-14 bg-slate-200/50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/30 dark:border-slate-800/30 w-full"></div>

        {/* Tab switcher skeleton */}
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="h-12 w-64 bg-slate-200/50 dark:bg-slate-800/40 rounded-2xl"></div>
          <div className="h-8 w-24 bg-slate-200/50 dark:bg-slate-800/40 rounded-xl"></div>
        </div>

        {/* Page Title skeleton */}
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
          <div className="h-4 w-96 bg-slate-200 dark:bg-slate-800 rounded"></div>
        </div>

        {/* Files Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-200/50 dark:bg-slate-800/40 border border-slate-200/30 dark:border-slate-800/30 p-6 rounded-3xl h-[320px] flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
                    <div className="space-y-2">
                      <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded"></div>
                      <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800"></div>
                </div>
                {/* AI Insight content box */}
                <div className="p-4 bg-slate-200/30 dark:bg-slate-800/20 rounded-2xl space-y-2">
                  <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-3 w-4/5 bg-slate-200 dark:bg-slate-800 rounded"></div>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                <div className="flex-1 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleExportCSV = () => {
    if (!vitalsReadings.length) return;
    const headers = ["Type", "Date/Time", "Sugar Value", "Sugar Unit", "Context", "Systolic (mmHg)", "Diastolic (mmHg)", "Pulse (BPM)", "Severity", "Analysis"];
    const rows = vitalsReadings.map(r => [
      r.type,
      new Date(r.createdAt).toLocaleString(),
      r.type === "blood_sugar" ? r.sugarVal : "",
      r.type === "blood_sugar" ? (r.sugarUnit || "mg/dL") : "",
      r.type === "blood_sugar" ? (r.sugarContext || "Random") : "",
      r.type === "blood_pressure" ? r.systolic : "",
      r.type === "blood_pressure" ? r.diastolic : "",
      r.type === "blood_pressure" && r.pulse ? r.pulse : "",
      r.severity || "normal",
      (r.clinicalTags || []).join("; ")
    ]);
    const csvContent = [headers.join(","), ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `vitals_history_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateReminderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddReminder) return;
    setIsAddingReminder(true);
    try {
      await onAddReminder({
        type: newReminderType,
        time: newReminderTime,
        label: newReminderLabel || (newReminderType === "blood_sugar" ? "Glucose Check" : "Blood Pressure Check"),
        frequency: newReminderFrequency,
        days: newReminderFrequency === "daily" 
          ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] 
          : newReminderFrequency === "weekly" 
            ? newReminderDays 
            : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        dayOfMonth: newReminderFrequency === "monthly" ? newReminderDayOfMonth : 1,
      });
      setNewReminderLabel("");
      setNewReminderFrequency("daily");
      setNewReminderDays(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
      setNewReminderDayOfMonth(1);
      setShowAddReminderModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingReminder(false);
    }
  };

  const getFilteredSugarData = () => {
    const now = new Date();
    let daysCutoff = 7;
    if (vitalsTimeWindow === "30d") daysCutoff = 30;
    if (vitalsTimeWindow === "90d") daysCutoff = 90;
    const cutoffDate = new Date(now.getTime() - daysCutoff * 24 * 60 * 60 * 1000);

    return vitalsReadings
      .filter(r => r.type === "blood_sugar")
      .filter(r => new Date(r.createdAt) >= cutoffDate)
      .filter(r => vitalsContextFilter === "All" || r.sugarContext === vitalsContextFilter)
      .map(r => ({
        ...r,
        formattedDate: new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + new Date(r.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }),
        sugarVal: Number(r.sugarVal)
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  const getFilteredBPData = () => {
    const now = new Date();
    let daysCutoff = 7;
    if (vitalsTimeWindow === "30d") daysCutoff = 30;
    if (vitalsTimeWindow === "90d") daysCutoff = 90;
    const cutoffDate = new Date(now.getTime() - daysCutoff * 24 * 60 * 60 * 1000);

    return vitalsReadings
      .filter(r => r.type === "blood_pressure")
      .filter(r => new Date(r.createdAt) >= cutoffDate)
      .map(r => ({
        ...r,
        formattedDate: new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + new Date(r.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false }),
        systolic: Number(r.systolic),
        diastolic: Number(r.diastolic)
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  // Helper for calendar days
  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    
    // We want the calendar days to highlight when there is a vitals log
    const getReadingsForDay = (day: number) => {
      return vitalsReadings.filter((r) => {
        const rDate = new Date(r.createdAt);
        return (
          rDate.getFullYear() === year &&
          rDate.getMonth() === month &&
          rDate.getDate() === day
        );
      });
    };

    const nextMonth = () => {
      setCurrentMonth(new Date(year, month + 1, 1));
    };

    const prevMonth = () => {
      setCurrentMonth(new Date(year, month - 1, 1));
    };

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    return (
      <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/80 p-5 rounded-3xl shadow-sm space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-extrabold text-sm text-on-surface dark:text-slate-100 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-pink-500" />
            Vitals Calendar
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={prevMonth}
              type="button"
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-extrabold text-on-surface dark:text-slate-100 px-1 min-w-[90px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              type="button"
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
          {weekdays.map((wd) => (
            <div key={wd} className="py-1">
              {wd}
            </div>
          ))}

          {/* Padding slots */}
          {Array.from({ length: firstDayIndex }).map((_, idx) => (
            <div key={`pad-${idx}`} className="py-2"></div>
          ))}

          {/* Actual days */}
          {Array.from({ length: totalDays }).map((_, idx) => {
            const dayNum = idx + 1;
            const readings = getReadingsForDay(dayNum);
            const hasReadings = readings.length > 0;
            const isSelected = selectedDate && 
              selectedDate.getFullYear() === year &&
              selectedDate.getMonth() === month &&
              selectedDate.getDate() === dayNum;

            const hasGlucose = readings.some(r => r.type === "blood_sugar");
            const hasPressure = readings.some(r => r.type === "blood_pressure");

            return (
              <button
                key={`day-${dayNum}`}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    setSelectedDate(null);
                  } else {
                    setSelectedDate(new Date(year, month, dayNum));
                  }
                }}
                className={`py-1.5 relative rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer group h-10 ${
                  isSelected
                    ? "bg-pink-500 text-white font-black shadow-md shadow-pink-500/10"
                    : hasReadings
                    ? "bg-pink-500/5 hover:bg-pink-500/10 text-on-surface dark:text-slate-100"
                    : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <span className="text-xs">{dayNum}</span>
                {/* Highlight markers (dots) */}
                {hasReadings && (
                  <div className="flex gap-0.5 justify-center mt-0.5 absolute bottom-1">
                    {hasGlucose && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-pink-500"}`}></span>
                    )}
                    {hasPressure && (
                      <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-rose-500"}`}></span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
            Glucose Logs
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            BP Logs
          </span>
          <span className="text-[9px] text-pink-500 font-extrabold animate-pulse">
            Click day to filter
          </span>
        </div>
      </div>
    );
  };

  const renderVitalsSection = () => {
    const sugarData = getFilteredSugarData();
    const bpData = getFilteredBPData();

    return (
      <div className="space-y-8 animate-in fade-in duration-400" id="vitals-dashboard-container">
        {/* Vitals Controls Header panel */}
        <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/80 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-on-surface dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-6 h-6 text-pink-500 animate-pulse" />
              Vitals Analysis & History
            </h2>
            <p className="text-xs text-on-surface-variant dark:text-slate-400">
              Track cardiovascular and glucose metrics with real-time safety classification.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 items-center">
            {/* Time Window Buttons */}
            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
              {(["7d", "30d", "90d"] as const).map((win) => (
                <button
                  key={win}
                  onClick={() => setVitalsTimeWindow(win)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    vitalsTimeWindow === win
                      ? "bg-white dark:bg-slate-900 text-pink-500 shadow-sm font-extrabold"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {win === "7d" ? "7 Days" : win === "30d" ? "30 Days" : "90 Days"}
                </button>
              ))}
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              disabled={vitalsReadings.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-xl text-xs font-bold hover:bg-pink-600 transition-all shadow-md shadow-pink-500/10 cursor-pointer disabled:opacity-50"
              title="Download historical logs to Excel/CSV"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Dynamic Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Blood Sugar Curve */}
          <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm flex flex-col justify-between min-h-[360px]">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-on-surface dark:text-slate-100 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-pink-500 rounded-full inline-block animate-pulse"></span>
                    Blood Glucose Trend
                  </h3>
                  <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
                    Circadian targets adapt based on selected contexts.
                  </p>
                </div>

                {/* Sugar Context Filter Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 py-1.5 px-3 rounded-xl border border-slate-250/40 dark:border-slate-800/40">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={vitalsContextFilter}
                    onChange={(e) => setVitalsContextFilter(e.target.value)}
                    className="bg-transparent border-none text-[11px] font-bold text-slate-500 dark:text-slate-300 outline-none focus:ring-0 cursor-pointer text-xs"
                  >
                    <option value="All">All Contexts</option>
                    <option value="Fasting">Fasting Only</option>
                    <option value="Post-meal">Post-meal Only</option>
                    <option value="Random">Random Only</option>
                    <option value="Bedtime">Bedtime Only</option>
                  </select>
                </div>
              </div>

              {sugarData.length > 0 ? (
                <div className="h-[220px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sugarData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800/40" />
                      <XAxis dataKey="formattedDate" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", borderRadius: "12px", border: "none" }}
                        labelStyle={{ fontSize: "10px", fontWeight: "bold", color: "#f8fafc" }}
                        itemStyle={{ fontSize: "11px", color: "#f472b6" }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sugarVal" 
                        name="Blood Sugar" 
                        stroke="#ec4899" 
                        strokeWidth={3} 
                        activeDot={{ r: 7 }} 
                        dot={{ r: 4 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[220px] flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-600 gap-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Activity className="w-8 h-8 opacity-40 animate-pulse" />
                  <p className="text-xs font-semibold">No Blood Glucose logs found for this window.</p>
                </div>
              )}
            </div>
          </div>

          {/* Blood Pressure Curves */}
          <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm flex flex-col justify-between min-h-[360px]">
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-on-surface dark:text-slate-100 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block animate-pulse"></span>
                    Blood Pressure Dynamics
                  </h3>
                  <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
                    Tracks both systolic and diastolic ranges simultaneously.
                  </p>
                </div>
              </div>

              {bpData.length > 0 ? (
                <div className="h-[220px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bpData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:stroke-slate-800/40" />
                      <XAxis dataKey="formattedDate" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <YAxis domain={["auto", "auto"]} tick={{ fontSize: 9 }} stroke="#94a3b8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "rgba(15, 23, 42, 0.95)", borderRadius: "12px", border: "none" }}
                        labelStyle={{ fontSize: "10px", fontWeight: "bold", color: "#f8fafc" }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "10px" }} />
                      <Line 
                        type="monotone" 
                        dataKey="systolic" 
                        name="Systolic (High)" 
                        stroke="#f43f5e" 
                        strokeWidth={2.5} 
                        dot={{ r: 3.5 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="diastolic" 
                        name="Diastolic (Low)" 
                        stroke="#3b82f6" 
                        strokeWidth={2.5} 
                        dot={{ r: 3.5 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[220px] flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-600 gap-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Activity className="w-8 h-8 opacity-40" />
                  <p className="text-xs font-semibold">No Blood Pressure logs found for this window.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reminders, Calendar & Recent Logs split layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (Calendar & Reminders) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Calendar View */}
            {renderCalendar()}

            {/* Reminders sub-panel */}
            <div className="bg-white/85 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="font-extrabold text-sm text-on-surface dark:text-slate-100 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-pink-500" />
                  Vitals Checking Reminders
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setNewReminderLabel("");
                    setNewReminderFrequency("daily");
                    setNewReminderDays(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
                    setNewReminderDayOfMonth(1);
                    setShowAddReminderModal(true);
                  }}
                  className="p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-pink-500 hover:text-pink-600 transition-colors cursor-pointer"
                  title="Create a new checking reminder"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {vitalsReminders.length > 0 ? (
                  vitalsReminders.map((rem) => (
                    <div
                      key={rem.id}
                      className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/40 rounded-xl flex items-center justify-between animate-in fade-in duration-200"
                    >
                      <div className="space-y-1 min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${rem.type === "blood_sugar" ? "bg-pink-500" : "bg-rose-500"}`}></span>
                          <p className="text-xs font-extrabold text-on-surface dark:text-slate-100 truncate" title={rem.label}>{rem.label}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold flex flex-wrap items-center gap-1.5 leading-none">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{rem.time}</span>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="capitalize text-pink-500 dark:text-pink-400 font-extrabold">{rem.frequency || "daily"}</span>
                          {rem.frequency === "weekly" && rem.days && rem.days.length < 7 && (
                            <>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[90px]" title={rem.days.join(", ")}>
                                {rem.days.join(", ")}
                              </span>
                            </>
                          )}
                          {rem.frequency === "monthly" && rem.dayOfMonth && (
                            <>
                              <span className="text-slate-300 dark:text-slate-700">•</span>
                              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                                Day {rem.dayOfMonth}
                              </span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Active Status toggle */}
                        <button
                          type="button"
                          onClick={() => onToggleVitalReminder && onToggleVitalReminder(rem.id)}
                          className={`text-[10px] font-bold px-2 py-1 rounded-md transition-all cursor-pointer ${
                            rem.active !== false
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-slate-150 dark:bg-slate-800 text-slate-400"
                          }`}
                        >
                          {rem.active !== false ? "Active" : "Paused"}
                        </button>

                        {/* Trash Button */}
                        <button
                          type="button"
                          onClick={() => onDeleteReminder && onDeleteReminder(rem.id)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 dark:text-slate-600 text-xs">
                    No active vitals reminders. Click + to schedule.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* History table list (2/3 width) */}
          <div className="lg:col-span-2 bg-white/85 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-sm text-on-surface dark:text-slate-100 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-pink-500" />
                Raw Electronic Clinical Logs
              </h3>

              {/* Selected date filter alert */}
              {selectedDate && (
                <div className="mb-4 p-3 bg-pink-500/10 border border-pink-500/25 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse"></span>
                    <span className="text-xs font-bold text-pink-600 dark:text-pink-400">
                      Filtered: {selectedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">
                      ({vitalsReadings.filter((r) => {
                        const rDate = new Date(r.createdAt);
                        return (
                          rDate.getFullYear() === selectedDate.getFullYear() &&
                          rDate.getMonth() === selectedDate.getMonth() &&
                          rDate.getDate() === selectedDate.getDate()
                        );
                      }).length} logs)
                    </span>
                  </div>
                  <button 
                    onClick={() => setSelectedDate(null)}
                    type="button"
                    className="text-xs font-black text-pink-500 hover:text-pink-600 hover:underline cursor-pointer"
                  >
                    Clear Filter
                  </button>
                </div>
              )}

              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                      <th className="py-2">Date/Time</th>
                      <th className="py-2">Vitals Type</th>
                      <th className="py-2 text-right">Value Recorded</th>
                      <th className="py-2 text-right">Pulse/Context</th>
                      <th className="py-2 text-center">AI Classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/40 text-xs">
                    {(() => {
                      const displayedReadings = selectedDate
                        ? vitalsReadings.filter((r) => {
                            const rDate = new Date(r.createdAt);
                            return (
                              rDate.getFullYear() === selectedDate.getFullYear() &&
                              rDate.getMonth() === selectedDate.getMonth() &&
                              rDate.getDate() === selectedDate.getDate()
                            );
                          })
                        : vitalsReadings;

                      return displayedReadings.slice(0, 20).map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                          <td className="py-2.5 text-[10px] font-bold text-slate-500">
                            {new Date(r.createdAt).toLocaleString()}
                          </td>
                          <td className="py-2.5 font-bold text-on-surface dark:text-slate-200 uppercase text-[10px]">
                            {r.type === "blood_sugar" ? "Glucose" : "Pressure"}
                          </td>
                          <td className="py-2.5 text-right font-black text-on-surface dark:text-slate-100">
                            {r.type === "blood_sugar" 
                              ? `${r.sugarVal} ${r.sugarUnit || "mg/dL"}`
                              : `${r.systolic}/${r.diastolic} mmHg`
                            }
                          </td>
                          <td className="py-2.5 text-right font-medium text-slate-500">
                            {r.type === "blood_sugar" 
                              ? r.sugarContext 
                              : r.pulse ? `${r.pulse} BPM` : "—"
                            }
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                              r.severity === "crisis"
                                ? "bg-red-500/10 text-red-500 border border-red-500/20 animate-bounce"
                                : r.severity === "abnormal"
                                ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            }`}>
                              {r.severity === "crisis" ? "Urgent" : (r.clinicalTags && r.clinicalTags[0]) || "Normal"}
                            </span>
                          </td>
                        </tr>
                      ));
                    })()}
                    {vitalsReadings.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-600 font-bold">
                          No logged records yet. Go to "Today" and click "Log Reading" to start!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Create Reminder Modal */}
        <AnimatePresence>
          {showAddReminderModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm" id="vitals-reminder-modal">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-slate-800"
              >
                <div className="flex justify-between items-center mb-5">
                  <h4 className="text-base font-black text-on-surface dark:text-slate-100 flex items-center gap-1.5">
                    <Bell className="w-5 h-5 text-pink-500 animate-pulse" />
                    Set Vitals Reminder
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowAddReminderModal(false)}
                    className="p-1 hover:bg-slate-150 dark:hover:bg-slate-800 rounded-lg text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateReminderSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                      Vitals Parameter Check
                    </label>
                    <div className="flex p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/40 rounded-xl">
                      <button
                        type="button"
                        onClick={() => setNewReminderType("blood_sugar")}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          newReminderType === "blood_sugar"
                            ? "bg-white dark:bg-slate-900 text-pink-500 shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        Blood Sugar
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewReminderType("blood_pressure")}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          newReminderType === "blood_pressure"
                            ? "bg-white dark:bg-slate-900 text-pink-500 shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        Blood Pressure
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                      Check Schedule Time
                    </label>
                    <input
                      type="time"
                      required
                      value={newReminderTime}
                      onChange={(e) => setNewReminderTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-pink-500 text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                      Recurrence Frequency
                    </label>
                    <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/40 rounded-xl">
                      {(["daily", "weekly", "monthly"] as const).map((freq) => (
                        <button
                          key={freq}
                          type="button"
                          onClick={() => setNewReminderFrequency(freq)}
                          className={`py-1.5 text-xs font-bold rounded-lg capitalize transition-all cursor-pointer ${
                            newReminderFrequency === freq
                              ? "bg-white dark:bg-slate-900 text-pink-500 shadow-sm"
                              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                          }`}
                        >
                          {freq}
                        </button>
                      ))}
                    </div>
                  </div>

                  {newReminderFrequency === "weekly" && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                        Select Weekdays
                      </label>
                      <div className="flex justify-between items-center gap-1">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                          const isSelected = newReminderDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  if (newReminderDays.length > 1) {
                                    setNewReminderDays(newReminderDays.filter((d) => d !== day));
                                  }
                                } else {
                                  setNewReminderDays([...newReminderDays, day]);
                                }
                              }}
                              className={`w-9 h-9 rounded-full text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-pink-500 text-white shadow-md shadow-pink-500/10"
                                  : "bg-slate-100 dark:bg-slate-950 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"
                              }`}
                              title={day}
                            >
                              {day.charAt(0)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {newReminderFrequency === "monthly" && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                        Day of Month
                      </label>
                      <select
                        value={newReminderDayOfMonth}
                        onChange={(e) => setNewReminderDayOfMonth(Number(e.target.value))}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-pink-500 text-sm font-semibold cursor-pointer"
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <option key={day} value={day}>
                            {day}
                            {day === 1 || day === 21 || day === 31
                              ? "st"
                              : day === 2 || day === 22
                              ? "nd"
                              : day === 3 || day === 23
                              ? "rd"
                              : "th"}{" "}
                            of the month
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">
                      Custom Friendly Name <span className="text-[10px] text-slate-400 lowercase">(optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder={newReminderType === "blood_sugar" ? "Fasting Sugar Check" : "Evening BP Check"}
                      value={newReminderLabel}
                      onChange={(e) => setNewReminderLabel(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-pink-500 text-sm font-semibold"
                    />
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddReminderModal(false)}
                      className="flex-1 py-3 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingReminder}
                      className="flex-1 py-3 text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 rounded-xl transition-colors shadow-md shadow-pink-500/10 cursor-pointer disabled:opacity-50"
                    >
                      {isAddingReminder ? "Scheduling..." : "Schedule"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
      id="health-files-view"
    >
      {/* High-Level Tab Switcher */}
      <div className="flex border-b border-slate-100 dark:border-slate-800 pb-1 mb-4 w-full justify-start overflow-x-auto gap-2">
        <button
          onClick={() => setHealthTab("files")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs md:text-sm tracking-tight transition-all cursor-pointer whitespace-nowrap ${
            healthTab === "files"
              ? "border-primary text-primary"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span>Clinical Documents & Logs</span>
        </button>
        <button
          onClick={() => setHealthTab("medications")}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-black text-xs md:text-sm tracking-tight transition-all cursor-pointer whitespace-nowrap ${
            healthTab === "medications"
              ? "border-primary text-primary"
              : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          }`}
        >
          <Pill className="w-4 h-4" />
          <span>Pill Tracker & Scanner</span>
        </button>
      </div>

      {healthTab === "medications" ? (
        <Medications
          medications={medications}
          onAddMedication={onAddMedication}
          onToggleTaken={onToggleTaken}
          onToggleReminder={onToggleMedReminder}
          onDeleteMedication={onDeleteMedication}
        />
      ) : (
        <>
          {/* Search & Filter Section */}
          {activeTab !== "vitals" && (
        <section className="relative w-full" id="search-section">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-slate-400 w-5 h-5" />
            <input 
              type="text"
              placeholder="Search medical records, labs, or clinical AI insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-4 rounded-2xl bg-slate-100 dark:bg-slate-950 border-none ring-1 ring-slate-200 dark:ring-slate-800 focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-900 transition-all outline-none text-body-md font-semibold text-on-surface dark:text-slate-100"
            />
          </div>
        </section>
      )}

      {/* Tab Switcher */}
      <div className="flex justify-between items-center flex-wrap gap-4" id="tabs-header-container">
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl w-fit flex-wrap gap-1" id="category-tab-switcher">
          <button 
            onClick={() => setActiveTab("all")}
            className={`px-4 md:px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "all" 
                ? "bg-white dark:bg-slate-900 text-primary font-bold shadow-md shadow-slate-900/5 active-tab-glow" 
                : "text-on-surface-variant dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50"
            }`}
          >
            All Files
          </button>
          <button 
            onClick={() => setActiveTab("report")}
            className={`px-4 md:px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "report" 
                ? "bg-white dark:bg-slate-900 text-primary font-bold shadow-md shadow-slate-900/5 active-tab-glow" 
                : "text-on-surface-variant dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50"
            }`}
          >
            Reports
          </button>
          <button 
            onClick={() => setActiveTab("prescription")}
            className={`px-4 md:px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "prescription" 
                ? "bg-white dark:bg-slate-900 text-primary font-bold shadow-md shadow-slate-900/5 active-tab-glow" 
                : "text-on-surface-variant dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50"
            }`}
          >
            Prescriptions
          </button>
          <button 
            onClick={() => setActiveTab("vitals")}
            className={`px-4 md:px-6 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "vitals" 
                ? "bg-white dark:bg-slate-900 text-pink-500 font-bold shadow-md shadow-slate-900/5 active-tab-glow" 
                : "text-on-surface-variant dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50"
            }`}
          >
            Vitals Trends & Reminders
          </button>
        </div>

        <div className="px-4 py-2 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/10 dark:border-primary/20">
          <span className="font-bold text-xs text-primary">
            {activeTab === "vitals" ? `Total: ${vitalsReadings.length} Readings` : `Total: ${filteredFiles.length} Files`}
          </span>
        </div>
      </div>

      {activeTab === "vitals" ? (
        renderVitalsSection()
      ) : (
        <>
          {/* Page Title */}
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-on-surface dark:text-slate-100">Health Files</h2>
            <p className="text-sm text-on-surface-variant dark:text-slate-400 mt-1">Manage your digital health records with AI-powered insights.</p>
          </div>

          {/* Files List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="files-grid">
            <AnimatePresence mode="popLayout">
              {filteredFiles.map((file) => (
                <motion.div
                  key={file.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white/85 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800/60 p-6 rounded-3xl flex flex-col justify-between group hover:shadow-lg dark:hover:shadow-black/20 transition-all duration-300 relative hover:scale-[1.01]"
                  id={`file-card-${file.id}`}
                >
                  {/* Header block with Type icon & Options button */}
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-2xl ${
                      file.category === "report" 
                        ? "bg-secondary/10 text-secondary dark:bg-secondary/20" 
                        : "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400"
                    }`}>
                      <FileText className="w-5 h-5" />
                    </div>

                    <div className="relative">
                      <button 
                        onClick={() => setActiveMenuId(activeMenuId === file.id ? null : file.id)}
                        className="text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-slate-200 p-1 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {/* Context Action Menu */}
                      {activeMenuId === file.id && (
                        <div className="absolute right-0 top-8 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl p-1 z-30 min-w-[120px]">
                          <button 
                            onClick={() => {
                              onDeleteFile(file.id);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete File
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title & Stats */}
                  <div className="mt-5">
                    <h3 className="font-bold text-lg text-on-surface dark:text-slate-100 truncate" title={file.name}>
                      {file.name}
                    </h3>
                    <p className="text-xs text-on-surface-variant dark:text-slate-400 font-medium mt-1">
                      {file.date} • {file.size}
                    </p>
                  </div>

                  {/* AI Clinical Insight Section */}
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-start gap-2.5 bg-primary/5 dark:bg-primary/10 p-3.5 rounded-2xl border border-primary/5">
                      <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5 animate-pulse" />
                      <p className="text-xs text-primary dark:text-slate-300 font-bold leading-normal">
                        {file.aiInsight}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredFiles.length === 0 && (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-center text-on-surface-variant space-y-3">
                <FolderOpen className="w-12 h-12 text-slate-300" />
                <h3 className="font-bold text-base text-on-surface">No Files Found</h3>
                <p className="text-xs max-w-xs">Try clearing your search query or uploading a clinical file using the floating action button below.</p>
              </div>
            )}
          </div>

          {/* Floating Add File button */}
          <button 
            onClick={() => setShowAddModal(true)}
            className="fixed bottom-24 right-6 w-16 h-16 rounded-2xl bg-primary text-white shadow-xl hover:shadow-primary/35 flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40 group"
            title="Upload Health Record"
            id="add-file-fab"
          >
            <Plus className="w-8 h-8" />
            <span className="absolute right-full mr-4 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
              Upload New File
            </span>
          </button>
        </>
      )}

      {/* Add / Upload Mock File Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" id="upload-file-modal">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl relative border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-extrabold text-on-surface dark:text-slate-100 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-primary" />
                  Upload Clinical Document
                </h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-on-surface-variant dark:text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick clinical presets */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-2">
                  Quick Select Real-World Presets
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={() => handleAddPreset("Lipid Profile Panel.pdf", "report", "1.8 MB")}
                    disabled={isSubmitting}
                    className="text-left w-full p-3 bg-slate-50 dark:bg-slate-950 hover:bg-primary/5 dark:hover:bg-primary/10 hover:border-primary/30 border border-slate-200 dark:border-slate-800 rounded-xl transition-all text-xs font-bold text-on-surface dark:text-slate-200 flex justify-between items-center cursor-pointer"
                  >
                    <span>📈 Lipid Profile Panel (Cholesterol)</span>
                    <span className="text-[10px] text-on-surface-variant dark:text-slate-400">1.8 MB</span>
                  </button>

                  <button 
                    onClick={() => handleAddPreset("Thyroid Panel TSH.pdf", "report", "850 KB")}
                    disabled={isSubmitting}
                    className="text-left w-full p-3 bg-slate-50 dark:bg-slate-950 hover:bg-primary/5 dark:hover:bg-primary/10 hover:border-primary/30 border border-slate-200 dark:border-slate-800 rounded-xl transition-all text-xs font-bold text-on-surface dark:text-slate-200 flex justify-between items-center cursor-pointer"
                  >
                    <span>🧪 Thyroid TSH & Metabolic Panel</span>
                    <span className="text-[10px] text-on-surface-variant dark:text-slate-400">850 KB</span>
                  </button>

                  <button 
                    onClick={() => handleAddPreset("Albuterol Inhaler Refill.png", "prescription", "1.2 MB")}
                    disabled={isSubmitting}
                    className="text-left w-full p-3 bg-slate-50 dark:bg-slate-950 hover:bg-primary/5 dark:hover:bg-primary/10 hover:border-primary/30 border border-slate-200 dark:border-slate-800 rounded-xl transition-all text-xs font-bold text-on-surface dark:text-slate-200 flex justify-between items-center cursor-pointer"
                  >
                    <span>💨 Asthma Inhaler Rx (Albuterol)</span>
                    <span className="text-[10px] text-on-surface-variant dark:text-slate-400">1.2 MB</span>
                  </button>
                </div>
              </div>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-100 dark:border-slate-800/60"></div>
                <span className="flex-shrink mx-4 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">Or Manual entry</span>
                <div className="flex-grow border-t border-slate-100 dark:border-slate-800/60"></div>
              </div>

              <form onSubmit={handleCreateFile} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-2">
                    Document Title
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Complete Metabolic Panel.pdf"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary text-sm font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-2">
                      Category
                    </label>
                    <select 
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-on-surface dark:text-slate-100 focus:outline-none focus:border-primary text-sm font-semibold"
                    >
                      <option value="report">Lab Report</option>
                      <option value="prescription">Prescription</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface-variant dark:text-slate-400 uppercase tracking-wider mb-2">
                      Document Size
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. 2.4 MB"
                      value={newSize}
                      onChange={(e) => setNewSize(e.target.value)}
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
                    className="flex-1 py-3 text-sm font-semibold text-white bg-primary hover:bg-primary-container rounded-xl transition-colors shadow-md shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? "Generating AI Insight..." : "Upload & Analyze"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}
    </motion.div>
  );
}
