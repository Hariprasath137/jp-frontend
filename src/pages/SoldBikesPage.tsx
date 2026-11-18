// src/pages/SoldBikesPage.tsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle, IndianRupee, Calendar, Bike as BikeIcon, Loader2 } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { cn } from "../lib/utils";

export default function SoldBikesPage() {
  const navigate = useNavigate();
  const [bikes, setBikes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthFilter, setMonthFilter] = useState<string>('all'); 

  useEffect(() => {
    const q = query(collection(db, "bikes"), where("status", "==", "sold"));
    const unsub = onSnapshot(q, (snap) => {
     
      const data: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort descending (latest sold first)
      data.sort((a, b) => new Date(b.soldDate || 0).getTime() - new Date(a.soldDate || 0).getTime());
      setBikes(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Generate Unique Months for Dropdown based on 'soldDate'
  const availableMonths = useMemo(() => {
    const months = new Set(bikes.filter(b => b.soldDate).map(b => b.soldDate.substring(0, 7)));
    return Array.from(months).sort().reverse();
  }, [bikes]);

  // Apply Filter
  const filteredBikes = useMemo(() => {
    return bikes.filter(bike => {
      if (monthFilter === 'all') return true;
      return bike.soldDate && bike.soldDate.startsWith(monthFilter);
    });
  }, [bikes, monthFilter]);

  const totalSales = filteredBikes.reduce((acc, b) => acc + Number(b.soldPrice || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20">
      
      {/* Header (Sticky) */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-slate-200">
        <div className="px-5 pt-4 pb-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border-none cursor-pointer hover:bg-slate-200 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Sold Bikes</h1>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{filteredBikes.length} Bikes Sold</p>
            </div>
          </div>
        </div>

        {/* Month Filter */}
        <div className="px-5 pb-4 flex gap-2">
          <div className="relative w-full">
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="appearance-none w-full pl-10 pr-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All Time Sales</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>
                  {new Date(m + "-01").toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}
                </option>
              ))}
            </select>
            <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {filteredBikes.length > 0 && (
        <div className="px-5 pt-5">
          <div className="bg-green-50 p-4 rounded-2xl border border-green-200 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-extrabold text-green-700 uppercase tracking-widest">Total Sales (Filtered)</p>
              <p className="text-xl font-black text-green-800 flex items-center mt-1"><IndianRupee size={18}/>{totalSales.toLocaleString('en-IN')}</p>
            </div>
            <div className="w-10 h-10 bg-green-200 text-green-700 rounded-full flex items-center justify-center">
              <CheckCircle size={20} />
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="p-5">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-green-600" /></div>
        ) : filteredBikes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <CheckCircle size={48} className="mb-4 text-slate-200" />
            <p className="font-bold">No sales records found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredBikes.map((bike) => {
               const purchase = Number(bike.purchasePrice || 0);
               const expenses = bike.expenses?.reduce((sum: number, exp: any) => sum + exp.amount, 0) || 0;
               const pending = Number(bike.pendingChallan || 0);
               const sold = Number(bike.soldPrice || 0);
               const profit = sold - (purchase + expenses + pending);

               return (
                <Link to={`/bike/${bike.id}`} key={bike.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] no-underline">
                  
                  <div className="flex gap-4">
                    {/* Thumbnail Image */}
                    <div className="w-20 h-20 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative">
                      {bike.images?.[0] ? (
                        <img src={bike.images[0]} className="w-full h-full object-cover pointer-events-none select-none" alt={bike.model} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><BikeIcon className="text-slate-300" size={24}/></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h3 className="text-base font-black text-slate-900 truncate">{bike.make} {bike.model}</h3>
                      <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">{bike.regNo}</p>
                      
                      {bike.soldDate && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-slate-500 bg-slate-50 w-max px-2 py-1 rounded-md">
                          <Calendar size={12} /> {new Date(bike.soldDate).toLocaleDateString('en-GB')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pricing/Profit Breakdown */}
                  <div className="flex justify-between items-center pt-3 border-t border-dashed border-slate-100">
                    <div>
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Final Price</p>
                      <p className="text-sm font-black text-slate-900 flex items-center"><IndianRupee size={12}/>{sold.toLocaleString('en-IN')}</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Net Profit</p>
                      <span className={cn("text-sm font-black flex items-center justify-end px-2 py-0.5 rounded-md", 
                        profit >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}>
                        {profit > 0 ? "+" : ""}<IndianRupee size={12}/>{profit.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}