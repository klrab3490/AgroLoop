import React, { useState, useEffect } from "react";
import { desktopApiClient } from "../lib/api.js";
import type { FarmerApplicationApiResponse } from "@agroloop/api-types";

export const FarmerApplications: React.FC = () => {
  const [applications, setApplications] = useState<FarmerApplicationApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [rejectingApp, setRejectingApp] = useState<FarmerApplicationApiResponse | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");

  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await desktopApiClient.admin.listFarmerApplications();
      setApplications(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load farmer partner applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleApprove = async (id: number) => {
    if (id == null) return;
    if (!confirm("Are you sure you want to approve this household for Farmer Partner status? Their role will transition to ROLE_FARMER.")) {
      return;
    }
    setActionLoadingId(id);
    try {
      await desktopApiClient.admin.approveFarmerApplication(id);
      await fetchApplications();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to approve farmer application");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingApp?.id) return;

    setActionLoadingId(rejectingApp.id);
    try {
      await desktopApiClient.admin.rejectFarmerApplication(rejectingApp.id, rejectReason.trim() || undefined);
      setRejectingApp(null);
      setRejectReason("");
      await fetchApplications();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reject farmer application");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredApps = applications.filter((app) => {
    if (filter === "ALL") return true;
    return app.status === filter;
  });

  const pendingCount = applications.filter((a) => a.status === "PENDING").length;

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "-0.02em" }}>
            Farmer Partner Applications & Vetting
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            Review household conversion petitions, verify agronomic credentials, and grant producer privileges.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {pendingCount > 0 && (
            <span
              style={{
                padding: "6px 12px",
                borderRadius: "9999px",
                background: "rgba(245, 158, 11, 0.15)",
                color: "var(--accent-amber)",
                fontSize: "12px",
                fontWeight: "700",
                border: "1px solid rgba(245, 158, 11, 0.3)",
              }}
            >
              ⏳ {pendingCount} Pending Review
            </span>
          )}
          <button
            onClick={fetchApplications}
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
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px" }}>
        {(["PENDING", "APPROVED", "REJECTED", "ALL"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: "700",
              cursor: "pointer",
              background: filter === tab ? "var(--accent-emerald-dark)" : "var(--bg-card)",
              color: filter === tab ? "#ffffff" : "var(--text-muted)",
              border: `1px solid ${filter === tab ? "transparent" : "var(--border-subtle)"}`,
            }}
          >
            {tab}
          </button>
        ))}
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
          <p style={{ marginTop: "8px", fontWeight: "600" }}>Loading farmer applications...</p>
        </div>
      ) : filteredApps.length === 0 ? (
        <div
          style={{
            padding: "48px",
            textAlign: "center",
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "12px",
            color: "var(--text-muted)",
          }}
        >
          <p style={{ fontSize: "28px" }}>📋</p>
          <p style={{ fontSize: "14px", fontWeight: "600", marginTop: "8px" }}>No applications found in this state</p>
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
                <th style={{ padding: "12px 16px" }}>App ID</th>
                <th style={{ padding: "12px 16px" }}>Applicant / Household</th>
                <th style={{ padding: "12px 16px" }}>Farm Entity & Facility</th>
                <th style={{ padding: "12px 16px" }}>Date Submitted</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.map((app) => {
                const isPending = app.status === "PENDING";
                const isApproved = app.status === "APPROVED";
                const isRejected = app.status === "REJECTED";
                const isActioning = actionLoadingId === app.id;

                return (
                  <tr
                    key={app.id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      background: isPending ? "rgba(245, 158, 11, 0.03)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "var(--text-muted)" }}>
                      #{app.id}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>{app.userName}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>{app.userEmail} (User #{app.userId})</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: "700", color: "var(--accent-emerald)" }}>{app.farmName}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>📍 {app.farmAddress}</div>
                      {app.notes && (
                        <div style={{ color: "var(--text-secondary)", fontSize: "11px", fontStyle: "italic", marginTop: "4px" }}>
                          &ldquo;{app.notes}&rdquo;
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "11px" }}>
                      {new Date(app.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "700",
                          background: isPending
                            ? "rgba(245, 158, 11, 0.15)"
                            : isApproved
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(244, 63, 94, 0.15)",
                          color: isPending
                            ? "var(--accent-amber)"
                            : isApproved
                            ? "var(--accent-emerald)"
                            : "var(--accent-rose)",
                        }}
                      >
                        {app.status}
                      </span>
                      {app.rejectionReason && (
                        <div style={{ fontSize: "10px", color: "var(--accent-rose)", marginTop: "2px" }}>
                          Reason: {app.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      {isPending ? (
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => app.id && handleApprove(app.id)}
                            disabled={isActioning}
                            style={{
                              padding: "4px 10px",
                              background: "rgba(16, 185, 129, 0.15)",
                              color: "var(--accent-emerald)",
                              border: "1px solid rgba(16, 185, 129, 0.3)",
                              borderRadius: "6px",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            {isActioning ? "..." : "✓ Approve"}
                          </button>
                          <button
                            onClick={() => {
                              setRejectingApp(app);
                              setRejectReason("");
                            }}
                            disabled={isActioning}
                            style={{
                              padding: "4px 10px",
                              background: "rgba(244, 63, 94, 0.15)",
                              color: "var(--accent-rose)",
                              border: "1px solid rgba(244, 63, 94, 0.3)",
                              borderRadius: "6px",
                              fontWeight: "700",
                              cursor: "pointer",
                            }}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {app.reviewedAt ? `Reviewed ${new Date(app.reviewedAt).toLocaleDateString()}` : "Concluded"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingApp && (
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
            <h3 style={{ fontSize: "16px", fontWeight: "700" }}>Reject Farmer Application</h3>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              Provide a rationale for turning down {rejectingApp.userName}&apos;s farm proposal ({rejectingApp.farmName}).
            </p>

            <form onSubmit={handleReject} style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Rejection Reason (Optional notice to applicant)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Incomplete composting facilities or out of service area"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
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
                  onClick={() => setRejectingApp(null)}
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
                  disabled={actionLoadingId === rejectingApp.id}
                  style={{
                    padding: "8px 16px",
                    background: "var(--accent-rose)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
