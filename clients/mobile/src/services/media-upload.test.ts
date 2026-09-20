import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

import { uploadMediaAsset } from "./media-upload.js";
import { mobileApiClient } from "../lib/api.js";

describe("Media Upload 3-Phase Lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes ticket creation, direct binary upload, and idempotent confirmation in sequence", async () => {
    const mockTicket = {
      mediaId: "media_uuid_abc_123",
      uploadUrl: "http://localhost:8080/api/v1/media/direct-upload/media_uuid_abc_123",
      expiresAt: "2026-09-20T21:00:00Z",
    };

    const mockConfirmed = {
      mediaId: "media_uuid_abc_123",
      filename: "waste_sorting.jpg",
      contentType: "image/jpeg",
      status: "CONFIRMED",
      sizeBytes: 1024,
    };

    const createTicketSpy = vi
      .spyOn(mobileApiClient.media, "createUploadTicket")
      .mockResolvedValue(mockTicket);

    const directUploadSpy = vi
      .spyOn(mobileApiClient.media, "directUpload")
      .mockResolvedValue();

    const confirmUploadSpy = vi
      .spyOn(mobileApiClient.media, "confirmUpload")
      .mockResolvedValue(mockConfirmed);

    const steps: string[] = [];
    const testData = new Uint8Array([1, 2, 3, 4]);

    const result = await uploadMediaAsset({
      filename: "waste_sorting.jpg",
      contentType: "image/jpeg",
      data: testData,
      idempotencyKey: "idem_confirm_key_999",
      onProgress: (s) => steps.push(s),
    });

    // Verify 3 steps executed in order
    expect(steps).toEqual(["REQUESTING_TICKET", "UPLOADING_BYTES", "CONFIRMING"]);

    // Verify Phase 1 called
    expect(createTicketSpy).toHaveBeenCalledWith({
      contentType: "image/jpeg",
      sizeBytes: testData.byteLength,
      checksum: expect.any(String),
      purpose: "WASTE_SUBMISSION",
    });

    // Verify Phase 2 called with uploadUrl and data
    expect(directUploadSpy).toHaveBeenCalledWith(
      mockTicket.uploadUrl,
      testData,
      "image/jpeg"
    );

    // Verify Phase 3 called with mediaId and idempotencyKey
    expect(confirmUploadSpy).toHaveBeenCalledWith(
      mockTicket.mediaId,
      {},
      { idempotencyKey: "idem_confirm_key_999" }
    );

    expect(result.status).toBe("CONFIRMED");
    expect(result.mediaId).toBe("media_uuid_abc_123");
  });
});
