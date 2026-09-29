import React, { useState, useEffect } from "react";
import { desktopApiClient } from "../lib/api.js";
import type { PickupRequestApiResponse } from "@agroloop/api-types";

export const FleetDispatch: React.FC = () => {
  const [pickups, setPickups] = useState<PickupRequestApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("ALL");

  const fetchFleet = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await desktopApiClient.pickups.listPickups();
      setPickups(data ?? []);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to load fleet logistics telemetry";
      setError(errMsg);
      setPickups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleet();
  }, []);

  const isQueued = (status?: string) => status === "SUBMITTED" || status === "REQUESTED";
  const isClaimed = (status?: string) => status === "CLAIMED" || status === "ASSIGNED";
  const isScheduled = (status?: string) => status === "SCHEDULED";
  const isCollected = (status?: string) => status === "COLLECTED";
  const isVerified = (status?: string) => status === "VERIFIED";
  const isCancelled = (status?: string) => status === "CANCELLED";

  const total = pickups.length;
  const queued = pickups.filter((p) => isQueued(p.status)).length;
  const claimed = pickups.filter((p) => isClaimed(p.status)).length;
  const scheduled = pickups.filter((p) => isScheduled(p.status)).length;
  const collected = pickups.filter((p) => isCollected(p.status)).length;
  const verified = pickups.filter((p) => isVerified(p.status)).length;
  const cancelled = pickups.filter((p) => isCancelled(p.status)).length;

  const filteredPickups = pickups.filter((p) => {
    if (selectedStatusFilter === "ALL") return true;
    if (selectedStatusFilter === "QUEUED") return isQueued(p.status);
    if (selectedStatusFilter === "CLAIMED") return isClaimed(p.status);
    if (selectedStatusFilter === "SCHEDULED") return isScheduled(p.status);
    if (selectedStatusFilter === "COLLECTED") return isCollected(p.status);
    if (selectedStatusFilter === "VERIFIED") return isVerified(p.status);
    if (selectedStatusFilter === "CANCELLED") return isCancelled(p.status);
    return true;
  });

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "-0.02em" }}>
              Fleet Logistics & Route Telemetry
            </h2>
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            Real-time operations monitor for regional organic collection routes, farmer assignments, and QR handshake progress.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => fetchFleet()}
            disabled={loading}
            style={{
              padding: "8px 14px",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              fontWeight: "700",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            🔄 Refresh
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => fetchFleet()}
            style={{
              marginLeft: "12px",
              padding: "4px 10px",
              background: "var(--accent-rose)",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "700",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Logistics Status Pipeline Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
        <div
          onClick={() => setSelectedStatusFilter("ALL")}
          style={{
            background: "var(--bg-card)",
            border: selectedStatusFilter === "ALL" ? "2px solid var(--accent-emerald)" : "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "14px",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>Total Routes</span>
          <div style={{ fontSize: "24px", fontWeight: "900", fontFamily: "monospace", color: "var(--text-primary)", marginTop: "4px" }}>{total}</div>
        </div>
        <div
          onClick={() => setSelectedStatusFilter("QUEUED")}
          style={{
            background: "var(--bg-card)",
            border: selectedStatusFilter === "QUEUED" ? "2px solid var(--text-secondary)" : "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "14px",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>Queued</span>
          <div style={{ fontSize: "24px", fontWeight: "900", fontFamily: "monospace", color: "var(--text-secondary)", marginTop: "4px" }}>{queued}</div>
        </div>
        <div
          onClick={() => setSelectedStatusFilter("CLAIMED")}
          style={{
            background: "var(--bg-card)",
            border: selectedStatusFilter === "CLAIMED" ? "2px solid var(--accent-purple)" : "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "14px",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--accent-purple)" }}>Claimed</span>
          <div style={{ fontSize: "24px", fontWeight: "900", fontFamily: "monospace", color: "var(--accent-purple)", marginTop: "4px" }}>{claimed}</div>
        </div>
        <div
          onClick={() => setSelectedStatusFilter("SCHEDULED")}
          style={{
            background: "var(--bg-card)",
            border: selectedStatusFilter === "SCHEDULED" ? "2px solid var(--accent-amber)" : "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "14px",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--accent-amber)" }}>Scheduled</span>
          <div style={{ fontSize: "24px", fontWeight: "900", fontFamily: "monospace", color: "var(--accent-amber)", marginTop: "4px" }}>{scheduled}</div>
        </div>
        <div
          onClick={() => setSelectedStatusFilter("COLLECTED")}
          style={{
            background: "var(--bg-card)",
            border: selectedStatusFilter === "COLLECTED" ? "2px solid var(--accent-blue)" : "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "14px",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--accent-blue)" }}>Collected</span>
          <div style={{ fontSize: "24px", fontWeight: "900", fontFamily: "monospace", color: "var(--accent-blue)", marginTop: "4px" }}>{collected}</div>
        </div>
        <div
          onClick={() => setSelectedStatusFilter("VERIFIED")}
          style={{
            background: "var(--bg-card)",
            border: selectedStatusFilter === "VERIFIED" ? "2px solid var(--accent-emerald)" : "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "14px",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--accent-emerald)" }}>Verified</span>
          <div style={{ fontSize: "24px", fontWeight: "900", fontFamily: "monospace", color: "var(--accent-emerald)", marginTop: "4px" }}>{verified}</div>
        </div>
        <div
          onClick={() => setSelectedStatusFilter("CANCELLED")}
          style={{
            background: "var(--bg-card)",
            border: selectedStatusFilter === "CANCELLED" ? "2px solid var(--accent-rose)" : "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "14px",
            cursor: "pointer",
          }}
        >
          <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--accent-rose)" }}>Cancelled</span>
          <div style={{ fontSize: "24px", fontWeight: "900", fontFamily: "monospace", color: "var(--accent-rose)", marginTop: "4px" }}>{cancelled}</div>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "11px", fontWeight: "700", color: "var(--text-muted)", marginRight: "4px" }}>Filter:</span>
        {["ALL", "QUEUED", "CLAIMED", "SCHEDULED", "COLLECTED", "VERIFIED", "CANCELLED"].map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatusFilter(status)}
            style={{
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: "700",
              cursor: "pointer",
              border: "1px solid var(--border-subtle)",
              background: selectedStatusFilter === status ? "var(--text-primary)" : "var(--bg-card)",
              color: selectedStatusFilter === status ? "var(--bg-primary)" : "var(--text-secondary)",
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
          <p style={{ fontSize: "24px" }}>⏳</p>
          <p style={{ marginTop: "8px", fontWeight: "600" }}>Querying telemetry from regional dispatchers...</p>
        </div>
      ) : filteredPickups.length === 0 ? (
        <div style={{ padding: "48px", textAlign: "center", background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
          <p style={{ fontSize: "32px" }}>🚚</p>
          <p style={{ marginTop: "8px", fontWeight: "700", color: "var(--text-primary)" }}>No pickup operations match filter "{selectedStatusFilter}"</p>
          <button
            onClick={() => setSelectedStatusFilter("ALL")}
            style={{
              marginTop: "12px",
              padding: "6px 14px",
              background: "var(--bg-surface)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              fontSize: "11px",
              cursor: "pointer",
            }}
          >
            Clear Filter
          </button>
        </div>
      ) : (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "12px", overflow: "hidden" }}>
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
                <th style={{ padding: "12px 16px" }}>Route ID</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Household & Address</th>
                <th style={{ padding: "12px 16px" }}>Assigned Farmer</th>
                <th style={{ padding: "12px 16px" }}>Scheduled Time</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Handshake / Reward</th>
              </tr>
            </thead>
            <tbody>
              {filteredPickups.map((p) => {
                const statusStr = p.status ?? "";
                const isItemVerified = isVerified(statusStr);
                const isItemCollected = isCollected(statusStr);
                const isItemScheduled = isScheduled(statusStr);
                const isItemClaimed = isClaimed(statusStr);
                const isItemCancelled = isCancelled(statusStr);

                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: "700", color: "var(--text-primary)" }}>
                      #{p.id}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          background: isItemVerified
                            ? "rgba(16, 185, 129, 0.15)"
                            : isItemCollected
                            ? "rgba(56, 189, 248, 0.15)"
                            : isItemScheduled
                            ? "rgba(245, 158, 11, 0.15)"
                            : isItemClaimed
                            ? "rgba(168, 85, 247, 0.15)"
                            : isItemCancelled
                            ? "rgba(244, 63, 94, 0.15)"
                            : "rgba(148, 163, 184, 0.15)",
                          color: isItemVerified
                            ? "var(--accent-emerald)"
                            : isItemCollected
                            ? "var(--accent-blue)"
                            : isItemScheduled
                            ? "var(--accent-amber)"
                            : isItemClaimed
                            ? "var(--accent-purple)"
                            : isItemCancelled
                            ? "var(--accent-rose)"
                            : "var(--text-secondary)",
                        }}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {p.householdName && (
                        <div style={{ fontWeight: "700", color: "var(--text-primary)", fontSize: "11px" }}>
                          🏠 {p.householdName}
                        </div>
                      )}
                      <div style={{ color: "var(--text-secondary)", fontSize: "11px", marginTop: "2px" }}>
                        {p.pickupAddress || "Registered Doorstep"}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                      {p.assignedFarmerName ? (
                        <span>🧑‍🌾 {p.assignedFarmerName}</span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "11px" }}>
                      {p.scheduledTime ? (
                        <span>🕒 {new Date(p.scheduledTime).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      ) : isItemCancelled ? (
                        <span style={{ color: "var(--accent-rose)" }}>Cancelled</span>
                      ) : (
                        <span>Pending Scheduling</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      {p.verification ? (
                        <div>
                          <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--accent-emerald)" }}>
                            +{p.verification.tokensAwarded ?? 0} ECO
                          </span>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                            {p.verification.qualityGrade} ({p.verification.verifiedWeight ?? 0} kg)
                          </div>
                        </div>
                      ) : (
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: p.handshakeVerified ? "var(--accent-emerald)" : "var(--text-muted)",
                          }}
                        >
                          {p.handshakeVerified ? "✓ Verified QR" : "○ Pending QR"}
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
    </div>
  );
};

