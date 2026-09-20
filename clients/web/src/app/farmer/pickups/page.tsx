"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { webApiClient } from "@/lib/api";
import type { PickupRequestApiResponse } from "@agroloop/api-types";

export default function FarmerPickupsPage() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [targetPickupId, setTargetPickupId] = useState<number | null>(null);
  const [verifiedWeight, setVerifiedWeight] = useState("5.0");
  const [qualityGrade, setQualityGrade] = useState<"GRADE_A" | "GRADE_B" | "GRADE_C">("GRADE_A");
  const [passcode, setPasscode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: availablePickups, isLoading, error } = useQuery<PickupRequestApiResponse[]>({
    queryKey: ["farmer-available-pickups"],
    queryFn: () => webApiClient.farmer.getAvailablePickups(),
    enabled: isAuthenticated && user?.role === "ROLE_FARMER",
  });

  const handleClaim = async (id: number) => {
    setActionError(null);
    try {
      await webApiClient.farmer.claimPickup(id);
      await queryClient.invalidateQueries({ queryKey: ["farmer-available-pickups"] });
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to claim pickup request");
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPickupId) return;

    setIsVerifying(true);
    setActionError(null);

    try {
      // 1. Consume handshake passcode via BFF proxy
      await webApiClient.pickups.verifyHandshake(targetPickupId, {
        method: "MANUAL_PASSCODE",
        passCode: passcode.trim(),
      });

      // 2. Complete certified verification and mint tokens
      await webApiClient.farmer.verifyPickup(targetPickupId, {
        verifiedWeight: parseFloat(verifiedWeight),
        qualityGrade,
        notes: "Doorstep weigh-in verified via web operations portal",
      });

      await queryClient.invalidateQueries({ queryKey: ["farmer-available-pickups"] });
      setVerifyModalOpen(false);
      setTargetPickupId(null);
      setPasscode("");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Verification failed. Check passcode & attempt limit.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isAuthenticated || user?.role !== "ROLE_FARMER") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-4xl">🚜</p>
        <h2 className="text-2xl font-black text-slate-900">Farmer Portal</h2>
        <Link href="/auth/login" className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <Link href="/farmer" className="text-xs font-bold text-slate-500 hover:text-emerald-700 inline-flex items-center gap-1 mb-2">
          ← Back to Hub
        </Link>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pickup Claims & Verification</h1>
        <p className="text-xs text-slate-500 mt-1">
          Claim regional compost submissions and perform certified weigh-ins with household QR passcodes.
        </p>
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
        <div className="p-6 bg-red-50 text-red-700 rounded-2xl text-xs">Failed to load available pickups.</div>
      ) : !availablePickups || availablePickups.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <p className="text-4xl">🌾</p>
          <h3 className="text-base font-bold text-slate-800">No pickups currently queued</h3>
          <p className="text-xs text-slate-500">
            Check back soon for new household organic waste submissions in your area.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {availablePickups.map((pickup) => (
            <div
              key={pickup.id}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-emerald-300 transition"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">Pickup #{pickup.id}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-3xs font-bold bg-amber-100 text-amber-800">
                    {pickup.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Submission Ref: #{pickup.wasteSubmissionId ?? "—"} • Address: {pickup.pickupAddress || "Registered Address"}
                </p>
                {pickup.createdAt && (
                  <p className="text-3xs text-slate-400">
                    Queued on {new Date(pickup.createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {pickup.id != null && (
                  <>
                    <button
                      onClick={() => handleClaim(pickup.id!)}
                      className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition"
                    >
                      Claim Route
                    </button>
                    <button
                      onClick={() => {
                        setTargetPickupId(pickup.id!);
                        setVerifyModalOpen(true);
                      }}
                      className="px-4 py-2 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition"
                    >
                      Verify On-Site
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* On-Site Verification Modal */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-lg text-slate-900">On-Site Handshake & Weigh-In</h3>
            <p className="text-xs text-slate-500">
              Enter certified weight, grade, and household&apos;s 10-character passcode (e.g. ECO-XXXX-XXXX).
            </p>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Household Passcode</label>
                <input
                  type="text"
                  required
                  placeholder="ECO-1234-5678"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                  className="w-full p-2.5 font-mono text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Certified Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={verifiedWeight}
                  onChange={(e) => setVerifiedWeight(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quality Grade</label>
                <select
                  value={qualityGrade}
                  onChange={(e) => setQualityGrade(e.target.value as "GRADE_A" | "GRADE_B" | "GRADE_C")}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="GRADE_A">Grade A (Premium Organic / No Contaminants)</option>
                  <option value="GRADE_B">Grade B (Standard Organic Waste)</option>
                  <option value="GRADE_C">Grade C (Mixed Organic / Minor Inert Matter)</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVerifying}
                  className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 disabled:bg-slate-300"
                >
                  {isVerifying ? "Verifying..." : "Confirm & Mint Tokens"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
