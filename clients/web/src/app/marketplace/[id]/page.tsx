"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { webApiClient } from "@/lib/api";
import { useCart } from "@/lib/cart-context";

interface CategoryMeta {
  label: string;
  icon: string;
  gradient: string;
}

const CATEGORY_MAP: Record<string, CategoryMeta> = {
  COMPOST_AND_SOIL: {
    label: "Compost & Living Soil",
    icon: "🌿",
    gradient: "from-emerald-800/20 via-teal-900/15 to-stone-900/25",
  },
  ORGANIC_VEGETABLES: {
    label: "Organic Vegetables",
    icon: "🥕",
    gradient: "from-lime-700/20 via-emerald-800/15 to-green-950/20",
  },
  FRESH_FRUITS: {
    label: "Orchard Fruits",
    icon: "🍎",
    gradient: "from-amber-700/20 via-orange-700/15 to-rose-950/20",
  },
  FARM_DAIRY: {
    label: "Pasture Dairy & Honey",
    icon: "🥛",
    gradient: "from-sky-700/20 via-indigo-700/15 to-slate-950/20",
  },
  SEEDS_AND_SAPLINGS: {
    label: "Seeds & Saplings",
    icon: "🌾",
    gradient: "from-teal-800/20 via-cyan-900/15 to-emerald-950/20",
  },
  HERBS_AND_SPICES: {
    label: "Aromatic Herbs",
    icon: "🪴",
    gradient: "from-purple-700/20 via-fuchsia-800/15 to-slate-950/20",
  },
};

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
    setTimeout(() => setAddedNotice(false), 3500);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="h-96 rounded-3xl bg-slate-200/60 animate-pulse border border-slate-200" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl mx-auto border border-slate-200">
          ⚠️
        </div>
        <h2 className="text-xl font-bold text-slate-800">Offering Not Found</h2>
        <p className="text-xs text-slate-500">The product you are looking for may have been archived or removed from the circular catalog.</p>
        <Link href="/marketplace" className="inline-block px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm">
          ← Back to Catalog
        </Link>
      </div>
    );
  }

  const meta = CATEGORY_MAP[product.category ?? ""] || {
    label: product.category || "Organic Input",
    icon: "🌱",
    gradient: "from-emerald-900/15 via-teal-900/10 to-emerald-950/20",
  };

  const inStock = (product.stock ?? 0) > 0;
  const unitPrice = Number(product.price ?? 0);
  const totalPrice = (unitPrice * quantity).toFixed(2);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50 py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/marketplace"
            className="text-xs font-bold text-slate-500 hover:text-emerald-700 transition inline-flex items-center gap-1.5 group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Circular Marketplace</span>
          </Link>

          <span className="text-[11px] font-semibold text-slate-400">
            Catalog Item #{product.id}
          </span>
        </div>

        {/* Main Product Showcase Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-2">
          {/* Visual Showcase Box */}
          <div className={`relative bg-gradient-to-br ${meta.gradient} p-10 sm:p-14 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 overflow-hidden`}>
            {/* Ambient Lighting */}
            <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-white/30 blur-3xl pointer-events-none" />

            {/* Badges */}
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur-md border border-slate-200/70 rounded-full text-xs font-bold text-slate-800 shadow-xs">
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
              </span>
            </div>

            {/* Visual Icon Illustration */}
            <div className="py-8 text-center flex flex-col items-center">
              <span className="text-8xl drop-shadow-md select-none transform hover:scale-105 transition-transform duration-300">
                {meta.icon}
              </span>
              {product.unit && (
                <span className="mt-4 text-xs font-black uppercase tracking-wider px-3.5 py-1 rounded-full bg-white/85 text-slate-800 border border-slate-200/60 shadow-xs">
                  {product.unit}
                </span>
              )}
            </div>

            <div className="absolute bottom-4 inset-x-4 text-center">
              <span className="text-[11px] font-semibold text-slate-500">
                🌱 100% Circular Organic Input • Regionally Sourced
              </span>
            </div>
          </div>

          {/* Product Details & Actions */}
          <div className="p-6 sm:p-10 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Stock Indicator */}
              <div className="flex items-center justify-between">
                {inStock ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{product.stock} Units In Stock</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
                    Sold Out
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight tracking-tight">
                {product.name}
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                {product.description || "Certified organic soil enhancement product produced by regional farmers using circular waste collections."}
              </p>

              {/* Producer Card */}
              {product.farmerName && (
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                      {product.farmerName[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{product.farmerName}</p>
                      <p className="text-[10px] text-emerald-600 font-semibold">Verified AgroLoop Farmer Partner</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    Kerala Region
                  </span>
                </div>
              )}
            </div>

            {/* Price & Checkout Area */}
            <div className="space-y-5 pt-6 border-t border-slate-100">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Unit Price
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-3xl font-black text-slate-900">{product.price}</span>
                    <span className="text-xs font-bold text-emerald-700">ECO Tokens</span>
                  </div>
                </div>

                {quantity > 1 && (
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                      Total ({quantity} units)
                    </span>
                    <span className="text-lg font-black text-emerald-700">
                      {totalPrice} ECO
                    </span>
                  </div>
                )}
              </div>

              {/* Quantity Selector */}
              {inStock && (
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200/70">
                  <label className="text-xs font-bold text-slate-700">Select Quantity:</label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-sm flex items-center justify-center transition shadow-2xs"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-xs font-black text-slate-900">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(product.stock ?? 1, quantity + 1))}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-sm flex items-center justify-center transition shadow-2xs"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Success Notice */}
              {addedNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 animate-in fade-in duration-200">
                  <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">✓</span>
                  <span>Added {quantity} unit(s) to your cart!</span>
                </div>
              )}

              {/* Add to Cart Button */}
              <button
                type="button"
                disabled={!inStock}
                onClick={handleAddToCart}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold text-sm rounded-2xl transition shadow-lg shadow-emerald-700/20 hover:shadow-xl hover:shadow-emerald-700/30 active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>{inStock ? `Add to Cart • ${totalPrice} ECO` : "Currently Out of Stock"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
