import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { UserApiResponse, LoginApiRequest, RegisterApiRequest } from "@agroloop/api-types";
import { mobileApiClient, mobileTokenStorage } from "../lib/api.js";

export interface AuthContextType {
  user: UserApiResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: Omit<LoginApiRequest, "clientType">) => Promise<UserApiResponse>;
  register: (payload: RegisterApiRequest) => Promise<UserApiResponse>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await mobileApiClient.auth.me();
      setUser(profile);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const token = await mobileTokenStorage.getAccessToken();
        const refreshToken = await mobileTokenStorage.getRefreshToken();
        if (token || refreshToken) {
          const profile = await mobileApiClient.auth.me();
          if (isMounted) setUser(profile);
        }
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (credentials: Omit<LoginApiRequest, "clientType">): Promise<UserApiResponse> => {
    setIsLoading(true);
    try {
      await mobileApiClient.auth.login({
        ...credentials,
        clientType: "MOBILE",
        deviceName: "AgroLoop Mobile Client",
      });
      const profile = await mobileApiClient.auth.me();
      setUser(profile);
      return profile;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterApiRequest): Promise<UserApiResponse> => {
    setIsLoading(true);
    try {
      await mobileApiClient.auth.register(payload);
      const profile = await mobileApiClient.auth.me();
      setUser(profile);
      return profile;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await mobileApiClient.auth.logout();
    } catch {
      await mobileTokenStorage.clear();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
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
