// src/pages/ReturnedBikesPage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Undo2, Bike } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase/config";

export default function ReturnedBikesPage() {
  const navigate = useNavigate();
  const [bikes, setBikes] = useState<any[]>([]);

  useEffect(() => {
    // Filter bikes where status is 'returned'
    const q = query(collection(db, "bikes"), where("status", "==", "returned"));
    const unsub = onSnapshot(q, (snap) => {
      // Fix: Cast the map result explicitly as 'any[]' so TS knows 'returnedDate' exists
      const data: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort descending (latest returned first)
      data.sort((a, b) => new Date(b.returnedDate || 0).getTime() - new Date(a.returnedDate || 0).getTime());
      setBikes(data);
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-10">
      <header className="sticky top-0 z-20 flex items-center gap-3 p-4 bg-white border-b border-slate-200">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 text-slate-600 border-none cursor-pointer"><ArrowLeft size={20} /></button>
        <h1 className="text-lg font-bold text-slate-900">Returned Vehicles</h1>
      </header>

      <div className="p-4 space-y-3">
        {bikes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Undo2 size={48} className="mb-4 text-slate-200" />
            <p className="font-bold">No returned bikes found.</p>
          </div>
        ) : (
          bikes.map(bike => (
            <div key={bike.id} onClick={() => navigate(`/bike/${bike.id}`)} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer active:scale-95 transition-transform">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-slate-50 rounded-lg"><Bike size={16} className="text-slate-500" /></div>
                  <h4 className="font-bold text-slate-900">{bike.make} {bike.model}</h4>
                </div>
                <span className="bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded-lg text-xs uppercase tracking-wider">
                  Returned
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-2 ml-10">
                <p><span className="font-medium">Reg No:</span> <span className="font-bold text-slate-700">{bike.regNo}</span></p>
                {bike.returnedDate && (
                  <p className="mt-1"><span className="font-medium">Returned On:</span> <span className="text-slate-700 font-bold">{new Date(bike.returnedDate).toLocaleDateString('en-GB')}</span></p>
                )}
                {bike.returnReason && (
                  <div className="mt-2 p-2 bg-orange-50 rounded-lg border border-orange-100">
                    <p className="font-bold text-orange-800/60 uppercase tracking-widest text-[9px] mb-0.5">Reason</p>
                    <p className="text-orange-900 font-semibold">{bike.returnReason}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}