"use client";

import React, { useState, useEffect, useRef } from "react";
import type {
  PickupRequestApiResponse,
  VerifyPickupHandshakeApiRequest,
  CompactQrPayload,
} from "@agroloop/api-types";
import { webApiClient } from "../lib/api";
import { CameraQrScanner } from "./camera-qr-scanner";

export {
  QUALITY_GRADES,
  CATEGORY_MULTIPLIERS,
  getCategoryDisplayName,
  formatTokenAmount,
  calculateEstimatedTokens,
  buildVerificationRequest,
  type QualityGradeOption,
} from "../utils/weigh-in";
import {
  QUALITY_GRADES,
  CATEGORY_MULTIPLIERS,
  getCategoryDisplayName,
  formatTokenAmount,
  calculateEstimatedTokens,
  buildVerificationRequest,
} from "../utils/weigh-in";

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
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>("");
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [showDetailedReceipt, setShowDetailedReceipt] = useState<boolean>(false);
  const [isHandshakeVerifiedLocally, setIsHandshakeVerifiedLocally] = useState<boolean>(false);
  const [isVerifyingHandshake, setIsVerifyingHandshake] = useState<boolean>(false);

  // Validation & Error States
  const [weightError, setWeightError] = useState<string | null>(null);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState<string | null>(null);
  const [isAlreadyProcessed, setIsAlreadyProcessed] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedData, setSubmittedData] = useState<{
    weight: number;
    grade: "GRADE_A" | "GRADE_B" | "GRADE_C";
    tokens: number;
  } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const parsedWeight = parseFloat(weightInput);
  const isHandshakeAlreadyVerified = Boolean(pickup?.handshakeVerified || isHandshakeVerifiedLocally);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  // Reset form when pickup changes
  useEffect(() => {
    if (pickup) {
      const initialWeight = pickup.estimatedWeight ? pickup.estimatedWeight.toFixed(1) : "4.8";
      setWeightInput(initialWeight);
      setQualityGrade("GRADE_A");
      setDropdownOpen(false);
      setPasscode("");
      setWeightError(null);
      setPasscodeError(null);
      setApiErrorMessage(null);
      setIsHandshakeVerifiedLocally(Boolean(pickup.handshakeVerified));
      setIsSubmitting(false);
      setScannerOpen(false);
      setShowDetailedReceipt(false);

      if (pickup.status === "VERIFIED") {
        setIsAlreadyProcessed(true);
        setCurrentStep("error");
      } else {
        setIsAlreadyProcessed(false);
        setCurrentStep("form");
      }
    }
  }, [pickup]);

  if (!isOpen || !pickup) return null;

  // Resolve household name and readable reference code (never expose raw DB IDs)
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
  const neighborhood = pickup.pickupAddress ? pickup.pickupAddress.split(",")[0].trim() : "Local Sector";

  const selectedGradeObj =
    QUALITY_GRADES.find((g) => g.value === qualityGrade) ?? QUALITY_GRADES[0];

  const categoryName = getCategoryDisplayName(pickup.category);

  const estimatedReward = calculateEstimatedTokens(
    isNaN(parsedWeight) || parsedWeight <= 0 ? 0 : parsedWeight,
    qualityGrade,
    pickup.category
  );

  // Strict numeric measurement validation
  const validateWeightField = (val: string): boolean => {
    if (!val || val.trim() === "") {
      setWeightError("Weight is required.");
      return false;
    }
    const num = parseFloat(val);
    if (isNaN(num)) {
      setWeightError("Enter a valid numeric weight.");
      return false;
    }
    if (num <= 0) {
      setWeightError("Weight must be greater than 0 kg.");
      return false;
    }
    if (num < 0.1) {
      setWeightError("Minimum weigh-in threshold is 0.1 kg.");
      return false;
    }
    if (num > 500) {
      setWeightError("Weight exceeds maximum batch capacity of 500 kg.");
      return false;
    }
    // Check decimal precision (at most 2 decimal places)
    const decimalParts = val.split(".");
    if (decimalParts.length > 1 && decimalParts[1].length > 2) {
      setWeightError("Measurement precision is limited to 2 decimal places.");
      return false;
    }

    setWeightError(null);
    return true;
  };

  const validatePasscodeField = (): boolean => {
    if (isHandshakeAlreadyVerified) return true;
    if (!passcode || passcode.trim().length < 4) {
      setPasscodeError("Household verification passcode or QR pass is required.");
      return false;
    }
    setPasscodeError(null);
    return true;
  };

  // Instant on-site household verification action
  const handleVerifyHouseholdPasscode = async () => {
    if (!pickup.id || isVerifyingHandshake) return;
    const trimmed = passcode.trim();
    if (!trimmed) {
      setPasscodeError("Please enter or scan a household QR passcode.");
      return;
    }

    setIsVerifyingHandshake(true);
    setPasscodeError(null);

    try {
      const reqPayload = buildVerificationRequest(trimmed);

      // Verify payload match if QR scan with pickup ID
      if (reqPayload.method === "QR_SCAN" && reqPayload.payload.p && reqPayload.payload.p !== pickup.id) {
        setPasscodeError(`Scanned QR pass is for Pickup #${reqPayload.payload.p}, but this record is Pickup #${pickup.id}.`);
        setIsVerifyingHandshake(false);
        return;
      }

      // Ensure pickup is claimed if currently in REQUESTED status
      if (pickup.status === "REQUESTED") {
        try {
          await webApiClient.farmer.claimPickup(pickup.id);
        } catch {
          // Non-blocking if already claimed
        }
      }

      await webApiClient.pickups.verifyHandshake(pickup.id, reqPayload);
      setIsHandshakeVerifiedLocally(true);
      setPasscodeError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Handshake verification failed";
      if (msg.toLowerCase().includes("already consumed")) {
        setIsHandshakeVerifiedLocally(true);
        setPasscodeError(null);
      } else {
        setPasscodeError(msg);
      }
    } finally {
      setIsVerifyingHandshake(false);
    }
  };

  const handleProceedToReview = async () => {
    const isWeightValid = validateWeightField(weightInput);
    if (!isWeightValid) return;

    if (!isHandshakeAlreadyVerified) {
      const isPasscodeValid = validatePasscodeField();
      if (!isPasscodeValid) return;

      // Attempt to verify pass if provided
      if (passcode.trim()) {
        try {
          await handleVerifyHouseholdPasscode();
        } catch {
          // Error is set in handleVerifyHouseholdPasscode
          return;
        }
      }
    }

    setCurrentStep("review");
  };

  const handleExecuteSubmission = async () => {
    if (!pickup.id || isSubmitting) return;

    setIsSubmitting(true);
    setCurrentStep("loading");
    setApiErrorMessage(null);
    setIsAlreadyProcessed(false);

    try {
      // 1. Verify household handshake passcode if not yet verified
      if (!isHandshakeAlreadyVerified && passcode.trim()) {
        try {
          const reqPayload = buildVerificationRequest(passcode);
          await webApiClient.pickups.verifyHandshake(pickup.id, reqPayload);
          setIsHandshakeVerifiedLocally(true);
        } catch (handshakeErr: unknown) {
          const msg = handshakeErr instanceof Error ? handshakeErr.message : "Handshake error";
          if (!msg.toLowerCase().includes("already consumed")) {
            throw handshakeErr;
          }
        }
      }

      // 2. Lifecycle synchronization: ensure collected before verified
      if (pickup.status !== "COLLECTED" && pickup.status !== "VERIFIED") {
        if (pickup.status === "REQUESTED") {
          try {
            await webApiClient.farmer.claimPickup(pickup.id);
          } catch {
            // Already claimed
          }
        }

        if (pickup.status === "REQUESTED" || pickup.status === "ASSIGNED") {
          try {
            const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            await webApiClient.farmer.schedulePickup(pickup.id, { scheduledTime: futureDate });
          } catch {
            // Already scheduled
          }
        }

        try {
          await webApiClient.farmer.collectPickup(pickup.id);
        } catch (collectErr: unknown) {
          const msg = collectErr instanceof Error ? collectErr.message : "";
          if (!msg.toLowerCase().includes("collected") && !msg.toLowerCase().includes("already")) {
            try {
              const futureDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();
              await webApiClient.farmer.schedulePickup(pickup.id, { scheduledTime: futureDate });
              await webApiClient.farmer.collectPickup(pickup.id);
            } catch {
              // Non-blocking fallback
            }
          }
        }
      }

      // 3. Submit certified waste weight & quality grade to mint EcoTokens
      const finalWeight = parseFloat(weightInput);
      await webApiClient.farmer.verifyPickup(pickup.id, {
        verifiedWeight: finalWeight,
        qualityGrade,
        notes: `Certified doorstep collection for ${householdName} (${householdRefCode})`,
      });

      // 4. Complete route stop if running an active route
      if (routeId && stopId) {
        try {
          await webApiClient.farmer.completeStop(routeId, stopId);
        } catch {
          // Non-blocking
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

      if (
        errorMsg.toLowerCase().includes("already") ||
        errorMsg.toLowerCase().includes("completed") ||
        errorMsg.toLowerCase().includes("verified")
      ) {
        setIsAlreadyProcessed(true);
      }
      setCurrentStep("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200"
    >
      {/* Modal Container: responsive width from mobile up to desktop */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-[560px] lg:max-w-3xl xl:max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* ========================================================== */}
        {/* 1. MODAL HEADER                                            */}
        {/* ========================================================== */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-white shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 id="modal-title" className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Doorstep Collection
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {currentStep === "form" && "Verify and record collected waste"}
              {currentStep === "review" && "Review collection details before submitting"}
              {currentStep === "confirm_dialog" && "Final confirmation before permanent ledger entry"}
              {currentStep === "loading" && "Processing verified weigh-in and minting tokens"}
              {currentStep === "success" && "Waste certified and EcoTokens minted"}
              {currentStep === "error" && "Unable to record collection. Review details below"}
            </p>
          </div>

          {currentStep !== "loading" && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition text-xl font-bold leading-none"
              aria-label="Close modal"
            >
              ×
            </button>
          )}
        </div>

        {/* ========================================================== */}
        {/* 2. MODAL BODY: OPERATIONAL WORKFLOW                        */}
        {/* ========================================================== */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">

          {/* -------------------------------------------------------- */}
          {/* STEP 1: OPERATIONAL WEIGH-IN FORM                        */}
          {/* -------------------------------------------------------- */}
          {currentStep === "form" && (
            <div className="space-y-5">
              
              {/* SECTION 1: HOUSEHOLD */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-3xs font-black uppercase tracking-wider text-slate-400">
                    HOUSEHOLD
                  </span>
                  {isHandshakeAlreadyVerified && (
                    <span className="text-3xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                      <span>✓</span> Household Verified
                    </span>
                  )}
                </div>

                {isHandshakeAlreadyVerified ? (
                  /* Verified Household Card */
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200/90 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-xs shrink-0">
                        ✓
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900">{householdName}</h4>
                          <span className="text-3xs font-extrabold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                            Verified
                          </span>
                        </div>
                        <p className="text-2xs font-mono font-bold text-emerald-800 tracking-wider">
                          {householdRefCode}
                        </p>
                        <p className="text-2xs text-slate-500 mt-0.5">
                          📍 {neighborhood} · Ready for Weigh-In
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Verification Required Card */
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{householdName}</h4>
                        <p className="text-2xs text-slate-500">📍 {neighborhood}</p>
                      </div>
                      <span className="text-2xs font-mono font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-lg">
                        {householdRefCode}
                      </span>
                    </div>

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
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. ECO-2126-2838 or scan QR"
                          value={passcode}
                          onChange={(e) => {
                            setPasscode(e.target.value.toUpperCase());
                            if (passcodeError) setPasscodeError(null);
                          }}
                          className={`flex-1 px-3.5 py-2.5 font-mono text-xs uppercase tracking-wider bg-white border rounded-xl focus:outline-none transition ${
                            passcodeError
                              ? "border-red-400 ring-2 ring-red-100"
                              : "border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={handleVerifyHouseholdPasscode}
                          disabled={isVerifyingHandshake || !passcode.trim()}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-xs transition shrink-0"
                        >
                          {isVerifyingHandshake ? "Verifying..." : "Verify Pass"}
                        </button>
                      </div>

                      {passcodeError && (
                        <p className="text-2xs text-red-600 font-semibold mt-1.5 flex items-center gap-1">
                          <span>⚠️</span> {passcodeError}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Real Optical Camera QR Scanner */}
              {scannerOpen && (
                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-150">
                  <CameraQrScanner
                    title="Household QR Camera Scanner"
                    subtitle={`Scan physical QR pass for Household #${pickup.householdId}`}
                    simulateSampleCode={`ECO-${pickup.id}-PASS`}
                    onScan={(scanned) => {
                      setPasscode(scanned);
                      setPasscodeError(null);
                      setScannerOpen(false);
                    }}
                    onClose={() => setScannerOpen(false)}
                  />
                </div>
              )}

              {/* Subtle Section Divider */}
              <div className="border-t border-slate-100 pt-1" />

              {/* SECTION 2: ACTUAL WASTE WEIGHT */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="waste-weight-input" className="text-3xs font-black uppercase tracking-wider text-slate-400">
                    ACTUAL WASTE WEIGHT
                  </label>
                  {pickup.estimatedWeight && (
                    <span className="text-2xs text-slate-400">
                      Est. by household:{" "}
                      <strong className="text-slate-600">{pickup.estimatedWeight.toFixed(1)} kg</strong>
                    </span>
                  )}
                </div>

                {/* Measurement Styled Input */}
                <div
                  className={`flex items-center bg-white border rounded-2xl transition shadow-2xs px-3 py-1 ${
                    weightError
                      ? "border-red-400 ring-2 ring-red-100"
                      : "border-slate-300 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100"
                  }`}
                >
                  <span className="text-xl text-slate-400 select-none mr-2">⚖️</span>
                  <input
                    id="waste-weight-input"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="500"
                    placeholder="0.0"
                    value={weightInput}
                    onChange={(e) => {
                      setWeightInput(e.target.value);
                      validateWeightField(e.target.value);
                    }}
                    className="w-full py-2 text-2xl sm:text-3xl font-black text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-300 tracking-tight"
                  />
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-black rounded-xl border border-slate-200 select-none shrink-0">
                    kg
                  </span>
                </div>

                {weightError ? (
                  <p className="text-2xs text-red-600 font-semibold flex items-center gap-1">
                    <span>⚠️</span> {weightError}
                  </p>
                ) : (
                  <p className="text-2xs text-slate-400">
                    Enter the certified weight recorded at collection.
                  </p>
                )}
              </div>

              {/* Subtle Section Divider */}
              <div className="border-t border-slate-100 pt-1" />

              {/* SECTION 3: QUALITY GRADE (CUSTOM UNDERSTANDABLE DROPDOWN) */}
              <div className="space-y-2 relative" ref={dropdownRef}>
                <div className="flex items-center justify-between">
                  <label className="text-3xs font-black uppercase tracking-wider text-slate-400">
                    QUALITY GRADE
                  </label>
                  <span className="text-3xs font-bold text-slate-500">
                    Category: <strong className="text-slate-700">{categoryName}</strong>
                  </span>
                </div>

                {/* Dropdown Trigger Box */}
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={dropdownOpen}
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`w-full px-4 py-3 bg-white border rounded-2xl flex items-center justify-between transition shadow-2xs text-left ${
                    dropdownOpen
                      ? "border-emerald-500 ring-2 ring-emerald-100"
                      : "border-slate-300 hover:border-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-black text-slate-900">
                      {selectedGradeObj.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-3xs font-black border ${selectedGradeObj.badgeClass}`}>
                      {selectedGradeObj.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-2xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {selectedGradeObj.multiplier.toFixed(1)}×
                    </span>
                    <span className={`text-xs transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}>
                      ▼
                    </span>
                  </div>
                </button>

                {/* Subtitle Below the Box */}
                <p className="text-2xs text-slate-500 pl-1">
                  <strong className="text-slate-800">{selectedGradeObj.title}</strong> · {selectedGradeObj.description} · {selectedGradeObj.multiplier.toFixed(1)}× reward
                </p>

                {/* Understandable Dropdown Options Menu */}
                {dropdownOpen && (
                  <div
                    role="listbox"
                    className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150"
                  >
                    {QUALITY_GRADES.map((grade) => {
                      const isSelected = qualityGrade === grade.value;
                      return (
                        <button
                          key={grade.value}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setQualityGrade(grade.value);
                            setDropdownOpen(false);
                          }}
                          className={`w-full px-4 py-3 text-left transition flex items-start justify-between gap-3 ${
                            isSelected
                              ? "bg-emerald-50/70 border-l-4 border-emerald-600"
                              : "hover:bg-slate-50 border-l-4 border-transparent"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-slate-900">{grade.label}</span>
                              <span className="text-2xs font-extrabold text-slate-700">{grade.title}</span>
                              {isSelected && (
                                <span className="text-3xs font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                                  ✓ Selected
                                </span>
                              )}
                            </div>
                            <p className="text-2xs text-slate-500">
                              {grade.description} · {grade.multiplier.toFixed(1)}×
                            </p>
                          </div>

                          <span className={`text-3xs font-black px-2 py-0.5 rounded-full border shrink-0 ${grade.badgeClass}`}>
                            {grade.multiplier.toFixed(1)}×
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Subtle Section Divider */}
              <div className="border-t border-slate-100 pt-1" />

              {/* SECTION 4: ESTIMATED ECO-TOKENS REWARD PREVIEW */}
              <div className="p-5 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/70 border border-emerald-200/90 rounded-2xl space-y-2.5 shadow-2xs text-center">
                <span className="text-3xs uppercase font-black tracking-wider text-emerald-800 block">
                  ESTIMATED ECO-TOKENS
                </span>

                <div className="py-1">
                  <div className="inline-flex items-center justify-center gap-2">
                    <span className="text-3xl select-none">🪙</span>
                    <span className="text-4xl font-black text-emerald-950 tracking-tight">
                      {parsedWeight > 0 ? formatTokenAmount(estimatedReward.tokens) : "0"}
                    </span>
                  </div>
                </div>

                <div className="border-t border-emerald-200/50 pt-2 text-2xs text-slate-500 font-medium space-y-0.5">
                  <p>
                    Based on weight and quality grade
                  </p>
                  <p className="text-3xs text-emerald-800 font-bold">
                    {parsedWeight > 0 ? parsedWeight.toFixed(1) : "0.0"} kg · {selectedGradeObj.label} ({selectedGradeObj.multiplier.toFixed(1)}×) · {categoryName}
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* STEP 2: REVIEW COLLECTION STEP                           */}
          {/* -------------------------------------------------------- */}
          {currentStep === "review" && (
            <div className="space-y-4">
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                {/* Household */}
                <div className="pb-3 border-b border-slate-200/80">
                  <span className="text-3xs font-black uppercase tracking-wider text-slate-400 block mb-1">
                    HOUSEHOLD
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-slate-900">{householdName}</h4>
                      <p className="text-2xs font-mono font-bold text-slate-500">{householdRefCode}</p>
                      <p className="text-2xs text-slate-500 mt-0.5">📍 {neighborhood}</p>
                    </div>
                    <span className="text-2xs font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <span>✓</span> Verified
                    </span>
                  </div>
                </div>

                {/* Waste Weight */}
                <div className="pb-3 border-b border-slate-200/80">
                  <span className="text-3xs font-black uppercase tracking-wider text-slate-400 block mb-1">
                    ACTUAL WASTE WEIGHT
                  </span>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-black text-slate-900">
                        {parsedWeight.toFixed(2)} kg
                      </span>
                      <p className="text-2xs text-slate-500">{categoryName}</p>
                    </div>
                    <span className="text-2xs font-bold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-lg">
                      Certified Measurement
                    </span>
                  </div>
                </div>

                {/* Quality Grade */}
                <div className="pb-3 border-b border-slate-200/80">
                  <span className="text-3xs font-black uppercase tracking-wider text-slate-400 block mb-1">
                    QUALITY GRADE
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        {selectedGradeObj.label}
                      </p>
                      <p className="text-2xs text-slate-500 font-medium">
                        {selectedGradeObj.title} · {selectedGradeObj.description}
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-3xs font-black border ${selectedGradeObj.badgeClass}`}>
                      {selectedGradeObj.multiplier.toFixed(1)}× reward
                    </span>
                  </div>
                </div>

                {/* Estimated Reward */}
                <div>
                  <span className="text-3xs font-black uppercase tracking-wider text-slate-400 block mb-1">
                    ESTIMATED REWARD
                  </span>
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl">🪙</span>
                      <span className="text-3xl font-black text-emerald-900">
                        {formatTokenAmount(estimatedReward.tokens)}
                      </span>
                      <span className="text-xs font-bold text-emerald-700">EcoTokens</span>
                    </div>
                    <span className="text-3xs text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      Immediate Minting
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-2xs text-amber-800 flex items-center gap-2">
                <span>ℹ️</span>
                <span>
                  Please double-check the measured weight and quality grade. Submission will commit tokens to the household account.
                </span>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* STEP 3: FINAL CONFIRMATION DIALOG                        */}
          {/* -------------------------------------------------------- */}
          {currentStep === "confirm_dialog" && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl mx-auto shadow-xs">
                ⚖️
              </div>
              
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">Confirm Collection?</h3>
                <p className="text-xs text-slate-500">
                  You are about to record:
                </p>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Waste Weight:</span>
                  <span className="font-black text-slate-900">{parsedWeight.toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Quality Grade:</span>
                  <span className="font-black text-slate-900">{selectedGradeObj.label} ({selectedGradeObj.title})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Household:</span>
                  <span className="font-black text-slate-900">{householdName}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-emerald-700 font-bold">Estimated Reward:</span>
                  <span className="font-black text-emerald-900 text-sm">
                    🪙 {formatTokenAmount(estimatedReward.tokens)} EcoTokens
                  </span>
                </div>
              </div>

              <p className="text-2xs text-slate-400">
                This will complete the collection.
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
                <div className="flex items-center justify-center gap-2 text-xs text-emerald-700 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>○ Processing</span>
                </div>
                <p className="text-xs text-slate-500 pt-1">
                  Please wait while the collection is verified.
                </p>
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
                <h3 className="text-xl font-black text-slate-900">Collection Completed</h3>
                <p className="text-xs text-slate-500">
                  The collection has been successfully recorded.
                </p>
              </div>

              <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl max-w-sm mx-auto text-left space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-emerald-200/60">
                  <span className="text-xs font-bold text-slate-700">{householdName}</span>
                  <span className="text-2xs font-mono text-emerald-800 font-bold">{householdRefCode}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Recorded Weight</span>
                  <strong className="text-slate-900 font-black">
                    {submittedData?.weight.toFixed(2)} kg
                  </strong>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Quality Grade</span>
                  <strong className="text-slate-900 font-black">
                    {selectedGradeObj.label} ({selectedGradeObj.title})
                  </strong>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 flex justify-between items-center">
                  <span className="text-xs font-black text-emerald-900">EcoTokens Minted</span>
                  <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-xs">
                    🪙 +{submittedData ? formatTokenAmount(submittedData.tokens) : "0"}
                  </span>
                </div>
              </div>

              {showDetailedReceipt && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-2xs space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Waste Stream:</span>
                    <span className="font-bold text-slate-800">{categoryName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Doorstep Location:</span>
                    <span className="font-bold text-slate-800">{neighborhood}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-bold text-emerald-700">Verified &amp; Minted</span>
                  </div>
                </div>
              )}
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
                    ? "This pickup has already been processed."
                    : "The collection could not be recorded. No EcoTokens were minted."}
                </p>
              </div>

              {apiErrorMessage && !isAlreadyProcessed && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-2xs text-red-700 max-w-sm mx-auto font-mono text-left">
                  {apiErrorMessage}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ========================================================== */}
        {/* 3. MODAL FOOTER BUTTON CONTROLS                            */}
        {/* ========================================================== */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between shrink-0">
          
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
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-200 transition"
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
            <div className="w-full flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowDetailedReceipt(!showDetailedReceipt)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition"
              >
                {showDetailedReceipt ? "Hide Receipt" : "View Collection"}
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition"
                >
                  Back to Pickups
                </button>

                {hasNextStop && onNavigateNextStop && (
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
                )}
              </div>
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
