// src/pages/Dashboard.tsx
import { useNavigate } from "react-router-dom";
import { TrendingUp, Wallet, Bike, IndianRupee, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";
import { cn } from "../lib/utils";

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ netProfit: 0, capital: 0, stock: 0 });
  const [recentBikes, setRecentBikes] = useState<any[]>([]);

  useEffect(() => {
    // Fetching all bikes, ordered by latest added
    const q = query(collection(db, "bikes"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      let profit = 0;
      let capital = 0;
      let stockCount = 0;
      const bikesList: any[] = [];

      snap.docs.forEach((doc, index) => {
        const b = doc.data();
        const expense = Number(b.expense || 0);
        const purchase = Number(b.purchasePrice || 0);
        const sold = Number(b.soldPrice || 0);

        // Stats Calculation
        if (b.status === 'sold') {
          profit += (sold - (purchase + expense));
        } else {
          stockCount++;
        }
        capital += (purchase + expense);

        // Collect recent 5 bikes
        if (index < 5) {
          bikesList.push({ id: doc.id, ...b });
        }
      });

      setStats({ netProfit: profit, capital, stock: stockCount });
      setRecentBikes(bikesList);
    });
    return () => unsub();
  }, []);

  return (
    <div className="p-5 pb-24 bg-slate-50 min-h-full">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Overview</p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Business Stats</h1>
        </div>
      </div>

      <div className="space-y-4">
        {/* 1. PREMIUM NET PROFIT CARD (With Mini Graph) */}
        <div 
          onClick={() => navigate('/net-profit')} 
          className="relative bg-slate-900 p-6 rounded-[2rem] text-white shadow-2xl shadow-slate-300 cursor-pointer overflow-hidden active:scale-95 transition-transform"
        >
          {/* Glowing Background Effects */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500 rounded-full mix-blend-screen filter blur-[50px] opacity-40"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500 rounded-full mix-blend-screen filter blur-[50px] opacity-30"></div>
          
          <div className="relative z-10 flex justify-between items-start mb-6">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
              <TrendingUp size={24} className="text-emerald-400" />
            </div>
            <ArrowRight size={20} className="text-white/50" />
          </div>
          
          <div className="relative z-10">
            <p className="text-slate-400 font-medium text-sm mb-1">Total Net Profit</p>
            <h2 className="text-4xl font-black flex items-center tracking-tight">
              <IndianRupee size={32} className="mr-1 opacity-80"/> 
              {stats.netProfit.toLocaleString('en-IN')}
            </h2>
          </div>

          {/* Pure CSS Mini Graph (Visual Candies) */}
          <div className="relative z-10 flex items-end gap-1.5 h-12 mt-6 opacity-80">
            {[30, 50, 40, 70, 55, 85, 100].map((height, i) => (
              <div key={i} className="flex-1 bg-gradient-to-t from-emerald-500/20 to-emerald-400 rounded-t-sm" style={{ height: `${height}%` }}></div>
            ))}
          </div>
        </div>

        {/* 2. GRID CARDS (Capital & Stock) */}
        <div className="grid grid-cols-2 gap-4">
          <div 
            onClick={() => navigate('/capital')} 
            className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 cursor-pointer active:scale-95 transition-all"
          >
            <div className="p-2.5 bg-blue-50 rounded-2xl w-max mb-4">
              <Wallet size={22} className="text-blue-600" />
            </div>
            <p className="text-slate-400 font-bold text-xs mb-1 uppercase tracking-wider">Invested</p>
            <h3 className="text-xl font-black text-slate-900 flex items-center">
              <IndianRupee size={18}/> {stats.capital.toLocaleString('en-IN')}
            </h3>
          </div>

          <div 
            onClick={() => navigate('/stock-details')} 
            className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 cursor-pointer active:scale-95 transition-all"
          >
            <div className="p-2.5 bg-orange-50 rounded-2xl w-max mb-4">
              <Bike size={22} className="text-orange-600" />
            </div>
            <p className="text-slate-400 font-bold text-xs mb-1 uppercase tracking-wider">In Stock</p>
            <h3 className="text-xl font-black text-slate-900">{stats.stock} <span className="text-sm text-slate-400 font-medium">Bikes</span></h3>
          </div>
        </div>
      </div>

      {/* 3. RECENT ADDITIONS (Premium List) */}
      <div className="mt-10">
        <div className="flex justify-between items-end mb-5">
          <h2 className="text-lg font-black text-slate-900">Recent Additions</h2>
          <button onClick={() => navigate('/inventory')} className="text-sm font-bold text-blue-600 hover:text-blue-700">See All</button>
        </div>
        
        <div className="space-y-3">
          {recentBikes.length === 0 ? (
            <p className="text-center text-slate-400 py-6 font-medium text-sm">No bikes added yet.</p>
          ) : (
            recentBikes.map(bike => (
              <div 
                key={bike.id} 
                onClick={() => navigate(`/bike/${bike.id}`)}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                    <Bike size={24} className="text-slate-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm leading-tight">{bike.make} {bike.model}</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">{bike.regNo}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md",
                    bike.status === 'sold' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                  )}>
                    {bike.status}
                  </span>
                  <p className="text-xs font-bold text-slate-900 flex items-center">
                    <IndianRupee size={12}/>{Number(bike.purchasePrice || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}