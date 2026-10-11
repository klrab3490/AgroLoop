import React from "react";
import Link from "next/link";
import { Button } from "./button";

export interface EmptyStateProps {
  icon?: string | React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "🔍",
  title,
  description,
  actionText,
  actionHref,
  onAction,
  className = "",
}) => (
  <div className={`p-12 text-center max-w-md mx-auto space-y-4 ${className}`}>
    <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-100 flex items-center justify-center text-3xl select-none">
      {icon}
    </div>
    <div className="space-y-1">
      <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
    {(actionText && (actionHref || onAction)) && (
      <div className="pt-2">
        {actionHref ? (
          <Link href={actionHref}>
            <Button size="sm">{actionText}</Button>
          </Link>
        ) : (
          <Button size="sm" onClick={onAction}>
            {actionText}
          </Button>
        )}
      </div>
    )}
  </div>
);
