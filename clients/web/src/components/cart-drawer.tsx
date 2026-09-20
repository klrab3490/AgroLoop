"use client";

import React from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { hydratedItems, removeItem, updateQuantity, clearCart, estimatedTotalTokens } = useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>🛒</span> Your Cart
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md text-sm"
            >
              ✕ Close
            </button>
          </div>

          {/* Item List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {hydratedItems.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-4xl mb-3">🧺</p>
                <p className="text-base font-medium">Your cart is currently empty</p>
                <Link
                  href="/marketplace"
                  onClick={onClose}
                  className="mt-4 inline-block px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold text-sm hover:bg-emerald-700 transition"
                >
                  Explore Marketplace
                </Link>
              </div>
            ) : (
              hydratedItems.map((item) => (
                <div
                  key={item.productId}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50 flex items-center justify-between"
                >
                  <div className="flex-1 mr-4">
                    <h4 className="font-semibold text-sm text-slate-800">
                      {item.product?.name ?? `Product #${item.productId}`}
                    </h4>
                    <p className="text-xs text-emerald-700 font-medium mt-0.5">
                      {item.product?.price ? `${item.product.price} EcoTokens / unit` : "Loading..."}
                    </p>
                    {item.isStale && (
                      <span className="text-2xs text-amber-600 block mt-1">⚠️ Updating price...</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-7 h-7 rounded bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100"
                    >
                      -
                    </button>
                    <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-7 h-7 rounded bg-white border border-slate-300 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100"
                    >
                      +
                    </button>
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="text-xs text-red-500 hover:text-red-700 ml-2"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout */}
          {hydratedItems.length > 0 && (
            <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4">
              <div className="flex items-center justify-between text-slate-600 text-sm">
                <span>Estimated Total</span>
                <span className="text-lg font-bold text-emerald-700">
                  {estimatedTotalTokens} EcoTokens
                </span>
              </div>
              <p className="text-2xs text-slate-400">
                Authoritative stock and token balance will be verified by the server at checkout.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={clearCart}
                  className="flex-1 py-2.5 px-3 border border-slate-300 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-100 transition"
                >
                  Clear Cart
                </button>
                <Link
                  href="/marketplace/checkout"
                  onClick={onClose}
                  className="flex-2 py-2.5 px-4 bg-emerald-600 text-white text-center rounded-xl font-semibold text-sm hover:bg-emerald-700 transition shadow-sm"
                >
                  Checkout
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
