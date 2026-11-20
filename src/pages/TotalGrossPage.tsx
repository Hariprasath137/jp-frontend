// src/pages/TotalGrossPage.tsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  IndianRupee,
  Calendar,
  Bike as BikeIcon,
  Receipt,
  TrendingUp,
  Plus,
  Loader2,
} from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import type { MaintenanceExpense } from "../types";
import { cn } from "../lib/utils";

const getBikeExpensesTotal = (b: any) =>
  Array.isArray(b.expenses)
    ? b.expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0)
    : Number(b.expense || 0);

const getPastMonths = (extraDates: string[] = []) => {
  const monthSet = new Set<string>();
  const d = new Date();
  for (let i = 0; i < 12; i++) {
    monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() - 1);
  }
  extraDates.forEach((dt) => {
    if (dt && dt.length >= 7) monthSet.add(dt.substring(0, 7));
  });

  return Array.from(monthSet)
    .sort()
    .reverse()
    .map((value) => ({
      value,
      label: new Date(`${value}-01`).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
    }));
};

export default function TotalGrossPage() {
  const navigate = useNavigate();
  const [soldBikes, setSoldBikes] = useState<any[]>([]);
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonth = `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [activeTab, setActiveTab] = useState<"all" | "bikes" | "maintenance">("all");

  useEffect(() => {
    const qBikes = query(collection(db, "bikes"), where("status", "==", "sold"));
    const unsubBikes = onSnapshot(qBikes, (snap) => {
      const data: any[] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      data.sort(
        (a, b) => new Date(b.soldDate || 0).getTime() - new Date(a.soldDate || 0).getTime()
      );
      setSoldBikes(data);
      setLoading(false);
    });

    const unsubMaint = onSnapshot(collection(db, "maintenance"), (snap) => {
      const data: MaintenanceExpense[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MaintenanceExpense, "id">),
      }));
      data.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setMaintenanceList(data);
    });

    return () => {
      unsubBikes();
      unsubMaint();
    };
  }, []);

  const months = useMemo(() => {
    const dates = [
      ...soldBikes.map((b) => b.soldDate || ""),
      ...maintenanceList.map((m) => m.date || ""),
    ];
    return getPastMonths(dates);
  }, [soldBikes, maintenanceList]);

  // Filter by selected month
  const filteredBikes = useMemo(() => {
    if (selectedMonth === "all") return soldBikes;
    return soldBikes.filter((b) => b.soldDate && b.soldDate.startsWith(selectedMonth));
  }, [soldBikes, selectedMonth]);

  const filteredMaintenance = useMemo(() => {
    if (selectedMonth === "all") return maintenanceList;
    return maintenanceList.filter((m) => m.date && m.date.startsWith(selectedMonth));
  }, [maintenanceList, selectedMonth]);

  // Financial Aggregations
  const stats = useMemo(() => {
    let totalSold = 0;
    let totalPurchase = 0;
    let totalChallan = 0;
    let totalBikeWorkExp = 0;

    filteredBikes.forEach((b) => {
      totalSold += Number(b.soldPrice || 0);
      totalPurchase += Number(b.purchasePrice || 0);
      totalChallan += Number(b.pendingChallan || 0);
      totalBikeWorkExp += getBikeExpensesTotal(b);
    });

    const totalBikeCost = totalPurchase + totalChallan + totalBikeWorkExp;
    const grossProfit = totalSold - totalBikeCost;
    const totalMaintenance = filteredMaintenance.reduce(
      (sum, m) => sum + Number(m.amount || 0),
      0
    );
    const totalAllExpenses = totalBikeWorkExp + totalChallan + totalMaintenance;
    const netProfit = grossProfit - totalMaintenance;

    return {
      soldCount: filteredBikes.length,
      totalSold,
      totalPurchase,
      totalBikeCost,
      totalBikeExtra: totalBikeWorkExp + totalChallan,
      grossProfit,
      totalMaintenance,
      totalAllExpenses,
      netProfit,
    };
  }, [filteredBikes, filteredMaintenance]);

  const selectedMonthLabel =
    selectedMonth === "all"
      ? "All Time"
      : months.find((m) => m.value === selectedMonth)?.label || selectedMonth;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-slate-200">
        <div className="px-5 pt-4 pb-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border-none cursor-pointer hover:bg-slate-200"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-tight">
                Total Gross Summary
              </h1>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Sales • Expenses • Profit
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/maintenance")}
            className="px-3 py-2 rounded-xl bg-rose-50 text-rose-600 text-xs font-extrabold border border-rose-100 cursor-pointer flex items-center gap-1"
          >
            <Plus size={14} /> Bills
          </button>
        </div>

        {/* Month Selector */}
        <div className="px-5 pb-4">
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-600"
            >
              <option value="all">All Time Summary</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <Calendar
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* MASTER FINANCIAL BREAKDOWN CARD */}
        <div className="relative bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 p-6 rounded-[2rem] text-white shadow-2xl shadow-indigo-900/20 overflow-hidden">
          <div className="absolute -top-12 -right-12 w-44 h-44 bg-indigo-500 rounded-full blur-[60px] opacity-35" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-emerald-500 rounded-full blur-[60px] opacity-25" />

          <div className="relative z-10 flex justify-between items-start mb-4">
            <div>
              <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">
                {selectedMonthLabel}
              </p>
              <p className="text-slate-400 text-xs font-semibold mt-0.5">
                Total Sold Amount (Gross Revenue)
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-extrabold text-indigo-200">
              {stats.soldCount} {stats.soldCount === 1 ? "Bike Sold" : "Bikes Sold"}
            </span>
          </div>

          <h2 className="relative z-10 text-3xl font-black flex items-center tracking-tight mb-5">
            <IndianRupee size={26} className="mr-0.5 text-indigo-300" />
            {stats.totalSold.toLocaleString("en-IN")}
          </h2>

          {/* Detailed Financial Grid */}
          <div className="relative z-10 grid grid-cols-2 gap-3 pt-4 border-t border-white/10 text-xs">
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <p className="text-slate-400 font-semibold">Bike Cost (Buy+Work)</p>
              <p className="text-sm font-black text-white flex items-center mt-1">
                <IndianRupee size={13} />
                {stats.totalBikeCost.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <p className="text-slate-400 font-semibold">Gross Bike Profit</p>
              <p
                className={cn(
                  "text-sm font-black flex items-center mt-1",
                  stats.grossProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                )}
              >
                {stats.grossProfit >= 0 ? "+" : ""}
                <IndianRupee size={13} />
                {stats.grossProfit.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
              <p className="text-slate-400 font-semibold">Total Expenses</p>
              <p className="text-sm font-black text-rose-400 flex items-center mt-1">
                <IndianRupee size={13} />
                {stats.totalAllExpenses.toLocaleString("en-IN")}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Bike ₹{stats.totalBikeExtra.toLocaleString("en-IN")} + Shop ₹
                {stats.totalMaintenance.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="bg-emerald-500/15 rounded-2xl p-3 border border-emerald-400/30">
              <p className="text-emerald-200 font-semibold flex items-center gap-1">
                <TrendingUp size={12} /> Final Net Profit
              </p>
              <p
                className={cn(
                  "text-base font-black flex items-center mt-1",
                  stats.netProfit >= 0 ? "text-emerald-300" : "text-rose-300"
                )}
              >
                {stats.netProfit >= 0 ? "+" : ""}
                <IndianRupee size={14} />
                {stats.netProfit.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        {/* LIST VIEW FILTER TABS */}
        <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200">
          {[
            { key: "all", label: `All (${filteredBikes.length + filteredMaintenance.length})` },
            { key: "bikes", label: `Sold Bikes (${filteredBikes.length})` },
            { key: "maintenance", label: `Shop Bills (${filteredMaintenance.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-extrabold transition-all border-none cursor-pointer",
                activeTab === tab.key
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-14">
            <Loader2 size={28} className="animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* SECTION 1: SOLD BIKES LIST */}
            {(activeTab === "all" || activeTab === "bikes") && (
              <div>
                <h3 className="font-extrabold text-slate-400 uppercase text-xs tracking-wider mb-3 flex items-center gap-1.5">
                  <BikeIcon size={14} /> Sold Bikes ({filteredBikes.length})
                </h3>

                {filteredBikes.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs font-bold text-slate-400">
                    No bikes sold in {selectedMonthLabel}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBikes.map((bike) => {
                      const purchase = Number(bike.purchasePrice || 0);
                      const challan = Number(bike.pendingChallan || 0);
                      const bikeExp = getBikeExpensesTotal(bike);
                      const sold = Number(bike.soldPrice || 0);
                      const profit = sold - (purchase + challan + bikeExp);

                      return (
                        <div
                          key={bike.id}
                          onClick={() => navigate(`/bike/${bike.id}`)}
                          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-black text-slate-900 text-sm">
                                {bike.make} {bike.model}
                              </h4>
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                {bike.regNo} •{" "}
                                {bike.soldDate
                                  ? new Date(bike.soldDate).toLocaleDateString("en-GB")
                                  : ""}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "font-black px-2.5 py-1 rounded-lg text-xs",
                                profit >= 0
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-red-100 text-red-700"
                              )}
                            >
                              {profit >= 0 ? "+" : ""}₹{profit.toLocaleString("en-IN")}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-2.5 mt-2 border-t border-dashed border-slate-100 text-[11px]">
                            <div>
                              <p className="text-slate-400 font-semibold">Buy Price</p>
                              <p className="font-bold text-slate-700">
                                ₹{purchase.toLocaleString("en-IN")}
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-semibold">Bike Exp</p>
                              <p className="font-bold text-rose-500">
                                ₹{(bikeExp + challan).toLocaleString("en-IN")}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-slate-400 font-semibold">Sold For</p>
                              <p className="font-black text-slate-900">
                                ₹{sold.toLocaleString("en-IN")}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SECTION 2: SHOP MAINTENANCE LIST */}
            {(activeTab === "all" || activeTab === "maintenance") && (
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-extrabold text-slate-400 uppercase text-xs tracking-wider flex items-center gap-1.5">
                    <Receipt size={14} /> Shop Maintenance ({filteredMaintenance.length})
                  </h3>
                  <button
                    onClick={() => navigate("/maintenance")}
                    className="text-xs font-bold text-indigo-600 bg-transparent border-none cursor-pointer"
                  >
                    Manage Bills →
                  </button>
                </div>

                {filteredMaintenance.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs font-bold text-slate-400">
                    No shop maintenance bills in {selectedMonthLabel}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredMaintenance.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => navigate("/maintenance")}
                        className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform"
                      >
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{m.title}</h4>
                          <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                            {m.category} • {new Date(m.date).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                        <span className="font-black text-rose-600 text-sm flex items-center">
                          - <IndianRupee size={12} />
                          {Number(m.amount).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}