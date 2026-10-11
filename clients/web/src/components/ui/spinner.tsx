import React from "react";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div
      className={`animate-spin rounded-full border-slate-200 border-t-emerald-600 ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`bg-slate-200/60 rounded-2xl animate-pulse ${className}`} />
);
