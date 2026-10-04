"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { webApiClient } from "@/lib/api";

export default function ApplyFarmerPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [farmName, setFarmName] = useState("");
  const [farmAddress, setFarmAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Existing application query
  const { data: existingApp, isLoading: appLoading, refetch } = useQuery({
    queryKey: ["household-farmer-app"],
    queryFn: () => webApiClient.household.getFarmerApplication(),
    enabled: isAuthenticated && user?.role === "ROLE_HOUSEHOLD",
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      webApiClient.household.submitFarmerApplication({
        farmName: farmName.trim(),
        farmAddress: farmAddress.trim(),
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      setSuccess("Your application has been submitted successfully! An administrator will review your farm details.");
      refetch();
      setTimeout(() => {
        router.push("/household");
      }, 2500);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to submit farmer application.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmName.trim()) {
      setError("Farm or enterprise name is required.");
      return;
    }
    if (!farmAddress.trim()) {
      setError("Farm location address is required.");
      return;
    }
    setError(null);
    submitMutation.mutate();
  };

  if (authLoading || appLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-10 h-10 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500">Checking producer application status...</p>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "ROLE_HOUSEHOLD") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <span className="text-4xl">🌾</span>
        <h2 className="text-2xl font-black text-slate-900">Household Account Required</h2>
        <p className="text-xs text-slate-500">
          Only registered Household participants can apply for conversion to an agricultural producer partner.
        </p>
        <Link
          href="/auth/login"
          className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const isPending = existingApp?.status === "PENDING";
  const isApproved = existingApp?.status === "APPROVED";
  const isRejected = existingApp?.status === "REJECTED";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="space-y-2">
        <Link
          href="/household"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
        >
          <span>← Back to Household Dashboard</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌱</span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Apply to Become a Farmer Partner
          </h1>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Upgrade your platform credentials to become a verified local producer. Once approved by our administration, you can accept organic waste deliveries for composting and list harvested produce directly in the AgroLoop Agricultural Marketplace.
        </p>
      </div>

      {/* Existing Application Status Card */}
      {isPending && (
        <div className="p-6 bg-amber-50 border border-amber-300 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center text-lg font-black">
              ⏳
            </div>
            <div>
              <h3 className="text-sm font-black text-amber-900">
                Application Under Administrative Review
              </h3>
              <p className="text-2xs text-amber-700">
                Submitted on {new Date(existingApp.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="p-4 bg-white/80 rounded-2xl border border-amber-200/60 space-y-2 text-xs">
            <div>
              <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">Submitted Farm Project</span>
              <p className="font-bold text-slate-900">{existingApp.farmName}</p>
            </div>
            <div>
              <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">Physical Location</span>
              <p className="text-slate-700">{existingApp.farmAddress}</p>
            </div>
            {existingApp.notes && (
              <div>
                <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">Operation Statement</span>
                <p className="text-slate-700">{existingApp.notes}</p>
              </div>
            )}
          </div>

          <p className="text-2xs text-amber-800 leading-relaxed">
            Our governance team verifies farm locations and agroecological practices. You will receive notification as soon as verification concludes.
          </p>
        </div>
      )}

      {isApproved && (
        <div className="p-6 bg-emerald-50 border border-emerald-300 rounded-3xl space-y-3 shadow-sm text-center">
          <span className="text-3xl block">🎉</span>
          <h3 className="text-base font-black text-emerald-900">You Are a Verified Farmer Partner!</h3>
          <p className="text-xs text-emerald-700">
            Your application was approved! Please sign in again or access the Farmer Operations Console.
          </p>
          <Link
            href="/farmer"
            className="inline-block px-5 py-2.5 bg-emerald-700 text-white font-bold rounded-xl text-xs hover:bg-emerald-800"
          >
            Open Farmer Portal ➔
          </Link>
        </div>
      )}

      {/* Form (Rendered if no pending application) */}
      {!isPending && !isApproved && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          {isRejected && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-1">
              <span className="font-bold block">Previous Application Not Approved:</span>
              <p>{existingApp?.rejectionReason || "Application did not meet current agricultural partner standards."}</p>
              <p className="text-3xs text-rose-600 mt-1">You may review and resubmit an updated application below.</p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
              ⚠️ {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800">
              ✓ {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                Farm or Enterprise Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Malabar Organic Agroforestry"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
              <span className="text-3xs text-slate-400">The public name under which your produce will be cataloged.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                Farm Physical Address & Coordinates <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Survey No. 104, Meenangadi Organic Belt, Wayanad, Kerala"
                value={farmAddress}
                onChange={(e) => setFarmAddress(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
              <span className="text-3xs text-slate-400">Physical address for organic compost routing and local soil regeneration.</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                Agricultural Statement / Farming Practices
              </label>
              <textarea
                rows={4}
                placeholder="Describe your current crops, soil management practices, composting capacity, or organic certification details."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition resize-none"
              />
            </div>

            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-xs text-emerald-900 space-y-1">
              <span className="font-bold block">🌾 Circular Platform Invariants</span>
              <p className="text-2xs text-emerald-800 leading-relaxed">
                By submitting this application, you agree to inspect and utilize collected organic waste streams responsibly for regenerative soil enrichment and provide transparent pricing in EcoTokens.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition shadow-xs disabled:opacity-50"
              >
                {submitMutation.isPending ? "Submitting Application..." : "Submit Farmer Partner Application"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
