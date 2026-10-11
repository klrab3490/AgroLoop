"use client";

import React, { useEffect, useRef } from "react";

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  recordIdentifier?: string;
  consequences?: string[];
  isDestructive?: boolean;
  reversible?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  description,
  recordIdentifier,
  consequences = [],
  isDestructive = false,
  reversible = true,
  confirmLabel = "Confirm Action",
  cancelLabel = "Cancel",
  isLoading = false,
  children,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onCancel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200"
      >
        {/* Header Icon & Title */}
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
              isDestructive
                ? "bg-rose-50 text-rose-600 ring-2 ring-rose-100"
                : "bg-emerald-50 text-emerald-600 ring-2 ring-emerald-100"
            }`}
          >
            {isDestructive ? "⚠️" : "🛡️"}
          </div>
          <div className="space-y-1">
            <h3
              id="confirmation-modal-title"
              className="text-base font-extrabold text-slate-900 tracking-tight"
            >
              {title}
            </h3>
            {recordIdentifier && (
              <span className="inline-block px-2 py-0.5 rounded-md font-mono text-3xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                {recordIdentifier}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-600 leading-relaxed">{description}</p>

        {/* Custom content / form inputs */}
        {children && <div className="space-y-2">{children}</div>}

        {/* Consequence Checklist */}
        {consequences.length > 0 && (
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
            <span className="text-3xs uppercase font-bold tracking-wider text-slate-400 block">
              Consequential Impacts
            </span>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {consequences.map((consequence, idx) => (
                <li key={idx} className="flex items-start gap-2 text-2xs">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>{consequence}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Reversibility Notice */}
        <div className="flex items-center gap-1.5 text-3xs font-semibold text-slate-400">
          <span>ℹ️</span>
          <span>
            {reversible
              ? "This action can be modified or reversed by operators later if necessary."
              : "Warning: This action is permanent and creates an immutable ledger record."}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4.5 py-2 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
            }`}
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{isLoading ? "Processing..." : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
