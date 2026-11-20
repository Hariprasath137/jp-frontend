// src/pages/BikeDetails.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Edit, CheckCircle, IndianRupee, MapPin, User, Phone, ImagePlus, Images, Plus, X, Wrench, Trash2, Undo2, Download } from "lucide-react";
import { getBikeById, updateBike } from "../services/bikeService";
import { uploadImageToCloudinary } from "../lib/uploadImage";
import { doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import ConfirmAlert from "../components/ConfirmAlert";
import type { Bike, Expense } from "../types";
import { cn } from "../lib/utils";
import SuccessAlert from "../components/SuccessAlert";

export default function BikeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bike, setBike] = useState<Bike | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals State
  const [showGallery, setShowGallery] = useState(false);
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  
  // Danger Modals
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showReturnAlert, setShowReturnAlert] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Document & Download State
  const [viewDoc, setViewDoc] = useState<{url: string, title: string} | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Expense Form State (Add + Edit + Delete)
  const [expDesc, setExpDesc] = useState("");
  const [expAmt, setExpAmt] = useState("");
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // Sold Form State
  const [soldPrice, setSoldPrice] = useState("");
  const [soldDate, setSoldDate] = useState(new Date().toISOString().split("T")[0]);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerIdFile, setBuyerIdFile] = useState<{file: File, preview: string} | null>(null);

  // Success Alert State
  const [successAction, setSuccessAction] = useState<{title: string, message: string} | null>(null);

  useEffect(() => {
    if (id) {
      getBikeById(id).then(data => {
        setBike(data);
        setLoading(false);
      });
    }
  }, [id]);

  const totalExpenses = bike?.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0;
  const actualTotalCost = (bike?.purchasePrice || 0) + (bike?.pendingChallan || 0) + totalExpenses;
  const expectedProfit = bike && soldPrice ? (Number(soldPrice) - actualTotalCost) : 0;

  // Unified documents list (supports new custom-named docs + old 4 legacy fields)
  const bikeDocuments = Array.isArray(bike?.documents)
    ? bike.documents
    : [
        bike?.rcFrontUrl ? { id: "rc-front", name: "RC Front", url: bike.rcFrontUrl } : null,
        bike?.rcBackUrl ? { id: "rc-back", name: "RC Back", url: bike.rcBackUrl } : null,
        bike?.insuranceUrl ? { id: "insurance", name: "Insurance", url: bike.insuranceUrl } : null,
        bike?.sellerIdProofUrl ? { id: "seller-id", name: "Seller ID", url: bike.sellerIdProofUrl } : null,
      ].filter((d): d is { id: string; name: string; url: string } => Boolean(d));

  // --- DOWNLOAD IMAGE HELPER (Works for Photos & Documents) ---
  const handleDownloadImage = async (url: string, label: string) => {
    if (!url || isDownloading) return;
    setIsDownloading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Fetch failed");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const ext = blob.type.split("/")[1] || "jpg";
      const safeName = `${bike?.regNo || "JP_Bike"}_${label}`.replace(/[^a-zA-Z0-9_-]/g, "_");

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `${safeName}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      // Fallback: Cloudinary direct download flag
      const fallbackUrl = url.includes("/upload/")
        ? url.replace("/upload/", "/upload/fl_attachment/")
        : url;
      window.open(fallbackUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  // --- BIKE ACTIONS ---
  const handleDelete = async () => {
    setIsProcessingAction(true);
    try {
      await deleteDoc(doc(db, "bikes", id!));
      setShowDeleteAlert(false);
      setSuccessAction({ title: "Deleted!", message: "Bike has been permanently removed." });
      setTimeout(() => navigate("/inventory"), 1500); 
    } catch (error) {
      alert("Error deleting bike");
    }
    setIsProcessingAction(false);
  };

  const handleReturn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); 
    setIsProcessingAction(true);
    try {
      await updateDoc(doc(db, "bikes", id!), {
        status: "returned",
        returnedDate: new Date().toISOString(),
        returnReason: returnReason || "No reason provided"
      });
      setShowReturnAlert(false);
      setSuccessAction({ title: "Returned!", message: "Bike moved to Returned Vehicles list." });
      setTimeout(() => navigate("/returned-bikes"), 1500);
    } catch (error) {
      alert("Error returning bike");
    }
    setIsProcessingAction(false);
  };

  // --- EXPENSE ACTIONS (ADD / EDIT / DELETE) ---
  const openAddExpenseModal = () => {
    setEditingExpenseId(null);
    setExpDesc("");
    setExpAmt("");
    setShowExpenseModal(true);
  };

  const openEditExpenseModal = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setExpDesc(exp.description);
    setExpAmt(String(exp.amount));
    setShowExpenseModal(true);
  };

  const closeExpenseModal = () => {
    setShowExpenseModal(false);
    setEditingExpenseId(null);
    setExpDesc("");
    setExpAmt("");
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !bike) return;
    setIsSubmitting(true);
    try {
      let updatedExpenses: Expense[];

      if (editingExpenseId) {
        // Edit existing expense
        updatedExpenses = (bike.expenses || []).map(exp =>
          exp.id === editingExpenseId
            ? { ...exp, description: expDesc, amount: Number(expAmt) }
            : exp
        );
      } else {
        // Add new expense
        const newExpense: Expense = {
          id: Date.now().toString(),
          description: expDesc,
          amount: Number(expAmt),
          date: new Date().toISOString().split("T")[0]
        };
        updatedExpenses = [...(bike.expenses || []), newExpense];
      }

      await updateBike(id, { expenses: updatedExpenses });
      setBike({ ...bike, expenses: updatedExpenses });
      closeExpenseModal();
    } catch (error) {
      alert("Failed to save expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!id || !bike || !expenseToDelete) return;
    setIsProcessingAction(true);
    try {
      const updatedExpenses = (bike.expenses || []).filter(exp => exp.id !== expenseToDelete.id);
      await updateBike(id, { expenses: updatedExpenses });
      setBike({ ...bike, expenses: updatedExpenses });
      setExpenseToDelete(null);
    } catch (error) {
      alert("Failed to delete expense.");
    } finally {
      setIsProcessingAction(false);
    }
  };

  // --- MARK AS SOLD ---
  const handleMarkAsSold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !bike) return;
    setIsSubmitting(true);
    try {
      let idProofUrl = "";
      if (buyerIdFile) idProofUrl = await uploadImageToCloudinary(buyerIdFile.file);
      const updateData: Partial<Bike> = {
        status: 'sold',
        soldPrice: Number(soldPrice),
        soldDate: soldDate,
        customer: { name: buyerName, phone: buyerPhone, address: buyerAddress, idProofUrl }
      };
      await updateBike(id, updateData);
      setBike({ ...bike, ...updateData });
      setShowSoldModal(false);
    } catch (error) {
      alert("Failed to mark as sold.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Loader2 size={32} className="animate-spin text-blue-600" /></div>;
  if (!bike) return <div className="text-center py-20 font-bold text-slate-500">Bike not found</div>;

  return (
    <div className="relative w-full h-full bg-slate-50 flex flex-col overflow-hidden">
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-6 relative">
        
        {/* Cover Image Carousel Area */}
        <div className="relative w-full h-[35vh] min-h-[250px] bg-slate-900 shrink-0">
          
          {/* HEADER NAV BUTTONS */}
          <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
            <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer border-none hover:bg-white/40">
              <ArrowLeft size={20} />
            </button>

            {/* ACTION ICONS (Delete, Return, Edit) */}
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteAlert(true)} className="w-10 h-10 bg-red-500/80 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer border-none hover:bg-red-600">
                <Trash2 size={16} />
              </button>
              
              {bike.status !== 'returned' && (
                <button onClick={() => setShowReturnAlert(true)} className="w-10 h-10 bg-orange-500/80 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer border-none hover:bg-orange-600">
                  <Undo2 size={16} />
                </button>
              )}

              <button onClick={() => navigate(`/edit-bike/${id}`)} className="w-10 h-10 bg-blue-500/80 backdrop-blur-md rounded-full flex items-center justify-center text-white cursor-pointer border-none hover:bg-blue-600">
                <Edit size={16} />
              </button>
            </div>
          </div>

          {bike.images?.[0] ? (
            <img
              src={bike.images[0]}
              alt="Bike"
              onClick={() => setShowGallery(true)}
              className="w-full h-full object-cover opacity-80 cursor-pointer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/40 font-bold">No Photos Added</div>
          )}
          
          <div className="absolute bottom-6 left-4 right-4 z-20 flex justify-between items-end">
            <span className={cn("px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest shadow-lg", 
                bike.status === 'in-stock' ? "bg-blue-500 text-white" : 
                bike.status === 'returned' ? "bg-orange-500 text-white" : "bg-green-500 text-white"
            )}>
              {bike.status.replace('-', ' ')}
            </span>
            
            {bike.images && bike.images.length > 0 && (
              <button onClick={() => setShowGallery(true)} className="px-3 py-1.5 bg-black/50 backdrop-blur-md text-white rounded-lg flex items-center gap-1.5 text-xs font-bold border border-white/20 cursor-pointer">
                <Images size={14} /> {bike.images.length} {bike.images.length === 1 ? "Photo" : "Photos"}
              </button>
            )}
          </div>
        </div>

        {/* Main Detail Card */}
        <div className="relative z-10 px-4 -mt-4 shrink-0">
          <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 space-y-6">
            
            {/* Header */}
            <div>
              <h1 className="text-2xl font-black text-slate-900 leading-tight">{bike.make} {bike.model}</h1>
              <p className="text-sm font-extrabold text-slate-400 uppercase tracking-widest mt-1">{bike.regNo} • {bike.year}</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">KM Driven</p>
                <p className="text-lg font-bold text-slate-900">{bike.kmDriven.toLocaleString()} <span className="text-sm">km</span></p>
              </div>
              <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                <p className="text-[10px] font-extrabold text-green-600/70 uppercase tracking-widest mb-1">Total Cost Base</p>
                <p className="text-lg font-black text-green-700 flex items-center"><IndianRupee size={16}/> {actualTotalCost.toLocaleString()}</p>
              </div>
            </div>

            {/* Acquisition Details */}
            <div className="border-t border-slate-100 pt-5">
              <h3 className="text-sm font-extrabold text-slate-900 mb-3">Acquisition Details</h3>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-500">Purchased On:</span>
                  <span className="text-slate-900">{new Date(bike.purchaseDate).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-500">Seller Name:</span>
                  <span className="text-slate-900">{bike.sellerName || "N/A"}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-slate-500">Seller Phone:</span>
                  <span className="text-blue-500 font-bold flex items-center gap-1">
                    {bike.sellerPhone ? <><Phone size={12}/> {bike.sellerPhone}</> : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-semibold mt-2 pt-2 border-t border-dashed border-slate-200">
                  <span className="text-slate-500">Base Price:</span>
                  <span className="text-slate-900 flex items-center"><IndianRupee size={12}/>{bike.purchasePrice.toLocaleString()}</span>
                </div>
                {bike.pendingChallan > 0 && (
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span className="text-slate-500">Pending Challan:</span>
                    <span className="text-red-500 font-bold flex items-center">+ <IndianRupee size={12}/>{bike.pendingChallan}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Expenses Section (WITH EDIT & DELETE) */}
            <div className="border-t border-slate-100 pt-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-extrabold text-slate-900">Reconditioning / Expenses</h3>
                {bike.status === 'in-stock' && (
                  <button onClick={openAddExpenseModal} className="flex items-center gap-1 text-[10px] font-extrabold bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 cursor-pointer">
                    <Plus size={12}/> Add Expense
                  </button>
                )}
              </div>
              
              {!bike.expenses || bike.expenses.length === 0 ? (
                <p className="text-xs font-semibold text-slate-400 italic">No extra expenses recorded.</p>
              ) : (
                <div className="space-y-2">
                  {bike.expenses.map(exp => (
                    <div key={exp.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0"><Wrench size={14}/></div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{exp.description}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(exp.date).toLocaleDateString('en-GB')}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-slate-900 flex items-center text-sm mr-1">
                          <IndianRupee size={13}/>{exp.amount.toLocaleString('en-IN')}
                        </span>
                        <button
                          onClick={() => openEditExpenseModal(exp)}
                          className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border-none cursor-pointer hover:bg-blue-100 transition-colors"
                          title="Edit Expense"
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => setExpenseToDelete(exp)}
                          className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center border-none cursor-pointer hover:bg-red-100 transition-colors"
                          title="Delete Expense"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-sm font-extrabold pt-2 text-slate-600">
                    <span>Total Extra Spend:</span>
                    <span className="flex items-center"><IndianRupee size={14}/>{totalExpenses.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Documents Showcase */}
            <div className="border-t border-slate-100 pt-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-extrabold text-slate-900">Documents</h3>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  {bikeDocuments.length} {bikeDocuments.length === 1 ? "Doc" : "Docs"}
                </span>
              </div>

              {bikeDocuments.length === 0 ? (
                <p className="text-xs font-semibold text-slate-400 italic">No documents uploaded.</p>
              ) : (
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                  {bikeDocuments.map((docItem) => (
                    <div key={docItem.id} className="shrink-0 w-24 flex flex-col gap-1.5">
                      <div
                        onClick={() => setViewDoc({ url: docItem.url, title: docItem.name })}
                        className="w-full h-16 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center cursor-pointer hover:border-blue-300 transition-colors"
                      >
                        <img
                          src={docItem.url}
                          className="w-full h-full object-cover"
                          alt={docItem.name}
                        />
                      </div>
                      <p className="text-[10px] font-extrabold text-slate-600 text-center uppercase truncate">
                        {docItem.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            {bike.notes && (
              <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                <p className="text-[10px] font-extrabold text-orange-600/70 uppercase tracking-widest mb-1">Important Notes</p>
                <p className="text-xs font-semibold text-orange-900">{bike.notes}</p>
              </div>
            )}

            {/* SOLD DETAILS */}
            {bike.status === 'sold' && bike.customer && (
              <div className="bg-slate-900 p-5 rounded-2xl text-white mt-6 shadow-lg shadow-slate-900/20">
                  <h3 className="text-sm font-extrabold text-white mb-4 flex items-center gap-2"><CheckCircle size={16} className="text-green-400"/> Deal Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-slate-400">Total Invested (Cost):</span>
                      <span className="text-slate-200 flex items-center"><IndianRupee size={14}/>{actualTotalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-semibold border-b border-slate-700 pb-2">
                      <span className="text-slate-400">Final Sold Price:</span>
                      <span className="text-white text-lg font-black flex items-center"><IndianRupee size={14}/>{bike.soldPrice?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-extrabold py-1">
                      <span className="text-slate-300">Net Profit:</span>
                      <span className={cn("text-lg font-black flex items-center", (bike.soldPrice! - actualTotalCost) >= 0 ? "text-green-400" : "text-red-400")}>
                          {(bike.soldPrice! - actualTotalCost) > 0 ? "+" : ""}
                          <IndianRupee size={14}/>{(bike.soldPrice! - actualTotalCost).toLocaleString()}
                      </span>
                    </div>
                    <div className="pt-2 mt-2 border-t border-slate-700/50">
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span className="text-slate-400">Buyer Name:</span>
                        <span>{bike.customer.name}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-semibold mt-1">
                        <span className="text-slate-400">Buyer Phone:</span>
                        <span>{bike.customer.phone}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-semibold mt-1">
                        <span className="text-slate-400">Sold Date:</span>
                        <span>{new Date(bike.soldDate!).toLocaleDateString('en-GB')}</span>
                      </div>
                    </div>
                    
                    {bike.customer.idProofUrl && (
                      <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-col gap-2">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex justify-between items-center">
                          Attached ID Proof
                          <button onClick={() => setViewDoc({url: bike.customer!.idProofUrl!, title: "Buyer ID"})} className="text-blue-400 border-none bg-transparent cursor-pointer">View Full</button>
                        </span>
                        <img onClick={() => setViewDoc({url: bike.customer!.idProofUrl!, title: "Buyer ID"})} src={bike.customer.idProofUrl} alt="Buyer ID" className="w-full h-24 object-cover rounded-xl border border-slate-600 cursor-pointer" />
                      </div>
                    )}
                  </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action bar */}
      {bike.status === 'in-stock' && (
        <div className="w-full shrink-0 bg-white border-t border-slate-200 p-4 z-40">
          <button onClick={() => setShowSoldModal(true)} className="w-full py-4 rounded-xl bg-slate-900 text-white font-extrabold text-sm hover:bg-slate-800 transition-all flex justify-center items-center gap-2 shadow-xl cursor-pointer border-none">
              Mark as Sold & Finalize
          </button>
        </div>
      )}

      {/* 🟢 SUCCESS ALERT */}
      <SuccessAlert 
        isOpen={!!successAction} 
        title={successAction?.title || ""} 
        message={successAction?.message || ""} 
      />
      
      {/* 🔴 DELETE BIKE CONFIRM ALERT */}
      <ConfirmAlert 
        isOpen={showDeleteAlert}
        title="Permanent Delete"
        message="Are you sure you want to permanently delete this bike? This action cannot be undone."
        confirmText="Yes, Delete"
        isDanger={true}
        isLoading={isProcessingAction}
        icon={<Trash2 size={28} />}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteAlert(false)}
      />

      {/* 🔴 DELETE EXPENSE CONFIRM ALERT */}
      <ConfirmAlert 
        isOpen={!!expenseToDelete}
        title="Delete Expense"
        message={`Remove "${expenseToDelete?.description}" (₹${expenseToDelete?.amount?.toLocaleString('en-IN')}) from expenses?`}
        confirmText="Delete"
        isDanger={true}
        isLoading={isProcessingAction}
        icon={<Trash2 size={28} />}
        onConfirm={handleDeleteExpense}
        onCancel={() => setExpenseToDelete(null)}
      />

      {/* 🟠 CUSTOM RETURN MODAL WITH TEXTBOX */}
      {showReturnAlert && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                    <Undo2 size={20}/>
                </div>
                <h2 className="text-lg font-black text-slate-900">Return Bike</h2>
              </div>
              <button onClick={() => setShowReturnAlert(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 border-none cursor-pointer"><X size={16}/></button>
            </div>
            
            <p className="text-sm font-semibold text-slate-500 mb-5">Are you sure this bike was returned? It will be removed from your active stock.</p>
            
            <form onSubmit={handleReturn} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Reason for Return (Optional)</label>
                <textarea 
                    value={returnReason} 
                    onChange={e => setReturnReason(e.target.value)} 
                    placeholder="e.g. Engine fault, Customer cancelled..." 
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold resize-none" 
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowReturnAlert(false)} className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm cursor-pointer border-none">
                    Cancel
                  </button>
                  <button type="submit" disabled={isProcessingAction} className="flex-1 py-3.5 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 flex justify-center items-center cursor-pointer border-none">
                    {isProcessingAction ? <Loader2 size={18} className="animate-spin" /> : "Confirm Return"}
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📄 DOCUMENT VIEWER MODAL (WITH DOWNLOAD BUTTON) */}
      {viewDoc && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-200">
          <div className="p-4 flex justify-between items-center text-white">
            <span className="font-bold text-sm tracking-wide">{viewDoc.title}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadImage(viewDoc.url, viewDoc.title)}
                disabled={isDownloading}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center gap-1.5 text-xs font-bold cursor-pointer border-none text-white transition-colors"
              >
                {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                Download
              </button>
              <button onClick={() => setViewDoc(null)} className="p-2 bg-white/10 rounded-full cursor-pointer border-none text-white"><X size={20}/></button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <img src={viewDoc.url} alt={viewDoc.title} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
          </div>
        </div>
      )}

      {/* 📸 FULL IMAGE GALLERY MODAL (WITH PER-PHOTO DOWNLOAD) */}
      {showGallery && (
        <div className="absolute inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-200">
          <div className="p-4 flex justify-between items-center text-white">
            <span className="font-bold text-sm">Gallery ({bike.images.length} {bike.images.length === 1 ? "Photo" : "Photos"})</span>
            <button onClick={() => setShowGallery(false)} className="p-2 bg-white/10 rounded-full cursor-pointer border-none text-white"><X size={20}/></button>
          </div>
          <div className="flex-1 flex overflow-x-auto snap-x snap-mandatory no-scrollbar items-center">
            {bike.images.map((img, idx) => (
              <div key={idx} className="w-full shrink-0 h-full snap-center flex flex-col items-center justify-center p-4 gap-4">
                <img src={img} alt={`Bike ${idx + 1}`} className="w-full max-h-[70vh] object-contain rounded-lg" />
                <button
                  onClick={() => handleDownloadImage(img, `Photo_${idx + 1}`)}
                  disabled={isDownloading}
                  className="px-5 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-md text-white rounded-full flex items-center gap-2 text-xs font-bold border border-white/20 cursor-pointer transition-colors"
                >
                  {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  Download Photo {idx + 1}
                </button>
              </div>
            ))}
          </div>
          {bike.images.length > 1 && (
            <div className="p-4 text-center text-xs font-bold text-white/50 uppercase tracking-widest">Swipe left/right</div>
          )}
        </div>
      )}

      {/* 💰 ADD / EDIT EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-black text-slate-900">
                {editingExpenseId ? "Edit Expense" : "Add Expense"}
              </h2>
              <button onClick={closeExpenseModal} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 border-none cursor-pointer"><X size={16}/></button>
            </div>
            <form onSubmit={handleSaveExpense} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Description</label>
                <input type="text" required value={expDesc} onChange={e => setExpDesc(e.target.value)} placeholder="Water Wash & Polish" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Amount Spent (₹)</label>
                <input type="number" required value={expAmt} onChange={e => setExpAmt(e.target.value)} placeholder="₹" className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xl font-black text-slate-900" />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-4 mt-2 rounded-xl bg-blue-600 text-white font-extrabold text-sm hover:bg-blue-700 transition-all flex justify-center items-center cursor-pointer border-none">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (editingExpenseId ? "Update Expense" : "Save Expense")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 MARK AS SOLD MODAL 🚀 */}
      {showSoldModal && (
        <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-10">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
                <h2 className="text-lg font-black text-slate-900">Finalize Sale</h2>
                <button onClick={() => setShowSoldModal(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 border-none cursor-pointer"><X size={16}/></button>
              </div>

              <div className="p-5 overflow-y-auto custom-scrollbar">
                <form id="soldForm" onSubmit={handleMarkAsSold} className="space-y-5">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-3 pb-2 border-b border-slate-200">
                          <span>Total Actual Cost Base:</span>
                          <span className="text-slate-900">₹{actualTotalCost.toLocaleString()}</span>
                      </div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Final Selling Price (₹)</label>
                      <input type="number" required value={soldPrice} onChange={(e) => setSoldPrice(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none text-2xl font-black text-slate-900" placeholder="e.g. 55000" />
                      
                      {expectedProfit !== 0 && (
                          <div className="mt-3 flex justify-between items-center text-sm font-extrabold pt-3 border-t border-slate-200">
                            <span className="text-slate-500">Net Profit Estimate:</span>
                            <span className={cn("flex items-center", expectedProfit >= 0 ? "text-green-600" : "text-red-500")}>
                              {expectedProfit > 0 ? "+" : ""}<IndianRupee size={14}/>{expectedProfit.toLocaleString()}
                            </span>
                          </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Sold Date</label>
                          <input type="date" required value={soldDate} onChange={(e) => setSoldDate(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold" />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Buyer Information</h3>
                      <div className="relative"><User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" required value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Full Name" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold" /></div>
                      <div className="relative"><Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="tel" required value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="Phone Number" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold" /></div>
                      <div className="relative"><MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} placeholder="City / Address" className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold" /></div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">Buyer ID Proof Image</label>
                      <div className="relative w-full h-24 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center hover:bg-slate-100 transition-colors overflow-hidden">
                          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && setBuyerIdFile({file: e.target.files[0], preview: URL.createObjectURL(e.target.files[0])})} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                          {buyerIdFile ? <img src={buyerIdFile.preview} className="w-full h-full object-cover" alt="Buyer ID preview" /> : <><ImagePlus size={20} className="text-slate-400 mb-1" /><span className="text-[10px] font-bold text-slate-500">Tap to upload ID</span></>}
                      </div>
                    </div>
                </form>
              </div>
              
              <div className="p-4 border-t border-slate-100 bg-white">
                  <button form="soldForm" type="submit" disabled={isSubmitting} className="w-full py-4 rounded-xl bg-slate-900 text-white font-extrabold text-sm hover:bg-slate-800 transition-all flex justify-center items-center gap-2 border-none cursor-pointer">
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : "Confirm Sale"}
                  </button>
              </div>
            </div>
        </div>
      )}
    </div>
  );
}