import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | AgroLoop",
  description: "AgroLoop Privacy Policy, GDPR & CCPA Compliance, and Data Minimization Principles.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 sm:p-12 space-y-8">
        <div>
          <span className="text-2xs font-bold uppercase tracking-widest text-emerald-600">Legal & Transparency</span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
            Privacy Policy
          </h1>
          <p className="text-xs text-slate-500 mt-2">
            Last Updated: October 11, 2026 • Effective Date: October 11, 2026
          </p>
        </div>

        <div className="prose prose-slate prose-sm max-w-none space-y-6 text-slate-700 leading-relaxed text-xs sm:text-sm">
          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">1. Data Minimization Commitment</h2>
            <p>
              AgroLoop adheres strictly to the principle of <strong>Data Minimization</strong> (GDPR Article 5(1)(c)).
              We only collect information strictly necessary to fulfill regional organic waste collection, authenticate participants,
              and settle marketplace transactions. We do not sell, rent, or monetize your personal data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account Credentials:</strong> Full name, verified email address, and cryptographically hashed passwords (BCrypt).</li>
              <li><strong>Pickup & Delivery Address:</strong> Street address collected exclusively to coordinate doorstep organic waste collection and deliver physical farm inputs.</li>
              <li><strong>Logistics Data:</strong> Optional geocoordinates provided during route completion to verify physical pickup handshakes.</li>
              <li><strong>Transaction Records:</strong> Immutable EcoToken balance logs and marketplace order histories.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">3. Age Restriction & Child Safety (COPPA & GDPR)</h2>
            <p>
              AgroLoop services are strictly intended for individuals aged <strong>18 and older</strong>. We do not knowingly collect,
              solicit, or store personal data from children under the age of 13 (or under 16 in the European Economic Area).
              If we discover that a minor has registered without verifiable parental consent, their account and associated data will be deleted immediately.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">4. Third-Party Services & Trackers</h2>
            <p>
              We conduct strict vendor audits. We do not embed third-party advertising SDKs, behavioral cross-site trackers,
              or data broker pixels. Essential infrastructure partners (such as database hosting and container runtimes) process data
              under strict Data Processing Agreements (DPAs).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">5. Your Legal Rights (GDPR & CCPA)</h2>
            <p>You maintain full control over your personal data:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Right to Access & Portability:</strong> Request an export of your account and ledger transactions.</li>
              <li><strong>Right to Rectification:</strong> Update or correct your profile details at any time.</li>
              <li><strong>Right to Erasure (Right to be Forgotten):</strong> Submit a data deletion request to erase your account, contact details, and pickup history permanently.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">6. Data Protection Officer & Inquiries</h2>
            <p>
              For privacy audits, compliance questions, or data deletion requests, contact our Data Protection Office:
            </p>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <p><strong>Entity:</strong> AgroLoop Circular Technologies Inc.</p>
              <p><strong>DPO Email:</strong> <a href="mailto:privacy@agroloop.example" className="text-emerald-700 underline font-bold">privacy@agroloop.example</a></p>
              <p><strong>Address:</strong> 100 Sustainability Blvd, Suite 400, Eco City, EC 94103</p>
            </div>
          </section>
        </div>

        <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
          <Link href="/" className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition">
            ← Return to AgroLoop
          </Link>
          <div className="flex gap-4 text-xs font-medium text-slate-500">
            <Link href="/terms" className="hover:text-slate-800 transition">Terms of Service</Link>
            <Link href="/cookies" className="hover:text-slate-800 transition">Cookie Policy</Link>
            <Link href="/refund" className="hover:text-slate-800 transition">Refund Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
