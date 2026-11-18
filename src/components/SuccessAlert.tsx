// src/components/SuccessAlert.tsx
import { CheckCircle2 } from "lucide-react";
import { cn } from "../lib/utils";

interface SuccessAlertProps {
  isOpen: boolean;
  title: string;
  message: string;
}

export default function SuccessAlert({ isOpen, title, message }: SuccessAlertProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-[280px] bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 size={36} />
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
        <p className="text-sm font-semibold text-slate-500 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}