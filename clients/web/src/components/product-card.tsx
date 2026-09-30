"use client";

import React from "react";
import Link from "next/link";
import type { ProductApiResponse } from "@agroloop/api-types";

export interface CategoryMeta {
  label: string;
  value: string;
  icon: string;
  badgeColor: string;
  gradient: string;
  textColor: string;
  accentBg: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    label: "All Offerings",
    value: "",
    icon: "🌱",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
    gradient: "from-emerald-900/15 via-teal-900/10 to-emerald-950/20",
    textColor: "text-slate-800",
    accentBg: "bg-emerald-50",
  },
  {
    label: "Compost & Living Soil",
    value: "COMPOST_AND_SOIL",
    icon: "🌿",
    badgeColor: "bg-emerald-100/80 text-emerald-900 border-emerald-300/80",
    gradient: "from-emerald-700/20 via-teal-800/15 to-stone-900/25",
    textColor: "text-emerald-900",
    accentBg: "bg-emerald-50",
  },
  {
    label: "Organic Vegetables",
    value: "ORGANIC_VEGETABLES",
    icon: "🥕",
    badgeColor: "bg-lime-100/80 text-lime-900 border-lime-300/80",
    gradient: "from-lime-600/20 via-emerald-700/15 to-green-950/20",
    textColor: "text-lime-950",
    accentBg: "bg-lime-50",
  },
  {
    label: "Orchard Fruits",
    value: "FRESH_FRUITS",
    icon: "🍎",
    badgeColor: "bg-amber-100/80 text-amber-900 border-amber-300/80",
    gradient: "from-amber-600/20 via-orange-600/15 to-rose-950/20",
    textColor: "text-amber-950",
    accentBg: "bg-amber-50",
  },
  {
    label: "Pasture Dairy & Honey",
    value: "FARM_DAIRY",
    icon: "🥛",
    badgeColor: "bg-sky-100/80 text-sky-900 border-sky-300/80",
    gradient: "from-sky-600/20 via-indigo-600/15 to-slate-950/20",
    textColor: "text-sky-950",
    accentBg: "bg-sky-50",
  },
  {
    label: "Seeds & Saplings",
    value: "SEEDS_AND_SAPLINGS",
    icon: "🌾",
    badgeColor: "bg-emerald-100/80 text-teal-950 border-teal-300/80",
    gradient: "from-teal-700/20 via-cyan-800/15 to-emerald-950/20",
    textColor: "text-teal-950",
    accentBg: "bg-teal-50",
  },
  {
    label: "Aromatic Herbs",
    value: "HERBS_AND_SPICES",
    icon: "🪴",
    badgeColor: "bg-purple-100/80 text-purple-950 border-purple-300/80",
    gradient: "from-purple-600/20 via-fuchsia-700/15 to-slate-950/20",
    textColor: "text-purple-950",
    accentBg: "bg-purple-50",
  },
];

export const categoryMetaMap = new Map<string, CategoryMeta>(
  CATEGORIES.map((cat) => [cat.value, cat])
);

export function formatCategoryName(categoryString: string | null | undefined): string {
  if (!categoryString) return "Organic Input";
  const match = categoryMetaMap.get(categoryString);
  if (match && match.value !== "") return match.label;
  return categoryString
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export interface ProductCardProps {
  product: ProductApiResponse;
  onAddToCart?: (product: ProductApiResponse) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const meta = (product.category && categoryMetaMap.get(product.category)) || {
    label: formatCategoryName(product.category),
    value: product.category || "",
    icon: "🌿",
    badgeColor: "bg-slate-100 text-slate-800 border-slate-200",
    gradient: "from-slate-700/20 via-slate-800/15 to-slate-900/25",
    textColor: "text-slate-900",
    accentBg: "bg-slate-50",
  };

  const inStock = (product.stock ?? 0) > 0;
  const isLowStock = inStock && (product.stock ?? 0) <= 15;

  return (
    <div
      key={product.id}
      className="group bg-white rounded-3xl border border-slate-200/90 hover:border-emerald-500/40 shadow-xs hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 flex flex-col justify-between overflow-hidden relative"
    >
      {/* Top Image Showcase Banner */}
      <div className={`relative h-44 w-full bg-gradient-to-br ${meta.gradient} flex items-center justify-center p-4 overflow-hidden border-b border-slate-100`}>
        {/* Background subtle circle ambient */}
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/25 blur-2xl pointer-events-none" />

        {/* Stock Status Pill */}
        <div className="absolute top-3.5 right-3.5 z-10">
          {inStock ? (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-full backdrop-blur-md shadow-xs ${
                isLowStock
                  ? "bg-amber-500/90 text-white border border-amber-400"
                  : "bg-slate-900/80 text-white border border-slate-700/60"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLowStock ? "bg-amber-200 animate-ping" : "bg-emerald-400"
                }`}
              />
              <span>{isLowStock ? `Only ${product.stock} left` : `${product.stock} in stock`}</span>
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded-full bg-rose-600/90 text-white border border-rose-500 backdrop-blur-md">
              Sold Out
            </span>
          )}
        </div>

        {/* Category Label Pill */}
        <div className="absolute top-3.5 left-3.5 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/95 text-slate-800 shadow-xs border border-slate-200/60">
            <span>{meta.icon}</span>
            <span>{formatCategoryName(product.category)}</span>
          </span>
        </div>

        {/* Product Main Visual Artwork / Placeholder */}
        <div className="transform group-hover:scale-110 transition-transform duration-300 flex flex-col items-center justify-center text-center">
          <span className="text-6xl drop-shadow-md select-none">{meta.icon}</span>
          {product.unit && (
            <span className="mt-2 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/80 text-slate-700 border border-slate-200/50 backdrop-blur-xs">
              {product.unit}
            </span>
          )}
        </div>
      </div>

      {/* Body Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <Link href={`/marketplace/${product.id}`} className="block group/title">
            <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover/title:text-emerald-700 transition">
              {product.name}
            </h3>
          </Link>

          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {product.description || "Certified organic soil enhancement and sustainable harvest directly from regional farmers."}
          </p>
        </div>

        {/* Producer & Trust Tag */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-black">
              {product.farmerName?.[0] || "F"}
            </div>
            <div className="leading-tight">
              <p className="text-[11px] font-bold text-slate-800 truncate max-w-[130px]">
                {product.farmerName || "Verified Producer"}
              </p>
              <p className="text-[9px] text-emerald-600 font-semibold">Verified Farm</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="px-5 py-4 bg-slate-50/70 border-t border-slate-100/80 flex items-center justify-between gap-3">
        <div>
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider leading-none">
            Token Price
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-black text-slate-900 tracking-tight">
              {product.price}
            </span>
            <span className="text-[11px] font-bold text-emerald-700">ECO</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/marketplace/${product.id}`}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            Details
          </Link>
          <button
            type="button"
            disabled={!inStock || !product.id}
            onClick={() => onAddToCart && onAddToCart(product)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-bold rounded-xl shadow-xs shadow-emerald-700/20 hover:shadow-md hover:shadow-emerald-700/30 transition-all duration-200 flex items-center gap-1.5 active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}
