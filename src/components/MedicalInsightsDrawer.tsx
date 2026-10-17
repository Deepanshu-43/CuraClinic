import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  X,
  Send,
  Stethoscope,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Copy,
  Check,
  RotateCcw,
  User as UserIcon,
  Activity,
  Pill,
  ChevronRight,
  Download,
  Flame,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Patient, MedicalRecord } from "../types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  promptType?: string;
  patientName?: string;
}

interface MedicalInsightsDrawerProps {
  patients: Patient[];
  records: MedicalRecord[];
  activePatientId?: string;
  onSelectPatient?: (id: string) => void;
}

export function MedicalInsightsDrawer({
  patients,
  records,
  activePatientId,
  onSelectPatient,
}: MedicalInsightsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(activePatientId || "");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `### Welcome to CuraClinic Medical Insights
I am your **AI Clinical Assistant**, powered by Gemini 3.8 Flash.

Select a patient from the dropdown above or select a clinical quick action to:
* **Summarize** longitudinal clinical history & recent admissions
* **Cross-examine** medication lists against documented allergies
* **Flag** abnormal vital trends & cardiovascular risks
* **Draft** evidence-based follow-up care plans`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync selected patient if passed from parent
  useEffect(() => {
    if (activePatientId) {
      setSelectedPatientId(activePatientId);
    } else if (!selectedPatientId && patients.length > 0) {
      setSelectedPatientId(patients[0].id || "");
    }
  }, [activePatientId, patients]);

  // Keyboard shortcut ⌘J or Ctrl+J to toggle drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const currentPatient = patients.find((p) => p.id === selectedPatientId);
  const patientRecords = records.filter((r) => r.patientId === selectedPatientId);

  const handleSendQuery = async (customQuery?: string, promptType?: string) => {
    const textToSend = customQuery || query.trim();
    if (!textToSend && !promptType) return;

    setError(null);
    setLoading(true);

    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: textToSend || (promptType ? `Run ${promptType} check` : ""),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      promptType,
      patientName: currentPatient?.name,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customQuery) setQuery("");

    try {
      const response = await fetch("/api/insights/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToSend,
          promptType,
          patient: currentPatient,
          records: patientRecords,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate AI insights");
      }

      const assistantMessage: Message = {
        id: `ast-${Date.now()}`,
        role: "assistant",
        content: data.insight,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        patientName: currentPatient?.name,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("AI Insights Error:", err);
      setError(err.message || "An error occurred while connecting to Gemini.");
      const errorMessage: Message = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `**Clinical Engine Notice:** Unable to generate response. ${err.message || "Please check server connectivity."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportSummary = () => {
    const exportText = messages
      .filter((m) => m.id !== "welcome")
      .map(
        (m) =>
          `[${m.timestamp}] ${m.role === "user" ? "CLINICIAN" : "AI MEDICAL INSIGHTS"}:\n${m.content}\n\n`
      )
      .join("----------------------------------------\n\n");

    const blob = new Blob([exportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cura-clinic-insights-${currentPatient ? currentPatient.name.replace(/\s+/g, "_") : "general"}-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const quickPrompts = [
    {
      id: "summary",
      label: "Clinical Course Summary",
      icon: FileText,
      description: "Comprehensive EHR summary",
    },
    {
      id: "interactions",
      label: "Medication & Allergy Check",
      icon: Pill,
      description: "Cross-reference contraindications",
    },
    {
      id: "risks",
      label: "Flag Vitals & Clinical Risks",
      icon: AlertTriangle,
      description: "Detect vitals abnormalities",
    },
    {
      id: "followup",
      label: "Follow-up & Monitoring Plan",
      icon: ShieldCheck,
      description: "Guideline-directed care plan",
    },
  ];

  return (
    <>
      {/* FLOATING ACTION BUTTON (FAB) */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        <motion.button
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex items-center gap-3 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl shadow-blue-500/25 border border-blue-400/30 transition-all group"
          aria-label="Open Medical Insights AI Panel"
        >
          {/* Subtle pulse indicator */}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>

          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-200 group-hover:rotate-12 transition-transform" />
            <span className="text-sm font-semibold tracking-tight whitespace-nowrap">Medical Insights</span>
          </div>

          <span className="hidden sm:inline-flex items-center text-[10px] bg-blue-800/60 text-blue-200 px-2 py-0.5 rounded font-mono font-medium">
            ⌘J
          </span>
        </motion.button>
      </div>

      {/* SLIDE-OVER SIDE DRAWER */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="w-screen max-w-md md:max-w-xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200"
              >
                {/* DRAWER HEADER */}
                <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                      <Stethoscope className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-white tracking-tight">AI Medical Insights</h2>
                        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan-400 bg-cyan-950/80 border border-cyan-800/60 px-2 py-0.5 rounded">
                          Gemini 3.8
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">Clinical decision support grounded in EHR data</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleExportSummary}
                      title="Export consultation transcript"
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setMessages([
                          {
                            id: "welcome-reset",
                            role: "assistant",
                            content: "Conversation history cleared. Ready for new clinical inquiry.",
                            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                          },
                        ])
                      }
                      title="Clear session"
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsOpen(false)}
                      title="Close drawer"
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* PATIENT CONTEXT SELECTOR BAR */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <UserIcon className="w-3.5 h-3.5 text-blue-600" />
                      Active Patient Focus
                    </label>
                    <span className="text-xs text-slate-500 font-mono">
                      {patientRecords.length} {patientRecords.length === 1 ? "record" : "records"} loaded
                    </span>
                  </div>

                  <select
                    value={selectedPatientId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedPatientId(newId);
                      if (onSelectPatient) onSelectPatient(newId);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-xs"
                  >
                    <option value="">General Clinic Query (No specific patient)</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — DOB: {p.dob} (Blood: {p.bloodGroup || "N/A"})
                      </option>
                    ))}
                  </select>

                  {/* ACTIVE PATIENT SUMMARY STRIP */}
                  {currentPatient && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{currentPatient.name}</span>
                        <span className="text-slate-500 font-mono">
                          {currentPatient.gender} · Born {currentPatient.dob}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600">
                        <span>
                          Blood: <strong className="font-mono text-slate-800">{currentPatient.bloodGroup || "Unknown"}</strong>
                        </span>
                        <span>·</span>
                        <span>
                          Allergies:{" "}
                          <strong className={currentPatient.allergies?.length ? "text-amber-700" : "text-emerald-700"}>
                            {currentPatient.allergies && currentPatient.allergies.length > 0
                              ? currentPatient.allergies.join(", ")
                              : "No known allergies"}
                          </strong>
                        </span>
                      </div>

                      {patientRecords.length > 0 && patientRecords[0].vitals && (
                        <div className="pt-1.5 border-t border-slate-100 flex items-center gap-3 text-slate-500 font-mono text-[11px]">
                          <span>BP: {patientRecords[0].vitals.bp}</span>
                          <span>·</span>
                          <span>Temp: {patientRecords[0].vitals.temp}</span>
                          <span>·</span>
                          <span>Wt: {patientRecords[0].vitals.weight}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* QUICK ACTION PROMPT CHIPS */}
                <div className="px-4 py-3 bg-slate-100/70 border-b border-slate-200 shrink-0">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Clinical Action Prompts
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {quickPrompts.map((p) => {
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.id}
                          onClick={() => handleSendQuery(undefined, p.id)}
                          disabled={loading}
                          className="flex items-center gap-2 p-2 bg-white hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 rounded-lg text-left transition-all text-xs text-slate-800 group disabled:opacity-50"
                        >
                          <div className="w-7 h-7 rounded-md bg-slate-100 group-hover:bg-blue-100/70 flex items-center justify-center text-slate-600 group-hover:text-blue-700 shrink-0 transition-colors">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="truncate">
                            <div className="font-semibold truncate">{p.label}</div>
                            <div className="text-[10px] text-slate-500 truncate">{p.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CONVERSATION MESSAGE LIST */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                  {messages.map((m) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-600">
                          {m.role === "user" ? "You" : "CuraClinic AI"}
                        </span>
                        {m.patientName && <span>for {m.patientName}</span>}
                        <span>·</span>
                        <span className="font-mono">{m.timestamp}</span>
                      </div>

                      <div
                        className={`relative max-w-[92%] rounded-2xl px-4 py-3 text-sm shadow-xs ${
                          m.role === "user"
                            ? "bg-blue-600 text-white rounded-br-xs"
                            : "bg-white text-slate-900 border border-slate-200/80 rounded-bl-xs"
                        }`}
                      >
                        {m.role === "assistant" ? (
                          <div className="prose prose-sm prose-slate max-w-none text-slate-800 leading-relaxed">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        )}

                        {m.role === "assistant" && m.id !== "welcome" && (
                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="font-mono">Grounded EHR Analysis</span>
                            <button
                              onClick={() => handleCopy(m.id, m.content)}
                              className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors"
                            >
                              {copiedId === m.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-600 font-medium">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}

                  {loading && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                        <Sparkles className="w-4 h-4 animate-spin text-blue-600" />
                      </div>
                      <div className="space-y-1.5 flex-1">
                        <div className="text-xs font-semibold text-slate-800">
                          Synthesizing Clinical Records with Gemini 3.8 Flash...
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></span>
                          <span
                            className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                            style={{ animationDelay: "150ms" }}
                          ></span>
                          <span
                            className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                            style={{ animationDelay: "300ms" }}
                          ></span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* CLINICAL INPUT BAR */}
                <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendQuery();
                    }}
                    className="relative flex items-center"
                  >
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={
                        currentPatient
                          ? `Query ${currentPatient.name.split(" ")[0]}'s records (e.g. check allergy risks)...`
                          : "Type a clinical question or drug query..."
                      }
                      disabled={loading}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl py-3 pl-4 pr-12 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                    <button
                      type="submit"
                      disabled={loading || !query.trim()}
                      className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </form>

                  {/* CLINICAL DISCLAIMER */}
                  <div className="mt-2 text-center">
                    <p className="text-[10px] text-slate-600 leading-tight">
                      Decision Support: Clinical judgment required. Verify medications and dosages against institutional formulary.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
