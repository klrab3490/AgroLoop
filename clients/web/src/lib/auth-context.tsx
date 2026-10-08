"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { UserApiResponse } from "@agroloop/api-types";
import { webApiClient, webTokenStorage } from "./api";

export interface AuthContextType {
  user: UserApiResponse | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<UserApiResponse>;
  register: (fullName: string, email: string, password: string, address?: string) => Promise<UserApiResponse>;
  logout: (redirectTo?: string) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserApiResponse | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync token to api-client memory storage whenever it updates
  const updateAccessToken = useCallback(async (token: string | null) => {
    setAccessToken(token);
    if (token) {
      await webTokenStorage.setAccessToken(token);
    } else {
      await webTokenStorage.clear();
    }
  }, []);

  // Hydrate session on initial mount
  useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        // Attempt to refresh via HttpOnly cookie
        const refreshRes = await fetch("/api/auth/refresh", { method: "POST" });
        if (refreshRes.ok) {
          const { accessToken: newAccess } = await refreshRes.json();
          if (newAccess && mounted) {
            await updateAccessToken(newAccess);
            // Fetch user profile with fresh access token
            const meRes = await fetch("/api/auth/me", {
              headers: { Authorization: `Bearer ${newAccess}` },
            });
            if (meRes.ok) {
              const userData: UserApiResponse = await meRes.json();
              if (mounted) setUser(userData);
            }
          }
        }
      } catch {
        // Unauthenticated visitor
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    initSession();
    return () => {
      mounted = false;
    };
  }, [updateAccessToken]);

  const login = async (email: string, password: string): Promise<UserApiResponse> => {
    setIsLoading(true);
    try {
      const res = (await webApiClient.auth.login({
        email,
        password,
        clientType: "WEB",
      })) as { user: UserApiResponse; accessToken: string };

      if (res.user && res.accessToken) {
        setUser(res.user);
        await updateAccessToken(res.accessToken);
        return res.user;
      }
      throw new Error("Invalid authentication response");
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (fullName: string, email: string, password: string, address?: string): Promise<UserApiResponse> => {
    setIsLoading(true);
    try {
      const res = (await webApiClient.auth.register({
        name: fullName,
        email,
        password,
        address: address || "Registered Address",
        clientType: "WEB",
      })) as { user: UserApiResponse; accessToken: string };

      if (res.user && res.accessToken) {
        setUser(res.user);
        await updateAccessToken(res.accessToken);
        return res.user;
      }
      throw new Error("Invalid registration response");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (redirectTo: string = "/") => {
    setIsLoading(true);
    try {
      await webApiClient.auth.logout();
    } catch {
      // Ignore errors on logout
    } finally {
      setUser(null);
      await updateAccessToken(null);
      setIsLoading(false);
      if (redirectTo) {
        try {
          router.push(redirectTo);
        } catch {
          if (typeof window !== "undefined") {
            window.location.href = redirectTo;
          }
        }
      }
    }
  };

  const refreshSession = async () => {
    const res = await fetch("/api/auth/refresh", { method: "POST" });
    if (res.ok) {
      const { accessToken: newAccess } = await res.json();
      if (newAccess) {
        await updateAccessToken(newAccess);
      }
    } else {
      setUser(null);
      await updateAccessToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
