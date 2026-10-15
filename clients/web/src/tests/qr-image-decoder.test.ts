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
});
