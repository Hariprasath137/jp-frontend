// src/pages/AddBike.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  ArrowLeft,
  Plus,
  X,
  FileText,
  ImagePlus,
  Crop,
} from "lucide-react";
import { uploadImageToCloudinary } from "../lib/uploadImage";
import { addNewBike } from "../services/bikeService";
import DocumentEditorModal from "../components/DocumentEditorModal";
import type { Bike, BikeDocument } from "../types";
import { cn } from "../lib/utils";

type ImageState = { file: File; preview: string };
type DocImageState = {
  id: string;
  file: File;
  preview: string;
  name: string;
  isEdited?: boolean;
};

export default function AddBike() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Bike Images
  const [bikeImages, setBikeImages] = useState<ImageState[]>([]);

  // Dynamic Multiple Documents with Custom Name
  const [docImages, setDocImages] = useState<DocImageState[]>([]);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    make: "",
    model: "",
    year: "",
    regNo: "",
    kmDriven: "",
    pendingChallan: "0",
    purchasePrice: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    sellerName: "",
    sellerPhone: "",
    notes: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- BIKE PHOTOS ---
  const handleMultipleBikeImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newImages = files.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
      }));
      setBikeImages((prev) => [...prev, ...newImages]);
      e.target.value = "";
    }
  };

  const removeBikeImage = (index: number) => {
    setBikeImages((prev) => prev.filter((_, i) => i !== index));
  };

  // --- DYNAMIC DOCUMENTS ---
  const handleMultipleDocs = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newDocs: DocImageState[] = files.map((file, idx) => ({
        id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        preview: URL.createObjectURL(file),
        name: "",
      }));
      setDocImages((prev) => [...prev, ...newDocs]);

      // Single document select panna udane Crop/Markup Editor auto-open aagum
      if (newDocs.length === 1) {
        setEditingDocId(newDocs[0].id);
      }
      e.target.value = "";
    }
  };

  const handleDocNameChange = (docId: string, name: string) => {
    setDocImages((prev) =>
      prev.map((doc) => (doc.id === docId ? { ...doc, name } : doc))
    );
  };

  const removeDocImage = (docId: string) => {
    setDocImages((prev) => prev.filter((doc) => doc.id !== docId));
    if (editingDocId === docId) setEditingDocId(null);
  };

  const activeEditingDoc = docImages.find((d) => d.id === editingDocId) || null;

  const handleSaveEditedDoc = (editedFile: File, editedPreview: string) => {
    if (!editingDocId) return;
    setDocImages((prev) =>
      prev.map((doc) =>
        doc.id === editingDocId
          ? { ...doc, file: editedFile, preview: editedPreview, isEdited: true }
          : doc
      )
    );
    setEditingDocId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const [uploadedBikeImages, uploadedDocs] = await Promise.all([
        Promise.all(bikeImages.map((img) => uploadImageToCloudinary(img.file))),
        Promise.all(
          docImages.map(async (doc, idx): Promise<BikeDocument> => {
            const url = await uploadImageToCloudinary(doc.file);
            return {
              id: doc.id,
              name: doc.name.trim() || `Document ${idx + 1}`,
              url,
            };
          })
        ),
      ]);

      const newBike: Omit<Bike, "id" | "createdAt"> = {
        make: formData.make,
        model: formData.model,
        year: formData.year,
        regNo: formData.regNo.toUpperCase(),
        kmDriven: Number(formData.kmDriven),
        pendingChallan: Number(formData.pendingChallan),
        notes: formData.notes,
        purchasePrice: Number(formData.purchasePrice),
        purchaseDate: formData.purchaseDate,
        sellerName: formData.sellerName,
        sellerPhone: formData.sellerPhone,
        status: "in-stock",
        expenses: [],
        images: uploadedBikeImages,
        documents: uploadedDocs,
      };

      await addNewBike(newBike);
      navigate("/inventory");
    } catch (error) {
      alert("Failed to add bike. Please check your connection.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-4 flex items-center gap-4 shadow-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 border-none cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 leading-tight">
            Add New Bike
          </h1>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Inventory Entry
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-6">
        {/* 1. Multiple Bike Images Section */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-slate-900">Bike Photos</h3>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
              {bikeImages.length} Added
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {bikeImages.map((img, idx) => (
              <div
                key={idx}
                className="relative w-28 h-28 shrink-0 rounded-xl overflow-hidden border border-slate-200"
              >
                <img
                  src={img.preview}
                  alt="bike preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeBikeImage(idx)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white cursor-pointer border-none"
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            <div className="relative w-28 h-28 shrink-0 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleMultipleBikeImages}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <ImagePlus size={24} className="mb-1 text-slate-400" />
              <span className="text-[10px] font-bold">Add Photo</span>
            </div>
          </div>
        </div>

        {/* 2. Dynamic Multiple Documents Section (With Crop & Markup Editor) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-900">Documents</h3>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
              {docImages.length} Added
            </span>
          </div>

          {docImages.length > 0 && (
            <div className="space-y-3">
              {docImages.map((doc, idx) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                >
                  {/* Thumbnail (Tap to Crop / Mark) */}
                  <button
                    type="button"
                    onClick={() => setEditingDocId(doc.id)}
                    className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-white p-0 cursor-pointer"
                    title="Crop or Mark Document"
                  >
                    <img
                      src={doc.preview}
                      alt="doc preview"
                      className="w-full h-full object-cover"
                    />
                    {doc.isEdited && (
                      <span className="absolute bottom-0.5 left-0.5 bg-emerald-600 text-white text-[7px] font-extrabold px-1 rounded uppercase">
                        Edited
                      </span>
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                      Document Name
                    </label>
                    <input
                      type="text"
                      value={doc.name}
                      onChange={(e) => handleDocNameChange(doc.id, e.target.value)}
                      placeholder="e.g. RC Front, Insurance, NOC..."
                      required
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none text-sm font-bold text-slate-900"
                    />
                  </div>

                  {/* Crop / Draw Button */}
                  <button
                    type="button"
                    onClick={() => setEditingDocId(doc.id)}
                    className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border-none cursor-pointer shrink-0 hover:bg-blue-100"
                    title="Crop & Mark Document"
                  >
                    <Crop size={15} />
                  </button>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => removeDocImage(doc.id)}
                    className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center border-none cursor-pointer shrink-0 hover:bg-red-100"
                    title={`Remove Document ${idx + 1}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Documents Upload Box */}
          <div className="relative w-full py-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleMultipleDocs}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <FileText size={22} className="mb-1 text-slate-400" />
            <span className="text-xs font-bold text-slate-600">
              + Add Document Photos
            </span>
            <span className="text-[10px] font-semibold text-slate-400 mt-0.5">
              Tap crop icon to trim, circle or highlight
            </span>
          </div>
        </div>

        {/* 3. Vehicle Basic Details */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 mb-2 border-b border-slate-100 pb-2">
            Vehicle Details
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Make
              </label>
              <input
                type="text"
                name="make"
                value={formData.make}
                onChange={handleInputChange}
                placeholder="Yamaha"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Model
              </label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleInputChange}
                placeholder="FZ V3"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none text-sm font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Reg Number
              </label>
              <input
                type="text"
                name="regNo"
                value={formData.regNo}
                onChange={handleInputChange}
                placeholder="TN 11 AB 1234"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none text-sm font-bold uppercase"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Year
              </label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                placeholder="2021"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none text-sm font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                KM Driven
              </label>
              <input
                type="number"
                name="kmDriven"
                value={formData.kmDriven}
                onChange={handleInputChange}
                placeholder="15000"
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-1.5 text-red-500">
                Pending Challan (₹)
              </label>
              <input
                type="number"
                name="pendingChallan"
                value={formData.pendingChallan}
                onChange={handleInputChange}
                placeholder="0"
                className="w-full px-4 py-3 rounded-xl bg-red-50 border border-red-200 focus:ring-2 focus:ring-red-500 outline-none text-sm font-bold text-red-700"
              />
            </div>
          </div>
        </div>

        {/* 4. Purchase Details */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 mb-2 border-b border-slate-100 pb-2">
            Purchase & Seller Details
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Purchase Price (₹)
              </label>
              <input
                type="number"
                name="purchasePrice"
                value={formData.purchasePrice}
                onChange={handleInputChange}
                placeholder="₹"
                required
                className="w-full px-4 py-3 rounded-xl bg-green-50 border border-green-200 focus:ring-2 focus:ring-green-500 outline-none text-lg font-black text-green-700"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Purchased Date
              </label>
              <input
                type="date"
                name="purchaseDate"
                value={formData.purchaseDate}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none text-sm font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Seller Name
              </label>
              <input
                type="text"
                name="sellerName"
                value={formData.sellerName}
                onChange={handleInputChange}
                placeholder="Name"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Seller Phone
              </label>
              <input
                type="tel"
                name="sellerPhone"
                value={formData.sellerPhone}
                onChange={handleInputChange}
                placeholder="10-digit number"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none text-sm font-bold"
              />
            </div>
          </div>
        </div>

        {/* 5. Notes Section */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">
            Extra Notes
          </h3>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="Any pending works, promises made to seller, or bike condition notes..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-slate-900 outline-none text-sm font-medium resize-none"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "w-full py-4 rounded-xl bg-slate-900 text-white font-extrabold hover:bg-slate-800 transition-all flex justify-center items-center gap-2 shadow-lg shadow-slate-900/20 border-none cursor-pointer",
            isLoading && "opacity-70 cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 size={20} className="animate-spin" /> Uploading Data &
              Images...
            </>
          ) : (
            <>
              <Plus size={20} /> Save Bike to Inventory
            </>
          )}
        </button>
      </form>

      {/* DOCUMENT CROP & MARKUP EDITOR */}
      <DocumentEditorModal
        isOpen={!!activeEditingDoc}
        imageSrc={activeEditingDoc?.preview || ""}
        title={activeEditingDoc?.name || "Edit Document"}
        onClose={() => setEditingDocId(null)}
        onSave={handleSaveEditedDoc}
      />
    </div>
  );
}