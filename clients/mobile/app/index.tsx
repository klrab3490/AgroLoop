import React from "react";
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "../src/context/auth-context.js";

export default function IndexScreen() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.badge}>Phase 9 Mobile Client</Text>
        <Text style={styles.title}>AgroLoop Mobile</Text>
        <Text style={styles.subtitle}>
          Circular Waste-to-Resource Platform • Hardware Secure Keystore
        </Text>
      </View>

      {/* User Session Banner */}
      <View style={styles.sessionCard}>
        {isLoading ? (
          <ActivityIndicator color="#16a34a" />
        ) : isAuthenticated && user ? (
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name ? user.name[0].toUpperCase() : "U"}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>{user.role}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Text style={styles.logoutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.guestRow}>
            <View>
              <Text style={styles.guestTitle}>Guest Mode</Text>
              <Text style={styles.guestSubtitle}>Sign in to schedule pickups & earn tokens</Text>
            </View>
            <TouchableOpacity
              style={styles.signInBtn}
              onPress={() => router.push("/auth/login")}
            >
              <Text style={styles.signInBtnText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.cardContainer}>
        <Link href="/household" asChild>
          <TouchableOpacity style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Household Portal</Text>
              <Text style={styles.cardTag}>Households</Text>
            </View>
            <Text style={styles.cardDescription}>
              Schedule organic waste pickups, log segregated waste, and upload camera-verified sorting proofs.
            </Text>
            <Text style={styles.cardAction}>Open Household &rarr;</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/farmer" asChild>
          <TouchableOpacity style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Farmer Portal</Text>
              <Text style={styles.cardTag}>Farmers</Text>
            </View>
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
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cardTag: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284c7",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sessionCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 20,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 18,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  profileEmail: {
    fontSize: 13,
    color: "#64748b",
  },
  roleTag: {
    alignSelf: "flex-start",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#15803d",
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  guestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  guestTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  guestSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  signInBtn: {
    backgroundColor: "#16a34a",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  signInBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
});
