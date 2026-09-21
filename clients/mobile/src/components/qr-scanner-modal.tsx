import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { mobileApiClient } from "../lib/api";
import { parsePickupPass, normalizePassCode } from "../services/qr-handshake";
import type {
  CompactQrPayload,
  PickupHandshakeResultApiResponse,
} from "@agroloop/api-types";

interface QrScannerModalProps {
  visible: boolean;
  initialPickupId?: number;
  targetPickupId?: number;
  onClose: () => void;
  onHandshakeSuccess: (result: PickupHandshakeResultApiResponse) => void;
}

export function QrScannerModal({
  visible,
  initialPickupId,
  targetPickupId,
  onClose,
  onHandshakeSuccess,
}: QrScannerModalProps) {
  const effectiveId = initialPickupId ?? targetPickupId;
  const [activeTab, setActiveTab] = useState<"SCAN" | "MANUAL">("SCAN");
  const [pickupIdInput, setPickupIdInput] = useState(effectiveId ? String(effectiveId) : "");
  const [manualCodeInput, setManualCodeInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedResult, setVerifiedResult] = useState<PickupHandshakeResultApiResponse | null>(null);

  React.useEffect(() => {
    if (visible && effectiveId) {
      setPickupIdInput(String(effectiveId));
    }
  }, [visible, effectiveId]);

  const resetState = () => {
    setManualCodeInput("");
    setIsVerifying(false);
    setVerifiedResult(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const executeVerification = async (
    pickupId: number,
    payloadOrCode: { payload?: CompactQrPayload; passCode?: string }
  ) => {
    setIsVerifying(true);
    try {
      let result: PickupHandshakeResultApiResponse;
      if (payloadOrCode.payload) {
        result = await mobileApiClient.pickups.verifyHandshake(pickupId, {
          method: "QR_SCAN",
          payload: payloadOrCode.payload,
        });
      } else if (payloadOrCode.passCode) {
        result = await mobileApiClient.pickups.verifyHandshake(pickupId, {
          method: "MANUAL_PASSCODE",
          passCode: payloadOrCode.passCode,
        });
      } else {
        throw new Error("No handshake credential provided");
      }

      setVerifiedResult(result);
      setTimeout(() => {
        onHandshakeSuccess(result);
        handleClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Handshake verification failed";
      Alert.alert("Authentication Failed", msg);
    } finally {
      setIsVerifying(false);
    }
  };

  // Simulate scanning a live QR payload
  const handleSimulateScan = async () => {
    const pId = Number(pickupIdInput || targetPickupId);
    if (!pId || isNaN(pId)) {
      Alert.alert("Pickup ID Required", "Please enter the Pickup ID to simulate on-site scan.");
      return;
    }

    try {
      setIsVerifying(true);
      // Fetch or request pass from API to simulate a legitimate household QR scan
      const pass = await mobileApiClient.pickups.generateHandshakePass(pId);
      const parsed = parsePickupPass(JSON.stringify(pass.compactQr));
      if (!parsed) {
        throw new Error("Failed to parse household QR pass");
      }
      await executeVerification(pId, { payload: parsed });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Simulation failed";
      Alert.alert("Simulation Error", msg);
      setIsVerifying(false);
    }
  };

  const handleManualCodeSubmit = async () => {
    const pId = Number(pickupIdInput || targetPickupId);
    if (!pId || isNaN(pId)) {
      Alert.alert("Pickup ID Required", "Please specify the Pickup ID.");
      return;
    }
    const normalized = normalizePassCode(manualCodeInput);
    if (!normalized || normalized.length < 8) {
      Alert.alert("Pass Code Required", "Please enter a valid ECO-XXXX-XXXX pass code.");
      return;
    }

    await executeVerification(pId, { passCode: normalized });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Physical On-Site Handshake</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Pickup ID Indicator/Input */}
          {!targetPickupId && (
            <View style={styles.pickupInputWrapper}>
              <Text style={styles.inputLabel}>Target Pickup ID:</Text>
              <TextInput
                style={styles.pickupInput}
                value={pickupIdInput}
                onChangeText={setPickupIdInput}
                keyboardType="numeric"
                placeholder="e.g. 101"
              />
            </View>
          )}

          {/* Mode Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "SCAN" && styles.tabActive]}
              onPress={() => setActiveTab("SCAN")}
            >
              <Text style={[styles.tabText, activeTab === "SCAN" && styles.tabTextActive]}>
                QR Viewfinder
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === "MANUAL" && styles.tabActive]}
              onPress={() => setActiveTab("MANUAL")}
            >
              <Text style={[styles.tabText, activeTab === "MANUAL" && styles.tabTextActive]}>
                Manual Pass Code
              </Text>
            </TouchableOpacity>
          </View>

          {/* Verification Success View */}
          {verifiedResult ? (
            <View style={styles.successCard}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successTitle}>Handshake Verified</Text>
              <Text style={styles.successDetail}>
                Pickup #{verifiedResult.pickupId} • Household #{verifiedResult.householdId}
              </Text>
              <Text style={styles.successMethod}>
                Authenticated via {verifiedResult.method === "QR_SCAN" ? "QR Scan" : "Pass Code"}
              </Text>
            </View>
          ) : (
            <>
              {activeTab === "SCAN" ? (
                <View style={styles.viewfinderContainer}>
                  <View style={styles.viewfinderFrame}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                    <View style={styles.scanLaser} />
                  </View>
                  <Text style={styles.viewfinderHint}>
                    Align household QR code within the viewfinder frame
                  </Text>

                  {/* Dev / Simulator Scan Trigger */}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.simulateBtn]}
                    onPress={handleSimulateScan}
                    disabled={isVerifying}
                  >
                    {isVerifying ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.actionBtnText}>Simulate Camera Scan</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.manualContainer}>
                  <Text style={styles.manualHint}>
                    Enter the 8-character passcode shown on the household’s screen:
                  </Text>
                  <TextInput
                    style={styles.manualInput}
                    value={manualCodeInput}
                    onChangeText={setManualCodeInput}
                    placeholder="ECO-4821-7395"
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.submitBtn]}
                    onPress={handleManualCodeSubmit}
                    disabled={isVerifying}
                  >
                    {isVerifying ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.actionBtnText}>Verify & Consume Pass Code</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          <Text style={styles.securityNote}>
            Authoritative validation executed server-side. Pass is atomically consumed upon verification.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: 460,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 18,
    color: "#64748b",
    fontWeight: "700",
  },
  pickupInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginRight: 8,
  },
  pickupInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: 100,
    fontSize: 14,
    fontWeight: "700",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  tabTextActive: {
    color: "#0f172a",
    fontWeight: "700",
  },
  viewfinderContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  viewfinderFrame: {
    width: 200,
    height: 200,
    backgroundColor: "#0f172a",
    borderRadius: 16,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#22c55e",
  },
  topLeft: {
    top: 12,
    left: 12,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 12,
    right: 12,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 12,
    left: 12,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 12,
    right: 12,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanLaser: {
    width: "80%",
    height: 2,
    backgroundColor: "#22c55e",
    shadowColor: "#22c55e",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  viewfinderHint: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 12,
    textAlign: "center",
  },
  manualContainer: {
    paddingVertical: 12,
    alignItems: "center",
  },
  manualHint: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 16,
    textAlign: "center",
  },
  manualInput: {
    width: "100%",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    fontFamily: "monospace",
    letterSpacing: 2,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
    marginBottom: 16,
  },
  actionBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },
  simulateBtn: {
    backgroundColor: "#059669",
  },
  submitBtn: {
    backgroundColor: "#16a34a",
  },
  actionBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  successCard: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginVertical: 16,
  },
  successIcon: {
    fontSize: 32,
    color: "#16a34a",
    fontWeight: "900",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#166534",
    marginBottom: 4,
  },
  successDetail: {
    fontSize: 13,
    color: "#15803d",
    fontWeight: "600",
  },
  successMethod: {
    fontSize: 11,
    color: "#86efac",
    marginTop: 6,
  },
  securityNote: {
    fontSize: 10,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 16,
  },
});
