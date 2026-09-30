"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { webApiClient } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import { ProductCard } from "@/components/product-card";

export default function HomePage() {
  const { addItem } = useCart();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => webApiClient.marketplace.listProducts({ size: 4 }),
    retry: 1,
  });

  const products = productsData?.content ?? [];

  const handleAddToCart = (productId: number, productName: string) => {
    addItem(productId, 1);
    setToastMessage(`Added "${productName}" to your cart`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="space-y-20 py-6 sm:py-10">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
          <Link href="/orders" className="ml-2 text-emerald-400 hover:underline">
            View Cart ➔
          </Link>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl mx-4 sm:mx-6 lg:mx-8 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white p-8 sm:p-16 lg:p-20 shadow-2xl border border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Closed-Loop Regional Agriculture</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
            Turn Household Organics into{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 bg-clip-text text-transparent">
              Soil Gold
            </span>.
          </h1>

          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Households divert compostable waste, certified regional farmers collect and enrich local soils, and contributors earn{" "}
            <span className="text-emerald-400 font-bold">EcoTokens</span> redeemable for heirloom seeds, organic produce, and farm inputs.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              href="/household/submit"
              className="px-7 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-900/30 hover:from-emerald-500 hover:to-teal-500 transition-all duration-200 active:scale-98"
            >
              Submit Compost Scrap
            </Link>
            <Link
              href="/marketplace"
              className="px-7 py-3.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 font-bold text-sm rounded-2xl backdrop-blur-md transition-all duration-200"
            >
              Explore Farmer Marketplace
            </Link>
          </div>

          {/* Quick Pillar Badges */}
          <div className="pt-8 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-2xs uppercase tracking-wider font-semibold text-slate-400">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              HMAC-Verified QR Handshakes
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              HttpOnly Secure Session Ledger
            </span>
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              100% Regional Circularity
            </span>
          </div>
        </div>
      </section>

      {/* How It Works 3-Step Section */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-2xs font-bold tracking-widest text-emerald-600 uppercase">Circular Flow Architecture</span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            How The Closed-Loop Nutrient Cycle Works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 bg-white rounded-3xl border border-slate-200/80 shadow-2xs relative space-y-4 hover:border-emerald-300 transition group">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-2xl font-black group-hover:scale-110 transition-transform">
              🥦
            </div>
            <div>
              <span className="text-3xs font-bold uppercase tracking-wider text-emerald-600">Stage 01</span>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">Households Log Organics</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Kitchen scraps, peels, and garden clippings are weighed and photographed. A cryptographically timestamped collection pass is registered in your regional hub.
            </p>
          </div>

          <div className="p-8 bg-white rounded-3xl border border-slate-200/80 shadow-2xs relative space-y-4 hover:border-emerald-300 transition group">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center text-2xl font-black group-hover:scale-110 transition-transform">
              🚜
            </div>
            <div>
              <span className="text-3xs font-bold uppercase tracking-wider text-blue-600">Stage 02</span>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">Farmers Claim & Verify</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Nearby certified growers dispatch pickup routes, scan your doorstep HMAC QR verification pass, and certify net organic weight at the scale.
            </p>
          </div>

          <div className="p-8 bg-white rounded-3xl border border-slate-200/80 shadow-2xs relative space-y-4 hover:border-emerald-300 transition group">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center text-2xl font-black group-hover:scale-110 transition-transform">
              🪙
            </div>
            <div>
              <span className="text-3xs font-bold uppercase tracking-wider text-amber-600">Stage 03</span>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">Earn & Redeem EcoTokens</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              The authoritative ledger mints EcoTokens straight to your wallet. Redeem them below for living compost, heirloom seeds, orchard fruits, and farm fresh dairy.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Sustainable Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-2xs font-bold tracking-widest text-emerald-600 uppercase mb-1">
              <span>🌾</span>
              <span>Farm to Table Verified</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Featured Sustainable Products
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Freshly harvested produce and certified biological soil conditioners available for immediate EcoToken redemption.
            </p>
          </div>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200/70 hover:bg-emerald-100 transition shadow-2xs self-start sm:self-auto"
          >
            <span>View Full Catalog</span>
            <span>➔</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 rounded-3xl bg-slate-200/60 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
            <p className="text-3xl">🧺</p>
            <h3 className="text-sm font-bold text-slate-800">No Featured Products Available</h3>
            <p className="text-xs text-slate-500">Live products will synchronize as farmers register harvest batches.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={(prod) => prod.id && handleAddToCart(prod.id, prod.name || "Agricultural Product")}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
