import React, { useState, useEffect } from "react";
import { desktopApiClient } from "../lib/api.js";
import type { OrderApiResponse } from "@agroloop/api-types";

export const OrderDisputes: React.FC = () => {
  const [orders, setOrders] = useState<OrderApiResponse[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dispute Action Modal State
  const [activeOrder, setActiveOrder] = useState<OrderApiResponse | null>(null);
  const [resolution, setResolution] = useState<"APPROVED_REFUND" | "DISMISSED">("APPROVED_REFUND");
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await desktopApiClient.admin.listOrders(
        filter === "ALL" ? undefined : { status: filter }
      );
      setOrders(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder?.id) return;

    setActionLoading(true);
    setActionError(null);

    try {
      const updated = await desktopApiClient.admin.resolveDispute(activeOrder.id, {
        resolution,
        adminNotes: adminNotes.trim() || undefined,
      });

      setOrders((prev) => prev.map((o) => (o.id === activeOrder.id ? updated : o)));
      setActiveOrder(null);
      setAdminNotes("");
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to resolve dispute");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "-0.02em" }}>
            Marketplace Orders & Dispute Mediation
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            Review customer orders, inspect disputes, and execute atomic token refund resolutions.
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "8px",
              color: "var(--text-primary)",
              fontSize: "12px",
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="DISPUTED">⚠️ Disputed Only</option>
            <option value="PENDING">Pending</option>
            <option value="FULFILLED">Fulfilled</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button
            onClick={fetchOrders}
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
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
          <p style={{ fontSize: "24px" }}>⏳</p>
          <p style={{ marginTop: "8px", fontWeight: "600" }}>Loading marketplace orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ padding: "48px", textAlign: "center", background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
          <p style={{ fontSize: "32px" }}>📦</p>
          <p style={{ marginTop: "8px", fontWeight: "700", color: "var(--text-primary)" }}>No orders match this filter</p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>Select another status or refresh the view.</p>
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
                <th style={{ padding: "12px 16px" }}>Order Ref</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Delivery Destination</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Total Tokens</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const isDisputed = o.status === "DISPUTED";
                return (
                  <tr
                    key={o.id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      background: isDisputed ? "rgba(244, 63, 94, 0.05)" : "transparent",
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontFamily: "monospace", fontWeight: "700", color: "var(--text-primary)" }}>
                        #{o.id}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>
                        {o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}
                      </div>
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
                            isDisputed
                              ? "rgba(244, 63, 94, 0.15)"
                              : o.status === "COMPLETED"
                              ? "rgba(16, 185, 129, 0.15)"
                              : "rgba(245, 158, 11, 0.15)",
                          color:
                            isDisputed
                              ? "var(--accent-rose)"
                              : o.status === "COMPLETED"
                              ? "var(--accent-emerald)"
                              : "var(--accent-amber)",
                        }}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                      {o.deliveryAddress || "Address on record"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: "700", fontFamily: "monospace", color: "var(--accent-emerald)" }}>
                      {o.totalTokens} Tokens
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      {isDisputed ? (
                        <button
                          onClick={() => {
                            setActiveOrder(o);
                            setActionError(null);
                          }}
                          style={{
                            padding: "6px 12px",
                            background: "var(--accent-rose)",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "700",
                            cursor: "pointer",
                          }}
                        >
                          Mediate Dispute ➔
                        </button>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>No action needed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Dispute Resolution Modal */}
      {activeOrder && (
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
                <h3 style={{ fontSize: "16px", fontWeight: "700" }}>Dispute Resolution</h3>
                <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  Order #{activeOrder.id} • Value: {activeOrder.totalTokens} EcoTokens
                </p>
              </div>
              <button
                onClick={() => setActiveOrder(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px" }}
              >
                ×
              </button>
            </div>

            {actionError && (
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
                {actionError}
              </div>
            )}

            <form onSubmit={handleResolveDispute} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Resolution Outcome
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setResolution("APPROVED_REFUND")}
                    style={{
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: resolution === "APPROVED_REFUND" ? "var(--accent-emerald)" : "var(--border-subtle)",
                      background: resolution === "APPROVED_REFUND" ? "rgba(16, 185, 129, 0.15)" : "transparent",
                      color: resolution === "APPROVED_REFUND" ? "var(--accent-emerald)" : "var(--text-muted)",
                      fontWeight: "700",
                      cursor: "pointer",
                      fontSize: "11px",
                    }}
                  >
                    ✓ APPROVE REFUND
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolution("DISMISSED")}
                    style={{
                      padding: "8px",
                      borderRadius: "8px",
                      border: "1px solid",
                      borderColor: resolution === "DISMISSED" ? "var(--accent-rose)" : "var(--border-subtle)",
                      background: resolution === "DISMISSED" ? "rgba(244, 63, 94, 0.15)" : "transparent",
                      color: resolution === "DISMISSED" ? "var(--accent-rose)" : "var(--text-muted)",
                      fontWeight: "700",
                      cursor: "pointer",
                      fontSize: "11px",
                    }}
                  >
                    ✕ DISMISS CLAIM
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Administrative Finding & Notes
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain resolution findings for merchant and customer record..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
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
                  onClick={() => setActiveOrder(null)}
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
                  disabled={actionLoading}
                  style={{
                    padding: "8px 16px",
                    background: resolution === "APPROVED_REFUND" ? "var(--accent-emerald-dark)" : "var(--accent-rose)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  {actionLoading ? "Executing Atomic Mutation..." : "Execute Resolution"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
