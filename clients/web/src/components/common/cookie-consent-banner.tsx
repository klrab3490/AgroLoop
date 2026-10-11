"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const COOKIE_CONSENT_KEY = "agroloop_cookie_consent";

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  timestamp: string;
}

export function CookieConsentBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsOptIn, setAnalyticsOptIn] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!stored) {
        setIsOpen(true);
      }
    } catch {
      // Storage access disabled
    }

    const handleReopen = () => {
      setIsOpen(true);
      setShowPreferences(true);
    };

    window.addEventListener("agroloop:open-cookie-preferences", handleReopen);
    return () => {
      window.removeEventListener("agroloop:open-cookie-preferences", handleReopen);
    };
  }, []);

  const savePreferences = (necessaryOnly: boolean, analytics: boolean) => {
    const prefs: CookiePreferences = {
      necessary: true,
      analytics: necessaryOnly ? false : analytics,
      timestamp: new Date().toISOString(),
    };
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
    } catch {
      // ignore
    }
    setIsOpen(false);
    setShowPreferences(false);
  };

  if (!isOpen) return null;

  return (
    <div
      role="region"
      aria-label="Cookie consent banner"
      className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-6 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="max-w-4xl mx-auto bg-slate-900/95 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-700/80 backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xl">🍪</span>
              <h3 className="font-black text-sm sm:text-base text-white tracking-tight">
                Your Privacy & Cookie Choices
              </h3>
            </div>
            <p className="text-xs text-slate-300/90 leading-relaxed">
              We use strictly necessary cookies to keep you signed in securely and store items in your cart. We do
              not sell your data, use cross-site advertising trackers, or share browsing activity with data brokers.
              Read our{" "}
              <Link href="/cookies" className="text-emerald-400 hover:underline font-bold">
                Cookie Policy
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-emerald-400 hover:underline font-bold">
                Privacy Policy
              </Link>.
            </p>

            {showPreferences && (
              <div className="mt-4 p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">Strictly Necessary Cookies</p>
                    <p className="text-[11px] text-slate-400">Required for authentication sessions and security.</p>
                  </div>
                  <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    Always Active
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
                  <div>
                    <p className="font-bold text-white">Anonymous Performance & Metrics</p>
                    <p className="text-[11px] text-slate-400">Helps us measure system latency and errors without tracking identity.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={analyticsOptIn}
                    onChange={(e) => setAnalyticsOptIn(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-600 bg-slate-700"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-col items-stretch sm:items-end gap-2 shrink-0">
            {showPreferences ? (
              <Button
                size="sm"
                variant="primary"
                onClick={() => savePreferences(false, analyticsOptIn)}
              >
                Save Preferences
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => savePreferences(false, true)}
                >
                  Accept All
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-white border-slate-600 hover:bg-slate-800"
                  onClick={() => savePreferences(true, false)}
                >
                  Strictly Necessary Only
                </Button>
                <button
                  type="button"
                  onClick={() => setShowPreferences(true)}
                  className="text-xs text-slate-400 hover:text-white underline py-1 transition text-center"
                >
                  Customize Choices
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
