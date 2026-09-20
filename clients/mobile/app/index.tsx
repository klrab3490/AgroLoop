import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from "react-native";
import { Link } from "expo-router";

export default function IndexScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.badge}>Phase 8 Verified</Text>
        <Text style={styles.title}>AgroLoop Mobile</Text>
        <Text style={styles.subtitle}>
          Universal Client Monorepo • Hardware Secure Storage • Offline Resilience
        </Text>
      </View>

      <View style={styles.cardContainer}>
        <Link href="/household" asChild>
          <TouchableOpacity style={styles.card}>
            <Text style={styles.cardTitle}>Household Portal</Text>
            <Text style={styles.cardDescription}>
              Schedule organic waste pickups, log segregated waste, and upload camera-verified sorting proofs.
            </Text>
            <Text style={styles.cardAction}>Open Household &rarr;</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/farmer" asChild>
          <TouchableOpacity style={styles.card}>
            <Text style={styles.cardTitle}>Farmer Portal</Text>
            <Text style={styles.cardDescription}>
              Browse compost and organic fertilizer batches, place marketplace orders, and track deliveries.
            </Text>
            <Text style={styles.cardAction}>Open Farmer Marketplace &rarr;</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: "#f8fafc",
  },
  header: {
    marginVertical: 24,
    alignItems: "center",
  },
  badge: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#15803d",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    maxWidth: 280,
  },
  cardContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
    marginBottom: 12,
  },
  cardAction: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16a34a",
  },
});
