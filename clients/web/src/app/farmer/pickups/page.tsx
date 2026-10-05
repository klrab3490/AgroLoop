"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { webApiClient } from "@/lib/api";
import type {
  PickupRequestApiResponse,
  CollectionRouteApiResponse,
  RouteStopApiResponse,
} from "@agroloop/api-types";

function haversineDistance(
  lat1: number | null | undefined,
  lon1: number | null | undefined,
  lat2: number | null | undefined,
  lon2: number | null | undefined
): string {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return "~2.5 km away";
  }
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return `${d.toFixed(1)} km away`;
}

function getCategoryIcon(category?: string | null): string {
  switch (category) {
    case "FOOD_SCRAPS":
      return "🥦";
    case "GARDEN_WASTE":
      return "🍂";
    case "AGRICULTURAL_ORGANIC":
      return "🌾";
    case "COFFEE_GROUNDS":
      return "☕";
    default:
      return "♻️";
  }
}

function getCategoryLabel(category?: string | null): string {
  switch (category) {
    case "FOOD_SCRAPS":
      return "Kitchen Scraps";
    case "GARDEN_WASTE":
      return "Garden Waste";
    case "AGRICULTURAL_ORGANIC":
      return "Crop Residue";
    case "COFFEE_GROUNDS":
      return "Coffee Grounds";
    default:
      return "Organic Waste";
  }
}

