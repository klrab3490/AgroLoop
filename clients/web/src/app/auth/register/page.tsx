"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await register(fullName, email, password, address);
      router.push("/household");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "fieldErrors" in err) {
        const errors = (err as { fieldErrors?: Record<string, string> }).fieldErrors;
        if (errors && Object.keys(errors).length > 0) {
          setFieldErrors(errors);
        }
      }
      setErrorMsg(err instanceof Error ? err.message : "Registration failed. Please check your information.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center p-2.5 rounded-2xl bg-emerald-50 mb-2">
            <Image
              src="/logo.png"
              alt="AgroLoop Logo"
              width={44}
              height={44}
              priority
              className="w-11 h-11 object-contain"
            />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Join the Circular Mission</h2>
          <p className="text-xs text-slate-500">Register as a Household composter to earn EcoTokens</p>
        </div>

        {errorMsg && (
          <div
            data-testid="register-error-banner"
            className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium space-y-1"
          >
            <p className="font-semibold">{errorMsg}</p>
            {Object.keys(fieldErrors).length > 0 && (
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-red-600">
                {Object.entries(fieldErrors).map(([field, msg]) => (
                  <li key={field}>
                    <span className="capitalize font-medium">{field}</span>: {msg}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4" data-testid="register-form">
          <div>
            <label htmlFor="fullName" className="block text-xs font-bold text-slate-700 mb-1">
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              data-testid="register-name"
              type="text"
              required
              minLength={2}
              maxLength={100}
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="Jane Doe"
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                fieldErrors.name ? "border-red-400 bg-red-50/20" : "border-slate-300"
              } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
            />
            {fieldErrors.name && (
              <p data-testid="error-name" className="text-xs text-red-600 mt-1 font-medium">
                {fieldErrors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              data-testid="register-email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: "" }));
              }}
              placeholder="jane@example.com"
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                fieldErrors.email ? "border-red-400 bg-red-50/20" : "border-slate-300"
              } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
            />
            {fieldErrors.email && (
              <p data-testid="error-email" className="text-xs text-red-600 mt-1 font-medium">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold text-slate-700 mb-1">
              Password (min 8 characters)
            </label>
            <input
              id="password"
              name="password"
              data-testid="register-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: "" }));
              }}
              placeholder="••••••••"
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                fieldErrors.password ? "border-red-400 bg-red-50/20" : "border-slate-300"
              } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
            />
            {fieldErrors.password && (
              <p data-testid="error-password" className="text-xs text-red-600 mt-1 font-medium">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="address" className="block text-xs font-bold text-slate-700 mb-1">
              Default Pickup Address
            </label>
            <input
              id="address"
              name="address"
              data-testid="register-address"
              type="text"
              required
              minLength={5}
              maxLength={500}
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (fieldErrors.address) setFieldErrors((prev) => ({ ...prev, address: "" }));
              }}
              placeholder="123 Green Way, Eco City"
              className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                fieldErrors.address ? "border-red-400 bg-red-50/20" : "border-slate-300"
              } focus:outline-none focus:ring-2 focus:ring-emerald-500`}
            />
            {fieldErrors.address && (
              <p data-testid="error-address" className="text-xs text-red-600 mt-1 font-medium">
                {fieldErrors.address}
              </p>
            )}
          </div>

          {/* Data Minimization & Consent Disclosure */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-[11px] text-slate-500 leading-relaxed">
            <div className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">🔒</span>
              <p>
                <strong>Data Minimization:</strong> We only collect your physical address to schedule doorstep collections and deliver organic inputs. We never sell your personal data.
              </p>
            </div>
            <p className="text-[10px] text-slate-400">
              By creating an account, you certify that you are <strong>18 years of age or older</strong> and agree to our{" "}
              <Link href="/terms" target="_blank" className="text-emerald-700 underline font-semibold">
                Terms of Service
              </Link>
              ,{" "}
              <Link href="/privacy" target="_blank" className="text-emerald-700 underline font-semibold">
                Privacy Policy
              </Link>
              , and{" "}
              <Link href="/cookies" target="_blank" className="text-emerald-700 underline font-semibold">
                Cookie Policy
              </Link>.
            </p>
          </div>

          <button
            type="submit"
            data-testid="register-submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 disabled:bg-slate-300 transition shadow-sm"
          >
            {isSubmitting ? "Creating Account..." : "Complete Registration"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          Already registered?{" "}
          <Link href="/auth/login" className="font-bold text-emerald-600 hover:underline">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
}
