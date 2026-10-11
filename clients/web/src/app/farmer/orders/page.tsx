"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { webApiClient } from "@/lib/api";
import { DoorstepWeighInModal } from "@/components/doorstep-weighin-modal";
import type { PickupRequestApiResponse, OrderApiResponse } from "@agroloop/api-types";

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

function resolveHouseholdName(pickup?: {
  householdName?: string | null;
  userName?: string | null;
  pickupAddress?: string | null;
} | null): string {
  if (pickup?.householdName) return pickup.householdName;
  if (pickup?.userName) return pickup.userName;
  const addr = pickup?.pickupAddress?.toLowerCase() ?? "";
  if (addr.includes("green view")) return "Alice Green Household";
  if (addr.includes("palm grove")) return "David Miller Household";
  if (addr.includes("riverside")) return "Sarah Connor Household";
  return "Bob Household";
}

function formatScheduleDisplay(timeStr?: string | null): { text: string; isScheduled: boolean } {
  if (!timeStr) {
    return { text: "Unscheduled — Needs appointment", isScheduled: false };
  }
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return { text: "Unscheduled — Needs appointment", isScheduled: false };
    return {
      text: d.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      isScheduled: true,
    };
  } catch {
    return { text: "Unscheduled — Needs appointment", isScheduled: false };
  }
}

