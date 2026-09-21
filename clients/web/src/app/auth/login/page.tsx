"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      router.push("/");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Invalid credentials. Please check your email and password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
        <div className="text-center space-y-1">
          <div className="inline-block p-3 rounded-2xl bg-emerald-50 text-2xl mb-2">🌿</div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sign In to AgroLoop</h2>
          <p className="text-xs text-slate-500">Access your household wallet, farmer routes, or orders</p>
        </div>

        {/* Demo Quick-Fill Buttons */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-2">
          <p className="text-3xs font-bold text-slate-500 uppercase tracking-wider text-center">
            One-Tap Demo Credentials
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoFill("household@agroloop.com", "household123")}
              className="py-1.5 px-2 text-2xs font-bold bg-white border border-slate-200 rounded-lg hover:border-emerald-500 text-slate-700 transition"
            >
              🏡 Household
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill("farmer@agroloop.com", "farmer123")}
              className="py-1.5 px-2 text-2xs font-bold bg-white border border-slate-200 rounded-lg hover:border-emerald-500 text-slate-700 transition"
            >
              🚜 Farmer
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill("admin@agroloop.com", "admin123")}
              className="py-1.5 px-2 text-2xs font-bold bg-white border border-slate-200 rounded-lg hover:border-emerald-500 text-slate-700 transition"
            >
              🛡️ Admin
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 disabled:bg-slate-300 transition shadow-sm"
          >
            {isSubmitting ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="font-bold text-emerald-600 hover:underline">
            Register as Household
          </Link>
        </p>
      </div>
    </div>
  );
}
