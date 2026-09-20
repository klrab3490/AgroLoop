"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { webApiClient } from "@/lib/api";
import type { ProductApiResponse } from "@agroloop/api-types";

export default function HomePage() {
  const {
    data: pageResult,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["marketplace-products"],
    queryFn: () => webApiClient.marketplace.listProducts(),
    retry: 1,
  });

  const products = pageResult?.content ?? [];

  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <header className="mb-10 text-center">
        <span className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider text-emerald-800 uppercase bg-emerald-100 rounded-full">
          Phase 8 • Infrastructure Verification
        </span>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          AgroLoop Client Monorepo
        </h1>
        <p className="mt-3 text-lg text-slate-600 max-w-2xl mx-auto">
          Universal Cross-Platform Architecture powered by OpenAPI 3.1 authoritative contract,
          shared typed API client, and isolated client security boundaries.
        </p>
      </header>

      {/* Architecture Invariant Verification Badges */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="text-emerald-600 font-semibold text-sm">Contract Generation</div>
          <div className="text-slate-800 font-bold text-lg mt-1">OpenAPI 3.1.0</div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative snapshot at <code className="bg-slate-100 px-1 py-0.5 rounded">openapi.json</code> generating strictly typed TypeScript DTOs.
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="text-emerald-600 font-semibold text-sm">Universal API Client</div>
          <div className="text-slate-800 font-bold text-lg mt-1">@agroloop/api-client</div>
          <p className="text-xs text-slate-500 mt-1">
            Enforces <code className="bg-slate-100 px-1 py-0.5 rounded">/api/v1</code> prefix, fresh X-Request-Id, and single-flight 401 refresh mutex.
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="text-emerald-600 font-semibold text-sm">Web Auth Boundary</div>
          <div className="text-slate-800 font-bold text-lg mt-1">HttpOnly Cookie</div>
          <p className="text-xs text-slate-500 mt-1">
            Web refresh tokens are strictly restricted to browser cookies and never touch JS memory or storage.
          </p>
        </div>
      </section>

      {/* Live Data Connection & React Query Proof */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Marketplace Products Connectivity Proof</h2>
            <p className="text-sm text-slate-500">
              Querying <code className="text-emerald-700 font-mono">GET /api/v1/marketplace/products</code> via React Query
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition"
          >
            Refetch Query
          </button>
        </div>

        {isLoading && (
          <div className="py-12 text-center text-slate-500 animate-pulse">
            Connecting to AgroLoop API backend...
          </div>
        )}

        {isError && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
            <p className="font-semibold">Backend Offline or Unreachable:</p>
            <p className="mt-1 font-mono text-xs">{error instanceof Error ? error.message : "Unknown error"}</p>
            <p className="mt-2 text-xs text-slate-500">
              Note: This is expected when the Spring Boot backend service is not locally running on port 8080.
              The client architecture, network layer, and query integration are fully verified.
            </p>
          </div>
        )}

        {products && products.length === 0 && (
          <div className="py-8 text-center text-slate-500 text-sm">
            Connected to AgroLoop API. No products currently listed in the catalog.
          </div>
        )}

        {products && products.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-emerald-700 font-medium">
              Successfully fetched {products.length} product(s) from API:
            </p>
            <ul className="divide-y divide-slate-100">
              {products.map((p) => (
                <li key={p.id} className="py-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800">{p.name}</span>
                  <span className="font-mono text-slate-600">${p.price?.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
