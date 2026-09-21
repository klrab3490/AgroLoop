import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { useAuth } from "../../src/context/auth-context";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (overrideEmail?: string, overridePassword?: string) => {
    const targetEmail = overrideEmail ?? email;
    const targetPassword = overridePassword ?? password;

    if (!targetEmail.trim() || !targetPassword.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await login({
        email: targetEmail.trim(),
        password: targetPassword,
      });
      router.replace("/");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message || "Failed to sign in. Please check credentials.");
      } else {
        setErrorMessage("An unexpected error occurred during login.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (role: "HOUSEHOLD" | "FARMER") => {
    if (role === "HOUSEHOLD") {
      setEmail("household@agroloop.com");
      setPassword("household123");
      handleLogin("household@agroloop.com", "household123");
    } else {
      setEmail("farmer@agroloop.com");
      setPassword("farmer123");
      handleLogin("farmer@agroloop.com", "farmer123");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardContainer}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.badge}>AgroLoop Identity</Text>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>
            Access your household or farmer sustainability portal
          </Text>
        </View>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. user@agroloop.com"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            disabled={submitting}
            onPress={() => handleLogin()}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Demo Credentials */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>One-Tap Demo Credentials</Text>
          <View style={styles.demoRow}>
            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => fillDemo("HOUSEHOLD")}
              disabled={submitting}
            >
              <Text style={styles.demoButtonText}>Household Demo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.demoButton}
              onPress={() => fillDemo("FARMER")}
              disabled={submitting}
            >
              <Text style={styles.demoButtonText}>Farmer Demo</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account yet? </Text>
          <Link href="/auth/register" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Register</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  container: {
    padding: 24,
    flexGrow: 1,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
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
  },
  errorBanner: {
    backgroundColor: "#fee2e2",
    borderColor: "#f87171",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "500",
  },
  form: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0f172a",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  demoSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    alignItems: "center",
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  demoRow: {
    flexDirection: "row",
    gap: 12,
  },
  demoButton: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 6,
  },
  demoButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1e293b",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    fontSize: 14,
    color: "#64748b",
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
    color: "#16a34a",
  },
});
