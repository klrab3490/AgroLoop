"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { useMarketplace } from "@/hooks/use-marketplace";
import { useToast } from "@/hooks/use-toast";
import { CartDrawer } from "@/components/cart-drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/spinner";
import type { ProductApiResponse } from "@agroloop/api-types";
import {
  ProductCard,
  CATEGORIES,
  formatCategoryName,
} from "@/components/product-card";

export default function MarketplacePage() {
  const { addItem } = useCart();
  const { success } = useToast();
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  const {
    products,
    isLoading,
    selectedCategory,
    setSelectedCategory,
    searchKeyword,
    setSearchKeyword,
    sortBy,
    setSortBy,
    inStockOnly,
    setInStockOnly,
    isFarmer,
    farmerHiddenCount,
  } = useMarketplace();

  const handleAddToCart = (product: ProductApiResponse) => {
    if (!product.id) return;
    addItem(product.id, 1);
    success(`Added "${product.name ?? "Item"}" to your cart!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50 pb-20">
      {/* Hero Showcase Banner */}
      <div className="relative overflow-hidden border-b border-emerald-900/10 bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#05966912_1px,transparent_1px),linear-gradient(to_bottom,#05966912_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 relative z-10">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Closed-Loop Regional Agriculture</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]">
              Redeem EcoTokens for <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 bg-clip-text text-transparent">Farm-Grade Inputs</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed font-normal">
              Every purchase closes the nutrient cycle. Acquire verified organic compost, biochar conditioners, cold-pressed sprays, and heirloom seeds produced by regional farmers using circular waste collections.
            </p>

            <div className="pt-2 flex flex-wrap gap-4 sm:gap-6 text-xs text-slate-300/80 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">✓</span>
                <span>Zero Synthetic Additives</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">✓</span>
                <span>Verified Regional Producers</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">✓</span>
                <span>Instant EcoToken Settlement</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Farmer Self-Purchase Safeguard Notice */}
        {isFarmer && (
          <div className="p-4 bg-emerald-50/90 border border-emerald-200/90 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-900 shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="text-xl">🧑‍🌾</span>
              <div>
                <p className="font-bold text-emerald-950">
                  Producer Account Active
                </p>
                <p className="text-emerald-800/90 text-2xs">
                  Your own farm catalog items {farmerHiddenCount > 0 ? `(${farmerHiddenCount} listed)` : ""} are hidden from buyer catalog view to prevent self-purchasing.
                </p>
              </div>
            </div>
            <Link
              href="/farmer/products"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-3xs rounded-xl transition shadow-2xs self-start sm:self-auto whitespace-nowrap"
            >
              <span>Manage Your Farm Products ➔</span>
            </Link>
          </div>
        )}

        {/* Search, Filter & Sort Controls */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Search compost, heirloom seeds, honey, milk..."
                className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-slate-50/70 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition text-slate-800 placeholder-slate-400"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Filters & Sorting */}
            <div className="flex items-center gap-3 justify-between sm:justify-end">
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 transition">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <span>In Stock Only</span>
              </label>

              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="hidden md:inline font-medium">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 focus:outline-none focus:border-emerald-500"
                >
                  <option value="featured">Featured Catalog</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="stock-high">Highest Stock</option>
                </select>
              </div>
            </div>
          </div>

          {/* Bottom Row: Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold tracking-tight whitespace-nowrap transition-all duration-200 ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-md shadow-slate-900/15 scale-[1.02]"
                      : "bg-slate-100/80 text-slate-700 hover:bg-slate-200/80 border border-slate-200/60"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Count Banner */}
        <div className="flex items-center justify-between px-2">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {isLoading ? (
              "Loading offerings..."
            ) : (
              <>
                Showing <span className="text-slate-900 font-black">{products.length}</span> Verified{" "}
                {selectedCategory ? formatCategoryName(selectedCategory) : "Agricultural Inputs"}
              </>
            )}
          </p>
        </div>

        {/* Product Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-88 rounded-3xl bg-slate-100/90 border border-slate-200/60 overflow-hidden flex flex-col justify-between p-5"
              >
                <Skeleton className="w-full h-36 rounded-2xl mb-4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
                <Skeleton className="h-8 w-full mt-4" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon="🌱"
            title="No matching offerings found"
            description="We couldn't find any products matching your search or category filter. Try clearing filters or searching for terms like 'compost', 'tomatoes', or 'seeds'."
            actionText="Reset All Filters"
            onAction={() => {
              setSelectedCategory("");
              setSearchKeyword("");
              setInStockOnly(false);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </div>

      {/* Slide-over cart */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
}
