"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { webApiClient } from "@/lib/api";
import type { ProductApiResponse } from "@agroloop/api-types";

export default function FarmerProductsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"COMPOST_AND_SOIL" | "ORGANIC_VEGETABLES" | "FRESH_FRUITS" | "FARM_DAIRY" | "SEEDS_AND_SAPLINGS" | "HERBS_AND_SPICES">("COMPOST_AND_SOIL");
  const [unit, setUnit] = useState("kg");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("25");
  const [stock, setStock] = useState("50");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: products, isLoading, error } = useQuery<ProductApiResponse[]>({
    queryKey: ["farmer-products"],
    queryFn: () => webApiClient.farmer.getProducts(),
    enabled: isAuthenticated && user?.role === "ROLE_FARMER",
  });

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError(null);

    try {
      await webApiClient.farmer.createProduct({
        name: name.trim(),
        category,
        description: description.trim(),
        price: parseInt(price, 10),
        stock: parseInt(stock, 10),
        unit: unit.trim() || "kg",
      });

      await queryClient.invalidateQueries({ queryKey: ["farmer-products"] });
      setCreateModalOpen(false);
      setName("");
      setDescription("");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to create product listing");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 sm:py-10 space-y-8 min-h-[calc(100vh-4rem)]">
        <div className="h-6 w-32 rounded-xl bg-slate-200/60 animate-pulse" />
        <div className="h-16 rounded-2xl bg-slate-200/60 animate-pulse" />
        <div className="space-y-4">
          <div className="h-28 rounded-3xl bg-slate-200/50 animate-pulse" />
          <div className="h-28 rounded-3xl bg-slate-200/50 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "ROLE_FARMER") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-4xl">🔒</p>
        <h2 className="text-2xl font-black text-slate-900">Farmer Authentication Required</h2>
        <p className="text-xs text-slate-500">Sign in with an approved Farmer account to manage product listings.</p>
        <Link href="/auth/login?redirect=/farmer/products" className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 sm:py-10 space-y-8 min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/farmer" className="text-xs font-bold text-slate-500 hover:text-emerald-700 inline-flex items-center gap-1 mb-2">
            ← Back to Hub
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Product Catalog Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            List and manage organic compost, biological fertilizer, and seeds for household redemption.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm self-start"
        >
          + List New Product
        </button>
      </div>

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl">
          {actionError}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-200/60 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 text-red-700 rounded-2xl text-xs">Failed to load product catalog.</div>
      ) : !products || products.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <p className="text-4xl">🌱</p>
          <h3 className="text-base font-bold text-slate-800">No products listed yet</h3>
          <p className="text-xs text-slate-500">
            List your first batch of compost or fertilizer to start accepting EcoTokens.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-3xs tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-6">Product</th>
                <th className="py-3.5 px-6">Category</th>
                <th className="py-3.5 px-6 text-right">Price</th>
                <th className="py-3.5 px-6 text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-4 px-6 font-bold text-slate-900">{p.name}</td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-3xs font-bold border border-emerald-200">
                      {p.category}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right font-black text-emerald-700 text-sm">
                    {p.price} Tokens
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-slate-900">
                    {p.stock ?? 0} {p.unit || "units"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* List New Product Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl max-w-lg lg:max-w-xl w-full space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-lg text-slate-900">List New Product</h3>
            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Organic Vermicompost 5kg"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="COMPOST_AND_SOIL">Compost & Soil</option>
                    <option value="ORGANIC_VEGETABLES">Organic Vegetables</option>
                    <option value="FRESH_FRUITS">Fresh Fruits</option>
                    <option value="FARM_DAIRY">Farm Dairy</option>
                    <option value="SEEDS_AND_SAPLINGS">Seeds & Saplings</option>
                    <option value="HERBS_AND_SPICES">Herbs & Spices</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. kg, bag, bundle"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Nutrient composition, usage guidelines..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Price (Tokens)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Stock Available</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 disabled:bg-slate-300"
                >
                  {isSubmitting ? "Publishing..." : "Publish Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
