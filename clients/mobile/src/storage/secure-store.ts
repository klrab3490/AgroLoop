import type { TokenStorage } from "@agroloop/api-client";
import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "agroloop_access_token";
const REFRESH_TOKEN_KEY = "agroloop_refresh_token";

/**
 * Native mobile TokenStorage implementation backed by expo-secure-store.
 * Stores JWT access tokens and long-lived refresh tokens in hardware-backed
 * iOS Keychain and Android Keystore.
 */
export class SecureStoreTokenStorage implements TokenStorage {
  async getAccessToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  async setAccessToken(token: string | null): Promise<void> {
    if (token) {
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  async setRefreshToken(token: string | null): Promise<void> {
    if (token) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  }

  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {}),
    ]);
  }
}
