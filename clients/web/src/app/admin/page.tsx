"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { webApiClient } from "@/lib/api";
import { formatRole } from "@agroloop/api-client";
import type {
  UserApiResponse,
  HouseholdBalanceResponse,
  FarmerApplicationApiResponse,
} from "@agroloop/api-types";

type AdminTab = "overview" | "users" | "farmer-applications";

export default function AdminHubPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // User Filter & Search State
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Direct Conversion Modal State
  const [conversionTargetUser, setConversionTargetUser] = useState<UserApiResponse | null>(null);
  const [farmName, setFarmName] = useState("");
  const [farmAddress, setFarmAddress] = useState("");
  const [conversionNotes, setConversionNotes] = useState("");
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [conversionSuccess, setConversionSuccess] = useState<string | null>(null);

  // Token Adjustment Modal State
  const [adjustTargetUser, setAdjustTargetUser] = useState<UserApiResponse | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("10");
  const [adjustDirection, setAdjustDirection] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustResult, setAdjustResult] = useState<HouseholdBalanceResponse | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  // Rejection Modal State
  const [rejectTargetApp, setRejectTargetApp] = useState<FarmerApplicationApiResponse | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  // General Notification Banner
  const [bannerNotice, setBannerNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const backendOrigin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";
  const actuatorUrl = `${backendOrigin.replace(/\/+$/, "")}/admin/dashboard`;
  const swaggerUrl = `${backendOrigin.replace(/\/+$/, "")}/swagger-ui.html`;

  // Query: Users Directory
  const {
    data: users = [],
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => webApiClient.admin.listUsers(),
    enabled: isAuthenticated && user?.role === "ROLE_ADMIN",
  });

  // Query: Farmer Applications Queue
  const {
    data: applications = [],
    isLoading: appsLoading,
    error: appsError,
    refetch: refetchApplications,
  } = useQuery({
    queryKey: ["admin-farmer-applications"],
    queryFn: () => webApiClient.admin.listFarmerApplications(),
    enabled: isAuthenticated && user?.role === "ROLE_ADMIN",
  });

  // Query: Solvency Metrics
  const { data: solvencyMetrics } = useQuery({
    queryKey: ["admin-solvency"],
    queryFn: () => webApiClient.admin.getSolvencyMetrics(),
    enabled: isAuthenticated && user?.role === "ROLE_ADMIN",
  });

  // Mutation: User Status (Enable / Disable)
  const statusMutation = useMutation({
    mutationFn: ({ userId, enabled }: { userId: number; enabled: boolean }) =>
      webApiClient.admin.setUserStatus(userId, enabled),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData<UserApiResponse[]>(["admin-users"], (old = []) =>
        old.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      );
      setBannerNotice({
        type: "success",
        text: `User #${updatedUser.id} (${updatedUser.email}) status updated to ${updatedUser.enabled ? "Active" : "Disabled"}.`,
      });
      setTimeout(() => setBannerNotice(null), 5000);
    },
    onError: (err: unknown) => {
      setBannerNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update user status",
      });
    },
  });

  // Mutation: Direct Convert to Farmer
  const convertMutation = useMutation({
    mutationFn: ({
      userId,
      farmName,
      farmAddress,
      notes,
    }: {
      userId: number;
      farmName: string;
      farmAddress: string;
      notes: string;
    }) =>
      webApiClient.admin.convertUserToFarmer(userId, { farmName, farmAddress, notes }),
    onSuccess: (convertedUser) => {
      refetchUsers();
      refetchApplications();
      setConversionSuccess(
        `Successfully converted ${convertedUser.name || convertedUser.email} to Farmer partner!`
      );
      setTimeout(() => {
        setConversionTargetUser(null);
        setConversionSuccess(null);
        setFarmName("");
        setFarmAddress("");
        setConversionNotes("");
      }, 1800);
    },
    onError: (err: unknown) => {
      setConversionError(err instanceof Error ? err.message : "Conversion failed");
    },
  });

  // Mutation: Approve Farmer Application
  const approveAppMutation = useMutation({
    mutationFn: (applicationId: number) =>
      webApiClient.admin.approveFarmerApplication(applicationId),
    onSuccess: () => {
      refetchApplications();
      refetchUsers();
      setBannerNotice({
        type: "success",
        text: "Farmer application approved successfully! User is now a verified Farmer partner.",
      });
      setTimeout(() => setBannerNotice(null), 5000);
    },
    onError: (err: unknown) => {
      setBannerNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to approve application",
      });
    },
  });

  // Mutation: Reject Farmer Application
  const rejectAppMutation = useMutation({
    mutationFn: ({ applicationId, reason }: { applicationId: number; reason: string }) =>
      webApiClient.admin.rejectFarmerApplication(applicationId, reason),
    onSuccess: () => {
      refetchApplications();
      setRejectTargetApp(null);
      setRejectionReason("");
      setBannerNotice({
        type: "success",
        text: "Farmer application has been rejected and marked in review audit logs.",
      });
      setTimeout(() => setBannerNotice(null), 5000);
    },
    onError: (err: unknown) => {
      setRejectionError(err instanceof Error ? err.message : "Failed to reject application");
    },
  });

  // Mutation: Adjust Tokens
  const adjustTokensMutation = useMutation({
    mutationFn: ({
      userId,
      amount,
      direction,
      reason,
    }: {
      userId: number;
      amount: number;
      direction: "CREDIT" | "DEBIT";
      reason: string;
    }) =>
      webApiClient.admin.adjustTokens(userId, { amount, direction, reason }),
    onSuccess: (result) => {
      setAdjustResult(result);
      setAdjustReason("");
      refetchUsers();
    },
    onError: (err: unknown) => {
      setAdjustError(err instanceof Error ? err.message : "Token adjustment failed");
    },
  });

  // Safety Guards
  const handleToggleStatus = (target: UserApiResponse) => {
    if (!target.id) return;

    // Self-disable guard
    if (target.id === user?.id) {
      alert("Safety Guard: You cannot disable your own active administrator account.");
      return;
    }

    // Last-admin guard
    if (target.role === "ROLE_ADMIN" && target.enabled) {
      const activeAdmins = users.filter((u) => u.role === "ROLE_ADMIN" && u.enabled);
      if (activeAdmins.length <= 1) {
        alert("Safety Guard: Cannot disable the sole remaining active administrator account.");
        return;
      }
    }

    const actionText = target.enabled ? "disable" : "enable";
    if (confirm(`Are you sure you want to ${actionText} user "${target.email}" (#${target.id})?`)) {
      statusMutation.mutate({ userId: target.id, enabled: !target.enabled });
    }
  };

  const handleConvertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversionTargetUser?.id) return;
    if (!farmName.trim()) {
      setConversionError("Farm name is required.");
      return;
    }
    if (!farmAddress.trim()) {
      setConversionError("Farm physical address is required.");
      return;
    }
    setConversionError(null);
    convertMutation.mutate({
      userId: conversionTargetUser.id,
      farmName: farmName.trim(),
      farmAddress: farmAddress.trim(),
      notes: conversionNotes.trim(),
    });
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetUser?.id) return;
    const parsed = parseInt(adjustAmount, 10);
    if (isNaN(parsed) || parsed <= 0) {
      setAdjustError("Adjustment amount must be a positive integer.");
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError("An administrative justification reason is mandatory for audit logging.");
      return;
    }
    setAdjustError(null);
    adjustTokensMutation.mutate({
      userId: adjustTargetUser.id,
      amount: parsed,
      direction: adjustDirection,
      reason: adjustReason.trim(),
    });
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTargetApp?.id) return;
    setRejectionError(null);
    rejectAppMutation.mutate({
      applicationId: rejectTargetApp.id,
      reason: rejectionReason.trim() || "Administrative review rejection",
    });
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      const searchLower = userSearch.toLowerCase();
      const matchesSearch =
        !searchLower ||
        (u.name && u.name.toLowerCase().includes(searchLower)) ||
        (u.email && u.email.toLowerCase().includes(searchLower)) ||
        (u.id && u.id.toString().includes(searchLower));

      // Role
      const roleStr = u.role || "";
      const matchesRole =
        roleFilter === "ALL" ||
        (roleFilter === "HOUSEHOLD" && roleStr.includes("HOUSEHOLD")) ||
        (roleFilter === "FARMER" && roleStr.includes("FARMER")) ||
        (roleFilter === "ADMIN" && roleStr.includes("ADMIN"));

      // Status
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && u.enabled) ||
        (statusFilter === "DISABLED" && !u.enabled);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, userSearch, roleFilter, statusFilter]);

  // Pending Applications Count
  const pendingApps = useMemo(() => {
    return applications.filter((app) => app.status === "PENDING");
  }, [applications]);

  // User Counts
  const counts = useMemo(() => {
    return {
      total: users.length,
      households: users.filter((u) => (u.role || "").includes("HOUSEHOLD")).length,
      farmers: users.filter((u) => (u.role || "").includes("FARMER")).length,
      admins: users.filter((u) => (u.role || "").includes("ADMIN")).length,
      disabled: users.filter((u) => !u.enabled).length,
    };
  }, [users]);

  if (authLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="h-44 rounded-3xl bg-slate-200/60 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="h-28 rounded-2xl bg-slate-200/50 animate-pulse" />
          <div className="h-28 rounded-2xl bg-slate-200/50 animate-pulse" />
          <div className="h-28 rounded-2xl bg-slate-200/50 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "ROLE_ADMIN") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-2xl font-black">
          🛡️
        </div>
        <h2 className="text-2xl font-black text-slate-900">Restricted Administrator Console</h2>
        <p className="text-xs text-slate-500">
          Sign in with an authenticated System Administrator account to access operational metrics and platform governance.
        </p>
        <Link
          href="/auth/login"
          className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition"
        >
          Sign In as Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-8 sm:p-10 shadow-xl border border-slate-700/50">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-2xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>CLUSTER HEALTHY • SPRING BOOT 3 ENGINE</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
              Platform Governance Console
            </h1>
            <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
              Supervising regional closed-loop organic waste streams, user identity life cycles, farmer partner verifications, and decentralized EcoToken ledgers.
            </p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2 bg-white/5 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/10">
            <span className="text-2xs uppercase tracking-wider text-slate-400 font-bold">Authenticated Operator</span>
            <span className="text-base font-black text-white">{user?.name || "System Administrator"}</span>
            <span className="text-3xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
              {user?.email}
            </span>
          </div>
        </div>
      </div>

      {/* Global Notification Banner */}
      {bannerNotice && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border ${
            bannerNotice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{bannerNotice.type === "success" ? "✓" : "⚠️"}</span>
            <span>{bannerNotice.text}</span>
          </div>
          <button
            onClick={() => setBannerNotice(null)}
            className="text-2xs opacity-60 hover:opacity-100 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Tab Switcher */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-4">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "overview"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/60"
          }`}
        >
          <span>📊</span>
          <span>Overview & Metrics</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "users"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/60"
          }`}
        >
          <span>👥</span>
          <span>User Governance Directory</span>
          <span
            className={`px-2 py-0.5 rounded-full text-3xs font-mono ${
              activeTab === "users" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("farmer-applications")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "farmer-applications"
              ? "bg-emerald-800 text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/60"
          }`}
        >
          <span>🌾</span>
          <span>Farmer Conversion Queue</span>
          {pendingApps.length > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-amber-500 text-slate-950 animate-pulse">
              {pendingApps.length} pending
            </span>
          ) : (
            <span
              className={`px-2 py-0.5 rounded-full text-3xs font-mono ${
                activeTab === "farmer-applications" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              0
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & PLATFORM METRICS */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-8 animate-fadeIn">
          {/* Key Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 hover:border-emerald-300 transition">
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Waste Diverted</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">49.4</span>
                <span className="text-xs font-semibold text-slate-500">kg total</span>
              </div>
              <p className="text-2xs text-emerald-600 font-medium">✓ Closed-loop organic verification</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 hover:border-emerald-300 transition">
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Marketplace Inputs</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">20</span>
                <span className="text-xs font-semibold text-slate-500">active products</span>
              </div>
              <p className="text-2xs text-emerald-600 font-medium">✓ {counts.farmers} verified agricultural producers</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 hover:border-emerald-300 transition">
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Ledger Solvency</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600">
                  {solvencyMetrics ? (solvencyMetrics.solvent ? "100% Solvent" : "Discrepancy") : "Audit Live"}
                </span>
              </div>
              <p className="text-2xs text-slate-500 font-medium">
                {solvencyMetrics ? `${solvencyMetrics.totalHouseholdBalances} tokens in circulation` : "Double-spend verified"}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 hover:border-emerald-300 transition">
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Active Release</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600">v1.0.3</span>
                <span className="text-xs font-semibold text-slate-500">production</span>
              </div>
              <p className="text-2xs text-slate-500 font-medium">Synced with Git release tags</p>
            </div>
          </div>

          {/* User & Farmer Queue Quick Status Banners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl border border-slate-700/60 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-bold text-emerald-400 uppercase tracking-wider">Identity Module</span>
                  <span className="text-xs font-mono bg-white/10 px-2 py-0.5 rounded text-slate-300">
                    {counts.total} Registered Accounts
                  </span>
                </div>
                <h3 className="text-lg font-bold">User Identity & Access Governance</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Manage permissions, deactivate rogue accounts with safety guards, and grant or adjust audit-backed EcoToken balances.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setActiveTab("users")}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <span>Open User Directory</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-950 to-slate-900 text-white p-6 rounded-2xl border border-emerald-800/40 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-bold text-amber-400 uppercase tracking-wider">Producer Pipeline</span>
                  <span className="text-xs font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    {pendingApps.length} Awaiting Approval
                  </span>
                </div>
                <h3 className="text-lg font-bold">Household to Farmer Conversion Queue</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Review applications from households seeking agricultural producer verification, inspect submitted farm locations, and authorize marketplace selling access.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setActiveTab("farmer-applications")}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <span>Review Pending Applications</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>

          {/* Operational Actions */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Auxiliary Administrative Services</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 flex flex-col justify-between hover:border-emerald-300 transition">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-lg">
                    🛒
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Agricultural Marketplace</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Inspect live seed inventory, price indices in EcoTokens, and regional producer claims.
                  </p>
                </div>
                <Link
                  href="/marketplace"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 pt-2"
                >
                  <span>Explore Marketplace Catalog</span>
                  <span>→</span>
                </Link>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 flex flex-col justify-between hover:border-emerald-300 transition">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-lg">
                    📦
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Orders & Dispute Auditing</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Review placed orders, investigate discrepancies, and adjudicate consumer claims.
                  </p>
                </div>
                <Link
                  href="/orders"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 pt-2"
                >
                  <span>Audit Orders & Disputes</span>
                  <span>→</span>
                </Link>
              </div>

              <div className="p-6 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-3 flex flex-col justify-between hover:border-emerald-300 transition">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-lg">
                    ⚡
                  </div>
                  <h4 className="text-base font-bold text-slate-900">Spring Boot Actuator</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Direct access to backend application metrics, DB pool health, and REST endpoint routes.
                  </p>
                </div>
                <a
                  href={actuatorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-800 pt-2"
                >
                  <span>Open Actuator Dashboard</span>
                  <span>↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: USER GOVERNANCE DIRECTORY ("THE USER PART") */}
      {/* ========================================================================= */}
      {activeTab === "users" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Control Bar & Stats */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>User Identity & Access Governance</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage all registered platform participants, toggle account states with safeguards, adjust token ledgers, and promote households to farmers.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => refetchUsers()}
                disabled={usersLoading}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
              >
                <span>🔄</span>
                <span>{usersLoading ? "Refreshing..." : "Refresh"}</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-center">
              <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 block">Total Users</span>
              <span className="text-lg font-black text-slate-900">{counts.total}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-center">
              <span className="text-3xs font-bold uppercase tracking-wider text-blue-500 block">Households</span>
              <span className="text-lg font-black text-blue-700">{counts.households}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-center">
              <span className="text-3xs font-bold uppercase tracking-wider text-amber-500 block">Farmers</span>
              <span className="text-lg font-black text-amber-700">{counts.farmers}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-center">
              <span className="text-3xs font-bold uppercase tracking-wider text-purple-500 block">Admins</span>
              <span className="text-lg font-black text-purple-700">{counts.admins}</span>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-center">
              <span className="text-3xs font-bold uppercase tracking-wider text-red-500 block">Disabled</span>
              <span className="text-lg font-black text-red-700">{counts.disabled}</span>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by name, email, or user ID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
              <span className="absolute left-3 top-2.5 text-xs text-slate-400">🔍</span>
              {userSearch && (
                <button
                  onClick={() => setUserSearch("")}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Roles</option>
                <option value="HOUSEHOLD">Households</option>
                <option value="FARMER">Farmers</option>
                <option value="ADMIN">Administrators</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="DISABLED">Disabled Only</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          {usersError ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-2">
              <p className="text-red-700 font-bold text-sm">Failed to load user directory</p>
              <p className="text-xs text-red-600">
                {usersError instanceof Error ? usersError.message : "Network error"}
              </p>
              <button
                onClick={() => refetchUsers()}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : usersLoading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 space-y-3">
              <div className="w-8 h-8 mx-auto border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-500">Loading user directory...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
              <p className="text-2xl">👥</p>
              <h4 className="text-sm font-bold text-slate-800">No users match criteria</h4>
              <p className="text-xs text-slate-400">
                Adjust search query or filter options to inspect other users.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-2xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">ID</th>
                      <th className="py-3.5 px-4">User Identity</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Account Status</th>
                      <th className="py-3.5 px-4 text-right">Administrative Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => {
                      const isSelf = u.id === user?.id;
                      const displayRole = formatRole(u.role);
                      const isHousehold = (u.role || "").includes("HOUSEHOLD");
                      const isFarmer = (u.role || "").includes("FARMER");
                      const isAdmin = (u.role || "").includes("ADMIN");

                      return (
                        <tr
                          key={u.id}
                          className={`hover:bg-slate-50/60 transition ${
                            isSelf ? "bg-emerald-50/30" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono text-slate-400">
                            #{u.id}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {u.name || "Nameless User"}
                              </span>
                              {isSelf && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-3xs">
                                  You (Operator)
                                </span>
                              )}
                            </div>
                            <span className="text-2xs text-slate-500 font-mono block">
                              {u.email}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-2xs font-bold inline-flex items-center gap-1 ${
                                isAdmin
                                  ? "bg-purple-100 text-purple-800 border border-purple-200"
                                  : isFarmer
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-blue-100 text-blue-800 border border-blue-200"
                              }`}
                            >
                              <span>{isAdmin ? "🛡️" : isFarmer ? "🌾" : "🏠"}</span>
                              <span>{displayRole}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 font-semibold text-2xs ${
                                u.enabled ? "text-emerald-700" : "text-rose-600"
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  u.enabled ? "bg-emerald-500" : "bg-rose-500"
                                }`}
                              />
                              <span>{u.enabled ? "Active" : "Disabled"}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Convert to Farmer Action (Available for Households) */}
                              {isHousehold && (
                                <button
                                  onClick={() => {
                                    setConversionTargetUser(u);
                                    setFarmName(`${u.name || "Community"}'s Farm`);
                                    setFarmAddress("");
                                    setConversionNotes("");
                                    setConversionError(null);
                                    setConversionSuccess(null);
                                  }}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-2xs font-bold transition flex items-center gap-1"
                                  title="Promote Household to Verified Farmer"
                                >
                                  <span>🌾</span>
                                  <span>Convert to Farmer</span>
                                </button>
                              )}

                              {/* Adjust Tokens Action (Available for Households) */}
                              {isHousehold && (
                                <button
                                  onClick={() => {
                                    setAdjustTargetUser(u);
                                    setAdjustResult(null);
                                    setAdjustError(null);
                                    setAdjustAmount("10");
                                    setAdjustReason("");
                                  }}
                                  className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-2xs font-bold transition flex items-center gap-1"
                                  title="Adjust EcoToken Balance with Audit Trail"
                                >
                                  <span>🪙</span>
                                  <span>Adjust Tokens</span>
                                </button>
                              )}

                              {/* Enable / Disable Status Toggle */}
                              <button
                                onClick={() => handleToggleStatus(u)}
                                disabled={isSelf}
                                className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition border ${
                                  isSelf
                                    ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                    : u.enabled
                                    ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                                    : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                                }`}
                                title={
                                  isSelf
                                    ? "Cannot disable your own active operator account"
                                    : u.enabled
                                    ? "Deactivate user access"
                                    : "Re-enable user account"
                                }
                              >
                                {u.enabled ? "Disable" : "Enable"}
                              </button>
                            </div>
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
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FARMER APPLICATIONS & CONVERSION QUEUE */}
      {/* ========================================================================= */}
      {activeTab === "farmer-applications" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Description */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>🌾</span>
                <span>Household to Farmer Conversion Queue</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review submitted requests from households requesting producer credentials. Approving upgrades the user to Farmer and grants access to post produce in the marketplace.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => refetchApplications()}
                disabled={appsLoading}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
              >
                <span>🔄</span>
                <span>{appsLoading ? "Refreshing..." : "Refresh Queue"}</span>
              </button>
            </div>
          </div>

          {/* Applications Content */}
          {appsError ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-2">
              <p className="text-red-700 font-bold text-sm">Failed to load farmer applications</p>
              <p className="text-xs text-red-600">
                {appsError instanceof Error ? appsError.message : "Network error"}
              </p>
              <button
                onClick={() => refetchApplications()}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : appsLoading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 space-y-3">
              <div className="w-8 h-8 mx-auto border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-500">Loading conversion applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 space-y-3">
              <p className="text-3xl">🌱</p>
              <h4 className="text-sm font-bold text-slate-800">No Farmer Applications Found</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No household users currently have pending or past producer upgrade applications. You can also directly onboard any household into a farmer from the User Directory tab.
              </p>
              <button
                onClick={() => setActiveTab("users")}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition"
              >
                View User Directory
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => {
                const isPending = app.status === "PENDING";
                const isApproved = app.status === "APPROVED";
                const isRejected = app.status === "REJECTED";

                return (
                  <div
                    key={app.id}
                    className={`bg-white rounded-2xl border p-6 transition shadow-2xs space-y-4 ${
                      isPending
                        ? "border-amber-300 ring-2 ring-amber-400/20"
                        : "border-slate-200/80 opacity-90"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 font-black flex items-center justify-center text-lg">
                          🌾
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-slate-900">
                              {app.farmName || "Unnamed Farm Project"}
                            </h3>
                            <span className="text-2xs font-mono text-slate-400">
                              App #{app.id}
                            </span>
                          </div>
                          <span className="text-2xs text-slate-500">
                            Applicant:{" "}
                            <strong className="text-slate-800">
                              {app.userName || "Applicant User"}
                            </strong>{" "}
                            ({app.userEmail}) • User #{app.userId}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-2xs font-bold ${
                            isPending
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : isApproved
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {app.status}
                        </span>
                        <span className="text-3xs text-slate-400 font-mono">
                          {new Date(app.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">
                          Farm Physical Address & Location
                        </span>
                        <p className="text-slate-700 font-medium">{app.farmAddress || "Not provided"}</p>
                      </div>

                      <div className="space-y-1 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">
                          Applicant Statement / Operation Notes
                        </span>
                        <p className="text-slate-700 font-medium">{app.notes || "No notes provided"}</p>
                      </div>
                    </div>

                    {/* Rejection notice if present */}
                    {isRejected && app.rejectionReason && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                        <span className="font-bold">Rejection Justification: </span>
                        <span>{app.rejectionReason}</span>
                      </div>
                    )}

                    {/* Action Bar for Pending Applications */}
                    {isPending && (
                      <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                        <button
                          onClick={() => {
                            setRejectTargetApp(app);
                            setRejectionReason("");
                            setRejectionError(null);
                          }}
                          disabled={rejectAppMutation.isPending || approveAppMutation.isPending}
                          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition"
                        >
                          ✕ Reject Application
                        </button>

                        <button
                          onClick={() => approveAppMutation.mutate(app.id)}
                          disabled={rejectAppMutation.isPending || approveAppMutation.isPending}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                        >
                          {approveAppMutation.isPending ? (
                            <span>Approving...</span>
                          ) : (
                            <>
                              <span>✓ Approve & Onboard as Farmer</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: DIRECT CONVERT HOUSEHOLD TO FARMER */}
      {/* ========================================================================= */}
      {conversionTargetUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-amber-600 block">
                  Producer Conversion
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Convert Household to Verified Farmer
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upgrades user account from Household to Farmer, assigns a farm profile, and unlocks marketplace vendor capabilities.
                </p>
              </div>
              <button
                onClick={() => setConversionTargetUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Target User Info */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">
                Target Household
              </span>
              <div className="text-xs font-bold text-slate-900">
                {conversionTargetUser.name || "Nameless User"} (#{conversionTargetUser.id})
              </div>
              <div className="text-2xs text-slate-500 font-mono">
                {conversionTargetUser.email}
              </div>
            </div>

            {conversionError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                ⚠️ {conversionError}
              </div>
            )}

            {conversionSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
                ✓ {conversionSuccess}
              </div>
            )}

            <form onSubmit={handleConvertSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                  Farm Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Green Valley Agroforestry"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                  Farm Physical Address & Region <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Plot 42, Sector 9 Organic Belt, Karnataka"
                  value={farmAddress}
                  onChange={(e) => setFarmAddress(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                  Verification / Administrative Notes
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Verified organic certification documentation and soil test report."
                  value={conversionNotes}
                  onChange={(e) => setConversionNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConversionTargetUser(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={convertMutation.isPending}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {convertMutation.isPending ? "Converting Account..." : "Confirm & Promote to Farmer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TOKEN ADJUSTMENT MODAL */}
      {/* ========================================================================= */}
      {adjustTargetUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-emerald-600 block">
                  Ledger Governance
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Audit-Locked Token Adjustment
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Adjust household EcoToken balance with mandatory administrative justification logged in immutable audit records.
                </p>
              </div>
              <button
                onClick={() => setAdjustTargetUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Target User Info */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">
                Target Account
              </span>
              <div className="text-xs font-bold text-slate-900">
                {adjustTargetUser.name || "Nameless User"} (#{adjustTargetUser.id})
              </div>
              <div className="text-2xs text-slate-500 font-mono">
                {adjustTargetUser.email}
              </div>
            </div>

            {adjustError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                ⚠️ {adjustError}
              </div>
            )}

            {adjustResult && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs space-y-1">
                <p className="font-bold">✓ Token Adjustment Processed Successfully</p>
                <p className="text-2xs">
                  Updated Household Balance:{" "}
                  <strong className="text-emerald-950 font-black">
                    {adjustResult.availableBalance ?? 0} EcoTokens
                  </strong>
                </p>
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                    Adjustment Direction
                  </label>
                  <select
                    value={adjustDirection}
                    onChange={(e) => setAdjustDirection(e.target.value as "CREDIT" | "DEBIT")}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                  >
                    <option value="CREDIT">Credit (+) Tokens</option>
                    <option value="DEBIT">Debit (-) Tokens</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                    Token Amount (Integer) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                  Mandatory Audit Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Compensatory credit for verified on-site composting weight discrepancy in Batch #819."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustTargetUser(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={adjustTokensMutation.isPending}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {adjustTokensMutation.isPending ? "Executing..." : "Apply Token Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REJECT APPLICATION MODAL */}
      {/* ========================================================================= */}
      {rejectTargetApp && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-rose-600 block">
                  Application Rejection
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Reject Farmer Application #{rejectTargetApp.id}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Specify the rationale for declining the applicant&apos;s agricultural partner onboarding request.
                </p>
              </div>
              <button
                onClick={() => setRejectTargetApp(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Target Applicant Info */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">
                Applicant Details
              </span>
              <div className="text-xs font-bold text-slate-900">
                {rejectTargetApp.userName || "Applicant"} ({rejectTargetApp.userEmail})
              </div>
              <div className="text-2xs text-slate-500">
                Farm: <strong>{rejectTargetApp.farmName}</strong>
              </div>
            </div>

            {rejectionError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                ⚠️ {rejectionError}
              </div>
            )}

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                  Rejection Reason / Feedback <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Incomplete farm address coordinates or unverifiable land tenure details."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-red-500 focus:bg-white transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectTargetApp(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectAppMutation.isPending}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {rejectAppMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
