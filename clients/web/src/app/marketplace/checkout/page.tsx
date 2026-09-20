"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { webApiClient } from "@/lib/api";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { hydratedItems, estimatedTotalTokens, clearCart } = useCart();
  const [shippingAddress, setShippingAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch household balance
  const { data: balanceData, isLoading: isBalanceLoading } = useQuery({
    queryKey: ["household-balance"],
    queryFn: () => webApiClient.household.getBalance(),
    enabled: isAuthenticated && user?.role === "ROLE_HOUSEHOLD",
  });

  const householdBalance = balanceData?.availableBalance ?? 0;
  const isInsufficient = isAuthenticated && householdBalance < estimatedTotalTokens;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      router.push("/auth/login");
      return;
    }

    if (hydratedItems.length === 0) {
      setErrorMsg("Your cart is empty.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // Backend validates inventory, prices, and balance authoritatively under pessimistic locks
      const orderRequest = {
        deliveryAddress: shippingAddress || "Registered Address",
        items: hydratedItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const createdOrder = await webApiClient.orders.createOrder(orderRequest);
      clearCart();
      router.push(`/orders/${createdOrder.id}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-4xl">🔒</p>
        <h2 className="text-2xl font-black text-slate-900">Sign In to Checkout</h2>
        <p className="text-xs text-slate-500">
          You need an active Household composter account to spend EcoTokens.
        </p>
        <Link
          href="/auth/login"
          className="inline-block px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 transition"
        >
          Sign In Now
        </Link>
      </div>
    );
  }

  if (hydratedItems.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-4xl">🧺</p>
        <h2 className="text-2xl font-black text-slate-900">Your Cart is Empty</h2>
        <p className="text-xs text-slate-500">Add products from the marketplace before checking out.</p>
        <Link
          href="/marketplace"
          className="inline-block px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl text-sm hover:bg-emerald-700 transition"
        >
          Browse Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <span className="text-2xs font-bold uppercase tracking-widest text-emerald-600">
          Authoritative Checkout
        </span>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">Review & Place Order</h1>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: Order Items Review & Shipping */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
              Selected Products ({hydratedItems.length})
            </h3>
            <div className="divide-y divide-slate-100">
              {hydratedItems.map((item) => (
                <div key={item.productId} className="py-3 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">
                      {item.product?.name ?? `Product #${item.productId}`}
                    </h4>
                    <p className="text-2xs text-slate-500">
                      {item.quantity} × {item.product?.price ?? 0} EcoTokens
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700">
                    {(item.product?.price ?? 0) * item.quantity} Tokens
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
              Delivery Address
            </h3>
            <input
              type="text"
              required
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="Enter complete shipping address"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Right: Wallet & Total Summary */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
              Wallet & Solvency Check
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Wallet Balance</span>
                <span className="font-bold text-slate-900">
                  {isBalanceLoading ? "..." : `${householdBalance} Tokens`}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Order Total</span>
                <span className="font-bold text-emerald-700">{estimatedTotalTokens} Tokens</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-sm">
                <span>Balance After Order</span>
                <span className={householdBalance - estimatedTotalTokens < 0 ? "text-red-600" : "text-slate-900"}>
                  {householdBalance - estimatedTotalTokens} Tokens
                </span>
              </div>
            </div>

            {isInsufficient && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-2xs font-semibold leading-relaxed">
                ⚠️ Insufficient EcoToken balance. You need {estimatedTotalTokens - householdBalance} more tokens.
                Submit compostable waste to earn additional EcoTokens!
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={isSubmitting || isInsufficient}
              className="w-full py-3.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 transition shadow-md shadow-emerald-200"
            >
              {isSubmitting ? "Processing Transaction..." : "Confirm & Pay with EcoTokens"}
            </button>

            <p className="text-3xs text-slate-400 text-center leading-tight">
              Pessimistic row locking and atomic stock reservation will occur upon confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
