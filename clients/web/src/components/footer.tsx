import React from "react";
import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
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
              Bridging households and farmers through a circular waste-to-reward ecosystem powered by EcoTokens.
            </p>
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
            </ul>
          </div>

          {/* Architecture & Security */}
          <div>
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-3">System Architecture</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-emerald-400 font-semibold">BFF Security Boundary</span>
              </li>
              <li>
                <span className="text-slate-400">HttpOnly Token Isolation</span>
              </li>
              <li>
                <span className="text-slate-400">Server-Authoritative Ledger</span>
              </li>
              <li>
                <span className="text-slate-400">HMAC-SHA256 Handshakes</span>
              </li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider mb-3">Resources</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a
                  href="https://github.com/AgnaMariya/AgroLoop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 transition"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/AgnaMariya/AgroLoop/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 transition"
                >
                  Releases & Changelog
                </a>
              </li>
              <li>
                <Link href="/marketplace" className="hover:text-emerald-400 transition">
                  OpenAPI 3.1 Contract
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} AgroLoop. Built with Next.js 15, Spring Boot 3, and PostgreSQL.</p>
        </div>
      </div>
    </footer>
  );
}
