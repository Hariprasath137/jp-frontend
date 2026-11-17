// src/pages/Inventory.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom"; // <-- Link import panniyachu
import { Loader2, Plus, Bike as BikeIcon, Search, IndianRupee, Calendar } from "lucide-react";
import { getBikes } from "../services/bikeService";
import type { Bike } from "../types";
import { cn } from "../lib/utils";

export default function Inventory() {
  const navigate = useNavigate();
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'in-stock' | 'sold'>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all'); // Format: 'YYYY-MM'

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const data = await getBikes();
        setBikes(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  // Generate Unique Months for Dropdown (e.g., "2023-10")
  const availableMonths = useMemo(() => {
    const months = new Set(bikes.map(b => b.purchaseDate.substring(0, 7)));
    return Array.from(months).sort().reverse();
  }, [bikes]);

  // Apply Filters
  const filteredBikes = useMemo(() => {
    return bikes.filter(bike => {
      const matchSearch = bike.make.toLowerCase().includes(search.toLowerCase()) || 
                          bike.model.toLowerCase().includes(search.toLowerCase()) || 
                          bike.regNo.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || bike.status === statusFilter;
      const matchMonth = monthFilter === 'all' || bike.purchaseDate.startsWith(monthFilter);
      return matchSearch && matchStatus && matchMonth;
    });
  }, [bikes, search, statusFilter, monthFilter]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-slate-200">
        
        {/* Header */}
        <div className="px-5 pt-4 pb-3 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">Inventory</h1>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{filteredBikes.length} Bikes Found</p>
          </div>
          <button onClick={() => navigate("/add-bike")} className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-md hover:bg-slate-800 transition-colors border-none cursor-pointer">
            <Plus size={20} />
          </button>
        </div>

        {/* Search & Month Filter */}
        <div className="px-5 pb-3 flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search make, reg no..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div className="relative shrink-0">
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="appearance-none pl-8 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none cursor-pointer focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">All Time</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{new Date(m + "-01").toLocaleDateString('en-US', {month: 'short', year: 'numeric'})}</option>
              ))}
            </select>
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Status Tabs */}
        <div className="px-5 pb-4 flex gap-2 overflow-x-auto no-scrollbar">
          {['all', 'in-stock', 'sold'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as any)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all border-none cursor-pointer",
                statusFilter === status 
                  ? "bg-slate-900 text-white shadow-md" 
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              {status === 'all' ? 'All Bikes' : status.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="p-5">
        {loading ? (
          <div className="flex flex-col items-center py-20"><Loader2 size={32} className="animate-spin text-slate-400" /></div>
        ) : filteredBikes.length === 0 ? (
          <div className="text-center py-20 text-slate-400 font-bold">No bikes found.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredBikes.map((bike) => (
              /* THE FIX: Changed from div with onClick to <Link> */
              <Link to={`/bike/${bike.id}`} key={bike.id} className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex gap-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] no-underline">
                <div className="w-28 h-28 rounded-xl bg-slate-100 overflow-hidden shrink-0 relative">
                  {bike.images?.[0] ? (
                    /* THE FIX: Added pointer-events-none and select-none to image */
                    <img src={bike.images[0]} className="w-full h-full object-cover pointer-events-none select-none" alt={bike.model} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><BikeIcon className="text-slate-300"/></div>
                  )}
                  {bike.status === 'sold' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                      <span className="text-white font-black uppercase tracking-widest text-[10px] bg-red-600 px-2 py-1 rounded">SOLD</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 truncate">{bike.make} {bike.model}</h3>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{bike.regNo} • {bike.year}</p>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <p className="text-xs text-slate-400 font-bold">{bike.kmDriven.toLocaleString()} km</p>
                    <p className={cn("text-base font-black flex items-center", bike.status === 'sold' ? "text-slate-400" : "text-green-600")}>
                      <IndianRupee size={14} className="mr-0.5" />{bike.purchasePrice.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}