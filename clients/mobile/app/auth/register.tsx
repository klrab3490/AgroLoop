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
import { useAuth } from "../../src/context/auth-context.js";

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [role, setRole] = useState<"HOUSEHOLD" | "FARMER">("HOUSEHOLD");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !address.trim()) {
      setErrorMessage("Please fill in all fields (Name, Email, Password, Address).");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        address: address.trim(),
        clientType: "MOBILE",
      });
      router.replace("/");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message || "Registration failed. Please check inputs.");
      } else {
        setErrorMessage("An unexpected error occurred during registration.");
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
          <Text style={styles.badge}>Join Circular Economy</Text>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Register as a Household or Farmer on AgroLoop
          </Text>
        </View>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.form}>
          {/* Role Selector */}
          <Text style={styles.label}>Account Role</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleOption, role === "HOUSEHOLD" && styles.roleOptionActive]}
              onPress={() => setRole("HOUSEHOLD")}
            >
              <Text
                style={[
                  styles.roleOptionText,
                  role === "HOUSEHOLD" && styles.roleOptionTextActive,
                ]}
              >
                Household
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleOption, role === "FARMER" && styles.roleOptionActive]}
              onPress={() => setRole("FARMER")}
            >
              <Text
                style={[
                  styles.roleOptionText,
                  role === "FARMER" && styles.roleOptionTextActive,
                ]}
              >
                Farmer
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Jane Doe"
            placeholderTextColor="#94a3b8"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. jane@example.com"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="At least 6 characters"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Text style={styles.label}>Address / Farm Location</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 42 Green Valley Rd, Farmville"
            placeholderTextColor="#94a3b8"
            value={address}
            onChangeText={setAddress}
          />

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            disabled={submitting}
            onPress={handleRegister}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Register Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already registered? </Text>
          <Link href="/auth/login" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign In</Text>
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
    marginBottom: 24,
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
  roleContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  roleOptionActive: {
    borderColor: "#16a34a",
    backgroundColor: "#dcfce7",
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  roleOptionTextActive: {
    color: "#15803d",
    fontWeight: "700",
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
