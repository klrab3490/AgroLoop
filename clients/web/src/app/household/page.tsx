"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { webApiClient } from "@/lib/api";

export default function HouseholdHubPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: balanceData } = useQuery({
    queryKey: ["household-balance"],
    queryFn: () => webApiClient.household.getBalance(),
    enabled: isAuthenticated && user?.role === "ROLE_HOUSEHOLD",
  });

  const { data: submissions } = useQuery({
    queryKey: ["household-submissions"],
    queryFn: () => webApiClient.household.getSubmissions(),
    enabled: isAuthenticated && user?.role === "ROLE_HOUSEHOLD",
  });

  const { data: farmerApp } = useQuery({
    queryKey: ["household-farmer-app"],
    queryFn: () => webApiClient.household.getFarmerApplication(),
    enabled: isAuthenticated && user?.role === "ROLE_HOUSEHOLD",
  });

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="h-44 rounded-3xl bg-slate-200/60 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-28 rounded-2xl bg-slate-200/50 animate-pulse" />
          <div className="h-28 rounded-2xl bg-slate-200/50 animate-pulse" />
          <div className="h-28 rounded-2xl bg-slate-200/50 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "ROLE_HOUSEHOLD") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-4xl">🏡</p>
        <h2 className="text-2xl font-black text-slate-900">Household Composter Portal</h2>
        <p className="text-xs text-slate-500">Sign in with a Household account to manage compost collections.</p>
        <Link
          href="/auth/login?redirect=/household"
          className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const totalDivertedKg = (submissions ?? []).reduce(
    (acc, s) => acc + (s.estimatedWeight ?? 0),
    0
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 sm:p-10 rounded-3xl text-white shadow-xl shadow-emerald-700/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-2xs font-bold uppercase tracking-wider">
            Household Dashboard
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Welcome back, {user.name ?? user.email}!
          </h1>
          <p className="text-xs text-emerald-100 max-w-lg">
            Track your organic waste submissions, verify doorstep collections with QR passes, and spend earned EcoTokens.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 min-w-[200px] text-center">
          <span className="text-xs text-emerald-200 uppercase font-bold tracking-wider block">Wallet Balance</span>
          <span className="text-4xl font-black mt-1 block">{balanceData?.availableBalance ?? 0}</span>
          <span className="text-2xs text-emerald-200">EcoTokens Available</span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-2xl">⚖️</span>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Organic Waste Diverted</h3>
          <p className="text-3xl font-black text-slate-900">{totalDivertedKg.toFixed(1)} kg</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-2xl">📦</span>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Submissions</h3>
          <p className="text-3xl font-black text-slate-900">{submissions?.length ?? 0}</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-2xl">🛒</span>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Redeem Rewards</h3>
          <Link
            href="/marketplace"
            className="inline-block mt-2 text-xs font-bold text-emerald-600 hover:text-emerald-700"
          >
            Visit Marketplace ➔
          </Link>
        </div>
      </div>

      {/* Farmer Partner Application Banner if Pending or Rejected */}
      {farmerApp?.status === "PENDING" && (
        <div className="p-5 bg-amber-50 border border-amber-200 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌾</span>
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                Farmer Partner Application Under Review
              </h3>
              <p className="text-2xs text-amber-700">
                Application for &quot;{farmerApp.farmName}&quot; submitted on {new Date(farmerApp.createdAt).toLocaleDateString()} is pending admin verification.
              </p>
            </div>
          </div>
          <Link
            href="/household/apply-farmer"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition"
          >
            View Details
          </Link>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/household/submit"
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 transition shadow-sm flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🥦
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Submit Organics</h4>
              <p className="text-2xs text-slate-500">Log kitchen scraps or yard waste</p>
            </div>
          </Link>

          <Link
            href="/household/pickups"
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 transition shadow-sm flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              📲
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Pickup Pass & Tracker</h4>
              <p className="text-2xs text-slate-500">View QR pass & track farmer arrival</p>
            </div>
          </Link>

          <Link
            href="/household/ledger"
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 transition shadow-sm flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              📜
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Token Ledger</h4>
              <p className="text-2xs text-slate-500">Auditable transaction history</p>
            </div>
          </Link>

          <Link
            href="/household/apply-farmer"
            className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 hover:border-amber-400 rounded-2xl transition shadow-sm flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🌾
            </div>
            <div>
              <h4 className="font-bold text-sm text-amber-950">Become a Farmer</h4>
              <p className="text-2xs text-amber-800">
                {farmerApp?.status === "PENDING"
                  ? "Application in review"
                  : "Apply for producer status"}
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
