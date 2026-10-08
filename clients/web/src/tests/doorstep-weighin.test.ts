import { describe, it, expect } from "vitest";
import {
  calculateEstimatedTokens,
  QUALITY_GRADES,
  CATEGORY_MULTIPLIERS,
  getCategoryDisplayName,
} from "../components/doorstep-weighin-modal";

describe("Doorstep Weigh-In Multipliers & Token Calculation", () => {
  it("matches backend QualityGrade multipliers exactly", () => {
    const gradeA = QUALITY_GRADES.find((g) => g.value === "GRADE_A");
    const gradeB = QUALITY_GRADES.find((g) => g.value === "GRADE_B");
    const gradeC = QUALITY_GRADES.find((g) => g.value === "GRADE_C");

    expect(gradeA?.multiplier).toBe(1.2);
    expect(gradeB?.multiplier).toBe(1.0);
    expect(gradeC?.multiplier).toBe(0.7);
  });

  it("matches backend WasteCategory multipliers exactly", () => {
    expect(CATEGORY_MULTIPLIERS.FOOD_SCRAPS).toBe(1.0);
    expect(CATEGORY_MULTIPLIERS.GARDEN_WASTE).toBe(0.8);
    expect(CATEGORY_MULTIPLIERS.AGRICULTURAL_ORGANIC).toBe(1.2);
    expect(CATEGORY_MULTIPLIERS.COFFEE_GROUNDS).toBe(1.5);
  });

  it("calculates certified reward for Grade A and baseline category (1.0x)", () => {
    // 4.8 kg * 1.0 (category) * 1.2 (Grade A) = 5.76 tokens
    const result = calculateEstimatedTokens(4.8, "GRADE_A", "FOOD_SCRAPS");
    expect(result.tokens).toBe(5.76);
    expect(result.gradeMultiplier).toBe(1.2);
    expect(result.categoryMultiplier).toBe(1.0);
  });

  it("calculates certified reward for Grade B (standard 1.0x)", () => {
    // 5.0 kg * 1.0 * 1.0 = 5.0 tokens
    const result = calculateEstimatedTokens(5.0, "GRADE_B", "FOOD_SCRAPS");
    expect(result.tokens).toBe(5.0);
  });

  it("calculates certified reward for Grade C (0.7x)", () => {
    // 10.0 kg * 1.0 * 0.7 = 7.0 tokens
    const result = calculateEstimatedTokens(10.0, "GRADE_C", "FOOD_SCRAPS");
    expect(result.tokens).toBe(7.0);
  });

  it("calculates reward with special category multiplier (Coffee Grounds 1.5x)", () => {
    // 4.0 kg * 1.5 * 1.2 = 7.2 tokens
    const result = calculateEstimatedTokens(4.0, "GRADE_A", "COFFEE_GROUNDS");
    expect(result.tokens).toBe(7.2);
  });

  it("returns 0 tokens when weight is 0", () => {
    const result = calculateEstimatedTokens(0, "GRADE_A", "FOOD_SCRAPS");
    expect(result.tokens).toBe(0);
  });

  it("formats human-readable category labels properly", () => {
    expect(getCategoryDisplayName("FOOD_SCRAPS")).toBe("Food Scraps & Kitchen Waste");
    expect(getCategoryDisplayName("GARDEN_WASTE")).toBe("Garden & Yard Trimmings");
    expect(getCategoryDisplayName("COFFEE_GROUNDS")).toBe("Coffee Grounds & Tea Residue");
    expect(getCategoryDisplayName(null)).toBe("Organic Kitchen Waste");
  });
});
