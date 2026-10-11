"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useOrders } from "@/hooks/use-orders";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";

export default function OrdersPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { addItem } = useCart();
  const { success } = useToast();
  const { orders, isLoading, error } = useOrders();

  const handleBuyAgain = (productId?: number, productName?: string) => {
    if (!productId) return;
    addItem(productId, 1);
    success(`Added "${productName || "Product"}" to your cart!`);
  };

  if (authLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-4">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-44 rounded-3xl" />
        <Skeleton className="h-44 rounded-3xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <EmptyState
        icon="📦"
        title="Sign In to View Orders"
        description="Access your historical orders, tracking, itemized receipts, and dispute adjudication."
        actionText="Sign In"
        actionHref="/auth/login"
        className="py-24"
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-2xs font-bold uppercase tracking-widest text-emerald-600">Settlement & History</span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">Your Orders</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track deliveries, view itemized receipts, and manage marketplace purchases.
          </p>
        </div>

        <Link href="/marketplace">
          <Button variant="outline" size="sm" className="bg-emerald-50 text-emerald-800 border-emerald-200/80">
            🌱 Browse Marketplace
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-44 rounded-3xl" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="error" title="Failed to load orders">
          Please refresh the page or verify your network connection.
        </Alert>
      ) : !orders || orders.length === 0 ? (
        <EmptyState
          icon="🛍️"
          title="No orders placed yet"
          description="Browse our farmer marketplace to redeem your EcoTokens for verified organic farm supplies."
          actionText="Explore Marketplace"
          actionHref="/marketplace"
        />
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const isDelivered = order.status === "COMPLETED";
            const isPlaced = order.status === "PLACED";
            const isCancelled = order.status === "CANCELLED";
            const isDisputed = order.status === "DISPUTED";

            const badgeVariant = isDelivered
              ? "success"
              : isPlaced
              ? "info"
              : isCancelled
              ? "neutral"
              : "warning";

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden hover:border-slate-300 transition"
              >
                {/* Order Header Strip */}
                <div className="bg-slate-50/90 border-b border-slate-200/80 px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-6 sm:gap-10">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Order Placed
                      </span>
                      <span className="font-bold text-slate-800 mt-0.5 block">
                        {formatDate(order.createdAt)}
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

                    <Badge variant={badgeVariant}>
                      {order.status}
                    </Badge>
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
                          <Button
                            size="sm"
                            onClick={() => handleBuyAgain(item.productId, item.productName)}
                          >
                            ↺ Buy it again
                          </Button>

                          <Link href={`/orders/${order.id}`}>
                            <Button variant="ghost" size="sm">
                              View Details
                            </Button>
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
