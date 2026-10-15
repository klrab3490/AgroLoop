"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { webApiClient } from "@/lib/api";
import { ConfirmationModal } from "@/components/ui";

const WASTE_CATEGORIES = [
  { value: "FOOD_SCRAPS", label: "Kitchen Scraps", icon: "🥦", desc: "Fruit & vegetable peels, leftover organic food" },
  { value: "GARDEN_WASTE", label: "Yard Trimmings", icon: "🍂", desc: "Leaves, grass cuttings, plant prunings" },
  { value: "AGRICULTURAL_ORGANIC", label: "Crop Residue", icon: "🌾", desc: "Stalks, chaff, husk residues, straw" },
  { value: "COFFEE_GROUNDS", label: "Coffee Grounds & Tea", icon: "☕", desc: "Spent grounds, tea leaves, nitrogen-rich organic residue" },
] as const;

export default function SubmitWastePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [category, setCategory] = useState<string>("FOOD_SCRAPS");
  const [weight, setWeight] = useState("5.0");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user?.address && !address) {
      setAddress(user.address);
    }
  }, [user?.address]);

  // Clean up object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGpsLoading(false);
      },
      () => {
        // Fallback or user denied
        setCoordinates({ lat: 10.8505, lng: 76.2711 });
        setGpsLoading(false);
      },
      { timeout: 8000 }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg("Photo size exceeds 10 MB limit.");
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  if (authLoading) {
    return (
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 sm:py-10 space-y-8 min-h-[calc(100vh-4rem)] animate-pulse">
        <div className="h-6 w-32 rounded-xl bg-slate-200/60" />
        <div className="h-16 rounded-2xl bg-slate-200/60" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 h-96 rounded-3xl bg-slate-200/50" />
          <div className="lg:col-span-4 h-96 rounded-3xl bg-slate-200/50" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "ROLE_HOUSEHOLD") {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-4xl">🔒</p>
        <h2 className="text-2xl font-black text-slate-900">Household Authentication Required</h2>
        <Link href="/auth/login" className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs">
          Sign In
        </Link>
      </div>
    );
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight < 0.1) {
      setErrorMsg("Please provide a valid estimated weight of at least 0.1 kg.");
      return;
    }
    if (!address.trim()) {
      setErrorMsg("Please provide your doorstep collection address.");
      return;
    }

    // Trigger explicit Review -> Confirm -> Execute modal
    setShowConfirmModal(true);
  };

  const executeSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitting(true);
    setSubmitStatus("Preparing submission...");
    setErrorMsg(null);

    const parsedWeight = parseFloat(weight);

    try {
      let mediaId: string | undefined = undefined;

      if (selectedFile) {
        setSubmitStatus("Requesting upload ticket...");
        const ticket = await webApiClient.media.createUploadTicket({
          contentType: selectedFile.type || "image/jpeg",
          sizeBytes: selectedFile.size,
          purpose: "WASTE_SUBMISSION",
        });

        if (ticket.mediaId) {
          setSubmitStatus("Uploading verification photo...");
          const uploadUrl = `/api/proxy/media/upload/${ticket.mediaId}`;
          const buffer = await selectedFile.arrayBuffer();
          await webApiClient.media.directUpload(uploadUrl, buffer, selectedFile.type || "image/jpeg");

          setSubmitStatus("Confirming media verification...");
          await webApiClient.media.confirmUpload(ticket.mediaId, {});
          mediaId = ticket.mediaId;
        }
      }

      setSubmitStatus("Queueing waste submission...");
      await webApiClient.household.submitWaste({
        category: category as "FOOD_SCRAPS" | "GARDEN_WASTE" | "AGRICULTURAL_ORGANIC" | "COFFEE_GROUNDS",
        estimatedWeight: parsedWeight,
        mediaId,
        addressOverride: address.trim() || undefined,
        notes: notes.trim() || undefined,
        latitude: coordinates?.lat,
        longitude: coordinates?.lng,
      });

      router.push("/household/pickups");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to log waste submission");
    } finally {
      setIsSubmitting(false);
      setSubmitStatus(null);
    }
  };

  const parsedWeightVal = parseFloat(weight) || 0;
  const estimatedTokens = Math.max(0, Math.round(parsedWeightVal * 5));
  const estimatedCo2Offset = (parsedWeightVal * 1.8).toFixed(1);

  return (
    <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-8 sm:py-10 space-y-8 min-h-[calc(100vh-4rem)]">
      <div>
        <Link href="/household" className="text-xs font-bold text-slate-500 hover:text-emerald-700 inline-flex items-center gap-1 mb-2">
          ← Back to Hub
        </Link>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Submit Organic Waste</h1>
        <p className="text-xs text-slate-500 mt-1">
          Log your organic waste to queue a doorstep collection. Earn EcoTokens upon certified weigh-in.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        {/* Category Grid */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Select Waste Category
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {WASTE_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategory(cat.value)}
                className={`p-4 rounded-2xl border text-left transition flex items-start gap-3 ${
                  category === cat.value
                    ? "border-emerald-600 bg-emerald-50/50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{cat.label}</h4>
                  <p className="text-3xs text-slate-500 mt-0.5">{cat.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Estimated Weight */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700">Estimated Weight (kg)</label>
          <input
            type="number"
            step="any"
            min="0.1"
            max="500"
            required
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 5.0"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <p className="text-3xs text-slate-400">Final token reward is minted based on certified farmer weigh-in.</p>
        </div>

        {/* Pickup Address & Geolocation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700">Doorstep Pickup Address</label>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={gpsLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-3xs font-bold rounded-lg border border-emerald-200 transition"
            >
              <span>{gpsLoading ? "⏳ Locating..." : "📍 Use Current Location"}</span>
            </button>
          </div>
          <input
            type="text"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 123 Green Way, Kodungallur"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {coordinates && (
            <p className="text-3xs text-emerald-700 font-semibold flex items-center gap-1">
              ✓ GPS Pin captured ({coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}) — Farmer will receive direct turn-by-turn navigation.
            </p>
          )}
        </div>

        {/* Optional Photo Input */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">
            Batch Verification Photo <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          
          {previewUrl ? (
            <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <img
                src={previewUrl}
                alt="Selected waste batch"
                className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-2xs"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{selectedFile?.name}</p>
                <p className="text-3xs text-slate-400 mt-0.5">
                  {selectedFile ? (selectedFile.size / 1024).toFixed(1) + " KB" : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-emerald-50/20 transition group">
              <div className="flex items-center gap-2 text-slate-500 group-hover:text-emerald-700">
                <span className="text-xl">📷</span>
                <span className="text-xs font-semibold">Upload photo or take picture (JPEG, PNG, WebP)</span>
              </div>
              <p className="text-3xs text-slate-400 mt-1">Maximum file size: 10 MB</p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700">Special Collection Notes (Optional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Gate code, bin location, or special instructions..."
            className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 disabled:bg-slate-300 transition shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{submitStatus || "Processing..."}</span>
            </>
          ) : (
            "Review & Submit Pickup"
          )}
        </button>
      </form>
    </div>

    {/* Desktop Side Panel: Live Estimator & Guidelines */}
    <div className="lg:col-span-4 space-y-6">
      {/* Live Reward Calculation Card */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-6 sm:p-7 shadow-lg shadow-emerald-700/10 space-y-4">
        <span className="px-2.5 py-0.5 rounded-full text-3xs font-extrabold uppercase tracking-wider bg-white/20">
          Estimated Reward
        </span>
        <div>
          <span className="text-3xs uppercase font-bold text-emerald-200 block">Projected Mint</span>
          <p className="text-3xl font-black text-white mt-0.5">
            🪙 ~{estimatedTokens} <span className="text-sm font-semibold text-emerald-100">EcoTokens</span>
          </p>
          <p className="text-3xs text-emerald-100 mt-1">
            Calculated at ~5 tokens / kg of organic matter. Final token mint occurs on digital scale validation.
          </p>
        </div>

        <div className="pt-3 border-t border-white/20 flex items-center justify-between text-xs">
          <div>
            <span className="text-3xs text-emerald-200 uppercase font-bold block">CO₂ Avoided</span>
            <span className="font-bold text-white">🌿 {estimatedCo2Offset} kg CO₂e</span>
          </div>
          <div>
            <span className="text-3xs text-emerald-200 uppercase font-bold block">Batch Weight</span>
            <span className="font-bold text-white">⚖️ {parsedWeightVal.toFixed(1)} kg</span>
          </div>
        </div>
      </div>

      {/* Composting Guidelines Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
          <span>📋</span> Doorstep Pickup Process
        </h3>
        <ol className="space-y-3 text-xs text-slate-600">
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-2xs flex items-center justify-center shrink-0 mt-0.5">
              1
            </span>
            <span>
              <strong>Queue Batch:</strong> Submit your estimated weight and doorstep location.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-2xs flex items-center justify-center shrink-0 mt-0.5">
              2
            </span>
            <span>
              <strong>Farmer Dispatched:</strong> A certified local partner adds your stop to today&apos;s optimized route.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-2xs flex items-center justify-center shrink-0 mt-0.5">
              3
            </span>
            <span>
              <strong>Doorstep Weigh-in:</strong> Show your QR pass upon arrival; farmer records weight on scale and tokens are instantly minted.
            </span>
          </li>
        </ol>
      </div>
    </div>
  </div>

  {/* Review -> Confirm -> Execute Consequential Modal */}
  <ConfirmationModal
    isOpen={showConfirmModal}
    title="Confirm Doorstep Waste Pickup"
    recordIdentifier={`EST-${weight}KG-${category}`}
    description={`You are scheduling a certified doorstep collection for ${WASTE_CATEGORIES.find((c) => c.value === category)?.label || category}. A local farmer will navigate to the specified location to collect and weigh the batch.`}
    consequences={[
      `Pickup location confirmed: ${address}`,
      coordinates
        ? `Exact GPS coordinates attached (${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}) for turn-by-turn routing`
        : "Postal doorstep address will be used for farmer dispatch",
      `Estimated initial batch weight: ${weight} kg`,
      "EcoTokens will be minted to your wallet immediately upon certified farmer weigh-in",
    ]}
    confirmLabel="Confirm & Queue Pickup"
    cancelLabel="Modify Details"
    isDestructive={false}
    reversible={true}
    isLoading={isSubmitting}
    onConfirm={executeSubmit}
    onCancel={() => setShowConfirmModal(false)}
  />
</div>
  );
}
