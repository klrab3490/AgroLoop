"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console or error tracking service
    console.error("AgroLoop Web Error Boundary Caught:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 shadow-xl p-8 text-center space-y-6 animate-in fade-in zoom-in-95">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center text-3xl select-none">
          ⚠️
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Something went wrong</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error.message || "An unexpected error occurred while processing your request."}
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-slate-400">Error Digest: {error.digest}</p>
          )}
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={() => reset()}>
            Try Again
          </Button>
          <Link href="/">
            <Button variant="primary" size="sm">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
