// src/components/ConfirmAlert.tsx
import type { ReactNode } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { cn } from "../lib/utils";

interface ConfirmAlertProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  isDanger?: boolean; // True na button Red color la varum (eg: Delete/Logout)
  icon?: ReactNode;
}

export default function ConfirmAlert({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  isLoading = false,
  isDanger = true,
  icon,
}: ConfirmAlertProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-1000 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-[320px] shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center mb-5 border shadow-sm",
          isDanger ? "bg-red-50 border-red-100 text-red-500" : "bg-blue-50 border-blue-100 text-blue-500"
        )}>
          {icon || <AlertTriangle size={28} />}
        </div>
        
        <h3 className="text-xl font-bold text-slate-900 mb-2 m-0 tracking-tight">{title}</h3>
        <p className="text-slate-500 font-semibold text-sm mb-8 m-0 leading-relaxed">{message}</p>
        
        <div className="flex w-full gap-3">
          <button 
            onClick={onCancel} 
            disabled={isLoading}
            className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors cursor-pointer border-none"
          >
            {cancelText}
          </button>
          
          <button 
            onClick={onConfirm} 
            disabled={isLoading}
            className={cn(
              "flex-1 py-3.5 rounded-xl text-white font-bold transition-colors flex justify-center items-center shadow-md cursor-pointer border-none",
              isDanger ? "bg-red-500 hover:bg-red-600" : "bg-slate-900 hover:bg-slate-800",
              isLoading && "opacity-70 cursor-not-allowed"
            )}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : confirmText}
          </button>
        </div>

      </div>
    </div>
  );
}