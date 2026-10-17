import React, { useState, useEffect } from "react";
import { collection, query, getDocs, addDoc, orderBy } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Appointment, Patient } from "../types";
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format, addDays, startOfWeek, eachDayOfInterval } from "date-fns";
import { handleFirestoreError, OperationType } from "../lib/utils";

interface AppointmentManagerProps {
  searchQuery?: string;
}

export function AppointmentManager({ searchQuery = "" }: AppointmentManagerProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [newAppt, setNewAppt] = useState({
    patientId: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "09:00",
    reason: "",
    notes: ""
  });

  const fetchData = async () => {
    setLoading(true);
    const apptsPath = "appointments";
    const patientsPath = "patients";
    try {
      const apptsQ = query(collection(db, apptsPath), orderBy("dateTime", "asc"));
      const apptsSnap = await getDocs(apptsQ);
      setAppointments(apptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));

      const patientsSnap = await getDocs(collection(db, patientsPath));
      setPatients(patientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
    } catch (error) {
      // Trying to be specific, but if it fails we just log it
      console.error("Data fetch error", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === newAppt.patientId);
    if (!patient) return;

    const path = "appointments";
    try {
      await addDoc(collection(db, path), {
        patientId: newAppt.patientId,
        patientName: patient.name,
        doctorName: "Dr. Smith", // Hardcoded for now
        dateTime: `${newAppt.date}T${newAppt.time}:00`,
        status: "Scheduled",
        reason: newAppt.reason,
        notes: newAppt.notes,
        createdAt: new Date().toISOString()
      });
      setShowAddModal(false);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const weekDays = eachDayOfInterval({
    start: startOfWeek(selectedDate),
    end: addDays(startOfWeek(selectedDate), 6)
  });

  const filteredAppointments = appointments.filter(a => {
    const matchesDay = a.dateTime.startsWith(format(selectedDate, "yyyy-MM-dd"));
    const matchesSearch = !searchQuery || 
      a.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.notes && a.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.doctorName && a.doctorName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDay && matchesSearch;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-800">Appointments</h2>
          <p className="text-slate-500 mt-1">Schedule and manage visits.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-clinic-teal text-white rounded-xl font-semibold hover:bg-teal-600 transition-all shadow-lg shadow-teal-100"
        >
          <Plus size={20} />
          New Appointment
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-800">Calendar</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center mb-4">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
                <span key={`${d}-${idx}`} className="text-xs font-bold text-slate-400 uppercase">{d}</span>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map(day => {
                const isSelected = format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                const hasAppt = appointments.some(a => a.dateTime.startsWith(format(day, "yyyy-MM-dd")));
                
                return (
                  <button
                    key={day.toString()}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      relative p-3 rounded-xl text-sm font-medium transition-all
                      ${isSelected ? 'bg-primary-600 text-white shadow-lg' : 'hover:bg-slate-50 text-slate-600'}
                    `}
                  >
                    {format(day, "d")}
                    {hasAppt && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">Day Summary</h3>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-500">Total Visits</span>
                <span className="font-bold text-slate-800">{filteredAppointments.length}</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-500">First Slot</span>
                <span className="font-bold text-slate-800">09:00 AM</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="text-sm text-slate-500">Last Slot</span>
                <span className="font-bold text-slate-800">05:30 PM</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold text-slate-800">
              {format(selectedDate, "EEEE, MMMM do")}
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading schedule...</div>
          ) : filteredAppointments.length === 0 ? (
            <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Calendar size={32} />
              </div>
              <p className="text-slate-500 font-medium">No appointments scheduled for this day.</p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-primary-600 font-semibold hover:underline"
              >
                Schedule one now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((appt) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={appt.id}
                  className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-20 text-center border-r border-slate-100 pr-6">
                      <p className="text-sm font-bold text-slate-800">{format(new Date(appt.dateTime), "h:mm")}</p>
                      <p className="text-xs font-medium text-slate-400 uppercase">{format(new Date(appt.dateTime), "a")}</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${appt.status === 'Completed' ? 'bg-emerald-500' : 'bg-primary-500'}`} />
                        <h4 className="font-bold text-slate-800">{appt.patientName}</h4>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-1">{appt.reason}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-slate-50 text-slate-600 text-xs font-semibold rounded-full border border-slate-100">
                        {appt.status}
                      </span>
                      <button className="p-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

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
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-2xl font-display font-bold text-slate-800 mb-6">Schedule Visit</h3>
                <form onSubmit={handleCreateAppointment} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Patient</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      value={newAppt.patientId}
                      onChange={e => setNewAppt({...newAppt, patientId: e.target.value})}
                    >
                      <option value="">Select a patient</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 text-center block">Date</label>
                      <input 
                        required
                        type="date"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                        value={newAppt.date}
                        onChange={e => setNewAppt({...newAppt, date: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 text-center block">Time</label>
                      <input 
                        required
                        type="time"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                        value={newAppt.time}
                        onChange={e => setNewAppt({...newAppt, time: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Reason for visit</label>
                    <input 
                      required
                      type="text"
                      placeholder="e.g. Regular check-up"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      value={newAppt.reason}
                      onChange={e => setNewAppt({...newAppt, reason: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Notes (Optional)</label>
                    <textarea 
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      value={newAppt.notes}
                      onChange={e => setNewAppt({...newAppt, notes: e.target.value})}
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
                    >
                      Schedule
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
