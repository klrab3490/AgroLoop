import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuth } from "../../src/context/auth-context";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (overrideEmail?: string, overridePass?: string) => {
    const loginEmail = (overrideEmail || email).trim();
    const loginPass = overridePass || password;

    if (!loginEmail || !loginPass) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const user = await login({ email: loginEmail, password: loginPass });
      // Route based on role
      if (user.role === "ROLE_FARMER") {
        router.replace("/farmer");
      } else if (user.role === "ROLE_HOUSEHOLD") {
        router.replace("/household");
      } else {
        router.replace("/household");
      }
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardContainer}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View style={styles.badgeContainer}>
            <Text style={styles.badge}>AgroLoop Identity</Text>
          </View>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>
            Enter your credentials to access the decentralized circular economy network.
          </Text>
        </View>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.glassCard}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.glassInput}
            value={email}
            onChangeText={setEmail}
            placeholder="operator@agroloop.com"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!submitting}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.glassInput}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            editable={!submitting}
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
    backgroundColor: "#f1f5f9",
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
  badgeContainer: {
    backgroundColor: "rgba(220, 252, 231, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(134, 239, 172, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
  },
  badge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803d",
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
  errorBanner: {
    backgroundColor: "rgba(254, 226, 226, 0.9)",
    borderColor: "rgba(248, 113, 113, 0.8)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "600",
  },
  glassCard: {
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.7)",
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  glassInput: {
    backgroundColor: "rgba(248, 250, 252, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(203, 213, 225, 0.8)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0f172a",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
    shadowColor: "#16a34a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
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
