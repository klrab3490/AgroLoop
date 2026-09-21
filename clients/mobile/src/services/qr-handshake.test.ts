import { describe, it, expect } from "vitest";
import {
  serializePickupPass,
  parsePickupPass,
  normalizePassCode,
  isSupportedPassVersion,
  generateQrMatrix,
} from "./qr-handshake";
import type { PickupHandshakePassResponse } from "@agroloop/api-types";

describe("Mobile QR Handshake Presentation & Parsing Utilities", () => {
  const samplePass: PickupHandshakePassResponse = {
    type: "AGROLOOP_PICKUP_HANDSHAKE",
    version: 1,
    pickupId: 101,
    householdId: 55,
    submissionId: 202,
    issuedAt: 1726850000000,
    expiresAt: 1726851800000,
    nonce: "test-nonce-uuid-1234",
    passCode: "ECO-4821-7395",
    signature: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    compactQr: {
      t: "AGROLOOP_PICKUP_HANDSHAKE",
      v: 1,
      p: 101,
      h: 55,
      s: 202,
      iat: 1726850000000,
      exp: 1726851800000,
      n: "test-nonce-uuid-1234",
      c: "ECO-4821-7395",
      sig: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    },
  };

  it("serializes a server-issued pickup pass into a compact JSON string", () => {
    const serialized = serializePickupPass(samplePass);
    expect(serialized).toBeTypeOf("string");

    const parsed = JSON.parse(serialized);
    expect(parsed.t).toBe("AGROLOOP_PICKUP_HANDSHAKE");
    expect(parsed.p).toBe(101);
    expect(parsed.h).toBe(55);
    expect(parsed.n).toBe("test-nonce-uuid-1234");
    expect(parsed.c).toBe("ECO-4821-7395");
    expect(parsed.sig).toBe(samplePass.signature);

    // Asserts zero PII exists in serialized payload
    expect(parsed.address).toBeUndefined();
    expect(parsed.name).toBeUndefined();
    expect(parsed.phone).toBeUndefined();
  });

  it("parses valid compact QR payload", () => {
    const raw = JSON.stringify({
      t: "AGROLOOP_PICKUP_HANDSHAKE",
      v: 1,
      p: 101,
      h: 55,
      s: 202,
      iat: 1726850000000,
      exp: 1726851800000,
      n: "test-nonce-uuid-1234",
      c: "ECO-4821-7395",
      sig: "abcdef0123456789",
    });

    const parsed = parsePickupPass(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.p).toBe(101);
    expect(parsed?.n).toBe("test-nonce-uuid-1234");
    expect(parsed?.c).toBe("ECO-4821-7395");
  });

  it("returns null for malformed or foreign QR strings", () => {
    expect(parsePickupPass("https://example.com")).toBeNull();
    expect(parsePickupPass("{invalid-json}")).toBeNull();
    expect(parsePickupPass(JSON.stringify({ type: "SOME_OTHER_EVENT" }))).toBeNull();
    expect(parsePickupPass(JSON.stringify({ t: "AGROLOOP_PICKUP_HANDSHAKE" }))).toBeNull(); // Missing required fields
  });

  it("normalizes human-entered passcodes into canonical ECO-XXXX-XXXX format", () => {
    expect(normalizePassCode("eco48217395")).toBe("ECO-4821-7395");
    expect(normalizePassCode("48217395")).toBe("ECO-4821-7395");
    expect(normalizePassCode(" eco-4821-7395 ")).toBe("ECO-4821-7395");
    expect(normalizePassCode("ECO-4821-7395")).toBe("ECO-4821-7395");
  });

  it("validates supported protocol versions", () => {
    expect(isSupportedPassVersion(1)).toBe(true);
    expect(isSupportedPassVersion(2)).toBe(false);
  });

  it("generates a crisp 2D boolean matrix without native dependencies", () => {
    const text = serializePickupPass(samplePass);
    const matrix = generateQrMatrix(text);

    expect(Array.isArray(matrix)).toBe(true);
    expect(matrix.length).toBeGreaterThan(20);
    // Square matrix
    expect(matrix[0].length).toBe(matrix.length);

    // Top-left finder pattern anchor: (0,0) must be dark (true)
    expect(matrix[0][0]).toBe(true);
    // Top-right finder pattern anchor: (0, len-1) must be dark (true)
    expect(matrix[0][matrix.length - 1]).toBe(true);
    // Bottom-left finder pattern anchor: (len-1, 0) must be dark (true)
    expect(matrix[matrix.length - 1][0]).toBe(true);
  });
});
