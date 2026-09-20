import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { mobileApiClient } from "../../src/lib/api.js";
import { useAuth } from "../../src/context/auth-context.js";
import { QrScannerModal } from "../../src/components/qr-scanner-modal.js";
import type { PickupRequestApiResponse } from "@agroloop/api-types";

export default function FarmerCollectionsScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<"AVAILABLE" | "ASSIGNED">("AVAILABLE");
  const [availablePickups, setAvailablePickups] = useState<PickupRequestApiResponse[]>([]);
  const [assignedPickups, setAssignedPickups] = useState<PickupRequestApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);

  // Scanner modal state
  const [scannerVisible, setScannerVisible] = useState(false);
  const [selectedPickupIdForScan, setSelectedPickupIdForScan] = useState<number | undefined>();

  // Scheduling modal state
  const [schedulingId, setSchedulingId] = useState<number | null>(null);
  const [scheduleTimeInput, setScheduleTimeInput] = useState("");
  const [farmerNotes, setFarmerNotes] = useState("");

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [availRes, allRes] = await Promise.allSettled([
        mobileApiClient.farmer.getAvailablePickups(),
        mobileApiClient.pickups.listPickups(),
      ]);

      if (availRes.status === "fulfilled") {
        setAvailablePickups(availRes.value ?? []);
      }
      if (allRes.status === "fulfilled") {
        // Pickups assigned to this farmer or in progress
        const assigned = (allRes.value ?? []).filter(
          (p) =>
            p.status === "CLAIMED" ||
            p.status === "SCHEDULED" ||
            p.status === "COLLECTED"
        );
        setAssignedPickups(assigned);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleClaimPickup = async (pickupId: number) => {
    setActionInProgress(pickupId);
    try {
      const idempotencyKey = `claim_pickup_${pickupId}_${Date.now()}`;
      await mobileApiClient.farmer.claimPickup(pickupId, { idempotencyKey });
      Alert.alert("Pickup Claimed!", "You have accepted this collection. Next step: schedule a pickup time.");
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to claim pickup";
      Alert.alert("Claim Error", msg);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleScheduleSubmit = async () => {
    if (!schedulingId) return;
    const timeIso = scheduleTimeInput.trim() || new Date(Date.now() + 3600 * 1000 * 2).toISOString();

    setActionInProgress(schedulingId);
    try {
      const idempotencyKey = `sched_pickup_${schedulingId}_${Date.now()}`;
      await mobileApiClient.farmer.schedulePickup(
        schedulingId,
        {
          scheduledTime: timeIso,
          farmerNotes: farmerNotes.trim() || undefined,
        },
        { idempotencyKey }
      );
      setSchedulingId(null);
      setScheduleTimeInput("");
      setFarmerNotes("");
      Alert.alert("Schedule Confirmed", "Household has been notified of the scheduled collection time.");
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to schedule pickup";
      Alert.alert("Schedule Error", msg);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCollectPickup = async (pickupId: number) => {
    setActionInProgress(pickupId);
    try {
      const idempotencyKey = `collect_pickup_${pickupId}_${Date.now()}`;
      await mobileApiClient.farmer.collectPickup(pickupId, { idempotencyKey });
      Alert.alert("Waste Collected!", "Batch marked as collected. Proceed to verification to weigh and mint tokens.");
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to collect pickup";
      Alert.alert("Collection Error", msg);
    } finally {
      setActionInProgress(null);
    }
  };

  const currentList = activeTab === "AVAILABLE" ? availablePickups : assignedPickups;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#16a34a"]} />}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>&larr; Back to Portal</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>Collection Board</Text>
          <TouchableOpacity
            style={styles.scanHeaderBtn}
            onPress={() => {
              setSelectedPickupIdForScan(undefined);
              setScannerVisible(true);
            }}
          >
            <Text style={styles.scanHeaderBtnText}>📷 Scan QR Pass</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>
          Discover nearby compostable waste batches, schedule routes, and collect organic feedstock
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "AVAILABLE" && styles.tabButtonActive]}
          onPress={() => setActiveTab("AVAILABLE")}
        >
          <Text style={[styles.tabText, activeTab === "AVAILABLE" && styles.tabTextActive]}>
            Available Feeds ({availablePickups.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "ASSIGNED" && styles.tabButtonActive]}
          onPress={() => setActiveTab("ASSIGNED")}
        >
          <Text style={[styles.tabText, activeTab === "ASSIGNED" && styles.tabTextActive]}>
            Active Route ({assignedPickups.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loaderText}>Fetching collection board...</Text>
        </View>
      ) : currentList.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🌾</Text>
          <Text style={styles.emptyTitle}>
            {activeTab === "AVAILABLE" ? "No Unclaimed Batches" : "No Active Route Collections"}
          </Text>
          <Text style={styles.emptyDesc}>
            {activeTab === "AVAILABLE"
              ? "All household organic waste batches in your radius have been claimed. Check back shortly!"
              : "Claim waste batches from the Available tab to plan your collection route."}
          </Text>
        </View>
      ) : (
        currentList.map((pickup) => {
          const isBusy = actionInProgress === pickup.id;
          const isClaimed = pickup.status === "CLAIMED";
          const isScheduled = pickup.status === "SCHEDULED";
          const isCollected = pickup.status === "COLLECTED";

          return (
            <View key={pickup.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.pickupTitle}>Pickup #{pickup.id}</Text>
                  <Text style={styles.householdSubtitle}>
                    Household: {pickup.householdName || `User #${pickup.householdId ?? "--"}`}
                  </Text>
                </View>
                <View style={styles.headerBadges}>
                  {pickup.handshakeVerified && (
                    <View style={styles.handshakeVerifiedPill}>
                      <Text style={styles.handshakeVerifiedPillText}>✓ Verified</Text>
                    </View>
                  )}
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{pickup.status}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>📍 Address:</Text>
                  <Text style={styles.detailValue}>
                    {pickup.pickupAddress || "Registered household address"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>📦 Batch Ref:</Text>
                  <Text style={styles.detailValue}>Waste Batch #{pickup.wasteSubmissionId ?? "--"}</Text>
                </View>
                {pickup.scheduledTime && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>🕒 Route Slot:</Text>
                    <Text style={styles.detailValueHighlight}>
                      {new Date(pickup.scheduledTime).toLocaleString()}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons based on status */}
              <View style={styles.actionsRow}>
                {pickup.status === "REQUESTED" && (
                  <TouchableOpacity
                    style={styles.claimButton}
                    onPress={() => pickup.id && handleClaimPickup(pickup.id)}
                    disabled={isBusy}
                  >
                    {isBusy ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.claimButtonText}>Accept & Claim Batch</Text>
                    )}
                  </TouchableOpacity>
                )}

                {isClaimed && (
                  <TouchableOpacity
                    style={styles.scheduleButton}
                    onPress={() => {
                      setSchedulingId(pickup.id ?? null);
                      setScheduleTimeInput(new Date(Date.now() + 3600 * 1000 * 3).toISOString().slice(0, 16));
                    }}
                    disabled={isBusy}
                  >
                    <Text style={styles.scheduleButtonText}>📅 Schedule Collection Time</Text>
                  </TouchableOpacity>
                )}

                {isScheduled && (
                  <TouchableOpacity
                    style={styles.collectButton}
                    onPress={() => pickup.id && handleCollectPickup(pickup.id)}
                    disabled={isBusy}
                  >
                    {isBusy ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <Text style={styles.collectButtonText}>🚛 Mark Collected (On-Site)</Text>
                    )}
                  </TouchableOpacity>
                )}

                {(isClaimed || isScheduled || isCollected) && !pickup.handshakeVerified && (
                  <TouchableOpacity
                    style={styles.scanButton}
                    onPress={() => {
                      setSelectedPickupIdForScan(pickup.id);
                      setScannerVisible(true);
                    }}
                    disabled={isBusy}
                  >
                    <Text style={styles.scanButtonText}>📷 Scan Handshake</Text>
                  </TouchableOpacity>
                )}

                {(isCollected || isScheduled) && (
                  <TouchableOpacity
                    style={styles.verifyButton}
                    onPress={() =>
                      router.push({
                        pathname: "/farmer/verify",
                        params: { pickupId: String(pickup.id) },
                      })
                    }
                  >
                    <Text style={styles.verifyButtonText}>⚖️ Verify & Mint Tokens</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })
      )}

      {/* Schedule Modal */}
      <Modal
        visible={schedulingId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSchedulingId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Schedule Pickup #{schedulingId}</Text>
            <Text style={styles.modalSubtitle}>
              Specify estimated arrival timestamp for collection route
            </Text>

            <Text style={styles.fieldLabel}>Scheduled Timestamp (ISO)</Text>
            <TextInput
              style={styles.modalInput}
              value={scheduleTimeInput}
              onChangeText={setScheduleTimeInput}
              placeholder="e.g. 2026-09-21T10:30:00Z"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.fieldLabel}>Farmer Notes (Optional)</Text>
            <TextInput
              style={[styles.modalInput, { minHeight: 60 }]}
              value={farmerNotes}
              onChangeText={setFarmerNotes}
              placeholder="e.g. Bring extra crates for high moisture compost"
              placeholderTextColor="#9ca3af"
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSchedulingId(null)}
                disabled={actionInProgress !== null}
              >
                <Text style={styles.modalCancelBtnText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleScheduleSubmit}
                disabled={actionInProgress !== null}
              >
                {actionInProgress !== null ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Save Schedule</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Handshake QR Scanner Modal */}
      <QrScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        initialPickupId={selectedPickupIdForScan}
        onHandshakeSuccess={(result) => {
          setScannerVisible(false);
          Alert.alert(
            "Handshake Verified!",
            `Passcode/QR successfully verified on-site for Pickup #${result.pickupId}.`
          );
          fetchData();
          router.push({
            pathname: "/farmer/verify",
            params: { pickupId: String(result.pickupId) },
          });
        }}
      />
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
  headerTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scanHeaderBtn: {
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  scanHeaderBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
    lineHeight: 20,
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
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  pickupTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  householdSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  headerBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  handshakeVerifiedPill: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#10b981",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  handshakeVerifiedPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  statusBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803d",
  },
  cardDetails: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 12,
    gap: 6,
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    width: 90,
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
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  claimButton: {
    backgroundColor: "#16a34a",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  claimButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  scheduleButton: {
    backgroundColor: "#0284c7",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  scheduleButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  collectButton: {
    backgroundColor: "#d97706",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  collectButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  scanButton: {
    backgroundColor: "#059669",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  scanButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  verifyButton: {
    backgroundColor: "#16a34a",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  verifyButtonText: {
    color: "#ffffff",
    fontSize: 13,
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
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: "#0f172a",
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
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
    backgroundColor: "#16a34a",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: "center",
  },
  modalConfirmBtnText: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "600",
  },
});
