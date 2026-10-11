import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Refund & Dispute Policy | AgroLoop",
  description: "AgroLoop Marketplace Refund, Token Restitution, and Dispute Adjudication Guidelines.",
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 sm:p-12 space-y-8">
        <div>
          <span className="text-2xs font-bold uppercase tracking-widest text-emerald-600">Consumer Protection</span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
            Refund & Dispute Policy
          </h1>
          <p className="text-xs text-slate-500 mt-2">
            Last Updated: October 11, 2026 • Fair & Transparent Resolution
          </p>
        </div>

        <div className="prose prose-slate prose-sm max-w-none space-y-6 text-slate-700 leading-relaxed text-xs sm:text-sm">
          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">1. Overview of Token Restitution</h2>
            <p>
              In our closed-loop marketplace, purchases are settled using EcoTokens earned through organic waste diversion.
              Because transactions are denominated in tokens, refunds are processed as direct <strong>Token Restitutions</strong>
              credited back to the purchasing household&apos;s digital ledger.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">2. Eligible Refund Conditions</h2>
            <p>You are entitled to a full restitution of spent EcoTokens under the following conditions:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Non-Delivery:</strong> The fulfilling farmer failed to deliver the ordered inputs within 5 business days of order confirmation.</li>
              <li><strong>Damaged or Substandard Goods:</strong> Products (compost, seeds, farm inputs) arrived damaged, adulterated, or significantly non-conforming with the catalog description.</li>
              <li><strong>Cancellation Before Fulfillment:</strong> Orders cancelled while still in the <code>PLACED</code> status before the farmer has packed or dispatched the items.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">3. Dispute Adjudication Process</h2>
            <p>
              To dispute an order:
            </p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Navigate to <Link href="/orders" className="text-emerald-700 font-bold underline">Your Orders</Link>.</li>
              <li>Select the affected order and click <strong>File Dispute</strong>.</li>
              <li>Provide a clear explanation of the issue (optional media attachment of damaged goods).</li>
              <li>The participating farmer and platform administrators review the dispute within 48 hours. Upon validation, the full token amount is credited back to your account immediately.</li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">4. No Hidden Restocking Fees</h2>
            <p>
              AgroLoop charges <strong>zero cancellation fees</strong> and <strong>zero restocking penalties</strong>.
              All refunded tokens return in full to your verified ledger balance.
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
            <Link href="/cookies" className="hover:text-slate-800 transition">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
