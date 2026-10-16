import { describe, it, expect } from "vitest";
import { stretchContrast } from "../utils/qr-image-decoder";
import { generateQrMatrix } from "@agroloop/qr";
import jsQR from "jsqr";

describe("QR Image Decoder & Multi-Pass Scanner", () => {
  it("stretches low-contrast image data appropriately", () => {
    // 10x10 low-contrast image where values are between 100 and 150
    const w = 10;
    const h = 10;
    const rawData = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < rawData.length; i += 4) {
      const v = (i / 4) % 2 === 0 ? 100 : 150;
      rawData[i] = v;
      rawData[i + 1] = v;
      rawData[i + 2] = v;
      rawData[i + 3] = 255;
    }

    const imgData = { data: rawData, width: w, height: h } as ImageData;
    const stretched = stretchContrast(imgData);
    expect(stretched).not.toBeNull();
    if (stretched) {
      // Dark values should now be close to 0, light values close to 255
      expect(stretched[0]).toBe(0);
      expect(stretched[4]).toBe(255);
    }
  });

  it("does not alter already optimal high-contrast image data", () => {
    const w = 4;
    const h = 4;
    const rawData = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < rawData.length; i += 4) {
      const v = i === 0 ? 0 : 255;
      rawData[i] = v;
      rawData[i + 1] = v;
      rawData[i + 2] = v;
      rawData[i + 3] = 255;
    }
    const imgData = { data: rawData, width: w, height: h } as ImageData;
    const stretched = stretchContrast(imgData);
    expect(stretched).toBeNull();
  });

  it("decodes simulated generated QR code from pixel buffer with jsQR", () => {
    const payload = "ECO-2126-PASS";
    const matrix = generateQrMatrix(payload);
    expect(matrix.length).toBeGreaterThan(0);

    const moduleCount = matrix.length;
    const scale = 8;
    const quietZone = 4;
    const dim = (moduleCount + quietZone * 2) * scale;

    const buffer = new Uint8ClampedArray(dim * dim * 4);
    buffer.fill(255); // White background

    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (matrix[r][c]) {
          const startX = (c + quietZone) * scale;
          const startY = (r + quietZone) * scale;
          for (let y = 0; y < scale; y++) {
            for (let x = 0; x < scale; x++) {
              const idx = ((startY + y) * dim + (startX + x)) * 4;
              buffer[idx] = 0;     // R
              buffer[idx + 1] = 0; // G
              buffer[idx + 2] = 0; // B
              buffer[idx + 3] = 255; // A
            }
          }
        }
      }
    }

    const decoded = jsQR(buffer, dim, dim, { inversionAttempts: "attemptBoth" });
    expect(decoded).not.toBeNull();
    expect(decoded?.data).toBe(payload);
  });

  it("decodes dense Version 10+ signed pickup passes (240+ chars) accurately", () => {
    const payload = JSON.stringify({
      t: "AGROLOOP_PICKUP_HANDSHAKE",
      v: 1,
      p: 114,
      h: 2,
      s: 114,
      iat: 1792123722499,
      exp: 1792125522499,
      n: "d59edf53-9698-46d7-8ddc-c71b34f345b7",
      c: "ECO-4638-3490",
      sig: "059bd12e510a9a3c76f305647124d9c14327599f3862ab700c4442564bb7e58d",
    });
    const matrix = generateQrMatrix(payload);
    expect(matrix.length).toBeGreaterThanOrEqual(49);

    const moduleCount = matrix.length;
    const scale = 4;
    const quietZone = 4;
    const dim = (moduleCount + quietZone * 2) * scale;

    const buffer = new Uint8ClampedArray(dim * dim * 4);
    buffer.fill(255);

    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (matrix[r][c]) {
          const startX = (c + quietZone) * scale;
          const startY = (r + quietZone) * scale;
          for (let y = 0; y < scale; y++) {
            for (let x = 0; x < scale; x++) {
              const idx = ((startY + y) * dim + (startX + x)) * 4;
              buffer[idx] = 0;
              buffer[idx + 1] = 0;
              buffer[idx + 2] = 0;
              buffer[idx + 3] = 255;
            }
          }
        }
      }
    }

    const decoded = jsQR(buffer, dim, dim, { inversionAttempts: "attemptBoth" });
    expect(decoded).not.toBeNull();
    expect(decoded?.data).toBe(payload);
  });
});
