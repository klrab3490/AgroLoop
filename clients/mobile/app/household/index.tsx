import React from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";

export default function HouseholdScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Household Waste & Pickups</Text>
        <Text style={styles.description}>
          Schedule organic waste collection, earn eco-credits, and log segregated materials.
        </Text>
        <View style={styles.badgeContainer}>
          <Text style={styles.badge}>Camera Verification Ready</Text>
          <Text style={styles.badge}>Offline Media Queue</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#f8fafc",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
    marginBottom: 16,
  },
  badgeContainer: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    fontSize: 12,
    color: "#15803d",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: "hidden",
  },
});
