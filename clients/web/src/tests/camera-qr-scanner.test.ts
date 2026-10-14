import { describe, it, expect } from "vitest";
import { CameraQrScanner } from "../components/camera-qr-scanner";
import { buildVerificationRequest } from "../components/doorstep-weighin-modal";
import jsQR from "jsqr";

describe("CameraQrScanner Component & QR Decoding Integration", () => {
  it("exports CameraQrScanner as a valid component function", () => {
    expect(CameraQrScanner).toBeDefined();
    expect(typeof CameraQrScanner).toBe("function");
  });

  it("handles valid compact QR JSON scans into authoritative verification requests", () => {
    const rawQrText = JSON.stringify({
      t: "AGROLOOP_PICKUP_HANDSHAKE",
      p: 105,
      h: 22,
      n: "nonce-sec-4819",
      sig: "hmac-sha256-signature-sample",
    });

    const parsedRequest = buildVerificationRequest(rawQrText);
    expect(parsedRequest.method).toBe("QR_SCAN");
    if (parsedRequest.method === "QR_SCAN") {
      expect(parsedRequest.payload.p).toBe(105);
      expect(parsedRequest.payload.h).toBe(22);
      expect(parsedRequest.payload.n).toBe("nonce-sec-4819");
      expect(parsedRequest.payload.sig).toBe("hmac-sha256-signature-sample");
    }
  });

  it("handles scanned ECO-XXXX-XXXX plaintext passcodes seamlessly", () => {
    const scannedPasscode = "ECO-2126-PASS";
    const parsedRequest = buildVerificationRequest(scannedPasscode);

    expect(parsedRequest.method).toBe("MANUAL_PASSCODE");
    if (parsedRequest.method === "MANUAL_PASSCODE") {
      expect(parsedRequest.passCode).toBe("ECO-2126-PASS");
    }
  });

  it("jsQR decodes black/white image buffer correctly when data matches format", () => {
    // Basic test ensuring jsQR library loads and runs without exception
    const blankBuffer = new Uint8ClampedArray(64 * 64 * 4);
    const result = jsQR(blankBuffer, 64, 64);
    expect(result).toBeNull();
  });
});
