import React, { useMemo, useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { generateQrMatrix, serializePickupPass } from "../services/qr-handshake";
import type { PickupHandshakePassResponse } from "@agroloop/api-types";

interface QrCodeViewProps {
  pass: PickupHandshakePassResponse;
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
}

export function QrCodeView({ pass, onRefresh, isRefreshing = false }: QrCodeViewProps) {
  const [timeLeftSec, setTimeLeftSec] = useState<number>(() => {
    const diff = Math.floor((pass.expiresAt - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((pass.expiresAt - Date.now()) / 1000);
      setTimeLeftSec(Math.max(0, diff));
    }, 1000);
    return () => clearInterval(interval);
  }, [pass.expiresAt]);

  const serialized = useMemo(() => serializePickupPass(pass), [pass]);

  const matrix = useMemo(() => {
    try {
      return generateQrMatrix(serialized);
    } catch {
      return [];
    }
  }, [serialized]);

  const isExpired = timeLeftSec <= 0;
  const minutes = Math.floor(timeLeftSec / 60);
  const seconds = timeLeftSec % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  // Pixel size scaling for crisp rendering
  const moduleCount = matrix.length;
  const pixelSize = moduleCount > 0 ? Math.floor(240 / moduleCount) : 6;
  const boardSize = pixelSize * moduleCount;

  return (
    <View style={styles.container}>
      {/* Expiry Banner */}
      <View style={[styles.timerBadge, isExpired ? styles.timerBadgeExpired : styles.timerBadgeActive]}>
        <Text style={[styles.timerText, isExpired ? styles.timerTextExpired : styles.timerTextActive]}>
          {isExpired ? "Pass Expired" : `Valid for: ${formattedTime}`}
        </Text>
      </View>

      {/* QR Board */}
      <View style={[styles.qrWrapper, isExpired && styles.qrWrapperExpired]}>
        {matrix.length > 0 ? (
          <View style={{ width: boardSize, height: boardSize }}>
            {matrix.map((row, r) => (
              <View key={`r-${r}`} style={{ flexDirection: "row", height: pixelSize }}>
                {row.map((isDark, c) => (
                  <View
                    key={`c-${r}-${c}`}
                    style={{
                      width: pixelSize,
                      height: pixelSize,
                      backgroundColor: isDark ? (isExpired ? "#94a3b8" : "#0f172a") : "#ffffff",
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.errorText}>Unable to render QR code</Text>
        )}

        {isExpired && (
          <View style={styles.expiredOverlay}>
            <Text style={styles.expiredOverlayText}>PASS EXPIRED</Text>
            {onRefresh && (
              <TouchableOpacity
                style={styles.refreshBtn}
                onPress={onRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.refreshBtnText}>Generate New Pass</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Human Fallback Pass Code */}
      <View style={styles.passCodeCard}>
        <Text style={styles.passCodeLabel}>Backup Pass Code (Manual Fallback)</Text>
        <Text style={styles.passCodeValue}>{pass.passCode}</Text>
        <Text style={styles.passCodeHint}>
          Present this code if the farmer’s camera cannot scan your screen.
        </Text>
      </View>

      {/* Security Invariant Note */}
      <Text style={styles.securityFooter}>
        Cryptographically signed • Single-use replay protection • Zero PII exposed
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffffff",
  },
  timerBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  timerBadgeActive: {
    backgroundColor: "#dcfce7",
  },
  timerBadgeExpired: {
    backgroundColor: "#fee2e2",
  },
  timerText: {
    fontSize: 13,
    fontWeight: "700",
  },
  timerTextActive: {
    color: "#166534",
  },
  timerTextExpired: {
    color: "#991b1b",
  },
  qrWrapper: {
    padding: 12,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  qrWrapperExpired: {
    borderColor: "#cbd5e1",
    opacity: 0.6,
  },
  expiredOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  expiredOverlayText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#991b1b",
    marginBottom: 12,
    letterSpacing: 1,
  },
  refreshBtn: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  passCodeCard: {
    marginTop: 20,
    width: "100%",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  passCodeLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  passCodeValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: 2,
    marginVertical: 6,
    fontFamily: "monospace",
  },
  passCodeHint: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center",
  },
  securityFooter: {
    marginTop: 14,
    fontSize: 10,
    color: "#94a3b8",
    textAlign: "center",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    padding: 24,
  },
});
