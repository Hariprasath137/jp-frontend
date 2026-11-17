// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, TrendingUp, Wallet, Bike, AlertCircle, IndianRupee, ChevronRight, Activity } from "lucide-react";
import { getBikes } from "../services/bikeService";
import type { Bike as BikeType } from "../types";
import { useAuthStore } from "../stores/useAuthStore";
import { requestPushPermission } from "../services/notificationService";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [bikes, setBikes] = useState<BikeType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  
  getBikes().then(data => {
    setBikes(data);
    setLoading(false);
    
    setTimeout(() => {
      requestPushPermission();
    }, 2000);
  });
}, []);

  // --- Calculations ---
  const inStockBikes = bikes.filter(b => b.status === 'in-stock');
  const soldBikes = bikes.filter(b => b.status === 'sold');

  // Total Capital Invested (In-stock bikes cost + challans + expenses)
  const totalInvested = inStockBikes.reduce((sum, bike) => {
    const expenses = bike.expenses?.reduce((e, exp) => e + exp.amount, 0) || 0;
    return sum + bike.purchasePrice + (bike.pendingChallan || 0) + expenses;
  }, 0);

  // Total Net Profit (Sold bikes profit)
  const totalProfit = soldBikes.reduce((sum, bike) => {
    const expenses = bike.expenses?.reduce((e, exp) => e + exp.amount, 0) || 0;
    const actualCost = bike.purchasePrice + (bike.pendingChallan || 0) + expenses;
    return sum + ((bike.soldPrice || 0) - actualCost);
  }, 0);

  // Pending Challans Alert Count
  const bikesWithChallan = inStockBikes.filter(b => (b.pendingChallan || 0) > 0).length;

  if (loading) {
    return <div className="h-full flex flex-col items-center justify-center bg-slate-50"><Loader2 size={32} className="animate-spin text-brand-blue" /></div>;
  }

  return (
    <div className="relative w-full h-full bg-slate-50 overflow-y-auto no-scrollbar pb-24">
      
      {/* Top Greeting Section */}
      <div className="bg-slate-900 pt-8 pb-16 px-6 rounded-b-[2.5rem] shadow-lg">
        <h1 className="text-2xl font-black text-white leading-tight">
          Hello, {user?.email?.split('@')[0] || 'Admin'} 👋
        </h1>
        <p className="text-slate-400 text-sm font-semibold mt-1">Here is your business overview</p>
      </div>

      {/* Main Stats Cards (Overlapping the dark header) */}
      <div className="px-5 -mt-10 space-y-4 relative z-10">
        
        {/* Profit Card */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 p-5 rounded-3xl shadow-lg shadow-green-500/20 text-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-green-100" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-green-100">Total Net Profit</span>
          </div>
          <p className="text-3xl font-black flex items-center tracking-tight">
            <IndianRupee size={24} className="mr-1" />
            {totalProfit.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Capital Invested */}
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
              <Wallet size={20} />
            </div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-0.5">Capital Invested</p>
            <p className="text-lg font-black text-slate-900 flex items-center">
              <IndianRupee size={14} />{totalInvested.toLocaleString('en-IN')}
            </p>
          </div>

          {/* Stock Count */}
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center mb-3">
              <Bike size={20} />
            </div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-0.5">Bikes In Stock</p>
            <p className="text-lg font-black text-slate-900">{inStockBikes.length} Units</p>
          </div>
        </div>

      </div>

      {/* Actionable Alerts & Quick Links */}
      <div className="px-5 mt-6 space-y-4">
        
        {/* Challan Alert */}
        {bikesWithChallan > 0 && (
          <div onClick={() => navigate("/inventory")} className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-red-100 transition-colors">
            <div className="w-10 h-10 rounded-full bg-white text-red-500 flex items-center justify-center shrink-0 shadow-sm">
              <AlertCircle size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-black text-red-900">Pending Challans</h4>
              <p className="text-xs font-bold text-red-600/80">{bikesWithChallan} bike(s) need challan clearance.</p>
            </div>
            <ChevronRight size={16} className="text-red-400" />
          </div>
        )}

        <h3 className="text-sm font-black text-slate-900 pt-2 flex items-center gap-2">
          <Activity size={16} className="text-brand-blue" /> Recent Additions
        </h3>
        
        {/* Recent Bikes List */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {inStockBikes.slice(0, 3).length === 0 ? (
             <div className="p-6 text-center text-sm font-bold text-slate-400">No bikes in stock.</div>
          ) : (
             <div className="divide-y divide-slate-100">
               {inStockBikes.slice(0, 3).map((bike) => (
                 <div key={bike.id} onClick={() => navigate(`/bike/${bike.id}`)} className="p-4 flex items-center gap-4 hover:bg-slate-50 cursor-pointer transition-colors">
                   <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0">
                     {bike.images?.[0] ? <img src={bike.images[0]} className="w-full h-full object-cover" /> : <Bike size={20} className="m-auto h-full text-slate-300" />}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-black text-slate-900 truncate">{bike.make} {bike.model}</p>
                     <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mt-0.5">{bike.regNo}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-sm font-black text-slate-900 flex items-center justify-end"><IndianRupee size={12}/>{bike.purchasePrice.toLocaleString()}</p>
                     <span className="text-[9px] font-extrabold uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded tracking-widest">In Stock</span>
                   </div>
                 </div>
               ))}
             </div>
          )}
          
          {inStockBikes.length > 3 && (
            <button onClick={() => navigate("/inventory")} className="w-full p-4 text-xs font-black text-brand-blue bg-slate-50 hover:bg-slate-100 transition-colors flex justify-center items-center gap-1 cursor-pointer border-none">
              View All Inventory <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}