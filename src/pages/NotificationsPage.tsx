// src/pages/NotificationsPage.tsx
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Bell } from "lucide-react";
import { useNotificationStore } from "../stores/useNotificationStore";
import { cn } from "../lib/utils";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, markAsRead, clearAll } = useNotificationStore();

  // Group notifications by date
  const groupedNotifications = notifications.reduce((groups, notif) => {
    const date = new Date(notif.timestamp).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(notif);
    return groups;
  }, {} as Record<string, typeof notifications>);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-10">
      <header className="sticky top-0 z-20 flex items-center justify-between p-4 bg-white border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 border-none">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold text-slate-900">Notification History</h1>
        </div>
        {notifications.length > 0 && (
          <button onClick={clearAll} className="p-2 rounded-xl text-red-500 hover:bg-red-50 border-none cursor-pointer flex items-center gap-1 text-sm font-bold">
            <Trash2 size={16} /> Clear
          </button>
        )}
      </header>

      <div className="p-5 flex-1">
        {Object.keys(groupedNotifications).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Bell size={48} className="mb-4 text-slate-200" />
            <p className="font-bold">No notifications yet</p>
          </div>
        ) : (
          Object.entries(groupedNotifications).map(([date, notifs]) => (
            <div key={date} className="mb-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 pl-1">{date}</h3>
              <div className="space-y-3">
                {notifs.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => {
                      markAsRead(notif.id);
                      if (notif.bikeId) navigate(`/bike/${notif.bikeId}`);
                    }}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer",
                      notif.read ? "bg-white border-slate-200" : "bg-blue-50/50 border-blue-100 shadow-sm"
                    )}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={cn("text-sm font-bold", notif.read ? "text-slate-700" : "text-slate-900")}>{notif.title}</h4>
                      {!notif.read && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-2">{notif.body}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{new Date(notif.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}