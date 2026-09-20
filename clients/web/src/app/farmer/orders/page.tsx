"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { webApiClient } from "@/lib/api";

export default function FarmerOrdersPage() {
  const { user, isAuthenticated } = useAuth();

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ["farmer-orders"],
    queryFn: () => webApiClient.farmer.getOrders(),
    enabled: isAuthenticated && user?.role === "ROLE_FARMER",
  });

  if (!isAuthenticated || user?.role !== "ROLE_FARMER") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-4xl">🔒</p>
        <h2 className="text-2xl font-black text-slate-900">Farmer Authentication Required</h2>
        <Link href="/auth/login" className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <Link href="/farmer" className="text-xs font-bold text-slate-500 hover:text-emerald-700 inline-flex items-center gap-1 mb-2">
          ← Back to Hub
        </Link>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customer Sales Orders</h1>
        <p className="text-xs text-slate-500 mt-1">
          Marketplace purchases placed by households redeeming EcoTokens for your products.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-200/60 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 text-red-700 rounded-2xl text-xs">Failed to load sales orders.</div>
      ) : !orders || orders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <p className="text-4xl">🛍️</p>
          <h3 className="text-base font-bold text-slate-800">No customer orders yet</h3>
          <p className="text-xs text-slate-500">
            When households redeem EcoTokens for your products, order shipments will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">Order #{order.id}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-3xs font-bold bg-emerald-100 text-emerald-800">
                    {order.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Customer Destination: {order.deliveryAddress || "Address on file"}
                </p>
                <p className="text-2xs text-slate-400">
                  Placed on: {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                </p>
              </div>

              <div className="text-right">
                <span className="text-3xs text-slate-400 uppercase font-bold block">Value</span>
                <span className="text-base font-black text-emerald-700">
                  {order.totalTokens} Tokens
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
