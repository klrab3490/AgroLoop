import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { mobileApiClient } from "../../src/lib/api";
import { useAuth } from "../../src/context/auth-context";
import type {
  WasteSubmissionApiResponse,
  EcoTokenTransactionApiResponse,
  HouseholdBalanceResponse,
} from "@agroloop/api-types";

const CATEGORY_MAP: Record<string, { label: string; icon: string }> = {
  FOOD_SCRAPS: { label: "Food Scraps", icon: "🍎" },
  GARDEN_WASTE: { label: "Garden Waste", icon: "🍂" },
  AGRICULTURAL_ORGANIC: { label: "Agricultural", icon: "🌾" },
  COFFEE_GROUNDS: { label: "Coffee Grounds", icon: "☕" },
};

export default function HouseholdHistoryScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<"SUBMISSIONS" | "LEDGER">("SUBMISSIONS");
  const [balance, setBalance] = useState<HouseholdBalanceResponse | null>(null);
  const [submissions, setSubmissions] = useState<WasteSubmissionApiResponse[]>([]);
  const [ledger, setLedger] = useState<EcoTokenTransactionApiResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [balRes, subsRes, ledgRes] = await Promise.allSettled([
        mobileApiClient.household.getBalance(),
        mobileApiClient.household.getSubmissions(),
        mobileApiClient.household.getLedger(),
      ]);

      if (balRes.status === "fulfilled") setBalance(balRes.value);
      if (subsRes.status === "fulfilled") setSubmissions(subsRes.value ?? []);
      if (ledgRes.status === "fulfilled") setLedger(ledgRes.value ?? []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#16a34a"]} />}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>&larr; Back to Hub</Text>
        </TouchableOpacity>
        <Text style={styles.title}>History & Ledger</Text>
        <Text style={styles.subtitle}>
          Complete audit trail of submitted waste batches and minted token transactions
        </Text>
      </View>

      {/* Balance Summary Card */}
      <View style={styles.balanceSummaryCard}>
        <View style={styles.balanceCol}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceValue}>
            {balance?.availableBalance !== undefined ? balance.availableBalance.toFixed(2) : "--"}{" "}
            <Text style={styles.balanceUnit}>TOKENS</Text>
          </Text>
        </View>
        <View style={styles.balanceDivider} />
        <View style={styles.balanceCol}>
          <Text style={styles.balanceLabel}>Pending Verification</Text>
          <Text style={styles.balancePendingValue}>
            {balance?.pendingBalance !== undefined ? balance.pendingBalance.toFixed(2) : "--"}{" "}
            <Text style={styles.balanceUnit}>PENDING</Text>
          </Text>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "SUBMISSIONS" && styles.tabButtonActive]}
          onPress={() => setActiveTab("SUBMISSIONS")}
        >
          <Text style={[styles.tabText, activeTab === "SUBMISSIONS" && styles.tabTextActive]}>
            Waste Batches ({submissions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "LEDGER" && styles.tabButtonActive]}
          onPress={() => setActiveTab("LEDGER")}
        >
          <Text style={[styles.tabText, activeTab === "LEDGER" && styles.tabTextActive]}>
            Token Ledger ({ledger.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loaderText}>Loading history records...</Text>
        </View>
      ) : activeTab === "SUBMISSIONS" ? (
        submissions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No Submissions Yet</Text>
            <Text style={styles.emptyDesc}>
              Log your first organic waste submission to start diverting compostable waste from landfills.
            </Text>
            <TouchableOpacity
              style={styles.newSubmissionBtn}
              onPress={() => router.push("/household/submit")}
            >
              <Text style={styles.newSubmissionBtnText}>+ Log Waste Submission</Text>
            </TouchableOpacity>
          </View>
        ) : (
          submissions.map((sub) => {
            const cat = CATEGORY_MAP[sub.category ?? "FOOD_SCRAPS"] ?? {
              label: sub.category,
              icon: "🌱",
            };
            const isVerified = sub.status === "VERIFIED";
            const isCancelled = sub.status === "CANCELLED" || sub.status === "REJECTED";

            return (
              <View key={sub.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={styles.categoryLabel}>{cat.label}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      isVerified
                        ? styles.pillVerified
                        : isCancelled
                        ? styles.pillCancelled
                        : styles.pillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isVerified
                          ? styles.pillTextVerified
                          : isCancelled
                          ? styles.pillTextCancelled
                          : styles.pillTextActive,
                      ]}
                    >
                      {sub.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Estimated Weight:</Text>
                    <Text style={styles.dataValueBold}>{sub.estimatedWeight} kg</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Batch Reference:</Text>
                    <Text style={styles.dataValue}>#{sub.id}</Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Collection Point:</Text>
                    <Text style={styles.dataValue} numberOfLines={1}>
                      {sub.collectionAddress || "Registered Household Address"}
                    </Text>
                  </View>
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Submitted On:</Text>
                    <Text style={styles.dataValue}>
                      {sub.createdAt ? new Date(sub.createdAt).toLocaleString() : "--"}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )
      ) : ledger.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🪙</Text>
          <Text style={styles.emptyTitle}>No Transactions Yet</Text>
          <Text style={styles.emptyDesc}>
            Transactions will appear here once farmers verify your organic waste collections or you redeem tokens.
          </Text>
        </View>
      ) : (
        ledger.map((tx) => {
          const isCredit = tx.direction === "CREDIT";

          return (
            <View key={tx.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.txTypeBox}>
                  <Text style={styles.txTypeIcon}>{isCredit ? "💰" : "🛒"}</Text>
                  <View>
                    <Text style={styles.txTypeText}>
                      {tx.transactionType?.replace(/_/g, " ") ?? "TRANSACTION"}
                    </Text>
                    <Text style={styles.txTime}>
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "--"}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.txAmount,
                    isCredit ? styles.txAmountCredit : styles.txAmountDebit,
                  ]}
                >
                  {isCredit ? "+" : "-"}
                  {tx.amount?.toFixed(2)}
                </Text>
              </View>

              <View style={styles.cardBody}>
                {tx.description && (
                  <Text style={styles.txDescription}>{tx.description}</Text>
                )}
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Balance After Transaction:</Text>
                  <Text style={styles.dataValueBold}>
                    {tx.balanceAfter !== undefined ? tx.balanceAfter.toFixed(2) : "--"} TOKENS
                  </Text>
                </View>
              </View>
            </View>
          );
        })
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
  balanceSummaryCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  balanceCol: {
    flex: 1,
    alignItems: "center",
  },
  balanceDivider: {
    width: 1,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 12,
  },
  balanceLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#16a34a",
  },
  balancePendingValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#eab308",
  },
  balanceUnit: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94a3b8",
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
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
    alignItems: "center",
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  pillActive: {
    backgroundColor: "#dcfce7",
  },
  pillTextActive: {
    color: "#15803d",
  },
  pillVerified: {
    backgroundColor: "#e0e7ff",
  },
  pillTextVerified: {
    color: "#4338ca",
  },
  pillCancelled: {
    backgroundColor: "#fee2e2",
  },
  pillTextCancelled: {
    color: "#b91c1c",
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
    gap: 6,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dataLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  dataValue: {
    fontSize: 13,
    color: "#334155",
  },
  dataValueBold: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  txTypeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  txTypeIcon: {
    fontSize: 22,
  },
  txTypeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
  txTime: {
    fontSize: 11,
    color: "#94a3b8",
  },
  txAmount: {
    fontSize: 18,
    fontWeight: "bold",
  },
  txAmountCredit: {
    color: "#16a34a",
  },
  txAmountDebit: {
    color: "#dc2626",
  },
  txDescription: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 4,
  },
});
