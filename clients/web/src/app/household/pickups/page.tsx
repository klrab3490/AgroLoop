"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { webApiClient } from "@/lib/api";
import { QrCodeView } from "@/components/qr-code-view";
import type { PickupRequestApiResponse } from "@agroloop/api-types";

interface HandshakePassData {
  pickupId: number;
  qrPayload: string;
  passCode: string;
  expiresAt?: number;
}

export default function HouseholdPickupsPage() {
  const { user, isAuthenticated } = useAuth();
  const [selectedPass, setSelectedPass] = useState<HandshakePassData | null>(null);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  const { data: pickups, isLoading, error } = useQuery<PickupRequestApiResponse[]>({
    queryKey: ["household-pickups"],
    queryFn: () => webApiClient.pickups.listPickups(),
    enabled: isAuthenticated && user?.role === "ROLE_HOUSEHOLD",
  });

  const handleRequestPass = async (pickupId: number) => {
    setPassLoading(true);
    setPassError(null);
    try {
      // Calls BFF proxy /api/proxy/pickups/{id}/handshake/pass -> backend issues signed pass
      const res = await webApiClient.pickups.generateHandshakePass(pickupId);
      setSelectedPass({
        pickupId,
        qrPayload: JSON.stringify(res.compactQr ?? res),
        passCode: res.passCode ?? "",
        expiresAt: res.expiresAt,
      });
    } catch (err: unknown) {
      setPassError(err instanceof Error ? err.message : "Failed to generate handshake pass");
    } finally {
      setPassLoading(false);
    }
  };

  if (!isAuthenticated || user?.role !== "ROLE_HOUSEHOLD") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-4xl">🔒</p>
        <h2 className="text-2xl font-black text-slate-900">Household Portal</h2>
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Pickup Tracker & QR Passes</h1>
          <p className="text-xs text-slate-500 mt-1">
            Present your authenticated QR pass to arriving farmers to verify collection and unlock token rewards.
          </p>
        </div>

        <Link
          href="/household/submit"
          className="px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm self-start"
        >
          + New Submission
        </Link>
      </div>

      {passError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl">
          {passError}
        </div>
      )}

      {/* Pickups List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-200/60 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 text-red-700 rounded-2xl text-xs">Failed to load pickup requests.</div>
      ) : !pickups || pickups.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <p className="text-4xl">📦</p>
          <h3 className="text-base font-bold text-slate-800">No pickups active</h3>
          <p className="text-xs text-slate-500">Log organic waste to schedule your first doorstep pickup.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pickups.map((pickup) => {
            const isCompleted = pickup.status === "VERIFIED";
            const canRequestPass = pickup.id != null && pickup.status !== "VERIFIED" && pickup.status !== "CANCELLED";

            return (
              <div
                key={pickup.id}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">Pickup #{pickup.id}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-3xs font-bold ${
                        pickup.status === "VERIFIED"
                          ? "bg-emerald-100 text-emerald-800"
                          : pickup.status === "COLLECTED"
                          ? "bg-blue-100 text-blue-800"
                          : pickup.status === "SCHEDULED"
                          ? "bg-amber-100 text-amber-800"
                          : pickup.status === "CLAIMED"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {pickup.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-2xs uppercase">Submission Ref</span>
                      <span className="font-semibold text-slate-800">#{pickup.wasteSubmissionId ?? "—"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-2xs uppercase">Scheduled For</span>
                      <span className="font-semibold text-slate-800">
                        {pickup.scheduledTime ? new Date(pickup.scheduledTime).toLocaleDateString() : "Pending"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-2xs uppercase">Created</span>
                      <span className="font-semibold text-slate-800">
                        {pickup.createdAt ? new Date(pickup.createdAt).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 truncate max-w-lg">📍 {pickup.pickupAddress || "Registered Address"}</p>
                </div>

                {/* QR Pass Action */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0">
                  {canRequestPass && (
                    <button
                      onClick={() => handleRequestPass(pickup.id!)}
                      disabled={passLoading}
                      className="px-4 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 disabled:bg-slate-300 transition flex items-center gap-2 shadow-sm shadow-emerald-200"
                    >
                      <span>📲</span> View QR Pickup Pass
                    </button>
                  )}
                  {isCompleted && (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      ✓ Verified & Tokens Minted
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dynamic Handshake QR Modal */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white p-5 sm:p-8 rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto space-y-5 sm:space-y-6 text-center border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-2xs font-bold uppercase tracking-wider">
                Server-Authoritative Handshake
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-2">Pickup Verification Pass</h3>
              <p className="text-xs text-slate-500 mt-1">
                Show this QR pass or read the passcode aloud to the arriving farmer.
              </p>
            </div>

            {/* QR SVG Display */}
            <div className="flex justify-center">
              <QrCodeView value={selectedPass.qrPayload} size={200} />
            </div>

            {/* Human-Readable Code */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-2xs text-slate-400 font-bold uppercase tracking-widest">
                Manual Passcode Fallback
              </span>
              <p className="text-2xl font-mono font-black text-slate-900 tracking-wider">
                {selectedPass.passCode}
              </p>
            </div>

            <p className="text-3xs text-slate-400 leading-tight">
              HMAC-SHA256 authenticated. Contains zero personal info. Expires:{" "}
              {selectedPass.expiresAt ? new Date(selectedPass.expiresAt).toLocaleTimeString() : "—"}
            </p>

            <button
              onClick={() => setSelectedPass(null)}
              className="w-full py-2.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
