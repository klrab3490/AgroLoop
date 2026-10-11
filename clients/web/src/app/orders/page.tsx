"use client";

import React, { useState, useMemo } from "react";
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

function getProductIcon(name?: string): string {
  const lower = (name || "").toLowerCase();
  if (lower.includes("compost") || lower.includes("soil") || lower.includes("manure")) return "🌱";
  if (lower.includes("seed") || lower.includes("grain") || lower.includes("wheat")) return "🌾";
  if (lower.includes("honey") || lower.includes("bee")) return "🍯";
  if (lower.includes("milk") || lower.includes("dairy") || lower.includes("ghee")) return "🥛";
  if (lower.includes("coffee") || lower.includes("ground")) return "☕";
  if (lower.includes("tomato") || lower.includes("veg") || lower.includes("chili")) return "🍅";
  if (lower.includes("biochar") || lower.includes("charcoal")) return "🪵";
  return "📦";
}

type OrderFilter = "ALL" | "ACTIVE" | "COMPLETED" | "ISSUES";

export default function OrdersPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { addItem } = useCart();
  const { success } = useToast();
  const { orders = [], isLoading, error } = useOrders();

  const [activeFilter, setActiveFilter] = useState<OrderFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const handleCopyOrderId = (id: number) => {
    navigator.clipboard.writeText(`ECO-ORD-${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBuyAgain = (productId?: number, productName?: string) => {
    if (!productId) return;
    addItem(productId, 1);
    success(`Added "${productName || "Product"}" to your cart!`);
  };

  // Persona / Buyer Isolation:
  // "My Orders" must strictly list orders that the logged-in user purchased/ordered from the marketplace.
  // If a farmer is logged in, fulfillment sales orders where this farmer is the producer/seller
  // belong on /farmer/orders and must NOT appear here.
  const userPurchasedOrders = useMemo(() => {
    return orders.filter((order) => {
      if (user?.role === "ROLE_FARMER") {
        if (order.householdId && user.id && order.householdId !== user.id) {
          return false;
        }
        const isFarmerVendorOrder = order.items?.every(
          (item) => item.farmerId === user.id || item.farmerName === user.name
        );
        if (isFarmerVendorOrder && (!order.householdId || order.householdId !== user.id)) {
          return false;
        }
      }
      return true;
    });
  }, [orders, user]);

  const filteredOrders = useMemo(() => {
    return userPurchasedOrders.filter((order) => {
      // Status filter
      if (activeFilter === "ACTIVE") {
        if (order.status !== "PLACED" && order.status !== "PACKED" && order.status !== "IN_TRANSIT") {
          return false;
        }
      } else if (activeFilter === "COMPLETED") {
        if (order.status !== "COMPLETED") return false;
      } else if (activeFilter === "ISSUES") {
        if (order.status !== "DISPUTED" && order.status !== "CANCELLED") return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = String(order.id).includes(q) || `eco-ord-${order.id}`.includes(q);
        const matchesAddress = (order.deliveryAddress || "").toLowerCase().includes(q);
        const matchesItem = order.items?.some(
          (item) =>
            (item.productName || "").toLowerCase().includes(q) ||
            (item.farmerName || "").toLowerCase().includes(q)
        );
        return matchesId || matchesAddress || matchesItem;
      }

      return true;
    });
  }, [userPurchasedOrders, activeFilter, searchQuery]);

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
        description="Access your marketplace purchase history, live tracking, itemized receipts, and dispute support."
        actionText="Sign In"
        actionHref="/auth/login"
        className="py-24"
      />
    );
  }

  const activeCount = userPurchasedOrders.filter(
    (o) => o.status === "PLACED" || o.status === "PACKED" || o.status === "IN_TRANSIT"
  ).length;
  const completedCount = userPurchasedOrders.filter((o) => o.status === "COMPLETED").length;
  const issuesCount = userPurchasedOrders.filter((o) => o.status === "DISPUTED" || o.status === "CANCELLED").length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-2xs font-bold uppercase tracking-widest text-emerald-600">
            Marketplace Purchases & Receipts
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">My Orders</h1>
          <p className="text-xs text-slate-500 mt-1">
            Review items ordered from regional partner farmers, track delivery progress, and access receipts.
          </p>
        </div>

        <Link href="/marketplace">
          <Button variant="outline" size="sm" className="bg-emerald-50 text-emerald-800 border-emerald-200/80 shadow-2xs">
            🌱 Browse Marketplace
          </Button>
        </Link>
      </div>

      {/* Role Notice for Farmers */}
      {user?.role === "ROLE_FARMER" && (
        <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5 text-emerald-950">
            <span className="text-lg">🚜</span>
            <div>
              <span className="font-bold">Producer Account Active:</span>
              <span className="text-emerald-800 ml-1">
                This page lists your personal purchases. To manage customer orders received by your farm and update fulfillment status, open Orders &amp; Fulfillment.
              </span>
            </div>
          </div>
          <Link
            href="/farmer/orders"
            className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl whitespace-nowrap self-start sm:self-auto transition shrink-0"
          >
            Fulfillment Orders ➔
          </Link>
        </div>
      )}

      {/* Filter Toolbar & Search */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeFilter === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
            }`}
          >
            All Orders ({userPurchasedOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("ACTIVE")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeFilter === "ACTIVE"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            In Delivery ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("COMPLETED")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeFilter === "COMPLETED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            Delivered ({completedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("ISSUES")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeFilter === "ISSUES"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            Issues / Cancelled ({issuesCount})
          </button>
        </div>

        {/* Search Field */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items or Order ID..."
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 placeholder-slate-400"
          />
          <span className="absolute left-2.5 top-2 text-slate-400 text-xs">🔍</span>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-3xl" />
          ))}
        </div>
      ) : error ? (
        <Alert variant="error" title="Failed to load orders">
          Please refresh the page or verify your network connection.
        </Alert>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon="🛍️"
          title={searchQuery || activeFilter !== "ALL" ? "No matching orders found" : "No orders placed yet"}
          description={
            searchQuery || activeFilter !== "ALL"
              ? "Try adjusting your search query or status filter to see other orders."
              : "Browse our farmer marketplace to redeem your EcoTokens for organic farm inputs, seeds, and fresh produce."
          }
          actionText={searchQuery || activeFilter !== "ALL" ? "Reset Filters" : "Explore Marketplace"}
          actionHref={searchQuery || activeFilter !== "ALL" ? undefined : "/marketplace"}
          onAction={
            searchQuery || activeFilter !== "ALL"
              ? () => {
                  setSearchQuery("");
                  setActiveFilter("ALL");
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => {
            const isCompleted = order.status === "COMPLETED";
            const isPlaced = order.status === "PLACED";
            const isPacked = order.status === "PACKED";
            const isInTransit = order.status === "IN_TRANSIT";
            const isCancelled = order.status === "CANCELLED";
            const isDisputed = order.status === "DISPUTED";

            // Stage number for visual stepper: 1 (Placed), 2 (Packed), 3 (In Transit), 4 (Delivered)
            let currentStep = 1;
            if (isPacked) currentStep = 2;
            if (isInTransit) currentStep = 3;
            if (isCompleted) currentStep = 4;

            const badgeVariant = isCompleted
              ? "success"
              : isPlaced || isPacked || isInTransit
              ? "info"
              : isCancelled
              ? "neutral"
              : "warning";

            const statusLabel =
              order.status === "PLACED"
                ? "Order Placed"
                : order.status === "PACKED"
                ? "Packed by Farmer"
                : order.status === "IN_TRANSIT"
                ? "Out for Delivery"
                : order.status === "COMPLETED"
                ? "Delivered"
                : order.status === "DISPUTED"
                ? "Under Dispute"
                : "Cancelled";

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden hover:border-slate-300 transition duration-150"
              >
                {/* Header Strip */}
                <div className="bg-slate-50/90 border-b border-slate-200/80 px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-4 sm:gap-8">
                    <div>
                      <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">
                        Order Placed
                      </span>
                      <span className="font-bold text-slate-800 mt-0.5 block">
                        {formatDate(order.createdAt)}
                      </span>
                    </div>

                    <div>
                      <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">
                        Total Amount
                      </span>
                      <div className="flex items-center gap-1 mt-0.5 font-black text-emerald-800">
                        <span>🪙</span>
                        <span>{order.totalTokens} EcoTokens</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">
                        Delivery Destination
                      </span>
                      <span className="font-bold text-slate-800 mt-0.5 block truncate max-w-[200px]" title={order.deliveryAddress || "Registered Address"}>
                        📍 {order.deliveryAddress || "Home Address"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => order.id && handleCopyOrderId(order.id)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-mono text-3xs font-bold rounded-lg transition"
                      title="Copy Order ID"
                    >
                      {copiedId === order.id ? "✓ Copied" : `#ECO-ORD-${order.id}`}
                    </button>
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 transition underline"
                    >
                      View Receipt ➔
                    </Link>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 sm:p-6 space-y-6">
                  {/* Status Banner & Progress Stepper */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            isCompleted
                              ? "bg-emerald-500 shadow-xs shadow-emerald-300"
                              : isPlaced || isPacked || isInTransit
                              ? "bg-blue-500 animate-pulse shadow-xs shadow-blue-300"
                              : isCancelled
                              ? "bg-slate-400"
                              : "bg-amber-500"
                          }`}
                        />
                        <h4 className="font-black text-sm sm:text-base text-slate-900">
                          {isCompleted && "Delivered to Doorstep"}
                          {isPlaced && "Order Confirmed — Awaiting Farmer Packing"}
                          {isPacked && "Packed & Staged — Ready for Courier Dispatch"}
                          {isInTransit && "Out for Delivery — On Route to Destination"}
                          {isCancelled && "Order Cancelled & Tokens Refunded"}
                          {isDisputed && "Under Dispute Review by Admin"}
                        </h4>
                      </div>

                      <Badge variant={badgeVariant}>{statusLabel}</Badge>
                    </div>

                    {/* Progress Stepper (Only active orders) */}
                    {!isCancelled && !isDisputed && (
                      <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                        <div className="grid grid-cols-4 gap-2 text-center text-3xs">
                          {[
                            { num: 1, label: "Placed" },
                            { num: 2, label: "Packed" },
                            { num: 3, label: "In Transit" },
                            { num: 4, label: "Delivered" },
                          ].map((step) => {
                            const isDone = currentStep >= step.num;
                            const isCurrent = currentStep === step.num;
                            return (
                              <div key={step.num} className="flex flex-col items-center gap-1.5">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-3xs transition ${
                                    isDone
                                      ? "bg-emerald-600 text-white"
                                      : "bg-slate-200 text-slate-500"
                                  } ${isCurrent ? "ring-2 ring-emerald-400 ring-offset-1" : ""}`}
                                >
                                  {isDone && !isCurrent ? "✓" : step.num}
                                </div>
                                <span
                                  className={`font-semibold ${
                                    isDone ? "text-slate-900 font-bold" : "text-slate-400"
                                  }`}
                                >
                                  {step.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Customer Delivery Notes */}
                  {order.notes && (
                    <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-2xs text-amber-900 flex items-start gap-2">
                      <span className="shrink-0 text-xs">📝</span>
                      <p>
                        <strong>Delivery Instructions:</strong> &ldquo;{order.notes}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Itemized Products Ordered from Marketplace */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-3xs uppercase font-extrabold tracking-wider text-slate-400">
                        Marketplace Items Ordered ({order.items?.length || 0})
                      </span>
                      <span className="text-3xs text-slate-400">Subtotal</span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {order.items?.map((item) => {
                        const icon = getProductIcon(item.productName);
                        const subtotal = item.subtotal ?? (item.quantity ?? 1) * (item.unitPrice ?? 0);

                        return (
                          <div
                            key={item.id}
                            className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3.5">
                              {/* Product Thumbnail */}
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 border border-emerald-200/60 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                                {icon}
                              </div>

                              <div className="space-y-1">
                                <Link
                                  href={item.productId ? `/marketplace` : "/marketplace"}
                                  className="font-bold text-xs sm:text-sm text-slate-900 hover:text-emerald-700 transition"
                                >
                                  {item.productName}
                                </Link>

                                <p className="text-2xs text-slate-500">
                                  Producer:{" "}
                                  <span className="font-semibold text-slate-700">
                                    {item.farmerName || "Verified Regional Farmer"}
                                  </span>
                                </p>

                                <div className="flex items-center gap-2 text-3xs text-slate-500 font-medium">
                                  <span>Qty: <strong className="text-slate-800">{item.quantity}</strong></span>
                                  <span>•</span>
                                  <span>Price: <strong className="text-emerald-700">{item.unitPrice ?? 0} 🪙</strong> each</span>
                                </div>
                              </div>
                            </div>

                            {/* Line Subtotal and Buy Again */}
                            <div className="flex items-center justify-between sm:justify-end gap-4 self-stretch sm:self-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                              <div className="text-left sm:text-right">
                                <span className="text-3xs text-slate-400 block sm:hidden uppercase font-bold">Item Total</span>
                                <span className="text-xs font-black text-emerald-800">
                                  🪙 {subtotal} Tokens
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleBuyAgain(item.productId, item.productName)}
                                  className="text-3xs font-bold py-1 px-2.5 h-8 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800"
                                >
                                  ↺ Buy Again
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Order Footer Actions */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-3xs text-slate-400">
                      Need help with this order? Access dispute adjudication or view raw blockchain ledger receipt.
                    </span>

                    <div className="flex items-center gap-2">
                      <Link href={`/orders/${order.id}`}>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs">
                          📦 Track Delivery & Details
                        </Button>
                      </Link>
                    </div>
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
