// src/pages/MaintenancePage.tsx
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  IndianRupee,
  Calendar,
  Trash2,
  Edit,
  X,
  Zap,
  Home,
  Users,
  Droplets,
  Megaphone,
  Wrench,
  Receipt,
  Loader2,
  Tag,
  Filter,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  setDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../firebase/config";
import ConfirmAlert from "../components/ConfirmAlert";
import type { MaintenanceCategory, MaintenanceExpense } from "../types";
import { cn } from "../lib/utils";

const DEFAULT_CATEGORIES: {
  name: string;
  icon: any;
  bg: string;
  text: string;
}[] = [
  { name: "Rent", icon: Home, bg: "bg-purple-50", text: "text-purple-600" },
  { name: "Electricity", icon: Zap, bg: "bg-amber-50", text: "text-amber-600" },
  { name: "Salary", icon: Users, bg: "bg-blue-50", text: "text-blue-600" },
  { name: "Water", icon: Droplets, bg: "bg-cyan-50", text: "text-cyan-600" },
  { name: "Marketing", icon: Megaphone, bg: "bg-pink-50", text: "text-pink-600" },
  { name: "Maintenance", icon: Wrench, bg: "bg-orange-50", text: "text-orange-600" },
];

const DEFAULT_CATEGORY_NAMES = DEFAULT_CATEGORIES.map((c) => c.name);

const getCategoryMeta = (cat: string) => {
  const found = DEFAULT_CATEGORIES.find(
    (c) => c.name.toLowerCase() === cat.toLowerCase()
  );
  if (found) return found;
  return { name: cat, icon: Tag, bg: "bg-indigo-50", text: "text-indigo-600" };
};

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
        month: "short",
        year: "numeric",
      }),
    }));
};

