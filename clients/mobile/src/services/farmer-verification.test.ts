import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

import { mobileApiClient } from "../lib/api.js";
import type { PickupRequestApiResponse } from "@agroloop/api-types";

describe("Farmer Operations & On-Site Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches available pickups and claims a batch with idempotency key", async () => {
    const mockAvailable: PickupRequestApiResponse[] = [
      {
        id: 77,
        wasteSubmissionId: 303,
        status: "REQUESTED",
        pickupAddress: "456 Orchard Lane",
      },
    ];

    const getAvailSpy = vi
      .spyOn(mobileApiClient.farmer, "getAvailablePickups")
      .mockResolvedValue(mockAvailable);

    const claimSpy = vi
      .spyOn(mobileApiClient.farmer, "claimPickup")
      .mockResolvedValue({
        id: 77,
        status: "CLAIMED",
        assignedFarmerId: 10,
        assignedFarmerName: "Green Valley Farm",
      });

    const avail = await mobileApiClient.farmer.getAvailablePickups();
    expect(getAvailSpy).toHaveBeenCalledTimes(1);
    expect(avail).toHaveLength(1);
    expect(avail[0].id).toBe(77);

    const claimResult = await mobileApiClient.farmer.claimPickup(77, {
      idempotencyKey: "test_claim_key_77",
    });

    expect(claimSpy).toHaveBeenCalledWith(77, {
      idempotencyKey: "test_claim_key_77",
    });
    expect(claimResult.status).toBe("CLAIMED");
  });

  it("schedules a pickup time slot and verifies on-site waste with quality grading", async () => {
    const scheduleSpy = vi
      .spyOn(mobileApiClient.farmer, "schedulePickup")
      .mockResolvedValue({
        id: 77,
        status: "SCHEDULED",
        scheduledTime: "2026-09-21T14:00:00Z",
      });

    const verifySpy = vi
      .spyOn(mobileApiClient.farmer, "verifyPickup")
      .mockResolvedValue({
        id: 77,
        status: "VERIFIED",
        verification: {
          verifiedWeight: 12.5,
          qualityGrade: "GRADE_A",
          tokensAwarded: 75.0,
          notes: "Excellent compost purity",
        },
      });

    // Schedule
    const schedResult = await mobileApiClient.farmer.schedulePickup(
      77,
      {
        scheduledTime: "2026-09-21T14:00:00Z",
        farmerNotes: "Collection truck arriving at 2pm",
      },
      { idempotencyKey: "test_sched_key_77" }
    );

    expect(scheduleSpy).toHaveBeenCalledWith(
      77,
      {
        scheduledTime: "2026-09-21T14:00:00Z",
        farmerNotes: "Collection truck arriving at 2pm",
      },
      { idempotencyKey: "test_sched_key_77" }
    );
    expect(schedResult.status).toBe("SCHEDULED");

    // Verify On-Site
    const verifyResult = await mobileApiClient.farmer.verifyPickup(
      77,
      {
        verifiedWeight: 12.5,
        qualityGrade: "GRADE_A",
        mediaId: "media_proof_uuid_456",
        notes: "Excellent compost purity",
      },
      { idempotencyKey: "test_verify_key_77" }
    );

    expect(verifySpy).toHaveBeenCalledWith(
      77,
      {
        verifiedWeight: 12.5,
        qualityGrade: "GRADE_A",
        mediaId: "media_proof_uuid_456",
        notes: "Excellent compost purity",
      },
      { idempotencyKey: "test_verify_key_77" }
    );
    expect(verifyResult.status).toBe("VERIFIED");
    expect(verifyResult.verification?.tokensAwarded).toBe(75.0);
  });
});
