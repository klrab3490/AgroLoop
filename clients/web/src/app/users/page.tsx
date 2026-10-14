"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { formatRole } from "@agroloop/api-client";
import { PageContainer, PageHeader, DashboardGrid } from "@/components/ui/layout";

export default function UsersDirectoryPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role === "ROLE_ADMIN") {
      router.replace("/admin?tab=users");
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="h-64 rounded-3xl bg-slate-200/50 animate-pulse" />
      </PageContainer>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <PageContainer>
        <div className="max-w-md mx-auto py-16 text-center space-y-4">
          <p className="text-4xl">👥</p>
          <h2 className="text-2xl font-black text-slate-900">User Account & Directory</h2>
          <p className="text-xs text-slate-500">Sign in to view user profile details and platform roles.</p>
          <Link
            href="/auth/login?redirect=/users"
            className="inline-block px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition"
          >
            Sign In
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="User Profile & Directory"
        description="View your AgroLoop account privileges, linked roles, and circular economy credentials."
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            {formatRole(user.role)}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {user.role === "ROLE_HOUSEHOLD" && (
              <Link
                href="/household"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                Go to Household Hub ➔
              </Link>
            )}
            {user.role === "ROLE_FARMER" && (
              <Link
                href="/farmer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                Go to Farmer Hub ➔
              </Link>
            )}
            {user.role === "ROLE_ADMIN" && (
              <Link
                href="/admin?tab=users"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
              >
                Open Admin Users Console ➔
              </Link>
            )}
          </div>
        }
      />

      <DashboardGrid cols={3}>
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-2xl">👤</span>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Name</h3>
          <p className="text-xl font-bold text-slate-900">{user.name || "AgroLoop Member"}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-2xl">🛡️</span>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Access Privilege</h3>
          <p className="text-xl font-bold text-emerald-700">{formatRole(user.role)}</p>
          <p className="text-xs text-slate-500">
            {user.role === "ROLE_ADMIN"
              ? "Full platform administrator rights"
              : user.role === "ROLE_FARMER"
              ? "Producer & regional collection driver"
              : "Residential waste contributor & consumer"}
          </p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <span className="text-2xl">📍</span>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered Address</h3>
          <p className="text-sm font-semibold text-slate-800 truncate">
            {user.address || "No street address on file"}
          </p>
          <p className="text-xs text-slate-500">Used for pickup coordination & order shipping</p>
        </div>
      </DashboardGrid>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 space-y-4">
        <h3 className="text-base font-bold text-slate-900">Connected Hubs & Shortcuts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/marketplace"
            className="p-4 rounded-xl border border-slate-100 hover:border-emerald-300 bg-slate-50 hover:bg-emerald-50/50 transition flex items-center gap-3"
          >
            <span className="text-2xl">🛒</span>
            <div>
              <p className="text-xs font-bold text-slate-900">Circular Marketplace</p>
              <p className="text-[11px] text-slate-500">Spend tokens on certified produce</p>
            </div>
          </Link>
          <Link
            href="/orders"
            className="p-4 rounded-xl border border-slate-100 hover:border-emerald-300 bg-slate-50 hover:bg-emerald-50/50 transition flex items-center gap-3"
          >
            <span className="text-2xl">📦</span>
            <div>
              <p className="text-xs font-bold text-slate-900">Orders & Fulfillment</p>
              <p className="text-[11px] text-slate-500">Track shipments & order history</p>
            </div>
          </Link>
          {user.role === "ROLE_HOUSEHOLD" && (
            <Link
              href="/household/apply-farmer"
              className="p-4 rounded-xl border border-slate-100 hover:border-amber-300 bg-slate-50 hover:bg-amber-50/50 transition flex items-center gap-3"
            >
              <span className="text-2xl">🌾</span>
              <div>
                <p className="text-xs font-bold text-slate-900">Producer Application</p>
                <p className="text-[11px] text-slate-500">Upgrade to verified organic farmer</p>
              </div>
            </Link>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
