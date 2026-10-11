import React, { useState, useEffect } from "react";
import { desktopApiClient } from "../lib/api.js";
import { formatRole } from "@agroloop/api-client";
import type {
  UserApiResponse,
  HouseholdBalanceResponse,
  CreateUserApiRequest,
  UpdateUserRoleApiRequest,
} from "@agroloop/api-types";

interface UserGovernanceProps {
  currentUserId?: number;
}

export const UserGovernance: React.FC<UserGovernanceProps> = ({ currentUserId }) => {
  const [users, setUsers] = useState<UserApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User Details Inspection Modal
  const [inspectedUser, setInspectedUser] = useState<UserApiResponse | null>(null);

  // Expandable Accordion Rows under each User
  const [expandedUserIds, setExpandedUserIds] = useState<Set<number>>(new Set());

  const toggleExpandUser = (userId?: number) => {
    if (userId == null) return;
    setExpandedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

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
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserError, setAddUserError] = useState<string | null>(null);

  // Modify Role Modal State
  const [modifyRoleUser, setModifyRoleUser] = useState<UserApiResponse | null>(null);
  const [targetRole, setTargetRole] = useState<"ROLE_HOUSEHOLD" | "ROLE_FARMER" | "ROLE_ADMIN">("ROLE_HOUSEHOLD");
  const [roleAddress, setRoleAddress] = useState("");
  const [roleFarmName, setRoleFarmName] = useState("");
  const [roleFarmAddress, setRoleFarmAddress] = useState("");
  const [roleNotes, setRoleNotes] = useState("");
  const [modifyRoleLoading, setModifyRoleLoading] = useState(false);
  const [modifyRoleError, setModifyRoleError] = useState<string | null>(null);

  // Adjustment Modal State
  const [adjustTargetUser, setAdjustTargetUser] = useState<UserApiResponse | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("10");
  const [adjustDirection, setAdjustDirection] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustResult, setAdjustResult] = useState<HouseholdBalanceResponse | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await desktopApiClient.admin.listUsers();
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to retrieve user directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user: UserApiResponse) => {
    if (user.id == null) return;

    // Self-disable guard
    if (user.id === currentUserId) {
      alert("Safety Guard: You cannot disable your own active operator account.");
      return;
    }

    // Last-admin guard
    if (user.role === "ROLE_ADMIN" && user.enabled) {
      const activeAdmins = users.filter((u) => u.role === "ROLE_ADMIN" && u.enabled);
      if (activeAdmins.length <= 1) {
        alert("Safety Guard: Cannot disable the sole remaining active administrator account.");
        return;
      }
    }

    try {
      const updated = await desktopApiClient.admin.setUserStatus(user.id, !user.enabled);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      if (inspectedUser?.id === user.id) {
        setInspectedUser(updated);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update user status");
    }
  };

  const handleOpenModifyRole = (target: UserApiResponse) => {
    setModifyRoleUser(target);
    const initialRole = (target.role as "ROLE_HOUSEHOLD" | "ROLE_FARMER" | "ROLE_ADMIN") || "ROLE_HOUSEHOLD";
    setTargetRole(initialRole);
    setRoleAddress(target.address || "");
    setRoleFarmName(target.farmName || "");
    setRoleFarmAddress(target.farmAddress || "");
    setRoleNotes(target.notes || "");
    setModifyRoleError(null);
  };

  const handleModifyRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modifyRoleUser?.id) return;

    if (modifyRoleUser.id === currentUserId && targetRole !== "ROLE_ADMIN") {
      setModifyRoleError("Safety Guard: You cannot revoke administrator role from your currently active session.");
      return;
    }

    if (modifyRoleUser.role === "ROLE_ADMIN" && targetRole !== "ROLE_ADMIN") {
      const activeAdmins = users.filter((u) => u.role === "ROLE_ADMIN" && u.enabled);
      if (activeAdmins.length <= 1) {
        setModifyRoleError("Safety Guard: Cannot demote the sole remaining active administrator account.");
        return;
      }
    }

    setModifyRoleLoading(true);
    setModifyRoleError(null);

    const req: UpdateUserRoleApiRequest = {
      role: targetRole,
      address: targetRole === "ROLE_HOUSEHOLD" ? roleAddress.trim() || undefined : undefined,
      farmName: targetRole === "ROLE_FARMER" ? roleFarmName.trim() || undefined : undefined,
      farmAddress: targetRole === "ROLE_FARMER" ? roleFarmAddress.trim() || undefined : undefined,
      notes: roleNotes.trim() || undefined,
    };

    try {
      const updated = await desktopApiClient.admin.updateUserRole(modifyRoleUser.id, req);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      if (inspectedUser?.id === updated.id) {
        setInspectedUser(updated);
      }
      setModifyRoleUser(null);
    } catch (err: unknown) {
      setModifyRoleError(err instanceof Error ? err.message : "Failed to modify user role");
    } finally {
      setModifyRoleLoading(false);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserLoading(true);
    setAddUserError(null);

    const req: CreateUserApiRequest = {
      name: addName.trim(),
      email: addEmail.trim(),
      password: addPassword.trim() || undefined,
      role: addRole,
      address: addRole === "ROLE_HOUSEHOLD" ? addAddress.trim() || undefined : undefined,
      farmName: addRole === "ROLE_FARMER" ? addFarmName.trim() || undefined : undefined,
      farmAddress: addRole === "ROLE_FARMER" ? addFarmAddress.trim() || undefined : undefined,
      notes: addNotes.trim() || undefined,
      initialTokens: addRole === "ROLE_HOUSEHOLD" ? Math.max(0, parseInt(addInitialTokens || "0", 10)) : undefined,
    };

    try {
      const created = await desktopApiClient.admin.createUser(req);
      setUsers((prev) => [created, ...prev]);
      setIsAddUserModalOpen(false);
      setAddName("");
      setAddEmail("");
      setAddPassword("ecoNexus2026!");
      setAddAddress("");
      setAddFarmName("");
      setAddFarmAddress("");
      setAddNotes("");
      setAddInitialTokens("0");
    } catch (err: unknown) {
      setAddUserError(err instanceof Error ? err.message : "Failed to provision new user");
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleAdjustTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetUser?.id) return;

    const parsedAmount = parseInt(adjustAmount, 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setAdjustError("Amount must be a positive whole integer (no fractional tokens allowed).");
      return;
    }

    if (!adjustReason.trim()) {
      setAdjustError("A detailed administrative justification is required for audit logs.");
      return;
    }

    setAdjustLoading(true);
    setAdjustError(null);
    setAdjustResult(null);

    try {
      const res = await desktopApiClient.admin.adjustTokens(adjustTargetUser.id, {
        amount: parsedAmount,
        direction: adjustDirection,
        reason: adjustReason.trim(),
      });
      setAdjustResult(res);
      setAdjustReason("");
      // Update local user tokenBalance
      const updatedBalance = res.availableBalance ?? (res as any).balance;
      setUsers((prev) =>
        prev.map((u) => (u.id === adjustTargetUser.id ? { ...u, tokenBalance: updatedBalance } : u))
      );
      if (inspectedUser?.id === adjustTargetUser.id) {
        setInspectedUser((prev) => (prev ? { ...prev, tokenBalance: updatedBalance } : null));
      }
    } catch (err: unknown) {
      setAdjustError(err instanceof Error ? err.message : "Token adjustment failed. Pessimistic lock conflict.");
    } finally {
      setAdjustLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "-0.02em" }}>
            User Identity & Account Governance
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            Manage platform participants, inspect detailed profile telemetry, provision new accounts, and enforce role hierarchy.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => {
              setIsAddUserModalOpen(true);
              setAddUserError(null);
            }}
            style={{
              padding: "8px 16px",
              background: "var(--accent-emerald-dark)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            + Add User
          </button>
          <button
            onClick={fetchUsers}
            disabled={loading}
            style={{
              padding: "8px 16px",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            🔄 Refresh Directory
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "16px",
            background: "rgba(244, 63, 94, 0.1)",
            border: "1px solid var(--accent-rose)",
            color: "var(--accent-rose)",
            borderRadius: "12px",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
          <p style={{ fontSize: "24px" }}>⏳</p>
          <p style={{ marginTop: "8px", fontWeight: "600" }}>Loading user directory...</p>
        </div>
      ) : (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "12px" }}>
            <thead>
              <tr
                style={{
                  background: "var(--bg-surface)",
                  borderBottom: "1px solid var(--border-subtle)",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "0.05em",
                }}
              >
                <th style={{ padding: "12px 10px", width: "36px", textAlign: "center" }}></th>
                <th style={{ padding: "12px 14px" }}>ID</th>
                <th style={{ padding: "12px 16px" }}>Name / Contact</th>
                <th style={{ padding: "12px 16px" }}>Role</th>
                <th style={{ padding: "12px 16px" }}>Balance</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                const isExpanded = u.id != null && expandedUserIds.has(u.id);
                const displayRole = formatRole(u.role);
                const isRoleAdmin = displayRole === "Admin";
                const isRoleFarmer = displayRole === "Farmer";

                return (
                  <React.Fragment key={u.id}>
                    <tr
                      onClick={() => toggleExpandUser(u.id)}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        background: isExpanded
                          ? "rgba(16, 185, 129, 0.06)"
                          : isSelf
                          ? "rgba(16, 185, 129, 0.04)"
                          : "transparent",
                        cursor: "pointer",
                      }}
                    >
                      <td
                        style={{ padding: "12px 8px", textAlign: "center" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => toggleExpandUser(u.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: isExpanded ? "var(--accent-emerald)" : "var(--text-muted)",
                            cursor: "pointer",
                            fontSize: "11px",
                            padding: "4px",
                            transform: isExpanded ? "rotate(90deg)" : "none",
                            transition: "transform 0.15s ease",
                          }}
                          title={isExpanded ? "Collapse" : "Expand"}
                        >
                          ▶
                        </button>
                      </td>
                      <td style={{ padding: "12px 14px", fontFamily: "monospace", color: "var(--text-muted)" }}>
                        #{u.id}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>
                          {u.name || "Nameless User"} {isSelf && <span style={{ color: "var(--accent-emerald)" }}>(You)</span>}
                        </div>
                        <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>{u.email}</div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "11px",
                            fontWeight: "700",
                            background: isRoleAdmin
                              ? "rgba(168, 85, 247, 0.15)"
                              : isRoleFarmer
                              ? "rgba(245, 158, 11, 0.15)"
                              : "rgba(56, 189, 248, 0.15)",
                            color: isRoleAdmin
                              ? "var(--accent-purple)"
                              : isRoleFarmer
                              ? "var(--accent-amber)"
                              : "var(--accent-blue)",
                          }}
                        >
                          {displayRole}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: "700", color: "var(--accent-emerald)" }}>
                        {u.tokenBalance != null ? `${u.tokenBalance} 🪙` : "—"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "11px",
                            fontWeight: "600",
                            color: u.enabled ? "var(--accent-emerald)" : "var(--accent-rose)",
                          }}
                        >
                          <span
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background: u.enabled ? "var(--accent-emerald)" : "var(--accent-rose)",
                            }}
                          />
                          {u.enabled ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => toggleExpandUser(u.id)}
                            style={{
                              padding: "4px 8px",
                              background: isExpanded ? "var(--accent-emerald)" : "var(--bg-surface)",
                              color: isExpanded ? "#fff" : "var(--text-secondary)",
                              border: "1px solid var(--border-subtle)",
                              borderRadius: "6px",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            {isExpanded ? "▲ Hide" : "▼ Details"}
                          </button>
                          <button
                            onClick={() => handleOpenModifyRole(u)}
                            style={{
                              padding: "4px 8px",
                              background: "rgba(168, 85, 247, 0.12)",
                              color: "var(--accent-purple)",
                              border: "1px solid rgba(168, 85, 247, 0.3)",
                              borderRadius: "6px",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            Role
                          </button>
                          {u.role === "ROLE_HOUSEHOLD" && (
                            <button
                              onClick={() => {
                                setAdjustTargetUser(u);
                                setAdjustResult(null);
                                setAdjustError(null);
                              }}
                              style={{
                                padding: "4px 8px",
                                background: "rgba(16, 185, 129, 0.15)",
                                color: "var(--accent-emerald)",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                                borderRadius: "6px",
                                fontWeight: "600",
                                cursor: "pointer",
                              }}
                            >
                              Tokens
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isSelf}
                            style={{
                              padding: "4px 8px",
                              background: u.enabled ? "rgba(244, 63, 94, 0.15)" : "rgba(16, 185, 129, 0.15)",
                              color: u.enabled ? "var(--accent-rose)" : "var(--accent-emerald)",
                              border: `1px solid ${u.enabled ? "rgba(244, 63, 94, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
                              borderRadius: "6px",
                              fontWeight: "600",
                              cursor: isSelf ? "not-allowed" : "pointer",
                              opacity: isSelf ? 0.5 : 1,
                            }}
                          >
                            {u.enabled ? "Disable" : "Enable"}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Accordion Row Under Each User */}
                    {isExpanded && (
                      <tr style={{ background: "rgba(0, 0, 0, 0.2)", borderBottom: "1px solid var(--border-subtle)" }}>
                        <td colSpan={7} style={{ padding: "16px 24px" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                gap: "12px",
                              }}
                            >
                              <div
                                style={{
                                  background: "var(--bg-surface)",
                                  padding: "12px",
                                  borderRadius: "8px",
                                  border: "1px solid var(--border-subtle)",
                                }}
                              >
                                <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>
                                  📍 Address / Location
                                </span>
                                <div style={{ fontSize: "12px", color: "var(--text-primary)", marginTop: "4px", fontWeight: "500" }}>
                                  {u.farmAddress || u.address || "No address on file"}
                                </div>
                                {u.farmName && (
                                  <div style={{ fontSize: "11px", color: "var(--accent-amber)", marginTop: "2px" }}>
                                    Farm: <strong>{u.farmName}</strong>
                                  </div>
                                )}
                              </div>

                              <div
                                style={{
                                  background: "var(--bg-surface)",
                                  padding: "12px",
                                  borderRadius: "8px",
                                  border: "1px solid var(--border-subtle)",
                                }}
                              >
                                <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>
                                  ⭐ Reputation & Trust
                                </span>
                                <div style={{ fontSize: "12px", color: "var(--text-primary)", marginTop: "4px", fontWeight: "500" }}>
                                  {u.averageRating != null && u.averageRating > 0 ? `${u.averageRating.toFixed(1)} ★ Rating` : "New Participant"}
                                </div>
                                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                                  {u.reviewCount ?? 0} verified reviews
                                </div>
                              </div>

                              <div
                                style={{
                                  background: "var(--bg-surface)",
                                  padding: "12px",
                                  borderRadius: "8px",
                                  border: "1px solid var(--border-subtle)",
                                }}
                              >
                                <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>
                                  📝 Operations Notes
                                </span>
                                <div style={{ fontSize: "12px", color: "var(--text-primary)", marginTop: "4px" }}>
                                  {u.notes || (isRoleAdmin ? "Operator Account" : "None")}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                              <button
                                onClick={() => setInspectedUser(u)}
                                style={{
                                  padding: "4px 10px",
                                  background: "var(--bg-surface)",
                                  color: "var(--text-primary)",
                                  border: "1px solid var(--border-subtle)",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  cursor: "pointer",
                                  fontWeight: "600",
                                }}
                              >
                                Inspect in Modal ↗
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* User Details Modal */}
      {inspectedUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px",
              padding: "24px",
              width: "100%",
              maxWidth: "540px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "10px", fontWeight: "800", textTransform: "uppercase", color: "var(--accent-emerald)" }}>
                  Identity Details #{inspectedUser.id}
                </span>
                <h3 style={{ fontSize: "18px", fontWeight: "800", marginTop: "2px" }}>
                  {inspectedUser.name || "Nameless User"}
                </h3>
                <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{inspectedUser.email}</p>
              </div>
              <button
                onClick={() => setInspectedUser(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px" }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              <div style={{ background: "var(--bg-card)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>Role</span>
                <span style={{ fontSize: "12px", fontWeight: "700" }}>{formatRole(inspectedUser.role)}</span>
              </div>
              <div style={{ background: "var(--bg-card)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>Status</span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: inspectedUser.enabled ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                  {inspectedUser.enabled ? "Active" : "Disabled"}
                </span>
              </div>
              <div style={{ background: "var(--bg-card)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>Token Balance</span>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--accent-emerald)", fontFamily: "monospace" }}>
                  {inspectedUser.tokenBalance != null ? `${inspectedUser.tokenBalance} 🪙` : "0 🪙"}
                </span>
              </div>
              <div style={{ background: "var(--bg-card)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>Registered</span>
                <span style={{ fontSize: "12px", color: "var(--text-primary)" }}>
                  {inspectedUser.createdAt ? new Date(inspectedUser.createdAt).toLocaleDateString() : "Historical"}
                </span>
              </div>
            </div>

            {/* Role specific info */}
            {(inspectedUser.role || "").includes("FARMER") && (
              <div style={{ background: "rgba(245, 158, 11, 0.08)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(245, 158, 11, 0.2)", marginBottom: "16px" }}>
                <h4 style={{ fontSize: "11px", fontWeight: "700", color: "var(--accent-amber)", textTransform: "uppercase" }}>
                  🌾 Farm Operations Profile
                </h4>
                <div style={{ fontSize: "12px", marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <div><strong>Farm Name:</strong> {inspectedUser.farmName || "Not set"}</div>
                  <div><strong>Address:</strong> {inspectedUser.farmAddress || "Not set"}</div>
                  <div><strong>Radius & Capacity:</strong> {inspectedUser.serviceRadiusKm ?? 25} km • {inspectedUser.maxDailyCapacityKg ?? 200} kg/day</div>
                  <div><strong>Reputation:</strong> {inspectedUser.averageRating ?? 0} ★ ({inspectedUser.reviewCount ?? 0} reviews)</div>
                  {inspectedUser.notes && <div style={{ fontStyle: "italic", color: "var(--text-muted)" }}>&ldquo;{inspectedUser.notes}&rdquo;</div>}
                </div>
              </div>
            )}

            {(inspectedUser.role || "").includes("HOUSEHOLD") && (
              <div style={{ background: "rgba(56, 189, 248, 0.08)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(56, 189, 248, 0.2)", marginBottom: "16px" }}>
                <h4 style={{ fontSize: "11px", fontWeight: "700", color: "var(--accent-blue)", textTransform: "uppercase" }}>
                  🏠 Household Composting Profile
                </h4>
                <div style={{ fontSize: "12px", marginTop: "6px" }}>
                  <div><strong>Address:</strong> {inspectedUser.address || "Community Resident"}</div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setInspectedUser(null)}
                style={{
                  padding: "8px 16px",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px",
              padding: "24px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700" }}>+ Add New Platform User</h3>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px" }}
              >
                ×
              </button>
            </div>

            {addUserError && (
              <div style={{ padding: "10px", marginBottom: "14px", background: "rgba(244, 63, 94, 0.1)", border: "1px solid var(--accent-rose)", color: "var(--accent-rose)", borderRadius: "8px", fontSize: "12px" }}>
                {addUserError}
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Nair"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "12px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul@example.com"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "12px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>Password</label>
                <input
                  type="text"
                  placeholder="Default: ecoNexus2026!"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "12px", fontFamily: "monospace" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>Role *</label>
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as "ROLE_HOUSEHOLD" | "ROLE_FARMER" | "ROLE_ADMIN")}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "12px" }}
                >
                  <option value="ROLE_HOUSEHOLD">Household</option>
                  <option value="ROLE_FARMER">Farmer</option>
                  <option value="ROLE_ADMIN">Administrator</option>
                </select>
              </div>

              {addRole === "ROLE_HOUSEHOLD" && (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>Household Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Green Valley Apt 4B"
                      value={addAddress}
                      onChange={(e) => setAddAddress(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", background: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "12px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>Initial Token Balance</label>
                    <input
                      type="number"
                      min="0"
                      value={addInitialTokens}
                      onChange={(e) => setAddInitialTokens(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", background: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "12px" }}
                    />
                  </div>
                </>
              )}

              {addRole === "ROLE_FARMER" && (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>Farm Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sunrise Organic Acres"
                      value={addFarmName}
                      onChange={(e) => setAddFarmName(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", background: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "12px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>Farm Address *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rural Highway 10"
                      value={addFarmAddress}
                      onChange={(e) => setAddFarmAddress(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", background: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "12px" }}
                    />
                  </div>
                </>
              )}

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  style={{ padding: "8px 16px", background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addUserLoading}
                  style={{ padding: "8px 16px", background: "var(--accent-emerald-dark)", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}
                >
                  {addUserLoading ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modify Role Modal */}
      {modifyRoleUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px",
              padding: "24px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "700" }}>Modify Role for User #{modifyRoleUser.id}</h3>
                <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{modifyRoleUser.name || modifyRoleUser.email}</p>
              </div>
              <button
                onClick={() => setModifyRoleUser(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px" }}
              >
                ×
              </button>
            </div>

            {modifyRoleError && (
              <div style={{ padding: "10px", marginBottom: "14px", background: "rgba(244, 63, 94, 0.1)", border: "1px solid var(--accent-rose)", color: "var(--accent-rose)", borderRadius: "8px", fontSize: "12px" }}>
                {modifyRoleError}
              </div>
            )}

            <form onSubmit={handleModifyRoleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>Target Role *</label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as "ROLE_HOUSEHOLD" | "ROLE_FARMER" | "ROLE_ADMIN")}
                  style={{ width: "100%", padding: "8px 12px", background: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "12px" }}
                >
                  <option value="ROLE_HOUSEHOLD">Household</option>
                  <option value="ROLE_FARMER">Farmer</option>
                  <option value="ROLE_ADMIN">Administrator</option>
                </select>
              </div>

              {targetRole === "ROLE_FARMER" && (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>Farm Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Green Valley Farm"
                      value={roleFarmName}
                      onChange={(e) => setRoleFarmName(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", background: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "12px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>Farm Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Route 4, Agri Zone"
                      value={roleFarmAddress}
                      onChange={(e) => setRoleFarmAddress(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", background: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "12px" }}
                    />
                  </div>
                </>
              )}

              {targetRole === "ROLE_HOUSEHOLD" && (
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 124 Park Ave"
                    value={roleAddress}
                    onChange={(e) => setRoleAddress(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", background: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "12px" }}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setModifyRoleUser(null)}
                  style={{ padding: "8px 16px", background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modifyRoleLoading}
                  style={{ padding: "8px 16px", background: "var(--accent-purple)", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}
                >
                  {modifyRoleLoading ? "Updating..." : "Update Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Token Adjustment Modal */}
      {adjustTargetUser && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px",
              padding: "24px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "700" }}>Pessimistic Token Adjustment</h3>
                <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Target: {adjustTargetUser.name ?? adjustTargetUser.email} (Household #{adjustTargetUser.id})
                </p>
              </div>
              <button
                onClick={() => setAdjustTargetUser(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px" }}
              >
                ×
              </button>
            </div>

            {adjustError && (
              <div
                style={{
                  padding: "10px",
                  marginBottom: "16px",
                  background: "rgba(244, 63, 94, 0.1)",
                  border: "1px solid var(--accent-rose)",
                  color: "var(--accent-rose)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              >
                {adjustError}
              </div>
            )}

            {adjustResult ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <p style={{ fontSize: "36px" }}>✅</p>
                <h4 style={{ fontSize: "16px", fontWeight: "700", marginTop: "8px" }}>Balance Updated</h4>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                  New Settled Balance:{" "}
                  <strong style={{ color: "var(--accent-emerald)" }}>{adjustResult.availableBalance ?? (adjustResult as any).balance} EcoTokens</strong>
                </p>
                <button
                  onClick={() => setAdjustTargetUser(null)}
                  style={{
                    marginTop: "16px",
                    padding: "8px 16px",
                    background: "var(--bg-card)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleAdjustTokens} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Action Type
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setAdjustDirection("CREDIT")}
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-subtle)",
                        background: adjustDirection === "CREDIT" ? "rgba(16, 185, 129, 0.2)" : "transparent",
                        color: adjustDirection === "CREDIT" ? "var(--accent-emerald)" : "var(--text-muted)",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      Credit (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustDirection("DEBIT")}
                      style={{
                        flex: 1,
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-subtle)",
                        background: adjustDirection === "DEBIT" ? "rgba(244, 63, 94, 0.2)" : "transparent",
                        color: adjustDirection === "DEBIT" ? "var(--accent-rose)" : "var(--text-muted)",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      Debit (-)
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Token Amount (Integer)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "var(--bg-app)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Administrative Reason (Required for Audit Trail)
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Weigh-in scale calibration correction for ticket #892"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "var(--bg-app)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      color: "var(--text-primary)",
                      fontSize: "12px",
                    }}
                  />
                </div>

                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setAdjustTargetUser(null)}
                    style={{
                      padding: "8px 16px",
                      background: "transparent",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjustLoading}
                    style={{
                      padding: "8px 16px",
                      background: adjustDirection === "CREDIT" ? "var(--accent-emerald-dark)" : "var(--accent-rose)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    {adjustLoading ? "Locking Balance..." : "Commit Adjustment"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
