import React from "react";
import { 
  Users, 
  Calendar, 
  LayoutDashboard, 
  ClipboardList, 
  LogOut,
  Stethoscope,
  BarChart3,
  Users2
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { User } from "firebase/auth";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  user: User;
}

export function Sidebar({ activeTab, setActiveTab, onLogout, user }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "patients", label: "Patient Records", icon: Users },
    { id: "appointments", label: "Appointment Calendar", icon: Calendar },
    { id: "records", label: "Medical Reports", icon: ClipboardList },
  ];

  return (
    <aside className="w-64 bg-slate-900 flex flex-col h-full shrink-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white">
          <Stethoscope size={20} />
        </div>
        <span className="text-white font-bold tracking-tight text-lg">CuraCenter</span>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 outline-none",
              activeTab === item.id 
                ? "bg-slate-800 text-white shadow-sm" 
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            )}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
        
        <div className="pt-4 pb-2">
          <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Administration</p>
          <button 
            onClick={() => setActiveTab("analytics")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 outline-none",
              activeTab === "analytics" 
                ? "bg-slate-800 text-white shadow-sm" 
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            )}
          >
            <BarChart3 size={18} />
            Analytics
          </button>
          <button 
            onClick={() => setActiveTab("staff")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 outline-none",
              activeTab === "staff" 
                ? "bg-slate-800 text-white shadow-sm" 
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            )}
          >
            <Users2 size={18} />
            Staff Directory
          </button>
        </div>
      </nav>

      <div className="p-4 mt-auto border-t border-slate-800/50">
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-slate-700 p-0.5 border border-slate-600">
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user.displayName}`} 
                alt="Profile" 
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.displayName}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Clinician</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
