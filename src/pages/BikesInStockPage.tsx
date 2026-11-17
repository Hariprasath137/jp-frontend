// src/pages/BikesInStockPage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, IndianRupee } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/config";

export default function BikesInStockPage() {
  const navigate = useNavigate();
  const [bikes, setBikes] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "bikes"), where("status", "==", "in-stock"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBikes(data);
    });
    return () => unsub();
  }, []);

  const totalValue = bikes.reduce((acc, b) => acc + Number(b.purchasePrice || 0) + Number(b.expense || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-10">
      <header className="sticky top-0 z-20 flex items-center gap-3 p-4 bg-white border-b border-slate-200">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 text-slate-600"><ArrowLeft size={20} /></button>
        <h1 className="text-lg font-bold text-slate-900">Live Inventory Stock</h1>
      </header>

      <div className="p-4">
        <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg mb-6">
          <p className="text-slate-400 text-sm mb-1 font-medium">Total Value Stuck in Stock</p>
          <h2 className="text-3xl font-black flex items-center"><IndianRupee size={28}/>{totalValue.toLocaleString('en-IN')}</h2>
        </div>

        <h3 className="font-bold text-slate-400 uppercase text-xs tracking-wider mb-3">Unsold Bikes ({bikes.length})</h3>
        <div className="space-y-3">
          {bikes.length === 0 ? <p className="text-center text-slate-400 py-10">No bikes in stock. Everything is sold!</p> : null}
          {bikes.map(bike => {
            const daysInStock = Math.ceil(Math.abs(new Date().getTime() - new Date(bike.purchaseDate).getTime()) / (1000 * 60 * 60 * 24));
            
            return (
              <div key={bike.id} onClick={() => navigate(`/bike/${bike.id}`)} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer active:scale-95 transition-transform">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-slate-900">{bike.make} {bike.model}</h4>
                  <span className={daysInStock > 30 ? "bg-red-100 text-red-700 font-bold px-2 py-1 rounded-lg text-xs" : "bg-orange-100 text-orange-700 font-bold px-2 py-1 rounded-lg text-xs"}>
                    {daysInStock} Days
                  </span>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <p className="flex justify-between"><span>Reg:</span> <span className="font-semibold text-slate-700">{bike.regNo}</span></p>
                  <p className="flex justify-between"><span>Purchase Price:</span> <span>₹{Number(bike.purchasePrice || 0).toLocaleString('en-IN')}</span></p>
                  <p className="flex justify-between"><span>Expenses Done:</span> <span className="text-red-500">₹{Number(bike.expense || 0).toLocaleString('en-IN')}</span></p>
                  <p className="flex justify-between border-t border-slate-100 pt-1 mt-1"><span>Target Selling Price:</span> <span className="font-bold text-slate-900">₹{Number(bike.sellingPrice || 0).toLocaleString('en-IN')}</span></p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}