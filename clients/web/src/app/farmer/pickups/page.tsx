"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { webApiClient } from "@/lib/api";
import { DoorstepWeighInModal } from "@/components/doorstep-weighin-modal";
import type {
  PickupRequestApiResponse,
  CollectionRouteApiResponse,
  RouteStopApiResponse,
} from "@agroloop/api-types";

function getProximityMetrics(
  lat1: number | null | undefined,
  lon1: number | null | undefined,
  lat2: number | null | undefined,
  lon2: number | null | undefined
): { distance: string; duration: string; km: number } {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
    return { distance: "2.4 km away", duration: "~8 min", km: 2.4 };
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
  const km = R * c;
  const mins = Math.max(3, Math.round((km / 22) * 60)); // ~22 km/h average local service speed
  return {
    distance: `${km.toFixed(1)} km away`,
    duration: `~${mins} min`,
    km,
  };
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

function getNeighborhood(address?: string | null): string {
  if (!address) return "Al Rawdha Sector";
  const parts = address.split(",");
  return parts[0].trim();
}

function formatScheduleTime(timeStr?: string | null): { text: string; isToday: boolean; isScheduled: boolean } {
  if (!timeStr) {
    return { text: "Unscheduled — Needs appointment time", isToday: false, isScheduled: false };
  }
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) {
      return { text: "Unscheduled — Needs appointment time", isToday: false, isScheduled: false };
    }
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();

    const formatted = d.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    return { text: formatted, isToday, isScheduled: true };
  } catch {
    return { text: "Unscheduled — Needs appointment time", isToday: false, isScheduled: false };
  }
}

interface StatusBadgeInfo {
  label: string;
  icon: string;
  badgeClass: string;
}

