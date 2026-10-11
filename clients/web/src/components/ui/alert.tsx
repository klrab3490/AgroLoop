import React from "react";

export interface AlertProps {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  variant = "info",
  title,
  children,
  className = "",
  onClose,
}) => {
  const variantStyles = {
    info: "bg-blue-50 border-blue-200 text-blue-900",
    success: "bg-emerald-50 border-emerald-200 text-emerald-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
    error: "bg-rose-50 border-rose-200 text-rose-900",
  };

  const icons = {
    info: "ℹ️",
    success: "✅",
    warning: "⚠️",
    error: "❌",
  };

  return (
    <div
      className={`p-4 rounded-2xl border flex items-start gap-3 ${variantStyles[variant]} ${className}`}
      role="alert"
    >
      <span className="text-base select-none">{icons[variant]}</span>
      <div className="flex-1 text-xs">
        {title && <h4 className="font-black text-sm mb-0.5">{title}</h4>}
        <div className="opacity-90 leading-relaxed">{children}</div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-xs font-bold opacity-60 hover:opacity-100 transition px-1"
          aria-label="Dismiss alert"
        >
          ✕
        </button>
      )}
    </div>
  );
};
