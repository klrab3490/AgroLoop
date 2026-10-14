"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { webApiClient } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { ConfirmationModal } from "@/components/ui";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const orderId = parseInt(resolvedParams.id, 10);
  const queryClient = useQueryClient();
  const { addItem } = useCart();
  const { user } = useAuth();

  const canUpdateStatus = user?.role === "ROLE_ADMIN" || user?.role === "ROLE_FARMER";

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [addedItemMessage, setAddedItemMessage] = useState<string | null>(null);

  // Live status updater & carrier sync state
  const [apiModalOpen, setApiModalOpen] = useState(false);
  const [devCurlTab, setDevCurlTab] = useState<"devKey" | "jwt">("devKey");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [copiedTrackingId, setCopiedTrackingId] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => webApiClient.orders.getOrder(orderId),
    enabled: !isNaN(orderId),
  });

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(`ECO-ORD-${orderId}`);
    setCopiedOrderId(true);
    setTimeout(() => setCopiedOrderId(false), 2000);
  };

  const handleUpdateStatus = async (targetStatus: string) => {
    if (!canUpdateStatus) {
      setActionError("Only farmers and administrators are authorized to update order status.");
      return;
    }
    setIsUpdatingStatus(targetStatus);
    setActionError(null);
    try {
      await webApiClient.orders.updateStatus(orderId, targetStatus);
      await queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      setAddedItemMessage(`Status updated to ${targetStatus} via API!`);
      setTimeout(() => setAddedItemMessage(null), 3000);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : `Failed to update status to ${targetStatus}`);
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      setAddedItemMessage("Live tracking refreshed from API!");
      setTimeout(() => setAddedItemMessage(null), 2000);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleCopyTracking = (trk: string) => {
    navigator.clipboard.writeText(trk);
    setCopiedTrackingId(true);
    setTimeout(() => setCopiedTrackingId(false), 2000);
  };

  const handleCopyCurl = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const handleBuyAgain = (productId?: number, productName?: string) => {
    if (!productId) return;
    addItem(productId, 1);
    setAddedItemMessage(`Added "${productName || "Product"}" to your cart!`);
    setTimeout(() => setAddedItemMessage(null), 3000);
  };

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      await webApiClient.orders.cancelOrder(orderId, { reason: cancelReason });
      await queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      setCancelModalOpen(false);
      setCancelReason("");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDisputeOrder = async () => {
    if (!disputeReason.trim()) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      await webApiClient.orders.disputeOrder(orderId, { disputeReason });
      await queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      setDisputeModalOpen(false);
      setDisputeReason("");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to file dispute");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 sm:py-10 space-y-6 min-h-[calc(100vh-4rem)]">
        <div className="h-6 w-36 rounded-lg bg-slate-200 animate-pulse" />
        <div className="h-28 rounded-2xl bg-slate-200/70 animate-pulse" />
        <div className="h-44 rounded-2xl bg-slate-200/60 animate-pulse" />
        <div className="h-64 rounded-2xl bg-slate-200/50 animate-pulse" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-3xl font-black">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-slate-900">Order Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested order #{orderId} could not be located or you may not have authorization to view it.
        </p>
        <Link
          href="/orders"
          className="inline-block px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-sm"
        >
          ← Back to Order History
        </Link>
      </div>
    );
  }

  const orderDateFormatted = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const orderTimeFormatted = order.createdAt
    ? new Date(order.createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  // Progress Stepper configuration
  const isCancelled = order.status === "CANCELLED";
  const isDisputed = order.status === "DISPUTED";
  const isDelivered = order.status === "COMPLETED";
  const isInTransit = order.status === "IN_TRANSIT";
  const isPacked = order.status === "PACKED";
  const isPlaced = order.status === "PLACED";

  // Step calculations (Amazon-style 4 stages)
  // Stage 1: Ordered (Confirmed)
  // Stage 2: Packed (Farm Ready)
  // Stage 3: In Transit (Local Route)
  // Stage 4: Delivered (Doorstep)
  const currentStepNumber: number = isDelivered
    ? 4
    : isInTransit
    ? 3
    : isPacked
    ? 2
    : isPlaced
    ? 1
    : isCancelled
    ? 0
    : 1;

  const trackingNumber = `ECO-TRK-${((order.id ?? orderId) * 1000 + 482)}`;

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 sm:py-10 space-y-6 min-h-[calc(100vh-4rem)]">
      {/* Toast Notification */}
      {addedItemMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-2">
          <span>🛍️</span>
          <span>{addedItemMessage}</span>
          <Link href="/marketplace/checkout" className="underline font-black ml-2 text-emerald-200 hover:text-white">
            View Cart
          </Link>
        </div>
      )}

      {/* Breadcrumb Navigation & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/orders" className="hover:text-emerald-700 transition">
            My Orders
          </Link>
          <span>›</span>
          <span className="font-bold text-slate-800">Order #ECO-ORD-{order.id}</span>
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setInvoiceModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition shadow-2xs"
          >
            <span>📄</span>
            <span>View Invoice</span>
          </button>
          <button
            onClick={handleCopyOrderId}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition shadow-2xs"
          >
            <span>{copiedOrderId ? "✓" : "📋"}</span>
            <span>{copiedOrderId ? "Copied!" : "Copy Order #"}</span>
          </button>
        </div>
      </div>

      {/* Main Order Details Title */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Order Details
        </h1>
        <p className="text-xs text-slate-500">
          Ordered on {orderDateFormatted} {orderTimeFormatted ? `at ${orderTimeFormatted}` : ""} • Order #ECO-ORD-{order.id}
        </p>
      </div>

      {/* Amazon / Flipkart Style Top Metadata Bar */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs shadow-2xs">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Order Placed</span>
          <p className="font-bold text-slate-800 mt-0.5">{orderDateFormatted}</p>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Authoritative Total</span>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-sm">🪙</span>
            <span className="font-black text-emerald-800 text-sm">{order.totalTokens} EcoTokens</span>
          </div>
        </div>

        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ship To</span>
          <p className="font-bold text-slate-800 mt-0.5 truncate">
            {order.householdName || "Resident Household"}
          </p>
        </div>

        <div className="text-right sm:text-left">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Order Reference</span>
          <span className="font-mono font-bold text-slate-700 mt-0.5 block">
            ECO-ORD-{order.id}
          </span>
        </div>
      </div>

      {/* Error alert if any */}
      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl flex items-center gap-2">
          <span>⚠️</span>
          <span>{actionError}</span>
        </div>
      )}

      {/* Amazon / Flipkart Style Delivery & Fulfillment Progress Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        {/* Top Header Row with Status & ETA */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-5 border-b border-slate-100 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-3.5 h-3.5 rounded-full ring-4 ${
                  isDelivered
                    ? "bg-emerald-500 ring-emerald-100"
                    : isInTransit
                    ? "bg-purple-500 ring-purple-100 animate-pulse"
                    : isPacked
                    ? "bg-amber-500 ring-amber-100 animate-pulse"
                    : isPlaced
                    ? "bg-blue-500 ring-blue-100 animate-pulse"
                    : isCancelled
                    ? "bg-slate-400 ring-slate-100"
                    : "bg-amber-500 ring-amber-100"
                }`}
              />
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {isDelivered && "Delivered to Doorstep"}
                {isInTransit && "Out for Delivery — On Local Route"}
                {isPacked && "Order Packed & Sealed — Ready for Dispatch"}
                {isPlaced && "Order Confirmed — Preparing for Harvest & Shipment"}
                {isCancelled && "Order Cancelled"}
                {isDisputed && "Order Under Dispute Review"}
              </h2>
            </div>
            <p className="text-xs text-slate-500 pl-6">
              {isDelivered && "Package handed directly to resident. Verified on-site at doorstep."}
              {isInTransit && "Your organic goods are out for delivery with local zero-emission cargo courier."}
              {isPacked && "Farm producer has carefully harvested, sorted, and sealed items in 100% compostable packaging."}
              {isPlaced && "Order confirmed and verified on EcoToken ledger. Producer preparing batch."}
              {isCancelled && (order.cancellationReason ? `Reason: ${order.cancellationReason}` : "Cancelled by user. Tokens refunded.")}
              {isDisputed && (order.disputeReason ? `Dispute reason: ${order.disputeReason}` : "Case opened with arbitration.")}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                isDelivered
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : isInTransit
                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                  : isPacked
                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                  : isPlaced
                  ? "bg-blue-100 text-blue-800 border border-blue-200"
                  : isCancelled
                  ? "bg-slate-100 text-slate-700 border border-slate-200"
                  : "bg-amber-100 text-amber-800 border border-amber-200"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              <span>{order.status}</span>
            </span>

            <button
              type="button"
              onClick={handleRefreshStatus}
              disabled={isRefreshing}
              title="Refresh live status from server"
              className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <span className={`inline-block ${isRefreshing ? "animate-spin" : ""}`}>🔄</span>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Carrier Info Strip */}
        {!isCancelled && (
          <div className="bg-slate-50/80 border border-slate-200/60 rounded-2xl p-3 sm:px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-slate-600 flex items-center gap-1.5 font-medium">
                <span>🌱</span>
                <span>Carrier: <strong>EcoCourier Green Fleet</strong></span>
              </span>
              <span className="text-slate-400 hidden sm:inline">•</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Tracking:</span>
                <span className="font-mono font-bold text-slate-800">{trackingNumber}</span>
                <button
                  type="button"
                  onClick={() => handleCopyTracking(trackingNumber)}
                  className="px-1.5 py-0.5 bg-white hover:bg-slate-100 text-slate-600 rounded border border-slate-200 text-[10px] font-semibold transition cursor-pointer"
                >
                  {copiedTrackingId ? "✓ Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="text-slate-500 text-[11px] font-medium flex items-center gap-2">
              <span>Delivery Window: <strong>Tomorrow by 6:00 PM</strong></span>
            </div>
          </div>
        )}

        {/* 4-Stage Progress Stepper Bar (Amazon / Flipkart Delivery Stepper) */}
        {!isCancelled ? (
          <div className="py-4">
            <div className="relative max-w-3xl mx-auto">
              {/* Background Connecting Bar */}
              <div className="absolute top-4.5 left-8 right-8 h-2 bg-slate-100 rounded-full" />
              {/* Active Connecting Bar */}
              <div
                className="absolute top-4.5 left-8 h-2 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 rounded-full transition-all duration-700 ease-out shadow-2xs"
                style={{
                  width:
                    currentStepNumber === 4
                      ? "calc(100% - 4rem)"
                      : currentStepNumber === 3
                      ? "calc(66.6% - 2.5rem)"
                      : currentStepNumber === 2
                      ? "calc(33.3% - 1.5rem)"
                      : "0%",
                }}
              />

              {/* Steps */}
              <div className="relative flex justify-between">
                {/* Step 1: Ordered */}
                <div className="flex flex-col items-center text-center max-w-[90px]">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs ring-4 ring-white shadow-xs transition ${
                      currentStepNumber >= 1
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    ✓
                  </div>
                  <span className="text-xs font-bold text-slate-900 mt-2">Ordered</span>
                  <span className="text-[10px] text-slate-400 leading-tight">{orderTimeFormatted || "Confirmed"}</span>
                </div>

                {/* Step 2: Packed */}
                <div className="flex flex-col items-center text-center max-w-[90px]">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs ring-4 shadow-xs transition ${
                      currentStepNumber >= 2
                        ? "bg-emerald-600 text-white ring-white"
                        : currentStepNumber === 1
                        ? "bg-blue-600 text-white ring-blue-100 animate-pulse border-2 border-white"
                        : "bg-slate-100 text-slate-400 ring-white"
                    }`}
                  >
                    {currentStepNumber >= 2 ? "✓" : currentStepNumber === 1 ? "📦" : "2"}
                  </div>
                  <span className="text-xs font-bold text-slate-900 mt-2">Packed</span>
                  <span className="text-[10px] text-slate-400 leading-tight">Farm Ready</span>
                </div>

                {/* Step 3: In Transit */}
                <div className="flex flex-col items-center text-center max-w-[90px]">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs ring-4 shadow-xs transition ${
                      currentStepNumber >= 3
                        ? "bg-emerald-600 text-white ring-white"
                        : currentStepNumber === 2
                        ? "bg-blue-600 text-white ring-blue-100 animate-pulse border-2 border-white"
                        : "bg-slate-100 text-slate-400 ring-white"
                    }`}
                  >
                    {currentStepNumber >= 3 ? "✓" : currentStepNumber === 2 ? "🚚" : "3"}
                  </div>
                  <span className="text-xs font-bold text-slate-900 mt-2">In Transit</span>
                  <span className="text-[10px] text-slate-400 leading-tight">Local Route</span>
                </div>

                {/* Step 4: Delivered */}
                <div className="flex flex-col items-center text-center max-w-[90px]">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs ring-4 shadow-xs transition ${
                      currentStepNumber >= 4
                        ? "bg-emerald-600 text-white ring-white"
                        : currentStepNumber === 3
                        ? "bg-blue-600 text-white ring-blue-100 animate-pulse border-2 border-white"
                        : "bg-slate-100 text-slate-400 ring-white"
                    }`}
                  >
                    {currentStepNumber >= 4 ? "✓" : currentStepNumber === 3 ? "🏠" : "4"}
                  </div>
                  <span className="text-xs font-bold text-slate-900 mt-2">Delivered</span>
                  <span className="text-[10px] text-slate-400 leading-tight">Doorstep</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 block">Order was cancelled on {order.cancelledAt ? new Date(order.cancelledAt).toLocaleString() : orderDateFormatted}</span>
              <p className="text-slate-500 mt-0.5">Inventory was atomically restocked and {order.totalTokens} EcoTokens returned to wallet.</p>
            </div>
            <span className="text-2xl">↩️</span>
          </div>
        )}

        {/* Expandable Live Shipment Activity Feed */}
        {!isCancelled && (
          <div className="border border-slate-100 rounded-2xl bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>📋</span>
                <span>Live Shipment Timeline</span>
              </span>
              <button
                type="button"
                onClick={() => setShowTimeline(!showTimeline)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
              >
                {showTimeline ? "Hide Details ▲" : "Show Details ▼"}
              </button>
            </div>

            {showTimeline && (
              <div className="space-y-3 pt-2 text-xs border-t border-slate-200/50">
                <div className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">✓</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">Order Confirmed</span>
                      <span className="text-[10px] text-slate-400">{orderTimeFormatted || "Just now"}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">EcoTokens debited under ACID transaction. Producer notified for harvest batch.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                    currentStepNumber >= 2 ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"
                  }`}>
                    {currentStepNumber >= 2 ? "✓" : "○"}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${currentStepNumber >= 2 ? "text-slate-900" : "text-slate-400"}`}>
                        Produce Harvested &amp; Packed
                      </span>
                      {currentStepNumber >= 2 && <span className="text-[10px] text-slate-400">Processed</span>}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {currentStepNumber >= 2
                        ? "Items sealed in 100% biodegradable certified farm packaging."
                        : "Awaiting local producer packaging confirmation."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                    currentStepNumber >= 3 ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"
                  }`}>
                    {currentStepNumber >= 3 ? "✓" : "○"}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${currentStepNumber >= 3 ? "text-slate-900" : "text-slate-400"}`}>
                        Dispatched with Green Courier
                      </span>
                      {currentStepNumber >= 3 && <span className="text-[10px] text-slate-400">In Transit</span>}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {currentStepNumber >= 3
                        ? "Driver dispatched on optimized delivery route via electric cargo vehicle."
                        : "Courier scheduled upon packaging completion."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                    currentStepNumber >= 4 ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-500"
                  }`}>
                    {currentStepNumber >= 4 ? "✓" : "○"}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${currentStepNumber >= 4 ? "text-slate-900" : "text-slate-400"}`}>
                        Delivered to Doorstep
                      </span>
                      {currentStepNumber >= 4 && <span className="text-[10px] text-slate-400">Completed</span>}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {currentStepNumber >= 4
                        ? "Verified doorstep delivery complete. AgroLoop certified impact receipt generated."
                        : "Package will be delivered directly to resident."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Status API Controller & External Webhook Bar (Farmer & Admin only) */}
        {!isCancelled && !isDisputed && canUpdateStatus && (
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="text-amber-500">⚡</span>
              <span className="font-bold text-slate-700">Update Order via API:</span>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                {user?.role === "ROLE_ADMIN" ? "Admin Controls" : "Farmer Fulfillment"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleUpdateStatus("PACKED")}
                disabled={isUpdatingStatus !== null || isPacked || isInTransit || isDelivered}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  isPacked
                    ? "bg-amber-100 text-amber-800 cursor-default"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40"
                }`}
              >
                {isUpdatingStatus === "PACKED" ? "..." : "📦"}
                <span>Set Packed</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus("IN_TRANSIT")}
                disabled={isUpdatingStatus !== null || isInTransit || isDelivered}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  isInTransit
                    ? "bg-purple-100 text-purple-800 cursor-default"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40"
                }`}
              >
                {isUpdatingStatus === "IN_TRANSIT" ? "..." : "🚚"}
                <span>Set In Transit</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus("COMPLETED")}
                disabled={isUpdatingStatus !== null || isDelivered}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  isDelivered
                    ? "bg-emerald-100 text-emerald-800 cursor-default"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40"
                }`}
              >
                {isUpdatingStatus === "COMPLETED" ? "..." : "✅"}
                <span>Set Delivered</span>
              </button>

              <button
                type="button"
                onClick={() => setApiModalOpen(true)}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>🔌</span>
                <span>API Webhook</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Flipkart / Amazon Style Item Cards */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="text-base font-black text-slate-900">
            Items in this Order ({order.items?.length ?? 0})
          </h3>
          <span className="text-xs text-slate-400">Sold by Verified AgroLoop Farmers</span>
        </div>

        <div className="divide-y divide-slate-100">
          {order.items?.map((item) => (
            <div key={item.id} className="py-5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                {/* Product Thumbnail / Category Icon */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-100 border border-emerald-200/60 flex items-center justify-center text-3xl shrink-0 shadow-2xs">
                  🌱
                </div>

                <div className="space-y-1">
                  <Link
                    href={item.productId ? `/marketplace/${item.productId}` : "/marketplace"}
                    className="font-bold text-sm sm:text-base text-slate-900 hover:text-emerald-700 transition leading-snug block"
                  >
                    {item.productName}
                  </Link>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="text-emerald-600">🌿</span>
                    <span>Sold by:</span>
                    <span className="font-semibold text-slate-700">
                      {item.farmerName || "Regional Partner Farm"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    Qty: <span className="font-bold text-slate-800">{item.quantity}</span> • Unit Price:{" "}
                    <span className="font-bold text-slate-800">{item.unitPrice ?? 0} 🪙</span>
                  </p>
                </div>
              </div>

              {/* Item Price and Action Buttons (Amazon / Flipkart Style) */}
              <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                <div className="text-left md:text-right">
                  <span className="text-2xs text-slate-400 uppercase tracking-wider block font-bold">Subtotal</span>
                  <span className="text-lg font-black text-emerald-800">
                    {(item.unitPrice ?? 0) * (item.quantity ?? 1)} EcoTokens
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBuyAgain(item.productId, item.productName)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1"
                  >
                    <span>↺</span>
                    <span>Buy it again</span>
                  </button>

                  <Link
                    href={item.productId ? `/marketplace/${item.productId}` : "/marketplace"}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    View Product
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Amazon-Style 3-Column Summary Cards (Shipping, Payment, Totals) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Box 1: Delivery Address */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
            <span className="text-emerald-600 text-sm">📍</span>
            <span>Delivery Address</span>
          </div>
          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-900 text-sm">
              {order.householdName || "Resident Household"}
            </p>
            <p className="leading-relaxed">
              {order.deliveryAddress || "Standard residential doorstep on file"}
            </p>
            {order.notes && (
              <p className="text-[11px] text-slate-400 italic mt-2">
                Note: {order.notes}
              </p>
            )}
          </div>
        </div>

        {/* Box 2: Payment Method */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
            <span className="text-emerald-600 text-sm">🪙</span>
            <span>Payment Method</span>
          </div>
          <div className="text-xs text-slate-600 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-2xs font-extrabold uppercase">
                EcoToken Ledger
              </span>
            </div>
            <p className="text-slate-500 leading-tight">
              Cryptographic tokens redeemed from waste diversion rewards.
            </p>
            <div className="pt-2 text-[11px] text-emerald-700 font-bold flex items-center gap-1">
              <span>✓</span>
              <span>Settlement confirmed on platform ledger</span>
            </div>
          </div>
        </div>

        {/* Box 3: Order Breakdown */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider">
            <span className="text-emerald-600 text-sm">🧾</span>
            <span>Order Summary</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Items Subtotal:</span>
              <span className="font-bold text-slate-900">{order.totalTokens} Tokens</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Circular Logistics:</span>
              <span className="font-bold text-emerald-700">FREE (Eco-Funded)</span>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
              <span className="font-bold text-slate-900">Grand Total:</span>
              <div className="text-right">
                <span className="text-xl font-black text-emerald-800">
                  {order.totalTokens} 🪙
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Dispute / Resolution Notes if present */}
      {order.disputeReason && (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl space-y-2 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-black text-sm text-amber-800">
            <span>⚖️</span>
            <span>Dispute Claim on Record</span>
          </div>
          <p className="text-amber-800">
            <span className="font-bold">Reason:</span> {order.disputeReason}
          </p>
          {order.resolvedAt && (
            <div className="pt-2 border-t border-amber-200/60 mt-2 text-amber-900">
              <span className="font-bold">Arbitration Outcome:</span> {order.resolutionType}
              {order.resolutionNotes && <p className="mt-1">{order.resolutionNotes}</p>}
            </div>
          )}
        </div>
      )}

      {/* Bottom Actions Area (Cancel, Dispute, Contact) */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <Link
          href="/orders"
          className="text-xs font-bold text-slate-500 hover:text-emerald-700 transition"
        >
          ← Back to All Orders
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          {order.status === "PLACED" && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition"
            >
              Cancel Order
            </button>
          )}

          {(order.status === "PLACED" || order.status === "COMPLETED") && (
            <button
              onClick={() => setDisputeModalOpen(true)}
              className="px-4 py-2 border border-amber-300 text-amber-800 bg-amber-50 text-xs font-bold rounded-xl hover:bg-amber-100 transition"
            >
              Need Help? File Dispute
            </button>
          )}
        </div>
      </div>

      {/* Cancellation Modal */}
      <ConfirmationModal
        isOpen={cancelModalOpen}
        title="Cancel Order"
        recordIdentifier={`ECO-ORD-${order.id}`}
        description="Cancelling this order will release reserved inventory back to the local farmer and atomically credit the purchase price back to your EcoToken wallet."
        isDestructive={true}
        reversible={false}
        confirmLabel="Confirm Cancellation"
        cancelLabel="Keep Order"
        isLoading={isProcessing}
        consequences={[
          `Order status will transition to CANCELLED`,
          `${order.totalTokens} EcoTokens will be immediately refunded to your wallet`,
          `Reserved inventory items will be restocked to the farmer's store`,
        ]}
        onConfirm={handleCancelOrder}
        onCancel={() => {
          setCancelModalOpen(false);
          setCancelReason("");
        }}
      >
        <div className="space-y-1.5 pt-1">
          <label className="text-3xs font-bold text-slate-500 uppercase tracking-wider block">
            Reason for Cancellation <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="E.g., Ordered wrong quantity, change of delivery schedule..."
            className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>
      </ConfirmationModal>

      {/* Dispute Modal */}
      <ConfirmationModal
        isOpen={disputeModalOpen}
        title="Open Order Resolution Dispute"
        recordIdentifier={`ECO-ORD-${order.id}`}
        description="AgroLoop platform arbitration ensures fair exchange. Provide details regarding damaged items, missing quantities, or delivery discrepancies."
        isDestructive={false}
        reversible={true}
        confirmLabel="Submit to Arbitrator"
        cancelLabel="Cancel"
        isLoading={isProcessing}
        consequences={[
          "An administrative dispute claim will be opened with platform arbiters",
          "Farmer and logistics coordinators will be notified for evidence submission",
          "EcoToken settlement may be adjusted based on the arbitration ruling",
        ]}
        onConfirm={handleDisputeOrder}
        onCancel={() => {
          setDisputeModalOpen(false);
          setDisputeReason("");
        }}
      >
        <div className="space-y-1.5 pt-1">
          <label className="text-3xs font-bold text-slate-500 uppercase tracking-wider block">
            Describe the Issue <span className="text-emerald-700">*</span>
          </label>
          <textarea
            required
            rows={3}
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Please describe the discrepancy with item photos or delivery details..."
            className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
      </ConfirmationModal>

      {/* Printable Invoice Modal */}
      {invoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-8 rounded-3xl max-w-xl w-full space-y-6 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">AgroLoop Certified Receipt</h3>
                <p className="text-xs text-slate-500">Circular Organic Marketplace Settlement</p>
              </div>
              <button
                onClick={() => setInvoiceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Receipt Metadata */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="font-bold text-slate-400 block text-[10px] uppercase">Order ID</span>
                <p className="font-mono font-bold text-slate-800">ECO-ORD-{order.id}</p>
              </div>
              <div>
                <span className="font-bold text-slate-400 block text-[10px] uppercase">Order Date</span>
                <p className="font-bold text-slate-800">{orderDateFormatted}</p>
              </div>
              <div>
                <span className="font-bold text-slate-400 block text-[10px] uppercase">Customer</span>
                <p className="font-bold text-slate-800">{order.householdName || "Resident Household"}</p>
              </div>
              <div>
                <span className="font-bold text-slate-400 block text-[10px] uppercase">Status</span>
                <p className="font-bold text-emerald-700">{order.status}</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                  <tr>
                    <th className="p-3">Item Description</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Price</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items?.map((item) => (
                    <tr key={item.id}>
                      <td className="p-3 font-medium text-slate-800">{item.productName}</td>
                      <td className="p-3 text-center text-slate-600">{item.quantity}</td>
                      <td className="p-3 text-right text-slate-600">{item.unitPrice} 🪙</td>
                      <td className="p-3 text-right font-bold text-emerald-800">
                        {(item.unitPrice ?? 0) * (item.quantity ?? 1)} 🪙
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                  <tr>
                    <td colSpan={3} className="p-3 text-right text-slate-700">Grand Total:</td>
                    <td className="p-3 text-right text-emerald-800 font-black text-sm">{order.totalTokens} 🪙</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition"
              >
                Print / Save PDF
              </button>
              <button
                onClick={() => setInvoiceModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* External API Webhook Modal (Farmer & Admin only) */}
      {apiModalOpen && canUpdateStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-emerald-700">
                  External Logistics &amp; Carrier Webhook
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  Update Order #{order.id} via API
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setApiModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-500">
              External logistics providers, IoT couriers, and warehouse scanners can update this order status directly via the REST API:
            </p>

            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDevCurlTab("devKey")}
                className={`flex-1 py-1.5 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  devCurlTab === "devKey"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>⚡</span>
                <span>Fixed Dev Key (Zero Setup)</span>
              </button>
              <button
                type="button"
                onClick={() => setDevCurlTab("jwt")}
                className={`flex-1 py-1.5 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  devCurlTab === "jwt"
                    ? "bg-white text-emerald-800 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🔐</span>
                <span>Standard JWT Auth</span>
              </button>
            </div>

            {devCurlTab === "devKey" ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>Instant Testing cURL (No Login Needed)</span>
                  <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-mono">
                    X-API-Key: agroloop-dev-key
                  </span>
                </div>
                <div className="relative">
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed">
{`curl -X POST "http://localhost:8080/api/v1/orders/${order.id}/status" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: agroloop-dev-key" \\
  -d '{"status": "IN_TRANSIT"}'`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopyCurl(`curl -X POST "http://localhost:8080/api/v1/orders/${order.id}/status" -H "Content-Type: application/json" -H "X-API-Key: agroloop-dev-key" -d '{"status": "IN_TRANSIT"}'`)}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold transition cursor-pointer"
                  >
                    {copiedCurl ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Tip: You can also use <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">-H &quot;Authorization: Bearer dev-carrier-token&quot;</code>
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Step 1: Get Token &amp; Step 2: Update Status
                </span>
                <div className="relative">
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto leading-relaxed">
{`# 1. Fetch JWT access token (admin or farmer)
TOKEN=$(curl -s -X POST "http://localhost:8080/api/v1/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@agroloop.com","password":"admin123"}' | jq -r .accessToken)

# 2. Call status update with Bearer token
curl -X POST "http://localhost:8080/api/v1/orders/${order.id}/status" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $TOKEN" \\
  -d '{"status": "IN_TRANSIT"}'`}
                  </pre>
                  <button
                    type="button"
                    onClick={() => handleCopyCurl(`TOKEN=$(curl -s -X POST "http://localhost:8080/api/v1/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@agroloop.com","password":"admin123"}' | jq -r .accessToken) && curl -X POST "http://localhost:8080/api/v1/orders/${order.id}/status" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"status": "IN_TRANSIT"}'`)}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold transition cursor-pointer"
                  >
                    {copiedCurl ? "✓ Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span>Supported Statuses:</span>
                <span className="font-mono font-bold text-slate-800">PACKED, IN_TRANSIT, COMPLETED</span>
              </div>
              <div className="flex justify-between">
                <span>Endpoint Route:</span>
                <span className="font-mono font-bold text-emerald-700">POST /api/v1/orders/{order.id}/status</span>
              </div>
              <div className="flex justify-between">
                <span>Fixed Dev Keys:</span>
                <span className="text-emerald-800 font-mono font-bold">agroloop-dev-key, dev-carrier-token</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setApiModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