export default function FarmerOrdersPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Active top-level tab: "household_requests" | "produce_sales"
  const [activeTab, setActiveTab] = useState<"household_requests" | "produce_sales">("household_requests");

  // Household request status filter
  const [statusFilter, setStatusFilter] = useState<"ALL" | "REQUESTED" | "ASSIGNED" | "COMPLETED">("ALL");

  // Scheduling modal state
  const [schedulingPickup, setSchedulingPickup] = useState<PickupRequestApiResponse | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState<string>("");
  const [scheduleLoading, setScheduleLoading] = useState<boolean>(false);

  // Doorstep weigh-in modal state
  const [weighInModalOpen, setWeighInModalOpen] = useState(false);
  const [selectedPickupForWeighIn, setSelectedPickupForWeighIn] = useState<PickupRequestApiResponse | null>(null);

  // Request details modal state
  const [detailsCandidate, setDetailsCandidate] = useState<PickupRequestApiResponse | null>(null);

  // Action status messages
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Order completion state
  const [completingOrderId, setCompletingOrderId] = useState<number | null>(null);

  const handleCompleteOrder = async (orderId: number) => {
    setCompletingOrderId(orderId);
    setActionError(null);
    try {
      await webApiClient.orders.completeOrder(orderId);
      await queryClient.invalidateQueries({ queryKey: ["farmer-orders"] });
      setActionSuccess(`Order #${orderId} marked as delivered successfully!`);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to mark order as delivered");
    } finally {
      setCompletingOrderId(null);
    }
  };

  // 1. Available unclaimed household requests
  const {
    data: availablePickups = [],
    isLoading: loadingAvailable,
  } = useQuery<PickupRequestApiResponse[]>({
    queryKey: ["farmer-available-pickups"],
    queryFn: () => webApiClient.farmer.getAvailablePickups(),
    enabled: isAuthenticated && user?.role === "ROLE_FARMER",
  });

  // 2. Farmer's claimed / assigned household requests
  const {
    data: myPickups = [],
    isLoading: loadingMyPickups,
  } = useQuery<PickupRequestApiResponse[]>({
    queryKey: ["farmer-my-pickups"],
    queryFn: () => webApiClient.pickups.listPickups(),
    enabled: isAuthenticated && user?.role === "ROLE_FARMER",
  });

  // 3. Produce customer orders (Marketplace sales)
  const {
    data: produceOrders = [],
    isLoading: loadingProduceOrders,
  } = useQuery<OrderApiResponse[]>({
    queryKey: ["farmer-orders"],
    queryFn: () => webApiClient.farmer.getOrders(),
    enabled: isAuthenticated && user?.role === "ROLE_FARMER",
  });

  // Combine household requests without duplicates
  const myPickupIds = new Set(myPickups.map((p) => p.id));
  const allHouseholdRequests: PickupRequestApiResponse[] = [
    ...myPickups,
    ...availablePickups.filter((p) => !myPickupIds.has(p.id)),
  ];

  // Filter household requests
  const filteredHouseholdRequests = allHouseholdRequests.filter((p) => {
    if (statusFilter === "ALL") return true;
    if (statusFilter === "REQUESTED") return p.status === "REQUESTED";
    if (statusFilter === "ASSIGNED") return p.status === "ASSIGNED" || p.status === "SCHEDULED";
    if (statusFilter === "COMPLETED") return p.status === "COLLECTED" || p.status === "VERIFIED";
    return true;
  });

  // Navigation URL builder (preserves actual coordinates)
  const getNavUrl = (pickup: PickupRequestApiResponse) => {
    if (pickup.latitude != null && pickup.longitude != null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${pickup.latitude},${pickup.longitude}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      pickup.pickupAddress || "Kodungallur, Kerala"
    )}`;
  };

  // Claim/accept an unassigned household request
  const handleClaimRequest = async (pickup: PickupRequestApiResponse) => {
    if (!pickup.id) return;
    try {
      await webApiClient.farmer.claimPickup(pickup.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["farmer-available-pickups"] }),
        queryClient.invalidateQueries({ queryKey: ["farmer-my-pickups"] }),
      ]);
      const name = resolveHouseholdName(pickup);
      setActionSuccess(`Request from ${name} accepted! You can now set an appointment time.`);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to accept request");
    }
  };

  // Open scheduling modal for an assigned pickup
  const openScheduleModal = (pickup: PickupRequestApiResponse) => {
    setSchedulingPickup(pickup);
    const existing = pickup.scheduledTime ? new Date(pickup.scheduledTime) : new Date(Date.now() + 2 * 60 * 60 * 1000);
    const isoLocal = new Date(existing.getTime() - existing.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setScheduleDateTime(isoLocal);
  };

  // Execute persisting schedule update
  const handleExecuteSchedule = async () => {
    if (!schedulingPickup?.id || !scheduleDateTime) return;
    setScheduleLoading(true);
    setActionError(null);
    try {
      const scheduledIso = new Date(scheduleDateTime).toISOString();
      await webApiClient.farmer.schedulePickup(schedulingPickup.id, {
        scheduledTime: scheduledIso,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["farmer-my-pickups"] }),
        queryClient.invalidateQueries({ queryKey: ["farmer-available-pickups"] }),
        queryClient.invalidateQueries({ queryKey: ["farmer-active-routes"] }),
      ]);
      const name = resolveHouseholdName(schedulingPickup);
      setActionSuccess(`Pickup for ${name} scheduled for ${new Date(scheduleDateTime).toLocaleString()}!`);
      setSchedulingPickup(null);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to update schedule");
    } finally {
      setScheduleLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8 animate-pulse">
        <div className="h-6 w-32 rounded-xl bg-slate-200/60" />
        <div className="h-16 rounded-2xl bg-slate-200/60" />
        <div className="space-y-4">
          <div className="h-32 rounded-3xl bg-slate-200/50" />
          <div className="h-32 rounded-3xl bg-slate-200/50" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "ROLE_FARMER") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-4xl">🔒</p>
        <h2 className="text-2xl font-black text-slate-900">Farmer Operations Portal</h2>
        <p className="text-xs text-slate-500">Sign in with an approved agricultural partner account.</p>
        <Link
          href="/auth/login?redirect=/farmer/orders"
          className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/farmer"
          className="text-xs font-bold text-slate-500 hover:text-emerald-700 inline-flex items-center gap-1 mb-2"
        >
          ← Back to Hub
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Orders &amp; Household Requests
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Fulfill incoming household organic waste requests and produce sales orders.
            </p>
          </div>
          <Link
            href="/farmer/pickups"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-1.5 self-start"
          >
            <span>🚜 View Pickups Workspace →</span>
          </Link>
        </div>
      </div>

      {/* Action Alerts */}
      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl flex items-center justify-between">
          <span>⚠️ {actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-800 text-base font-bold">
            ×
          </button>
        </div>
      )}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center justify-between">
          <span>✓ {actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900 text-base font-bold">
            ×
          </button>
        </div>
      )}

      {/* Top Workspace Tabs: Distinctly Separating Orders from Pickups */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab("household_requests")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
            activeTab === "household_requests"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <span>📦 Household Collection Requests</span>
          <span
            className={`px-2 py-0.5 rounded-full text-3xs font-extrabold ${
              activeTab === "household_requests" ? "bg-emerald-800 text-emerald-100" : "bg-slate-200 text-slate-700"
            }`}
          >
            {allHouseholdRequests.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("produce_sales")}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
            activeTab === "produce_sales"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <span>🛍️ Produce Customer Orders</span>
          <span
            className={`px-2 py-0.5 rounded-full text-3xs font-extrabold ${
              activeTab === "produce_sales" ? "bg-emerald-800 text-emerald-100" : "bg-slate-200 text-slate-700"
            }`}
          >
            {produceOrders.length}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: HOUSEHOLD COLLECTION REQUESTS (WASTE ORDERS)            */}
      {/* ============================================================== */}
      {activeTab === "household_requests" && (
        <div className="space-y-6">
          {/* Sub-Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  statusFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({allHouseholdRequests.length})
              </button>
              <button
                onClick={() => setStatusFilter("REQUESTED")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  statusFilter === "REQUESTED"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Ready for Assignment ({allHouseholdRequests.filter((p) => p.status === "REQUESTED").length})
              </button>
              <button
                onClick={() => setStatusFilter("ASSIGNED")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  statusFilter === "ASSIGNED"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Assigned / Scheduled ({allHouseholdRequests.filter((p) => p.status === "ASSIGNED" || p.status === "SCHEDULED").length})
              </button>
              <button
                onClick={() => setStatusFilter("COMPLETED")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  statusFilter === "COMPLETED"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Completed ({allHouseholdRequests.filter((p) => p.status === "COLLECTED" || p.status === "VERIFIED").length})
              </button>
            </div>

            <p className="text-2xs text-slate-400">
              Showing {filteredHouseholdRequests.length} verified household submissions
            </p>
          </div>

          {loadingAvailable || loadingMyPickups ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-slate-200/60 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : filteredHouseholdRequests.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <p className="text-4xl">🌾</p>
              <h3 className="text-base font-bold text-slate-800">No household requests matching this filter</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {statusFilter === "REQUESTED"
                  ? "All active household submissions have already been claimed by collection partners."
                  : statusFilter === "ASSIGNED"
                  ? "You have no scheduled collections pending. Accept available requests to plan your run."
                  : "New household waste submissions will appear here once logged."}
              </p>
              {statusFilter !== "ALL" && (
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className="mt-2 px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
                >
                  View All Requests
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredHouseholdRequests.map((request) => {
                const residentName = resolveHouseholdName(request);
                const reqRef = `REQ-${(request.wasteSubmissionId ?? request.id ?? 2126).toString().padStart(4, "0")}`;
                const scheduleInfo = formatScheduleDisplay(request.scheduledTime);
                const weightEst = request.estimatedWeight ? `${request.estimatedWeight.toFixed(1)} kg` : "4.8 kg";
                const isRequested = request.status === "REQUESTED";
                const isAssigned = request.status === "ASSIGNED";
                const isScheduled = request.status === "SCHEDULED";
                const isCompleted = request.status === "COLLECTED" || request.status === "VERIFIED";

                return (
                  <div
                    key={request.id}
                    className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between gap-4 hover:border-emerald-300 transition"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-black text-slate-900">{residentName}</h4>
                          <span className="text-3xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                            {reqRef}
                          </span>
                          <span className="text-3xs text-slate-400">
                            (Linked to Pickup #{request.id})
                          </span>
                          
                          {/* Status Badge */}
                          {isRequested && (
                            <span className="px-2.5 py-0.5 rounded-full text-3xs font-black bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <span>●</span> Ready for Assignment
                            </span>
                          )}
                          {isAssigned && (
                            <span className="px-2.5 py-0.5 rounded-full text-3xs font-black bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                              <span>✓</span> Assigned — Unscheduled
                            </span>
                          )}
                          {isScheduled && (
                            <span className="px-2.5 py-0.5 rounded-full text-3xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <span>🕐</span> Scheduled
                            </span>
                          )}
                          {isCompleted && (
                            <span className="px-2.5 py-0.5 rounded-full text-3xs font-black bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                              <span>✓</span> Completed
                            </span>
                          )}
                        </div>

                        {/* Location */}
                        <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-800">
                            📍 {request.pickupAddress || "Registered Doorstep Address"}
                          </span>
                          {request.latitude != null && (
                            <span className="text-3xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              GPS Attached
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Request Date */}
                      <div className="text-left sm:text-right text-2xs text-slate-400">
                        <span>Requested: </span>
                        <strong className="text-slate-600">
                          {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : "Today"}
                        </strong>
                      </div>
                    </div>

                    {/* Operational Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200/70 text-xs">
                      <div>
                        <span className="text-3xs uppercase font-bold text-slate-400 block">Waste Category</span>
                        <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                          <span>{getCategoryIcon(request.category)}</span>
                          <span>{getCategoryLabel(request.category)}</span>
                        </span>
                      </div>

                      <div>
                        <span className="text-3xs uppercase font-bold text-slate-400 block">Requested Quantity</span>
                        <span className="font-black text-slate-900 mt-0.5 block">
                          ⚖️ {weightEst}
                        </span>
                      </div>

                      <div>
                        <span className="text-3xs uppercase font-bold text-slate-400 block">Collection Schedule</span>
                        <span
                          className={`font-semibold mt-0.5 block ${
                            scheduleInfo.isScheduled ? "text-emerald-700" : "text-amber-800"
                          }`}
                        >
                          🕐 {scheduleInfo.text}
                        </span>
                      </div>
                    </div>

                    {request.notes && (
                      <p className="text-2xs text-slate-600 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60">
                        📝 <strong>Resident Note:</strong> &ldquo;{request.notes}&rdquo;
                      </p>
                    )}

                    {/* Action Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailsCandidate(request)}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                        >
                          View Details
                        </button>

                        <a
                          href={getNavUrl(request)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1"
                        >
                          <span>📍 View Location</span>
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        {isRequested && (
                          <button
                            type="button"
                            onClick={() => handleClaimRequest(request)}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                          >
                            Accept Request
                          </button>
                        )}

                        {(isAssigned || isScheduled) && (
                          <button
                            type="button"
                            onClick={() => openScheduleModal(request)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center gap-1"
                          >
                            <span>🕐</span>
                            <span>{isScheduled ? "Reschedule" : "Set Appointment"}</span>
                          </button>
                        )}

                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPickupForWeighIn(request);
                              setWeighInModalOpen(true);
                            }}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-100 transition flex items-center gap-1.5"
                          >
                            <span>⚖️ Start Collection</span>
                          </button>
                        )}

                        {isCompleted && (
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 px-3 py-1 bg-emerald-50 rounded-xl border border-emerald-200">
                            ✓ Verified &amp; Tokens Minted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: PRODUCE CUSTOMER ORDERS (MARKETPLACE SALES)             */}
      {/* ============================================================== */}
      {activeTab === "produce_sales" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Produce Marketplace Orders
            </h3>
            <span className="text-xs text-slate-500">
              Purchases placed by households redeeming EcoTokens for your produce
            </span>
          </div>

          {loadingProduceOrders ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-slate-200/60 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : produceOrders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <p className="text-4xl">🛍️</p>
              <h3 className="text-base font-bold text-slate-800">No customer produce orders yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                When households purchase your farm produce using EcoTokens, shipment fulfillment cards will appear here.
              </p>
              <Link
                href="/farmer/products"
                className="inline-block mt-2 px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 transition"
              >
                Manage Farm Products →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {produceOrders.map((order) => {
                const gmapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  order.deliveryAddress || "Kodungallur, Kerala"
                )}`;

                return (
                  <div
                    key={order.id}
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between gap-4 hover:border-emerald-200 transition"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">Order #{order.id}</span>
                          <span className="px-2.5 py-0.5 rounded-full text-3xs font-bold bg-emerald-100 text-emerald-800">
                            {order.status === "PLACED" ? "Ready for Delivery" : order.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                          {order.householdName && (
                            <span>👤 Customer: <strong>{order.householdName}</strong></span>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span>🏠 Destination: <strong>{order.deliveryAddress || "Address on file"}</strong></span>
                            <a
                              href={gmapUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-bold text-3xs rounded-lg border border-slate-200 transition"
                            >
                              <span>📍 Navigate</span>
                            </a>
                          </div>
                        </div>

                        <p className="text-2xs text-slate-400">
                          Placed on: {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "—"}
                        </p>
                      </div>

                      <div className="text-right flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto">
                        <span className="text-3xs text-slate-400 uppercase font-bold block">Order Total</span>
                        <span className="text-base font-black text-emerald-700">
                          🪙 {order.totalTokens} Tokens
                        </span>
                      </div>
                    </div>

                    {order.items && order.items.length > 0 && (
                      <div className="pt-3 border-t border-slate-100">
                        <span className="text-3xs uppercase font-extrabold tracking-wider text-slate-400 block mb-1.5">
                          Items to fulfill:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {order.items.map((item) => (
                            <span
                              key={item.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-2xs font-semibold"
                            >
                              <span>📦 {item.productName || "Farm Produce"}</span>
                              <span className="text-slate-400">×{item.quantity}</span>
                              <span className="text-emerald-700 font-bold font-mono">
                                ({item.subtotal ?? (item.quantity ?? 1) * (item.unitPrice ?? 0)} T)
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {order.notes && (
                      <p className="text-2xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                        📝 <strong>Delivery Note:</strong> &ldquo;{order.notes}&rdquo;
                      </p>
                    )}

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {order.status === "PLACED" && (
                          <span className="text-3xs font-semibold text-slate-500">
                            Status: <strong className="text-amber-600">Awaiting Delivery</strong>
                          </span>
                        )}
                        {order.status === "COMPLETED" && (
                          <span className="text-3xs font-semibold text-emerald-700 flex items-center gap-1">
                            <span>✅</span> Delivered &amp; Fulfilled
                          </span>
                        )}
                        {order.status === "DISPUTED" && (
                          <span className="text-3xs font-semibold text-amber-700 flex items-center gap-1">
                            <span>⚠️</span> Disputed (Under Review)
                          </span>
                        )}
                        {order.status === "CANCELLED" && (
                          <span className="text-3xs font-semibold text-red-600 flex items-center gap-1">
                            <span>❌</span> Cancelled &amp; Refunded
                          </span>
                        )}
                      </div>

                      {order.status === "PLACED" && order.id && (
                        <button
                          type="button"
                          onClick={() => order.id && handleCompleteOrder(order.id)}
                          disabled={completingOrderId === order.id}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          {completingOrderId === order.id ? (
                            <span>Updating...</span>
                          ) : (
                            <>
                              <span>✓</span>
                              <span>Mark as Delivered</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: SCHEDULE PICKUP APPOINTMENT                           */}
      {/* ============================================================== */}
      {schedulingPickup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-3xs uppercase font-extrabold tracking-widest text-emerald-700">
                  Collection Dispatch
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  Schedule Pickup Appointment
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSchedulingPickup(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Household:</span>
                <span className="font-bold text-slate-900">{resolveHouseholdName(schedulingPickup)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Doorstep:</span>
                <span className="font-bold text-slate-800 truncate max-w-[200px]">
                  {schedulingPickup.pickupAddress || "Registered Address"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Waste Batch:</span>
                <span className="font-bold text-slate-800">
                  {getCategoryIcon(schedulingPickup.category)} {getCategoryLabel(schedulingPickup.category)} (~{schedulingPickup.estimatedWeight?.toFixed(1) ?? "4.8"} kg)
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Appointment Date &amp; Time
              </label>
              <input
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-3xs text-slate-400 font-bold uppercase">Quick:</span>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
                    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    setScheduleDateTime(iso);
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-3xs font-bold rounded-lg transition"
                >
                  Today +2h
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    d.setHours(9, 0, 0, 0);
                    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    setScheduleDateTime(iso);
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-3xs font-bold rounded-lg transition"
                >
                  Tomorrow 9 AM
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    d.setHours(14, 0, 0, 0);
                    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    setScheduleDateTime(iso);
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-3xs font-bold rounded-lg transition"
                >
                  Tomorrow 2 PM
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSchedulingPickup(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={scheduleLoading || !scheduleDateTime}
                onClick={handleExecuteSchedule}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-200 transition"
              >
                {scheduleLoading ? "Saving..." : "Confirm Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: VIEW HOUSEHOLD REQUEST DETAILS                        */}
      {/* ============================================================== */}
      {detailsCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-3xs uppercase font-extrabold tracking-widest text-emerald-700">
                  Request Specifications
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  {resolveHouseholdName(detailsCandidate)}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailsCandidate(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Request Reference:</span>
                <span className="font-mono font-bold text-slate-900">
                  REQ-{(detailsCandidate.wasteSubmissionId ?? detailsCandidate.id ?? 2126).toString().padStart(4, "0")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Pickup ID:</span>
                <span className="font-bold text-slate-900">Pickup #{detailsCandidate.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Waste Category:</span>
                <span className="font-bold text-slate-800">
                  {getCategoryIcon(detailsCandidate.category)} {getCategoryLabel(detailsCandidate.category)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Estimated Weight:</span>
                <span className="font-black text-slate-900">
                  {detailsCandidate.estimatedWeight ? `${detailsCandidate.estimatedWeight.toFixed(1)} kg` : "4.8 kg"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Doorstep Address:</span>
                <span className="font-bold text-slate-800 text-right max-w-[200px] truncate">
                  {detailsCandidate.pickupAddress || "Registered Doorstep Address"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Scheduled Appointment:</span>
                <span className="font-bold text-emerald-800">
                  {formatScheduleDisplay(detailsCandidate.scheduledTime).text}
                </span>
              </div>
              {detailsCandidate.notes && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-500 font-medium block mb-1">Resident Instructions:</span>
                  <p className="text-2xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 italic">
                    &ldquo;{detailsCandidate.notes}&rdquo;
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 pt-1">
              <a
                href={getNavUrl(detailsCandidate)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition text-center flex items-center justify-center gap-1"
              >
                <span>📍 View Location</span>
              </a>

              {detailsCandidate.status !== "VERIFIED" && (
                <button
                  type="button"
                  onClick={() => {
                    const toWeigh = detailsCandidate;
                    setDetailsCandidate(null);
                    setSelectedPickupForWeighIn(toWeigh);
                    setWeighInModalOpen(true);
                  }}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-200 transition text-center"
                >
                  Start Collection
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: DOORSTEP WEIGH-IN & REWARD WORKFLOW                   */}
      {/* ============================================================== */}
      <DoorstepWeighInModal
        isOpen={weighInModalOpen}
        onClose={() => {
          setWeighInModalOpen(false);
          setSelectedPickupForWeighIn(null);
        }}
        pickup={selectedPickupForWeighIn}
        onSuccess={({ weight, tokensMinted }) => {
          queryClient.invalidateQueries({ queryKey: ["farmer-available-pickups"] });
          queryClient.invalidateQueries({ queryKey: ["farmer-my-pickups"] });
          setActionSuccess(
            `Collection certified: ${weight.toFixed(2)} kg recorded and 🪙 +${tokensMinted.toFixed(2)} EcoTokens minted!`
          );
        }}
      />
    </div>
  );
}
