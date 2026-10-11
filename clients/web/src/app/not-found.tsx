import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-100 shadow-xl p-8 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl font-black select-none">
          404
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Page Not Found</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            The page you are looking for doesn't exist, has been removed, or was moved to another URL.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/">
            <Button variant="primary" size="sm">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
