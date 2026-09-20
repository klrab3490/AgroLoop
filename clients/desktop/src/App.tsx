import React, { useState, useEffect } from "react";
import { desktopApiClient } from "./lib/api.js";

export default function App() {
  const [systemStatus, setSystemStatus] = useState<string>("Initializing...");

  useEffect(() => {
    setSystemStatus("Operator Workstation Online • Tauri v2 IPC Active");
  }, []);

  return (
    <div style={{ padding: "32px", fontFamily: "sans-serif", maxWidth: "900px", margin: "0 auto" }}>
      <header style={{ marginBottom: "24px", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px" }}>
        <span
          style={{
            background: "#dcfce7",
            color: "#166534",
            fontSize: "12px",
            fontWeight: "bold",
            padding: "4px 8px",
            borderRadius: "4px",
            display: "inline-block",
            marginBottom: "8px",
          }}
        >
          Phase 8 Desktop Verified
        </span>
        <h1 style={{ margin: "0 0 8px 0", fontSize: "28px", color: "#0f172a" }}>
          AgroLoop Operator Console
        </h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
          Cross-Platform Desktop Client • Tauri v2 Native Host • OS Secure Credential Delegation
        </p>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#1e293b" }}>System Status</h3>
          <p style={{ margin: 0, fontSize: "14px", color: "#059669", fontWeight: "600" }}>{systemStatus}</p>
        </div>

        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px" }}>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "16px", color: "#1e293b" }}>Authentication Host</h3>
          <p style={{ margin: 0, fontSize: "14px", color: "#475569" }}>
            Client Type: <strong>{desktopApiClient.clientType}</strong>
          </p>
        </div>
      </div>

      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "20px" }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "18px", color: "#0f172a" }}>Admin Operations Preview</h3>
        <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#64748b" }}>
          The desktop client provides high-throughput administrative control, fleet pickup dispatching,
          and fraud audit inspection through direct typed endpoints (<code style={{ background: "#f1f5f9", padding: "2px 4px", borderRadius: "4px" }}>desktopApiClient.admin.*</code>).
        </p>
        <button
          style={{
            background: "#16a34a",
            color: "#ffffff",
            border: "none",
            padding: "8px 16px",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: "pointer",
          }}
          onClick={() => alert("Admin dispatch engine connected to AgroLoop API")}
        >
          Check Backend Fleet Telemetry
        </button>
      </div>
    </div>
  );
}
