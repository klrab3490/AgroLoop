"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { webApiClient } from "@/lib/api";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const orderId = parseInt(resolvedParams.id, 10);
  const queryClient = useQueryClient();

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => webApiClient.orders.getOrder(orderId),
    enabled: !isNaN(orderId),
  });

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
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="h-80 rounded-3xl bg-slate-200 animate-pulse" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-4xl">⚠️</p>
        <h2 className="text-xl font-bold text-slate-800">Order Not Found</h2>
        <Link href="/orders" className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <Link href="/orders" className="text-xs font-bold text-slate-500 hover:text-emerald-700 transition inline-flex items-center gap-1">
        ← Back to Order History
      </Link>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
          <div>
            <span className="text-2xs font-bold uppercase tracking-widest text-emerald-600">Order Record</span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Order #{order.id}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Placed on {order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
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
        </div>

        {actionError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
            {actionError}
          </div>
        )}

        {/* Line Items */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Ordered Items</h3>
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/70 p-4 bg-slate-50/50">
            {order.items?.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">{item.productName}</h4>
                  <p className="text-2xs text-slate-500">
                    {item.quantity} units × {item.unitPrice ?? 0} EcoTokens
                  </p>
                </div>
                <span className="text-xs font-bold text-emerald-700">
                  {(item.unitPrice ?? 0) * (item.quantity ?? 1)} Tokens
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-end p-2">
            <div className="text-right">
              <span className="text-xs text-slate-500 block font-medium">Authoritative Order Total</span>
              <span className="text-2xl font-black text-emerald-700">{order.totalTokens} Tokens</span>
            </div>
          </div>
        </div>

        {/* Shipping details */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs text-slate-600 space-y-1">
          <span className="font-bold text-slate-900 block">Shipping Destination</span>
          <p>{order.deliveryAddress || "Address on file"}</p>
        </div>

        {/* Actions Area */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3 justify-end">
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
              File Dispute
            </button>
          )}
        </div>
      </div>

      {/* Cancellation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-3xl max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900">Cancel Order #{order.id}</h3>
            <p className="text-xs text-slate-500">
              Cancelling will atomically restock inventory and credit {order.totalTokens} EcoTokens back to your wallet.
            </p>
            <textarea
              required
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation..."
              className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelOrder}
                disabled={isProcessing || !cancelReason.trim()}
                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 disabled:bg-slate-300"
              >
                {isProcessing ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Modal */}
      {disputeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-3xl max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900">File Order Dispute</h3>
            <p className="text-xs text-slate-500">
              Administrative adjudicators will review your claim and determine appropriate restitution.
            </p>
            <textarea
              required
              rows={3}
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Explain the discrepancy or issue..."
              className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDisputeModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDisputeOrder}
                disabled={isProcessing || !disputeReason.trim()}
                className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 disabled:bg-slate-300"
              >
                {isProcessing ? "Submitting..." : "Submit Dispute"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
