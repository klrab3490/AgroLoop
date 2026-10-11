"use client";

import React from "react";
import { useToastContext } from "@/context/toast-context";

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastContext();

  if (toasts.length === 0) return null;

  const typeStyles = {
    success: "bg-emerald-950/90 text-emerald-100 border-emerald-800",
    error: "bg-rose-950/90 text-rose-100 border-rose-800",
    warning: "bg-amber-950/90 text-amber-100 border-amber-800",
    info: "bg-slate-900/90 text-white border-slate-700",
  };

  const typeIcons = {
    success: "✓",
    error: "✕",
    warning: "!",
    info: "ℹ",
  };

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md text-xs font-bold transition-all animate-in slide-in-from-top-2 duration-200 ${typeStyles[toast.type]}`}
          role="status"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px]">
              {typeIcons[toast.type]}
            </span>
            <span className="leading-tight">{toast.message}</span>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white/60 hover:text-white px-1 font-normal transition text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};
