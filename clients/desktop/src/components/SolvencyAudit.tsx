import React, { useState, useEffect } from "react";
import { desktopApiClient } from "../lib/api.js";
import type { SolvencyMetricsDto } from "@agroloop/api-types";

export const SolvencyAudit: React.FC = () => {
  const [metrics, setMetrics] = useState<SolvencyMetricsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastAuditTime, setLastAuditTime] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await desktopApiClient.admin.getSolvencyMetrics();
      setMetrics(data);
      setLastAuditTime(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch solvency audit metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "-0.02em" }}>
            Financial Solvency & Reserve Audit
          </h2>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
            Mathematical reconciliation between aggregate household wallet balances and system-wide immutable double-entry ledger.
          </p>
        </div>
        <button
          onClick={fetchMetrics}
          disabled={loading}
          style={{
            padding: "8px 16px",
            background: "var(--bg-card)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>🔄</span> {loading ? "Auditing Invariants..." : "Re-run Live Audit"}
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
          <strong>Audit Access Error:</strong> {error}
        </div>
      )}

      {loading && !metrics ? (
        <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
          <p style={{ fontSize: "24px" }}>⏳</p>
          <p style={{ marginTop: "8px", fontWeight: "600" }}>Reconciling double-entry ledger entries...</p>
        </div>
      ) : metrics ? (
        <>
          {/* Solvency Certification Banner */}
          <div
            style={{
              padding: "20px 24px",
              borderRadius: "16px",
              background: metrics.solvent
                ? "linear-gradient(135deg, rgba(5, 150, 105, 0.15), rgba(13, 148, 136, 0.15))"
                : "linear-gradient(135deg, rgba(244, 63, 94, 0.15), rgba(225, 29, 72, 0.15))",
              border: `1px solid ${metrics.solvent ? "var(--accent-emerald)" : "var(--accent-rose)"}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  background: metrics.solvent ? "var(--accent-emerald-dark)" : "var(--accent-rose)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  color: "#ffffff",
                }}
              >
                {metrics.solvent ? "✓" : "⚠️"}
              </div>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: "800", color: metrics.solvent ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                  {metrics.solvent ? "System 100% Mathematically Solvent" : "CRITICAL SOLVENCY DISCREPANCY DETECTED"}
                </h3>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                  {metrics.solvent
                    ? "Aggregate wallet balances match the exact sum of all historical credits minus debits. Zero token inflation or loss."
                    : "The double-entry ledger deviates from aggregate user balances. Review privileged transactions immediately."}
                </p>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: "700" }}>
                Last Certified
              </span>
              <span style={{ display: "block", fontSize: "13px", fontWeight: "700", fontFamily: "monospace" }}>
                {lastAuditTime ?? "Live"}
              </span>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "12px", padding: "18px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Total Household Balances (Tier 1)
              </span>
              <div style={{ fontSize: "28px", fontWeight: "900", fontFamily: "monospace", color: "var(--text-primary)", marginTop: "6px" }}>
                {metrics.totalHouseholdBalances?.toLocaleString() ?? 0}
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Sum of active account wallets</span>
            </div>

            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "12px", padding: "18px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Cumulative Credits (Tier 2)
              </span>
              <div style={{ fontSize: "28px", fontWeight: "900", fontFamily: "monospace", color: "var(--accent-emerald)", marginTop: "6px" }}>
                +{metrics.totalCredits?.toLocaleString() ?? 0}
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Rewards & admin grants</span>
            </div>

            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "12px", padding: "18px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Cumulative Debits (Tier 2)
              </span>
              <div style={{ fontSize: "28px", fontWeight: "900", fontFamily: "monospace", color: "var(--accent-rose)", marginTop: "6px" }}>
                -{metrics.totalDebits?.toLocaleString() ?? 0}
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Marketplace redemptions</span>
            </div>

            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "12px", padding: "18px" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
                Calculated Discrepancy
              </span>
              <div
                style={{
                  fontSize: "28px",
                  fontWeight: "900",
                  fontFamily: "monospace",
                  color: (metrics.discrepancy ?? 0) === 0 ? "var(--accent-emerald)" : "var(--accent-rose)",
                  marginTop: "6px",
                }}
              >
                {metrics.discrepancy ?? 0}
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Expected vs actual balance diff</span>
            </div>
          </div>

          {/* Mathematical Proof Card */}
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <h4 style={{ fontSize: "14px", fontWeight: "800", marginBottom: "12px" }}>
              Cryptographic Double-Entry Mathematical Invariant
            </h4>
            <div
              style={{
                fontFamily: "monospace",
                background: "var(--bg-app)",
                padding: "16px",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                fontSize: "13px",
                lineHeight: "1.8",
              }}
            >
              <div>Expected Balance = Total Credits ({metrics.totalCredits ?? 0}) - Total Debits ({metrics.totalDebits ?? 0}) = <strong>{metrics.expectedBalance ?? 0} Tokens</strong></div>
              <div>Actual Aggregate Wallets = <strong>{metrics.totalHouseholdBalances ?? 0} Tokens</strong></div>
              <div style={{ color: (metrics.discrepancy ?? 0) === 0 ? "var(--accent-emerald)" : "var(--accent-rose)" }}>
                Discrepancy Δ = Expected - Actual = <strong>{metrics.discrepancy ?? 0} Tokens ({metrics.solvent ? "PASSED" : "FAILED"})</strong>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
