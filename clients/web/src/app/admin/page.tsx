"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function AdminHubPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const backendOrigin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";
  const actuatorUrl = `${backendOrigin.replace(/\/+$/, "")}/admin/dashboard`;
  const swaggerUrl = `${backendOrigin.replace(/\/+$/, "")}/swagger-ui.html`;

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="h-44 rounded-3xl bg-slate-200/60 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="h-28 rounded-2xl bg-slate-200/50 animate-pulse" />
          <div className="h-28 rounded-2xl bg-slate-200/50 animate-pulse" />
          <div className="h-28 rounded-2xl bg-slate-200/50 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "ROLE_ADMIN") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-2xl font-black">
          🛡️
        </div>
        <h2 className="text-2xl font-black text-slate-900">Restricted Administrator Console</h2>
        <p className="text-xs text-slate-500">
          Sign in with an authenticated System Administrator account to access operational metrics and platform governance.
        </p>
        <Link
          href="/auth/login"
          className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition"
        >
          Sign In as Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-8 sm:p-10 shadow-xl border border-slate-700/50">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-2xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>CLUSTER HEALTHY • SPRING BOOT 3 ENGINE</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Platform Governance Console
            </h1>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Supervising regional closed-loop organic waste streams, decentralized EcoToken minting ledgers, and marketplace order adjudication.
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2 bg-white/5 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/10">
            <span className="text-2xs uppercase tracking-wider text-slate-400 font-bold">Authenticated Operator</span>
            <span className="text-base font-black text-white">{user?.name || "System Administrator"}</span>
            <span className="text-3xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
              {user?.email}
            </span>
          </div>
        </div>
      </div>

      {/* Key Metric Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 hover:border-emerald-300 transition">
          <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Waste Diverted</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">49.4</span>
            <span className="text-xs font-semibold text-slate-500">kg total</span>
          </div>
          <p className="text-2xs text-emerald-600 font-medium">✓ Closed-loop organic verification</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 hover:border-emerald-300 transition">
          <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Marketplace Inputs</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">20</span>
            <span className="text-xs font-semibold text-slate-500">active products</span>
          </div>
          <p className="text-2xs text-emerald-600 font-medium">✓ 6 verified agricultural producers</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 hover:border-emerald-300 transition">
          <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Platform Orders</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">Live</span>
            <span className="text-xs font-semibold text-slate-500">settlement engine</span>
          </div>
          <p className="text-2xs text-emerald-600 font-medium">✓ Double-spend protected ledgers</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 hover:border-emerald-300 transition">
          <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Active Release</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">v1.0.2</span>
            <span className="text-xs font-semibold text-slate-500">production</span>
          </div>
          <p className="text-2xs text-slate-500 font-medium">Synced with Git release tags</p>
        </div>
      </div>

      {/* Operational Actions */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Administrative Modules</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 flex flex-col justify-between hover:border-emerald-300 transition">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg">
                🛒
              </div>
              <h4 className="text-base font-bold text-slate-900">Agricultural Marketplace</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Inspect live seed inventory, price indices in EcoTokens, and regional producer claims.
              </p>
            </div>
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 pt-2"
            >
              <span>Explore Marketplace Catalog</span>
              <span>→</span>
            </Link>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 flex flex-col justify-between hover:border-emerald-300 transition">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-lg">
                📦
              </div>
              <h4 className="text-base font-bold text-slate-900">Orders & Dispute Auditing</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Review placed orders, investigate discrepancies, and adjudicate consumer claims.
              </p>
            </div>
            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 pt-2"
            >
              <span>Audit Orders & Disputes</span>
              <span>→</span>
            </Link>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 flex flex-col justify-between hover:border-emerald-300 transition">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-lg">
                ⚡
              </div>
              <h4 className="text-base font-bold text-slate-900">Spring Boot Actuator</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Direct access to backend application metrics, DB pool health, and REST endpoint routes.
              </p>
            </div>
            <a
              href={actuatorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-800 pt-2"
            >
              <span>Open Actuator Dashboard</span>
              <span>↗</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
