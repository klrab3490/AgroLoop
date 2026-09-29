import React, { useState, useEffect } from "react";
import { checkLatestRelease, CURRENT_PLATFORM_VERSION, type VersionCheckResult } from "@agroloop/api-client";

interface UpdateCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpdateCheckerModal: React.FC<UpdateCheckerModalProps> = ({ isOpen, onClose }) => {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<VersionCheckResult | null>(null);
  const [customToken, setCustomToken] = useState<string>("");
  const [showTokenInput, setShowTokenInput] = useState(false);

  const runCheck = async (token?: string) => {
    setChecking(true);
    try {
      const res = await checkLatestRelease(CURRENT_PLATFORM_VERSION, {
        token: token || customToken || undefined,
      });
      setResult(res);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen && !result) {
      runCheck();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 110,
        padding: "16px",
      }}
    >
      <div
        className="glass-modal"
        style={{
          padding: "28px",
          width: "100%",
          maxWidth: "480px",
          borderRadius: "16px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-primary)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "22px" }}>🚀</span>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: "800", margin: 0 }}>Check for Updates</h3>
              <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                Verify latest releases on GitHub
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: "20px",
              padding: "4px 8px",
            }}
          >
            ×
          </button>
        </div>

        {/* Current Version Card */}
        <div
          style={{
            padding: "14px 16px",
            background: "var(--bg-app)",
            borderRadius: "10px",
            border: "1px solid var(--border-subtle)",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
              Installed Client Version
            </span>
            <div style={{ fontSize: "16px", fontWeight: "800", color: "var(--accent-emerald)", marginTop: "2px" }}>
              v{CURRENT_PLATFORM_VERSION}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", color: "var(--text-muted)" }}>
              Repository
            </span>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
              AgnaMariya/AgroLoop
            </div>
          </div>
        </div>

        {/* Status / Output Section */}
        {checking ? (
          <div style={{ padding: "32px 16px", textAlign: "center" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>⏳</div>
            <p style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
              Connecting to GitHub API...
            </p>
          </div>
        ) : result ? (
          <div style={{ marginBottom: "16px" }}>
            {result.status === "update-available" && (
              <div
                style={{
                  padding: "14px",
                  borderRadius: "10px",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  marginBottom: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "14px" }}>🎉</span>
                  <span style={{ fontSize: "13px", fontWeight: "800", color: "var(--accent-emerald)" }}>
                    New Release Available: v{result.latestVersion}
                  </span>
                </div>
                {result.releaseName && (
                  <p style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
                    {result.releaseName}
                  </p>
                )}
                {result.releaseNotes && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: "var(--text-muted)",
                      maxHeight: "100px",
                      overflowY: "auto",
                      whiteSpace: "pre-wrap",
                      margin: "6px 0",
                      padding: "8px",
                      background: "rgba(0,0,0,0.2)",
                      borderRadius: "6px",
                    }}
                  >
                    {result.releaseNotes}
                  </p>
                )}
                {result.htmlUrl && (
                  <a
                    href={result.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: "8px",
                      padding: "6px 14px",
                      background: "var(--accent-emerald)",
                      color: "#ffffff",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: "700",
                      textDecoration: "none",
                    }}
                  >
                    Download from GitHub ↗
                  </a>
                )}
              </div>
            )}

            {result.status === "up-to-date" && (
              <div
                style={{
                  padding: "14px",
                  borderRadius: "10px",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span style={{ fontSize: "18px" }}>✅</span>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "var(--accent-emerald)" }}>
                    You are up to date
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                    v{CURRENT_PLATFORM_VERSION} is the latest release.
                  </div>
                </div>
              </div>
            )}

            {result.status === "no-releases" && (
              <div
                style={{
                  padding: "14px",
                  borderRadius: "10px",
                  background: "rgba(59, 130, 246, 0.1)",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "16px" }}>ℹ️</span>
                  <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--accent-blue)" }}>
                    Latest Version Active
                  </span>
                </div>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                  {result.message}
                </p>
                {result.htmlUrl && (
                  <a
                    href={result.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      marginTop: "8px",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "var(--accent-blue)",
                      textDecoration: "underline",
                    }}
                  >
                    View Repository Releases on GitHub ↗
                  </a>
                )}
              </div>
            )}

            {result.status === "error" && (
              <div
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  background: "rgba(244, 63, 94, 0.1)",
                  border: "1px solid rgba(244, 63, 94, 0.25)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{ fontSize: "16px" }}>⚠️</span>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--accent-rose)" }}>
                    Check Encountered an Issue
                  </span>
                </div>
                <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
                  {result.message}
                </p>
              </div>
            )}
          </div>
        ) : null}

        {/* Optional GitHub Token Toggle (for private repo or high-volume rate limit) */}
        <div style={{ marginBottom: "16px" }}>
          <button
            type="button"
            onClick={() => setShowTokenInput(!showTokenInput)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "11px",
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            {showTokenInput ? "Hide GitHub Token Config" : "⚙️ Private repo / Token settings"}
          </button>
          {showTokenInput && (
            <div style={{ marginTop: "8px", display: "flex", gap: "6px" }}>
              <input
                type="password"
                placeholder="ghp_... (GitHub Personal Access Token)"
                value={customToken}
                onChange={(e) => setCustomToken(e.target.value)}
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  background: "var(--bg-app)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "6px",
                  color: "var(--text-primary)",
                  fontSize: "11px",
                }}
              />
              <button
                type="button"
                onClick={() => runCheck(customToken)}
                style={{
                  padding: "6px 12px",
                  background: "var(--accent-emerald)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: "14px" }}>
          <a
            href="https://github.com/AgnaMariya/AgroLoop/releases"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: "11px", color: "var(--text-muted)", textDecoration: "none" }}
          >
            All Releases ↗
          </a>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 14px",
                background: "transparent",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "8px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
            <button
              type="button"
              disabled={checking}
              onClick={() => runCheck()}
              style={{
                padding: "8px 16px",
                background: "var(--accent-emerald-dark)",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontWeight: "700",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              {checking ? "Checking..." : "🔄 Check Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
