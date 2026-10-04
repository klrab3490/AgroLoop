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
  CreateUserApiRequest,
  UpdateUserRoleApiRequest,
  OrderApiResponse,
} from "@agroloop/api-types";

type AdminTab = "overview" | "users" | "farmer-applications" | "orders-disputes";

export default function AdminHubPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // User Filter & Search State
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // User Details Inspection Modal State
  const [inspectedUser, setInspectedUser] = useState<UserApiResponse | null>(null);

  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("ecoNexus2026!");
  const [addRole, setAddRole] = useState<"ROLE_HOUSEHOLD" | "ROLE_FARMER" | "ROLE_ADMIN">("ROLE_HOUSEHOLD");
  const [addAddress, setAddAddress] = useState("");
  const [addFarmName, setAddFarmName] = useState("");
  const [addFarmAddress, setAddFarmAddress] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addInitialTokens, setAddInitialTokens] = useState("0");
  const [addUserError, setAddUserError] = useState<string | null>(null);

  // Modify Role Modal State
  const [modifyRoleUser, setModifyRoleUser] = useState<UserApiResponse | null>(null);
  const [targetRole, setTargetRole] = useState<"ROLE_HOUSEHOLD" | "ROLE_FARMER" | "ROLE_ADMIN">("ROLE_HOUSEHOLD");
  const [roleAddress, setRoleAddress] = useState("");
  const [roleFarmName, setRoleFarmName] = useState("");
  const [roleFarmAddress, setRoleFarmAddress] = useState("");
  const [roleNotes, setRoleNotes] = useState("");
  const [modifyRoleError, setModifyRoleError] = useState<string | null>(null);

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

  // Dispute Resolution Modal State
  const [disputeTargetOrder, setDisputeTargetOrder] = useState<OrderApiResponse | null>(null);
  const [disputeResolution, setDisputeResolution] = useState<"APPROVED_REFUND" | "DISMISSED">("APPROVED_REFUND");
  const [disputeAdminNotes, setDisputeAdminNotes] = useState("");
  const [disputeError, setDisputeError] = useState<string | null>(null);

  // General Notification Banner
  const [bannerNotice, setBannerNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const backendOrigin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";
  const actuatorUrl = `${backendOrigin.replace(/\/+$/, "")}/admin/dashboard`;

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

  // Query: Storage Diagnostics
  const { data: storageDiagnostics } = useQuery({
    queryKey: ["admin-storage-diagnostics"],
    queryFn: () => webApiClient.admin.getStorageDiagnostics(),
    enabled: isAuthenticated && user?.role === "ROLE_ADMIN",
  });

  // Query: Orders & Disputes
  const {
    data: orders = [],
    isLoading: ordersLoading,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => webApiClient.admin.listOrders(),
    enabled: isAuthenticated && user?.role === "ROLE_ADMIN",
  });

  // Mutation: Create User
  const createUserMutation = useMutation({
    mutationFn: (req: CreateUserApiRequest) => webApiClient.admin.createUser(req),
    onSuccess: (created) => {
      refetchUsers();
      setIsAddUserModalOpen(false);
      setAddName("");
      setAddEmail("");
      setAddPassword("ecoNexus2026!");
      setAddAddress("");
      setAddFarmName("");
      setAddFarmAddress("");
      setAddNotes("");
      setAddInitialTokens("0");
      setAddUserError(null);
      setBannerNotice({
        type: "success",
        text: `User #${created.id} (${created.email}) created successfully as ${formatRole(created.role)}.`,
      });
      setTimeout(() => setBannerNotice(null), 5000);
    },
    onError: (err: unknown) => {
      setAddUserError(err instanceof Error ? err.message : "Failed to create user");
    },
  });

  // Mutation: Modify Role
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, req }: { userId: number; req: UpdateUserRoleApiRequest }) =>
      webApiClient.admin.updateUserRole(userId, req),
    onSuccess: (updated) => {
      refetchUsers();
      refetchApplications();
      setModifyRoleUser(null);
      setModifyRoleError(null);
      if (inspectedUser?.id === updated.id) {
        setInspectedUser(updated);
      }
      setBannerNotice({
        type: "success",
        text: `User #${updated.id} role updated to ${formatRole(updated.role)}.`,
      });
      setTimeout(() => setBannerNotice(null), 5000);
    },
    onError: (err: unknown) => {
      setModifyRoleError(err instanceof Error ? err.message : "Failed to modify role");
    },
  });

  // Mutation: User Status (Enable / Disable)
  const statusMutation = useMutation({
    mutationFn: ({ userId, enabled }: { userId: number; enabled: boolean }) =>
      webApiClient.admin.setUserStatus(userId, enabled),
    onSuccess: (updatedUser) => {
      queryClient.setQueryData<UserApiResponse[]>(["admin-users"], (old = []) =>
        old.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      );
      if (inspectedUser?.id === updatedUser.id) {
        setInspectedUser(updatedUser);
      }
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
      if (inspectedUser?.id === convertedUser.id) {
        setInspectedUser(convertedUser);
      }
      setConversionSuccess(
        `Successfully converted ${convertedUser.name || convertedUser.email} to Farmer partner!`
      );
      setTimeout(() => {
        setConversionTargetUser(null);
        setConversionSuccess(null);
        setFarmName("");
        setFarmAddress("");
        setConversionNotes("");
      }, 1500);
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
      if (inspectedUser && adjustTargetUser && inspectedUser.id === adjustTargetUser.id) {
        setInspectedUser({
          ...inspectedUser,
          tokenBalance: result.availableBalance,
        });
      }
    },
    onError: (err: unknown) => {
      setAdjustError(err instanceof Error ? err.message : "Token adjustment failed");
    },
  });

  // Mutation: Resolve Dispute
  const resolveDisputeMutation = useMutation({
    mutationFn: ({
      orderId,
      resolution,
      notes,
    }: {
      orderId: number;
      resolution: "APPROVED_REFUND" | "DISMISSED";
      notes?: string;
    }) =>
      webApiClient.admin.resolveDispute(orderId, {
        resolution,
        adminNotes: notes,
      }),
    onSuccess: () => {
      refetchOrders();
      setDisputeTargetOrder(null);
      setDisputeAdminNotes("");
      setDisputeError(null);
      setBannerNotice({
        type: "success",
        text: "Order dispute adjudicated and updated in ledger.",
      });
      setTimeout(() => setBannerNotice(null), 5000);
    },
    onError: (err: unknown) => {
      setDisputeError(err instanceof Error ? err.message : "Failed to resolve dispute");
    },
  });

  // Safety Guards
  const handleToggleStatus = (target: UserApiResponse) => {
    if (!target.id) return;

    if (target.id === user?.id) {
      alert("Safety Guard: You cannot disable your own active administrator account.");
      return;
    }

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

  const handleOpenModifyRole = (target: UserApiResponse) => {
    setModifyRoleUser(target);
    setTargetRole(target.role || "ROLE_HOUSEHOLD");
    setRoleAddress(target.address || "");
    setRoleFarmName(target.farmName || `${target.name || "Community"}'s Farm`);
    setRoleFarmAddress(target.farmAddress || target.address || "");
    setRoleNotes(target.notes || "");
    setModifyRoleError(null);
  };

  const handleModifyRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modifyRoleUser?.id) return;

    if (modifyRoleUser.id === user?.id && targetRole !== "ROLE_ADMIN") {
      alert("Safety Guard: You cannot demote your own administrator account.");
      return;
    }

    if (modifyRoleUser.role === "ROLE_ADMIN" && targetRole !== "ROLE_ADMIN") {
      const activeAdmins = users.filter((u) => u.role === "ROLE_ADMIN" && u.enabled);
      if (activeAdmins.length <= 1) {
        alert("Safety Guard: Cannot demote the sole remaining active administrator account.");
        return;
      }
    }

    setModifyRoleError(null);
    updateRoleMutation.mutate({
      userId: modifyRoleUser.id,
      req: {
        role: targetRole,
        address: roleAddress.trim() || undefined,
        farmName: roleFarmName.trim() || undefined,
        farmAddress: roleFarmAddress.trim() || undefined,
        notes: roleNotes.trim() || undefined,
      },
    });
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim()) {
      setAddUserError("Name and email are required.");
      return;
    }
    const tokenParsed = parseFloat(addInitialTokens);
    setAddUserError(null);
    createUserMutation.mutate({
      name: addName.trim(),
      email: addEmail.trim(),
      password: addPassword.trim() || undefined,
      role: addRole,
      address: addAddress.trim() || undefined,
      farmName: addFarmName.trim() || undefined,
      farmAddress: addFarmAddress.trim() || undefined,
      notes: addNotes.trim() || undefined,
      initialTokens: !isNaN(tokenParsed) && tokenParsed > 0 ? tokenParsed : undefined,
    });
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

  const handleDisputeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeTargetOrder?.id) return;
    setDisputeError(null);
    resolveDisputeMutation.mutate({
      orderId: disputeTargetOrder.id,
      resolution: disputeResolution,
      notes: disputeAdminNotes.trim() || undefined,
    });
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const searchLower = userSearch.toLowerCase();
      const matchesSearch =
        !searchLower ||
        (u.name && u.name.toLowerCase().includes(searchLower)) ||
        (u.email && u.email.toLowerCase().includes(searchLower)) ||
        (u.id && u.id.toString().includes(searchLower));

      const roleStr = u.role || "";
      const matchesRole =
        roleFilter === "ALL" ||
        (roleFilter === "HOUSEHOLD" && roleStr.includes("HOUSEHOLD")) ||
        (roleFilter === "FARMER" && roleStr.includes("FARMER")) ||
        (roleFilter === "ADMIN" && roleStr.includes("ADMIN"));

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && u.enabled) ||
        (statusFilter === "DISABLED" && !u.enabled);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, userSearch, roleFilter, statusFilter]);

  // Pending Applications
  const pendingApps = useMemo(() => {
    return applications.filter((app) => app.status === "PENDING");
  }, [applications]);

  // Disputed Orders
  const disputedOrders = useMemo(() => {
    return orders.filter((o) => o.status === "DISPUTED");
  }, [orders]);

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
              {applications.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("orders-disputes")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === "orders-disputes"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200/60"
          }`}
        >
          <span>⚖️</span>
          <span>Orders & Disputes</span>
          {disputedOrders.length > 0 ? (
            <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-rose-500 text-white animate-pulse">
              {disputedOrders.length} disputed
            </span>
          ) : (
            <span
              className={`px-2 py-0.5 rounded-full text-3xs font-mono ${
                activeTab === "orders-disputes" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {orders.length}
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
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Registered Identities</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{counts.total}</span>
                <span className="text-xs font-semibold text-slate-500">accounts</span>
              </div>
              <p className="text-2xs text-emerald-600 font-medium">✓ {counts.households} households • {counts.farmers} farmers</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 hover:border-emerald-300 transition">
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Farmer Verifications</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{pendingApps.length}</span>
                <span className="text-xs font-semibold text-slate-500">pending queue</span>
              </div>
              <p className="text-2xs text-amber-600 font-medium">⚡ Producer conversion requests</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 hover:border-emerald-300 transition">
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Ledger Solvency</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600">
                  {solvencyMetrics ? (solvencyMetrics.solvent ? "100% Solvent" : "Discrepancy") : "Audit Live"}
                </span>
              </div>
              <p className="text-2xs text-slate-500 font-medium">
                {solvencyMetrics ? `${solvencyMetrics.totalHouseholdBalances} tokens in circulation` : "Pessimistic write locked"}
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 hover:border-emerald-300 transition">
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Cloud Storage SPI</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {storageDiagnostics?.activeProvider || "LOCAL"}
                </span>
                <span className="inline-flex items-center gap-1 text-2xs font-bold text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Healthy
                </span>
              </div>
              <p className="text-2xs text-slate-400 font-mono truncate">
                {storageDiagnostics?.targetLocation || "Local uploads container"}
              </p>
            </div>
          </div>

          {/* Quick Action Banners */}
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
                  Manage permissions, inspect detailed user profiles, add new platform users, modify roles, and execute audit-backed EcoToken balance adjustments.
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
                <button
                  onClick={() => setIsAddUserModalOpen(true)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <span>+ Add New User</span>
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-950 to-slate-900 text-white p-6 rounded-2xl border border-emerald-800/40 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xs font-bold text-amber-400 uppercase tracking-wider">Producer Pipeline</span>
                  <span className="text-xs font-bold bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    {pendingApps.length} Awaiting Verification
                  </span>
                </div>
                <h3 className="text-lg font-bold">Farmer Partner Conversion Queue</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Verify submitted agricultural applications from households, evaluate physical farm addresses, and authorize producer credentials for selling in the circular marketplace.
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

          {/* Platform Access & System Infrastructure */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>🔐</span>
              <span>Platform Access & Infrastructure</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">Canonical Operator</span>
                <p className="font-bold text-slate-900">admin@agroloop.com</p>
                <p className="text-2xs text-emerald-600 font-mono">ROLE_ADMIN (Authoritative)</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">Active Administrators</span>
                <p className="font-bold text-slate-900">{counts.admins} System Administrators</p>
                <p className="text-2xs text-slate-500">Concurrency-safe last-admin protection active</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">Backend Actuator Engine</span>
                <a
                  href={actuatorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1"
                >
                  <span>Actuator Telemetry</span>
                  <span>↗</span>
                </a>
                <p className="text-2xs text-slate-500">Health checks & DB pool metrics</p>
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
                Inspect complete user details, create new participants, modify platform roles, toggle account states, and execute audit-logged token adjustments.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-xs"
              >
                <span>+</span>
                <span>Add User</span>
              </button>

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
                      <th className="py-3.5 px-4">Token Balance</th>
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
                          className={`hover:bg-slate-50/60 transition cursor-pointer ${
                            isSelf ? "bg-emerald-50/30" : ""
                          }`}
                          onClick={() => setInspectedUser(u)}
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
                            {u.createdAt && (
                              <span className="text-3xs text-slate-400 mt-0.5 block">
                                Joined {new Date(u.createdAt).toLocaleDateString()}
                              </span>
                            )}
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
                          <td className="py-3.5 px-4 font-mono">
                            {u.tokenBalance != null ? (
                              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                {u.tokenBalance} 🪙
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td
                            className="py-3.5 px-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {/* Inspect Details Button */}
                              <button
                                onClick={() => setInspectedUser(u)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-2xs font-bold transition flex items-center gap-1"
                                title="Inspect User Identity & Platform Profile"
                              >
                                <span>👁️</span>
                                <span>Details</span>
                              </button>

                              {/* Modify Role Button */}
                              <button
                                onClick={() => handleOpenModifyRole(u)}
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-2xs font-bold transition flex items-center gap-1"
                                title="Change Platform Role"
                              >
                                <span>🔄</span>
                                <span>Role</span>
                              </button>

                              {/* Convert to Farmer Action (Available for Households) */}
                              {isHousehold && (
                                <button
                                  onClick={() => {
                                    setConversionTargetUser(u);
                                    setFarmName(`${u.name || "Community"}'s Farm`);
                                    setFarmAddress(u.address || "");
                                    setConversionNotes("");
                                    setConversionError(null);
                                    setConversionSuccess(null);
                                  }}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-2xs font-bold transition flex items-center gap-1"
                                  title="Promote Household to Verified Farmer"
                                >
                                  <span>🌾</span>
                                  <span>Convert</span>
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
                                  <span>Adjust</span>
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
                No household users currently have pending producer upgrade applications. You can also directly onboard any household into a farmer from the User Directory tab.
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
      {/* TAB 4: ORDERS & DISPUTE ADJUDICATION */}
      {/* ========================================================================= */}
      {activeTab === "orders-disputes" && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>⚖️</span>
                <span>Platform Orders & Dispute Adjudication</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review platform transactions, adjudicate consumer disputes, and issue atomic refunds or release funds with ledger audit trails.
              </p>
            </div>

            <button
              onClick={() => refetchOrders()}
              disabled={ordersLoading}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
            >
              <span>🔄</span>
              <span>{ordersLoading ? "Refreshing..." : "Refresh Orders"}</span>
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200/80 space-y-2">
              <p className="text-3xl">📦</p>
              <h4 className="text-sm font-bold text-slate-800">No Orders Placed Yet</h4>
              <p className="text-xs text-slate-500">Orders placed across the platform will appear here for administrative oversight.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-2xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Order ID</th>
                      <th className="py-3.5 px-4">Buyer / Household</th>
                      <th className="py-3.5 px-4">Total Tokens</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((o) => {
                      const isDisputed = o.status === "DISPUTED";
                      return (
                        <tr
                          key={o.id}
                          className={`hover:bg-slate-50/60 transition ${
                            isDisputed ? "bg-rose-50/40" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                            #{o.id}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-900 block">{o.householdName || `User #${o.householdId}`}</span>
                            <span className="text-2xs text-slate-400 font-mono">ID: {o.householdId}</span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                            {o.totalTokens ?? 0} 🪙
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-2xs font-bold ${
                                isDisputed
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : o.status === "COMPLETED"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : "bg-blue-100 text-blue-800 border border-blue-200"
                              }`}
                            >
                              {o.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-2xs">
                            {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "Recent"}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isDisputed ? (
                              <button
                                onClick={() => {
                                  setDisputeTargetOrder(o);
                                  setDisputeResolution("APPROVED_REFUND");
                                  setDisputeAdminNotes("");
                                  setDisputeError(null);
                                }}
                                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-2xs font-bold transition shadow-xs"
                              >
                                Adjudicate Dispute
                              </button>
                            ) : (
                              <Link
                                href={`/orders/${o.id}`}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-2xs font-bold transition"
                              >
                                View Order
                              </Link>
                            )}
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
      {/* MODAL 0: USER DETAILS INSPECTION MODAL */}
      {/* ========================================================================= */}
      {inspectedUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 font-black flex items-center justify-center text-xl">
                  {(inspectedUser.role || "").includes("ADMIN") ? "🛡️" : (inspectedUser.role || "").includes("FARMER") ? "🌾" : "🏠"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">
                      {inspectedUser.name || "Nameless User"}
                    </h3>
                    <span className="text-2xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                      #{inspectedUser.id}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono block">
                    {inspectedUser.email}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setInspectedUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Identity Status & Roles Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-3xs uppercase font-bold text-slate-400 block">Role</span>
                <span className="text-xs font-bold text-slate-800">{formatRole(inspectedUser.role)}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-3xs uppercase font-bold text-slate-400 block">Account Status</span>
                <span className={`text-xs font-bold ${inspectedUser.enabled ? "text-emerald-700" : "text-rose-700"}`}>
                  {inspectedUser.enabled ? "● Active" : "● Disabled"}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-3xs uppercase font-bold text-slate-400 block">Token Balance</span>
                <span className="text-xs font-mono font-bold text-blue-700">
                  {inspectedUser.tokenBalance != null ? `${inspectedUser.tokenBalance} 🪙` : "0.00 🪙"}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-3xs uppercase font-bold text-slate-400 block">Registered On</span>
                <span className="text-xs font-mono text-slate-700">
                  {inspectedUser.createdAt ? new Date(inspectedUser.createdAt).toLocaleDateString() : "Historical"}
                </span>
              </div>
            </div>

            {/* Role Specific Details Section */}
            {(inspectedUser.role || "").includes("FARMER") && (
              <div className="p-5 bg-amber-50/50 border border-amber-200/60 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <span>🌾</span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Agricultural Producer Profile
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-3xs font-bold uppercase text-slate-400 block">Farm Name</span>
                    <p className="font-bold text-slate-800">{inspectedUser.farmName || "Not assigned"}</p>
                  </div>
                  <div>
                    <span className="text-3xs font-bold uppercase text-slate-400 block">Farm Physical Location</span>
                    <p className="font-medium text-slate-700">{inspectedUser.farmAddress || "Not specified"}</p>
                  </div>
                  <div>
                    <span className="text-3xs font-bold uppercase text-slate-400 block">Service Radius & Daily Capacity</span>
                    <p className="font-medium text-slate-700">
                      {inspectedUser.serviceRadiusKm ?? 25} km • {inspectedUser.maxDailyCapacityKg ?? 200} kg/day
                    </p>
                  </div>
                  <div>
                    <span className="text-3xs font-bold uppercase text-slate-400 block">Producer Reputation</span>
                    <p className="font-medium text-slate-700">
                      {inspectedUser.averageRating ?? 0} ★ ({inspectedUser.reviewCount ?? 0} verified reviews)
                    </p>
                  </div>
                </div>
                {inspectedUser.notes && (
                  <div className="pt-2 border-t border-amber-200/40 text-xs">
                    <span className="text-3xs font-bold uppercase text-slate-400 block">Producer Operations Notes</span>
                    <p className="text-slate-600 mt-0.5">{inspectedUser.notes}</p>
                  </div>
                )}
              </div>
            )}

            {(inspectedUser.role || "").includes("HOUSEHOLD") && (
              <div className="p-5 bg-blue-50/50 border border-blue-200/60 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <span>🏠</span>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                    Household Residence & Composting Profile
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-3xs font-bold uppercase text-slate-400 block">Registered Address</span>
                    <p className="font-medium text-slate-700">{inspectedUser.address || "Community Resident"}</p>
                  </div>
                  <div>
                    <span className="text-3xs font-bold uppercase text-slate-400 block">Participant Standing</span>
                    <p className="font-medium text-slate-700">
                      {inspectedUser.averageRating ?? 0} ★ ({inspectedUser.reviewCount ?? 0} collection audits)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(inspectedUser.role || "").includes("ADMIN") && (
              <div className="p-5 bg-purple-50/50 border border-purple-200/60 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span>🛡️</span>
                  <h4 className="font-bold uppercase tracking-wider text-purple-900">
                    System Administrator Privileges
                  </h4>
                </div>
                <p className="text-slate-600">
                  Full operator capabilities across decentralized token ledgers, dispute adjudication, user role configuration, and storage SPI diagnostics.
                </p>
              </div>
            )}

            {/* Quick Actions Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    handleOpenModifyRole(inspectedUser);
                  }}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <span>🔄</span>
                  <span>Modify Role</span>
                </button>

                {(inspectedUser.role || "").includes("HOUSEHOLD") && (
                  <>
                    <button
                      onClick={() => {
                        setConversionTargetUser(inspectedUser);
                        setFarmName(`${inspectedUser.name || "Community"}'s Farm`);
                        setFarmAddress(inspectedUser.address || "");
                        setConversionNotes("");
                        setConversionError(null);
                        setConversionSuccess(null);
                      }}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <span>🌾</span>
                      <span>Convert to Farmer</span>
                    </button>

                    <button
                      onClick={() => {
                        setAdjustTargetUser(inspectedUser);
                        setAdjustResult(null);
                        setAdjustError(null);
                        setAdjustAmount("10");
                        setAdjustReason("");
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <span>🪙</span>
                      <span>Adjust Tokens</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => handleToggleStatus(inspectedUser)}
                  disabled={inspectedUser.id === user?.id}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                    inspectedUser.id === user?.id
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : inspectedUser.enabled
                      ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                      : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                  }`}
                >
                  {inspectedUser.enabled ? "Disable Account" : "Enable Account"}
                </button>
              </div>

              <button
                onClick={() => setInspectedUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD NEW USER MODAL */}
      {/* ========================================================================= */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-emerald-600 block">
                  Identity Provisioning
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Add New Platform User
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Provision an authoritative account directly with chosen role and credentials.
                </p>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {addUserError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                ⚠️ {addUserError}
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Sharma"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. maya@example.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                  Initial Password <span className="text-slate-400">(Default: ecoNexus2026!)</span>
                </label>
                <input
                  type="text"
                  placeholder="Password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                  Platform Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as "ROLE_HOUSEHOLD" | "ROLE_FARMER" | "ROLE_ADMIN")}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white"
                >
                  <option value="ROLE_HOUSEHOLD">Household (Composter)</option>
                  <option value="ROLE_FARMER">Farmer (Agricultural Producer)</option>
                  <option value="ROLE_ADMIN">Administrator (Operator)</option>
                </select>
              </div>

              {addRole === "ROLE_HOUSEHOLD" && (
                <>
                  <div className="space-y-1">
                    <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                      Residential Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Apt 4B, Green Acres, Kochi"
                      value={addAddress}
                      onChange={(e) => setAddAddress(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                      Initial Token Grant (EcoTokens)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={addInitialTokens}
                      onChange={(e) => setAddInitialTokens(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                </>
              )}

              {addRole === "ROLE_FARMER" && (
                <>
                  <div className="space-y-1">
                    <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                      Farm Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sunrise Organic Farm"
                      value={addFarmName}
                      onChange={(e) => setAddFarmName(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                      Farm Address & Region <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Plot 12, Agri Hub, Aluva"
                      value={addFarmAddress}
                      onChange={(e) => setAddFarmAddress(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                      Producer Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Certified organic banana and ginger cultivation."
                      value={addNotes}
                      onChange={(e) => setAddNotes(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-emerald-500 focus:bg-white resize-none"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserMutation.isPending}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {createUserMutation.isPending ? "Creating Account..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MODIFY USER ROLE MODAL */}
      {/* ========================================================================= */}
      {modifyRoleUser && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-purple-600 block">
                  RBAC Reconfiguration
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Modify Role for User #{modifyRoleUser.id}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Reconfigure platform permissions and assign role-specific attributes.
                </p>
              </div>
              <button
                onClick={() => setModifyRoleUser(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Target User Info */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">
                Target User
              </span>
              <div className="text-xs font-bold text-slate-900">
                {modifyRoleUser.name || "Nameless User"} ({modifyRoleUser.email})
              </div>
              <div className="text-2xs text-purple-700 font-bold">
                Current Role: {formatRole(modifyRoleUser.role)}
              </div>
            </div>

            {modifyRoleError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                ⚠️ {modifyRoleError}
              </div>
            )}

            <form onSubmit={handleModifyRoleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                  New Role Target <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as "ROLE_HOUSEHOLD" | "ROLE_FARMER" | "ROLE_ADMIN")}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-purple-500 focus:bg-white"
                >
                  <option value="ROLE_HOUSEHOLD">Household (Composter)</option>
                  <option value="ROLE_FARMER">Farmer (Agricultural Producer)</option>
                  <option value="ROLE_ADMIN">Administrator (System Governance)</option>
                </select>
              </div>

              {targetRole === "ROLE_FARMER" && (
                <>
                  <div className="space-y-1">
                    <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                      Farm Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Green Valley Farm"
                      value={roleFarmName}
                      onChange={(e) => setRoleFarmName(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-500 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                      Farm Physical Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Agricultural Sector 4"
                      value={roleFarmAddress}
                      onChange={(e) => setRoleFarmAddress(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-500 focus:bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                      Operational Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Transitioned from household composter."
                      value={roleNotes}
                      onChange={(e) => setRoleNotes(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-500 focus:bg-white resize-none"
                    />
                  </div>
                </>
              )}

              {targetRole === "ROLE_HOUSEHOLD" && (
                <div className="space-y-1">
                  <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                    Residential Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Residential Street"
                    value={roleAddress}
                    onChange={(e) => setRoleAddress(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-500 focus:bg-white"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModifyRoleUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateRoleMutation.isPending}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {updateRoleMutation.isPending ? "Updating Role..." : "Confirm Role Change"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DIRECT CONVERT HOUSEHOLD TO FARMER */}
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
      {/* MODAL 4: TOKEN ADJUSTMENT MODAL */}
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
                  placeholder="e.g. Compensatory credit for verified on-site composting weight discrepancy."
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
      {/* MODAL 5: REJECT APPLICATION MODAL */}
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

      {/* ========================================================================= */}
      {/* MODAL 6: RESOLVE DISPUTE MODAL */}
      {/* ========================================================================= */}
      {disputeTargetOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-rose-600 block">
                  Dispute Adjudication
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Resolve Dispute for Order #{disputeTargetOrder.id}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Adjudicate consumer claim, specify resolution, and execute atomic escrow release or buyer refund.
                </p>
              </div>
              <button
                onClick={() => setDisputeTargetOrder(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Dispute Order Info */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <span className="text-3xs uppercase tracking-wider font-bold text-slate-400 block">
                Order Escrow
              </span>
              <div className="text-xs font-bold text-slate-900">
                Amount in Escrow: {disputeTargetOrder.totalTokens ?? 0} EcoTokens
              </div>
              {disputeTargetOrder.disputeReason && (
                <div className="text-2xs text-rose-700 mt-1">
                  <strong>Claim Reason: </strong> {disputeTargetOrder.disputeReason}
                </div>
              )}
            </div>

            {disputeError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                ⚠️ {disputeError}
              </div>
            )}

            <form onSubmit={handleDisputeSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                  Adjudication Verdict <span className="text-red-500">*</span>
                </label>
                <select
                  value={disputeResolution}
                  onChange={(e) => setDisputeResolution(e.target.value as "APPROVED_REFUND" | "DISMISSED")}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-rose-500 focus:bg-white"
                >
                  <option value="APPROVED_REFUND">Approve Full Refund to Buyer</option>
                  <option value="DISMISSED">Dismiss Claim & Release Escrow to Seller</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">
                  Administrative Notes / Justification
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Producer provided delivery photographic verification."
                  value={disputeAdminNotes}
                  onChange={(e) => setDisputeAdminNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-rose-500 focus:bg-white transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDisputeTargetOrder(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resolveDisputeMutation.isPending}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {resolveDisputeMutation.isPending ? "Executing Adjudication..." : "Apply Adjudication Verdict"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
