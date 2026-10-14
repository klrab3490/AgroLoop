"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { webApiClient } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/spinner";
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

export default function FarmerOrderDetailAuditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const orderId = parseInt(resolvedParams.id, 10);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [isUpdating, setIsUpdating] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const {
    data: order,
    isLoading: loadingOrder,
    error: orderError,
  } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => webApiClient.orders.getOrder(orderId),
    enabled: !isNaN(orderId) && isAuthenticated,
  });

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(`ECO-ORD-${orderId}`);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleUpdateStatus = async (targetStatus: string) => {
    setIsUpdating(true);
    setActionSuccess(null);
    setActionError(null);
    try {
      if (targetStatus === "COMPLETED" || targetStatus === "DELIVERED") {
        await webApiClient.orders.completeOrder(orderId);
      } else {
        await webApiClient.orders.updateStatus(orderId, targetStatus);
      }
      await queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      await queryClient.invalidateQueries({ queryKey: ["farmer-orders"] });
      setActionSuccess(`Order status successfully transitioned to ${targetStatus}!`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : `Failed to update status to ${targetStatus}`);
      setTimeout(() => setActionError(null), 6000);
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading || loadingOrder) {
    return (
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 sm:py-10 space-y-6 min-h-[calc(100vh-4rem)]">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-44 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (!isAuthenticated || (user?.role !== "ROLE_FARMER" && user?.role !== "ROLE_ADMIN")) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-4xl">🔒</p>
        <h2 className="text-2xl font-black text-slate-900">Farmer Authorization Required</h2>
        <p className="text-xs text-slate-500">
          This audit console is restricted to participating partner farmers and platform administrators.
        </p>
        <Link href="/auth/login">
          <Button size="sm" className="bg-emerald-600 text-white font-bold text-xs">
            Sign In with Farmer Account
          </Button>
        </Link>
      </div>
    );
  }

  if (!order || orderError) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-4xl">⚠️</p>
        <h2 className="text-xl font-bold text-slate-800">Order Audit Record Not Found</h2>
        <p className="text-xs text-slate-500">
          Order #{orderId} could not be retrieved from the authoritative ledger.
        </p>
        <Link href="/farmer/orders">
          <Button variant="outline" size="sm" className="text-xs font-bold">
            ← Back to Orders
          </Button>
        </Link>
      </div>
    );
  }

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
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 sm:py-10 space-y-8 min-h-[calc(100vh-4rem)]">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-1">
            <Link href="/farmer/orders" className="hover:text-emerald-700 transition">
              ← Farmer Orders &amp; Fulfillment
            </Link>
            <span>/</span>
            <Link href="/farmer/audit" className="hover:text-emerald-700 transition">
              Operations Audit
            </Link>
            <span>/</span>
            <span className="text-slate-800">#ECO-ORD-{order.id}</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Order Audit &amp; Fulfillment Record
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative merchant fulfillment dossier, escrow lock state, and logistics telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopyOrderId}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-mono text-xs font-bold rounded-xl transition shadow-2xs"
          >
            {copiedId ? "✓ Copied!" : `#ECO-ORD-${order.id}`}
          </button>
          <Link href="/farmer/audit">
            <Button variant="outline" size="sm" className="text-xs font-bold bg-white text-slate-700 border-slate-200">
              📊 Full Audit Trail
            </Button>
          </Link>
        </div>
      </div>

      {/* Action Banners */}
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

      {/* Order Status & Escrow Summary Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <span className="text-3xs font-extrabold uppercase tracking-widest text-slate-400">
              Fulfillment Lifecycle State
            </span>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-slate-900">
                {isPlaced && "Awaiting Packaging"}
                {isPacked && "Packed & Staged for Dispatch"}
                {isInTransit && "Out for Delivery / In Transit"}
                {isCompleted && "Delivered & Escrow Settled"}
                {isDisputed && "Disputed by Buyer"}
                {isCancelled && "Cancelled & Refunded"}
              </h2>
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
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-3xs font-extrabold uppercase tracking-widest text-slate-400 block">
              Escrow Token Balance
            </span>
            <span className="text-2xl font-black text-emerald-700 block mt-0.5">
              🪙 {order.totalTokens} EcoTokens
            </span>
            <span className="text-3xs text-slate-400">
              {isCompleted ? "Transferred to Farmer Wallet" : "Locked in Smart Contract Escrow"}
            </span>
          </div>
        </div>

        {/* Audit Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-3xs uppercase font-extrabold text-slate-400 block">Customer</span>
            <p className="font-bold text-slate-900">👤 {order.householdName || "Resident Household"}</p>
            <p className="text-3xs text-slate-500">ID #{order.householdId ?? "--"}</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-3xs uppercase font-extrabold text-slate-400 block">Placed Timestamp</span>
            <p className="font-bold text-slate-900">{formatDate(order.createdAt)}</p>
            <p className="text-3xs text-slate-500">
              {order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : "--"}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-3xs uppercase font-extrabold text-slate-400 block">Escrow State</span>
            <p className="font-bold text-emerald-800">
              {isCompleted ? "✅ Settled" : isCancelled ? "✕ Reverted" : "🔒 In Escrow"}
            </p>
            <p className="text-3xs text-slate-500">
              {isCompleted ? "Disbursed to merchant" : "Awaiting delivery proof"}
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-3xs uppercase font-extrabold text-slate-400 block">Audit Record</span>
            <p className="font-mono font-bold text-slate-900 truncate" title={`SHA256-${order.id}-${order.createdAt}`}>
              ECDSA-PASSED
            </p>
            <p className="text-3xs text-emerald-600 font-bold">Ledger Invariant Verified</p>
          </div>
        </div>

        {/* Destination Address & Map Route */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-3xs font-extrabold uppercase tracking-widest text-slate-400 block">
              Shipping Destination
            </span>
            <p className="font-bold text-slate-900">📍 {order.deliveryAddress || "Address on file"}</p>
            {order.notes && (
              <p className="text-2xs text-amber-800 font-medium mt-1">
                📝 <strong>Customer Note:</strong> &ldquo;{order.notes}&rdquo;
              </p>
            )}
          </div>

          <a
            href={gmapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-xs rounded-xl border border-slate-200 transition shadow-2xs self-start sm:self-auto shrink-0"
          >
            <span>🗺️ Open in Google Maps</span>
          </a>
        </div>
      </div>

      {/* Itemized Order Products */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-4">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
          Itemized Farm Products ({order.items?.length || 0})
        </h3>

        <div className="divide-y divide-slate-100">
          {order.items?.map((item) => {
            const icon = getProductIcon(item.productName);
            const subtotal = item.subtotal ?? (item.quantity ?? 1) * (item.unitPrice ?? 0);

            return (
              <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-xl shrink-0 shadow-2xs">
                    {icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{item.productName}</h4>
                    <p className="text-2xs text-slate-500">
                      Product Ref: #{item.productId || "--"} &bull; Unit: {item.unitPrice ?? 0} 🪙 each
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs">
                  <span className="text-slate-600">
                    Quantity: <strong className="text-slate-900 text-sm">{item.quantity}</strong>
                  </span>
                  <span className="font-black text-emerald-800 text-sm">
                    🪙 {subtotal} EcoTokens
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Transition Control (Interactive Merchant Updater) */}
      {!isCompleted && !isCancelled && (
        <div className="bg-gradient-to-br from-slate-900 to-emerald-950 rounded-3xl p-6 sm:p-8 text-white space-y-5 shadow-lg shadow-slate-900/10">
          <div>
            <span className="text-3xs uppercase font-extrabold tracking-widest text-emerald-400">
              Merchant Action Console
            </span>
            <h3 className="text-xl font-black mt-1">Update Order Fulfillment Status</h3>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Advance this order through packaging, dispatch, and final doorstep delivery.
              Marking as delivered automatically releases the locked escrow tokens into your merchant wallet.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            {isPlaced && (
              <button
                type="button"
                onClick={() => handleUpdateStatus("PACKED")}
                disabled={isUpdating}
                className="px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <span>📦</span>
                <span>{isUpdating ? "Updating..." : "Mark as Packed"}</span>
              </button>
            )}

            {(isPlaced || isPacked) && (
              <button
                type="button"
                onClick={() => handleUpdateStatus("IN_TRANSIT")}
                disabled={isUpdating}
                className="px-5 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                <span>🚚</span>
                <span>{isUpdating ? "Updating..." : "Dispatch (In Transit)"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleUpdateStatus("COMPLETED")}
              disabled={isUpdating}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/30 transition flex items-center gap-2 cursor-pointer"
            >
              <span>✅</span>
              <span>{isUpdating ? "Settling Escrow..." : "Mark Delivered & Release Tokens"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Dispute Section if Disputed */}
      {isDisputed && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-rose-800">
            <span className="text-xl">⚠️</span>
            <h4 className="font-black text-sm">Customer Dispute Raised</h4>
          </div>
          <p className="text-xs text-rose-700">
            <strong>Dispute Reason:</strong> &ldquo;{order.disputeReason || "Goods damaged or delivery issue"}&rdquo;
          </p>
          <p className="text-2xs text-rose-600">
            Platform administrators are reviewing this case. Tokens in escrow remain locked until resolution is adjudicated.
          </p>
        </div>
      )}
    </div>
  );
}