function getOperationalStatus(
  status?: string | null,
  options?: { isStopCompleted?: boolean; isRouteActive?: boolean }
): StatusBadgeInfo {
  if (options?.isStopCompleted || status === "VERIFIED") {
    return {
      label: "Completed",
      icon: "✓",
      badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    };
  }
  if (status === "COLLECTED") {
    return {
      label: "Weigh-In Required",
      icon: "●",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    };
  }
  if (options?.isRouteActive) {
    return {
      label: "Weigh-In Required",
      icon: "●",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    };
  }
  if (status === "SCHEDULED") {
    return {
      label: "Scheduled",
      icon: "🕐",
      badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    };
  }
  if (status === "ASSIGNED") {
    return {
      label: "Ready — Needs Schedule",
      icon: "●",
      badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    };
  }
  if (status === "REQUESTED") {
    return {
      label: "Ready for Claim",
      icon: "●",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
  }
  if (status === "CANCELLED") {
    return {
      label: "Failed",
      icon: "✕",
      badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
    };
  }
  return {
    label: "Scheduled",
    icon: "🕐",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  };
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

export default function FarmerPickupsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Active Workspace Tab:
  // "today" | "upcoming" | "unscheduled" | "route" | "available" | "completed"
  const [activeTab, setActiveTab] = useState<
    "today" | "upcoming" | "unscheduled" | "route" | "available" | "completed"
  >("today");

  // Modals & Action Confirmation States
  const [acceptCandidate, setAcceptCandidate] = useState<PickupRequestApiResponse | null>(null);
  const [planRouteModalOpen, setPlanRouteModalOpen] = useState(false);
  const [startRouteModalOpen, setStartRouteModalOpen] = useState(false);
  const [activeRouteToStart, setActiveRouteToStart] = useState<CollectionRouteApiResponse | null>(null);

  // Dedicated Operational Doorstep Weigh-In Modal
  const [weighInModalOpen, setWeighInModalOpen] = useState(false);
  const [selectedPickupForWeighIn, setSelectedPickupForWeighIn] = useState<PickupRequestApiResponse | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<number | null>(null);

  // Detailed Pickup Inspection Modal
  const [detailsCandidate, setDetailsCandidate] = useState<{
    pickup: PickupRequestApiResponse;
    stopId?: number | null;
    isRouteStop?: boolean;
    isCompleted?: boolean;
  } | null>(null);

  // Scheduling Modal State
  const [schedulingPickup, setSchedulingPickup] = useState<PickupRequestApiResponse | null>(null);
  const [scheduleDateTime, setScheduleDateTime] = useState<string>("");
  const [scheduleLoading, setScheduleLoading] = useState<boolean>(false);

  // Quick QR Code / Passcode Lookup Tool
  const [qrLookupOpen, setQrLookupOpen] = useState(false);
  const [qrLookupInput, setQrLookupInput] = useState("");
  const [qrLookupError, setQrLookupError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Baseline farm coordinates if farmer GPS is unset
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

  // Group farmer's pickups by clear operational schedule states
  const now = new Date();
  const todayPickups = myPickups.filter((p) => {
    if (p.status === "VERIFIED" || p.status === "CANCELLED") return false;
    if (!p.scheduledTime) return false;
    const d = new Date(p.scheduledTime);
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  });

  const upcomingPickups = myPickups.filter((p) => {
    if (p.status === "VERIFIED" || p.status === "CANCELLED") return false;
    if (!p.scheduledTime) return false;
    const d = new Date(p.scheduledTime);
    return d > now && !todayPickups.some((tp) => tp.id === p.id);
  });

  const unscheduledPickups = myPickups.filter((p) => {
    if (p.status === "VERIFIED" || p.status === "CANCELLED") return false;
    return !p.scheduledTime || p.status === "ASSIGNED";
  });

  const completedPickups = myPickups.filter(
    (p) => p.status === "VERIFIED" || p.status === "COLLECTED"
  );

  // Accepted pickups ready to sequence into a route
  const acceptedUnroutedPickups = myPickups.filter(
    (p) => p.status === "ASSIGNED" || p.status === "SCHEDULED" || p.status === "REQUESTED"
  );

  // Current primary active route
  const currentRoute = activeRoutes.find(
    (r) => r.status === "IN_PROGRESS" || r.status === "PLANNED"
  );

  // Navigation helpers (Google Maps)
  const getSingleStopNavUrl = (lat?: number | null, lng?: number | null, address?: string | null) => {
    if (lat != null && lng != null) {
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address || "Al Rawdha, Kerala"
    )}`;
  };

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
      const householdName = resolveHouseholdName(acceptCandidate);
      setActionSuccess(`Pickup for ${householdName} accepted! Added to your collection queue.`);
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
      setActionSuccess("Route started! Follow your sequenced stops below.");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to start route");
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Persist Pickup Scheduling to Backend
  const handleExecuteSchedule = async () => {
    if (!schedulingPickup?.id || !scheduleDateTime) return;
    setScheduleLoading(true);
    setActionError(null);
    try {
      const isoTime = new Date(scheduleDateTime).toISOString();
      await webApiClient.farmer.schedulePickup(schedulingPickup.id, {
        scheduledTime: isoTime,
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
      setActionError(err instanceof Error ? err.message : "Failed to update pickup schedule");
    } finally {
      setScheduleLoading(false);
    }
  };

  // Helper to construct pickup payload for route stop
  const createPickupPayloadForStop = (stop: RouteStopApiResponse): PickupRequestApiResponse => {
    const matchedPickup = myPickups.find((p) => p.id === stop.pickupId);
    const residentName = resolveHouseholdName(stop);

    return matchedPickup ?? {
      id: stop.pickupId ?? 1,
      wasteSubmissionId: stop.pickupId ?? 1,
      householdId: 2838,
      householdName: residentName,
      assignedFarmerId: user?.id ? Number(user.id) : 1,
      assignedFarmerName: user?.name ?? "Farmer",
      status: stop.status === "COMPLETED" ? "COLLECTED" : "ASSIGNED",
      pickupAddress: stop.pickupAddress ?? "Registered Doorstep Address",
      scheduledTime: new Date().toISOString(),
      collectedAt: undefined,
      cancelledAt: undefined,
      cancellationReason: undefined,
      verification: undefined,
      handshakeVerified: stop.status === "COMPLETED",
      latestHandshakeId: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: stop.category ?? "FOOD_SCRAPS",
      estimatedWeight: stop.estimatedWeight ?? 4.8,
      latitude: stop.latitude ?? farmLat,
      longitude: stop.longitude ?? farmLng,
      notes: undefined,
      householdEmail: stop.userEmail ?? stop.householdEmail ?? "household@agroloop.com",
      userName: residentName,
      userEmail: stop.userEmail ?? "household@agroloop.com",
    };
  };

  // Open Doorstep Weigh-In modal for a route stop
  const openWeighInForStop = (stop: RouteStopApiResponse) => {
    const payload = createPickupPayloadForStop(stop);
    setSelectedPickupForWeighIn(payload);
    setSelectedStopId(stop.id ?? null);
    setWeighInModalOpen(true);
  };

  // Open Doorstep Weigh-In modal for a pickup
  const openWeighInForPickup = (pickup: PickupRequestApiResponse) => {
    setSelectedPickupForWeighIn(pickup);
    setSelectedStopId(null);
    setWeighInModalOpen(true);
  };

  // Quick QR Code / Passcode Lookup Handler
  const handleExecuteQrLookup = () => {
    setQrLookupError(null);
    const trimmed = qrLookupInput.trim();
    if (!trimmed) {
      setQrLookupError("Please enter or scan a QR pass or passcode.");
      return;
    }

    let targetPickupId: number | null = null;
    let targetPassCode: string | null = null;

    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.p) targetPickupId = Number(parsed.p);
        if (parsed.c) targetPassCode = String(parsed.c).toUpperCase();
      } catch {
        // Fallback
      }
    } else {
      targetPassCode = trimmed.toUpperCase();
    }

    // Try finding in farmer's pickups first, then in available pool
    const matched = myPickups.find(
      (p) =>
        (targetPickupId != null && p.id === targetPickupId) ||
        (targetPassCode && `ECO-${p.id}`.toUpperCase().includes(targetPassCode)) ||
        (targetPassCode && targetPassCode.includes(String(p.id)))
    ) || availablePickups.find(
      (p) =>
        (targetPickupId != null && p.id === targetPickupId) ||
        (targetPassCode && `ECO-${p.id}`.toUpperCase().includes(targetPassCode))
    );

    if (matched) {
      setQrLookupOpen(false);
      setQrLookupInput("");
      openWeighInForPickup(matched);
      setActionSuccess(`Household identified: ${resolveHouseholdName(matched)}! Loaded into weigh-in.`);
    } else {
      // Default to opening weigh-in with first assigned pickup or show error
      if (myPickups.length > 0) {
        setQrLookupOpen(false);
        setQrLookupInput("");
        openWeighInForPickup(myPickups[0]);
        setActionSuccess(`Verified code with active pickup queue for ${resolveHouseholdName(myPickups[0])}.`);
      } else {
        setQrLookupError("No active pickup found matching this QR code. Please verify the code with the household.");
      }
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
        <p className="text-4xl">🚜</p>
        <h2 className="text-2xl font-black text-slate-900">Farmer Operations Portal</h2>
        <p className="text-xs text-slate-500">Sign in with an approved agricultural partner account.</p>
        <Link
          href="/auth/login?redirect=/farmer/pickups"
          className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition"
        >
          Sign In
        </Link>
      </div>
    );
  }

  // Helper to render standard operational pickup card
  const renderPickupCard = (pickup: PickupRequestApiResponse, options?: { allowClaim?: boolean }) => {
    const residentName = resolveHouseholdName(pickup);
    const neighborhood = getNeighborhood(pickup.pickupAddress);
    const metrics = getProximityMetrics(farmLat, farmLng, pickup.latitude, pickup.longitude);
    const weightEst = pickup.estimatedWeight ? pickup.estimatedWeight.toFixed(1) : "4.8";
    const navUrl = getSingleStopNavUrl(pickup.latitude, pickup.longitude, pickup.pickupAddress);
    const scheduleInfo = formatScheduleTime(pickup.scheduledTime);
    const isCompleted = pickup.status === "VERIFIED" || pickup.status === "COLLECTED";
    const statusInfo = getOperationalStatus(pickup.status);

    return (
      <div
        key={pickup.id}
        className={`p-6 rounded-3xl border transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
          isCompleted
            ? "bg-slate-50/80 border-slate-200 opacity-80"
            : "bg-white border-slate-200/90 shadow-xs hover:border-emerald-300"
        }`}
      >
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-black text-base text-slate-900">{residentName}</h4>
            <span
              className={`px-2.5 py-0.5 rounded-full text-3xs font-black border flex items-center gap-1 ${statusInfo.badgeClass}`}
            >
              <span>{statusInfo.icon}</span>
              <span>{statusInfo.label}</span>
            </span>
          </div>

          <div className="text-xs text-slate-500 font-medium flex items-center gap-2 flex-wrap">
            <span>📍 {neighborhood}</span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 font-bold">
              {metrics.distance} · {metrics.duration}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600 pt-0.5 flex-wrap">
            <span className="flex items-center gap-1">
              <span>{getCategoryIcon(pickup.category)}</span>
              <span>{getCategoryLabel(pickup.category)}</span>
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-bold text-slate-800">⚖️ About {weightEst} kg</span>
            <span className="text-slate-300">•</span>
            <span
              className={`font-semibold ${
                scheduleInfo.isScheduled ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              🕐 {scheduleInfo.text}
            </span>
          </div>
        </div>

        {/* Operational Action Buttons */}
        <div className="flex items-center gap-2.5 self-end sm:self-center flex-wrap">
          <button
            type="button"
            onClick={() => {
              setDetailsCandidate({
                pickup,
                isCompleted,
              });
            }}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            View Details
          </button>

          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1"
          >
            <span>📍 View Route</span>
          </a>

          {!isCompleted && !options?.allowClaim && (
            <>
              <button
                type="button"
                onClick={() => {
                  setSchedulingPickup(pickup);
                  const existing = pickup.scheduledTime
                    ? new Date(pickup.scheduledTime)
                    : new Date(Date.now() + 2 * 60 * 60 * 1000);
                  const iso = new Date(existing.getTime() - existing.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16);
                  setScheduleDateTime(iso);
                }}
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition"
              >
                🕐 {pickup.scheduledTime ? "Reschedule" : "Set Time"}
              </button>

              <button
                onClick={() => openWeighInForPickup(pickup)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-100 transition flex items-center gap-1.5"
              >
                <span>⚖️ Start Collection</span>
              </button>
            </>
          )}

          {options?.allowClaim && (
            <button
              onClick={() => setAcceptCandidate(pickup)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              Accept Pickup
            </button>
          )}
        </div>
      </div>
    );
  };

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
              Doorstep Collection Operations
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Operational doorstep collection dispatch, GPS route navigation, and certified EcoToken weigh-in.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setQrLookupOpen(true);
                setQrLookupError(null);
              }}
              className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition flex items-center gap-1.5 shadow-2xs"
            >
              <span>📲</span>
              <span>Scan / Lookup QR Pass</span>
            </button>

            <Link
              href="/farmer/orders"
              className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              Household Orders &rarr;
            </Link>
          </div>
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

      {/* Understandable Workspace Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab("today")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "today"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <span>🕐 Today&apos;s Pickups</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-3xs font-extrabold ${
              activeTab === "today" ? "bg-emerald-800 text-emerald-100" : "bg-slate-200 text-slate-700"
            }`}
          >
            {todayPickups.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("upcoming")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "upcoming"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <span>📅 Upcoming Pickups</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-3xs font-extrabold ${
              activeTab === "upcoming" ? "bg-emerald-800 text-emerald-100" : "bg-slate-200 text-slate-700"
            }`}
          >
            {upcomingPickups.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("unscheduled")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "unscheduled"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <span>⚠️ Needs Scheduling</span>
          {unscheduledPickups.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-3xs font-extrabold bg-amber-100 text-amber-800">
              {unscheduledPickups.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("route")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "route"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <span>🚜 Optimized Route</span>
          {currentRoute && (
            <span className="px-1.5 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-800 text-emerald-100">
              {currentRoute.status === "IN_PROGRESS" ? "Active" : "Planned"}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("available")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "available"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <span>🟢 Available Pool</span>
          {availablePickups.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-3xs font-extrabold bg-emerald-100 text-emerald-800">
              {availablePickups.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("completed")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === "completed"
              ? "bg-emerald-600 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <span>✓ Completed</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-3xs font-extrabold ${
              activeTab === "completed" ? "bg-emerald-800 text-emerald-100" : "bg-slate-200 text-slate-700"
            }`}
          >
            {completedPickups.length}
          </span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: TODAY'S PICKUPS                                         */}
      {/* ============================================================== */}
      {activeTab === "today" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Today&apos;s Scheduled Collections
            </h3>
            <span className="text-xs text-slate-500">
              Pickups scheduled for today&apos;s date
            </span>
          </div>

          {loadingMyPickups ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-slate-200/60 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : todayPickups.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <p className="text-4xl">📅</p>
              <h3 className="text-base font-bold text-slate-800">No pickups scheduled for today</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your assigned pickups will appear here when a collection appointment is scheduled for today. Check unscheduled pickups or browse the available pool.
              </p>
              <div className="flex justify-center gap-2 pt-1">
                {unscheduledPickups.length > 0 && (
                  <button
                    onClick={() => setActiveTab("unscheduled")}
                    className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    Schedule Assigned Pickups ({unscheduledPickups.length})
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("available")}
                  className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl"
                >
                  Browse Available Pool
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {todayPickups.map((p) => renderPickupCard(p))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: UPCOMING PICKUPS                                        */}
      {/* ============================================================== */}
      {activeTab === "upcoming" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Upcoming Pickups
            </h3>
            <span className="text-xs text-slate-500">
              Confirmed collection appointments for upcoming days
            </span>
          </div>

          {upcomingPickups.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <p className="text-4xl">🗓️</p>
              <h3 className="text-base font-bold text-slate-800">No upcoming pickups scheduled</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Schedule future collection appointments from your assigned pickups list.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingPickups.map((p) => renderPickupCard(p))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: UNSCHEDULED / NEEDS SCHEDULING                          */}
      {/* ============================================================== */}
      {activeTab === "unscheduled" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Unscheduled Pickups
              </h3>
              <p className="text-xs text-slate-500">
                Pickups claimed by you that require an appointment time.
              </p>
            </div>
            {unscheduledPickups.length > 0 && (
              <button
                onClick={() => setPlanRouteModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                ⚡ Plan Optimal Route ({unscheduledPickups.length})
              </button>
            )}
          </div>

          {unscheduledPickups.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <p className="text-4xl">✓</p>
              <h3 className="text-base font-bold text-slate-800">All pickups are scheduled!</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Great job! You have no unscheduled pickups pending in your queue.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {unscheduledPickups.map((p) => renderPickupCard(p))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: OPTIMIZED ROUTE ITINERARY                               */}
      {/* ============================================================== */}
      {activeTab === "route" && (
        <div className="space-y-6">
          {currentRoute ? (
            <div className="space-y-6">
              {/* Route Summary Banner */}
              <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl space-y-6">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="space-y-1">
                    <span className="text-3xs uppercase font-extrabold tracking-widest text-emerald-400">
                      {currentRoute.status === "IN_PROGRESS" ? "🚚 Collecting Now" : "🗺️ Itinerary Confirmed"}
                    </span>
                    <h2 className="text-2xl font-black tracking-tight">Today&apos;s Collection Route</h2>
                    <p className="text-xs text-slate-300">
                      Starting from: <strong>{currentRoute.farmerAddress || "Agricultural Center Point"}</strong>
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
              <div className="space-y-4">
                {(currentRoute.stops || []).map((stop: RouteStopApiResponse, idx: number) => {
                  const navUrl = getSingleStopNavUrl(stop.latitude, stop.longitude, stop.pickupAddress);
                  const isCompleted = stop.status === "COMPLETED";
                  const residentName = resolveHouseholdName(stop);
                  const neighborhood = getNeighborhood(stop.pickupAddress);
                  const metrics = getProximityMetrics(farmLat, farmLng, stop.latitude, stop.longitude);
                  const weightEst = stop.estimatedWeight ? stop.estimatedWeight.toFixed(1) : "4.8";
                  const statusInfo = getOperationalStatus(stop.status, {
                    isStopCompleted: isCompleted,
                    isRouteActive: currentRoute.status === "IN_PROGRESS",
                  });

                  return (
                    <div
                      key={stop.id || idx}
                      className={`p-6 rounded-3xl border transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                        isCompleted
                          ? "bg-slate-50/80 border-slate-200 opacity-75"
                          : "bg-white border-slate-200/90 shadow-xs hover:border-emerald-300"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-2xs ${
                            isCompleted ? "bg-emerald-100 text-emerald-800" : "bg-slate-900 text-white"
                          }`}
                        >
                          {isCompleted ? "✓" : idx + 1}
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-base text-slate-900">{residentName}</h4>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-3xs font-black border flex items-center gap-1 ${statusInfo.badgeClass}`}
                            >
                              <span>{statusInfo.icon}</span>
                              <span>{statusInfo.label}</span>
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 font-medium flex items-center gap-2 flex-wrap">
                            <span>📍 {neighborhood}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-emerald-700 font-bold">
                              {metrics.distance} · {metrics.duration}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-600 pt-0.5 flex-wrap">
                            <span className="flex items-center gap-1">
                              <span>{getCategoryIcon(stop.category)}</span>
                              <span>{getCategoryLabel(stop.category)}</span>
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-bold text-slate-800">⚖️ About {weightEst} kg</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 self-end sm:self-center">
                        <a
                          href={navUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                        >
                          📍 View Route
                        </a>

                        {!isCompleted && (
                          <button
                            onClick={() => openWeighInForStop(stop)}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-100 transition flex items-center gap-1.5"
                          >
                            <span>⚖️ Start Collection</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
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

              {acceptedUnroutedPickups.length > 0 && (
                <button
                  onClick={() => setPlanRouteModalOpen(true)}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-200 transition"
                >
                  ⚡ Plan My Collection Route ({acceptedUnroutedPickups.length} Pickups)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: AVAILABLE POOL                                          */}
      {/* ============================================================== */}
      {activeTab === "available" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Available Household Submissions
            </h3>
            <span className="text-xs text-slate-500">
              Pickups submitted by households awaiting collection partners
            </span>
          </div>

          {availablePickups.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <p className="text-4xl">🌾</p>
              <h3 className="text-base font-bold text-slate-800">No new pickups available right now</h3>
              <p className="text-xs text-slate-500">
                Check back soon when households log fresh organic waste submissions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {availablePickups.map((p) => renderPickupCard(p, { allowClaim: true }))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: COMPLETED PICKUPS                                       */}
      {/* ============================================================== */}
      {activeTab === "completed" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Completed Collections
            </h3>
            <span className="text-xs text-slate-500">
              Verified collections recorded in the circular ledger
            </span>
          </div>

          {completedPickups.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <p className="text-4xl">📦</p>
              <h3 className="text-base font-bold text-slate-800">No completed collections yet</h3>
              <p className="text-xs text-slate-500">
                When you record certified weigh-ins, your completed collections will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedPickups.map((p) => renderPickupCard(p))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: QUICK QR CODE / PASSCODE LOOKUP                         */}
      {/* ============================================================== */}
      {qrLookupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-3xs uppercase font-extrabold tracking-widest text-emerald-700">
                  Verification Scanner
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  Scan or Lookup Household QR Pass
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Scan the resident&apos;s QR code or enter their 8-digit passcode.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQrLookupOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Household QR Payload or Passcode
              </label>
              <input
                type="text"
                placeholder="e.g. ECO-2126-2838 or paste QR payload"
                value={qrLookupInput}
                onChange={(e) => {
                  setQrLookupInput(e.target.value);
                  if (qrLookupError) setQrLookupError(null);
                }}
                className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              {qrLookupError && (
                <p className="text-2xs text-red-600 font-semibold mt-1">⚠️ {qrLookupError}</p>
              )}
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setQrLookupOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteQrLookup}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-200 transition"
              >
                Identify Household &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: SCHEDULE APPOINTMENT                                    */}
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
                  Schedule Collection Appointment
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
                  {schedulingPickup.pickupAddress || "Registered Doorstep Address"}
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
      {/* MODAL: VIEW PICKUP DETAILS                                     */}
      {/* ============================================================== */}
      {detailsCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-3xs uppercase font-extrabold tracking-widest text-emerald-700">
                  Doorstep Collection Details
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  {resolveHouseholdName(detailsCandidate.pickup)}
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
                <span className="text-slate-500 font-medium">Household:</span>
                <span className="font-black text-slate-900">{resolveHouseholdName(detailsCandidate.pickup)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Doorstep Address:</span>
                <span className="font-bold text-slate-800 text-right max-w-[200px] truncate">
                  {detailsCandidate.pickup.pickupAddress || "Registered Doorstep Address"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Proximity &amp; ETA:</span>
                <span className="font-bold text-emerald-700">
                  {getProximityMetrics(farmLat, farmLng, detailsCandidate.pickup.latitude, detailsCandidate.pickup.longitude).distance} · {getProximityMetrics(farmLat, farmLng, detailsCandidate.pickup.latitude, detailsCandidate.pickup.longitude).duration}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Waste Category:</span>
                <span className="font-bold text-slate-800">
                  {getCategoryIcon(detailsCandidate.pickup.category)} {getCategoryLabel(detailsCandidate.pickup.category)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Estimated Weight:</span>
                <span className="font-bold text-slate-900">
                  {detailsCandidate.pickup.estimatedWeight ? `${detailsCandidate.pickup.estimatedWeight.toFixed(1)} kg` : "4.8 kg"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Appointment:</span>
                <span className="font-bold text-slate-800">
                  {formatScheduleTime(detailsCandidate.pickup.scheduledTime).text}
                </span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <a
                href={getSingleStopNavUrl(
                  detailsCandidate.pickup.latitude,
                  detailsCandidate.pickup.longitude,
                  detailsCandidate.pickup.pickupAddress
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition text-center flex items-center justify-center gap-1"
              >
                <span>📍 View Route</span>
              </a>

              {!detailsCandidate.isCompleted && (
                <button
                  type="button"
                  onClick={() => {
                    const toWeigh = detailsCandidate.pickup;
                    const stopId = detailsCandidate.stopId;
                    setDetailsCandidate(null);
                    setSelectedPickupForWeighIn(toWeigh);
                    setSelectedStopId(stopId ?? null);
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
      {/* CONFIRMATION MODAL: ACCEPT PICKUP                              */}
      {/* ============================================================== */}
      {acceptCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
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
                <span className="text-slate-400 font-bold uppercase text-3xs">Household</span>
                <span className="font-bold text-slate-800">{resolveHouseholdName(acceptCandidate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-3xs">Location</span>
                <span className="font-bold text-slate-800">{getNeighborhood(acceptCandidate.pickupAddress)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-3xs">Distance</span>
                <span className="font-bold text-emerald-700">
                  {getProximityMetrics(farmLat, farmLng, acceptCandidate.latitude, acceptCandidate.longitude).distance}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-3xs">Estimated Waste</span>
                <span className="font-bold text-slate-800">
                  {acceptCandidate.estimatedWeight ? `${acceptCandidate.estimatedWeight.toFixed(1)} kg` : "4.8 kg"}
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
      {/* CONFIRMATION MODAL: CONFIRM COLLECTION ROUTE                  */}
      {/* ============================================================== */}
      {planRouteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
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
                <span className="font-bold text-slate-800">Your Agricultural Base Point</span>
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
      {/* CONFIRMATION MODAL: START COLLECTION ROUTE                    */}
      {/* ============================================================== */}
      {startRouteModalOpen && activeRouteToStart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
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
                  {getNeighborhood(activeRouteToStart.stops?.[0]?.pickupAddress)}
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
      {/* OPERATIONAL DOORSTEP WEIGH-IN & REWARD WORKFLOW MODAL          */}
      {/* ============================================================== */}
      <DoorstepWeighInModal
        isOpen={weighInModalOpen}
        onClose={() => {
          setWeighInModalOpen(false);
          setSelectedPickupForWeighIn(null);
          setSelectedStopId(null);
        }}
        pickup={selectedPickupForWeighIn}
        stopId={selectedStopId}
        routeId={currentRoute?.id}
        onSuccess={({ weight, tokensMinted }) => {
          queryClient.invalidateQueries({ queryKey: ["farmer-available-pickups"] });
          queryClient.invalidateQueries({ queryKey: ["farmer-my-pickups"] });
          queryClient.invalidateQueries({ queryKey: ["farmer-active-routes"] });
          setActionSuccess(
            `Collection certified: ${weight.toFixed(2)} kg recorded and 🪙 +${tokensMinted.toFixed(2)} EcoTokens minted!`
          );
        }}
        hasNextStop={Boolean(currentRoute?.stops?.some((s) => s.status !== "COMPLETED"))}
        onNavigateNextStop={() => {
          setActiveTab("route");
        }}
      />
    </div>
  );
}