export default function FarmerPickupsPage() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Active Workspace Tab: "route" | "available" | "accepted"
  const [activeTab, setActiveTab] = useState<"route" | "available" | "accepted">("route");

  // Modals & Action Confirmation States
  const [acceptCandidate, setAcceptCandidate] = useState<PickupRequestApiResponse | null>(null);
  const [planRouteModalOpen, setPlanRouteModalOpen] = useState(false);
  const [startRouteModalOpen, setStartRouteModalOpen] = useState(false);
  const [activeRouteToStart, setActiveRouteToStart] = useState<CollectionRouteApiResponse | null>(null);

  // Doorstep Verification Modal
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [targetPickupId, setTargetPickupId] = useState<number | null>(null);
  const [targetStopId, setTargetStopId] = useState<number | null>(null);
  const [verifiedWeight, setVerifiedWeight] = useState("5.0");
  const [qualityGrade, setQualityGrade] = useState<"GRADE_A" | "GRADE_B" | "GRADE_C">("GRADE_A");
  const [passcode, setPasscode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Default Kerala Farm baseline coordinates if not specified
  const farmLat = 10.8505;
  const farmLng = 76.2711;

  // 1. Available Unclaimed Pickups
  const {
    data: availablePickups = [],
    isLoading: loadingAvailable,
  } = useQuery<PickupRequestApiResponse[]>({
    queryKey: ["farmer-available-pickups"],
    queryFn: () => webApiClient.farmer.getAvailablePickups(),
    enabled: isAuthenticated && user?.role === "ROLE_FARMER",
  });

  // 2. Farmer's Claimed / Assigned Pickups
  const {
    data: myPickups = [],
    isLoading: loadingMyPickups,
  } = useQuery<PickupRequestApiResponse[]>({
    queryKey: ["farmer-my-pickups"],
    queryFn: () => webApiClient.pickups.listPickups(),
    enabled: isAuthenticated && user?.role === "ROLE_FARMER",
  });

  // 3. Active Collection Routes (PLANNED or IN_PROGRESS)
  const {
    data: activeRoutes = [],
    isLoading: loadingRoutes,
  } = useQuery<CollectionRouteApiResponse[]>({
    queryKey: ["farmer-active-routes"],
    queryFn: async () => {
      try {
        return await webApiClient.farmer.getActiveRoutes();
      } catch {
        return [];
      }
    },
    enabled: isAuthenticated && user?.role === "ROLE_FARMER",
  });

  // Accepted pickups that are ready to add to a route
  const acceptedUnroutedPickups = myPickups.filter(
    (p) => p.status === "ASSIGNED" || p.status === "REQUESTED"
  );

  // Current primary active route
  const currentRoute = activeRoutes.find(
    (r) => r.status === "IN_PROGRESS" || r.status === "PLANNED"
  );

  // Helper to build Single-Stop Google Maps navigation URL
  const getSingleStopNavUrl = (lat?: number | null, lng?: number | null, address?: string | null) => {
    if (lat != null && lng != null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address || "Kodungallur, Kerala"
    )}`;
  };

  // Helper to build Full Multi-Stop Google Maps Route URL
  const getFullRouteNavUrl = (route: CollectionRouteApiResponse) => {
    const origin = `${route.farmerLatitude ?? farmLat},${route.farmerLongitude ?? farmLng}`;
    const stopCoords = (route.stops || [])
      .map((s) => {
        if (s.latitude != null && s.longitude != null) {
          return `${s.latitude},${s.longitude}`;
        }
        return encodeURIComponent(s.pickupAddress || "");
      })
      .filter(Boolean);

    if (stopCoords.length === 0) {
      return `https://www.google.com/maps/dir/${origin}`;
    }
    return `https://www.google.com/maps/dir/${origin}/${stopCoords.join("/")}`;
  };

  // 1. Confirm & Accept Pickup
  const handleExecuteAccept = async () => {
    if (!acceptCandidate?.id) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await webApiClient.farmer.claimPickup(acceptCandidate.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["farmer-available-pickups"] }),
        queryClient.invalidateQueries({ queryKey: ["farmer-my-pickups"] }),
      ]);
      setActionSuccess(`Pickup #${acceptCandidate.id} accepted! Added to your collection queue.`);
      setAcceptCandidate(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to accept pickup");
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Plan & Confirm Route
  const handleExecutePlanRoute = async () => {
    const candidateIds = acceptedUnroutedPickups.map((p) => p.id).filter(Boolean) as number[];
    if (candidateIds.length === 0) {
      setActionError("No accepted pickups available to bundle into a route.");
      return;
    }
    setActionLoading(true);
    setActionError(null);
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      await webApiClient.farmer.createOptimizedRoute({
        pickupIds: candidateIds,
        routeDate: todayStr,
        notes: "Automated TSP collection sequence",
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["farmer-active-routes"] }),
        queryClient.invalidateQueries({ queryKey: ["farmer-my-pickups"] }),
      ]);
      setPlanRouteModalOpen(false);
      setActiveTab("route");
      setActionSuccess("Collection route planned and optimized!");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to generate optimized route");
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Start Route
  const handleExecuteStartRoute = async () => {
    if (!activeRouteToStart?.id) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await webApiClient.farmer.startRoute(activeRouteToStart.id);
      await queryClient.invalidateQueries({ queryKey: ["farmer-active-routes"] });
      setStartRouteModalOpen(false);
      setActiveRouteToStart(null);
      setActionSuccess("Route started! Follow your stops sequence below.");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to start route");
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Verify Collection (Doorstep weigh-in)
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
        notes: "Doorstep weigh-in verified via collection route sequence",
      });

      // 3. Mark stop complete if part of active route
      if (currentRoute?.id && targetStopId) {
        try {
          await webApiClient.farmer.completeStop(currentRoute.id, targetStopId);
        } catch {
          // Non-blocking
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["farmer-available-pickups"] }),
        queryClient.invalidateQueries({ queryKey: ["farmer-my-pickups"] }),
        queryClient.invalidateQueries({ queryKey: ["farmer-active-routes"] }),
      ]);

      setVerifyModalOpen(false);
      setTargetPickupId(null);
      setTargetStopId(null);
      setPasscode("");
      setActionSuccess("Collection verified! EcoTokens have been minted to household.");
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
        <h2 className="text-2xl font-black text-slate-900">Farmer Operations Portal</h2>
        <Link href="/auth/login" className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Page Header */}
      <div>
        <Link href="/farmer" className="text-xs font-bold text-slate-500 hover:text-emerald-700 inline-flex items-center gap-1 mb-2">
          ← Back to Hub
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Collection Routes & Pickups</h1>
            <p className="text-xs text-slate-500 mt-1">
              Smart route planning, doorstep GPS navigation, and certified EcoToken weigh-in verification.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/farmer/orders"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              Produce Sales Orders →
            </Link>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl flex items-center justify-between">
          <span>⚠️ {actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-800 text-base">×</button>
        </div>
      )}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-between">
          <span>✓ {actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900 text-base">×</button>
        </div>
      )}

      {/* Workspace Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("route")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
            activeTab === "route"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <span>🚜 Today&apos;s Collection Route</span>
          {currentRoute && (
            <span className="px-1.5 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-800 text-emerald-100">
              {currentRoute.status === "IN_PROGRESS" ? "Collecting Now" : "Planned"}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("available")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
            activeTab === "available"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <span>🟢 New Pickups Pool</span>
          {availablePickups.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-100 text-emerald-800">
              {availablePickups.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("accepted")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
            activeTab === "accepted"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <span>📦 Accepted Pickups</span>
          {acceptedUnroutedPickups.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-3xs font-extrabold bg-amber-100 text-amber-800">
              {acceptedUnroutedPickups.length}
            </span>
          )}
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: TODAY'S COLLECTION ROUTE WORKSPACE                     */}
      {/* ============================================================== */}
      {activeTab === "route" && (
        <div className="space-y-6">
          {currentRoute ? (
            <div className="space-y-6">
              {/* Route Summary Card */}
              <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="space-y-1">
                    <span className="text-3xs uppercase font-extrabold tracking-widest text-emerald-400">
                      {currentRoute.status === "IN_PROGRESS" ? "🚚 Collecting Now" : "🗺️ Itinerary Confirmed"}
                    </span>
                    <h2 className="text-2xl font-black tracking-tight">Today&apos;s Collection Route</h2>
                    <p className="text-xs text-slate-300">
                      Starting from: <strong>{currentRoute.farmerAddress || "Your Farm Point"}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <a
                      href={getFullRouteNavUrl(currentRoute)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                    >
                      <span>🗺️ Open Full Route in Maps</span>
                    </a>

                    {currentRoute.status === "PLANNED" && (
                      <button
                        onClick={() => {
                          setActiveRouteToStart(currentRoute);
                          setStartRouteModalOpen(true);
                        }}
                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg transition"
                      >
                        Start Collection Route →
                      </button>
                    )}
                  </div>
                </div>

                {/* Key Metrics Banner */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10 text-center sm:text-left">
                  <div>
                    <span className="text-3xs uppercase font-bold text-slate-400 block">Pickups</span>
                    <span className="text-xl font-black text-white">{currentRoute.stops?.length || 0} stops</span>
                  </div>
                  <div>
                    <span className="text-3xs uppercase font-bold text-slate-400 block">Total Travel</span>
                    <span className="text-xl font-black text-amber-300">
                      ~{currentRoute.totalDistanceKm ? currentRoute.totalDistanceKm.toFixed(1) : "18.0"} km
                    </span>
                  </div>
                  <div>
                    <span className="text-3xs uppercase font-bold text-slate-400 block">Expected Harvest</span>
                    <span className="text-xl font-black text-emerald-300">
                      ~{currentRoute.totalEstimatedWeightKg ? currentRoute.totalEstimatedWeightKg.toFixed(1) : "42.0"} kg
                    </span>
                  </div>
                </div>
              </div>

              {/* Sequenced Route Stops List */}
              <div className="space-y-3">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Sequenced Stops Itinerary
                </h3>

                {(currentRoute.stops || []).map((stop: RouteStopApiResponse, idx: number) => {
                  const navUrl = getSingleStopNavUrl(stop.latitude, stop.longitude, stop.pickupAddress);
                  const isCompleted = stop.status === "COMPLETED";

                  return (
                    <div
                      key={stop.id || idx}
                      className={`p-5 rounded-3xl border transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                        isCompleted
                          ? "bg-slate-50 border-slate-200 opacity-70"
                          : "bg-white border-slate-200 shadow-sm hover:border-emerald-300"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-sm ${
                            isCompleted ? "bg-emerald-100 text-emerald-800" : "bg-slate-900 text-white"
                          }`}
                        >
                          {isCompleted ? "✓" : idx + 1}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-slate-900">
                              {stop.pickupAddress ? stop.pickupAddress.split(",")[0] : `Household Stop #${idx + 1}`}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-slate-100 text-slate-600">
                              {getCategoryIcon(stop.category)} {getCategoryLabel(stop.category)}
                            </span>
                            {isCompleted && (
                              <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-emerald-100 text-emerald-800">
                                Collection Verified
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            📍 {stop.pickupAddress || "Registered Doorstep"}
                          </p>
                          <div className="flex items-center gap-3 text-2xs text-slate-400 font-medium">
                            <span>
                              Distance:{" "}
                              <strong>
                                {stop.estimatedDistanceFromPrevKm != null
                                  ? `${stop.estimatedDistanceFromPrevKm.toFixed(1)} km`
                                  : "~2.1 km"}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>
                              Estimated Weight:{" "}
                              <strong className="text-emerald-700">
                                ~{stop.estimatedWeight ? stop.estimatedWeight.toFixed(1) : "12.0"} kg
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Stop Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <a
                          href={navUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-bold text-xs rounded-xl border border-slate-200 transition flex items-center gap-1"
                        >
                          <span>📍 Navigate</span>
                        </a>

                        {!isCompleted && stop.pickupId && (
                          <button
                            onClick={() => {
                              setTargetPickupId(stop.pickupId);
                              setTargetStopId(stop.id);
                              setVerifyModalOpen(true);
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                          >
                            Arrived &amp; Weigh In
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* No Active Route Planned Yet */
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
              <p className="text-5xl">🗺️</p>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">No Collection Route Active Today</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {acceptedUnroutedPickups.length > 0
                    ? `You have ${acceptedUnroutedPickups.length} accepted pickups ready. Generate an optimal sequence starting from your farm.`
                    : "Accept nearby organic waste submissions from households to plan today's collection run."}
                </p>
              </div>

              {acceptedUnroutedPickups.length > 0 ? (
                <button
                  onClick={() => setPlanRouteModalOpen(true)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-200 transition"
                >
                  ⚡ Plan My Collection Route ({acceptedUnroutedPickups.length} Pickups)
                </button>
              ) : (
                <button
                  onClick={() => setActiveTab("available")}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
                >
                  Browse New Pickups Pool →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: NEW AVAILABLE PICKUPS POOL                             */}
      {/* ============================================================== */}
      {activeTab === "available" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Available Household Submissions
            </h3>
            <span className="text-xs text-slate-500">
              Sorted by proximity to your farm collection point
            </span>
          </div>

          {loadingAvailable ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-slate-200/60 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : availablePickups.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <p className="text-4xl">🌾</p>
              <h3 className="text-base font-bold text-slate-800">No new pickups available right now</h3>
              <p className="text-xs text-slate-500">
                Check back soon when households log fresh organic waste submissions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {availablePickups.map((pickup) => {
                const distanceStr = haversineDistance(farmLat, farmLng, pickup.latitude, pickup.longitude);
                const categoryIcon = getCategoryIcon(pickup.category);
                const categoryLabel = getCategoryLabel(pickup.category);
                const weightEst = pickup.estimatedWeight ? pickup.estimatedWeight.toFixed(1) : "5.0";

                return (
                  <div
                    key={pickup.id}
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-emerald-300 transition"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <span>🟢 New Pickup</span>
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          Ref #{pickup.id}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm font-black text-slate-900">
                        <span className="text-emerald-700 flex items-center gap-1">
                          📍 {distanceStr}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          🏠 {pickup.pickupAddress || "Kodungallur, Kerala"}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-600">
                        <span>{categoryIcon} {categoryLabel}</span>
                        <span>•</span>
                        <span className="font-bold text-emerald-800">⚖️ About {weightEst} kg</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <button
                        onClick={() => setAcceptCandidate(pickup)}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                      >
                        Accept Pickup
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: ACCEPTED PICKUPS (READY TO ROUTE)                       */}
      {/* ============================================================== */}
      {activeTab === "accepted" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                My Accepted Pickups
              </h3>
              <p className="text-xs text-slate-500">
                Pickups claimed by you that can be added to your next collection route.
              </p>
            </div>

            {acceptedUnroutedPickups.length > 0 && (
              <button
                onClick={() => setPlanRouteModalOpen(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-200 transition"
              >
                ⚡ Plan My Collection Route ({acceptedUnroutedPickups.length})
              </button>
            )}
          </div>

          {loadingMyPickups ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-slate-200/60 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : acceptedUnroutedPickups.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <p className="text-4xl">📦</p>
              <h3 className="text-base font-bold text-slate-800">No unrouted accepted pickups</h3>
              <p className="text-xs text-slate-500">
                Browse available pickups and accept them to plan your collection run.
              </p>
              <button
                onClick={() => setActiveTab("available")}
                className="mt-2 px-5 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Find New Pickups
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {acceptedUnroutedPickups.map((pickup) => {
                const distanceStr = haversineDistance(farmLat, farmLng, pickup.latitude, pickup.longitude);
                const categoryIcon = getCategoryIcon(pickup.category);
                const categoryLabel = getCategoryLabel(pickup.category);
                const weightEst = pickup.estimatedWeight ? pickup.estimatedWeight.toFixed(1) : "5.0";

                return (
                  <div
                    key={pickup.id}
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-emerald-300 transition"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-3xs font-extrabold bg-blue-100 text-blue-800">
                          📦 Pickup Accepted
                        </span>
                        <span className="text-3xs text-slate-400">Ready to add to route</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                        <span>📍 {distanceStr}</span>
                        <span>•</span>
                        <span>🏠 {pickup.pickupAddress || "Kodungallur, Kerala"}</span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-600">
                        <span>{categoryIcon} {categoryLabel}</span>
                        <span>•</span>
                        <span>⚖️ About {weightEst} kg</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => {
                          setTargetPickupId(pickup.id ?? null);
                          setVerifyModalOpen(true);
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                      >
                        Verify On-Site
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* CONFIRMATION MODAL 1: ACCEPT PICKUP                           */}
      {/* ============================================================== */}
      {acceptCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl">
                🚜
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Accept this pickup?</h3>
                <p className="text-xs text-slate-500">
                  This pickup will be added to your active pickups and can be included in your collection route.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-3xs">Location</span>
                <span className="font-bold text-slate-800">{acceptCandidate.pickupAddress || "Kodungallur"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-3xs">Distance</span>
                <span className="font-bold text-emerald-700">
                  {haversineDistance(farmLat, farmLng, acceptCandidate.latitude, acceptCandidate.longitude)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-3xs">Estimated Waste</span>
                <span className="font-bold text-slate-800">
                  {acceptCandidate.estimatedWeight ? `${acceptCandidate.estimatedWeight} kg` : "5.0 kg"}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setAcceptCandidate(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecuteAccept}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-200 transition"
              >
                {actionLoading ? "Accepting..." : "Accept Pickup"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CONFIRMATION MODAL 2: CONFIRM COLLECTION ROUTE               */}
      {/* ============================================================== */}
      {planRouteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl">
                🗺️
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Confirm collection route?</h3>
                <p className="text-xs text-slate-500">
                  The system will calculate the most optimal sequence starting from your farm.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-3xs">Pickups Count</span>
                <span className="font-bold text-slate-800">{acceptedUnroutedPickups.length} pickups</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-3xs">Estimated Travel</span>
                <span className="font-bold text-emerald-700">~{(acceptedUnroutedPickups.length * 3.6).toFixed(1)} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-3xs">Starting From</span>
                <span className="font-bold text-slate-800">Your Farm (Baseline)</span>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setPlanRouteModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecutePlanRoute}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-200 transition"
              >
                {actionLoading ? "Optimizing..." : "Confirm Route"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* CONFIRMATION MODAL 3: START COLLECTION ROUTE                 */}
      {/* ============================================================== */}
      {startRouteModalOpen && activeRouteToStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl">
                🚚
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Start this collection route?</h3>
                <p className="text-xs text-slate-500">
                  You are about to begin your route with {activeRouteToStart.stops?.length || 0} pickups.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-3xs">First Stop</span>
                <span className="font-bold text-slate-800">
                  {activeRouteToStart.stops?.[0]?.pickupAddress?.split(",")[0] || "Household Stop #1"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-3xs">Total Distance</span>
                <span className="font-bold text-emerald-700">~{activeRouteToStart.totalDistanceKm || "18.0"} km</span>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setStartRouteModalOpen(false);
                  setActiveRouteToStart(null);
                }}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Not Yet
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecuteStartRoute}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-200 transition"
              >
                {actionLoading ? "Starting..." : "Start Route"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: DOORSTEP WEIGH-IN & PASSCODE VERIFICATION            */}
      {/* ============================================================== */}
      {verifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full space-y-4 border border-slate-200 shadow-2xl">
            <h3 className="font-bold text-lg text-slate-900">Doorstep Collection Weigh-In</h3>
            <p className="text-xs text-slate-500">
              Enter certified weight, organic quality grade, and household&apos;s passcode (e.g. ECO-XXXX-PASS).
            </p>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Household QR Passcode</label>
                <input
                  type="text"
                  required
                  placeholder="ECO-1234-PASS"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value.toUpperCase())}
                  className="w-full p-2.5 font-mono text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Actual Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
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
                  <option value="GRADE_A">Grade A (Premium Organic / No Contaminants — 1.0x)</option>
                  <option value="GRADE_B">Grade B (Standard Organic Waste — 0.8x)</option>
                  <option value="GRADE_C">Grade C (Mixed Organic / Minor Inert Matter — 0.6x)</option>
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
