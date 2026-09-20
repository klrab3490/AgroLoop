import { describe, it, expect } from "vitest";
import { generateQrMatrix, QRErrorCorrectLevel } from "./qr-matrix.js";

describe("@agroloop/qr - Specification Compliance", () => {
  it("generates a valid square matrix for standard alphanumeric data", () => {
    const matrix = generateQrMatrix("ECO-1234-5678");
    expect(Array.isArray(matrix)).toBe(true);
    expect(matrix.length).toBeGreaterThanOrEqual(21);
    expect(matrix[0].length).toBe(matrix.length);
  });

  it("produces standard 21x21 matrix for short Version 1 payloads", () => {
    const matrix = generateQrMatrix("HELLO", QRErrorCorrectLevel.L);
    expect(matrix.length).toBe(21);
    expect(matrix[0].length).toBe(21);
  });

  it("correctly sets 3-corner finder patterns", () => {
    const matrix = generateQrMatrix("TEST");
    const n = matrix.length;

    // Top-left corner finder pattern center (row 3, col 3) must be true
    expect(matrix[3][3]).toBe(true);
    // Top-right corner finder pattern center (row 3, col n-4) must be true
    expect(matrix[3][n - 4]).toBe(true);
    // Bottom-left corner finder pattern center (row n-4, col 3) must be true
    expect(matrix[n - 4][3]).toBe(true);

    // Separator rings (e.g. row 0 col 7) must be false
    expect(matrix[0][7]).toBe(false);
    expect(matrix[7][0]).toBe(false);
  });

  it("scales dynamically to higher versions for larger payloads without errors", () => {
    const largePayload =
      "v1|pickup:42|house:99|farmer:7|exp:1758400000|sig:f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2";
    const matrix = generateQrMatrix(largePayload, QRErrorCorrectLevel.M);
    expect(matrix.length).toBeGreaterThan(21);
    expect(matrix.every((row) => row.length === matrix.length)).toBe(true);
  });

  it("contains no HMAC secret or signing credentials in the package", async () => {
    const mod = await import("./index.js");
    expect((mod as Record<string, unknown>).HMAC_KEY).toBeUndefined();
    expect((mod as Record<string, unknown>).signPayload).toBeUndefined();
    expect((mod as Record<string, unknown>).verifyPass).toBeUndefined();
  });
});
