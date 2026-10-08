"use client";

import React, { useState, useEffect, useId } from "react";
import type { PickupRequestApiResponse } from "@agroloop/api-types";
import { webApiClient } from "../lib/api";

export interface QualityGradeOption {
  value: "GRADE_A" | "GRADE_B" | "GRADE_C";
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

export function calculateEstimatedTokens(
  weightKg: number,
  gradeValue: "GRADE_A" | "GRADE_B" | "GRADE_C",
  category?: string | null
): {
  tokens: number;
  gradeMultiplier: number;
  categoryMultiplier: number;
  rawReward: number;
} {
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

export interface DoorstepWeighInModalProps {
  isOpen: boolean;
  onClose: () => void;
  pickup: PickupRequestApiResponse | null;
  stopId?: number | null;
  routeId?: number | null;
  onSuccess?: (result: {
    pickupId: number;
    weight: number;
    qualityGrade: string;
    tokensMinted: number;
  }) => void;
  onNavigateNextStop?: () => void;
  hasNextStop?: boolean;
}

type ModalStep = "form" | "review" | "confirm_dialog" | "loading" | "success" | "error";

export function DoorstepWeighInModal({
  isOpen,
  onClose,
  pickup,
  stopId,
  routeId,
  onSuccess,
  onNavigateNextStop,
  hasNextStop = false,
}: DoorstepWeighInModalProps) {
  const [currentStep, setCurrentStep] = useState<ModalStep>("form");
  const [weightInput, setWeightInput] = useState<string>("4.8");
  const [qualityGrade, setQualityGrade] = useState<"GRADE_A" | "GRADE_B" | "GRADE_C">("GRADE_A");
  const [passcode, setPasscode] = useState<string>("");
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);

  // Validation & Error States
  const [weightError, setWeightError] = useState<string | null>(null);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [isAlreadyProcessed, setIsAlreadyProcessed] = useState<boolean>(false);
  const [submittedData, setSubmittedData] = useState<{
    weight: number;
    grade: "GRADE_A" | "GRADE_B" | "GRADE_C";
    tokens: number;
  } | null>(null);

  const parsedWeight = parseFloat(weightInput);
  const isHandshakeAlreadyVerified = Boolean(pickup?.handshakeVerified);

  // Initialize form when pickup changes
  useEffect(() => {
    if (pickup) {
      const initialWeight = pickup.estimatedWeight ? pickup.estimatedWeight.toFixed(1) : "4.8";
      setWeightInput(initialWeight);
      setQualityGrade("GRADE_A");
      setPasscode("");
      setWeightError(null);
      setPasscodeError(null);
      setApiErrorMessage(null);
      setIsAlreadyProcessed(false);
      setCurrentStep("form");
      setScannerOpen(false);
    }
  }, [pickup]);

  if (!isOpen || !pickup) return null;

  // Resolve household display name and standard reference code
  const householdName =
    pickup.householdName ||
    pickup.userName ||
    (pickup.pickupAddress?.toLowerCase().includes("green view")
      ? "Alice Green Household"
      : pickup.pickupAddress?.toLowerCase().includes("palm grove")
      ? "David Miller Household"
      : pickup.pickupAddress?.toLowerCase().includes("riverside")
      ? "Sarah Connor Household"
      : "Bob Household");

  const householdRefCode = `ECO-${(pickup.id ?? 2126).toString().padStart(4, "0")}-${((pickup.householdId ?? 2838) % 9000 + 1000)}`;

  const selectedGradeObj =
    QUALITY_GRADES.find((g) => g.value === qualityGrade) ?? QUALITY_GRADES[0];

  const categoryName = getCategoryDisplayName(pickup.category);

  const estimatedReward = calculateEstimatedTokens(
    isNaN(parsedWeight) || parsedWeight <= 0 ? 0 : parsedWeight,
    qualityGrade,
    pickup.category
  );

  // Validate weight input
  const validateWeightField = (val: string): boolean => {
    const num = parseFloat(val);
    if (!val || val.trim() === "") {
      setWeightError("Weight is required.");
      return false;
    }
    if (isNaN(num)) {
      setWeightError("Please enter a valid numeric weight.");
      return false;
    }
    if (num <= 0) {
      setWeightError("Weight must be greater than 0 kg.");
      return false;
    }
    if (num < 0.05) {
      setWeightError("Minimum weigh-in threshold is 0.05 kg.");
      return false;
    }
    if (num > 500) {
      setWeightError("Weight exceeds maximum batch limit of 500 kg.");
      return false;
    }
    setWeightError(null);
    return true;
  };

  // Validate verification passcode if not yet verified
  const validatePasscodeField = (): boolean => {
    if (isHandshakeAlreadyVerified) return true;
    if (!passcode || passcode.trim().length < 4) {
      setPasscodeError("Household verification passcode is required.");
      return false;
    }
    setPasscodeError(null);
    return true;
  };

  const handleProceedToReview = () => {
    const isWeightValid = validateWeightField(weightInput);
    const isPasscodeValid = validatePasscodeField();
    if (isWeightValid && isPasscodeValid) {
      setCurrentStep("review");
    }
  };

  // Execute collection submission
  const handleExecuteSubmission = async () => {
    if (!pickup.id) return;

    setCurrentStep("loading");
    setApiErrorMessage(null);
    setIsAlreadyProcessed(false);

    try {
      // 1. Consume handshake passcode if not yet verified
      if (!isHandshakeAlreadyVerified && passcode.trim()) {
        try {
          await webApiClient.pickups.verifyHandshake(pickup.id, {
            method: "MANUAL_PASSCODE",
            passCode: passcode.trim(),
          });
        } catch (handshakeErr: unknown) {
          const msg = handshakeErr instanceof Error ? handshakeErr.message : "Handshake error";
          // If already consumed, safely proceed to weigh-in verification
          if (!msg.toLowerCase().includes("already consumed")) {
            throw handshakeErr;
          }
        }
      }

      // Ensure pickup is in COLLECTED status before physical weigh-in verification
      // Backend domain lifecycle: REQUESTED -> ASSIGNED -> SCHEDULED -> COLLECTED -> VERIFIED
      if (pickup.status !== "COLLECTED" && pickup.status !== "VERIFIED") {
        if (pickup.status === "REQUESTED") {
          try {
            await webApiClient.farmer.claimPickup(pickup.id);
          } catch {
            // Already claimed or owned
          }
        }

        // Must be SCHEDULED before it can be marked as COLLECTED
        if (pickup.status === "REQUESTED" || pickup.status === "ASSIGNED") {
          try {
            const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            await webApiClient.farmer.schedulePickup(pickup.id, { scheduledTime: futureDate });
          } catch {
            // Might already be scheduled
          }
        }

        try {
          await webApiClient.farmer.collectPickup(pickup.id);
        } catch (collectErr: unknown) {
          const msg = collectErr instanceof Error ? collectErr.message : "";
          // If collect failed because it needed scheduling first, schedule then retry collect
          if (!msg.toLowerCase().includes("collected") && !msg.toLowerCase().includes("already")) {
            try {
              const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
              await webApiClient.farmer.schedulePickup(pickup.id, { scheduledTime: futureDate });
              await webApiClient.farmer.collectPickup(pickup.id);
            } catch {
              // Proceed to verification which will assert final state
            }
          }
        }
      }

      // 2. Submit certified waste weight & quality grade to mint EcoTokens
      const finalWeight = parseFloat(weightInput);
      await webApiClient.farmer.verifyPickup(pickup.id, {
        verifiedWeight: finalWeight,
        qualityGrade,
        notes: `Doorstep weigh-in verified for ${householdName} (${householdRefCode})`,
      });

      // 3. Mark stop completed if part of route
      if (routeId && stopId) {
        try {
          await webApiClient.farmer.completeStop(routeId, stopId);
        } catch {
          // Non-blocking route stop completion
        }
      }

      setSubmittedData({
        weight: finalWeight,
        grade: qualityGrade,
        tokens: estimatedReward.tokens,
      });

      setCurrentStep("success");
      onSuccess?.({
        pickupId: pickup.id,
        weight: finalWeight,
        qualityGrade,
        tokensMinted: estimatedReward.tokens,
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to record collection.";
      setApiErrorMessage(errorMsg);

      // Detect if the pickup was already processed/completed
      if (
        errorMsg.toLowerCase().includes("already") ||
        errorMsg.toLowerCase().includes("completed") ||
        errorMsg.toLowerCase().includes("verified")
      ) {
        setIsAlreadyProcessed(true);
      }
      setCurrentStep("error");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-[560px] max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* ========================================================== */}
        {/* MODAL HEADER                                              */}
        {/* ========================================================== */}
        <div className="px-6 py-4 sm:py-5 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-3xs uppercase font-extrabold tracking-widest text-emerald-700">
                Doorstep Collection
              </span>
            </div>
            <h2 id="modal-title" className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
              {currentStep === "form" && "Weigh-In & Verification"}
              {currentStep === "review" && "Review Collection"}
              {currentStep === "confirm_dialog" && "Confirm Collection"}
              {currentStep === "loading" && "Recording Collection..."}
              {currentStep === "success" && "Collection Completed"}
              {currentStep === "error" && "Collection Status"}
            </h2>
            <p className="text-xs text-slate-500">
              {currentStep === "form" && "Verify household and record certified scale measurement."}
              {currentStep === "review" && "Check the collection summary before minting tokens."}
              {currentStep === "confirm_dialog" && "Final confirmation before permanent ledger entry."}
              {currentStep === "loading" && "Processing verified weigh-in and minting tokens."}
              {currentStep === "success" && "Waste certified and EcoTokens minted to household wallet."}
              {currentStep === "error" && "Unable to record collection. Review details below."}
            </p>
          </div>

          {currentStep !== "loading" && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition text-lg font-bold"
              aria-label="Close weigh-in modal"
            >
              ×
            </button>
          )}
        </div>

        {/* ========================================================== */}
        {/* MODAL BODY (STEP-BY-STEP WORKFLOW)                        */}
        {/* ========================================================== */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* -------------------------------------------------------- */}
          {/* STEP 1: FORM WORKFLOW                                    */}
          {/* -------------------------------------------------------- */}
          {currentStep === "form" && (
            <div className="space-y-5">
              {/* 1. HOUSEHOLD SECTION */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-3xs font-black uppercase tracking-wider text-slate-400">
                    HOUSEHOLD
                  </label>
                  {isHandshakeAlreadyVerified ? (
                    <span className="text-3xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <span>✓</span> Verified On-Site
                    </span>
                  ) : (
                    <span className="text-3xs font-extrabold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                      <span>●</span> Verification Required
                    </span>
                  )}
                </div>

                {isHandshakeAlreadyVerified ? (
                  /* Verified Household Card */
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
                        ✓
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{householdName}</h4>
                        <p className="text-2xs font-mono font-bold text-emerald-800 tracking-wider">
                          {householdRefCode}
                        </p>
                        <p className="text-2xs text-slate-500 mt-0.5">
                          📍 {pickup.pickupAddress || "Registered Doorstep Address"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Unverified Household & Verification Input */
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{householdName}</h4>
                        <p className="text-2xs text-slate-500">
                          📍 {pickup.pickupAddress || "Registered Doorstep Address"}
                        </p>
                      </div>
                      <span className="text-2xs font-mono font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-lg">
                        {householdRefCode}
                      </span>
                    </div>

                    {/* Scan QR Code button */}
                    <button
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      className="w-full py-2.5 px-4 bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-500 rounded-xl text-xs font-bold text-slate-800 hover:text-emerald-900 flex items-center justify-center gap-2 transition shadow-2xs group"
                    >
                      <span className="text-base group-hover:scale-110 transition-transform">📷</span>
                      <span>Scan Household QR Pass</span>
                    </button>

                    <div className="flex items-center gap-3 text-3xs uppercase tracking-wider text-slate-400">
                      <div className="flex-1 h-px bg-slate-200" />
                      <span>or enter passcode</span>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-3xs font-bold uppercase tracking-wider text-slate-600">
                          QR Passcode
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setPasscode("ECO-2126-PASS");
                            setPasscodeError(null);
                          }}
                          className="text-3xs text-emerald-700 hover:underline font-bold"
                        >
                          Auto-fill Demo Pass
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. ECO-2126-2838"
                        value={passcode}
                        onChange={(e) => {
                          setPasscode(e.target.value.toUpperCase());
                          if (passcodeError) setPasscodeError(null);
                        }}
                        className={`w-full px-3.5 py-2.5 font-mono text-xs uppercase tracking-wider bg-white border rounded-xl focus:outline-none transition ${
                          passcodeError
                            ? "border-red-400 ring-2 ring-red-100"
                            : "border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                        }`}
                      />
                      {passcodeError && (
                        <p className="text-2xs text-red-600 font-semibold mt-1">
                          ⚠️ {passcodeError}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* QR Scanner Simulation Modal */}
              {scannerOpen && (
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📷</span>
                      <span className="text-xs font-bold">Household QR Optical Scanner</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScannerOpen(false)}
                      className="text-slate-400 hover:text-white text-xs font-bold"
                    >
                      Close ×
                    </button>
                  </div>
                  <div className="h-32 border-2 border-dashed border-emerald-400/60 rounded-xl flex flex-col items-center justify-center p-3 bg-slate-950/40 text-center relative overflow-hidden">
                    <div className="absolute inset-x-0 h-0.5 bg-emerald-400/80 animate-bounce" />
                    <p className="text-2xs text-slate-300">Align household QR pass inside viewfinder</p>
                    <p className="text-3xs text-slate-500 mt-1">Ready to capture digital handshake token</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPasscode("ECO-2126-PASS");
                        setPasscodeError(null);
                        setScannerOpen(false);
                      }}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-2xs rounded-lg transition"
                    >
                      ✓ Capture Household Code
                    </button>
                    <button
                      type="button"
                      onClick={() => setScannerOpen(false)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-2xs rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* 2. ACTUAL WASTE WEIGHT SECTION */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-3xs font-black uppercase tracking-wider text-slate-400">
                    ACTUAL WASTE WEIGHT
                  </label>
                  {pickup.estimatedWeight && (
                    <span className="text-2xs text-slate-500">
                      Estimated by household:{" "}
                      <strong className="text-slate-700">{pickup.estimatedWeight.toFixed(1)} kg</strong>
                    </span>
                  )}
                </div>

                {/* Scale Measurement Styled Container */}
                <div
                  className={`flex items-center bg-white border rounded-2xl transition shadow-2xs p-1 ${
                    weightError
                      ? "border-red-400 ring-2 ring-red-100"
                      : "border-slate-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100"
                  }`}
                >
                  <div className="pl-3.5 pr-2 text-xl text-slate-400 select-none">⚖️</div>
                  <input
                    type="number"
                    step="0.1"
                    min="0.05"
                    max="500"
                    placeholder="0.0"
                    value={weightInput}
                    onChange={(e) => {
                      setWeightInput(e.target.value);
                      validateWeightField(e.target.value);
                    }}
                    className="w-full py-2.5 px-1 text-2xl font-black text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-300"
                  />
                  <div className="pr-3 select-none">
                    <span className="px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-black rounded-xl border border-slate-200">
                      kg
                    </span>
                  </div>
                </div>

                {weightError ? (
                  <p className="text-2xs text-red-600 font-semibold flex items-center gap-1">
                    <span>⚠️</span> {weightError}
                  </p>
                ) : (
                  <p className="text-2xs text-slate-400">
                    Enter the certified weight recorded on your portable scale at doorstep collection.
                  </p>
                )}
              </div>

              {/* 3. QUALITY GRADE SECTION */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-3xs font-black uppercase tracking-wider text-slate-400">
                    QUALITY GRADE
                  </label>
                  <span className="text-3xs font-bold text-slate-500">
                    Category: <strong className="text-slate-800">{categoryName}</strong>
                  </span>
                </div>

                {/* Grade Option Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {QUALITY_GRADES.map((grade) => {
                    const isSelected = qualityGrade === grade.value;
                    return (
                      <button
                        key={grade.value}
                        type="button"
                        onClick={() => setQualityGrade(grade.value)}
                        className={`p-3 rounded-2xl border text-left transition relative flex flex-col justify-between ${
                          isSelected
                            ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-100 shadow-xs"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span
                              className={`px-2 py-0.5 rounded-full text-3xs font-black border ${grade.badgeClass}`}
                            >
                              {grade.label}
                            </span>
                            <span className="text-3xs font-extrabold text-emerald-700 bg-white/80 px-1.5 py-0.5 rounded-md border border-slate-200">
                              {grade.multiplier.toFixed(1)}×
                            </span>
                          </div>
                          <p className="text-xs font-black text-slate-900 leading-tight">
                            {grade.title}
                          </p>
                          <p className="text-3xs text-slate-500 leading-snug line-clamp-2">
                            {grade.description}
                          </p>
                        </div>

                        {isSelected && (
                          <div className="mt-2 pt-1 border-t border-emerald-200/60 flex items-center gap-1 text-3xs font-extrabold text-emerald-800">
                            <span>✓</span>
                            <span>Selected</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-2xs text-slate-600 flex items-center justify-between">
                  <span>
                    <strong>{selectedGradeObj.label} ({selectedGradeObj.title})</strong>: {selectedGradeObj.description}
                  </span>
                  <span className="font-extrabold text-emerald-700 shrink-0 ml-2">
                    {selectedGradeObj.multiplier.toFixed(2)}× reward multiplier
                  </span>
                </div>
              </div>

              {/* 4. ESTIMATED ECO-TOKENS REWARD PREVIEW */}
              <div className="p-4 bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-200 rounded-2xl space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-3xs uppercase font-black tracking-wider text-emerald-800 flex items-center gap-1">
                    <span>🪙</span> ESTIMATED ECO-TOKENS
                  </span>
                  <span className="text-3xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Formula Preview
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 py-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl select-none">🪙</span>
                    <span className="text-3xl font-black text-emerald-950 tracking-tight">
                      {parsedWeight > 0 ? estimatedReward.tokens.toFixed(2) : "0.00"}
                    </span>
                    <span className="text-xs font-bold text-emerald-800">EcoTokens</span>
                  </div>

                  <div className="text-left sm:text-right text-2xs text-emerald-800 font-medium">
                    <p className="font-black text-slate-800">
                      {parsedWeight > 0 ? parsedWeight.toFixed(1) : "0.0"} kg · {selectedGradeObj.label} ({selectedGradeObj.multiplier.toFixed(1)}×)
                    </p>
                    <p className="text-3xs text-slate-500">
                      {categoryName} ({estimatedReward.categoryMultiplier.toFixed(1)}× stream)
                    </p>
                  </div>
                </div>

                <p className="text-3xs text-emerald-700/90 border-t border-emerald-200/60 pt-2 font-medium">
                  Reward is calculated automatically from certified scale weight, waste category, and organic quality grade.
                </p>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* STEP 2: REVIEW COLLECTION STEP                           */}
          {/* -------------------------------------------------------- */}
          {currentStep === "review" && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
                {/* Household Review */}
                <div className="pb-3 border-b border-slate-200">
                  <span className="text-3xs font-black uppercase tracking-wider text-slate-400 block mb-1">
                    HOUSEHOLD
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{householdName}</h4>
                      <p className="text-2xs font-mono font-bold text-slate-500">{householdRefCode}</p>
                      <p className="text-2xs text-slate-500 mt-0.5">
                        📍 {pickup.pickupAddress || "Registered Doorstep"}
                      </p>
                    </div>
                    <span className="text-2xs font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <span>✓</span> Verified
                    </span>
                  </div>
                </div>

                {/* Waste Weight Review */}
                <div className="pb-3 border-b border-slate-200">
                  <span className="text-3xs font-black uppercase tracking-wider text-slate-400 block mb-1">
                    WASTE WEIGHT
                  </span>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-black text-slate-900">{parsedWeight.toFixed(2)} kg</span>
                      <p className="text-2xs text-slate-500">{categoryName}</p>
                    </div>
                    <span className="text-2xs font-bold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-lg">
                      Certified Measurement
                    </span>
                  </div>
                </div>

                {/* Quality Grade Review */}
                <div className="pb-3 border-b border-slate-200">
                  <span className="text-3xs font-black uppercase tracking-wider text-slate-400 block mb-1">
                    QUALITY GRADE
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        {selectedGradeObj.label} — {selectedGradeObj.title}
                      </p>
                      <p className="text-2xs text-slate-500">{selectedGradeObj.description}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-3xs font-black border ${selectedGradeObj.badgeClass}`}>
                      {selectedGradeObj.multiplier.toFixed(1)}× Multiplier
                    </span>
                  </div>
                </div>

                {/* Estimated Reward Review */}
                <div>
                  <span className="text-3xs font-black uppercase tracking-wider text-slate-400 block mb-1">
                    ESTIMATED REWARD
                  </span>
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl">🪙</span>
                      <span className="text-2xl font-black text-emerald-900">
                        {estimatedReward.tokens.toFixed(2)}
                      </span>
                      <span className="text-xs font-bold text-emerald-700">EcoTokens</span>
                    </div>
                    <span className="text-3xs text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-full">
                      Immediate Minting
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-2xs text-amber-800 flex items-center gap-2">
                <span>ℹ️</span>
                <span>
                  Please verify weight and quality grade before proceeding. Minted tokens are committed directly to the circular ledger.
                </span>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* STEP 3: CONFIRM DIALOG STEP                              */}
          {/* -------------------------------------------------------- */}
          {currentStep === "confirm_dialog" && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl mx-auto shadow-xs">
                ⚖️
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">Confirm Doorstep Collection?</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  You are about to record certified collection and mint rewards for this household.
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Household:</span>
                  <span className="font-black text-slate-900">{householdName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Certified Weight:</span>
                  <span className="font-black text-slate-900">{parsedWeight.toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Quality Grade:</span>
                  <span className="font-black text-slate-900">{selectedGradeObj.label} ({selectedGradeObj.title})</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100">
                  <span className="text-emerald-700 font-bold">Token Reward:</span>
                  <span className="font-black text-emerald-900">🪙 {estimatedReward.tokens.toFixed(2)} EcoTokens</span>
                </div>
              </div>

              <p className="text-2xs text-slate-400">
                This will complete the collection and close this doorstep pickup.
              </p>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* STEP 4: LOADING / SUBMITTING STATE                       */}
          {/* -------------------------------------------------------- */}
          {currentStep === "loading" && (
            <div className="py-12 px-4 text-center space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">Recording Collection...</h3>
                <p className="text-xs text-slate-500">
                  Please wait while the doorstep weigh-in is verified and tokens are minted.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-2xs font-mono font-bold">
                <span>○ Processing idempotency lock</span>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* STEP 5: SUCCESS STATE                                    */}
          {/* -------------------------------------------------------- */}
          {currentStep === "success" && (
            <div className="py-6 px-2 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl mx-auto shadow-md shadow-emerald-100">
                ✓
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-900">Collection Completed!</h3>
                <p className="text-xs text-slate-500">
                  The collection has been successfully recorded in the AgroLoop circular ledger.
                </p>
              </div>

              <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl max-w-sm mx-auto text-left space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-emerald-200/60">
                  <span className="text-xs font-bold text-slate-600">{householdName}</span>
                  <span className="text-2xs font-mono text-emerald-800 font-bold">{householdRefCode}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Recorded Weight</span>
                  <strong className="text-slate-900 font-black">{submittedData?.weight.toFixed(2)} kg</strong>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Quality Grade</span>
                  <strong className="text-slate-900 font-black">{selectedGradeObj.label} ({selectedGradeObj.title})</strong>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 flex justify-between items-center">
                  <span className="text-xs font-black text-emerald-900">EcoTokens Minted</span>
                  <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-xs">
                    🪙 +{submittedData?.tokens.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* STEP 6: ERROR STATE                                      */}
          {/* -------------------------------------------------------- */}
          {currentStep === "error" && (
            <div className="py-6 px-2 text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto shadow-md shadow-red-100">
                ⚠️
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-900">
                  {isAlreadyProcessed ? "Collection Already Completed" : "Unable to Complete Collection"}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {isAlreadyProcessed
                    ? "This pickup has already been processed and verified. No duplicate tokens were minted."
                    : "The collection could not be recorded. No EcoTokens were minted."}
                </p>
              </div>

              {apiErrorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-2xs text-red-700 max-w-sm mx-auto font-mono text-left">
                  {apiErrorMessage}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ========================================================== */}
        {/* MODAL FOOTER BUTTON CONTROLS                               */}
        {/* ========================================================== */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          {/* STEP 1: FORM FOOTER */}
          {currentStep === "form" && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleProceedToReview}
                disabled={Boolean(weightError)}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-200 transition flex items-center gap-1.5"
              >
                <span>Review Collection</span>
                <span>→</span>
              </button>
            </>
          )}

          {/* STEP 2: REVIEW FOOTER */}
          {currentStep === "review" && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep("form")}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition flex items-center gap-1"
              >
                <span>←</span>
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep("confirm_dialog")}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-200 transition flex items-center gap-1.5"
              >
                <span>Confirm &amp; Mint Tokens</span>
                <span>→</span>
              </button>
            </>
          )}

          {/* STEP 3: CONFIRM DIALOG FOOTER */}
          {currentStep === "confirm_dialog" && (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep("review")}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteSubmission}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-200 transition"
              >
                Confirm &amp; Mint
              </button>
            </>
          )}

          {/* STEP 4: LOADING (DISABLED FOOTER) */}
          {currentStep === "loading" && (
            <div className="w-full text-center text-2xs text-slate-400 font-bold py-1">
              Communicating with AgroLoop backend...
            </div>
          )}

          {/* STEP 5: SUCCESS FOOTER */}
          {currentStep === "success" && (
            <div className="w-full flex items-center justify-end gap-3">
              {hasNextStop && onNavigateNextStop ? (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
                  >
                    Back to Pickups
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateNextStop();
                    }}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-200 transition flex items-center gap-1.5"
                  >
                    <span>Next Stop on Route</span>
                    <span>→</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
                >
                  Back to Pickups
                </button>
              )}
            </div>
          )}

          {/* STEP 6: ERROR FOOTER */}
          {currentStep === "error" && (
            <div className="w-full flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                Close
              </button>

              {!isAlreadyProcessed && (
                <button
                  type="button"
                  onClick={() => setCurrentStep("review")}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Try Again
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
