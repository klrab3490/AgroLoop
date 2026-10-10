"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { webApiClient } from "@/lib/api";
import { useCart } from "@/lib/cart-context";

export default function OrdersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { addItem } = useCart();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ["user-orders"],
    queryFn: () => webApiClient.orders.listOrders(),
    enabled: isAuthenticated,
  });

  const handleBuyAgain = (productId?: number, productName?: string) => {
    if (!productId) return;
    addItem(productId, 1);
    setToastMessage(`Added "${productName || "Product"}" to your cart!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (authLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-4">
        <div className="h-28 rounded-3xl bg-slate-200/60 animate-pulse" />
        <div className="h-44 rounded-3xl bg-slate-200/60 animate-pulse" />
        <div className="h-44 rounded-3xl bg-slate-200/60 animate-pulse" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-black">
          📦
        </div>
        <h2 className="text-2xl font-black text-slate-900">Sign In to View Orders</h2>
        <p className="text-xs text-slate-500">Access your historical orders, tracking, and dispute adjudication.</p>
        <Link
          href="/auth/login"
          className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition shadow-sm"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-2">
          <span>🛍️</span>
          <span>{toastMessage}</span>
          <Link href="/marketplace/checkout" className="underline font-black ml-2 text-emerald-200 hover:text-white">
            View Cart
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-2xs font-bold uppercase tracking-widest text-emerald-600">Settlement & History</span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">Your Orders</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track deliveries, view itemized receipts, and manage marketplace purchases.
          </p>
        </div>

        <Link
          href="/marketplace"
          className="self-start sm:self-auto px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
        >
          <span>🌱</span>
          <span>Browse Marketplace</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-3xl bg-slate-200/60 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-xs">
          Failed to load orders. Please refresh or check your connection.
        </div>
      ) : !orders || orders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl">
            🛍️
          </div>
          <h3 className="text-base font-bold text-slate-900">No orders placed yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Browse our farmer marketplace to redeem your EcoTokens for verified organic farm supplies.
          </p>
          <Link
            href="/marketplace"
            className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition shadow-sm"
          >
            Explore Marketplace
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const isDelivered = order.status === "COMPLETED";
            const isPlaced = order.status === "PLACED";
            const isCancelled = order.status === "CANCELLED";
            const isDisputed = order.status === "DISPUTED";

            const orderDateFormatted = order.createdAt
              ? new Date(order.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "—";

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden hover:border-slate-300 transition"
              >
                {/* Amazon / Flipkart Style Order Header Strip */}
                <div className="bg-slate-50/90 border-b border-slate-200/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-6 sm:gap-10">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Order Placed
                      </span>
                      <span className="font-bold text-slate-800 mt-0.5 block">
                        {orderDateFormatted}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Total
                      </span>
                      <div className="flex items-center gap-1 mt-0.5 font-black text-emerald-800">
                        <span>🪙</span>
                        <span>{order.totalTokens} Tokens</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Ship To
                      </span>
                      <span className="font-bold text-slate-800 mt-0.5 block truncate max-w-[150px]">
                        {order.householdName || "Resident Household"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Order #ECO-ORD-{order.id}
                      </span>
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-900 transition underline mt-0.5 inline-block"
                      >
                        View Order Details
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-5">
                  {/* Status Banner */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          isDelivered
                            ? "bg-emerald-500"
                            : isPlaced
                            ? "bg-blue-500 animate-pulse"
                            : isCancelled
                            ? "bg-slate-400"
                            : "bg-amber-500"
                        }`}
                      />
                      <h4 className="font-black text-sm sm:text-base text-slate-900">
                        {isDelivered && "Delivered to Doorstep"}
                        {isPlaced && "Preparing for Delivery — Estimated within 24–48 hours"}
                        {isCancelled && "Order Cancelled"}
                        {isDisputed && "Under Dispute Review"}
                      </h4>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-2xs font-extrabold uppercase tracking-wider ${
                        isDelivered
                          ? "bg-emerald-100 text-emerald-800"
                          : isPlaced
                          ? "bg-blue-100 text-blue-800"
                          : isCancelled
                          ? "bg-slate-100 text-slate-600"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>

                  {/* Items List */}
                  <div className="divide-y divide-slate-100">
                    {order.items?.map((item) => (
                      <div
                        key={item.id}
                        className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 border border-emerald-200/60 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                            🌱
                          </div>

                          <div className="space-y-0.5">
                            <Link
                              href={item.productId ? `/marketplace/${item.productId}` : "/marketplace"}
                              className="font-bold text-xs sm:text-sm text-slate-900 hover:text-emerald-700 transition"
                            >
                              {item.productName}
                            </Link>

                            <p className="text-[11px] text-slate-500">
                              Sold by: <span className="font-semibold text-slate-700">{item.farmerName || "Local Farmer"}</span>
                            </p>

                            <p className="text-2xs text-slate-400">
                              Qty: {item.quantity} • {item.unitPrice ?? 0} 🪙 each
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                          <button
                            onClick={() => handleBuyAgain(item.productId, item.productName)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1"
                          >
                            <span>↺</span>
                            <span>Buy it again</span>
                          </button>

                          <Link
                            href={`/orders/${order.id}`}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
