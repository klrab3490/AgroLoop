import React, { useState, useEffect } from "react";
import {
  getServerProfiles,
  getActiveServerProfile,
  addServerProfile,
  deleteServerProfile,
  updateServerProfile,
  type DesktopServerProfile,
} from "../storage/server-config.js";
import { switchDesktopServer } from "../lib/api.js";
import { verifyServer } from "@agroloop/api-client";

interface ServerManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServerSwitched: (profile: DesktopServerProfile) => void;
}

export const ServerManagerModal: React.FC<ServerManagerModalProps> = ({
  isOpen,
  onClose,
  onServerSwitched,
}) => {
  const [profiles, setProfiles] = useState<DesktopServerProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<DesktopServerProfile | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [switching, setSwitching] = useState<boolean>(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New server form
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>("");
  const [newUrl, setNewUrl] = useState<string>("");
  const [adding, setAdding] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      refreshProfiles();
    }
  }, [isOpen]);

  const refreshProfiles = () => {
    const loaded = getServerProfiles();
    const active = getActiveServerProfile();
    setProfiles(loaded);
    setActiveProfile(active);
    setSelectedId(active.id);
    setError(null);
    setSuccessMsg(null);
  };

  if (!isOpen) return null;

  const handleTestProfile = async (profile: DesktopServerProfile) => {
    setTestingId(profile.id);
    setError(null);
    try {
      const res = await verifyServer(profile.url, { clientVersion: "1.0.0" });
      if (res.ok) {
        updateServerProfile(profile.id, {
          status: "connected",
          latencyMs: res.latencyMs,
          lastConnected: new Date().toISOString(),
        });
      } else {
        updateServerProfile(profile.id, {
          status: "offline",
        });
        setError(`${profile.name}: ${res.message}`);
      }
      refreshProfiles();
    } catch (err: any) {
      setError(err?.message || "Verification failed");
    } finally {
      setTestingId(null);
    }
  };

  const handleSwitchServer = async () => {
    const target = profiles.find((p) => p.id === selectedId);
    if (!target) return;

    setSwitching(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await switchDesktopServer(target);
      if (result.ok) {
        setSuccessMsg(`Successfully connected to ${target.name} (${result.latencyMs} ms)`);
        refreshProfiles();
        onServerSwitched(target);
      } else {
        setError(`Failed to connect to ${target.name}: ${result.message}`);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to switch server");
    } finally {
      setSwitching(false);
    }
  };

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl.trim()) return;

    setAdding(true);
    setError(null);

    try {
      const res = await verifyServer(newUrl.trim(), { clientVersion: "1.0.0" });
      if (!res.ok) {
        setError(`Server verification rejected: ${res.message}`);
        setAdding(false);
        return;
      }

      const created = addServerProfile(newName || "Custom Server", res.url);
      updateServerProfile(created.id, {
        status: "connected",
        latencyMs: res.latencyMs,
      });

      setNewName("");
      setNewUrl("");
      setShowAddForm(false);
      refreshProfiles();
      setSelectedId(created.id);
      setSuccessMsg(`Server "${created.name}" verified and added.`);
    } catch (err: any) {
      setError(err?.message || "Failed to add server");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Remove server profile "${name}"?`)) {
      try {
        deleteServerProfile(id);
        refreshProfiles();
      } catch (err: any) {
        setError(err?.message);
      }
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "580px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>
              Server Manager
            </h2>
            <p style={{ fontSize: "12px", margin: "4px 0 0", color: "var(--text-muted)" }}>
              Select, verify, and switch authoritative AgroLoop server environments
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "20px",
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            ×
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && (
            <div
              style={{
                backgroundColor: "rgba(220, 38, 38, 0.15)",
                border: "1px solid #dc2626",
                color: "#f87171",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                backgroundColor: "rgba(16, 185, 129, 0.15)",
                border: "1px solid #059669",
                color: "#34d399",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "13px",
              }}
            >
              {successMsg}
            </div>
          )}

          {/* Profile List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {profiles.map((p) => {
              const isActive = activeProfile?.id === p.id;
              const isSelected = selectedId === p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    border: `1px solid ${isSelected ? "#10b981" : "var(--border-subtle)"}`,
                    backgroundColor: isSelected ? "rgba(16, 185, 129, 0.05)" : "var(--bg-surface)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <input
                      type="radio"
                      name="selectedServer"
                      checked={isSelected}
                      onChange={() => setSelectedId(p.id)}
                      style={{ cursor: "pointer", accentColor: "#10b981" }}
                    />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                          {p.name}
                        </span>
                        {isActive && (
                          <span
                            style={{
                              backgroundColor: "#065f46",
                              color: "#a7f3d0",
                              fontSize: "10px",
                              fontWeight: "700",
                              padding: "2px 6px",
                              borderRadius: "6px",
                              textTransform: "uppercase",
                            }}
                          >
                            Active
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                        {p.url}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                        {p.status === "connected" ? (
                          <span style={{ color: "#34d399" }}>
                            ● Connected · {p.latencyMs ? `${p.latencyMs} ms` : "OK"}
                          </span>
                        ) : p.status === "offline" ? (
                          <span style={{ color: "#f87171" }}>○ Offline</span>
                        ) : (
                          <span style={{ color: "#9ca3af" }}>○ Not tested</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      disabled={testingId === p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestProfile(p);
                      }}
                      style={{
                        padding: "6px 10px",
                        fontSize: "12px",
                        fontWeight: "600",
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "6px",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                      }}
                    >
                      {testingId === p.id ? "Probing..." : "Test"}
                    </button>
                    {profiles.length > 1 && !isActive && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p.id, p.name);
                        }}
                        style={{
                          padding: "6px 10px",
                          fontSize: "12px",
                          backgroundColor: "transparent",
                          border: "1px solid transparent",
                          borderRadius: "6px",
                          color: "#f87171",
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Server Section */}
          {!showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              style={{
                padding: "10px",
                border: "1px dashed var(--border-subtle)",
                borderRadius: "8px",
                background: "transparent",
                color: "#10b981",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              + Add Server Profile
            </button>
          ) : (
            <form
              onSubmit={handleAddServer}
              style={{
                backgroundColor: "var(--bg-surface)",
                padding: "16px",
                borderRadius: "10px",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                Add New Server
              </h4>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Server Label
                </label>
                <input
                  type="text"
                  placeholder="e.g. Staging Server or Localhost"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Server URL
                </label>
                <input
                  type="text"
                  placeholder="https://api.example.com or http://localhost:8080"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "transparent",
                    color: "var(--text-muted)",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding || !newUrl.trim()}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#10b981",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    opacity: adding ? 0.6 : 1,
                  }}
                >
                  {adding ? "Testing & Adding..." : "Verify & Add"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            Note: Switching servers resets local session tokens for security.
          </span>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "transparent",
                color: "var(--text-muted)",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSwitchServer}
              disabled={switching || selectedId === activeProfile?.id}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#10b981",
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: "700",
                cursor: "pointer",
                opacity: switching || selectedId === activeProfile?.id ? 0.5 : 1,
              }}
            >
              {switching ? "Switching..." : "Connect to Selected"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
