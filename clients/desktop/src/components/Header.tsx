import React, { useState } from "react";
import { desktopApiClient } from "../lib/api.js";
import type { UserApiResponse } from "@agroloop/api-types";

interface HeaderProps {
  currentUser: UserApiResponse | null;
  onUserChange: (user: UserApiResponse | null) => void;
  tauriActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onUserChange, tauriActive }) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState("admin@agroloop.local");
  const [password, setPassword] = useState("AdminSecure2026!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const authResponse = (await desktopApiClient.auth.login({
        email,
        password,
        clientType: "DESKTOP",
        deviceName: "AgroLoop Operator Console",
      })) as { user: UserApiResponse };
      onUserChange(authResponse.user);
      setShowLoginModal(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Operator authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await desktopApiClient.auth.logout();
    } catch {
      // Ignored
    }
    onUserChange(null);
  };

  return (
    <>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #059669, #0d9488)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
            }}
          >
            🛡️
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 style={{ fontSize: "16px", fontWeight: "800", letterSpacing: "-0.02em" }}>
                AgroLoop Operator Console
              </h1>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: tauriActive ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                  color: tauriActive ? "var(--accent-emerald)" : "var(--accent-amber)",
                  border: `1px solid ${tauriActive ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                }}
              >
                {tauriActive ? "Tauri v2 IPC • Keychain Active" : "Web Dev Sandbox Mode"}
              </span>
            </div>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
              Tier-1 Cryptographic Governance & Financial Solvency Hub
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {currentUser ? (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "12px", fontWeight: "700", display: "block" }}>
                  {currentUser.name ?? currentUser.email}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: "600",
                    color: "var(--accent-emerald)",
                    textTransform: "uppercase",
                  }}
                >
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  padding: "6px 12px",
                  background: "rgba(244, 63, 94, 0.15)",
                  color: "var(--accent-rose)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  borderRadius: "6px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Log Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              style={{
                padding: "8px 16px",
                background: "var(--accent-emerald-dark)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "700",
                cursor: "pointer",
              }}
            >
              Sign In as Operator
            </button>
          )}
        </div>
      </header>

      {/* Login Modal */}
      {showLoginModal && (
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
              maxWidth: "400px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "700" }}>Operator Authentication</h3>
              <button
                onClick={() => setShowLoginModal(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "18px" }}
              >
                ×
              </button>
            </div>

            {error && (
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
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Operator Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--bg-app)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Master Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--bg-app)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
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
                  disabled={loading}
                  style={{
                    padding: "8px 16px",
                    background: "var(--accent-emerald-dark)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  {loading ? "Authenticating..." : "Authorize Operator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
