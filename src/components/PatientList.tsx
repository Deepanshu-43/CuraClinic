import React, { useState, useEffect } from "react";
import { collection, query, getDocs, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Patient } from "../types";
import { Plus, Search, Filter, Mail, Phone } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { handleFirestoreError, OperationType } from "../lib/utils";

interface PatientListProps {
  searchQuery?: string;
  setSearchQuery?: (val: string) => void;
}

export function PatientList({ searchQuery: propsSearchQuery, setSearchQuery: propsSetSearchQuery }: PatientListProps = {}) {
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const searchQuery = propsSearchQuery !== undefined ? propsSearchQuery : localSearchQuery;
  const setSearchQuery = propsSetSearchQuery !== undefined ? propsSetSearchQuery : setLocalSearchQuery;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newPatient, setNewPatient] = useState({
    name: "",
    email: "",
    phone: "",
    dob: "",
    gender: "Male" as const,
    bloodGroup: "",
    address: "",
    allergies: [] as string[]
  });

  const fetchPatients = async () => {
    setLoading(true);
    const path = "patients";
    try {
      const q = query(collection(db, path));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
      setPatients(docs);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = "patients";
    try {
      await addDoc(collection(db, path), {
        ...newPatient,
        createdAt: new Date().toISOString(),
      });
      setShowAddModal(false);
      setNewPatient({
        name: "",
        email: "",
        phone: "",
        dob: "",
        gender: "Male",
        bloodGroup: "",
        address: "",
        allergies: []
      });
      fetchPatients();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-800">Patients</h2>
          <p className="text-slate-500 mt-1">Manage and view your patient database.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200"
        >
          <Plus size={20} />
          Add New Patient
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-3 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors w-full sm:w-auto justify-center">
          <Filter size={20} />
          Filters
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <th className="px-6 py-4">Patient Details</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4">Background</th>
                <th className="px-6 py-4">Blood Group</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-400 font-medium italic">Synchronizing patient data...</td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-400 font-medium">No patient records match your search criteria.</td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                          {patient.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{patient.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">ID: #PT-{patient.id?.slice(-4).toUpperCase()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">
                      <div className="flex items-center gap-2 mb-1">
                        <Mail size={14} className="text-slate-300" />
                        {patient.email}
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-slate-300" />
                        {patient.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-700 font-semibold">{patient.gender}</span>
                        <span className="text-slate-400 text-xs">{patient.dob}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded text-[10px] font-bold border border-rose-100">
                        {patient.bloodGroup || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span className="font-semibold text-slate-700">Verified</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-slate-400 hover:text-slate-600 font-bold tracking-widest px-2 py-1 rounded hover:bg-slate-100 transition-all">
                        •••
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-2xl font-display font-bold text-slate-800 mb-6">Add New Patient</h3>
                <form onSubmit={handleAddPatient} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Full Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      value={newPatient.name}
                      onChange={e => setNewPatient({...newPatient, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Email Address</label>
                    <input 
                      required
                      type="email" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      value={newPatient.email}
                      onChange={e => setNewPatient({...newPatient, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                    <input 
                      required
                      type="tel" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      value={newPatient.phone}
                      onChange={e => setNewPatient({...newPatient, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Date of Birth</label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      value={newPatient.dob}
                      onChange={e => setNewPatient({...newPatient, dob: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Gender</label>
                    <select 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      value={newPatient.gender}
                      onChange={e => setNewPatient({...newPatient, gender: e.target.value as any})}
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Blood Group</label>
                    <input 
                      type="text" 
                      placeholder="e.g. A+"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      value={newPatient.bloodGroup}
                      onChange={e => setNewPatient({...newPatient, bloodGroup: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Address</label>
                    <textarea 
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      value={newPatient.address}
                      onChange={e => setNewPatient({...newPatient, address: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2 flex gap-4 pt-4">
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
                      Save Patient
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
