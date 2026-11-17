// src/layouts/MobileLayout.tsx
import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Menu, Bell, X, LogOut, LayoutDashboard, Bike, Plus } from "lucide-react"; // Trash2 ah thookiyachu
import { cn } from "../lib/utils";
import { useAuthStore } from "../stores/useAuthStore";
import { useNotificationStore } from "../stores/useNotificationStore"; 
import ConfirmAlert from "../components/ConfirmAlert";
import { onMessage } from "firebase/messaging";
import { messaging } from "../firebase/config";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

export default function MobileLayout() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  
  // Zustand Store variables
  const { notifications, setNotifications } = useNotificationStore(); // ClearAll ah inga theva illa
  const unreadCount = notifications.filter(n => !n.read).length;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // 1. LIVE DB LISTENER
    const q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'));
    const unsubDB = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any;
      setNotifications(notifs);
    }, (error) => {
      console.error("🚨 FIRESTORE RULES ERROR:", error); 
    });

    // 2. SYSTEM POPUP GENERATOR
    if (!messaging) return;
    const unsubFCM = onMessage(messaging, (payload) => {
      if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(payload.notification?.title || 'MotoTrack Alert', {
            body: payload.notification?.body || '',
            icon: 'https://cdn-icons-png.flaticon.com/512/2950/2950664.png',
            data: { bikeId: payload.data?.bikeId }
          });
        });
      }
    });

    return () => {
      unsubDB();
      unsubFCM();
    };
  }, [setNotifications]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout(); 
      navigate("/login"); 
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      setIsLoggingOut(false);
      setShowLogoutAlert(false);
    }
  };

  // Drawer la click panna update aaga
  const { markAsRead } = useNotificationStore();

  return (
    <div className="fixed w-full h-full flex items-center justify-center overflow-hidden bg-slate-100">
      <div className={cn("relative z-10 w-full h-full flex overflow-hidden bg-white sm:max-w-[420px] sm:h-[90vh] sm:rounded-[2.5rem] sm:shadow-2xl sm:border-[8px] border-slate-300")}>
        
        {/* 1. Left Sidebar Drawer */}
        <div className={cn(
          "absolute inset-y-0 left-0 w-[80%] bg-white flex flex-col z-[60] border-r border-slate-200 shadow-2xl transition-transform duration-300",
          isDrawerOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="p-6 border-b border-slate-100 shrink-0">
            <h2 className="text-xl font-bold text-slate-900">JP BIKE Admin</h2>
            <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">Management Portal</p>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            <button onClick={() => { navigate("/"); setIsDrawerOpen(false); }} className="flex items-center w-full p-4 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold gap-4 cursor-pointer border-none bg-transparent transition-colors">
              <LayoutDashboard size={20} className="text-slate-400" /> Dashboard
            </button>
            <button onClick={() => { navigate("/inventory"); setIsDrawerOpen(false); }} className="flex items-center w-full p-4 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold gap-4 cursor-pointer border-none bg-transparent transition-colors">
              <Bike size={20} className="text-slate-400" /> Inventory
            </button>
            <button onClick={() => { navigate("/add-bike"); setIsDrawerOpen(false); }} className="flex items-center w-full p-4 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold gap-4 cursor-pointer border-none bg-transparent transition-colors">
              <div className="bg-slate-900 text-white p-1 rounded-md"><Plus size={16} /></div> Add New Bike
            </button>
          </div>
          
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
             <button 
                onClick={() => {
                  setIsDrawerOpen(false);
                  setShowLogoutAlert(true); 
                }}
                className="flex items-center w-full p-4 rounded-xl text-red-500 font-bold hover:bg-red-50 gap-4 cursor-pointer border-none bg-transparent transition-colors"
             >
                <LogOut size={20} /> Logout
             </button>
          </div>
        </div>

        {isDrawerOpen && <div onClick={() => setIsDrawerOpen(false)} className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm cursor-pointer" />}

        {/* 2. Main Content Area */}
        <div className={cn("relative w-full h-full flex flex-col z-10 bg-slate-50")}>
          <header className="sticky top-0 z-20 flex items-center justify-between p-4 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm shrink-0">
            <button onClick={() => setIsDrawerOpen(true)} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 border-none transition-colors">
              <Menu size={20} />
            </button>
            <span className="font-bold text-slate-900 tracking-tight">JP BIKE</span>
            
            <button onClick={() => setIsNotificationOpen(true)} className="relative p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 border-none transition-colors">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </header>

          <div className="flex-1 overflow-y-auto relative z-10 no-scrollbar">
             <Outlet /> 
          </div>
        </div>

        {/* 3. Right Notification Panel */}
        <div className={cn(
          "absolute inset-y-0 right-0 w-[85%] bg-slate-50 z-[60] border-l border-slate-200 flex flex-col transition-transform duration-300 shadow-2xl",
          isNotificationOpen ? "translate-x-0" : "translate-x-full"
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-5 bg-white border-b border-slate-200 shrink-0">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Alerts</h2>
              <p className="text-xs text-slate-500">{unreadCount} unread</p>
            </div>
            {/* TRASH BUTTON REMOVED FROM HERE */}
            <div className="flex gap-2">
              <button onClick={() => setIsNotificationOpen(false)} className="p-1.5 rounded-xl bg-slate-100 text-slate-500 border-none cursor-pointer transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>
          
          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 font-medium">No new alerts</div>
            ) : (
              notifications.slice(0, 10).map((notif) => ( 
                <div 
                  key={notif.id}
                  onClick={() => {
                    markAsRead(notif.id);
                    if (notif.bikeId) {
                      setIsNotificationOpen(false);
                      navigate(`/bike/${notif.bikeId}`); 
                    }
                  }}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer",
                    notif.read ? "bg-white border-slate-100 opacity-70" : "bg-blue-50/50 border-blue-100 shadow-sm"
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={cn("text-sm font-bold", notif.read ? "text-slate-700" : "text-slate-900")}>{notif.title}</h4>
                    {!notif.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-2">{notif.body}</p>
                </div>
              ))
            )}
          </div>

          {/* FIXED VIEW ALL BUTTON - ALWAYS VISIBLE */}
          <div className="p-4 bg-white border-t border-slate-200 shrink-0">
            <button 
              onClick={() => {
                setIsNotificationOpen(false);
                navigate("/notifications"); 
              }} 
              className="w-full p-3 bg-slate-50 border border-slate-200 text-blue-600 font-bold rounded-xl shadow-sm cursor-pointer hover:bg-slate-100 transition-colors"
            >
              View All History
            </button>
          </div>
        </div>

        {isNotificationOpen && <div onClick={() => setIsNotificationOpen(false)} className="absolute inset-0 z-[55] bg-black/40 backdrop-blur-sm cursor-pointer" />}

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