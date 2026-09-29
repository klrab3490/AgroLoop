import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  TextInput,
  ScrollView,
  StyleSheet,
} from "react-native";
import {
  checkLatestRelease,
  CURRENT_PLATFORM_VERSION,
  type VersionCheckResult,
} from "@agroloop/api-client";

interface UpdateCheckerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function UpdateCheckerModal({ visible, onClose }: UpdateCheckerModalProps) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<VersionCheckResult | null>(null);
  const [customToken, setCustomToken] = useState("");
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
    if (visible && !result) {
      runCheck();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerIcon}>🚀</Text>
              <View>
                <Text style={styles.title}>Check for Updates</Text>
                <Text style={styles.subtitle}>Verify releases on GitHub</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
            {/* Version Badge Box */}
            <View style={styles.versionBox}>
              <View>
                <Text style={styles.versionLabel}>Installed App Build</Text>
                <Text style={styles.versionVal}>v{CURRENT_PLATFORM_VERSION}</Text>
              </View>
              <View style={styles.repoCol}>
                <Text style={styles.versionLabel}>GitHub Repo</Text>
                <Text style={styles.repoName}>AgnaMariya/AgroLoop</Text>
              </View>
            </View>

            {/* Check Results */}
            {checking ? (
              <View style={styles.statusBox}>
                <ActivityIndicator color="#16a34a" size="small" />
                <Text style={styles.checkingText}>Querying GitHub API...</Text>
              </View>
            ) : result ? (
              <View style={styles.statusContainer}>
                {result.status === "update-available" && (
                  <View style={[styles.resultBanner, styles.bannerUpdate]}>
                    <Text style={styles.updateTitle}>
                      🎉 New Release Available: v{result.latestVersion}
                    </Text>
                    {result.releaseName ? (
                      <Text style={styles.releaseName}>{result.releaseName}</Text>
                    ) : null}
                    {result.releaseNotes ? (
                      <Text style={styles.releaseNotes} numberOfLines={4}>
                        {result.releaseNotes}
                      </Text>
                    ) : null}
                    {result.htmlUrl ? (
                      <TouchableOpacity
                        style={styles.downloadBtn}
                        onPress={() => result.htmlUrl && Linking.openURL(result.htmlUrl)}
                      >
                        <Text style={styles.downloadBtnText}>View on GitHub ↗</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}

                {result.status === "up-to-date" && (
                  <View style={[styles.resultBanner, styles.bannerSuccess]}>
                    <Text style={styles.bannerSuccessTitle}>✅ Up to Date</Text>
                    <Text style={styles.bannerSubtext}>
                      You are running the latest version (v{CURRENT_PLATFORM_VERSION}).
                    </Text>
                  </View>
                )}

                {result.status === "no-releases" && (
                  <View style={[styles.resultBanner, styles.bannerInfo]}>
                    <Text style={styles.bannerInfoTitle}>ℹ️ Current Build Active</Text>
                    <Text style={styles.bannerSubtext}>{result.message}</Text>
                    {result.htmlUrl ? (
                      <TouchableOpacity
                        onPress={() => result.htmlUrl && Linking.openURL(result.htmlUrl)}
                      >
                        <Text style={styles.linkText}>Open Releases Page ↗</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}

                {result.status === "error" && (
                  <View style={[styles.resultBanner, styles.bannerError]}>
                    <Text style={styles.bannerErrorTitle}>⚠️ Verification Note</Text>
                    <Text style={styles.bannerSubtext}>{result.message}</Text>
                  </View>
                )}
              </View>
            ) : null}

            {/* Optional GitHub Token Toggle */}
            <View style={styles.tokenSection}>
              <TouchableOpacity
                onPress={() => setShowTokenInput(!showTokenInput)}
                style={styles.tokenToggle}
              >
                <Text style={styles.tokenToggleText}>
                  {showTokenInput ? "Hide GitHub Token" : "⚙️ Private Repo / Token (Optional)"}
                </Text>
              </TouchableOpacity>
              {showTokenInput && (
                <View style={styles.tokenInputRow}>
                  <TextInput
                    style={styles.tokenInput}
                    placeholder="ghp_... (GitHub Token)"
                    placeholderTextColor="#94a3b8"
                    value={customToken}
                    onChangeText={setCustomToken}
                    secureTextEntry
                  />
                  <TouchableOpacity
                    style={styles.applyBtn}
                    onPress={() => runCheck(customToken)}
                  >
                    <Text style={styles.applyBtnText}>Apply</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={() => Linking.openURL("https://github.com/AgnaMariya/AgroLoop/releases")}
            >
              <Text style={styles.githubLink}>GitHub ↗</Text>
            </TouchableOpacity>
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => runCheck()}
                disabled={checking}
                style={[styles.checkBtn, checking && styles.btnDisabled]}
              >
                <Text style={styles.checkBtnText}>{checking ? "Checking..." : "Check Now"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 420,
    maxHeight: "85%",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIcon: {
    fontSize: 22,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 11,
    color: "#64748b",
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 16,
    color: "#94a3b8",
    fontWeight: "bold",
  },
  scrollArea: {
    maxHeight: 340,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  versionBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  versionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
  },
  versionVal: {
    fontSize: 16,
    fontWeight: "900",
    color: "#16a34a",
    marginTop: 2,
  },
  repoCol: {
    alignItems: "flex-end",
  },
  repoName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginTop: 2,
  },
  statusBox: {
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  checkingText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  statusContainer: {
    marginBottom: 14,
  },
  resultBanner: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  bannerUpdate: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  updateTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#15803d",
    marginBottom: 4,
  },
  releaseName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  releaseNotes: {
    fontSize: 11,
    color: "#475569",
    backgroundColor: "#ffffff",
    padding: 8,
    borderRadius: 8,
    marginVertical: 6,
  },
  downloadBtn: {
    backgroundColor: "#16a34a",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  downloadBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  bannerSuccess: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  bannerSuccessTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#15803d",
    marginBottom: 2,
  },
  bannerInfo: {
    backgroundColor: "#f0f9ff",
    borderColor: "#bae6fd",
  },
  bannerInfoTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0369a1",
    marginBottom: 2,
  },
  bannerError: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  bannerErrorTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#b91c1c",
    marginBottom: 2,
  },
  bannerSubtext: {
    fontSize: 11,
    color: "#475569",
    lineHeight: 16,
  },
  linkText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284c7",
    textDecorationLine: "underline",
    marginTop: 6,
  },
  tokenSection: {
    marginTop: 6,
  },
  tokenToggle: {
    paddingVertical: 4,
  },
  tokenToggleText: {
    fontSize: 11,
    color: "#64748b",
    textDecorationLine: "underline",
  },
  tokenInputRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  tokenInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  applyBtn: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
  applyBtnText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 14,
    marginTop: 8,
  },
  githubLink: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  checkBtn: {
    backgroundColor: "#16a34a",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  checkBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
});
