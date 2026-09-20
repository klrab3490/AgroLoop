"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { webApiClient } from "@/lib/api";

export default function OrdersPage() {
  const { isAuthenticated } = useAuth();

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ["user-orders"],
    queryFn: () => webApiClient.orders.listOrders(),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-4xl">📦</p>
        <h2 className="text-2xl font-black text-slate-900">Sign In to View Orders</h2>
        <p className="text-xs text-slate-500">Access your historical orders and dispute tracking.</p>
        <Link
          href="/auth/login"
          className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <span className="text-2xs font-bold uppercase tracking-widest text-emerald-600">History & Tracking</span>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">My Marketplace Orders</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-200/60 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-xs">
          Failed to load orders. Please refresh or check your connection.
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <p className="text-4xl">🛍️</p>
          <h3 className="text-base font-bold text-slate-800">No orders placed yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Browse our farmer marketplace to redeem your EcoTokens for organic farm supplies.
          </p>
          <Link
            href="/marketplace"
            className="inline-block px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition"
          >
            Explore Marketplace
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-emerald-300 transition"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">Order #{order.id}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-3xs font-bold ${
                      order.status === "COMPLETED"
                        ? "bg-emerald-100 text-emerald-800"
                        : order.status === "PLACED"
                        ? "bg-blue-100 text-blue-800"
                        : order.status === "CANCELLED"
                        ? "bg-slate-100 text-slate-600"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Total Items: {order.items?.length ?? 0} • Placed: {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                </p>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                <span className="text-base font-black text-emerald-700">
                  {order.totalTokens} Tokens
                </span>
                <Link
                  href={`/orders/${order.id}`}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
                >
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
