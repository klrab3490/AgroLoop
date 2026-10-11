import React from "react";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service | AgroLoop",
  description: "Terms and conditions governing AgroLoop accounts, EcoToken redemption, and circular agricultural commerce.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8 sm:p-12 space-y-8">
        <div>
          <span className="text-2xs font-bold uppercase tracking-widest text-emerald-600">Legal Agreement</span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1">
            Terms of Service
          </h1>
          <p className="text-xs text-slate-500 mt-2">
            Last Updated: October 11, 2026 • Effective Date: October 11, 2026
          </p>
        </div>

        <div className="prose prose-slate prose-sm max-w-none space-y-6 text-slate-700 leading-relaxed text-xs sm:text-sm">
          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the AgroLoop platform (including the web client, native clients, and backend APIs),
              you agree to be bound by these Terms of Service. If you do not agree to these terms, do not access or use the platform.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">2. Participant Eligibility & Verification</h2>
            <p>
              To register as a Household composter or Organic Farmer, you must be at least 18 years of age.
              You agree to provide accurate, non-misleading information regarding your pickup location and agricultural operations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">3. EcoToken Reward Mechanism & Nature</h2>
            <p>
              EcoTokens are digital community utility credits issued upon physical verification of organic waste collections.
              <strong> EcoTokens are not fiat currency, legal tender, or investment securities.</strong>
              EcoTokens are redeemable solely within the AgroLoop regional marketplace for verified agricultural supplies,
              compost, biochar, and farm inputs. EcoTokens carry no guaranteed cash exchange value outside the platform.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">4. Waste Quality Standards & Weigh-In</h2>
            <p>
              All submitted waste must comply with certified municipal and organic standards (zero hazardous, medical, or non-biodegradable synthetic contaminants).
              Organic Farmers conduct certified doorstep weigh-ins and assign quality grades (Grade A, B, or C). Attempting to falsify weights,
              inject contaminated waste, or counterfeit QR handshakes will result in immediate account termination and token forfeiture.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">5. Marketplace Orders, Fulfillment & Zero Hidden Fees</h2>
            <p>
              AgroLoop operates with transparent pricing: <strong>zero hidden service fees, zero surprise checkout additions, and zero dark patterns.</strong>
              All prices displayed in the catalog are final. Farmers are responsible for prompt delivery and packaging of fulfilled farm inputs.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">6. Prohibition of Fake Reviews & Fraudulent Claims</h2>
            <p>
              All reviews and farmer ratings must originate from verified participants who completed a documented exchange or transaction.
              Fake reviews, incentivized testimonials, and unsubstantiated claims regarding agricultural yields are strictly prohibited and audited.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-slate-900">7. Dispute Resolution & Limitation of Liability</h2>
            <p>
              Disputes regarding non-delivered orders or damaged agricultural inputs may be filed through our built-in Order Dispute adjudicator within 7 days of scheduled delivery.
            </p>
          </section>
        </div>

        <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
          <Link href="/" className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition">
            ← Return to AgroLoop
          </Link>
          <div className="flex gap-4 text-xs font-medium text-slate-500">
            <Link href="/privacy" className="hover:text-slate-800 transition">Privacy Policy</Link>
            <Link href="/cookies" className="hover:text-slate-800 transition">Cookie Policy</Link>
            <Link href="/refund" className="hover:text-slate-800 transition">Refund Policy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
