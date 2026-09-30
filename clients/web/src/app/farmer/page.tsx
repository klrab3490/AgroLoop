"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { webApiClient } from "@/lib/api";

export default function FarmerHubPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: availablePickups } = useQuery({
    queryKey: ["farmer-available-pickups"],
    queryFn: () => webApiClient.farmer.getAvailablePickups(),
    enabled: isAuthenticated && user?.role === "ROLE_FARMER",
  });

  const { data: farmerProducts } = useQuery({
    queryKey: ["farmer-products"],
    queryFn: () => webApiClient.farmer.getProducts(),
    enabled: isAuthenticated && user?.role === "ROLE_FARMER",
  });

  const { data: farmerOrders } = useQuery({
    queryKey: ["farmer-orders"],
    queryFn: () => webApiClient.farmer.getOrders(),
    enabled: isAuthenticated && user?.role === "ROLE_FARMER",
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

  if (!isAuthenticated || user?.role !== "ROLE_FARMER") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-4xl">🚜</p>
        <h2 className="text-2xl font-black text-slate-900">Farmer Operations Portal</h2>
        <p className="text-xs text-slate-500">Sign in with an approved Farmer account to access collection routes.</p>
        <Link href="/auth/login" className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-br from-amber-700 to-emerald-800 p-8 sm:p-10 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-2xs font-bold uppercase tracking-wider">
            Agricultural Partner
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Farmer Dashboard — {user.name ?? user.email}
          </h1>
          <p className="text-xs text-emerald-100 max-w-lg">
            Manage regional organic collection claims, verify doorstep waste with QR authentication, and market your farm compost.
          </p>
        </div>

        <Link
          href="/farmer/pickups"
          className="px-6 py-3 bg-white text-emerald-900 font-black text-xs rounded-xl shadow-md hover:bg-emerald-50 transition"
        >
          View Collection Queue ➔
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-2xl">📦</span>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available Pickups to Claim</h3>
          <p className="text-3xl font-black text-slate-900">{availablePickups?.length ?? 0}</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-2xl">🌱</span>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Listed Products</h3>
          <p className="text-3xl font-black text-slate-900">{farmerProducts?.length ?? 0}</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-2xl">🛍️</span>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Incoming Sales Orders</h3>
          <p className="text-3xl font-black text-slate-900">{farmerOrders?.length ?? 0}</p>
        </div>
      </div>

      {/* Quick Nav Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900">Operations Hub</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/farmer/pickups"
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 transition shadow-sm flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🚚
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Pickups & Verification</h4>
              <p className="text-2xs text-slate-500">Claim batches & verify QR codes</p>
            </div>
          </Link>

          <Link
            href="/farmer/products"
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 transition shadow-sm flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🌿
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Product Management</h4>
              <p className="text-2xs text-slate-500">List compost & update inventory</p>
            </div>
          </Link>

          <Link
            href="/farmer/orders"
            className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 transition shadow-sm flex items-center gap-4 group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              📑
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Customer Orders</h4>
              <p className="text-2xs text-slate-500">Fulfill marketplace sales</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
