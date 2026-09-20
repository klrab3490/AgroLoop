import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { verifyServer, type ServerVerificationResult } from "@agroloop/api-client";
import {
  getServerConfig,
  saveServerConfig,
  clearServerConfig,
  getServerHostname,
} from "../src/storage/server-config.js";
import { setMobileServerUrl, defaultBaseUrl } from "../src/lib/api.js";

const PRESETS = [
  { label: "Android Emulator", url: "http://10.0.2.2:8080" },
  { label: "Localhost", url: "http://localhost:8080" },
  { label: "Cloud Demo", url: "https://api.agroloop.app" },
];

export default function ServerSetupScreen() {
  const router = useRouter();
  const [serverUrl, setServerUrl] = useState(defaultBaseUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ServerVerificationResult | null>(null);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [timeoutSec, setTimeoutSec] = useState("5");

  useEffect(() => {
    getServerConfig().then((config) => {
      if (config?.url) {
        setServerUrl(config.url);
        setHasExistingConfig(true);
      }
    });
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    const timeoutMs = (parseInt(timeoutSec, 10) || 5) * 1000;
    try {
      const result = await verifyServer(serverUrl, {
        clientVersion: "1.0.0",
        timeoutMs,
      });
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        ok: false,
        url: serverUrl,
        reason: "NETWORK_ERROR",
        message: err?.message || "Failed to initiate server verification.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveAndContinue = async () => {
    if (!testResult || !testResult.ok) {
      await handleTestConnection();
      return;
    }

    await saveServerConfig({
      url: testResult.url,
      verifiedAt: new Date().toISOString(),
      serverVersion: testResult.meta.server_version,
      apiVersion: testResult.meta.api_version,
    });

    setMobileServerUrl(testResult.url);
    router.replace("/");
  };

  const handleResetServer = async () => {
    await clearServerConfig();
    setServerUrl(defaultBaseUrl);
    setTestResult(null);
    setMobileServerUrl(defaultBaseUrl);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.brandHeader}>
          <View style={styles.badgeRow}>
            <Text style={styles.badgeText}>Phase 8 Server Discovery</Text>
          </View>
          <Text style={styles.title}>AgroLoop</Text>
          <Text style={styles.subtitle}>Connect to AgroLoop Server</Text>
        </View>

        {/* Server URL Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Server URL</Text>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={(text) => {
              setServerUrl(text);
              setTestResult(null);
            }}
            placeholder="https://api.agroloop.app or http://10.0.2.2:8080"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
        </View>

        {/* Quick Presets */}
        <View style={styles.presetsRow}>
          {PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.url}
              style={[
                styles.presetChip,
                serverUrl === preset.url && styles.presetChipActive,
              ]}
              onPress={() => {
                setServerUrl(preset.url);
                setTestResult(null);
              }}
            >
              <Text
                style={[
                  styles.presetChipText,
                  serverUrl === preset.url && styles.presetChipTextActive,
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Test Connection Button */}
        <TouchableOpacity
          style={[styles.testBtn, testing && styles.btnDisabled]}
          onPress={handleTestConnection}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.testBtnText}>Test Connection</Text>
          )}
        </TouchableOpacity>

        {/* Verification Status Card */}
        {testResult && (
          <View
            style={[
              styles.resultCard,
              testResult.ok ? styles.resultCardSuccess : styles.resultCardError,
            ]}
          >
            {testResult.ok ? (
              <>
                <Text style={styles.resultTitleSuccess}>✓ Server Reachable</Text>
                <Text style={styles.resultDetails}>
                  {getServerHostname(testResult.url)} · {testResult.latencyMs}ms
                </Text>
                <Text style={styles.resultSubtext}>
                  Service: {testResult.meta.service} · API: {testResult.meta.api_version} · Server: v{testResult.meta.server_version}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.resultTitleError}>
                  ❌ Connection Failed ({testResult.reason})
                </Text>
                <Text style={styles.resultErrorMessage}>
                  {testResult.message}
                </Text>
              </>
            )}
          </View>
        )}

        {/* Continue Button */}
        <TouchableOpacity
          style={[
            styles.continueBtn,
            (!testResult || !testResult.ok) && styles.continueBtnDisabled,
          ]}
          onPress={handleSaveAndContinue}
          disabled={!testResult || !testResult.ok}
        >
          <Text style={styles.continueBtnText}>Continue to AgroLoop</Text>
        </TouchableOpacity>

        {/* Advanced Accordion */}
        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={styles.advancedToggleText}>
            {showAdvanced ? "▾ Advanced Settings" : "▸ Advanced Settings"}
          </Text>
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.advancedBox}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Connection Timeout (seconds)</Text>
              <TextInput
                style={styles.inputSmall}
                value={timeoutSec}
                onChangeText={setTimeoutSec}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity
              style={styles.resetBtn}
              onPress={handleResetServer}
            >
              <Text style={styles.resetBtnText}>Reset to Default Server</Text>
            </TouchableOpacity>

            {hasExistingConfig && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => router.back()}
              >
                <Text style={styles.cancelBtnText}>Back to App</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#030712",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#111827",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1f2937",
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  brandHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  badgeRow: {
    backgroundColor: "#064e3b",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    color: "#34d399",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: "#f9fafb",
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: "#d1d5db",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#f9fafb",
    fontSize: 15,
  },
  inputSmall: {
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#f9fafb",
    fontSize: 14,
    width: 80,
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  presetChip: {
    backgroundColor: "#1f2937",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#374151",
  },
  presetChipActive: {
    backgroundColor: "#065f46",
    borderColor: "#10b981",
  },
  presetChipText: {
    color: "#9ca3af",
    fontSize: 12,
  },
  presetChipTextActive: {
    color: "#a7f3d0",
    fontWeight: "600",
  },
  testBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  testBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  resultCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  resultCardSuccess: {
    backgroundColor: "#064e3b",
    borderColor: "#059669",
  },
  resultCardError: {
    backgroundColor: "#450a0a",
    borderColor: "#dc2626",
  },
  resultTitleSuccess: {
    color: "#34d399",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  resultTitleError: {
    color: "#f87171",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  resultDetails: {
    color: "#e5e7eb",
    fontSize: 13,
    fontWeight: "600",
  },
  resultSubtext: {
    color: "#a7f3d0",
    fontSize: 11,
    marginTop: 2,
  },
  resultErrorMessage: {
    color: "#fca5a5",
    fontSize: 12,
    lineHeight: 16,
  },
  continueBtn: {
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  continueBtnDisabled: {
    backgroundColor: "#1f2937",
    opacity: 0.5,
  },
  continueBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  advancedToggle: {
    alignItems: "center",
    paddingVertical: 6,
  },
  advancedToggleText: {
    color: "#9ca3af",
    fontSize: 13,
    fontWeight: "600",
  },
  advancedBox: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#1f2937",
  },
  resetBtn: {
    backgroundColor: "#374151",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
  },
  resetBtnText: {
    color: "#f3f4f6",
    fontSize: 13,
    fontWeight: "600",
  },
  cancelBtn: {
    paddingVertical: 8,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#9ca3af",
    fontSize: 13,
  },
});
