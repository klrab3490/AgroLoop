/**
 * Doorstep weigh-in business logic and token calculation utilities.
 */

import type {
  VerifyPickupHandshakeApiRequest,
  CompactQrPayload,
} from "@agroloop/api-types";

export type QualityGrade = "GRADE_A" | "GRADE_B" | "GRADE_C";

export interface QualityGradeOption {
  value: QualityGrade;
  label: string;
  title: string;
  description: string;
  multiplier: number;
  badgeClass: string;
}

// Certified Quality Grades matching backend QualityGrade.java
export const QUALITY_GRADES: QualityGradeOption[] = [
  {
    value: "GRADE_A",
    label: "Grade A",
    title: "Premium Organic",
    description: "Pure organic matter, zero contamination",
    multiplier: 1.2,
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  {
    value: "GRADE_B",
    label: "Grade B",
    title: "Standard Organic",
    description: "Standard compostable waste, minimal debris",
    multiplier: 1.0,
    badgeClass: "bg-blue-100 text-blue-800 border-blue-300",
  },
  {
    value: "GRADE_C",
    label: "Grade C",
    title: "Low Quality",
    description: "High moisture or partial debris, requires sorting",
    multiplier: 0.7,
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
  },
];

// Baseline stream multipliers matching backend WasteCategory.java
export const CATEGORY_MULTIPLIERS: Record<string, number> = {
  FOOD_SCRAPS: 1.0,
  GARDEN_WASTE: 0.8,
  AGRICULTURAL_ORGANIC: 1.2,
  COFFEE_GROUNDS: 1.5,
};

export function getCategoryDisplayName(category?: string | null): string {
  switch (category) {
    case "FOOD_SCRAPS":
      return "Food Scraps & Kitchen Waste";
    case "GARDEN_WASTE":
      return "Garden & Yard Trimmings";
    case "AGRICULTURAL_ORGANIC":
      return "Crop Residue & Farm Biomass";
    case "COFFEE_GROUNDS":
      return "Coffee Grounds & Tea Residue";
    default:
      return "Organic Kitchen Waste";
  }
}

export function formatTokenAmount(amount: number): string {
  if (Number.isInteger(amount)) {
    return amount.toString();
  }
  if (Math.abs(amount - Math.round(amount)) < 0.001) {
    return Math.round(amount).toString();
  }
  return amount.toFixed(2);
}

export interface EstimatedTokensResult {
  tokens: number;
  gradeMultiplier: number;
  categoryMultiplier: number;
  rawReward: number;
}

export function calculateEstimatedTokens(
  weightKg: number,
  gradeValue: QualityGrade,
  category?: string | null
): EstimatedTokensResult {
  const gradeObj = QUALITY_GRADES.find((g) => g.value === gradeValue) ?? QUALITY_GRADES[0];
  const catMult = category && CATEGORY_MULTIPLIERS[category] ? CATEGORY_MULTIPLIERS[category] : 1.0;
  const gradeMult = gradeObj.multiplier;
  const raw = weightKg * catMult * gradeMult;
  // Scaled to 2 decimal places per backend StandardTokenCalculator (BigDecimal HALF_UP)
  const rounded = Math.round(raw * 100) / 100;
  return {
    tokens: rounded,
    gradeMultiplier: gradeMult,
    categoryMultiplier: catMult,
    rawReward: raw,
  };
}

/**
 * Parses raw verification input into a VerifyPickupHandshakeApiRequest.
 * Supports compact QR JSON payload (with nonce and signature or passcode)
 * as well as manual passcode strings (e.g. ECO-1234-5678).
 */
export function buildVerificationRequest(rawInput: string): VerifyPickupHandshakeApiRequest {
  const trimmed = rawInput.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.n && (parsed.sig || parsed.c)) {
        return {
          method: "QR_SCAN",
          payload: parsed as CompactQrPayload,
        };
      }
    } catch {
      // Fallback to manual passcode
    }
  }
  return {
    method: "MANUAL_PASSCODE",
    passCode: trimmed.toUpperCase(),
  };
}
