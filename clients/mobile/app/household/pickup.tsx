import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { mobileApiClient } from "../../src/lib/api.js";
import { useAuth } from "../../src/context/auth-context.js";
import { QrCodeView } from "../../src/components/qr-code-view.js";
import type {
  PickupRequestApiResponse,
  PickupHandshakePassResponse,
} from "@agroloop/api-types";

const STAGES = [
  { key: "REQUESTED", label: "Requested" },
  { key: "CLAIMED", label: "Claimed" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "COLLECTED", label: "Collected" },
  { key: "VERIFIED", label: "Verified" },
];

function getStageIndex(status?: string): number {
  switch (status) {
    case "REQUESTED":
      return 0;
    case "CLAIMED":
      return 1;
    case "SCHEDULED":
      return 2;
    case "COLLECTED":
      return 3;
    case "VERIFIED":
      return 4;
    default:
      return -1;
  }
}

export default function HouseholdPickupScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [pickups, setPickups] = useState<PickupRequestApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"ACTIVE" | "ALL">("ACTIVE");

  // Cancellation state
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // QR Handshake Pass state
  const [passModalPickupId, setPassModalPickupId] = useState<number | null>(null);
  const [activePass, setActivePass] = useState<PickupHandshakePassResponse | null>(null);
  const [loadingPass, setLoadingPass] = useState(false);

  const fetchHandshakePass = async (pickupId: number) => {
    setLoadingPass(true);
    try {
      const pass = await mobileApiClient.pickups.generateHandshakePass(pickupId);
      setActivePass(pass);
      setPassModalPickupId(pickupId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate handshake pass";
      Alert.alert("Pass Generation Error", msg);
    } finally {
      setLoadingPass(false);
    }
  };

  const fetchPickups = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await mobileApiClient.pickups.listPickups();
      setPickups(data ?? []);
    } catch {
      // Keep existing list on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchPickups();
  }, [fetchPickups]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPickups();
  };

  const handleCancelPickup = async () => {
    if (!cancellingId || !cancelReason.trim()) {
      Alert.alert("Reason Required", "Please provide a reason for cancelling this pickup.");
      return;
    }

    setSubmittingCancel(true);
    try {
      const idempotencyKey = `cancel_pickup_${cancellingId}_${Date.now()}`;
      await mobileApiClient.pickups.cancelPickup(
        cancellingId,
        { reason: cancelReason.trim() },
        { idempotencyKey }
      );
      setCancellingId(null);
      setCancelReason("");
      Alert.alert("Pickup Cancelled", "The pickup request has been successfully cancelled.");
      fetchPickups();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to cancel pickup";
      Alert.alert("Cancellation Error", message);
    } finally {
      setSubmittingCancel(false);
    }
  };

  const filteredPickups = pickups.filter((p) => {
    if (filter === "ACTIVE") {
      return p.status === "REQUESTED" || p.status === "CLAIMED" || p.status === "SCHEDULED" || p.status === "COLLECTED";
    }
    return true;
  });

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#16a34a"]} />}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>&larr; Back to Hub</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pickup Tracker</Text>
        <Text style={styles.subtitle}>
          Track collections in real time from farmer claim to doorstep weigh-in
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, filter === "ACTIVE" && styles.tabButtonActive]}
          onPress={() => setFilter("ACTIVE")}
        >
          <Text style={[styles.tabText, filter === "ACTIVE" && styles.tabTextActive]}>
            Active Orders ({pickups.filter((p) => ["REQUESTED", "CLAIMED", "SCHEDULED", "COLLECTED"].includes(p.status ?? "")).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, filter === "ALL" && styles.tabButtonActive]}
          onPress={() => setFilter("ALL")}
        >
          <Text style={[styles.tabText, filter === "ALL" && styles.tabTextActive]}>
            All History ({pickups.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loaderText}>Loading pickup schedules...</Text>
        </View>
      ) : filteredPickups.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🚛</Text>
          <Text style={styles.emptyTitle}>
            {filter === "ACTIVE" ? "No Active Pickups" : "No Pickup Records"}
          </Text>
          <Text style={styles.emptyDesc}>
            Log an organic waste submission to automatically create a collection request for nearby partner farmers.
          </Text>
          <TouchableOpacity
            style={styles.newSubmissionBtn}
            onPress={() => router.push("/household/submit")}
          >
            <Text style={styles.newSubmissionBtnText}>+ Log Waste Submission</Text>
          </TouchableOpacity>
        </View>
      ) : (
        filteredPickups.map((item) => {
          const currentStageIndex = getStageIndex(item.status);
          const isCancelled = item.status === "CANCELLED";
          const canCancel = item.status === "REQUESTED" || item.status === "CLAIMED";

          return (
            <View key={item.id} style={styles.pickupCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.pickupId}>Pickup #{item.id}</Text>
                  <Text style={styles.pickupMeta}>
                    Waste Batch #{item.wasteSubmissionId ?? "--"} &bull;{" "}
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "Recent"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    isCancelled
                      ? styles.badgeCancelled
                      : item.status === "VERIFIED"
                      ? styles.badgeVerified
                      : styles.badgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isCancelled
                        ? styles.badgeTextCancelled
                        : item.status === "VERIFIED"
                        ? styles.badgeTextVerified
                        : styles.badgeTextActive,
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              {/* Real-time Stage Progress Tracker */}
              {!isCancelled && (
                <View style={styles.trackerContainer}>
                  <View style={styles.trackerLineBg}>
                    <View
                      style={[
                        styles.trackerLineFill,
                        {
                          width: `${Math.max(0, Math.min(100, (currentStageIndex / (STAGES.length - 1)) * 100))}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.stagesRow}>
                    {STAGES.map((s, idx) => {
                      const isComplete = idx <= currentStageIndex;
                      const isCurrent = idx === currentStageIndex;
                      return (
                        <View key={s.key} style={styles.stageStep}>
                          <View
                            style={[
                              styles.stepDot,
                              isComplete && styles.stepDotComplete,
                              isCurrent && styles.stepDotCurrent,
                            ]}
                          >
                            <Text style={[styles.stepDotText, isComplete && styles.stepDotTextComplete]}>
                              {isComplete ? "✓" : idx + 1}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.stepLabel,
                              isComplete && styles.stepLabelComplete,
                              isCurrent && styles.stepLabelCurrent,
                            ]}
                            numberOfLines={1}
                          >
                            {s.label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Pickup Details */}
              <View style={styles.detailsBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>📍 Location:</Text>
                  <Text style={styles.detailValue} numberOfLines={2}>
                    {item.pickupAddress || "Registered Household Address"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>🧑‍🌾 Farmer Partner:</Text>
                  <Text style={styles.detailValue}>
                    {item.assignedFarmerName || (item.status === "REQUESTED" ? "Awaiting Farmer Assignment" : "Unassigned")}
                  </Text>
                </View>
                {item.scheduledTime && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>🕒 Scheduled For:</Text>
                    <Text style={styles.detailValueHighlight}>
                      {new Date(item.scheduledTime).toLocaleString()}
                    </Text>
                  </View>
                )}
                {item.verification && (
                  <View style={styles.verificationBox}>
                    <Text style={styles.verificationTitle}>✨ Verification Complete</Text>
                    <Text style={styles.verificationDetail}>
                      Weight: {item.verification.verifiedWeight} kg &bull; Quality: {item.verification.qualityGrade}
                    </Text>
                    <Text style={styles.tokenAwardedText}>
                      +{item.verification.tokensAwarded ?? 0} EcoTokens Credited
                    </Text>
                  </View>
                )}
                {isCancelled && item.cancellationReason && (
                  <View style={styles.cancellationBox}>
                    <Text style={styles.cancellationReasonText}>
                      Reason: {item.cancellationReason}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action buttons */}
              <View style={styles.cardActions}>
                {(item.status === "CLAIMED" || item.status === "ASSIGNED" || item.status === "SCHEDULED") && (
                  <TouchableOpacity
                    style={styles.qrPassBtn}
                    onPress={() => item.id && fetchHandshakePass(item.id)}
                    disabled={loadingPass}
                  >
                    <Text style={styles.qrPassBtnText}>
                      📱 Show Verification QR Pass
                    </Text>
                  </TouchableOpacity>
                )}
                {canCancel && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setCancellingId(item.id ?? null)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel Pickup Request</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}

      {/* Handshake QR Pass Modal */}
      <Modal
        visible={passModalPickupId !== null && activePass !== null}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setPassModalPickupId(null);
          setActivePass(null);
        }}
      >
        <View style={styles.passModalOverlay}>
          <View style={styles.passModalCard}>
            <View style={styles.passModalHeader}>
              <View>
                <Text style={styles.passModalTitle}>Pickup #{passModalPickupId} Pass</Text>
                <Text style={styles.passModalSubtitle}>Present to partner farmer on collection</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setPassModalPickupId(null);
                  setActivePass(null);
                }}
                style={styles.passModalClose}
              >
                <Text style={styles.passModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {activePass && (
              <QrCodeView
                pass={activePass}
                onRefresh={() => {
                  if (passModalPickupId) {
                    fetchHandshakePass(passModalPickupId);
                  }
                }}
                isRefreshing={loadingPass}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Cancellation Reason Modal */}
      <Modal
        visible={cancellingId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCancellingId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Pickup Request</Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for cancelling Pickup #{cancellingId}.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Schedule conflict, waste disposed elsewhere..."
              placeholderTextColor="#9ca3af"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setCancellingId(null);
                  setCancelReason("");
                }}
                disabled={submittingCancel}
              >
                <Text style={styles.modalCancelBtnText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleCancelPickup}
                disabled={submittingCancel}
              >
                {submittingCancel ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Confirm Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f8fafc",
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 12,
  },
  backText: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "600",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  tabTextActive: {
    color: "#16a34a",
  },
  loaderContainer: {
    padding: 40,
    alignItems: "center",
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  newSubmissionBtn: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  newSubmissionBtnText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 14,
  },
  pickupCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  pickupId: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  pickupMeta: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  badgeActive: {
    backgroundColor: "#dcfce7",
  },
  badgeTextActive: {
    color: "#15803d",
  },
  badgeVerified: {
    backgroundColor: "#e0e7ff",
  },
  badgeTextVerified: {
    color: "#4338ca",
  },
  badgeCancelled: {
    backgroundColor: "#fee2e2",
  },
  badgeTextCancelled: {
    color: "#b91c1c",
  },
  trackerContainer: {
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  trackerLineBg: {
    height: 4,
    backgroundColor: "#e2e8f0",
    borderRadius: 2,
    position: "relative",
    top: 14,
  },
  trackerLineFill: {
    height: 4,
    backgroundColor: "#16a34a",
    borderRadius: 2,
  },
  stagesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stageStep: {
    alignItems: "center",
    width: 58,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepDotComplete: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  stepDotCurrent: {
    borderColor: "#16a34a",
    borderWidth: 2.5,
  },
  stepDotText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
  },
  stepDotTextComplete: {
    color: "#ffffff",
  },
  stepLabel: {
    fontSize: 10,
    color: "#94a3b8",
    textAlign: "center",
  },
  stepLabelComplete: {
    color: "#16a34a",
    fontWeight: "600",
  },
  stepLabelCurrent: {
    color: "#0f172a",
    fontWeight: "700",
  },
  detailsBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    width: 120,
  },
  detailValue: {
    flex: 1,
    fontSize: 12,
    color: "#1e293b",
    textAlign: "right",
  },
  detailValueHighlight: {
    flex: 1,
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "600",
    textAlign: "right",
  },
  verificationBox: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  verificationTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803d",
    marginBottom: 2,
  },
  verificationDetail: {
    fontSize: 11,
    color: "#64748b",
  },
  tokenAwardedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16a34a",
    marginTop: 2,
  },
  cancellationBox: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#fecaca",
  },
  cancellationReasonText: {
    fontSize: 12,
    color: "#dc2626",
    fontStyle: "italic",
  },
  cardActions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fca5a5",
    backgroundColor: "#fff1f2",
  },
  cancelBtnText: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#0f172a",
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  modalCancelBtnText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  modalConfirmBtn: {
    backgroundColor: "#dc2626",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
    modalConfirmBtnText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
  },
  qrPassBtn: {
    backgroundColor: "#0f172a",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  qrPassBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  passModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  passModalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  passModalHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  passModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  passModalSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  passModalClose: {
    padding: 4,
  },
  passModalCloseText: {
    fontSize: 18,
    color: "#94a3b8",
    fontWeight: "700",
  },
});
