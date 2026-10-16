"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { webApiClient } from "@/lib/api";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
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

  // Group cart items by farmer (same farmer -> one order; different farmers -> separate orders)
  const farmerPackages = useMemo(() => {
    const map = new Map<
      string,
      {
        farmerId?: number;
        farmerName: string;
        items: typeof hydratedItems;
        totalTokens: number;
      }
    >();

    for (const item of hydratedItems) {
      const farmerId = item.product?.farmerId;
      const farmerName = item.product?.farmerName || "Regional Farm Partner";
      const key = farmerId != null ? `id-${farmerId}` : `name-${farmerName}`;

      const existing = map.get(key) || {
        farmerId,
        farmerName,
        items: [],
        totalTokens: 0,
      };

      existing.items.push(item);
      const itemSubtotal = (item.product?.price ?? 0) * item.quantity;
      existing.totalTokens += itemSubtotal;
      map.set(key, existing);
    }

    return Array.from(map.values());
  }, [hydratedItems]);

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
      const createdOrders = [];
      const deliveryAddress = shippingAddress.trim() || "Registered Address";

      // Place a separate order for each farmer package
      for (const pkg of farmerPackages) {
        const orderRequest = {
          deliveryAddress,
          items: pkg.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        };

        const createdOrder = await webApiClient.orders.createOrder(orderRequest);
        createdOrders.push(createdOrder);
      }

      clearCart();

      if (createdOrders.length === 1) {
        router.push(`/orders/${createdOrders[0].id}`);
      } else {
        router.push(`/orders?placed=true&count=${createdOrders.length}`);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 sm:py-10 space-y-8 min-h-[calc(100vh-4rem)] animate-pulse">
        <div className="h-6 w-32 rounded-xl bg-slate-200/60" />
        <div className="h-16 rounded-2xl bg-slate-200/60" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 h-96 rounded-3xl bg-slate-200/50" />
          <div className="lg:col-span-4 h-96 rounded-3xl bg-slate-200/50" />
        </div>
      </div>
    );
  }

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
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 sm:py-10 space-y-8 min-h-[calc(100vh-4rem)]">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Order Items Review & Shipping */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Marketplace Packages ({farmerPackages.length} {farmerPackages.length === 1 ? "Order" : "Orders"})
                </h3>
                <p className="text-2xs text-slate-500 mt-0.5">
                  {farmerPackages.length > 1
                    ? "Items from different farmers are created as separate orders for independent fulfillment."
                    : "All items belong to the same producer and will be fulfilled in a single order."}
                </p>
              </div>
              <span className="text-2xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200/60 self-start sm:self-auto">
                {hydratedItems.length} {hydratedItems.length === 1 ? "Item" : "Items"} Total
              </span>
            </div>

            <div className="space-y-4">
              {farmerPackages.map((pkg, idx) => (
                <div
                  key={pkg.farmerId ?? pkg.farmerName}
                  className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🚜</span>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">
                          Order {idx + 1}: {pkg.farmerName}
                        </h4>
                        <p className="text-3xs text-slate-500">
                          {pkg.items.length} {pkg.items.length === 1 ? "item" : "items"} direct from producer
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                      {pkg.totalTokens} Tokens
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 bg-white rounded-lg px-3 py-1 border border-slate-100">
                    {pkg.items.map((item) => (
                      <div key={item.productId} className="py-2.5 flex items-center justify-between">
                        <div>
                          <h5 className="font-bold text-xs text-slate-800">
                            {item.product?.name ?? `Product #${item.productId}`}
                          </h5>
                          <p className="text-2xs text-slate-500">
                            {item.quantity} × {item.product?.price ?? 0} EcoTokens
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                          {(item.product?.price ?? 0) * item.quantity} Tokens
                        </span>
                      </div>
                    ))}
                  </div>
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
        <div className="lg:col-span-4 space-y-6">
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
              {isSubmitting
                ? "Processing Orders..."
                : farmerPackages.length > 1
                ? `Confirm & Place ${farmerPackages.length} Orders (${estimatedTotalTokens} Tokens)`
                : `Confirm & Place Order (${estimatedTotalTokens} Tokens)`}
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
