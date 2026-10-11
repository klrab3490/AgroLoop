"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { webApiClient } from "@/lib/api";
import { formatDate } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Alert } from "@/components/ui/alert";
import type { OrderApiResponse, PickupRequestApiResponse } from "@agroloop/api-types";

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

type OrderFilter = "ALL" | "PLACED" | "PACKED" | "IN_TRANSIT" | "COMPLETED" | "DISPUTED";

export default function FarmerOrdersPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Active top-level mode: "produce_orders" (default) or "waste_pickups"
  const [activeMode, setActiveMode] = useState<"produce_orders" | "waste_pickups">("produce_orders");

  // Status Filter & Search
  const [activeFilter, setActiveFilter] = useState<OrderFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Status mutation state
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Fetch produce customer orders placed for this farmer's products
  const {
    data: produceOrders = [],
    isLoading: loadingOrders,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery<OrderApiResponse[]>({
    queryKey: ["farmer-orders"],
    queryFn: () => webApiClient.farmer.getOrders(),
    enabled: isAuthenticated && (user?.role === "ROLE_FARMER" || user?.role === "ROLE_ADMIN"),
  });

  // Fetch household pickups (secondary tab)
  const {
    data: myPickups = [],
    isLoading: loadingPickups,
  } = useQuery<PickupRequestApiResponse[]>({
    queryKey: ["farmer-my-pickups"],
    queryFn: () => webApiClient.pickups.listPickups(),
    enabled: isAuthenticated && (user?.role === "ROLE_FARMER" || user?.role === "ROLE_ADMIN") && activeMode === "waste_pickups",
  });

  const handleCopyOrderId = (id: number) => {
    navigator.clipboard.writeText(`ECO-ORD-${id}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Farmer status updater handler
  const handleUpdateOrderStatus = async (orderId: number, targetStatus: string) => {
    setUpdatingOrderId(orderId);
    setActionSuccess(null);
    setActionError(null);

    try {
      if (targetStatus === "COMPLETED" || targetStatus === "DELIVERED") {
        await webApiClient.orders.completeOrder(orderId);
      } else {
        await webApiClient.orders.updateStatus(orderId, targetStatus);
      }

      await queryClient.invalidateQueries({ queryKey: ["farmer-orders"] });
      setActionSuccess(`Order #${orderId} status successfully updated to ${targetStatus}!`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : `Failed to update order status to ${targetStatus}`);
      setTimeout(() => setActionError(null), 6000);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Metrics
  const placedCount = produceOrders.filter((o) => o.status === "PLACED").length;
  const packedCount = produceOrders.filter((o) => o.status === "PACKED").length;
  const inTransitCount = produceOrders.filter((o) => o.status === "IN_TRANSIT").length;
  const completedCount = produceOrders.filter((o) => o.status === "COMPLETED").length;
  const disputedCount = produceOrders.filter((o) => o.status === "DISPUTED").length;
  const totalTokensEarned = produceOrders
    .filter((o) => o.status === "COMPLETED")
    .reduce((sum, o) => sum + (o.totalTokens ?? 0), 0);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return produceOrders.filter((order) => {
      if (activeFilter !== "ALL" && order.status !== activeFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = String(order.id).includes(q) || `eco-ord-${order.id}`.includes(q);
        const matchesCustomer = (order.householdName || "").toLowerCase().includes(q);
        const matchesAddress = (order.deliveryAddress || "").toLowerCase().includes(q);
        const matchesItems = order.items?.some((i) => (i.productName || "").toLowerCase().includes(q));
        return matchesId || matchesCustomer || matchesAddress || matchesItems;
      }

      return true;
    });
  }, [produceOrders, activeFilter, searchQuery]);

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-4">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-44 rounded-3xl" />
        <Skeleton className="h-44 rounded-3xl" />
      </div>
    );
  }

  if (!isAuthenticated || (user?.role !== "ROLE_FARMER" && user?.role !== "ROLE_ADMIN")) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-4xl">🧑‍🌾</p>
        <h2 className="text-2xl font-black text-slate-900">Farmer Portal Access</h2>
        <p className="text-xs text-slate-500">
          Sign in with your registered Farmer partner account to fulfill customer produce orders and manage collections.
        </p>
        <Link
          href="/auth/login?redirect=/farmer/orders"
          className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition"
        >
          Farmer Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xs font-bold uppercase tracking-widest text-emerald-600">
              Merchant Operations
            </span>
            <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-100 text-emerald-800">
              Verified Farmer
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
            Customer Orders &amp; Fulfillment
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review customer purchases for your farm inputs, prepare shipments, and update delivery statuses.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <Link href="/farmer/audit">
            <Button variant="outline" size="sm" className="text-xs font-bold bg-white text-slate-700 border-slate-200">
              📊 Operations Audit
            </Button>
          </Link>
          <Link href="/farmer/products">
            <Button variant="outline" size="sm" className="text-xs font-bold bg-white text-slate-700 border-slate-200">
              🌾 Manage Products
            </Button>
          </Link>
          <Link href="/farmer/pickups">
            <Button size="sm" className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
              🚚 Collection Routes
            </Button>
          </Link>
        </div>
      </div>

      {/* Top Nav Mode Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveMode("produce_orders")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeMode === "produce_orders"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>🛍️ Customer Produce Orders</span>
          <span className="px-1.5 py-0.2 rounded-full text-3xs bg-white/20">
            {produceOrders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode("waste_pickups")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeMode === "waste_pickups"
              ? "bg-slate-900 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <span>♻️ Waste Collection Requests</span>
          <span className="px-1.5 py-0.2 rounded-full text-3xs bg-slate-200 text-slate-700">
            {myPickups.length}
          </span>
        </button>
      </div>

      {/* Alert Notices */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <span>✓ {actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 font-bold">✕</button>
        </div>
      )}
      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold flex items-center justify-between">
          <span>⚠️ {actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-600 font-bold">✕</button>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODE 1: CUSTOMER PRODUCE ORDERS (PRIMARY FOCUS)                */}
      {/* ============================================================== */}
      {activeMode === "produce_orders" && (
        <div className="space-y-6">
          {/* Operations Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-3xs uppercase font-bold text-slate-400 block">Needs Packing</span>
              <p className="text-2xl font-black text-amber-600 mt-1">{placedCount}</p>
              <span className="text-3xs text-slate-400">Status: PLACED</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-3xs uppercase font-bold text-slate-400 block">Packed &amp; Staged</span>
              <p className="text-2xl font-black text-blue-600 mt-1">{packedCount}</p>
              <span className="text-3xs text-slate-400">Ready for dispatch</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-3xs uppercase font-bold text-slate-400 block">Out for Delivery</span>
              <p className="text-2xl font-black text-purple-600 mt-1">{inTransitCount}</p>
              <span className="text-3xs text-slate-400">In transit</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-3xs uppercase font-bold text-slate-400 block">Completed</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{completedCount}</p>
              <span className="text-3xs text-slate-400">Delivered to customer</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-3xs uppercase font-bold text-slate-400 block">Settled Earnings</span>
              <p className="text-2xl font-black text-slate-900 mt-1">🪙 {totalTokensEarned}</p>
              <span className="text-3xs text-slate-400">EcoTokens released</span>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Status Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activeFilter === "ALL"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                }`}
              >
                All ({produceOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("PLACED")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activeFilter === "PLACED"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                }`}
              >
                Needs Packing ({placedCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("PACKED")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activeFilter === "PACKED"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                }`}
              >
                Packed ({packedCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("IN_TRANSIT")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activeFilter === "IN_TRANSIT"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                }`}
              >
                In Transit ({inTransitCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("COMPLETED")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  activeFilter === "COMPLETED"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                Delivered ({completedCount})
              </button>
              {disputedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilter("DISPUTED")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    activeFilter === "DISPUTED"
                      ? "bg-rose-600 text-white shadow-xs"
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                  }`}
                >
                  Disputed ({disputedCount})
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customer, address, or item..."
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetchOrders()}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white"
                title="Refresh Orders"
              >
                🔄
              </Button>
            </div>
          </div>

          {/* Orders List Rendering */}
          {loadingOrders ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-56 rounded-3xl" />
              ))}
            </div>
          ) : ordersError ? (
            <Alert variant="error" title="Failed to load orders">
              Could not retrieve customer orders from server. Please verify your connection.
            </Alert>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
              <p className="text-4xl">🛍️</p>
              <h3 className="text-base font-bold text-slate-800">
                {searchQuery || activeFilter !== "ALL"
                  ? "No orders match your filter criteria"
                  : "No customer produce orders yet"}
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {searchQuery || activeFilter !== "ALL"
                  ? "Try resetting the filter tabs or clear your search term to see orders."
                  : "When local households purchase your verified compost, seeds, or produce with EcoTokens, their orders will appear here for fulfillment."}
              </p>
              <div className="pt-2">
                {searchQuery || activeFilter !== "ALL" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setActiveFilter("ALL");
                      setSearchQuery("");
                    }}
                  >
                    Reset Filters
                  </Button>
                ) : (
                  <Link href="/farmer/products">
                    <Button size="sm" className="bg-slate-900 text-white font-bold text-xs">
                      View Listed Products →
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((order) => {
                const isUpdating = updatingOrderId === order.id;
                const isPlaced = order.status === "PLACED";
                const isPacked = order.status === "PACKED";
                const isInTransit = order.status === "IN_TRANSIT";
                const isCompleted = order.status === "COMPLETED";
                const isDisputed = order.status === "DISPUTED";
                const isCancelled = order.status === "CANCELLED";

                const gmapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  order.deliveryAddress || "Kodungallur, Kerala"
                )}`;

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
                            Order Reference
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              #ECO-ORD-{order.id}
                            </span>
                            <button
                              type="button"
                              onClick={() => order.id && handleCopyOrderId(order.id)}
                              className="text-3xs text-slate-400 hover:text-slate-600 font-bold"
                              title="Copy"
                            >
                              {copiedId === order.id ? "✓" : "📋"}
                            </button>
                          </div>
                        </div>

                        <div>
                          <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">
                            Customer
                          </span>
                          <span className="font-bold text-slate-800 mt-0.5 block">
                            👤 {order.householdName || "Resident Household"}
                          </span>
                        </div>

                        <div>
                          <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">
                            Order Date
                          </span>
                          <span className="font-semibold text-slate-600 mt-0.5 block">
                            {formatDate(order.createdAt)}
                          </span>
                        </div>

                        <div>
                          <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">
                            Order Total
                          </span>
                          <span className="font-black text-emerald-800 mt-0.5 block">
                            🪙 {order.totalTokens} Tokens
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            isCompleted
                              ? "success"
                              : isPlaced
                              ? "warning"
                              : isPacked || isInTransit
                              ? "info"
                              : isCancelled
                              ? "neutral"
                              : "danger"
                          }
                        >
                          {isPlaced && "● Needs Packing"}
                          {isPacked && "● Packed"}
                          {isInTransit && "● In Transit"}
                          {isCompleted && "✓ Delivered"}
                          {isDisputed && "⚠️ Disputed"}
                          {isCancelled && "✕ Cancelled"}
                        </Badge>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 sm:p-6 space-y-5">
                      {/* Destination Address Row with Map Link */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50/70 rounded-2xl border border-slate-100 text-xs">
                        <div className="flex items-center gap-2 text-slate-700">
                          <span className="text-base">📍</span>
                          <span>
                            <strong>Destination:</strong> {order.deliveryAddress || "Address on file"}
                          </span>
                        </div>

                        <a
                          href={gmapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-3xs rounded-xl border border-slate-200 transition shadow-2xs self-start sm:self-auto"
                        >
                          <span>🗺️ Open in Google Maps</span>
                        </a>
                      </div>

                      {/* Delivery Instructions (if any) */}
                      {order.notes && (
                        <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-2xs text-amber-900 flex items-start gap-2">
                          <span className="text-xs">📝</span>
                          <p>
                            <strong>Customer Instructions:</strong> &ldquo;{order.notes}&rdquo;
                          </p>
                        </div>
                      )}

                      {/* Itemized Table of Products to Fulfill */}
                      <div className="space-y-2">
                        <span className="text-3xs uppercase font-extrabold tracking-wider text-slate-400 block">
                          Items to Fulfill ({order.items?.length || 0}):
                        </span>

                        <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/40">
                          {order.items?.map((item) => {
                            const icon = getProductIcon(item.productName);
                            const subtotal = item.subtotal ?? (item.quantity ?? 1) * (item.unitPrice ?? 0);

                            return (
                              <div
                                key={item.id}
                                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg shrink-0 shadow-2xs">
                                    {icon}
                                  </div>
                                  <div>
                                    <h5 className="font-bold text-xs text-slate-900">
                                      {item.productName || "Farm Produce Input"}
                                    </h5>
                                    <p className="text-3xs text-slate-500">
                                      Product ID: #{item.productId || "--"}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 text-xs">
                                  <span className="text-slate-600 font-semibold text-2xs">
                                    Qty: <strong className="text-slate-900">{item.quantity}</strong>
                                  </span>
                                  <span className="text-slate-400">•</span>
                                  <span className="text-slate-600 text-2xs">
                                    Unit: {item.unitPrice ?? 0} 🪙
                                  </span>
                                  <span className="text-slate-400">•</span>
                                  <span className="font-bold text-emerald-700 text-xs">
                                    Subtotal: 🪙 {subtotal}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Status Management Toolbar — Core Feature */}
                      <div className="pt-4 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/80 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 p-4 sm:p-5 rounded-b-3xl">
                        {/* Status Description Info */}
                        <div className="space-y-0.5">
                          <span className="text-3xs uppercase font-extrabold tracking-wider text-slate-400 block">
                            Fulfillment Progression
                          </span>
                          <p className="text-xs font-semibold text-slate-700">
                            {isPlaced && "📦 New order received. Prepare packaging and update status to Packed."}
                            {isPacked && "🎁 Shipment is packed. Ready to dispatch with courier or field transport."}
                            {isInTransit && "🚚 Shipment is in transit. Mark Delivered once customer receives it."}
                            {isCompleted && "✅ Order delivered and fulfilled. Token revenue settled to your ledger."}
                            {isDisputed && "⚠️ Order is under mediation. View details to submit resolution proof."}
                            {isCancelled && "❌ Order was cancelled and tokens refunded."}
                          </p>
                        </div>

                        {/* Status Action Buttons for Farmer */}
                        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
                          {order.id && !isCompleted && !isCancelled && (
                            <>
                              {/* 1. If PLACED: Can Mark Packed or Dispatch */}
                              {isPlaced && (
                                <button
                                  type="button"
                                  onClick={() => order.id && handleUpdateOrderStatus(order.id, "PACKED")}
                                  disabled={isUpdating}
                                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                                >
                                  {isUpdating ? "Updating..." : "📦 Mark as Packed"}
                                </button>
                              )}

                              {/* 2. If PACKED or PLACED: Can Dispatch */}
                              {(isPlaced || isPacked) && (
                                <button
                                  type="button"
                                  onClick={() => order.id && handleUpdateOrderStatus(order.id, "IN_TRANSIT")}
                                  disabled={isUpdating}
                                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                                >
                                  {isUpdating ? "Updating..." : "🚚 Dispatch (In Transit)"}
                                </button>
                              )}

                              {/* 3. Mark Delivered */}
                              <button
                                type="button"
                                onClick={() => order.id && handleUpdateOrderStatus(order.id, "COMPLETED")}
                                disabled={isUpdating}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                              >
                                {isUpdating ? "Updating..." : "✅ Mark Delivered"}
                              </button>

                              {/* Status Dropdown Picker for Direct Selection */}
                              <select
                                onChange={(e) => {
                                  if (e.target.value && order.id) {
                                    handleUpdateOrderStatus(order.id, e.target.value);
                                  }
                                }}
                                disabled={isUpdating}
                                defaultValue=""
                                className="px-2.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl focus:outline-none focus:border-emerald-500 cursor-pointer"
                              >
                                <option value="" disabled>Set Status ▾</option>
                                <option value="PACKED">Status: PACKED</option>
                                <option value="IN_TRANSIT">Status: IN_TRANSIT</option>
                                <option value="COMPLETED">Status: COMPLETED</option>
                              </select>
                            </>
                          )}

                          {/* Dedicated Farmer Order Audit Page */}
                          <Link href={`/farmer/orders/${order.id}`}>
                            <button
                              type="button"
                              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
                            >
                              Audit Details ➔
                            </button>
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
      )}

      {/* ============================================================== */}
      {/* MODE 2: HOUSEHOLD WASTE COLLECTION REQUESTS                   */}
      {/* ============================================================== */}
      {activeMode === "waste_pickups" && (
        <div className="space-y-6">
          <div className="p-6 bg-gradient-to-r from-emerald-900 to-teal-900 rounded-3xl text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-3xs uppercase font-extrabold text-emerald-300 tracking-wider">
                Doorstep Waste Feedstock Logistics
              </span>
              <h3 className="text-xl font-black">Doorstep Waste Collection Routes</h3>
              <p className="text-xs text-slate-200 max-w-lg">
                Manage collection routes, scan QR handshake passes, and verify doorstep weigh-ins on our dedicated collection board.
              </p>
            </div>

            <Link href="/farmer/pickups">
              <Button className="bg-white text-emerald-900 hover:bg-emerald-50 font-black text-xs shadow-md">
                Open Full Route Planner ➔
              </Button>
            </Link>
          </div>

          {loadingPickups ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-3xl" />
              ))}
            </div>
          ) : myPickups.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <p className="text-4xl">🌾</p>
              <h3 className="text-base font-bold text-slate-800">No active pickup assignments</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Claim unclaimed waste batches from the Collection Board to schedule route stops and collect organic feedstock.
              </p>
              <Link href="/farmer/pickups" className="inline-block mt-2">
                <Button size="sm" className="bg-emerald-600 text-white font-bold text-xs">
                  Discover Available Feeds
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {myPickups.map((pickup) => (
                <div
                  key={pickup.id}
                  className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">Pickup #{pickup.id}</span>
                      <Badge variant="info">{pickup.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-600">
                      📍 {pickup.pickupAddress || "Registered household address"}
                    </p>
                    <p className="text-2xs text-slate-400">
                      Scheduled: {pickup.scheduledTime ? new Date(pickup.scheduledTime).toLocaleString() : "Pending"}
                    </p>
                  </div>

                  <Link href="/farmer/pickups">
                    <Button size="sm" variant="outline" className="text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
                      Manage in Route Board ➔
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
