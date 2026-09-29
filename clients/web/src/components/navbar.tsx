"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { CartDrawer } from "./cart-drawer";
import { UpdateCheckerModal } from "./update-checker-modal";
import { formatRole, CURRENT_PLATFORM_VERSION } from "@agroloop/api-client";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const backendOrigin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  const adminDashboardUrl = `${backendOrigin.replace(/\/+$/, "")}/admin/dashboard`;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center gap-2 group">
                <Image
                  src="/logo.png"
                  alt="AgroLoop Logo"
                  width={36}
                  height={36}
                  priority
                  className="w-9 h-9 rounded-xl object-contain shadow-sm shadow-emerald-200 group-hover:scale-105 transition-transform"
                />
                <div>
                  <span className="font-extrabold text-lg text-slate-900 tracking-tight">AgroLoop</span>
                  <span className="hidden sm:inline-block ml-2 text-3xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Circular Hub
                  </span>
                </div>
              </Link>

              {/* Version Check Chip */}
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(true)}
                className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 text-3xs font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-500 hover:text-emerald-700 transition"
                title="Check for AgroLoop updates on GitHub"
              >
                <span>v{CURRENT_PLATFORM_VERSION}</span>
                <span className="text-emerald-600">🚀</span>
              </button>

              {/* Primary Navigation */}
              <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
                <Link href="/marketplace" className="hover:text-emerald-700 transition">
                  Marketplace
                </Link>
                <Link href="/orders" className="hover:text-emerald-700 transition">
                  My Orders
                </Link>

                {/* Role Specific Links */}
                {user?.role === "ROLE_HOUSEHOLD" && (
                  <>
                    <Link href="/household" className="hover:text-emerald-700 transition">
                      Household Hub
                    </Link>
                    <Link href="/household/submit" className="hover:text-emerald-700 transition">
                      Submit Waste
                    </Link>
                    <Link href="/household/pickups" className="hover:text-emerald-700 transition">
                      Pickups
                    </Link>
                    <Link href="/household/ledger" className="hover:text-emerald-700 transition">
                      Ledger
                    </Link>
                  </>
                )}

                {user?.role === "ROLE_FARMER" && (
                  <>
                    <Link href="/farmer" className="hover:text-emerald-700 transition">
                      Farmer Hub
                    </Link>
                    <Link href="/farmer/pickups" className="hover:text-emerald-700 transition">
                      Pickup Queue
                    </Link>
                    <Link href="/farmer/products" className="hover:text-emerald-700 transition">
                      Products
                    </Link>
                    <Link href="/farmer/orders" className="hover:text-emerald-700 transition">
                      Sales
                    </Link>
                  </>
                )}

                {user?.role === "ROLE_ADMIN" && (
                  <a
                    href={adminDashboardUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition shadow-sm"
                  >
                    <span>🛡️</span>
                    <span>Admin Portal</span>
                  </a>
                )}
              </nav>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Cart Trigger */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-slate-600 hover:text-emerald-700 transition rounded-lg hover:bg-slate-100"
                aria-label="Open Shopping Cart"
              >
                <span className="text-xl">🛒</span>
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-600 text-white font-bold text-2xs w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                    {itemCount}
                  </span>
                )}
              </button>

              {/* User Profile / Auth State */}
              {isAuthenticated && user ? (
                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline-block px-2.5 py-1 text-2xs font-semibold rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                    {formatRole(user.role)}
                  </span>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-slate-900 leading-tight">{user.name ?? user.email}</p>
                    <p className="text-2xs text-slate-500 leading-tight">{user.email}</p>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/auth/login"
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 transition"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition shadow-sm"
                  >
                    Register
                  </Link>
                </div>
              )}

              {/* Mobile menu trigger */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-slate-600 rounded-lg hover:bg-slate-100"
              >
                ☰
              </button>
            </div>
          </div>

          {/* Mobile dropdown menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-200 space-y-2">
              {isAuthenticated && user && (
                <div className="px-3 py-2 border-b border-slate-100 mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900 leading-tight">{user.name ?? user.email}</p>
                    <p className="text-2xs text-slate-500 leading-tight">{user.email}</p>
                  </div>
                  <span className="px-2.5 py-1 text-2xs font-semibold rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                    {formatRole(user.role)}
                  </span>
                </div>
              )}
              <Link
                href="/marketplace"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Marketplace
              </Link>
              <Link
                href="/orders"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                My Orders
              </Link>
              {user?.role === "ROLE_HOUSEHOLD" && (
                <>
                  <Link
                    href="/household"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Household Hub
                  </Link>
                  <Link
                    href="/household/submit"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Submit Waste
                  </Link>
                  <Link
                    href="/household/pickups"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Pickups & Pass
                  </Link>
                  <Link
                    href="/household/ledger"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    EcoToken Ledger
                  </Link>
                </>
              )}
              {user?.role === "ROLE_FARMER" && (
                <>
                  <Link
                    href="/farmer"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Farmer Hub
                  </Link>
                  <Link
                    href="/farmer/pickups"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Pickup Queue
                  </Link>
                  <Link
                    href="/farmer/products"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Product Management
                  </Link>
                  <Link
                    href="/farmer/orders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Sales Orders
                  </Link>
                </>
              )}
              {user?.role === "ROLE_ADMIN" && (
                <a
                  href={adminDashboardUrl}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                >
                  🛡️ Admin Portal
                </a>
              )}
              <div className="pt-2 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsUpdateModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 hover:text-emerald-700 flex items-center justify-between"
                >
                  <span>Check for Updates</span>
                  <span className="text-3xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold">
                    v{CURRENT_PLATFORM_VERSION} 🚀
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Slide-over cart */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* GitHub Releases update checker modal */}
      <UpdateCheckerModal isOpen={isUpdateModalOpen} onClose={() => setIsUpdateModalOpen(false)} />
    </>
  );
}
