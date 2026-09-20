import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Link, useRouter } from "expo-router";
import { mobileApiClient } from "../../src/lib/api.js";
import { useAuth } from "../../src/context/auth-context.js";

export default function FarmerScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [availableCount, setAvailableCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      if (!isAuthenticated) return;
      setLoading(true);
      try {
        const avail = await mobileApiClient.farmer.getAvailablePickups();
        if (isMounted) setAvailableCount(avail?.length ?? 0);
      } catch {
        if (isMounted) setAvailableCount(0);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadStats();
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.badge}>Agricultural Partner Hub</Text>
        <Text style={styles.title}>Farmer Operations</Text>
        <Text style={styles.subtitle}>
          Source premium organic waste feedstock, plan collection routes, and mint EcoTokens on-site
        </Text>
      </View>

      {/* Stats Card */}
      <View style={styles.statsCard}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Available Pickups</Text>
          {loading ? (
            <ActivityIndicator color="#16a34a" style={{ marginVertical: 4 }} />
          ) : (
            <Text style={styles.statValue}>{availableCount !== null ? availableCount : "--"}</Text>
          )}
          <Text style={styles.statSub}>Ready for regional claim</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Standard Token Rate</Text>
          <Text style={styles.statValue}>5.0</Text>
          <Text style={styles.statSub}>EcoTokens per kg</Text>
        </View>
      </View>

      {/* Action Cards */}
      <View style={styles.actionsContainer}>
        <Link href="/farmer/collections" asChild>
          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIcon}>🌾</Text>
            </View>
            <View style={styles.actionTextCol}>
              <Text style={styles.actionTitle}>Waste Collection Board</Text>
              <Text style={styles.actionDesc}>
                Browse available household batches, claim collections, and schedule pickup slots.
              </Text>
            </View>
            <Text style={styles.arrow}>&rarr;</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/farmer/verify" asChild>
          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionIconBox}>
              <Text style={styles.actionIcon}>⚖️</Text>
            </View>
            <View style={styles.actionTextCol}>
              <Text style={styles.actionTitle}>On-Site Verification</Text>
              <Text style={styles.actionDesc}>
                Record scale readings, assign quality grades (A-C), attach photo proof, and mint tokens.
              </Text>
            </View>
            <Text style={styles.arrow}>&rarr;</Text>
          </TouchableOpacity>
        </Link>
      </View>

      {/* Quality Standards Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Batch Purity Certification</Text>
        <Text style={styles.infoText}>
          All collected organic material is converted to nutrient-rich compost and biogas. Grade A
          batches qualify for a 20% incentive multiplier on token emissions.
        </Text>
      </View>
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
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#dcfce7",
    color: "#15803d",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#0f172a",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
    lineHeight: 20,
  },
  statsCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statCol: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 12,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#16a34a",
  },
  statSub: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#f0fdf4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 15,
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
    color: "#cbd5e1",
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#15803d",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: "#166534",
    lineHeight: 18,
  },
});
