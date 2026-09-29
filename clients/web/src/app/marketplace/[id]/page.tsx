"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { webApiClient } from "@/lib/api";
import { useCart } from "@/lib/cart-context";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const productId = parseInt(resolvedParams.id, 10);
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [addedNotice, setAddedNotice] = useState(false);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => webApiClient.marketplace.getProduct(productId),
    enabled: !isNaN(productId),
    retry: 2,
  });

  const handleAddToCart = () => {
    if (!product || product.id == null) return;
    addItem(product.id, quantity);
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 3000);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="h-96 rounded-3xl bg-slate-200 animate-pulse" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-4xl">⚠️</p>
        <h2 className="text-xl font-bold text-slate-800">Product Not Found</h2>
        <p className="text-xs text-slate-500">The product you are looking for may have been archived or removed.</p>
        <Link href="/marketplace" className="inline-block px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/marketplace" className="text-xs font-bold text-slate-500 hover:text-emerald-700 transition inline-flex items-center gap-1 mb-6">
        ← Back to Catalog
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Visual Box */}
        <div className="bg-gradient-to-br from-emerald-100/60 to-emerald-50 p-12 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200">
          <span className="text-7xl mb-4">🌱</span>
          <span className="px-3 py-1 bg-white/80 backdrop-blur-sm border border-emerald-200 rounded-full text-xs font-bold text-emerald-800">
            {product.category}
          </span>
        </div>

        {/* Product Information */}
        <div className="p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span
                className={`text-2xs font-bold px-2.5 py-1 rounded-full ${
                  (product.stock ?? 0) > 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                }`}
              >
                {(product.stock ?? 0) > 0 ? `${product.stock} Available in Stock` : "Sold Out"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              {product.name}
            </h1>

            <p className="text-xs text-slate-600 leading-relaxed">
              {product.description || "Certified organic soil enhancement product directly from regional farmers."}
            </p>

            {product.farmerName && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600">
                <span className="font-bold text-slate-800">🚜 Regional Producer:</span> {product.farmerName}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase">Token Price</span>
              <span className="text-3xl font-black text-emerald-700">
                {product.price} <span className="text-sm font-semibold">EcoTokens</span>
              </span>
            </div>

            {/* Quantity Selector */}
            {(product.stock ?? 0) > 0 && (
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-slate-700">Quantity:</label>
                <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold"
                  >
                    -
                  </button>
                  <span className="px-4 py-1.5 text-xs font-bold">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock ?? 1, quantity + 1))}
                    className="px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {addedNotice && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl text-center">
                ✓ Added {quantity} unit(s) to your cart!
              </div>
            )}

            <button
              disabled={(product.stock ?? 0) <= 0}
              onClick={handleAddToCart}
              className="w-full py-3.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 transition shadow-lg shadow-emerald-200"
            >
              {(product.stock ?? 0) > 0 ? "Add to Cart" : "Currently Unavailable"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
