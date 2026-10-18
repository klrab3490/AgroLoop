"use client";

import React, { useState, useEffect } from "react";
import { checkLatestRelease, CURRENT_PLATFORM_VERSION, type VersionCheckResult } from "@agroloop/api-client";

interface UpdateCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpdateCheckerModal({ isOpen, onClose }: UpdateCheckerModalProps) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<VersionCheckResult | null>(null);
  const [customToken, setCustomToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);

  const runCheck = async (token?: string) => {
    setChecking(true);
    try {
      const res = await checkLatestRelease(CURRENT_PLATFORM_VERSION, {
        token: token || customToken || undefined,
      });
      setResult(res);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen && !result) {
      runCheck();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🚀</span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Check for Updates</h3>
              <p className="text-xs text-slate-500">Live verification against GitHub Releases</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            ✕
          </button>
        </div>

        {/* Current Version Card */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
          <div>
            <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">Current Web Build</span>
            <span className="text-base font-black text-emerald-600">v{CURRENT_PLATFORM_VERSION}</span>
          </div>
          <div className="text-right">
            <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider block">Repository</span>
            <span className="text-xs font-semibold text-slate-700">klrab3490/AgroLoop</span>
          </div>
        </div>

        {/* State Display */}
        {checking ? (
          <div className="py-8 text-center space-y-2">
            <div className="inline-block animate-spin text-2xl">⏳</div>
            <p className="text-xs font-semibold text-slate-600">Connecting to GitHub Releases API...</p>
          </div>
        ) : result ? (
          <div className="space-y-3">
            {result.status === "update-available" && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎉</span>
                  <span className="text-sm font-extrabold text-emerald-800">
                    New Version v{result.latestVersion} Available!
                  </span>
                </div>
                {result.releaseName && (
                  <p className="text-xs font-bold text-slate-800">{result.releaseName}</p>
                )}
                {result.releaseNotes && (
                  <p className="text-2xs text-slate-600 bg-white/80 p-2.5 rounded-xl border border-emerald-100 max-h-24 overflow-y-auto whitespace-pre-wrap">
                    {result.releaseNotes}
                  </p>
                )}
                {result.htmlUrl && (
                  <a
                    href={result.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1 px-3.5 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm"
                  >
                    View Release on GitHub ↗
                  </a>
                )}
              </div>
            )}

            {result.status === "up-to-date" && (
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-xl">✅</span>
                <div>
                  <p className="text-xs font-bold text-emerald-900">You are up to date!</p>
                  <p className="text-2xs text-emerald-700">v{CURRENT_PLATFORM_VERSION} is the latest released build.</p>
                </div>
              </div>
            )}

            {result.status === "no-releases" && (
              <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">ℹ️</span>
                  <span className="text-xs font-bold text-sky-900">Latest Build Active</span>
                </div>
                <p className="text-2xs text-sky-800 leading-relaxed">{result.message}</p>
                {result.htmlUrl && (
                  <a
                    href={result.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-2xs font-bold text-sky-700 underline mt-1"
                  >
                    Visit GitHub Releases ↗
                  </a>
                )}
              </div>
            )}

            {result.status === "error" && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">⚠️</span>
                  <span className="text-xs font-bold text-rose-900">Could Not Verify</span>
                </div>
                <p className="text-2xs text-rose-700">{result.message}</p>
              </div>
            )}
          </div>
        ) : null}

        {/* Optional Private Repo Token */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="text-3xs font-bold text-slate-400 hover:text-slate-600 underline"
          >
            {showTokenInput ? "Hide GitHub Token" : "⚙️ Private Repo / Personal Access Token"}
          </button>
          {showTokenInput && (
            <div className="flex gap-2 mt-2">
              <input
                type="password"
                placeholder="ghp_... (GitHub Token)"
                value={customToken}
                onChange={(e) => setCustomToken(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => runCheck(customToken)}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <a
            href="https://github.com/klrab3490/AgroLoop/releases"
            target="_blank"
            rel="noopener noreferrer"
            className="text-2xs font-semibold text-slate-500 hover:text-emerald-600 transition"
          >
            GitHub Releases ↗
          </a>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Close
            </button>
            <button
              type="button"
              disabled={checking}
              onClick={() => runCheck()}
              className="px-4 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition shadow-sm"
            >
              {checking ? "Checking..." : "🔄 Check Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
