import { describe, it, expect, vi, beforeEach } from "vitest";
import { SecureStoreTokenStorage } from "./secure-store";
import * as SecureStore from "expo-secure-store";

vi.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: vi.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  };
});

describe("SecureStoreTokenStorage", () => {
  let storage: SecureStoreTokenStorage;

  beforeEach(() => {
    storage = new SecureStoreTokenStorage();
    vi.clearAllMocks();
  });

  it("stores and retrieves access and refresh tokens securely", async () => {
    await storage.setAccessToken("test_access_jwt");
    await storage.setRefreshToken("test_refresh_jwt");

    const access = await storage.getAccessToken();
    const refresh = await storage.getRefreshToken();

    expect(access).toBe("test_access_jwt");
    expect(refresh).toBe("test_refresh_jwt");
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);
  });

  it("clears all stored credentials on clear()", async () => {
    await storage.setAccessToken("token1");
    await storage.setRefreshToken("token2");

    await storage.clear();

    const access = await storage.getAccessToken();
    const refresh = await storage.getRefreshToken();

    expect(access).toBeNull();
    expect(refresh).toBeNull();
  });
});
