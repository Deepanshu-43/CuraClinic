import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { PatientList } from "./components/PatientList";
import { AppointmentManager } from "./components/AppointmentManager";
import { MedicalRecordSystem } from "./components/MedicalRecordSystem";
import { AnalyticsView } from "./components/AnalyticsView";
import { StaffDirectory } from "./components/StaffDirectory";
import { motion, AnimatePresence } from "motion/react";
import { Stethoscope, LogIn, Search, Bell } from "lucide-react";
import { auth, googleProvider, db } from "./lib/firebase";
import { signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import { MedicalInsightsDrawer } from "./components/MedicalInsightsDrawer";
import { Patient, MedicalRecord } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Fetch patients and records for global clinical decision support
  useEffect(() => {
    if (!user) return;

    const loadGlobalData = async () => {
      try {
        // Try Firestore first
        const pSnap = await getDocs(collection(db, "patients"));
        let loadedPatients: Patient[] = pSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as Patient)
        );

        const rSnap = await getDocs(collection(db, "medical_records"));
        let loadedRecords: MedicalRecord[] = rSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as MedicalRecord)
        );

        // If Firestore had 0 documents, fetch from Express REST API
        if (loadedPatients.length === 0) {
          const res = await fetch("/api/patients");
          if (res.ok) {
            loadedPatients = await res.json();
          }
        }
        if (loadedRecords.length === 0) {
          const res = await fetch("/api/records");
          if (res.ok) {
            loadedRecords = await res.json();
          }
        }

        setPatients(loadedPatients);
        setRecords(loadedRecords);
      } catch (err) {
        console.warn("Falling back to Express REST API for global data:", err);
        try {
          const [pRes, rRes] = await Promise.all([
            fetch("/api/patients"),
            fetch("/api/records"),
          ]);
          if (pRes.ok) setPatients(await pRes.json());
          if (rRes.ok) setRecords(await rRes.json());
        } catch (apiErr) {
          console.error("API fetch error:", apiErr);
        }
      }
    };

    loadGlobalData();
  }, [user, activeTab]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden"
        >
          <div className="p-12">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-8 shadow-xl shadow-blue-200">
              <Stethoscope size={32} />
            </div>
            <h1 className="text-3xl font-display font-bold text-slate-900 text-center mb-2 tracking-tight">CuraClinic CRM</h1>
            <p className="text-slate-500 text-center mb-10 leading-relaxed text-sm">
              Empowering healthcare professionals with intelligent clinic management.
            </p>
            
            <button 
              onClick={handleLogin}
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-3 group"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5 invert" alt="Google" />
              Sign in with Google
            </button>
            
            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest leading-loose">Secure Enterprise Healthcare System</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <Dashboard searchQuery={searchQuery} />;
      case "patients": return <PatientList searchQuery={searchQuery} setSearchQuery={setSearchQuery} />;
      case "appointments": return <AppointmentManager searchQuery={searchQuery} />;
      case "records": return <MedicalRecordSystem searchQuery={searchQuery} />;
      case "analytics": return <AnalyticsView />;
      case "staff": return <StaffDirectory searchQuery={searchQuery} />;
      default: return <Dashboard searchQuery={searchQuery} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={(tab) => { setActiveTab(tab); setSearchQuery(""); }} onLogout={handleLogout} user={user} />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Professional Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10 shrink-0">
          <h1 className="text-lg font-bold text-slate-800 capitalize">
            {activeTab.replace(/([A-Z])/g, ' $1').trim()}
          </h1>
          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <input 
                type="text" 
                placeholder="Search resources..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 bg-slate-100 border-none rounded-full py-2 pl-4 pr-10 text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
            
            <div className="flex items-center gap-4">
              <button className="p-2 text-slate-400 hover:text-slate-600 relative transition-colors">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
              </button>
              
              <div className="h-8 w-px bg-slate-200 mx-2"></div>
              
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-900">{user.displayName}</p>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Clinician</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-200 p-0.5 overflow-hidden">
                  <img 
                    src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`} 
                    alt="Profile" 
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto pb-12">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Floating Action Button & AI-powered Medical Insights Drawer */}
      <MedicalInsightsDrawer patients={patients} records={records} />
    </div>
  );
}

