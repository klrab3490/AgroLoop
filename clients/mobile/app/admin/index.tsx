import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { mobileApiClient } from "../../src/lib/api";
import { useAuth } from "../../src/context/auth-context";
import type {
  SolvencyMetricsDto,
  FarmerApplicationApiResponse,
  UserApiResponse,
} from "@agroloop/api-types";

export default function AdminScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [solvency, setSolvency] = useState<SolvencyMetricsDto | null>(null);
  const [applications, setApplications] = useState<FarmerApplicationApiResponse[]>([]);
  const [users, setUsers] = useState<UserApiResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "applications" | "users">("overview");
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);

  const loadAdminData = useCallback(async () => {
    if (!isAuthenticated || user?.role !== "ROLE_ADMIN") return;
    setLoading(true);
    try {
      const [solvencyData, appData, userData] = await Promise.allSettled([
        mobileApiClient.admin.getSolvencyMetrics(),
        mobileApiClient.admin.listFarmerApplications(),
        mobileApiClient.admin.listUsers(),
      ]);

      if (solvencyData.status === "fulfilled") {
        setSolvency(solvencyData.value);
      }
      if (appData.status === "fulfilled") {
        setApplications(appData.value || []);
      }
      if (userData.status === "fulfilled") {
        setUsers(userData.value || []);
      }
    } catch {
      // Error handled silently or via state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAdminData();
  };

  const handleApproveApplication = (appId: number, applicantName?: string) => {
    Alert.alert(
      "Approve Farmer Application",
      `Are you sure you want to approve ${applicantName || `Application #${appId}`}? This will convert the user to an authorized regional farmer with doorstep collection capabilities.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve & Grant",
          style: "default",
          onPress: async () => {
            setActionInProgress(appId);
            try {
              await mobileApiClient.admin.approveFarmerApplication(appId);
              Alert.alert("Success", "Farmer application has been approved.");
              loadAdminData();
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Failed to approve application";
              Alert.alert("Error", msg);
            } finally {
              setActionInProgress(null);
            }
          },
        },
      ]
    );
  };

  const handleRejectApplication = (appId: number, applicantName?: string) => {
    Alert.alert(
      "Reject Farmer Application",
      `Are you sure you want to reject ${applicantName || `Application #${appId}`}? The user will remain in their current role.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            setActionInProgress(appId);
            try {
              await mobileApiClient.admin.rejectFarmerApplication(appId, "Application declined by administrator");
              Alert.alert("Application Rejected", "The farmer application has been declined.");
              loadAdminData();
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Failed to reject application";
              Alert.alert("Error", msg);
            } finally {
              setActionInProgress(null);
            }
          },
        },
      ]
    );
  };

  const handleToggleUserStatus = (targetUser: UserApiResponse) => {
    if (!targetUser.id) return;
    const isCurrentlyEnabled = targetUser.enabled ?? true;
    const newStatus = !isCurrentlyEnabled;

    Alert.alert(
      newStatus ? "Enable User Account" : "Disable User Account",
      `Are you sure you want to ${newStatus ? "enable" : "suspend"} account access for ${targetUser.name || targetUser.email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: newStatus ? "Enable" : "Suspend Account",
          style: newStatus ? "default" : "destructive",
          onPress: async () => {
            if (!targetUser.id) return;
            setActionInProgress(targetUser.id);
            try {
              await mobileApiClient.admin.setUserStatus(targetUser.id, newStatus);
              Alert.alert("Account Updated", `User ${newStatus ? "enabled" : "suspended"} successfully.`);
              loadAdminData();
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Failed to update user status";
              Alert.alert("Error", msg);
            } finally {
              setActionInProgress(null);
            }
          },
        },
      ]
    );
  };

  if (authLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!isAuthenticated || user?.role !== "ROLE_ADMIN") {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.lockIcon}>🔒</Text>
        <Text style={styles.authRequiredTitle}>Admin Privileges Required</Text>
        <Text style={styles.authRequiredSubtitle}>
          Sign in with an authorized administrator account to access platform governance and ledger audits.
        </Text>
        <TouchableOpacity
          style={styles.signInBtn}
          onPress={() => router.push("/auth/login")}
        >
          <Text style={styles.signInBtnText}>Sign In as Admin</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pendingApps = applications.filter((a) => a.status === "PENDING");
  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#16a34a"]} />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.badge}>Platform Governance</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} disabled={loading}>
            <Text style={styles.refreshBtnText}>{loading ? "⏳" : "🔄 Refresh"}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Admin Operations</Text>
        <Text style={styles.subtitle}>
          Mobile supervision for platform solvency, certified collections, farmer verifications, and directory governance.
        </Text>
      </View>

      {/* Navigation Segment Tabs */}
      <View style={styles.segmentControl}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "overview" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("overview")}
        >
          <Text style={[styles.segmentText, activeTab === "overview" && styles.segmentTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "applications" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("applications")}
        >
          <Text style={[styles.segmentText, activeTab === "applications" && styles.segmentTextActive]}>
            Applications {pendingApps.length > 0 ? `(${pendingApps.length})` : ""}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === "users" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("users")}
        >
          <Text style={[styles.segmentText, activeTab === "users" && styles.segmentTextActive]}>
            Directory ({users.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* 1. OVERVIEW TAB */}
      {activeTab === "overview" && (
        <View style={styles.tabContent}>
          {/* Solvency Health Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>EcoToken Solvency Health</Text>
              <View style={[styles.statusPill, solvency?.solvent ? styles.pillSolvent : styles.pillAtRisk]}>
                <Text style={styles.statusPillText}>
                  {solvency?.solvent ? "✓ Fully Solvent" : "⚠️ Discrepancy Detected"}
                </Text>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Household Balances</Text>
                <Text style={styles.metricValue}>
                  {solvency?.totalHouseholdBalances != null ? solvency.totalHouseholdBalances.toLocaleString() : "--"} 🪙
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Total Credits (Minted)</Text>
                <Text style={styles.metricValue}>
                  {solvency?.totalCredits != null ? solvency.totalCredits.toLocaleString() : "--"} 🪙
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Total Debits (Spent)</Text>
                <Text style={styles.metricValue}>
                  {solvency?.totalDebits != null ? solvency.totalDebits.toLocaleString() : "--"} 🪙
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Audit Discrepancy</Text>
                <Text style={styles.metricValue}>
                  {solvency?.discrepancy != null ? `${solvency.discrepancy} 🪙` : "0.0 🪙"}
                </Text>
              </View>
            </View>

            <Text style={styles.cardFootnote}>
              Authoritative double-entry ledger balance maintained with zero-deficit guarantee.
            </Text>
          </View>

          {/* Pending Alerts Banner */}
          {pendingApps.length > 0 && (
            <TouchableOpacity
              style={styles.alertCard}
              onPress={() => setActiveTab("applications")}
            >
              <Text style={styles.alertIcon}>🌾</Text>
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>
                  {pendingApps.length} Pending Farmer {pendingApps.length === 1 ? "Application" : "Applications"}
                </Text>
                <Text style={styles.alertDesc}>
                  Review agricultural credentials and approve certified collection rights.
                </Text>
              </View>
              <Text style={styles.alertAction}>Review &rarr;</Text>
            </TouchableOpacity>
          )}

          {/* Quick Stats Summary */}
          <View style={styles.statsRow}>
            <View style={styles.miniStatCard}>
              <Text style={styles.miniStatIcon}>👥</Text>
              <Text style={styles.miniStatNum}>{users.length}</Text>
              <Text style={styles.miniStatLabel}>Registered Users</Text>
            </View>
            <View style={styles.miniStatCard}>
              <Text style={styles.miniStatIcon}>🚜</Text>
              <Text style={styles.miniStatNum}>
                {users.filter((u) => u.role === "ROLE_FARMER").length}
              </Text>
              <Text style={styles.miniStatLabel}>Active Farmers</Text>
            </View>
            <View style={styles.miniStatCard}>
              <Text style={styles.miniStatIcon}>🏡</Text>
              <Text style={styles.miniStatNum}>
                {users.filter((u) => u.role === "ROLE_HOUSEHOLD").length}
              </Text>
              <Text style={styles.miniStatLabel}>Households</Text>
            </View>
          </View>
        </View>
      )}

      {/* 2. FARMER APPLICATIONS TAB */}
      {activeTab === "applications" && (
        <View style={styles.tabContent}>
          {pendingApps.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🌾</Text>
              <Text style={styles.emptyTitle}>No Pending Applications</Text>
              <Text style={styles.emptySubtitle}>
                All submitted agricultural farmer requests have been reviewed.
              </Text>
            </View>
          ) : (
            pendingApps.map((app) => (
              <View key={app.id} style={styles.applicationCard}>
                <View style={styles.appHeaderRow}>
                  <View>
                    <Text style={styles.appFarmName}>{app.farmName || "Agricultural Partner"}</Text>
                    <Text style={styles.appApplicantName}>Applicant: {app.userName || `User #${app.userId}`}</Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Pending Review</Text>
                  </View>
                </View>

                <View style={styles.appDetailBox}>
                  <Text style={styles.appDetailText}>📍 Address: {app.farmAddress || "Regional Location"}</Text>
                  <Text style={styles.appDetailText}>✉️ Email: {app.userEmail || "On File"}</Text>
                  {app.notes ? (
                    <Text style={styles.appDetailNotes}>Notes: {app.notes}</Text>
                  ) : null}
                </View>

                <View style={styles.appActionsRow}>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => app.id && handleRejectApplication(app.id, app.userName)}
                    disabled={actionInProgress === app.id}
                  >
                    <Text style={styles.rejectBtnText}>Decline</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => app.id && handleApproveApplication(app.id, app.userName)}
                    disabled={actionInProgress === app.id}
                  >
                    {actionInProgress === app.id ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.approveBtnText}>Approve &amp; Grant</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* 3. USERS DIRECTORY TAB */}
      {activeTab === "users" && (
        <View style={styles.tabContent}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email, or role..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#94a3b8"
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Text style={styles.clearSearch}>×</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {filteredUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👤</Text>
              <Text style={styles.emptyTitle}>No Users Found</Text>
              <Text style={styles.emptySubtitle}>No records matching &quot;{searchQuery}&quot;</Text>
            </View>
          ) : (
            filteredUsers.map((u) => {
              const isEnabled = u.enabled ?? true;
              return (
                <View key={u.id} style={styles.userCard}>
                  <View style={styles.userTopRow}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {u.name ? u.name[0].toUpperCase() : "U"}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <View style={styles.userNameRow}>
                        <Text style={styles.userName}>{u.name || "Unnamed User"}</Text>
                        <View
                          style={[
                            styles.userStatusBadge,
                            isEnabled ? styles.statusBadgeActive : styles.statusBadgeDisabled,
                          ]}
                        >
                          <Text
                            style={[
                              styles.userStatusText,
                              isEnabled ? styles.textActive : styles.textDisabled,
                            ]}
                          >
                            {isEnabled ? "Active" : "Suspended"}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.userEmail}>{u.email}</Text>
                      <View style={styles.userMetaRow}>
                        <Text style={styles.userRoleTag}>{u.role}</Text>
                        {u.address ? (
                          <Text style={styles.userAddress} numberOfLines={1}>
                            📍 {u.address}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  <View style={styles.userBottomRow}>
                    <TouchableOpacity
                      style={[
                        styles.toggleStatusBtn,
                        isEnabled ? styles.btnSuspend : styles.btnActivate,
                      ]}
                      onPress={() => handleToggleUserStatus(u)}
                      disabled={actionInProgress === u.id}
                    >
                      {actionInProgress === u.id ? (
                        <ActivityIndicator size="small" color="#475569" />
                      ) : (
                        <Text
                          style={[
                            styles.toggleStatusText,
                            isEnabled ? styles.textSuspend : styles.textActivate,
                          ]}
                        >
                          {isEnabled ? "Suspend Access" : "Enable Access"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f8fafc",
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  lockIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  authRequiredTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 8,
    textAlign: "center",
  },
  authRequiredSubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 280,
  },
  signInBtn: {
    backgroundColor: "#16a34a",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  signInBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
  },
  header: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badge: {
    backgroundColor: "#e0e7ff",
    color: "#4338ca",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    textTransform: "uppercase",
  },
  refreshBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    lineHeight: 18,
  },
  segmentControl: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  segmentTextActive: {
    color: "#0f172a",
    fontWeight: "bold",
  },
  tabContent: {
    gap: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#0f172a",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pillSolvent: {
    backgroundColor: "#dcfce7",
  },
  pillAtRisk: {
    backgroundColor: "#fee2e2",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#15803d",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  metricBox: {
    width: "48%",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  metricLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  cardFootnote: {
    fontSize: 11,
    color: "#94a3b8",
    fontStyle: "italic",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1e40af",
  },
  alertDesc: {
    fontSize: 11,
    color: "#3b82f6",
    marginTop: 2,
    lineHeight: 15,
  },
  alertAction: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1d4ed8",
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  miniStatCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  miniStatIcon: {
    fontSize: 18,
    marginBottom: 4,
  },
  miniStatNum: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  miniStatLabel: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
    textAlign: "center",
  },
  applicationCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10,
  },
  appHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  appFarmName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#0f172a",
  },
  appApplicantName: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#92400e",
  },
  appDetailBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 10,
    gap: 4,
  },
  appDetailText: {
    fontSize: 12,
    color: "#334155",
  },
  appDetailNotes: {
    fontSize: 11,
    color: "#64748b",
    fontStyle: "italic",
    marginTop: 2,
  },
  appActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  rejectBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#64748b",
  },
  approveBtn: {
    flex: 2,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#16a34a",
    alignItems: "center",
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#ffffff",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginBottom: 4,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0f172a",
  },
  clearSearch: {
    fontSize: 18,
    color: "#94a3b8",
    paddingHorizontal: 4,
  },
  userCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  userTopRow: {
    flexDirection: "row",
    gap: 12,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#475569",
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  userStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeActive: {
    backgroundColor: "#dcfce7",
  },
  statusBadgeDisabled: {
    backgroundColor: "#fee2e2",
  },
  userStatusText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  textActive: {
    color: "#15803d",
  },
  textDisabled: {
    color: "#b91c1c",
  },
  userEmail: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 1,
  },
  userMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  userRoleTag: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#3b82f6",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  userAddress: {
    fontSize: 11,
    color: "#94a3b8",
    flex: 1,
  },
  userBottomRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  toggleStatusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  btnSuspend: {
    backgroundColor: "#fef2f2",
  },
  btnActivate: {
    backgroundColor: "#f0fdf4",
  },
  toggleStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  textSuspend: {
    color: "#dc2626",
  },
  textActivate: {
    color: "#16a34a",
  },
  emptyState: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#0f172a",
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
  },
});
