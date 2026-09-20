import { describe, it, expect, vi, beforeEach } from "vitest";

const memoryStore = new Map<string, string>();

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn((key: string) => Promise.resolve(memoryStore.get(key) ?? null)),
  setItemAsync: vi.fn((key: string, value: string) => {
    memoryStore.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: vi.fn((key: string) => {
    memoryStore.delete(key);
    return Promise.resolve();
  }),
}));

import {
  enqueueMutation,
  getOfflineQueue,
  processOfflineQueue,
  clearOfflineQueue,
} from "./offline-queue.js";
import { mobileApiClient } from "../lib/api.js";

describe("Offline Mutation Queue", () => {
  beforeEach(async () => {
    memoryStore.clear();
    vi.clearAllMocks();
  });

  it("enqueues multiple mutations preserving FIFO order and custom idempotency keys", async () => {
    const item1 = await enqueueMutation(
      "SUBMIT_WASTE",
      {
        category: "FOOD_SCRAPS",
        estimatedWeight: 4.2,
        mediaId: "media_123",
      },
      "custom_idem_key_1"
    );

    const item2 = await enqueueMutation(
      "CLAIM_PICKUP",
      { pickupId: 55 },
      "custom_idem_key_2"
    );

    expect(item1.idempotencyKey).toBe("custom_idem_key_1");
    expect(item2.idempotencyKey).toBe("custom_idem_key_2");

    const queue = await getOfflineQueue();
    expect(queue).toHaveLength(2);
    expect(queue[0].id).toBe(item1.id);
    expect(queue[1].id).toBe(item2.id);
  });

  it("processes queue successfully, dispatches mutations with exact idempotency keys, and clears processed items", async () => {
    await enqueueMutation(
      "SUBMIT_WASTE",
      {
        category: "GARDEN_WASTE",
        estimatedWeight: 8.0,
        mediaId: "media_gard_456",
      },
      "stable_key_submit_1"
    );

    await enqueueMutation(
      "VERIFY_PICKUP",
      {
        pickupId: 88,
        verifiedWeight: 7.9,
        qualityGrade: "GRADE_A",
      },
      "stable_key_verify_1"
    );

    const submitSpy = vi
      .spyOn(mobileApiClient.household, "submitWaste")
      .mockResolvedValue({ id: 101, status: "SUBMITTED" } as any);

    const verifySpy = vi
      .spyOn(mobileApiClient.farmer, "verifyPickup")
      .mockResolvedValue({ id: 88, status: "VERIFIED" } as any);

    const result = await processOfflineQueue();

    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.remaining).toBe(0);

    // Verify submitWaste called with exact payload & idempotency key
    expect(submitSpy).toHaveBeenCalledWith(
      {
        category: "GARDEN_WASTE",
        estimatedWeight: 8.0,
        mediaId: "media_gard_456",
      },
      { idempotencyKey: "stable_key_submit_1" }
    );

    // Verify verifyPickup called with exact payload & idempotency key
    expect(verifySpy).toHaveBeenCalledWith(
      88,
      {
        verifiedWeight: 7.9,
        qualityGrade: "GRADE_A",
        mediaId: undefined,
        notes: undefined,
      },
      { idempotencyKey: "stable_key_verify_1" }
    );

    // Storage is cleared
    const remaining = await getOfflineQueue();
    expect(remaining).toHaveLength(0);
  });

  it("handles transient failure by retaining item in queue with incremented retry count", async () => {
    await enqueueMutation(
      "CLAIM_PICKUP",
      { pickupId: 99 },
      "transient_fail_key"
    );

    vi.spyOn(mobileApiClient.farmer, "claimPickup").mockRejectedValue(
      new Error("Network connection lost")
    );

    const result = await processOfflineQueue(3);

    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.remaining).toBe(1);

    const queue = await getOfflineQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].retryCount).toBe(1);
    expect(queue[0].lastError).toBe("Network connection lost");
    expect(queue[0].idempotencyKey).toBe("transient_fail_key");
  });

  it("drops mutation if retry count exceeds maxRetries threshold", async () => {
    await enqueueMutation(
      "CANCEL_PICKUP",
      { pickupId: 12, reason: "Mistake" },
      "exhausted_retry_key"
    );

    vi.spyOn(mobileApiClient.pickups, "cancelPickup").mockRejectedValue(
      new Error("Fatal 404 pickup not found")
    );

    // Max 1 retry
    const result = await processOfflineQueue(1);

    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.remaining).toBe(0);

    const queue = await getOfflineQueue();
    expect(queue).toHaveLength(0);
  });

  it("clears queue completely when clearOfflineQueue is invoked", async () => {
    await enqueueMutation("CLAIM_PICKUP", { pickupId: 1 });
    await enqueueMutation("CLAIM_PICKUP", { pickupId: 2 });

    expect(await getOfflineQueue()).toHaveLength(2);

    await clearOfflineQueue();
    expect(await getOfflineQueue()).toHaveLength(0);
  });
});
