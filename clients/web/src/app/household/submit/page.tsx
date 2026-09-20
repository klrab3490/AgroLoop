"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { webApiClient } from "@/lib/api";

const WASTE_CATEGORIES = [
  { value: "FOOD_SCRAPS", label: "Kitchen Scraps", icon: "🥦", desc: "Fruit & vegetable peels, coffee grounds, leftovers" },
  { value: "YARD_WASTE", label: "Yard Trimmings", icon: "🍂", desc: "Leaves, grass cuttings, plant prunings" },
  { value: "AGRICULTURAL_RESIDUE", label: "Crop Residue", icon: "🌾", desc: "Stalks, chaff, husk residues" },
  { value: "LIVESTOCK_MANURE", label: "Animal Manure", icon: "🐄", desc: "Herbivore manure suited for composting" },
];

export default function SubmitWastePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();

  const [category, setCategory] = useState("FOOD_SCRAPS");
  const [weight, setWeight] = useState("5.0");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      setErrorMsg("Please provide a valid estimated weight greater than 0 kg.");
      setIsSubmitting(false);
      return;
    }

    try {
      await webApiClient.household.submitWaste({
        category: category as "FOOD_SCRAPS" | "GARDEN_WASTE" | "AGRICULTURAL_ORGANIC" | "COFFEE_GROUNDS",
        estimatedWeight: parsedWeight,
        mediaId: "med_web_direct_upload",
        addressOverride: address || undefined,
      });

      router.push("/household/pickups");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to log waste submission");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div>
        <Link href="/household" className="text-xs font-bold text-slate-500 hover:text-emerald-700 inline-flex items-center gap-1 mb-2">
          ← Back to Hub
        </Link>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Submit Organic Waste</h1>
        <p className="text-xs text-slate-500 mt-1">
          Log your organic waste to queue a doorstep collection. Earn EcoTokens upon certified weigh-in.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
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
            step="0.5"
            min="0.5"
            required
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 5.0"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <p className="text-3xs text-slate-400">Final token reward is minted based on certified farmer weigh-in.</p>
        </div>

        {/* Pickup Address */}
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-700">Doorstep Pickup Address</label>
          <input
            type="text"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Green Way, Eco City"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
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
          className="w-full py-3.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 disabled:bg-slate-300 transition shadow-lg shadow-emerald-200"
        >
          {isSubmitting ? "Queueing Submission..." : "Confirm & Request Collection"}
        </button>
      </form>
    </div>
  );
}
