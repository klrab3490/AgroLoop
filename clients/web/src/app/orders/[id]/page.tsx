"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { webApiClient } from "@/lib/api";
import { useCart } from "@/lib/cart-context";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const orderId = parseInt(resolvedParams.id, 10);
  const queryClient = useQueryClient();
  const { addItem } = useCart();

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedOrderId, setCopiedOrderId] = useState(false);
  const [addedItemMessage, setAddedItemMessage] = useState<string | null>(null);

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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-6">
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
  const isPlaced = order.status === "PLACED";

  // Step calculations (Amazon-style 4 stages)
  // Stage 1: Order Confirmed
  // Stage 2: Processed by Farmer
  // Stage 3: Out for Delivery
  // Stage 4: Delivered
  const currentStepNumber: number = isDelivered ? 4 : isPlaced ? 2 : isCancelled ? 0 : 2;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
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

      {/* Amazon / Flipkart Style Delivery & Fulfillment Progress Stepper */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  isDelivered
                    ? "bg-emerald-500"
                    : isPlaced
                    ? "bg-blue-500 animate-pulse"
                    : isCancelled
                    ? "bg-slate-400"
                    : "bg-amber-500"
                }`}
              />
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                {isDelivered && "Delivered to Doorstep"}
                {isPlaced && "Order Confirmed — Preparing for Shipment"}
                {isCancelled && "Order Cancelled"}
                {isDisputed && "Order Under Dispute Review"}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 pl-5">
              {isDelivered && "Package was handed directly to resident. Verified on-site."}
              {isPlaced && "Your order has been placed with the local producer. Estimated delivery within 24–48 hours."}
              {isCancelled && (order.cancellationReason ? `Reason: ${order.cancellationReason}` : "Cancelled by user. Tokens refunded.")}
              {isDisputed && (order.disputeReason ? `Dispute reason: ${order.disputeReason}` : "Case opened with arbitration.")}
            </p>
          </div>

          <span
            className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              isDelivered
                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                : isPlaced
                ? "bg-blue-100 text-blue-800 border border-blue-200"
                : isCancelled
                ? "bg-slate-100 text-slate-700 border border-slate-200"
                : "bg-amber-100 text-amber-800 border border-amber-200"
            }`}
          >
            {order.status}
          </span>
        </div>

        {/* 4-Stage Progress Stepper Bar (Amazon Delivery Bar) */}
        {!isCancelled ? (
          <div className="py-2">
            <div className="relative">
              {/* Background Connecting Bar */}
              <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-1.5 bg-slate-100 rounded-full" />
              {/* Progress Connecting Bar */}
              <div
                className="absolute top-1/2 left-0 -translate-y-1/2 h-1.5 bg-emerald-500 rounded-full transition-all duration-500"
                style={{
                  width:
                    currentStepNumber === 4
                      ? "100%"
                      : currentStepNumber === 3
                      ? "66%"
                      : currentStepNumber === 2
                      ? "33%"
                      : "0%",
                }}
              />

              {/* Steps */}
              <div className="relative flex justify-between">
                {/* Step 1: Placed */}
                <div className="flex flex-col items-center text-center max-w-[80px]">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ring-4 ring-white ${
                      currentStepNumber >= 1
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    ✓
                  </div>
                  <span className="text-[11px] font-bold text-slate-900 mt-2">Ordered</span>
                  <span className="text-[10px] text-slate-400 leading-tight">Confirmed</span>
                </div>

                {/* Step 2: Processing */}
                <div className="flex flex-col items-center text-center max-w-[80px]">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ring-4 ring-white ${
                      currentStepNumber >= 2
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {currentStepNumber > 2 ? "✓" : "2"}
                  </div>
                  <span className="text-[11px] font-bold text-slate-900 mt-2">Packed</span>
                  <span className="text-[10px] text-slate-400 leading-tight">Farm Ready</span>
                </div>

                {/* Step 3: Out for Delivery */}
                <div className="flex flex-col items-center text-center max-w-[80px]">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ring-4 ring-white ${
                      currentStepNumber >= 3
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {currentStepNumber > 3 ? "✓" : "3"}
                  </div>
                  <span className="text-[11px] font-bold text-slate-900 mt-2">In Transit</span>
                  <span className="text-[10px] text-slate-400 leading-tight">Local Route</span>
                </div>

                {/* Step 4: Delivered */}
                <div className="flex flex-col items-center text-center max-w-[80px]">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ring-4 ring-white ${
                      currentStepNumber >= 4
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {currentStepNumber >= 4 ? "✓" : "4"}
                  </div>
                  <span className="text-[11px] font-bold text-slate-900 mt-2">Delivered</span>
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
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-6 rounded-3xl max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-2 text-red-600 font-bold text-base">
              <span>✕</span>
              <h3>Cancel Order #ECO-ORD-{order.id}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cancelling this order will release reserved inventory back to the local farmer and atomically credit{" "}
              <span className="font-bold text-emerald-700">{order.totalTokens} EcoTokens</span> back to your account wallet.
            </p>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Reason for Cancellation
              </label>
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="E.g., Ordered wrong quantity, change of mind..."
                className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={isProcessing || !cancelReason.trim()}
                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 disabled:bg-slate-300 transition"
              >
                {isProcessing ? "Processing..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-6 rounded-3xl max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-2 text-amber-700 font-bold text-base">
              <span>⚖️</span>
              <h3>Open Order Resolution Dispute</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              AgroLoop platform arbitration ensures fair exchange. Provide details regarding damaged items, missing quantities, or non-delivery.
            </p>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Describe the issue
              </label>
              <textarea
                required
                rows={4}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Please describe the discrepancy with item photos or delivery details..."
                className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setDisputeModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDisputeOrder}
                disabled={isProcessing || !disputeReason.trim()}
                className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 disabled:bg-slate-300 transition"
              >
                {isProcessing ? "Submitting..." : "Submit to Arbitrator"}
              </button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
