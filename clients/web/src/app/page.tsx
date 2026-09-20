"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { webApiClient } from "@/lib/api";
import { useCart } from "@/lib/cart-context";

export default function HomePage() {
  const { addItem } = useCart();
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => webApiClient.marketplace.listProducts({ size: 4 }),
    retry: 1,
  });

  const products = productsData?.content ?? [];

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/80 to-white pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-emerald-100/60">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
            <span>♻️</span> Circular Waste-to-Reward Ecosystem
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight">
            Turn Household Waste into <span className="text-emerald-600 underline decoration-emerald-300">Soil Gold</span>.
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Households submit compostable organics, farmers collect to enrich regional soils, and contributors earn{" "}
            <strong>EcoTokens</strong> redeemable for organic harvest and supplies.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              href="/household/submit"
              className="px-6 py-3.5 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition"
            >
              Submit Waste for Pickup
            </Link>
            <Link
              href="/marketplace"
              className="px-6 py-3.5 bg-white text-slate-700 border border-slate-300 font-bold rounded-xl hover:bg-slate-50 transition shadow-sm"
            >
              Browse Marketplace
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works 3-Step Section */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xs font-bold tracking-widest text-emerald-600 uppercase">Step-by-Step Flow</h2>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">The Zero-Waste Circular Lifecycle</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm relative space-y-3">
            <span className="text-3xl">🥦</span>
            <h4 className="text-lg font-bold text-slate-900">1. Households Submit Organics</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Kitchen scraps and yard clippings are photographed and logged. An on-demand collection ticket is generated in the regional queue.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm relative space-y-3">
            <span className="text-3xl">🚜</span>
            <h4 className="text-lg font-bold text-slate-900">2. Farmers Claim & Handshake</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Farmers claim routes, arrive on-site, and scan the household&apos;s server-signed HMAC QR pass to authenticate collection and weigh-in.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm relative space-y-3">
            <span className="text-3xl">🪙</span>
            <h4 className="text-lg font-bold text-slate-900">3. Earn & Spend EcoTokens</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Verified weight immediately mints immutable EcoTokens into the household wallet, redeemable for organic compost, seeds, and fresh produce.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Marketplace Products */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xs font-bold tracking-widest text-emerald-600 uppercase">Farm to Table</h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">Featured Sustainable Products</h3>
          </div>
          <Link
            href="/marketplace"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition flex items-center gap-1"
          >
            View Full Catalog ➔
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-slate-200/60 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center bg-slate-100 rounded-2xl text-slate-500 text-sm">
            No products listed yet. Farmer listings will appear here dynamically.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 text-3xs font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {product.category}
                    </span>
                    <span
                      className={`text-3xs font-semibold px-2 py-0.5 rounded-md ${
                        (product.stock ?? 0) > 0
                          ? "bg-slate-100 text-slate-600"
                          : "bg-red-50 text-red-600"
                      }`}
                    >
                      {(product.stock ?? 0) > 0 ? `${product.stock} in stock` : "Sold out"}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base">{product.name}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>
                </div>

                <div className="p-5 pt-0 border-t border-slate-100 flex items-center justify-between mt-auto">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Price</span>
                    <span className="text-base font-black text-emerald-700">
                      {product.price} <span className="text-xs font-normal">Tokens</span>
                    </span>
                  </div>
                  <button
                    disabled={(product.stock ?? 0) <= 0 || !product.id}
                    onClick={() => product.id && addItem(product.id, 1)}
                    className="px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 transition"
                  >
                    + Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
