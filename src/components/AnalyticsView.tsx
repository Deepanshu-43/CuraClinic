import React, { useState, useEffect } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Patient, Appointment, MedicalRecord } from "../types";
import { 
  Users, 
  Calendar, 
  ClipboardList, 
  TrendingUp, 
  Activity, 
  PieChart as PieIcon, 
  BarChart as BarIcon, 
  TrendingDown
} from "lucide-react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Cell,
  Pie
} from "recharts";
import { motion } from "motion/react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function AnalyticsView() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        const pSnap = await getDocs(query(collection(db, "patients")));
        const aSnap = await getDocs(query(collection(db, "appointments")));
        const rSnap = await getDocs(query(collection(db, "medical_records")));

        setPatients(pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)));
        setAppointments(aSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
        setRecords(rSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicalRecord)));
      } catch (error) {
        console.error("Error loading analytics data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []);

  // Compute stats
  const totalPatientsCount = patients.length;
  const totalAppointmentsCount = appointments.length;
  const totalRecordsCount = records.length;
  const estimatedRevenue = totalAppointmentsCount * 150; // $150 per consult

  // Patient Gender distribution
  const genderCounts = patients.reduce((acc, curr) => {
    const g = curr.gender || "Other";
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const genderData = Object.keys(genderCounts).map(key => ({
    name: key,
    value: genderCounts[key]
  }));

  // Patient Blood group distribution
  const bloodCounts = patients.reduce((acc, curr) => {
    const bg = curr.bloodGroup || "N/A";
    acc[bg] = (acc[bg] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const bloodData = Object.keys(bloodCounts).map(key => ({
    name: key,
    count: bloodCounts[key]
  })).sort((a,b) => b.count - a.count);

  // Appointment Status distribution
  const statusCounts = appointments.reduce((acc, curr) => {
    const s = curr.status || "Scheduled";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.keys(statusCounts).map(key => ({
    name: key,
    count: statusCounts[key]
  }));

  // Static fallback curves if no data is present, otherwise compile actual appointment timeline
  const getTimelineData = () => {
    if (appointments.length === 0) {
      // Default baseline trend if database is empty
      return [
        { name: "Week 1", Consultations: 0, Records: 0 },
        { name: "Week 2", Consultations: 0, Records: 0 },
        { name: "Week 3", Consultations: 0, Records: 0 },
        { name: "Week 4", Consultations: 0, Records: 0 },
      ];
    }

    // Bucket appointments by week or simplified timeline
    const timelineMap: Record<string, { name: string, Consultations: number, Records: number }> = {};
    
    appointments.forEach(a => {
      // e.g. "2026-04-25"
      const dateStr = a.dateTime ? a.dateTime.split("T")[0] : "";
      if (dateStr) {
        if (!timelineMap[dateStr]) {
          timelineMap[dateStr] = { name: dateStr, Consultations: 0, Records: 0 };
        }
        timelineMap[dateStr].Consultations += 1;
      }
    });

    records.forEach(r => {
      const dateStr = r.date ? r.date.split("T")[0] : "";
      if (dateStr) {
        if (!timelineMap[dateStr]) {
          timelineMap[dateStr] = { name: dateStr, Consultations: 0, Records: 0 };
        }
        timelineMap[dateStr].Records += 1;
      }
    });

    return Object.values(timelineMap)
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(-7); // Last 7 active days
  };

  const timelineData = getTimelineData();

  if (loading) {
    return (
      <div className="p-20 text-center text-slate-400 font-medium italic">
        Analyzing database metrics...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Clinic Analytics</h2>
        <p className="text-slate-500 mt-1">Real-time charts, demographic segments, and operational throughput.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Patient Growth", value: totalPatientsCount < 10 ? `0${totalPatientsCount}` : totalPatientsCount.toString(), desc: "Registered in database", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Booked Visits", value: totalAppointmentsCount < 10 ? `0${totalAppointmentsCount}` : totalAppointmentsCount.toString(), desc: "Appointments ledger", icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Diagnosis Ledger", value: totalRecordsCount < 10 ? `0${totalRecordsCount}` : totalRecordsCount.toString(), desc: "Total diagnostic entries", icon: ClipboardList, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Estimated Billing", value: `$${estimatedRevenue}`, desc: "Based on $150 consultation rate", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between"
          >
            <div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{card.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">{card.desc}</p>
            </div>
            <div className={`p-2.5 rounded-lg ${card.bg} ${card.color}`}>
              <card.icon size={18} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Dynamic Graph Rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Activity Timeline */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6 text-sm uppercase tracking-wider text-slate-400">Activity Timeline (Daily Volume)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="colorConsults" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="Consultations" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorConsults)" />
                <Area type="monotone" dataKey="Records" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-800 mb-6 text-sm uppercase tracking-wider text-slate-400">Gender Distribution</h3>
          {genderData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs italic">
              No demographic data found.
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center">
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {genderData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-4 mt-4 justify-center">
                {genderData.map((g, idx) => (
                  <div key={g.name} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                    <span>{g.name}: {g.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Blood Groups */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 text-sm uppercase tracking-wider text-slate-400">Blood Groups Overview</h3>
          {bloodData.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs italic">
              No patient data logged.
            </div>
          ) : (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bloodData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Appointment Status */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6 text-sm uppercase tracking-wider text-slate-400">Appointment Status Ratios</h3>
          {statusData.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs italic">
              No appointments scheduled.
            </div>
          ) : (
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
