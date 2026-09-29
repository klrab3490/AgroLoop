"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { webApiClient } from "@/lib/api";
import { useCart } from "@/lib/cart-context";
import type { ProductApiResponse } from "@agroloop/api-types";

const CATEGORIES = [
  { label: "All Categories", value: "" },
  { label: "Compost & Soil", value: "COMPOST_AND_SOIL" },
  { label: "Organic Vegetables", value: "ORGANIC_VEGETABLES" },
  { label: "Fresh Fruits", value: "FRESH_FRUITS" },
  { label: "Farm Fresh Dairy", value: "FARM_DAIRY" },
  { label: "Seeds & Saplings", value: "SEEDS_AND_SAPLINGS" },
  { label: "Herbs & Spices", value: "HERBS_AND_SPICES" },
];

export default function MarketplacePage() {
  const { addItem } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchKeyword, setSearchKeyword] = useState<string>("");

  const { data: pageResult, isLoading, error } = useQuery({
    queryKey: ["marketplace-products", selectedCategory, searchKeyword],
    queryFn: () =>
      webApiClient.marketplace.listProducts({
        category: selectedCategory || undefined,
        keyword: searchKeyword || undefined,
      }),
    retry: 2,
  });

  const products: ProductApiResponse[] = pageResult?.content ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-2xs font-bold uppercase tracking-widest text-emerald-600">
              Sustainable Circular Marketplace
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
            Redeem EcoTokens for Farm-Grade Inputs
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-2xl">
            Purchase certified organic compost, biological fertilizers, and seeds produced by regional farmers using your collected waste.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition ${
                selectedCategory === cat.value
                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Search products..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <span className="absolute left-3 top-2 text-xs text-slate-400">🔍</span>
        </div>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-slate-200/60 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3">
          <p className="text-4xl">🌾</p>
          <p className="text-base font-semibold text-slate-800">No products found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search keywords or switching category filters.
          </p>
        </div>
      ) : (

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 text-3xs font-bold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {product.category}
                  </span>
                  <span
                    className={`text-3xs font-semibold px-2 py-0.5 rounded-md ${
                      (product.stock ?? 0) > 0 ? "bg-slate-100 text-slate-600" : "bg-red-50 text-red-600"
                    }`}
                  >
                    {(product.stock ?? 0) > 0 ? `${product.stock} in stock` : "Sold out"}
                  </span>
                </div>

                <Link href={`/marketplace/${product.id}`} className="block group">
                  <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition">
                    {product.name}
                  </h3>
                </Link>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {product.description || "Certified organic soil enrichment product directly from regional farmers."}
                </p>

                {product.farmerName && (
                  <p className="text-2xs text-slate-400 font-medium">
                    🚜 Producer: <span className="text-slate-700">{product.farmerName}</span>
                  </p>
                )}
              </div>

              <div className="p-5 pt-0 border-t border-slate-100 flex items-center justify-between mt-auto">
                <div>
                  <span className="text-3xs text-slate-400 block font-bold uppercase">Price</span>
                  <span className="text-base font-black text-emerald-700">
                    {product.price} <span className="text-xs font-normal">Tokens</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/marketplace/${product.id}`}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition"
                  >
                    Details
                  </Link>
                  <button
                    disabled={(product.stock ?? 0) <= 0 || !product.id}
                    onClick={() => product.id && addItem(product.id, 1)}
                    className="px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 transition"
                  >
                    + Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
