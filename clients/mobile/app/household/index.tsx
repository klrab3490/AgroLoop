import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Link, useRouter } from "expo-router";
import { mobileApiClient } from "../../src/lib/api.js";
import { useAuth } from "../../src/context/auth-context.js";

export default function HouseholdScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchBalance() {
      if (!isAuthenticated) return;
      setLoadingBalance(true);
      try {
        const res = await mobileApiClient.household.getBalance();
        if (isMounted) setBalance(res.availableBalance ?? 0);
      } catch {
        if (isMounted) setBalance(0);
      } finally {
        if (isMounted) setLoadingBalance(false);
      }
    }

    fetchBalance();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.badge}>Household Sustainability Hub</Text>
        <Text style={styles.title}>Manage Waste & Tokens</Text>
        <Text style={styles.subtitle}>
          Turn kitchen and garden waste into clean compost and verified EcoTokens
        </Text>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Your EcoToken Balance</Text>
        {loadingBalance ? (
          <ActivityIndicator color="#16a34a" style={{ marginVertical: 8 }} />
        ) : (
          <Text style={styles.balanceValue}>
            {balance !== null ? balance.toFixed(2) : "--"} <Text style={styles.tokenUnit}>TOKENS</Text>
          </Text>
        )}
        <Text style={styles.balanceSub}>
          Redeemable across circular marketplace products and local organic produce
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <Link href="/household/submit" asChild>
          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIcon}>🌱</Text>
            </View>
            <View style={styles.actionTextCol}>
              <Text style={styles.actionTitle}>Log Waste Submission</Text>
              <Text style={styles.actionDesc}>
                Weigh organic waste, attach camera proof, and earn instant token estimates.
              </Text>
            </View>
            <Text style={styles.arrow}>&rarr;</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/household/pickup" asChild>
          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIcon}>🚛</Text>
            </View>
            <View style={styles.actionTextCol}>
              <Text style={styles.actionTitle}>Schedule Pickup</Text>
              <Text style={styles.actionDesc}>
                Book a farmer or fleet truck to collect accumulated organic waste batches.
              </Text>
            </View>
            <Text style={styles.arrow}>&rarr;</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/household/history" asChild>
          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIcon}>📋</Text>
            </View>
            <View style={styles.actionTextCol}>
              <Text style={styles.actionTitle}>Waste & Token History</Text>
              <Text style={styles.actionDesc}>
                Inspect verified submissions, active pickup requests, and ledger transactions.
              </Text>
            </View>
            <Text style={styles.arrow}>&rarr;</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f8fafc",
    flexGrow: 1,
  },
  header: {
    marginBottom: 20,
  },
  badge: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#15803d",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
  },
  balanceCard: {
    backgroundColor: "#16a34a",
    borderRadius: 14,
    padding: 20,
    marginBottom: 24,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#dcfce7",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 6,
  },
  tokenUnit: {
    fontSize: 16,
    fontWeight: "700",
  },
  balanceSub: {
    fontSize: 12,
    color: "#bbf7d0",
    lineHeight: 16,
  },
  actionsContainer: {
    gap: 14,
  },
  actionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 16,
  },
  arrow: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#16a34a",
    marginLeft: 8,
  },
});