export default function MaintenancePage() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<MaintenanceExpense[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonth = `${new Date().getFullYear()}-${String(
    new Date().getMonth() + 1
  ).padStart(2, "0")}`;

  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Modal & CRUD States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [category, setCategory] = useState<MaintenanceCategory>("Rent");
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Delete Alert State
  const [deleteItem, setDeleteItem] = useState<MaintenanceExpense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Load Maintenance Bills + Saved Custom Categories in Real-Time
  useEffect(() => {
    const q = query(collection(db, "maintenance"), orderBy("date", "desc"));
    const unsubBills = onSnapshot(q, (snap) => {
      const data: MaintenanceExpense[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<MaintenanceExpense, "id">),
      }));
      setExpenses(data);
      setLoading(false);
    });

    const catDocRef = doc(db, "settings", "maintenance_categories");
    const unsubCats = onSnapshot(catDocRef, (snap) => {
      if (snap.exists()) {
        const items = snap.data()?.items;
        if (Array.isArray(items)) {
          setCustomCategories(items.filter((x) => typeof x === "string" && x.trim()));
        }
      }
    });

    return () => {
      unsubBills();
      unsubCats();
    };
  }, []);

  // Combined list of all selectable categories (Default + Saved Custom + Used in existing bills)
  const allSelectableCategories = useMemo(() => {
    const seen = new Set(DEFAULT_CATEGORY_NAMES.map((c) => c.toLowerCase()));
    const extras: string[] = [];

    const addUnique = (name: string) => {
      const trimmed = name.trim();
      if (!trimmed || trimmed.toLowerCase() === "other") return;
      if (!seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        extras.push(trimmed);
      }
    };

    customCategories.forEach(addUnique);
    expenses.forEach((e) => e.category && addUnique(e.category));

    return [...DEFAULT_CATEGORY_NAMES, ...extras];
  }, [customCategories, expenses]);

  const months = useMemo(
    () => getPastMonths(expenses.map((e) => e.date)),
    [expenses]
  );

  const filteredExpenses = useMemo(() => {
    return expenses.filter((item) => {
      const matchMonth =
        selectedMonth === "all" || (item.date && item.date.startsWith(selectedMonth));
      const matchCategory = categoryFilter === "All" || item.category === categoryFilter;
      return matchMonth && matchCategory;
    });
  }, [expenses, selectedMonth, categoryFilter]);

  const totalAmount = useMemo(
    () => filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [filteredExpenses]
  );

  // Category Breakdown for selected month
  const categoryBreakdown = useMemo(() => {
    const monthItems = expenses.filter(
      (item) => selectedMonth === "all" || (item.date && item.date.startsWith(selectedMonth))
    );
    const map: Record<string, number> = {};
    monthItems.forEach((item) => {
      map[item.category] = (map[item.category] || 0) + Number(item.amount || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses, selectedMonth]);

  const openAddModal = () => {
    setEditingId(null);
    setCategory("Rent");
    setCustomCategoryInput("");
    setTitle("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setShowModal(true);
  };

  const openEditModal = (item: MaintenanceExpense) => {
    setEditingId(item.id);
    setCategory(item.category);
    setCustomCategoryInput("");
    setTitle(item.title);
    setAmount(String(item.amount));
    setDate(item.date);
    setNotes(item.notes || "");
    setShowModal(true);
  };

  const handleRemoveCustomCategory = async (catName: string) => {
    try {
      await updateDoc(doc(db, "settings", "maintenance_categories"), {
        items: arrayRemove(catName),
      });
      if (category === catName) setCategory("Rent");
      if (categoryFilter === catName) setCategoryFilter("All");
    } catch (error) {
      console.error("Failed to remove custom category:", error);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    // Resolve final category (handle "Other" custom input)
    let finalCategory = String(category);
    if (category === "Other") {
      const cleaned = customCategoryInput.trim();
      if (!cleaned) {
        alert("Please enter a category name.");
        return;
      }
      finalCategory = cleaned;
    }

    setIsSaving(true);
    try {
      // If user added a brand-new category via "Other", save it permanently for future selection
      const alreadyExists = DEFAULT_CATEGORY_NAMES.some(
        (c) => c.toLowerCase() === finalCategory.toLowerCase()
      );
      if (category === "Other" && !alreadyExists) {
        await setDoc(
          doc(db, "settings", "maintenance_categories"),
          { items: arrayUnion(finalCategory) },
          { merge: true }
        );
      }

      const payload = {
        category: finalCategory,
        title: title.trim() || finalCategory,
        amount: Number(amount),
        date,
        notes: notes.trim(),
      };

      if (editingId) {
        await updateDoc(doc(db, "maintenance", editingId), payload);
      } else {
        await addDoc(collection(db, "maintenance"), {
          ...payload,
          createdAt: Date.now(),
        });
      }

      setShowModal(false);
      setCustomCategoryInput("");
    } catch (error) {
      alert("Failed to save maintenance expense.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "maintenance", deleteItem.id));
      setDeleteItem(null);
    } catch (error) {
      alert("Failed to delete expense.");
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedMonthLabel =
    selectedMonth === "all"
      ? "All Time"
      : months.find((m) => m.value === selectedMonth)?.label || selectedMonth;

  return (
    <div className="w-full min-h-full bg-slate-50 flex flex-col pb-24 overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-200">
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
                Shop Maintenance
              </h1>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                EB • Rent • Salary • Bills
              </p>
            </div>
          </div>

          <button
            onClick={openAddModal}
            className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-md hover:bg-slate-800 border-none cursor-pointer"
            title="Add Maintenance Expense"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Clean 2-Column Filters (No Horizontal Scrollbar / Drag Bar) */}
        <div className="px-5 pb-3.5 grid grid-cols-2 gap-2.5">
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none w-full pl-9 pr-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none cursor-pointer focus:ring-2 focus:ring-slate-900 truncate"
            >
              <option value="all">All Time</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <Calendar
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>

          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none w-full pl-9 pr-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none cursor-pointer focus:ring-2 focus:ring-slate-900 truncate"
            >
              <option value="All">All Categories</option>
              {allSelectableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <Filter
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-5 space-y-5">
        {/* Hero Summary Card */}
        <div className="relative bg-gradient-to-br from-rose-600 to-orange-600 p-6 rounded-[2rem] text-white shadow-xl shadow-rose-200/60 overflow-hidden">
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/15 rounded-full blur-2xl" />
          <p className="text-rose-100 text-xs font-bold uppercase tracking-widest mb-1">
            Maintenance • {selectedMonthLabel}
          </p>
          <h2 className="text-3xl font-black flex items-center tracking-tight">
            <IndianRupee size={26} className="mr-0.5" />
            {totalAmount.toLocaleString("en-IN")}
          </h2>
          <p className="text-xs font-semibold text-rose-100 mt-1">
            {filteredExpenses.length}{" "}
            {filteredExpenses.length === 1 ? "bill recorded" : "bills recorded"}
          </p>

          {/* Mini Category Breakdown Pills (Wraps cleanly, no scrollbar) */}
          {categoryBreakdown.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/20">
              {categoryBreakdown.map(([catName, catAmt]) => (
                <div
                  key={catName}
                  className="bg-white/15 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5"
                >
                  <span className="text-rose-100">{catName}:</span>
                  <span>₹{catAmt.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expense List */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-extrabold text-slate-400 uppercase text-xs tracking-wider">
              Expense Entries ({filteredExpenses.length})
            </h3>
            <button
              onClick={openAddModal}
              className="text-xs font-extrabold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 cursor-pointer flex items-center gap-1"
            >
              <Plus size={13} /> Add Bill
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={28} className="animate-spin text-slate-400" />
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <Receipt size={38} className="mx-auto text-slate-300 mb-3" />
              <p className="font-bold text-slate-500 text-sm">
                No maintenance expenses found
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Tap + to add Rent, EB Bill, Salary or Shop Expenses.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredExpenses.map((item) => {
                const meta = getCategoryMeta(item.category);
                const IconComp = meta.icon;

                return (
                  <div
                    key={item.id}
                    className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                          meta.bg,
                          meta.text
                        )}
                      >
                        <IconComp size={20} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className={cn(
                              "text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
                              meta.bg,
                              meta.text
                            )}
                          >
                            {item.category}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {new Date(item.date).toLocaleDateString("en-GB")}
                          </span>
                        </div>
                        {item.notes && (
                          <p className="text-[11px] text-slate-500 mt-1 truncate">
                            {item.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-black text-slate-900 text-sm flex items-center mr-1">
                        <IndianRupee size={13} />
                        {Number(item.amount).toLocaleString("en-IN")}
                      </span>
                      <button
                        onClick={() => openEditModal(item)}
                        className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border-none cursor-pointer hover:bg-blue-100"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteItem(item)}
                        className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center border-none cursor-pointer hover:bg-red-100"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ADD / EDIT MAINTENANCE MODAL (Rendered via Portal so it NEVER clips under JP BIKE header) */}
      {showModal &&
        createPortal(
          <div
            onClick={() => setShowModal(false)}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[375px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[86dvh] animate-in zoom-in-95 duration-150"
            >
              {/* Fixed Modal Header */}
              <div className="px-5 pt-5 pb-3.5 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white">
                <h2 className="text-lg font-black text-slate-900">
                  {editingId ? "Edit Maintenance Bill" : "Add Maintenance Bill"}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 border-none cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Modal Body (Scrollbar completely hidden) */}
              <div className="p-5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <form id="maintenanceForm" onSubmit={handleSave} className="space-y-4">
                  {/* Category Selector Grid (Default + Saved Custom + Other) */}
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-2">
                      Category
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {allSelectableCategories.map((catName) => {
                        const meta = getCategoryMeta(catName);
                        const IconComp = meta.icon;
                        const active = category === catName;
                        const isSavedCustom = customCategories.includes(catName);

                        return (
                          <div key={catName} className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setCategory(catName);
                                setCustomCategoryInput("");
                              }}
                              className={cn(
                                "w-full p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all",
                                active
                                  ? "bg-slate-900 text-white border-slate-900 shadow-md"
                                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                              )}
                            >
                              <IconComp size={16} />
                              <span className="truncate w-full text-center">
                                {catName}
                              </span>
                            </button>

                            {/* Quick remove button for user-added custom categories */}
                            {isSavedCustom && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveCustomCategory(catName);
                                }}
                                title={`Remove ${catName}`}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center border-2 border-white cursor-pointer shadow-sm"
                              >
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        );
                      })}

                      {/* Other Button (Triggers New Category Input) */}
                      <button
                        type="button"
                        onClick={() => setCategory("Other")}
                        className={cn(
                          "w-full p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 cursor-pointer transition-all",
                          category === "Other"
                            ? "bg-slate-900 text-white border-slate-900 shadow-md"
                            : "bg-slate-50 text-slate-600 border-dashed border-slate-300 hover:bg-slate-100"
                        )}
                      >
                        <Plus size={16} />
                        <span>Other</span>
                      </button>
                    </div>
                  </div>

                  {/* Custom Category Input (Shows when "Other" is clicked) */}
                  {category === "Other" && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1.5 animate-in fade-in duration-150">
                      <label className="block text-[10px] font-extrabold text-indigo-700 uppercase tracking-widest">
                        New Category Name (Auto-Saves to List)
                      </label>
                      <input
                        type="text"
                        required
                        autoFocus
                        value={customCategoryInput}
                        onChange={(e) => setCustomCategoryInput(e.target.value)}
                        placeholder="e.g. Internet, Tea, Security..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-indigo-200 outline-none text-sm font-bold text-slate-900 focus:border-indigo-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                      Title / Description
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. November Shop Rent, EB Bill..."
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold focus:border-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                        Amount (₹)
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="₹"
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-lg font-black text-slate-900 focus:border-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                        Date
                      </label>
                      <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-3 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold focus:border-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                      Notes (Optional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Paid via GPay / Cash..."
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-semibold focus:border-slate-900"
                    />
                  </div>
                </form>
              </div>

              {/* Fixed Modal Footer */}
              <div className="px-5 py-4 border-t border-slate-100 bg-white shrink-0">
                <button
                  form="maintenanceForm"
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-3.5 rounded-xl bg-slate-900 text-white font-extrabold text-sm hover:bg-slate-800 transition-all flex justify-center items-center gap-2 border-none cursor-pointer"
                >
                  {isSaving ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : editingId ? (
                    "Update Bill"
                  ) : (
                    "Save Bill"
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* DELETE CONFIRM ALERT (Rendered via Portal above Header) */}
      {deleteItem &&
        createPortal(
          <div className="fixed inset-0 z-[999]">
            <ConfirmAlert
              isOpen={!!deleteItem}
              title="Delete Maintenance Bill"
              message={`Remove "${deleteItem?.title}" (₹${Number(
                deleteItem?.amount || 0
              ).toLocaleString("en-IN")})?`}
              confirmText="Delete"
              isDanger={true}
              isLoading={isDeleting}
              icon={<Trash2 size={28} />}
              onConfirm={handleDelete}
              onCancel={() => setDeleteItem(null)}
            />
          </div>,
          document.body
        )}
    </div>
  );
}