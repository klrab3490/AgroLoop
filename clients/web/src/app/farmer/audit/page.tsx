"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { webApiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";
import type { OrderApiResponse } from "@agroloop/api-types";

type AuditFilter = "ALL" | "ESCROW" | "SETTLED" | "DISPUTED";

export default function FarmerAuditDashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeFilter, setActiveFilter] = useState<AuditFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: orders = [],
    isLoading: loadingOrders,
    error: ordersError,
    refetch,
  } = useQuery<OrderApiResponse[]>({
    queryKey: ["farmer-orders-audit"],
    queryFn: () => webApiClient.farmer.getOrders(),
    enabled: isAuthenticated && (user?.role === "ROLE_FARMER" || user?.role === "ROLE_ADMIN"),
  });

  // Financial calculations
  const settledTotal = orders
    .filter((o) => o.status === "COMPLETED")
    .reduce((sum, o) => sum + (o.totalTokens ?? 0), 0);

  const inEscrowTotal = orders
    .filter((o) => o.status === "PLACED" || o.status === "PACKED" || o.status === "IN_TRANSIT")
    .reduce((sum, o) => sum + (o.totalTokens ?? 0), 0);

  const disputedTotal = orders
    .filter((o) => o.status === "DISPUTED")
    .reduce((sum, o) => sum + (o.totalTokens ?? 0), 0);

  const completedCount = orders.filter((o) => o.status === "COMPLETED").length;
  const inEscrowCount = orders.filter(
    (o) => o.status === "PLACED" || o.status === "PACKED" || o.status === "IN_TRANSIT"
  ).length;
  const disputedCount = orders.filter((o) => o.status === "DISPUTED").length;

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (activeFilter === "ESCROW") {
        if (order.status !== "PLACED" && order.status !== "PACKED" && order.status !== "IN_TRANSIT") {
          return false;
        }
      } else if (activeFilter === "SETTLED") {
        if (order.status !== "COMPLETED") return false;
      } else if (activeFilter === "DISPUTED") {
        if (order.status !== "DISPUTED") return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = String(order.id).includes(q) || `eco-ord-${order.id}`.includes(q);
        const matchesCustomer = (order.householdName || "").toLowerCase().includes(q);
        const matchesAddress = (order.deliveryAddress || "").toLowerCase().includes(q);
        const matchesItem = order.items?.some((i) => (i.productName || "").toLowerCase().includes(q));
        return matchesId || matchesCustomer || matchesAddress || matchesItem;
      }

      return true;
    });
  }, [orders, activeFilter, searchQuery]);

  if (authLoading) {
    return (
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 sm:py-10 space-y-6 min-h-[calc(100vh-4rem)]">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (!isAuthenticated || (user?.role !== "ROLE_FARMER" && user?.role !== "ROLE_ADMIN")) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-4xl">🧑‍🌾</p>
        <h2 className="text-2xl font-black text-slate-900">Farmer Audit Access</h2>
        <p className="text-xs text-slate-500">
          Sign in with your verified Farmer account to access the operations audit and ledger escrow dashboard.
        </p>
        <Link href="/auth/login">
          <Button size="sm" className="bg-emerald-600 text-white font-bold text-xs">
            Sign In Now
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 sm:py-10 space-y-8 min-h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xs font-bold uppercase tracking-widest text-emerald-600">
              Operations Governance
            </span>
            <span className="px-2 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-100 text-emerald-800">
              Audit Trail
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
            Farmer Operations Audit &amp; Escrow
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative financial ledger logs, delivery verification proofs, and merchant escrow settlement status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/farmer/orders">
            <Button size="sm" variant="outline" className="text-xs font-bold bg-white text-slate-700 border-slate-200">
              📦 Orders &amp; Fulfillment
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => refetch()}
            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            🔄 Refresh Audit
          </Button>
        </div>
      </div>

      {/* Escrow Financial Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-3xs uppercase font-extrabold text-slate-400 block">
            Settled to Wallet
          </span>
          <p className="text-2xl font-black text-emerald-600">🪙 {settledTotal}</p>
          <p className="text-3xs text-slate-500">{completedCount} delivered orders</p>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-3xs uppercase font-extrabold text-slate-400 block">
            Locked in Escrow
          </span>
          <p className="text-2xl font-black text-blue-600">🪙 {inEscrowTotal}</p>
          <p className="text-3xs text-slate-500">{inEscrowCount} active shipments</p>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-3xs uppercase font-extrabold text-slate-400 block">
            Disputed Escrow
          </span>
          <p className="text-2xl font-black text-rose-600">🪙 {disputedTotal}</p>
          <p className="text-3xs text-slate-500">{disputedCount} claims under review</p>
        </div>

        <div className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
          <span className="text-3xs uppercase font-extrabold text-slate-400 block">
            Audited Volume
          </span>
          <p className="text-2xl font-black text-slate-900">{orders.length}</p>
          <p className="text-3xs text-slate-500">Total customer orders</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
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
            All Audited ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("ESCROW")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeFilter === "ESCROW"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            In Escrow ({inEscrowCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("SETTLED")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeFilter === "SETTLED"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            Settled ({completedCount})
          </button>
          {disputedCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveFilter("DISPUTED")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                activeFilter === "DISPUTED"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100"
              }`}
            >
              Disputed ({disputedCount})
            </button>
          )}
        </div>

        <div className="relative min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Order ID, customer, address..."
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

      {/* Audit Log Table / Cards */}
      {loadingOrders ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
      ) : ordersError ? (
        <Alert variant="error" title="Failed to load audit records">
          Unable to synchronize audit telemetry with authoritative database.
        </Alert>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <p className="text-4xl">📑</p>
          <h3 className="text-base font-bold text-slate-800">No audit records found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery || activeFilter !== "ALL"
              ? "No orders match your filter parameters. Try clearing filters."
              : "As households order your farm produce from the circular marketplace, individual audit logs and escrow transaction histories will be archived here."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-3xs font-extrabold uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="px-6 py-4">Order Ref</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Placed Date</th>
                  <th className="px-6 py-4">Items</th>
                  <th className="px-6 py-4">Escrow Value</th>
                  <th className="px-6 py-4">Fulfillment State</th>
                  <th className="px-6 py-4 text-right">Audit Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const isCompleted = order.status === "COMPLETED";
                  const isPlaced = order.status === "PLACED";
                  const isPacked = order.status === "PACKED";
                  const isInTransit = order.status === "IN_TRANSIT";
                  const isDisputed = order.status === "DISPUTED";
                  const isCancelled = order.status === "CANCELLED";

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-slate-900 block">
                          #ECO-ORD-{order.id}
                        </span>
                        <span className="text-3xs text-emerald-600 font-bold block mt-0.5">
                          AUTHORITATIVE
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800 block">
                          {order.householdName || "Resident Household"}
                        </span>
                        <span className="text-3xs text-slate-400 truncate max-w-[150px] block" title={order.deliveryAddress || "Address on file"}>
                          📍 {order.deliveryAddress || "Address on file"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-700 block">
                          {formatDate(order.createdAt)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800 block">
                          {order.items?.length || 0} item(s)
                        </span>
                        <span className="text-3xs text-slate-400 truncate max-w-[160px] block">
                          {order.items?.map((i) => i.productName).join(", ") || "Farm Produce"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 font-black text-emerald-800 text-sm">
                          <span>🪙</span>
                          <span>{order.totalTokens} Tokens</span>
                        </div>
                        <span className="text-3xs text-slate-400 block mt-0.5">
                          {isCompleted ? "✅ Disbursed" : isCancelled ? "✕ Refunded" : "🔒 In Holding"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
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
                          {order.status}
                        </Badge>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link href={`/farmer/orders/${order.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-white border-slate-200 shadow-2xs"
                          >
                            Inspect Audit Record ➔
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
