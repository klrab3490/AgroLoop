"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export function Footer() {
  const openCookiePreferences = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("agroloop:open-cookie-preferences"));
    }
  };

  return (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand & Corporate Business Details */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="AgroLoop Logo"
                width={24}
                height={24}
                className="w-6 h-6 rounded-md object-contain"
              />
              <span className="text-white font-extrabold text-lg tracking-tight">AgroLoop</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bridging households and organic farmers through a circular waste-to-reward ecosystem powered by EcoTokens.
            </p>
            <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-800/80">
              <p className="font-semibold text-slate-300">AgroLoop Circular Technologies Inc.</p>
              <p>100 Sustainability Blvd, Eco City, EC 94103</p>
              <p>
                Inquiries:{" "}
                <a href="mailto:support@agroloop.example" className="text-emerald-400 hover:underline">
                  support@agroloop.example
                </a>
              </p>
            </div>
          </div>

          {/* Stakeholders */}
          <div>
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-3">Stakeholders</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/household" className="hover:text-emerald-400 transition">
                  Household Composters
                </Link>
              </li>
              <li>
                <Link href="/farmer" className="hover:text-emerald-400 transition">
                  Organic Farmers
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="hover:text-emerald-400 transition">
                  Sustainable Commerce
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-emerald-400 transition">
                  Order Tracking & Disputes
                </Link>
              </li>
            </ul>
          </div>

          {/* Architecture & Security */}
          <div>
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-3">System & Security</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-emerald-400 font-semibold">BFF Security Boundary</span>
              </li>
              <li>
                <span className="text-slate-400">HttpOnly Token Isolation</span>
              </li>
              <li>
                <span className="text-slate-400">Zero Third-Party Ad Trackers</span>
              </li>
              <li>
                <span className="text-slate-400">Data Minimization Active</span>
              </li>
            </ul>
          </div>

          {/* Legal, Privacy & Compliance */}
          <div>
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-3">Legal & Compliance</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/privacy" className="hover:text-emerald-400 transition">
                  Privacy Policy (GDPR/CCPA)
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-emerald-400 transition">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-emerald-400 transition">
                  Refund & Dispute Policy
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="hover:text-emerald-400 transition">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={openCookiePreferences}
                  className="text-slate-400 hover:text-emerald-400 transition text-left cursor-pointer"
                >
                  Cookie Preferences
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal Disclaimer Strip */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} AgroLoop Circular Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>18+ Age Restricted</span>
            <span>•</span>
            <span>Zero Hidden Fees</span>
            <span>•</span>
            <span>WCAG 2.1 AA Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
export default Footer;
