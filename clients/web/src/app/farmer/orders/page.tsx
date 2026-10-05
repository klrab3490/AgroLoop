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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Produce Customer Orders</h1>
            <p className="text-xs text-slate-500 mt-1">
              Marketplace purchases placed by households redeeming EcoTokens for your fresh harvest.
            </p>
          </div>
          <Link
            href="/farmer/pickups"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 transition"
          >
            <span>🚜 Looking for Waste Collection Routes?</span>
          </Link>
        </div>
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
          <h3 className="text-base font-bold text-slate-800">No customer produce orders yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            When households purchase your farm produce using EcoTokens, shipment details will appear here. For collecting organic waste, check your collection routes.
          </p>
          <Link
            href="/farmer/pickups"
            className="inline-block mt-2 px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition"
          >
            Go to Waste Collection Workspace →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const gmapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              order.deliveryAddress || "Kodungallur, Kerala"
            )}`;

            return (
              <div
                key={order.id}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-emerald-200 transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">Order #{order.id}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-3xs font-bold bg-emerald-100 text-emerald-800">
                      {order.status === "PLACED" ? "Ready for Delivery" : order.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span>🏠 Destination: <strong>{order.deliveryAddress || "Address on file"}</strong></span>
                    <a
                      href={gmapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-3xs rounded-lg border border-slate-200 transition"
                    >
                      <span>📍 Navigate</span>
                    </a>
                  </div>
                  <p className="text-2xs text-slate-400">
                    Placed on: {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                  </p>
                </div>

                <div className="text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto">
                  <span className="text-3xs text-slate-400 uppercase font-bold block">Order Total</span>
                  <span className="text-base font-black text-emerald-700">
                    {order.totalTokens} Tokens
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
