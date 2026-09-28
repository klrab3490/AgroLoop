import React, { useState, useEffect } from "react";
import { desktopApiClient } from "../lib/api.js";
import { formatRole } from "@agroloop/api-client";
import type { UserApiResponse, HouseholdBalanceResponse } from "@agroloop/api-types";

interface UserGovernanceProps {
  currentUserId?: number;
}

export const UserGovernance: React.FC<UserGovernanceProps> = ({ currentUserId }) => {
  const [users, setUsers] = useState<UserApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update user status");
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
            Manage platform participants, enforce account statuses with safety guards, and perform audit-locked token adjustments.
          </p>
        </div>
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
                <th style={{ padding: "12px 16px" }}>ID</th>
                <th style={{ padding: "12px 16px" }}>Name / Contact</th>
                <th style={{ padding: "12px 16px" }}>Role</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      background: isSelf ? "rgba(16, 185, 129, 0.04)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "var(--text-muted)" }}>
                      #{u.id}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>
                        {u.name || "Nameless User"} {isSelf && <span style={{ color: "var(--accent-emerald)" }}>(You)</span>}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>{u.email}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {(() => {
                        const displayRole = formatRole(u.role);
                        const isRoleAdmin = displayRole === "Admin";
                        const isRoleFarmer = displayRole === "Farmer";
                        return (
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
                        );
                      })()}
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
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        {u.role === "ROLE_HOUSEHOLD" && (
                          <button
                            onClick={() => {
                              setAdjustTargetUser(u);
                              setAdjustResult(null);
                              setAdjustError(null);
                            }}
                            style={{
                              padding: "4px 10px",
                              background: "rgba(16, 185, 129, 0.15)",
                              color: "var(--accent-emerald)",
                              border: "1px solid rgba(16, 185, 129, 0.3)",
                              borderRadius: "6px",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            Adjust Tokens
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={isSelf}
                          style={{
                            padding: "4px 10px",
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
                );
              })}
            </tbody>
          </table>
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
              <div
                style={{
                  padding: "16px",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid var(--accent-emerald)",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  textAlign: "center",
                }}
              >
                <p style={{ color: "var(--accent-emerald)", fontWeight: "700", fontSize: "14px" }}>
                  ✓ Adjustment Successfully Committed
                </p>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "4px" }}>
                  New Available Balance: <strong>{adjustResult.availableBalance} Tokens</strong>
                </p>
                <button
                  onClick={() => setAdjustTargetUser(null)}
                  style={{
                    marginTop: "12px",
                    padding: "6px 14px",
                    background: "var(--accent-emerald-dark)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleAdjustTokens} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Direction
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => setAdjustDirection("CREDIT")}
                      style={{
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px solid",
                        borderColor: adjustDirection === "CREDIT" ? "var(--accent-emerald)" : "var(--border-subtle)",
                        background: adjustDirection === "CREDIT" ? "rgba(16, 185, 129, 0.15)" : "transparent",
                        color: adjustDirection === "CREDIT" ? "var(--accent-emerald)" : "var(--text-muted)",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      + CREDIT (Grant)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustDirection("DEBIT")}
                      style={{
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px solid",
                        borderColor: adjustDirection === "DEBIT" ? "var(--accent-rose)" : "var(--border-subtle)",
                        background: adjustDirection === "DEBIT" ? "rgba(244, 63, 94, 0.15)" : "transparent",
                        color: adjustDirection === "DEBIT" ? "var(--accent-rose)" : "var(--text-muted)",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      - DEBIT (Revoke)
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                    Integer Amount (Whole Tokens)
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
                      fontFamily: "monospace",
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
