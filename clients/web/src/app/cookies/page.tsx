import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Cookie Policy | AgroLoop",
  description: "AgroLoop Cookie Usage, ePrivacy Directive Compliance, and User Preference Management.",
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 sm:p-12 space-y-8">
        <div>
          <span className="text-2xs font-bold uppercase tracking-widest text-emerald-600">Cookie Hygiene</span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
            Cookie Policy
          </h1>
          <p className="text-xs text-slate-500 mt-2">
            Last Updated: October 11, 2026 • ePrivacy & GDPR Compliant
          </p>
        </div>

        <div className="prose prose-slate prose-sm max-w-none space-y-6 text-slate-700 leading-relaxed text-xs sm:text-sm">
          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files stored on your device by your web browser. AgroLoop maintains a strict, privacy-first
              cookie policy: we use only cookies strictly necessary for platform security and authentication, plus optional
              anonymous telemetry only when you explicitly consent.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">2. Cookies We Use</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border border-slate-200 rounded-xl overflow-hidden text-xs">
                <thead className="bg-slate-100 text-slate-800 font-bold">
                  <tr>
                    <th className="p-3">Cookie Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Purpose</th>
                    <th className="p-3">Lifespan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 font-mono">agroloop_refresh_token</td>
                    <td className="p-3 font-semibold text-emerald-700">Strictly Necessary</td>
                    <td className="p-3">Encrypted, HttpOnly, SameSite cookie used to securely refresh authentication sessions without exposing tokens to JavaScript.</td>
                    <td className="p-3">30 Days</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono">agroloop_cookie_consent</td>
                    <td className="p-3 font-semibold text-emerald-700">Strictly Necessary</td>
                    <td className="p-3">Records your preferences for the cookie consent banner so we do not repeatedly prompt you.</td>
                    <td className="p-3">1 Year</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono">agroloop_cart_items</td>
                    <td className="p-3 font-semibold text-blue-700">Functional</td>
                    <td className="p-3">Maintains chosen items in your local shopping cart before checkout.</td>
                    <td className="p-3">Persistent (Local Storage)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">3. Zero Third-Party Advertising Cookies</h2>
            <p>
              AgroLoop contains <strong>zero marketing, retargeting, or advertising cookies</strong>.
              We do not share your browser fingerprint with Meta, Google Ads, TikTok, or third-party data aggregators.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">4. Managing Your Preferences</h2>
            <p>
              You can adjust or revoke your cookie consent preferences at any time using our Cookie Consent banner
              or by clearing cookies in your browser settings.
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
          <Link href="/" className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition">
            ← Return to AgroLoop
          </Link>
          <div className="flex gap-4 text-xs font-medium text-slate-500">
            <Link href="/privacy" className="hover:text-slate-800 transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-800 transition">Terms of Service</Link>
            <Link href="/refund" className="hover:text-slate-800 transition">Refund Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
