// src/layouts/MobileLayout.tsx
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Menu, Bell, X, LogOut, LayoutDashboard, Bike, Plus } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuthStore } from "../stores/useAuthStore";
import ConfirmAlert from "../components/ConfirmAlert";
import { onMessage } from "firebase/messaging";
import { messaging } from "../firebase/config";
import { useEffect } from "react";

export default function MobileLayout() {
  const navigate = useNavigate();
  const { logout } = useAuthStore(); // Zustand la irunthu edukurom
  
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const [hasNewAlert, setHasNewAlert] = useState(false);

useEffect(() => {
    if (!messaging) return;
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("🔥 Payload vanthuduchu!", payload);
      setHasNewAlert(true); 

      // Ippo try block podurom, appo entha error vanthalum console la theriya paduthidum
      try {
        if (Notification.permission === 'granted' && payload.notification) {
          const title = payload.notification.title || 'MotoTrack Alert';
          const body = payload.notification.body || 'New update received';
          
          new Notification(title, {
            body: body,
            // Icon-ah vite.svg nu thedaama default logo podurom
            icon: 'https://cdn-icons-png.flaticon.com/512/2950/2950664.png' 
          });
        }
      } catch (e) {
        console.error("Popup kaaturathula problem:", e);
      }
    });
    return () => unsubscribe();
  }, []);

  // Actual Logout Logic
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout(); // Firebase sign out aagum
      navigate("/login"); // Login page ku poidum
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutAlert(false);
    }
  };

  return (
    <div className="fixed w-full h-full flex items-center justify-center overflow-hidden bg-slate-100">
      <div className={cn(
        "relative z-10 w-full h-full flex overflow-hidden bg-white",
        "sm:w-full sm:max-w-[420px] sm:h-[90vh] sm:max-h-[850px] sm:rounded-[2.5rem] sm:shadow-2xl sm:border-[8px] border-slate-300"
      )}>
        
        {/* 1. Left Sidebar Drawer */}
        <div className={cn(
          "absolute inset-y-0 left-0 w-[80%] bg-white flex flex-col z-[60] border-r border-slate-200 shadow-2xl transition-transform duration-300",
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">JP BIKE Admin</h2>
            <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Management Portal</p>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <button onClick={() => { navigate("/"); setIsDrawerOpen(false); }} className="flex items-center w-full p-4 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold gap-4 cursor-pointer border-none bg-transparent">
              <LayoutDashboard size={20} className="text-slate-400" /> Dashboard
            </button>
            <button onClick={() => { navigate("/inventory"); setIsDrawerOpen(false); }} className="flex items-center w-full p-4 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold gap-4 cursor-pointer border-none bg-transparent">
              <Bike size={20} className="text-slate-400" /> Inventory
            </button>
            <button onClick={() => { navigate("/add-bike"); setIsDrawerOpen(false); }} className="flex items-center w-full p-4 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold gap-4 cursor-pointer border-none bg-transparent">
            <div className="bg-slate-900 text-white p-1 rounded-md"><Plus size={16} /></div> Add New Bike
            </button>
          </div>
          
          {/* Logout Button trigger */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
             <button 
                onClick={() => {
                  setIsDrawerOpen(false);
                  setShowLogoutAlert(true); // Alert box open aagum
                }}
                className="flex items-center w-full p-4 rounded-xl text-red-500 font-bold hover:bg-red-50 gap-4 cursor-pointer border-none bg-transparent"
             >
                <LogOut size={20} /> Logout
             </button>
          </div>
        </div>

        {isDrawerOpen && <div onClick={() => setIsDrawerOpen(false)} className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm cursor-pointer" />}

        {/* 2. Main Content Area */}
        <div className={cn("relative w-full h-full flex flex-col z-10 bg-slate-50")}>
          <header className="sticky top-0 z-20 flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
            <button onClick={() => setIsDrawerOpen(true)} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer border-none">
              <Menu size={20} />
            </button>
            <span className="font-bold text-slate-900 tracking-tight">JP BIKE</span>
            <button onClick={() => { setIsNotificationOpen(true); setHasNewAlert(false); }} className="relative p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer border-none">
              <Bell size={20} />
              {hasNewAlert && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />}
            </button>
          </header>
          <div className="flex-1 overflow-y-auto relative z-10 no-scrollbar">
             <Outlet /> 
          </div>
        </div>

        {/* 3. Right Notification Panel */}
        <div className={cn(
          "absolute inset-y-0 right-0 w-[85%] bg-white z-[60] border-l border-slate-200 flex flex-col transition-transform duration-300 shadow-2xl",
          isNotificationOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="flex items-center justify-between p-5 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Alerts</h2>
            <button onClick={() => setIsNotificationOpen(false)} className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer border-none">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 p-4 flex items-center justify-center text-slate-500">No new alerts</div>
        </div>

        {isNotificationOpen && <div onClick={() => setIsNotificationOpen(false)} className="absolute inset-0 z-[55] bg-black/40 backdrop-blur-sm cursor-pointer" />}

        {/* REUSABLE LOGOUT ALERT */}
        <ConfirmAlert 
          isOpen={showLogoutAlert}
          title="Sign Out"
          message="Are you sure you want to log out of your admin account?"
          confirmText="Log Out"
          isDanger={true}
          isLoading={isLoggingOut}
          icon={<LogOut size={28} />}
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutAlert(false)}
        />

      </div>
    </div>
  );
}