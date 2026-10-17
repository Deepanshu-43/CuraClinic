import React, { useState, useEffect } from "react";
import { collection, query, getDocs, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Staff } from "../types";
import { Plus, Search, Mail, Phone, ShieldCheck, ShieldAlert, Award, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { handleFirestoreError, OperationType } from "../lib/utils";

interface StaffDirectoryProps {
  searchQuery?: string;
}

const DEFAULT_STAFF: Staff[] = [
  {
    id: "default-1",
    name: "Dr. Jane Smith",
    role: "Doctor",
    specialty: "Chief Physician / Cardiology",
    email: "jane.smith@curacenter.com",
    phone: "+1 (555) 019-2834",
    availability: "Active",
    createdAt: new Date().toISOString()
  },
  {
    id: "default-2",
    name: "Dr. Alex Rivera",
    role: "Doctor",
    specialty: "Pediatrics",
    email: "alex.rivera@curacenter.com",
    phone: "+1 (555) 019-5829",
    availability: "Active",
    createdAt: new Date().toISOString()
  },
  {
    id: "default-3",
    name: "Sarah Connor",
    role: "Nurse",
    specialty: "Head Emergency Nurse",
    email: "sarah.connor@curacenter.com",
    phone: "+1 (555) 019-9238",
    availability: "Active",
    createdAt: new Date().toISOString()
  },
  {
    id: "default-4",
    name: "Mark Johnson",
    role: "Administrator",
    specialty: "Clinic Operations",
    email: "mark.johnson@curacenter.com",
    phone: "+1 (555) 019-1122",
    availability: "Off Duty",
    createdAt: new Date().toISOString()
  }
];

export function StaffDirectory({ searchQuery = "" }: StaffDirectoryProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const [newMember, setNewMember] = useState({
    name: "",
    role: "Doctor" as Staff["role"],
    specialty: "",
    email: "",
    phone: "",
    availability: "Active" as Staff["availability"]
  });

  const fetchStaff = async () => {
    setLoading(true);
    const path = "staff";
    try {
      const q = query(collection(db, path));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
      
      // Merge with default staff so we always have a gorgeous pre-populated list
      const merged = [...DEFAULT_STAFF, ...docs];
      // Deduplicate by email just in case
      const unique = merged.filter((item, index, self) =>
        index === self.findIndex((t) => t.email.toLowerCase() === item.email.toLowerCase())
      );
      setStaff(unique);
    } catch (error) {
      console.error("Error fetching staff:", error);
      // Fallback to default staff on error
      setStaff(DEFAULT_STAFF);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = "staff";
    try {
      await addDoc(collection(db, path), {
        ...newMember,
        createdAt: new Date().toISOString(),
      });
      setShowAddModal(false);
      setNewMember({
        name: "",
        role: "Doctor",
        specialty: "",
        email: "",
        phone: "",
        availability: "Active"
      });
      fetchStaff();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const activeSearch = searchQuery || localSearch;

  const filteredStaff = staff.filter(member => {
    const matchesSearch = 
      member.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
      member.specialty.toLowerCase().includes(activeSearch.toLowerCase()) ||
      member.email.toLowerCase().includes(activeSearch.toLowerCase()) ||
      member.role.toLowerCase().includes(activeSearch.toLowerCase());

    const matchesRole = roleFilter === "All" || member.role === roleFilter;
    const matchesStatus = statusFilter === "All" || member.availability === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Staff Directory</h2>
          <p className="text-slate-500 mt-1">Manage clinician profiles, specialties, and on-duty rosters.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-md"
        >
          <Plus size={18} />
          Register Clinician
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search staff by name, specialty, or role..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Roles</option>
            <option value="Doctor">Doctor</option>
            <option value="Nurse">Nurse</option>
            <option value="Assistant">Assistant</option>
            <option value="Administrator">Administrator</option>
          </select>

          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Availabilities</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Off Duty">Off Duty</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-20 text-center text-slate-400 font-medium italic">
          Loading clinical roster...
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="p-20 text-center text-slate-400 font-medium">
          No clinicians match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredStaff.map((member, idx) => (
            <motion.div
              key={member.id || idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-sm uppercase">
                    {member.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight border ${
                    member.availability === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                    member.availability === "On Leave" ? "bg-amber-50 text-amber-700 border-amber-100" :
                    "bg-slate-50 text-slate-600 border-slate-100"
                  }`}>
                    {member.availability}
                  </span>
                </div>

                <div className="mt-4">
                  <h3 className="font-bold text-slate-800 text-base">{member.name}</h3>
                  <p className="text-xs font-semibold text-blue-600 uppercase mt-0.5 tracking-wide">{member.role}</p>
                  
                  <div className="flex items-center gap-1.5 mt-3 text-slate-500 text-xs font-medium">
                    <Award size={14} className="text-slate-400 shrink-0" />
                    <span>{member.specialty}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 space-y-1.5 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <Mail size={12} className="text-slate-400 shrink-0" />
                  <span className="truncate">{member.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={12} className="text-slate-400 shrink-0" />
                  <span>{member.phone}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Register Clinician Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-lg">Register New Clinician</h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddMember} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input 
                    type="text"
                    required
                    value={newMember.name}
                    onChange={e => setNewMember({...newMember, name: e.target.value})}
                    placeholder="e.g. Dr. Arthur Dent"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Role</label>
                    <select 
                      value={newMember.role}
                      onChange={e => setNewMember({...newMember, role: e.target.value as Staff["role"]})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="Doctor">Doctor</option>
                      <option value="Nurse">Nurse</option>
                      <option value="Assistant">Assistant</option>
                      <option value="Administrator">Administrator</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Availability</label>
                    <select 
                      value={newMember.availability}
                      onChange={e => setNewMember({...newMember, availability: e.target.value as Staff["availability"]})}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="Active">Active</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Off Duty">Off Duty</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Specialty / Department</label>
                  <input 
                    type="text"
                    required
                    value={newMember.specialty}
                    onChange={e => setNewMember({...newMember, specialty: e.target.value})}
                    placeholder="e.g. Neurology, Pediatrics"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                    <input 
                      type="email"
                      required
                      value={newMember.email}
                      onChange={e => setNewMember({...newMember, email: e.target.value})}
                      placeholder="name@clinic.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Phone Number</label>
                    <input 
                      type="tel"
                      required
                      value={newMember.phone}
                      onChange={e => setNewMember({...newMember, phone: e.target.value})}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-3 justify-end">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white font-bold text-xs uppercase rounded-lg hover:bg-blue-700 shadow-md"
                  >
                    Register
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
