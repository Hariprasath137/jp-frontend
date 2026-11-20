// src/pages/CapitalInvestedPage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, IndianRupee } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/config";

const getPastMonths = () => {
  const months = [];
  const d = new Date();
  for (let i = 0; i < 12; i++) {
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    months.push({ value, label });
    d.setMonth(d.getMonth() - 1);
  }
  return months;
};

const getExpensesTotal = (b: any) =>
  Array.isArray(b.expenses)
    ? b.expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0)
    : Number(b.expense || 0);

export default function CapitalInvestedPage() {
  const navigate = useNavigate();
  const [bikes, setBikes] = useState<any[]>([]);
  const months = getPastMonths();
  const [selectedMonth, setSelectedMonth] = useState(months[0].value);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "bikes"), (snap) => {
      const data: any[] = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setBikes(data);
    });
    return () => unsub();
  }, []);

  // Exclude returned bikes & filter by purchaseDate month
  const filteredBikes = bikes.filter(
    (b) => b.status !== "returned" && b.purchaseDate && b.purchaseDate.startsWith(selectedMonth)
  );

  const totalBuyPrice = filteredBikes.reduce((acc, b) => acc + Number(b.purchasePrice || 0), 0);
  const totalChallan = filteredBikes.reduce((acc, b) => acc + Number(b.pendingChallan || 0), 0);
  const totalExpense = filteredBikes.reduce((acc, b) => acc + getExpensesTotal(b), 0);
  const totalExtra = totalChallan + totalExpense;
  const totalInvested = totalBuyPrice + totalExtra;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-10">
      <header className="sticky top-0 z-20 flex items-center gap-3 p-4 bg-white border-b border-slate-200">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-slate-100 text-slate-600 border-none cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-900">Capital Invested</h1>
      </header>

      <div className="p-4">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full p-3 mb-4 bg-white border border-slate-200 rounded-xl font-bold text-blue-700 outline-none"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <div className="bg-blue-600 text-white p-5 rounded-2xl shadow-lg shadow-blue-200 mb-6">
          <p className="text-blue-100 text-sm mb-1 font-medium">
            Investment in {months.find((m) => m.value === selectedMonth)?.label}
          </p>
          <h2 className="text-3xl font-black flex items-center mb-4">
            <IndianRupee size={28} />
            {totalInvested.toLocaleString("en-IN")}
          </h2>

          <div className="flex justify-between border-t border-blue-500 pt-3 text-sm">
            <div>
              <p className="text-blue-200">Bike Costs</p>
              <p className="font-bold flex items-center">
                <IndianRupee size={14} />
                {totalBuyPrice.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="text-right">
              <p className="text-blue-200">Expenses + Challan</p>
              <p className="font-bold flex items-center justify-end">
                <IndianRupee size={14} />
                {totalExtra.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </div>

        <h3 className="font-bold text-slate-400 uppercase text-xs tracking-wider mb-3">
          Purchased Bikes ({filteredBikes.length})
        </h3>
        <div className="space-y-3">
          {filteredBikes.length === 0 ? (
            <p className="text-center text-slate-400 py-10">No investments this month</p>
          ) : null}
          {filteredBikes.map((bike) => {
            const purchase = Number(bike.purchasePrice || 0);
            const challan = Number(bike.pendingChallan || 0);
            const expense = getExpensesTotal(bike);
            const totalValue = purchase + challan + expense;

            return (
              <div
                key={bike.id}
                onClick={() => navigate(`/bike/${bike.id}`)}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer active:scale-95 transition-transform"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-900">
                    {bike.make} {bike.model}
                  </h4>
                  <span
                    className={
                      bike.status === "sold"
                        ? "text-green-600 text-xs font-bold"
                        : "text-blue-600 text-xs font-bold"
                    }
                  >
                    {bike.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <p className="flex justify-between">
                    <span>Reg:</span>
                    <span className="font-semibold text-slate-700">{bike.regNo}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Purchase Price:</span>
                    <span>₹{purchase.toLocaleString("en-IN")}</span>
                  </p>
                  {challan > 0 && (
                    <p className="flex justify-between">
                      <span>Pending Challan:</span>
                      <span className="text-red-500">₹{challan.toLocaleString("en-IN")}</span>
                    </p>
                  )}
                  <p className="flex justify-between">
                    <span>Expenses:</span>
                    <span className="text-red-500">₹{expense.toLocaleString("en-IN")}</span>
                  </p>
                  <p className="flex justify-between border-t border-slate-100 pt-1 mt-1">
                    <span>Total Value:</span>
                    <span className="font-bold text-slate-900">
                      ₹{totalValue.toLocaleString("en-IN")}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}