import type {
  CompactQrPayload,
  PickupHandshakePassResponse,
} from "@agroloop/api-types";
import { generateQrMatrix } from "./qr-matrix";

export { generateQrMatrix } from "./qr-matrix";

/**
 * Serializes a server-issued pickup pass into a compact, low-density QR JSON string.
 */
export function serializePickupPass(pass: PickupHandshakePassResponse): string {
  const compact: CompactQrPayload = pass.compactQr ?? {
    t: "AGROLOOP_PICKUP_HANDSHAKE",
    v: pass.version ?? 1,
    p: pass.pickupId,
    h: pass.householdId,
    s: pass.submissionId,
    iat: pass.issuedAt,
    exp: pass.expiresAt,
    n: pass.nonce,
    c: pass.passCode,
    sig: pass.signature,
  };
  return JSON.stringify(compact);
}

/**
 * Safely parses raw decoded QR string into a typed CompactQrPayload.
 * Validates basic schema structure without performing authoritative authentication.
 * Authoritative cryptographic verification is strictly performed by the AgroLoop API.
 */
export function parsePickupPass(raw: string): CompactQrPayload | null {
  if (!raw || typeof raw !== "string") {
    return null;
  }
  try {
    const parsed = JSON.parse(raw.trim());
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed.t === "AGROLOOP_PICKUP_HANDSHAKE" || parsed.type === "AGROLOOP_PICKUP_HANDSHAKE")
    ) {
      // Support compact format as primary, with standard format fallback
      const payload: CompactQrPayload = {
        t: "AGROLOOP_PICKUP_HANDSHAKE",
        v: typeof parsed.v === "number" ? parsed.v : parsed.version ?? 1,
        p: typeof parsed.p === "number" ? parsed.p : parsed.pickupId,
        h: typeof parsed.h === "number" ? parsed.h : parsed.householdId,
        s: typeof parsed.s === "number" ? parsed.s : parsed.submissionId,
        iat: typeof parsed.iat === "number" ? parsed.iat : parsed.issuedAt ?? Date.now(),
        exp: typeof parsed.exp === "number" ? parsed.exp : parsed.expiresAt ?? Date.now() + 1800000,
        n: parsed.n || parsed.nonce || "",
        c: parsed.c || parsed.passCode || "",
        sig: parsed.sig || parsed.signature || "",
      };

      if (!payload.p || !payload.n || !payload.sig) {
        return null;
      }

      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Normalizes user-entered human passcodes:
 * Removes whitespace, dashes (optionally), converts to uppercase, and formats as ECO-XXXX-XXXX.
 */
export function normalizePassCode(input: string): string {
  if (!input) return "";
  const cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.startsWith("ECO") && cleaned.length === 11) {
    return `ECO-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
  }
  if (cleaned.length === 8) {
    return `ECO-${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
  }
  return input.trim().toUpperCase();
}

/**
 * Checks if the QR payload protocol version is supported by this client.
 */
export function isSupportedPassVersion(version: number): boolean {
  return version === 1;
}
