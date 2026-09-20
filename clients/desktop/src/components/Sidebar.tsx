import React from "react";

export type AdminTab = "solvency" | "governance" | "disputes" | "ledger" | "fleet";

interface SidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const tabs: { id: AdminTab; label: string; icon: string; description: string }[] = [
    {
      id: "solvency",
      label: "Solvency Audit",
      icon: "⚖️",
      description: "Tier-1 & Tier-2 Financial Reconciliation",
    },
    {
      id: "governance",
      label: "User Governance",
      icon: "👥",
      description: "RBAC, Statuses, Token Adjustments",
    },
    {
      id: "disputes",
      label: "Marketplace & Disputes",
      icon: "🛒",
      description: "Dispute Mediation & Cancellations",
    },
    {
      id: "ledger",
      label: "Ledger Explorer",
      icon: "📜",
      description: "System-Wide Immutable Audit Trail",
    },
    {
      id: "fleet",
      label: "Fleet Logistics Telemetry",
      icon: "🚚",
      description: "Pickup Lifecycle & Regional Progression",
    },
  ];

  return (
    <aside
      style={{
        width: "260px",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        padding: "16px 12px",
        minHeight: "calc(100vh - 70px)",
      }}
    >
      <span
        style={{
          fontSize: "10px",
          fontWeight: "800",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--text-muted)",
          padding: "8px 12px",
        }}
      >
        Operations Modules
      </span>

      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              padding: "12px 14px",
              borderRadius: "10px",
              border: "1px solid",
              borderColor: isActive ? "rgba(16, 185, 129, 0.4)" : "transparent",
              background: isActive ? "rgba(16, 185, 129, 0.1)" : "transparent",
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              textAlign: "left",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span style={{ fontSize: "18px", lineHeight: 1 }}>{tab.icon}</span>
            <div>
              <span
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: isActive ? "700" : "600",
                  color: isActive ? "var(--accent-emerald)" : "var(--text-primary)",
                }}
              >
                {tab.label}
              </span>
              <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                {tab.description}
              </span>
            </div>
          </button>
        );
      })}

      <div
        style={{
          marginTop: "auto",
          padding: "12px",
          background: "var(--bg-app)",
          borderRadius: "10px",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--accent-blue)" }}>
          Cryptographic Invariants
        </span>
        <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
          Pessimistic locking (<code style={{ color: "var(--accent-emerald)" }}>PESSIMISTIC_WRITE</code>) strictly enforced on all token mutations.
        </p>
      </div>
    </aside>
  );
};
