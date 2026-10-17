import React, { useState, useEffect } from "react";
import { collection, query, getDocs, addDoc, where, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { MedicalRecord, Patient } from "../types";
import { handleFirestoreError, OperationType } from "../lib/utils";
import { 
  ClipboardList, 
  Plus, 
  Sparkles, 
  Loader2, 
  History, 
  FileText,
  Activity,
  User
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";

interface MedicalRecordSystemProps {
  searchQuery?: string;
}

export function MedicalRecordSystem({ searchQuery = "" }: MedicalRecordSystemProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredRecords = records.filter(r => {
    if (!searchQuery) return true;
    return r.diagnosis.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.prescriptions.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.treatment && r.treatment.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.aiSummary && r.aiSummary.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const [newRecord, setNewRecord] = useState({
    diagnosis: "",
    treatment: "",
    prescriptions: "",
    vitals: {
      bp: "",
      temp: "",
      weight: ""
    }
  });

  useEffect(() => {
    const fetchPatients = async () => {
      const path = "patients";
      try {
        const snap = await getDocs(collection(db, path));
        setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() } as Patient)));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    };
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      const fetchRecords = async () => {
        setLoading(true);
        const path = "medical_records";
        try {
          const q = query(
            collection(db, path), 
            where("patientId", "==", selectedPatientId),
            orderBy("date", "desc")
          );
          const snap = await getDocs(q);
          setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as MedicalRecord)));
        } catch (error) {
          handleFirestoreError(error, OperationType.LIST, path);
        } finally {
          setLoading(false);
        }
      };
      fetchRecords();
    } else {
      setRecords([]);
    }
  }, [selectedPatientId]);
  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) return;

    const path = "medical_records";
    try {
      const patient = patients.find(p => p.id === selectedPatientId);
      let aiSummary = "";

      // Generate AI summary via server-side Gemini endpoint
      if (newRecord.diagnosis) {
        setIsGeneratingAI(true);
        try {
          const res = await fetch("/api/insights/query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: `Generate a concise clinical summary for this newly added medical record. Diagnosis: ${newRecord.diagnosis}. Treatment: ${newRecord.treatment}. Prescriptions: ${newRecord.prescriptions}. Vitals: BP ${newRecord.vitals.bp}, Temp ${newRecord.vitals.temp}, Weight ${newRecord.vitals.weight}. Highlight key diagnoses, action items, and follow-up guidance.`,
              patient,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            aiSummary = data.insight || "";
          }
        } catch (err) {
          console.error("AI summarization failed via server route:", err);
        } finally {
          setIsGeneratingAI(false);
        }
      }

      await addDoc(collection(db, path), {
        patientId: selectedPatientId,
        date: new Date().toISOString(),
        ...newRecord,
        doctorName: "Dr. Smith",
        aiSummary
      });

      setShowAddModal(false);
      setNewRecord({
        diagnosis: "",
        treatment: "",
        prescriptions: "",
        vitals: { bp: "", temp: "", weight: "" }
      });
      // Refresh records
      const q = query(
        collection(db, path), 
        where("patientId", "==", selectedPatientId),
        orderBy("date", "desc")
      );
      const snap = await getDocs(q);
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() } as MedicalRecord)));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Clinical Records</h2>
          <p className="text-slate-500 text-sm mt-1">Comprehensive historical diagnostic ledger.</p>
        </div>
        <div className="flex items-center gap-4">
          <select 
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            value={selectedPatientId}
            onChange={e => setSelectedPatientId(e.target.value)}
          >
            <option value="">Select Patient Ledger</option>
            {patients.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {selectedPatientId && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-md"
            >
              <Plus size={18} />
              New Diagnostic Entry
            </button>
          )}
        </div>
      </div>

      {!selectedPatientId ? (
        <div className="bg-white rounded-3xl p-20 text-center border border-slate-100 shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
            <ClipboardList size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">No Patient Selected</h3>
          <p className="text-slate-500">Choose a patient from the dropdown to manage their medical history.</p>
        </div>
      ) : loading ? (
        <div className="p-12 text-center">
          <Loader2 className="animate-spin mx-auto text-primary-500 mb-4" size={32} />
          <p className="text-slate-500">Fetching medical history...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <User size={18} className="text-primary-500" />
                Patient Profile
              </h3>
              {patients.find(p => p.id === selectedPatientId) && (
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-sm text-slate-500">Name</span>
                    <span className="text-sm font-semibold">{patients.find(p => p.id === selectedPatientId)?.name}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-sm text-slate-500">DOB</span>
                    <span className="text-sm font-semibold">{patients.find(p => p.id === selectedPatientId)?.dob}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-sm text-slate-500">Blood Group</span>
                    <span className="text-sm font-semibold text-red-600">{patients.find(p => p.id === selectedPatientId)?.bloodGroup || 'N/A'}</span>
                  </div>
                  <div className="space-y-2 pt-2">
                    <span className="text-sm text-slate-500">Allergies</span>
                    <div className="flex flex-wrap gap-2">
                      {patients.find(p => p.id === selectedPatientId)?.allergies.length ? (
                        patients.find(p => p.id === selectedPatientId)?.allergies.map(a => (
                          <span key={a} className="px-2 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-md">{a}</span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">None reported</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <History size={20} className="text-primary-500" />
              History Log
            </h3>
            
            {filteredRecords.length === 0 ? (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                <p className="text-slate-500 font-medium">No medical records found for this patient.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredRecords.map((record) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={record.id}
                    className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
                  >
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                          <FileText size={20} className="text-primary-500" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{format(new Date(record.date), "MMMM dd, yyyy")}</p>
                          <p className="text-xs text-slate-500">Entry by {record.doctorName}</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">BP</p>
                          <p className="text-xs font-bold text-slate-700">{record.vitals.bp || '-'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase font-bold">Weight</p>
                          <p className="text-xs font-bold text-slate-700">{record.vitals.weight || '-'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-8 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Diagnosis</h4>
                          <p className="text-slate-800 leading-relaxed">{record.diagnosis}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Prescriptions</h4>
                          <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{record.prescriptions}</p>
                        </div>
                      </div>
                      
                      {record.treatment && (
                        <div className="pt-4 border-t border-slate-50">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Treatment Plan</h4>
                          <p className="text-slate-800 leading-relaxed">{record.treatment}</p>
                        </div>
                      )}

                      {record.aiSummary && (
                        <div className="mt-8 p-6 bg-slate-900 rounded-2xl text-slate-300 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                            <Sparkles size={40} className="text-primary-400" />
                          </div>
                          <div className="flex items-center gap-2 mb-4 text-primary-400">
                            <Sparkles size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">AI Medical Summary</span>
                          </div>
                          <div className="prose prose-sm prose-invert max-w-none">
                            <ReactMarkdown>{record.aiSummary}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-display font-bold text-slate-800">New Clinical Entry</h3>
                  <p className="text-sm text-slate-500">Adding record for {patients.find(p => p.id === selectedPatientId)?.name}</p>
                </div>
                {isGeneratingAI && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-full animate-pulse">
                    <Sparkles size={16} className="animate-bounce" />
                    <span className="text-xs font-bold">AI Summarizing...</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 pt-6">
                <form id="medicalForm" onSubmit={handleAddRecord} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Blood Pressure</label>
                      <input 
                        type="text" 
                        placeholder="120/80"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                        value={newRecord.vitals.bp}
                        onChange={e => setNewRecord({...newRecord, vitals: {...newRecord.vitals, bp: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Temperature (°F)</label>
                      <input 
                        type="text" 
                        placeholder="98.6"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                        value={newRecord.vitals.temp}
                        onChange={e => setNewRecord({...newRecord, vitals: {...newRecord.vitals, temp: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase">Weight (kg)</label>
                      <input 
                        type="text" 
                        placeholder="70"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                        value={newRecord.vitals.weight}
                        onChange={e => setNewRecord({...newRecord, vitals: {...newRecord.vitals, weight: e.target.value}})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Diagnosis / Chief Complaint</label>
                    <textarea 
                      required
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      value={newRecord.diagnosis}
                      onChange={e => setNewRecord({...newRecord, diagnosis: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Treatment Plan</label>
                    <textarea 
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      value={newRecord.treatment}
                      onChange={e => setNewRecord({...newRecord, treatment: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Prescriptions / Medications</label>
                    <textarea 
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      value={newRecord.prescriptions}
                      onChange={e => setNewRecord({...newRecord, prescriptions: e.target.value})}
                    />
                  </div>
                </form>
              </div>

              <div className="p-8 border-t border-slate-100 flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Discard
                </button>
                <button 
                  form="medicalForm"
                  type="submit"
                  disabled={isGeneratingAI}
                  className="flex-1 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGeneratingAI ? <Loader2 className="animate-spin" size={20} /> : null}
                  Save & Generate AI Summary
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
