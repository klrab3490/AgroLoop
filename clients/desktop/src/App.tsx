import React, { useState, useEffect } from "react";
import { Header } from "./components/Header.js";
import { Sidebar, type AdminTab } from "./components/Sidebar.js";
import { SolvencyAudit } from "./components/SolvencyAudit.js";
import { UserGovernance } from "./components/UserGovernance.js";
import { OrderDisputes } from "./components/OrderDisputes.js";
import { LedgerExplorer } from "./components/LedgerExplorer.js";
import { FleetDispatch } from "./components/FleetDispatch.js";
import { desktopApiClient } from "./lib/api.js";
import type { UserApiResponse } from "@agroloop/api-types";

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserApiResponse | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("solvency");
  const [tauriActive, setTauriActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isTauri = typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
    setTauriActive(isTauri);

    const checkSession = async () => {
      try {
        const me = await desktopApiClient.auth.me();
        setCurrentUser(me);
      } catch {
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg-app)" }}>
      <Header
        currentUser={currentUser}
        onUserChange={setCurrentUser}
        tauriActive={tauriActive}
      />

      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
          <p style={{ fontSize: "14px", fontWeight: "600" }}>Initializing Operator Workstation...</p>
        </div>
      ) : !currentUser ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div
            style={{
              maxWidth: "480px",
              width: "100%",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "16px",
              padding: "36px",
              textAlign: "center",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "16px",
                background: "linear-gradient(135deg, #059669, #0d9488)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
                margin: "0 auto 16px auto",
              }}
            >
              🛡️
            </div>
            <h2 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)" }}>
              Privileged Operator Access Required
            </h2>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", lineHeight: "1.6" }}>
              The AgroLoop Desktop Operations Console requires authenticated operator credentials with cryptographic keychain delegation.
            </p>
            <button
              onClick={() => {
                const headerBtn = document.querySelector("header button") as HTMLButtonElement;
                if (headerBtn) headerBtn.click();
              }}
              style={{
                marginTop: "24px",
                padding: "10px 24px",
                background: "var(--accent-emerald-dark)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Authenticate Operator Session ➔
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flex: 1 }}>
          <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <main style={{ flex: 1, overflowY: "auto" }}>
            {activeTab === "solvency" && <SolvencyAudit />}
            {activeTab === "governance" && <UserGovernance currentUserId={currentUser.id} />}
            {activeTab === "disputes" && <OrderDisputes />}
            {activeTab === "ledger" && <LedgerExplorer />}
            {activeTab === "fleet" && <FleetDispatch />}
          </main>
        </div>
      )}
    </div>
  );
}
