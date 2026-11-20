// src/pages/EditBikePage.tsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, Save, IndianRupee, ImagePlus, X, CheckCircle, FileText } from "lucide-react";
import { getBikeById, updateBike } from "../services/bikeService";
import { uploadImageToCloudinary } from "../lib/uploadImage";
import type { Bike, BikeDocument } from "../types";

type NewDocItem = { id: string; file: File; preview: string; name: string };

// Helper: Load dynamic documents or convert legacy 4 fields automatically
const extractExistingDocuments = (data: Bike): BikeDocument[] => {
  if (Array.isArray(data.documents)) return data.documents;
  const legacyDocs: BikeDocument[] = [];
  if (data.rcFrontUrl) legacyDocs.push({ id: "legacy-rc-front", name: "RC Front", url: data.rcFrontUrl });
  if (data.rcBackUrl) legacyDocs.push({ id: "legacy-rc-back", name: "RC Back", url: data.rcBackUrl });
  if (data.insuranceUrl) legacyDocs.push({ id: "legacy-insurance", name: "Insurance", url: data.insuranceUrl });
  if (data.sellerIdProofUrl) legacyDocs.push({ id: "legacy-seller-id", name: "Seller ID", url: data.sellerIdProofUrl });
  return legacyDocs;
};

export default function EditBikePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Bike>>({});

  // Gallery Image States
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<{ file: File; preview: string }[]>([]);

  // Dynamic Documents States
  const [existingDocs, setExistingDocs] = useState<BikeDocument[]>([]);
  const [newDocs, setNewDocs] = useState<NewDocItem[]>([]);

  useEffect(() => {
    if (id) {
      getBikeById(id).then((data) => {
        if (data) {
          setFormData(data);
          setExistingImages(data.images || []);
          setExistingDocs(extractExistingDocuments(data));
        }
        setLoading(false);
      });
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" && name !== "year" ? Number(value) : value,
    }));
  };

  // --- GALLERY IMAGE HANDLING ---
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const newImagesData = filesArray.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setNewImages((prev) => [...prev, ...newImagesData]);
      e.target.value = "";
    }
  };

  const removeExistingImage = (indexToRemove: number) => {
    setExistingImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const removeNewImage = (indexToRemove: number) => {
    setNewImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  // --- DYNAMIC DOCUMENT HANDLING ---
  const handleAddDocs = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      const added: NewDocItem[] = filesArray.map((file, idx) => ({
        id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        preview: URL.createObjectURL(file),
        name: "",
      }));
      setNewDocs((prev) => [...prev, ...added]);
      e.target.value = "";
    }
  };

  const renameExistingDoc = (docId: string, name: string) => {
    setExistingDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, name } : d)));
  };

  const removeExistingDoc = (docId: string) => {
    setExistingDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  const renameNewDoc = (docId: string, name: string) => {
    setNewDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, name } : d)));
  };

  const removeNewDoc = (docId: string) => {
    setNewDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  // --- SUBMIT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);

    try {
      // 1. Upload Gallery Images & New Documents Concurrently
      const [uploadedGalleryUrls, uploadedNewDocs] = await Promise.all([
        Promise.all(newImages.map((item) => uploadImageToCloudinary(item.file))),
        Promise.all(
          newDocs.map(async (item, idx): Promise<BikeDocument> => {
            const url = await uploadImageToCloudinary(item.file);
            return {
              id: item.id,
              name: item.name.trim() || `Document ${existingDocs.length + idx + 1}`,
              url,
            };
          })
        ),
      ]);

      const finalImages = [...existingImages, ...uploadedGalleryUrls.filter(Boolean)];
      const cleanedExistingDocs = existingDocs.map((doc, idx) => ({
        ...doc,
        name: doc.name.trim() || `Document ${idx + 1}`,
      }));
      const finalDocuments = [...cleanedExistingDocs, ...uploadedNewDocs];

      // 2. Save to DB (clear legacy fields since all docs now live in 'documents')
      const updatedData: Partial<Bike> = {
        ...formData,
        images: finalImages,
        documents: finalDocuments,
        rcFrontUrl: "",
        rcBackUrl: "",
        insuranceUrl: "",
        sellerIdProofUrl: "",
      };

      await updateBike(id, updatedData);
      navigate(`/bike/${id}`);
    } catch (error) {
      alert("Failed to update bike details.");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between p-4 bg-white/90 backdrop-blur-md border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border-none cursor-pointer hover:bg-slate-200"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-tight">Edit Details</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {formData.regNo}
            </p>
          </div>
        </div>
      </header>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-5">
        <form id="editForm" onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Gallery Photos */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-sm font-black text-slate-900 mb-2 border-b border-slate-100 pb-2">
              Bike Photos
            </h2>

            <div className="flex flex-wrap gap-3">
              <div className="relative w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center hover:bg-slate-100 cursor-pointer transition-colors shrink-0">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <ImagePlus size={20} className="text-slate-400 mb-1" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                  Add
                </span>
              </div>

              {existingImages.map((url, idx) => (
                <div
                  key={`existing-${idx}`}
                  className="relative w-20 h-20 rounded-xl border border-slate-200 shrink-0 overflow-hidden"
                >
                  <img src={url} className="w-full h-full object-cover" alt="bike" />
                  <button
                    type="button"
                    onClick={() => removeExistingImage(idx)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500/90 text-white rounded-full flex items-center justify-center cursor-pointer border-none shadow-sm z-20"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}

              {newImages.map((item, idx) => (
                <div
                  key={`new-${idx}`}
                  className="relative w-20 h-20 rounded-xl border-2 border-blue-200 shrink-0 overflow-hidden"
                >
                  <img src={item.preview} className="w-full h-full object-cover opacity-80" alt="preview" />
                  <div className="absolute inset-0 border-2 border-blue-400 rounded-xl pointer-events-none"></div>
                  <button
                    type="button"
                    onClick={() => removeNewImage(idx)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500/90 text-white rounded-full flex items-center justify-center cursor-pointer border-none shadow-sm z-20"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Sales Details (Only visible if sold) */}
          {formData.status === "sold" && (
            <div className="bg-green-50/50 p-5 rounded-3xl shadow-sm border border-green-100 space-y-4">
              <h2 className="text-sm font-black text-green-800 mb-2 border-b border-green-200/50 pb-2 flex items-center gap-2">
                <CheckCircle size={16} className="text-green-600" /> Sales Information
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-green-700 uppercase tracking-widest mb-1.5">
                    Final Sold Price
                  </label>
                  <div className="relative">
                    <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600" />
                    <input
                      type="number"
                      name="soldPrice"
                      value={formData.soldPrice || ""}
                      onChange={handleChange}
                      required
                      className="w-full pl-9 pr-4 py-3 rounded-xl bg-white border border-green-200 outline-none text-sm font-black text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-green-700 uppercase tracking-widest mb-1.5">
                    Sold Date
                  </label>
                  <input
                    type="date"
                    name="soldDate"
                    value={formData.soldDate || ""}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-white border border-green-200 outline-none text-sm font-bold text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Vehicle Info */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-sm font-black text-slate-900 mb-2 border-b border-slate-100 pb-2">
              Vehicle Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                  Brand / Make
                </label>
                <input
                  type="text"
                  name="make"
                  value={formData.make || ""}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                  Model
                </label>
                <input
                  type="text"
                  name="model"
                  value={formData.model || ""}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                  Reg Number
                </label>
                <input
                  type="text"
                  name="regNo"
                  value={formData.regNo || ""}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-black uppercase focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                  Mfg Year
                </label>
                <input
                  type="number"
                  name="year"
                  value={formData.year || ""}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                KM Driven
              </label>
              <input
                type="number"
                name="kmDriven"
                value={formData.kmDriven || ""}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold focus:border-blue-500"
              />
            </div>
          </div>

          {/* Section 3: Acquisition Details */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <h2 className="text-sm font-black text-slate-900 mb-2 border-b border-slate-100 pb-2">
              Acquisition Details
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                  Purchase Price
                </label>
                <div className="relative">
                  <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    name="purchasePrice"
                    value={formData.purchasePrice || ""}
                    onChange={handleChange}
                    required
                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                  Pending Challan
                </label>
                <div className="relative">
                  <IndianRupee size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    name="pendingChallan"
                    value={formData.pendingChallan || ""}
                    onChange={handleChange}
                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold text-red-600 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                Purchase Date
              </label>
              <input
                type="date"
                name="purchaseDate"
                value={formData.purchaseDate || ""}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                  Seller Name
                </label>
                <input
                  type="text"
                  name="sellerName"
                  value={formData.sellerName || ""}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
                  Seller Phone
                </label>
                <input
                  type="tel"
                  name="sellerPhone"
                  value={formData.sellerPhone || ""}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Dynamic Documents Editor */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h2 className="text-sm font-black text-slate-900">Documents</h2>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                {existingDocs.length + newDocs.length} Total
              </span>
            </div>

            {/* Existing Documents */}
            <div className="space-y-3">
              {existingDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-white">
                    <img src={doc.url} alt={doc.name} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                      Document Name
                    </label>
                    <input
                      type="text"
                      value={doc.name}
                      onChange={(e) => renameExistingDoc(doc.id, e.target.value)}
                      placeholder="Document name..."
                      required
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 focus:border-blue-500 outline-none text-sm font-bold text-slate-900"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeExistingDoc(doc.id)}
                    className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center border-none cursor-pointer shrink-0 hover:bg-red-100"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}

              {/* Newly Added Documents */}
              {newDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-blue-50/50 border border-blue-200"
                >
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-blue-300 shrink-0 bg-white">
                    <img src={doc.preview} alt="new doc" className="w-full h-full object-cover" />
                    <span className="absolute bottom-0.5 left-0.5 bg-blue-600 text-white text-[7px] font-bold px-1 rounded uppercase">
                      New
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <label className="block text-[9px] font-extrabold text-blue-600 uppercase tracking-widest mb-1">
                      Document Name
                    </label>
                    <input
                      type="text"
                      value={doc.name}
                      onChange={(e) => renameNewDoc(doc.id, e.target.value)}
                      placeholder="e.g. RC Front, NOC, Insurance..."
                      required
                      className="w-full px-3 py-2 rounded-lg bg-white border border-blue-200 focus:border-blue-500 outline-none text-sm font-bold text-slate-900"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeNewDoc(doc.id)}
                    className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center border-none cursor-pointer shrink-0 hover:bg-red-100"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add More Documents Button */}
            <div className="relative w-full py-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleAddDocs}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <FileText size={20} className="mb-1 text-slate-400" />
              <span className="text-xs font-bold text-slate-600">+ Add More Documents</span>
            </div>
          </div>

          {/* Section: Notes */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5">
              Internal Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes || ""}
              onChange={handleChange}
              rows={3}
              placeholder="Any important repairs or details..."
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-sm font-bold resize-none focus:border-blue-500"
            />
          </div>

          {/* SAVE BUTTON */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-blue-600 text-white font-extrabold text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex justify-center items-center gap-2 border-none cursor-pointer mt-4"
          >
            {saving ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Save size={20} /> Save All Changes
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}