// src/pages/Dashboard.tsx
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  Wallet,
  Bike,
  IndianRupee,
  ArrowRight,
  Eye,
  EyeOff,
  BarChart3,
  Receipt,
} from "lucide-react";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase/config";
import { cn } from "../lib/utils";

const getExpensesTotal = (b: any) =>
  Array.isArray(b.expenses)
    ? b.expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0)
    : Number(b.expense || 0);

export default function Dashboard() {
  const navigate = useNavigate();

  const [bikeStats, setBikeStats] = useState({
    grossProfit: 0,
    totalSales: 0,
    soldCount: 0,
    capital: 0,
    stock: 0,
  });
  const [maintStats, setMaintStats] = useState({
    totalMaintenance: 0,
    thisMonthMaintenance: 0,
  });
  const [recentBikes, setRecentBikes] = useState<any[]>([]);

  // Privacy toggles (default hidden)
  const [showNetProfit, setShowNetProfit] = useState(false);
  const [showGrossProfit, setShowGrossProfit] = useState(false);

  useEffect(() => {
    // 1. Bikes real-time listener
    const qBikes = query(collection(db, "bikes"), orderBy("createdAt", "desc"));
    const unsubBikes = onSnapshot(qBikes, (snap) => {
      let grossProfit = 0;
      let totalSales = 0;
      let soldCount = 0;
      let capital = 0;
      let stockCount = 0;
      const bikesList: any[] = [];

      snap.docs.forEach((docSnap, index) => {
        const b = docSnap.data();
        const purchase = Number(b.purchasePrice || 0);
        const challan = Number(b.pendingChallan || 0);
        const expenses = getExpensesTotal(b);
        const totalCost = purchase + challan + expenses;
        const sold = Number(b.soldPrice || 0);

        if (b.status === "sold") {
          grossProfit += sold - totalCost;
          totalSales += sold;
          soldCount++;
          capital += totalCost;
        } else if (b.status === "in-stock") {
          stockCount++;
          capital += totalCost;
        }

        if (index < 5) {
          bikesList.push({ id: docSnap.id, ...b });
        }
      });

      setBikeStats({ grossProfit, totalSales, soldCount, capital, stock: stockCount });
      setRecentBikes(bikesList);
    });

    // 2. Shop Maintenance real-time listener
    const currentMonth = `${new Date().getFullYear()}-${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}`;

    const unsubMaint = onSnapshot(collection(db, "maintenance"), (snap) => {
      let totalMaintenance = 0;
      let thisMonthMaintenance = 0;

      snap.docs.forEach((docSnap) => {
        const m = docSnap.data();
        const amt = Number(m.amount || 0);
        totalMaintenance += amt;
        if (m.date && String(m.date).startsWith(currentMonth)) {
          thisMonthMaintenance += amt;
        }
      });

      setMaintStats({ totalMaintenance, thisMonthMaintenance });
    });

    return () => {
      unsubBikes();
      unsubMaint();
    };
  }, []);

  const netProfit = bikeStats.grossProfit - maintStats.totalMaintenance;

  return (
    <div className="p-5 pb-24 bg-slate-50 min-h-full">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">
            Overview
          </p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Business Stats
          </h1>
        </div>
      </div>

      <div className="space-y-4">
        {/* 1. NET PROFIT CARD (After Shop Maintenance) */}
        <div
          onClick={() => navigate("/net-profit")}
          className="relative bg-slate-900 p-6 rounded-[2rem] text-white shadow-2xl shadow-slate-300 cursor-pointer overflow-hidden active:scale-95 transition-transform"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500 rounded-full mix-blend-screen filter blur-[50px] opacity-40" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500 rounded-full mix-blend-screen filter blur-[50px] opacity-30" />

          <div className="relative z-10 flex justify-between items-start mb-5">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
              <TrendingUp size={24} className="text-emerald-400" />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNetProfit((prev) => !prev);
                }}
                className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl border border-white/10 text-white cursor-pointer transition-colors"
                title={showNetProfit ? "Hide Net Profit" : "Show Net Profit"}
              >
                {showNetProfit ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <ArrowRight size={20} className="text-white/50" />
            </div>
          </div>

          <div className="relative z-10">
            <p className="text-slate-400 font-medium text-sm mb-1">
              Total Net Profit (After Bills)
            </p>
            <h2 className="text-4xl font-black flex items-center tracking-tight">
              <IndianRupee size={32} className="mr-1 opacity-80" />
              {showNetProfit ? netProfit.toLocaleString("en-IN") : "••••••"}
            </h2>
          </div>

          {/* Pure CSS Mini Graph */}
          <div className="relative z-10 flex items-end gap-1.5 h-10 mt-5 opacity-80">
            {[30, 50, 40, 70, 55, 85, 100].map((height, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-emerald-500/20 to-emerald-400 rounded-t-sm"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        {/* 2. TOTAL GROSS CARD (Bike Gross Profit + Sales Summary) */}
        <div
          onClick={() => navigate("/total-gross")}
          className="relative bg-gradient-to-br from-indigo-700 to-blue-700 p-5 rounded-[2rem] text-white shadow-xl shadow-indigo-200/70 cursor-pointer overflow-hidden active:scale-95 transition-transform"
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/15 rounded-full blur-2xl" />

          <div className="relative z-10 flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 backdrop-blur-md rounded-2xl border border-white/15">
                <BarChart3 size={22} className="text-white" />
              </div>
              <div>
                <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider">
                  Total Gross Profit
                </p>
                <p className="text-[11px] text-indigo-200 font-medium">
                  {bikeStats.soldCount} Sold • Sales ₹
                  {bikeStats.totalSales.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGrossProfit((prev) => !prev);
                }}
                className="p-2 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-xl border border-white/15 text-white cursor-pointer transition-colors"
                title={showGrossProfit ? "Hide Total Gross" : "Show Total Gross"}
              >
                {showGrossProfit ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <ArrowRight size={18} className="text-white/70" />
            </div>
          </div>

          <div className="relative z-10 flex justify-between items-end">
            <h3 className="text-3xl font-black flex items-center tracking-tight">
              <IndianRupee size={26} className="mr-0.5 opacity-90" />
              {showGrossProfit ? bikeStats.grossProfit.toLocaleString("en-IN") : "••••••"}
            </h3>
            <span className="text-[11px] font-bold bg-white/15 px-2.5 py-1 rounded-lg">
              Monthly Report →
            </span>
          </div>
        </div>

        {/* 3. GRID CARDS (Capital & Stock) */}
        <div className="grid grid-cols-2 gap-4">
          <div
            onClick={() => navigate("/capital")}
            className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 cursor-pointer active:scale-95 transition-all"
          >
            <div className="p-2.5 bg-blue-50 rounded-2xl w-max mb-4">
              <Wallet size={22} className="text-blue-600" />
            </div>
            <p className="text-slate-400 font-bold text-xs mb-1 uppercase tracking-wider">
              Invested
            </p>
            <h3 className="text-xl font-black text-slate-900 flex items-center">
              <IndianRupee size={18} /> {bikeStats.capital.toLocaleString("en-IN")}
            </h3>
          </div>

          <div
            onClick={() => navigate("/stock-details")}
            className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 cursor-pointer active:scale-95 transition-all"
          >
            <div className="p-2.5 bg-orange-50 rounded-2xl w-max mb-4">
              <Bike size={22} className="text-orange-600" />
            </div>
            <p className="text-slate-400 font-bold text-xs mb-1 uppercase tracking-wider">
              In Stock
            </p>
            <h3 className="text-xl font-black text-slate-900">
              {bikeStats.stock}{" "}
              <span className="text-sm text-slate-400 font-medium">Bikes</span>
            </h3>
          </div>
        </div>

        {/* 4. SHOP MAINTENANCE QUICK BAR */}
        <div
          onClick={() => navigate("/maintenance")}
          className="bg-white p-4 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/40 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
              <Receipt size={20} />
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900">Shop Maintenance</p>
              <p className="text-[11px] font-semibold text-slate-400">
                This month: ₹{maintStats.thisMonthMaintenance.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
              ₹{maintStats.totalMaintenance.toLocaleString("en-IN")} Total
            </span>
            <ArrowRight size={16} className="text-slate-400" />
          </div>
        </div>
      </div>

      {/* 5. RECENT ADDITIONS */}
      <div className="mt-8">
        <div className="flex justify-between items-end mb-5">
          <h2 className="text-lg font-black text-slate-900">Recent Additions</h2>
          <button
            onClick={() => navigate("/inventory")}
            className="text-sm font-bold text-blue-600 hover:text-blue-700 bg-transparent border-none cursor-pointer"
          >
            See All
          </button>
        </div>

        <div className="space-y-3">
          {recentBikes.length === 0 ? (
            <p className="text-center text-slate-400 py-6 font-medium text-sm">
              No bikes added yet.
            </p>
          ) : (
              recentBikes.map((bike) => {
              const totalCost =
                Number(bike.purchasePrice || 0) +
                Number(bike.pendingChallan || 0) +
                getExpensesTotal(bike);

              return (
                <div
                  key={bike.id}
                  onClick={() => navigate(`/bike/${bike.id}`)}
                  className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Bike Thumbnail with Icon Fallback */}
                    <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200/70 shrink-0 overflow-hidden">
                      {bike.images?.[0] ? (
                        <img
                          src={bike.images[0]}
                          alt={`${bike.make} ${bike.model}`}
                          className="w-full h-full object-cover pointer-events-none select-none"
                        />
                      ) : (
                        <Bike size={22} className="text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-sm leading-tight truncate">
                        {bike.make} {bike.model}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {bike.regNo}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span
                      className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md",
                        bike.status === "sold"
                          ? "bg-green-100 text-green-700"
                          : bike.status === "returned"
                          ? "bg-slate-200 text-slate-600"
                          : "bg-orange-100 text-orange-700"
                      )}
                    >
                      {bike.status}
                    </span>
                    <p className="text-xs font-bold text-slate-900 flex items-center">
                      <IndianRupee size={12} />
                      {totalCost.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}