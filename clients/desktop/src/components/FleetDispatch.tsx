import React, { useState, useEffect } from "react";
import { desktopApiClient } from "../lib/api.js";
import type { PickupRequestApiResponse } from "@agroloop/api-types";

export const FleetDispatch: React.FC = () => {
  const [pickups, setPickups] = useState<PickupRequestApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFleet = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await desktopApiClient.pickups.listPickups();
      setPickups(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load fleet logistics telemetry");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleet();
  }, []);

  const total = pickups.length;
  const queued = pickups.filter((p) => p.status === "SUBMITTED").length;
  const claimed = pickups.filter((p) => p.status === "CLAIMED").length;
  const scheduled = pickups.filter((p) => p.status === "SCHEDULED").length;
  const collected = pickups.filter((p) => p.status === "COLLECTED").length;
  const verified = pickups.filter((p) => p.status === "VERIFIED").length;

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "-0.02em" }}>
            Fleet Logistics & Route Telemetry
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            Real-time operations monitor for regional organic collection routes, farmer assignments, and QR handshake progress.
          </p>
        </div>
        <button
          onClick={fetchFleet}
          disabled={loading}
          style={{
            padding: "8px 14px",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          🔄 Refresh Fleet
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

      {/* Logistics Status Pipeline */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "14px" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>Total Routes</span>
          <div style={{ fontSize: "24px", fontWeight: "900", fontFamily: "monospace", color: "var(--text-primary)", marginTop: "4px" }}>{total}</div>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "14px" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>Queued</span>
          <div style={{ fontSize: "24px", fontWeight: "900", fontFamily: "monospace", color: "var(--text-secondary)", marginTop: "4px" }}>{queued}</div>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "14px" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--accent-purple)" }}>Claimed</span>
          <div style={{ fontSize: "24px", fontWeight: "900", fontFamily: "monospace", color: "var(--accent-purple)", marginTop: "4px" }}>{claimed}</div>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "14px" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--accent-amber)" }}>Scheduled</span>
          <div style={{ fontSize: "24px", fontWeight: "900", fontFamily: "monospace", color: "var(--accent-amber)", marginTop: "4px" }}>{scheduled}</div>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "14px" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--accent-blue)" }}>Collected</span>
          <div style={{ fontSize: "24px", fontWeight: "900", fontFamily: "monospace", color: "var(--accent-blue)", marginTop: "4px" }}>{collected}</div>
        </div>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "14px" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--accent-emerald)" }}>Verified</span>
          <div style={{ fontSize: "24px", fontWeight: "900", fontFamily: "monospace", color: "var(--accent-emerald)", marginTop: "4px" }}>{verified}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
          <p style={{ fontSize: "24px" }}>⏳</p>
          <p style={{ marginTop: "8px", fontWeight: "600" }}>Querying telemetry from regional dispatchers...</p>
        </div>
      ) : pickups.length === 0 ? (
        <div style={{ padding: "48px", textAlign: "center", background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
          <p style={{ fontSize: "32px" }}>🚚</p>
          <p style={{ marginTop: "8px", fontWeight: "700", color: "var(--text-primary)" }}>No active pickup operations</p>
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
                <th style={{ padding: "12px 16px" }}>Collection Address</th>
                <th style={{ padding: "12px 16px" }}>Assigned Farmer</th>
                <th style={{ padding: "12px 16px" }}>Scheduled Time</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Handshake Status</th>
              </tr>
            </thead>
            <tbody>
              {pickups.map((p) => (
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
                        background:
                          p.status === "VERIFIED"
                            ? "rgba(16, 185, 129, 0.15)"
                            : p.status === "COLLECTED"
                            ? "rgba(56, 189, 248, 0.15)"
                            : p.status === "SCHEDULED"
                            ? "rgba(245, 158, 11, 0.15)"
                            : "rgba(168, 85, 247, 0.15)",
                        color:
                          p.status === "VERIFIED"
                            ? "var(--accent-emerald)"
                            : p.status === "COLLECTED"
                            ? "var(--accent-blue)"
                            : p.status === "SCHEDULED"
                            ? "var(--accent-amber)"
                            : "var(--accent-purple)",
                      }}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                    {p.pickupAddress || "Registered Doorstep"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                    {p.assignedFarmerName ? (
                      <span>🧑‍🌾 {p.assignedFarmerName}</span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Unassigned</span>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "11px" }}>
                    {p.scheduledTime ? new Date(p.scheduledTime).toLocaleString() : "Pending Scheduling"}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        color: p.handshakeVerified ? "var(--accent-emerald)" : "var(--text-muted)",
                      }}
                    >
                      {p.handshakeVerified ? "✓ Verified" : "○ Pending QR"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
