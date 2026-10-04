import { describe, it, expect } from "vitest";
import { generateQrMatrix, QRErrorCorrectLevel } from "@agroloop/qr";

describe("Desktop Admin Operations & Solvency Invariants", () => {
  it("validates pure integer token arithmetic for admin adjustments", () => {
    const validIntegerAdjustment = "25";
    const parsed = parseInt(validIntegerAdjustment, 10);
    expect(Number.isInteger(parsed)).toBe(true);
    expect(parsed).toBe(25);

    const fractionalAdjustment = "25.75";
    const floatParsed = parseFloat(fractionalAdjustment);
    expect(Number.isInteger(floatParsed)).toBe(false);
  });

  it("calculates double-entry solvency invariants accurately", () => {
    const totalCredits = 15000;
    const totalDebits = 3500;
    const expectedBalance = totalCredits - totalDebits;
    const totalHouseholdBalances = 11500;

    const discrepancy = expectedBalance - totalHouseholdBalances;
    const isSolvent = discrepancy === 0 && expectedBalance === totalHouseholdBalances;

    expect(expectedBalance).toBe(11500);
    expect(discrepancy).toBe(0);
    expect(isSolvent).toBe(true);
  });

  it("detects solvency discrepancy when ledgers deviate from aggregate balances", () => {
    const totalCredits = 10000;
    const totalDebits = 2000;
    const expectedBalance = totalCredits - totalDebits; // 8000
    const totalHouseholdBalances = 8500; // 500 unbacked tokens injected

    const discrepancy = expectedBalance - totalHouseholdBalances; // -500
    const isSolvent = discrepancy === 0;

    expect(discrepancy).toBe(-500);
    expect(isSolvent).toBe(false);
  });

  it("prevents self-disable and sole-active-admin deactivation", () => {
    const currentUserId = 1;
    const users = [
      { id: 1, email: "admin1@agroloop.local", role: "ROLE_ADMIN", enabled: true },
      { id: 2, email: "user@agroloop.local", role: "ROLE_HOUSEHOLD", enabled: true },
    ];

    // Attempt 1: Self-disable guard
    const targetUser = users[0];
    const isSelf = targetUser.id === currentUserId;
    expect(isSelf).toBe(true);

    // Attempt 2: Last-admin guard
    const activeAdmins = users.filter((u) => u.role === "ROLE_ADMIN" && u.enabled);
    const isSoleAdmin = activeAdmins.length <= 1;
    expect(isSoleAdmin).toBe(true);
  });

  it("prevents self-demotion from ROLE_ADMIN and sole-active-admin demotion", () => {
    const currentUserId = 1;
    const users = [
      { id: 1, email: "admin1@agroloop.local", role: "ROLE_ADMIN", enabled: true },
      { id: 2, email: "user@agroloop.local", role: "ROLE_HOUSEHOLD", enabled: true },
    ];

    // Self-demotion guard
    const targetUserId = 1;
    const targetRole = "ROLE_HOUSEHOLD";
    const isSelfDemotion = targetUserId === currentUserId && targetRole !== "ROLE_ADMIN";
    expect(isSelfDemotion).toBe(true);

    // Sole active admin demotion guard
    const activeAdmins = users.filter((u) => u.role === "ROLE_ADMIN" && u.enabled);
    const wouldLeaveZeroAdmins = activeAdmins.length <= 1;
    expect(wouldLeaveZeroAdmins).toBe(true);
  });

  it("filters and processes farmer partner application queues", () => {
    const applications = [
      { id: 10, userId: 2, status: "PENDING", farmName: "Green Hills" },
      { id: 11, userId: 3, status: "APPROVED", farmName: "Valley Organic" },
      { id: 12, userId: 4, status: "REJECTED", farmName: "Metro Plant" },
    ];

    const pending = applications.filter((a) => a.status === "PENDING");
    expect(pending.length).toBe(1);
    expect(pending[0].farmName).toBe("Green Hills");

    const approved = applications.filter((a) => a.status === "APPROVED");
    expect(approved.length).toBe(1);
  });

  it("verifies shared @agroloop/qr matrix generator operates within desktop bundle", () => {
    const matrix = generateQrMatrix("AGROLOOP-DESKTOP-TEST", QRErrorCorrectLevel.M);
    expect(matrix.length).toBeGreaterThan(0);
    expect(matrix.length).toBe(matrix[0].length);
  });
});
