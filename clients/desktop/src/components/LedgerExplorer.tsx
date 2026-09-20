import React, { useState, useEffect } from "react";
import { desktopApiClient } from "../lib/api.js";
import type { PageApiResponseEcoTokenTransactionApiResponse } from "@agroloop/api-types";

export const LedgerExplorer: React.FC = () => {
  const [pageData, setPageData] = useState<PageApiResponseEcoTokenTransactionApiResponse | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLedger = async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await desktopApiClient.admin.getLedger({ page: targetPage, size: pageSize });
      setPageData(data);
      setPage(targetPage);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load ledger transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger(0);
  }, []);

  const transactions = pageData?.content ?? [];
  const totalPages = pageData?.totalPages ?? 1;

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "-0.02em" }}>
            Immutable Double-Entry Ledger Explorer
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            Append-only, system-wide transaction ledger. Certified balance snapshots generated after every token mutation.
          </p>
        </div>
        <button
          onClick={() => fetchLedger(page)}
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

      {loading && !pageData ? (
        <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
          <p style={{ fontSize: "24px" }}>⏳</p>
          <p style={{ marginTop: "8px", fontWeight: "600" }}>Querying ledger records...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div style={{ padding: "48px", textAlign: "center", background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
          <p style={{ fontSize: "32px" }}>📜</p>
          <p style={{ marginTop: "8px", fontWeight: "700", color: "var(--text-primary)" }}>Ledger is currently empty</p>
        </div>
      ) : (
        <>
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
                  <th style={{ padding: "12px 16px" }}>TX ID</th>
                  <th style={{ padding: "12px 16px" }}>Timestamp</th>
                  <th style={{ padding: "12px 16px" }}>Household</th>
                  <th style={{ padding: "12px 16px" }}>Transaction Type</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Delta Amount</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Balance After</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const isCredit = tx.direction === "CREDIT" || (tx.amount ?? 0) > 0;
                  return (
                    <tr key={tx.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "var(--text-primary)" }}>
                        #{tx.id}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-muted)", fontSize: "11px" }}>
                        {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "—"}
                      </td>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                        #{tx.householdId ?? "System"}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: "700",
                            background:
                              tx.transactionType === "REWARD_MINTED"
                                ? "rgba(16, 185, 129, 0.15)"
                                : tx.transactionType === "MARKETPLACE_PURCHASE"
                                ? "rgba(168, 85, 247, 0.15)"
                                : tx.transactionType === "ORDER_REFUND"
                                ? "rgba(56, 189, 248, 0.15)"
                                : "rgba(245, 158, 11, 0.15)",
                            color:
                              tx.transactionType === "REWARD_MINTED"
                                ? "var(--accent-emerald)"
                                : tx.transactionType === "MARKETPLACE_PURCHASE"
                                ? "var(--accent-purple)"
                                : tx.transactionType === "ORDER_REFUND"
                                ? "var(--accent-blue)"
                                : "var(--accent-amber)",
                          }}
                        >
                          {tx.transactionType}
                        </span>
                        {tx.description && (
                          <div style={{ color: "var(--text-muted)", fontSize: "10px", marginTop: "2px" }}>
                            {tx.description}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontWeight: "700",
                          fontFamily: "monospace",
                          color: isCredit ? "var(--accent-emerald)" : "var(--accent-rose)",
                        }}
                      >
                        {isCredit ? "+" : "-"}{Math.abs(tx.amount ?? 0)}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontFamily: "monospace", color: "var(--text-primary)" }}>
                        {tx.balanceAfter} Tokens
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Page {page + 1} of {totalPages} ({pageData?.totalElements ?? 0} total entries)
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => fetchLedger(page - 1)}
                disabled={page <= 0 || loading}
                style={{
                  padding: "6px 12px",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "6px",
                  cursor: page <= 0 ? "not-allowed" : "pointer",
                  opacity: page <= 0 ? 0.5 : 1,
                }}
              >
                ← Previous
              </button>
              <button
                onClick={() => fetchLedger(page + 1)}
                disabled={page >= totalPages - 1 || loading}
                style={{
                  padding: "6px 12px",
                  background: "var(--bg-card)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "6px",
                  cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
                  opacity: page >= totalPages - 1 ? 0.5 : 1,
                }}
              >
                Next →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
