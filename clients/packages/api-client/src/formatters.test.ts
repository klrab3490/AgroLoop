import { describe, it, expect } from "vitest";
import { formatRole } from "./formatters.js";

describe("formatRole", () => {
  it("formats ROLE_FARMER and FARMER as Farmer", () => {
    expect(formatRole("ROLE_FARMER")).toBe("Farmer");
    expect(formatRole("FARMER")).toBe("Farmer");
  });

  it("formats ROLE_HOUSEHOLD and HOUSEHOLD as Household", () => {
    expect(formatRole("ROLE_HOUSEHOLD")).toBe("Household");
    expect(formatRole("HOUSEHOLD")).toBe("Household");
  });

  it("formats ROLE_ADMIN and ADMIN as Admin", () => {
    expect(formatRole("ROLE_ADMIN")).toBe("Admin");
    expect(formatRole("ADMIN")).toBe("Admin");
  });

  it("handles null, undefined, or empty string gracefully", () => {
    expect(formatRole(null)).toBe("");
    expect(formatRole(undefined)).toBe("");
    expect(formatRole("")).toBe("");
  });

  it("formats arbitrary roles nicely with title case", () => {
    expect(formatRole("ROLE_OPERATOR")).toBe("Operator");
    expect(formatRole("AUDITOR")).toBe("Auditor");
  });
});
