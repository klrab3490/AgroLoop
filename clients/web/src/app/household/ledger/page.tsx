"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { webApiClient } from "@/lib/api";

export default function HouseholdLedgerPage() {
  const { user, isAuthenticated } = useAuth();

  const { data: transactions, isLoading, error } = useQuery({
    queryKey: ["household-ledger"],
    queryFn: () => webApiClient.household.getLedger(),
    enabled: isAuthenticated && user?.role === "ROLE_HOUSEHOLD",
  });

  const { data: balanceData } = useQuery({
    queryKey: ["household-balance"],
    queryFn: () => webApiClient.household.getBalance(),
    enabled: isAuthenticated && user?.role === "ROLE_HOUSEHOLD",
  });

  if (!isAuthenticated || user?.role !== "ROLE_HOUSEHOLD") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-4xl">🔒</p>
        <h2 className="text-2xl font-black text-slate-900">Household Authentication Required</h2>
        <Link href="/auth/login" className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 sm:py-10 space-y-8 min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/household" className="text-xs font-bold text-slate-500 hover:text-emerald-700 inline-flex items-center gap-1 mb-2">
            ← Back to Hub
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">EcoToken Ledger</h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable, audit-verified record of waste rewards, marketplace purchases, and refunds.
          </p>
        </div>

        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm text-right">
          <span className="text-3xs text-slate-400 font-bold uppercase block">Current Balance</span>
          <span className="text-2xl font-black text-emerald-700">{balanceData?.availableBalance ?? 0} Tokens</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-slate-200/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 text-red-700 rounded-2xl text-xs">Failed to load ledger history.</div>
      ) : !transactions || transactions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <p className="text-4xl">📜</p>
          <h3 className="text-base font-bold text-slate-800">No transactions recorded yet</h3>
          <p className="text-xs text-slate-500">
            Submit organic waste to earn your first certified EcoToken rewards.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-400 font-bold uppercase text-3xs tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">ID & Date</th>
                  <th className="py-3.5 px-6">Type & Description</th>
                  <th className="py-3.5 px-6 text-right">Amount</th>
                  <th className="py-3.5 px-6 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {transactions.map((tx) => {
                  const isCredit = tx.direction === "CREDIT" || (tx.amount ?? 0) > 0;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-4 px-6">
                        <span className="font-mono font-bold text-slate-900 block">#{tx.id}</span>
                        <span className="text-3xs text-slate-400">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : "—"}
                        </span>
                      </td>
                      <td className="py-4 px-6 space-y-0.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-3xs font-bold ${
                            tx.transactionType === "REWARD_MINTED"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : tx.transactionType === "MARKETPLACE_PURCHASE"
                              ? "bg-purple-50 text-purple-800 border border-purple-200"
                              : tx.transactionType === "ORDER_REFUND"
                              ? "bg-blue-50 text-blue-800 border border-blue-200"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          {tx.transactionType}
                        </span>
                        {tx.description && (
                          <p className="text-3xs text-slate-500 line-clamp-1">{tx.description}</p>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right font-black text-sm">
                        <span className={isCredit ? "text-emerald-700" : "text-red-600"}>
                          {isCredit ? "+" : "-"}{Math.abs(tx.amount ?? 0)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-mono font-semibold text-slate-900">
                        {tx.balanceAfter} Tokens
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
