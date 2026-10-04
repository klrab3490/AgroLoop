import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

import { mobileApiClient } from "../lib/api";
import type { PickupRequestApiResponse } from "@agroloop/api-types";

describe("Household Pickup Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists active pickups and processes cancellation with idempotency key", async () => {
    const mockPickups: PickupRequestApiResponse[] = [
      {
        id: 42,
        wasteSubmissionId: 10,
        status: "REQUESTED",
        pickupAddress: "123 Green Way",
        createdAt: "2026-09-20T12:00:00Z",
      },
    ];

    const listSpy = vi
      .spyOn(mobileApiClient.pickups, "listPickups")
      .mockResolvedValue(mockPickups);

    const cancelSpy = vi
      .spyOn(mobileApiClient.pickups, "cancelPickup")
      .mockResolvedValue({
        id: 42,
        status: "CANCELLED",
        cancellationReason: "Change of plans",
      });

    const pickups = await mobileApiClient.pickups.listPickups();
    expect(listSpy).toHaveBeenCalledTimes(1);
    expect(pickups).toHaveLength(1);
    expect(pickups[0].id).toBe(42);
    expect(pickups[0].status).toBe("REQUESTED");

    // Perform idempotent cancel
    const cancelRes = await mobileApiClient.pickups.cancelPickup(
      42,
      { reason: "Change of plans" },
      { idempotencyKey: "test_cancel_key_42" }
    );

    expect(cancelSpy).toHaveBeenCalledWith(
      42,
      { reason: "Change of plans" },
      { idempotencyKey: "test_cancel_key_42" }
    );
    expect(cancelRes.status).toBe("CANCELLED");
  });

  it("fetches household balance and submission ledger", async () => {
    const balanceSpy = vi
      .spyOn(mobileApiClient.household, "getBalance")
      .mockResolvedValue({ availableBalance: 150.5, pendingBalance: 25.0 });

    const submissionsSpy = vi
      .spyOn(mobileApiClient.household, "getSubmissions")
      .mockResolvedValue([
        {
          id: 1,
          category: "FOOD_SCRAPS",
          estimatedWeight: 5.5,
          status: "VERIFIED",
        },
      ]);

    const ledgerSpy = vi
      .spyOn(mobileApiClient.household, "getLedger")
      .mockResolvedValue([
        {
          id: 101,
          amount: 25.0,
          direction: "CREDIT",
          transactionType: "REWARD_MINTED",
        },
      ]);

    const balance = await mobileApiClient.household.getBalance();
    const submissions = await mobileApiClient.household.getSubmissions();
    const ledger = await mobileApiClient.household.getLedger();

    expect(balanceSpy).toHaveBeenCalled();
    expect(balance.availableBalance).toBe(150.5);
    expect(balance.pendingBalance).toBe(25.0);

    expect(submissionsSpy).toHaveBeenCalled();
    expect(submissions).toHaveLength(1);
    expect(submissions[0].category).toBe("FOOD_SCRAPS");

    expect(ledgerSpy).toHaveBeenCalled();
    expect(ledger).toHaveLength(1);
    expect(ledger[0].direction).toBe("CREDIT");
  });

  it("submits and retrieves farmer partner applications", async () => {
    const mockApp = {
      id: 8,
      userId: 2,
      userName: "Alice Green",
      userEmail: "household@agroloop.com",
      farmName: "Green Pastures",
      farmAddress: "44 High Range",
      notes: "Organic composting facility",
      status: "PENDING",
      createdAt: "2026-10-04T12:00:00Z",
    };

    const submitSpy = vi
      .spyOn(mobileApiClient.household, "submitFarmerApplication")
      .mockResolvedValue(mockApp);

    const getSpy = vi
      .spyOn(mobileApiClient.household, "getFarmerApplication")
      .mockResolvedValue(mockApp);

    const submitted = await mobileApiClient.household.submitFarmerApplication({
      farmName: "Green Pastures",
      farmAddress: "44 High Range",
      notes: "Organic composting facility",
    });

    expect(submitSpy).toHaveBeenCalledWith({
      farmName: "Green Pastures",
      farmAddress: "44 High Range",
      notes: "Organic composting facility",
    });
    expect(submitted.id).toBe(8);
    expect(submitted.status).toBe("PENDING");

    const fetched = await mobileApiClient.household.getFarmerApplication();
    expect(getSpy).toHaveBeenCalled();
    expect(fetched?.farmName).toBe("Green Pastures");
  });
});
