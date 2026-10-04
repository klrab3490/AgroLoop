import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { mobileApiClient } from "../../src/lib/api";
import { useAuth } from "../../src/context/auth-context";
import type { FarmerApplicationApiResponse } from "@agroloop/api-types";

export default function ApplyFarmerScreen() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [existingApp, setExistingApp] = useState<FarmerApplicationApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [farmName, setFarmName] = useState("");
  const [farmAddress, setFarmAddress] = useState("");
  const [notes, setNotes] = useState("");

  const fetchApplication = async () => {
    setLoading(true);
    setError(null);
    try {
      const app = await mobileApiClient.household.getFarmerApplication();
      setExistingApp(app);
      if (app) {
        setFarmName(app.farmName || "");
        setFarmAddress(app.farmAddress || "");
        setNotes(app.notes || "");
      }
    } catch {
      // 404 or no application
      setExistingApp(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchApplication();
    }
  }, [isAuthenticated]);

  const handleSubmit = async () => {
    if (!farmName.trim() || !farmAddress.trim()) {
      Alert.alert("Missing Fields", "Please specify both your farm name and physical facility address.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await mobileApiClient.household.submitFarmerApplication({
        farmName: farmName.trim(),
        farmAddress: farmAddress.trim(),
        notes: notes.trim() || null,
      });
      setExistingApp(result);
      Alert.alert(
        "Application Submitted",
        "Your farmer partner application has been received and queued for administrative review."
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit farmer application");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Checking application status...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back to Household</Text>
        </TouchableOpacity>
        <Text style={styles.badge}>Circular Agriculture Partnership</Text>
        <Text style={styles.title}>Apply to Become a Farmer Partner</Text>
        <Text style={styles.subtitle}>
          Expand your circular economy role from consumer waste contributor to agricultural producer and marketplace vendor.
        </Text>
      </View>

      {/* Existing Application Status Card */}
      {existingApp && (
        <View
          style={[
            styles.statusCard,
            existingApp.status === "PENDING"
              ? styles.statusCardPending
              : existingApp.status === "APPROVED"
              ? styles.statusCardApproved
              : styles.statusCardRejected,
          ]}
        >
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>
              {existingApp.status === "PENDING"
                ? "⏳ Application Under Administrative Review"
                : existingApp.status === "APPROVED"
                ? "🎉 Application Approved!"
                : "⚠️ Application Rejected"}
            </Text>
            <Text style={styles.statusBadge}>{existingApp.status}</Text>
          </View>
          <Text style={styles.statusDetails}>
            Target Farm: <Text style={styles.bold}>{existingApp.farmName}</Text>
          </Text>
          <Text style={styles.statusDetails}>
            Address: <Text style={styles.bold}>{existingApp.farmAddress}</Text>
          </Text>
          {existingApp.notes ? (
            <Text style={styles.statusNotes}>&ldquo;{existingApp.notes}&rdquo;</Text>
          ) : null}
          {existingApp.status === "REJECTED" && existingApp.rejectionReason && (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionLabel}>Reviewer Feedback:</Text>
              <Text style={styles.rejectionText}>{existingApp.rejectionReason}</Text>
            </View>
          )}
          {existingApp.status === "APPROVED" && (
            <Text style={styles.approvedNotice}>
              You have been granted ROLE_FARMER privileges. Switch to the Farmer Portal or re-login to access inventory management!
            </Text>
          )}
        </View>
      )}

      {/* Submission Form (Shown if no application or if rejected/resubmitting) */}
      {(!existingApp || existingApp.status === "REJECTED") && (
        <View style={styles.formCard}>
          <Text style={styles.formSectionTitle}>
            {existingApp?.status === "REJECTED" ? "Update & Resubmit Proposal" : "Producer Credentials & Entity"}
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Farm or Agricultural Facility Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Sunny Acres Organic Co."
              value={farmName}
              onChangeText={setFarmName}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Farm Physical Location & Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Route 4, High Range Road, Aluva"
              value={farmAddress}
              onChangeText={setFarmAddress}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Agronomic Capabilities & Composting Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your compost intake capacity, crops produced, or agricultural equipment..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              placeholderTextColor="#94a3b8"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {existingApp?.status === "REJECTED" ? "Resubmit Application" : "Submit Farmer Application"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#f8fafc",
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#16a34a",
  },
  badge: {
    fontSize: 11,
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
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
  },
  statusCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  statusCardPending: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  statusCardApproved: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  statusCardRejected: {
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3",
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    flex: 1,
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    overflow: "hidden",
  },
  statusDetails: {
    fontSize: 12,
    color: "#334155",
    marginBottom: 4,
  },
  bold: {
    fontWeight: "700",
  },
  statusNotes: {
    fontSize: 12,
    fontStyle: "italic",
    color: "#64748b",
    marginTop: 4,
  },
  rejectionBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecdd3",
  },
  rejectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#e11d48",
    marginBottom: 2,
  },
  rejectionText: {
    fontSize: 12,
    color: "#475569",
  },
  approvedNotice: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: "600",
    color: "#15803d",
    lineHeight: 16,
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  formSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "600",
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: "#0f172a",
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
