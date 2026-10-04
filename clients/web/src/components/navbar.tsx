"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { CartDrawer } from "./cart-drawer";
import { UpdateCheckerModal } from "./update-checker-modal";
import { formatRole, CURRENT_PLATFORM_VERSION } from "@agroloop/api-client";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const pathname = usePathname();
  const router = useRouter();

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    await logout("/");
    try {
      router.push("/");
    } catch {
      // In case router navigation fails or fallback needed
    }
  };

  const backendOrigin = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  const adminDashboardUrl = `${backendOrigin.replace(/\/+$/, "")}/admin/dashboard`;

  // Close user dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile menu on route navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const navLinkClass = (href: string) =>
    `relative px-3 py-1.5 rounded-xl text-xs font-semibold tracking-tight transition-all duration-200 flex items-center gap-1.5 ${
      isActive(href)
        ? "bg-emerald-50 text-emerald-900 shadow-xs border border-emerald-200/80 font-bold"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
    }`;

  const userInitials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    "U";

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 transition-colors shadow-[0_2px_12px_-4px_rgba(15,23,42,0.03)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Brand Logo & Version Pill */}
            <div className="flex items-center gap-3 lg:gap-5">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 p-0.5 shadow-md shadow-emerald-600/20 group-hover:shadow-emerald-600/35 transition-all duration-300">
                  <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center overflow-hidden">
                    <Image
                      src="/logo.png"
                      alt="AgroLoop Logo"
                      width={28}
                      height={28}
                      priority
                      className="w-7 h-7 object-contain group-hover:scale-108 transition-transform duration-300"
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-lg text-slate-900 tracking-tight leading-none">
                      Eco<span className="text-emerald-600">Nexus</span>
                    </span>
                    <span className="hidden xl:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 leading-none">
                      v{CURRENT_PLATFORM_VERSION}
                    </span>
                  </div>
                  <span className="hidden sm:inline-block text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-0.5">
                    Circular Economy
                  </span>
                </div>
              </Link>

              {/* Version Check Chip */}
              <button
                type="button"
                onClick={() => setIsUpdateModalOpen(true)}
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border border-slate-200/80 bg-slate-50/80 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-800 transition-all duration-200 group shadow-2xs"
                title="Check for software updates on GitHub"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>v{CURRENT_PLATFORM_VERSION}</span>
                <svg
                  className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Desktop Center Navigation */}
            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              <Link href="/marketplace" className={navLinkClass("/marketplace")}>
                <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>Marketplace</span>
              </Link>

              <Link href="/orders" className={navLinkClass("/orders")}>
                <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>My Orders</span>
              </Link>

              {/* Household Links */}
              {user?.role === "ROLE_HOUSEHOLD" && (
                <>
                  <div className="h-4 w-px bg-slate-200 mx-1" />
                  <Link href="/household" className={navLinkClass("/household")}>
                    <span>Hub</span>
                  </Link>
                  <Link href="/household/submit" className={navLinkClass("/household/submit")}>
                    <span>Submit Waste</span>
                  </Link>
                  <Link href="/household/pickups" className={navLinkClass("/household/pickups")}>
                    <span>Pickups</span>
                  </Link>
                  <Link href="/household/ledger" className={navLinkClass("/household/ledger")}>
                    <span>Ledger</span>
                  </Link>
                </>
              )}

              {/* Farmer Links */}
              {user?.role === "ROLE_FARMER" && (
                <>
                  <div className="h-4 w-px bg-slate-200 mx-1" />
                  <Link href="/farmer" className={navLinkClass("/farmer")}>
                    <span>Hub</span>
                  </Link>
                  <Link href="/farmer/pickups" className={navLinkClass("/farmer/pickups")}>
                    <span>Pickups</span>
                  </Link>
                  <Link href="/farmer/products" className={navLinkClass("/farmer/products")}>
                    <span>Products</span>
                  </Link>
                  <Link href="/farmer/orders" className={navLinkClass("/farmer/orders")}>
                    <span>Sales</span>
                  </Link>
                </>
              )}

              {/* Admin Portal Link */}
              {user?.role === "ROLE_ADMIN" && (
                <>
                  <div className="h-4 w-px bg-slate-200 mx-1" />
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-500/10 border border-emerald-400/40 rounded-xl hover:bg-emerald-500/20 hover:border-emerald-500/60 transition shadow-2xs"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Admin Portal</span>
                  </Link>
                </>
              )}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Cart Drawer Trigger Button */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60 border border-transparent hover:border-emerald-200/60 transition-all duration-200 group"
                aria-label="Open Shopping Cart"
              >
                <svg
                  className="w-5 h-5 group-hover:scale-105 transition-transform"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-emerald-600 text-white font-extrabold text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-xs animate-in zoom-in">
                    {itemCount}
                  </span>
                )}
              </button>

              {/* Authentication & User Dropdown */}
              {isAuthenticated && user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2.5 p-1 sm:pl-2.5 sm:pr-2 py-1 rounded-full border border-slate-200/80 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300 transition-all duration-200 shadow-2xs group"
                  >
                    <div className="hidden sm:flex flex-col text-right leading-none">
                      <span className="text-xs font-bold text-slate-800 tracking-tight group-hover:text-emerald-800 transition">
                        {user.name || user.email?.split("@")[0] || "User"}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {formatRole(user.role)}
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xs flex items-center justify-center shadow-xs ring-2 ring-white">
                      {userInitials}
                    </div>

                    <svg
                      className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${
                        isUserMenuOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Desktop User Menu Dropdown */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-xl shadow-slate-900/5 p-2 animate-in fade-in zoom-in-95 duration-150 z-50">
                      <div className="px-3 py-2.5 bg-slate-50/80 rounded-xl mb-1.5 border border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">{user.name || "AgroLoop Member"}</p>
                        <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                        <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          <span>{formatRole(user.role)}</span>
                        </div>
                      </div>

                      <div className="space-y-0.5 text-xs font-medium text-slate-700">
                        <Link
                          href="/marketplace"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100/80 transition"
                        >
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                          <span>Circular Marketplace</span>
                        </Link>
                        <Link
                          href="/orders"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100/80 transition"
                        >
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <span>My Orders & Disputes</span>
                        </Link>

                        {user.role === "ROLE_HOUSEHOLD" && (
                          <>
                            <Link
                              href="/household/ledger"
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-100/80 transition"
                            >
                              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>EcoToken Ledger</span>
                            </Link>
                            <Link
                              href="/household/apply-farmer"
                              onClick={() => setIsUserMenuOpen(false)}
                              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-emerald-50/80 text-emerald-800 font-semibold transition"
                            >
                              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                              </svg>
                              <span>Become a Farmer Partner</span>
                            </Link>
                          </>
                        )}

                        {user.role === "ROLE_ADMIN" && (
                          <Link
                            href="/admin"
                            onClick={() => setIsUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-emerald-800 font-semibold bg-emerald-50 hover:bg-emerald-100/70 transition"
                          >
                            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            <span>Admin Portal Console</span>
                          </Link>
                        )}
                      </div>

                      <div className="pt-2 mt-1.5 border-t border-slate-100">
                        <button
                          onClick={handleLogout}
                          data-testid="navbar-logout-btn"
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50/80 transition"
                        >
                          <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/auth/login"
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-700 hover:bg-slate-100/60 rounded-xl transition"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/register"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-sm shadow-emerald-700/20 hover:shadow-md hover:shadow-emerald-700/30 transition-all duration-200"
                  >
                    Register
                  </Link>
                </div>
              )}

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                aria-label="Toggle Navigation Menu"
              >
                {isMobileMenuOpen ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Redesigned Mobile Drawer Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-200/80 animate-in slide-in-from-top-2 duration-200 space-y-3">
              {isAuthenticated && user && (
                <div className="px-3 py-2.5 bg-slate-50/80 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">
                      {userInitials}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">{user.name || user.email}</p>
                      <p className="text-[10px] text-slate-500 leading-tight">{user.email}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {formatRole(user.role)}
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <Link
                  href="/marketplace"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${
                    isActive("/marketplace") ? "bg-emerald-50 text-emerald-900 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span>Circular Marketplace</span>
                </Link>

                <Link
                  href="/orders"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${
                    isActive("/orders") ? "bg-emerald-50 text-emerald-900 font-bold" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>My Orders</span>
                </Link>

                {/* Mobile Household Links */}
                {user?.role === "ROLE_HOUSEHOLD" && (
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Household Management
                    </span>
                    <Link
                      href="/household"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Household Hub
                    </Link>
                    <Link
                      href="/household/submit"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Submit Waste
                    </Link>
                    <Link
                      href="/household/pickups"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Pickups & Validation
                    </Link>
                    <Link
                      href="/household/ledger"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      EcoToken Ledger
                    </Link>
                    <Link
                      href="/household/apply-farmer"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/70"
                    >
                      <span>🌱 Apply to Become a Farmer</span>
                    </Link>
                  </div>
                )}

                {/* Mobile Farmer Links */}
                {user?.role === "ROLE_FARMER" && (
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Farmer Operations
                    </span>
                    <Link
                      href="/farmer"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Farmer Hub
                    </Link>
                    <Link
                      href="/farmer/pickups"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Pickup Queue
                    </Link>
                    <Link
                      href="/farmer/products"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Product Management
                    </Link>
                    <Link
                      href="/farmer/orders"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block px-3 py-2 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Sales Orders
                    </Link>
                  </div>
                )}

                {/* Mobile Admin Link */}
                {user?.role === "ROLE_ADMIN" && (
                  <div className="pt-2 border-t border-slate-100">
                    <Link
                      href="/admin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold text-emerald-800 bg-emerald-50"
                    >
                      <span>Admin Portal Console</span>
                      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </Link>
                  </div>
                )}
              </div>

              {/* Mobile Footer & Version Check */}
              <div className="pt-3 border-t border-slate-200/80 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsUpdateModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Check for Updates</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    v{CURRENT_PLATFORM_VERSION}
                  </span>
                </button>

                {isAuthenticated && (
                  <button
                    onClick={handleLogout}
                    data-testid="mobile-navbar-logout-btn"
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </button>
                )}
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

