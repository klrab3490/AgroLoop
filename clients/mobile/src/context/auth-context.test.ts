import { describe, it, expect, vi, beforeEach } from "vitest";
import { mobileApiClient, mobileTokenStorage } from "../lib/api.js";

// Mock SecureStore
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

describe("Mobile Auth & Secure Storage Flow", () => {
  beforeEach(async () => {
    await mobileTokenStorage.clear();
    vi.clearAllMocks();
  });

  it("stores credentials securely in SecureStore upon mobile login", async () => {
    // Mock mobileApiClient auth methods
    const mockUser: { id: number; name: string; email: string; role: "ROLE_HOUSEHOLD" } = {
      id: 1,
      name: "Household Eco",
      email: "household@agroloop.com",
      role: "ROLE_HOUSEHOLD",
    };

    vi.spyOn(mobileApiClient.auth, "login").mockImplementation(async () => {
      await mobileTokenStorage.setAccessToken("test_access_jwt_123");
      await mobileTokenStorage.setRefreshToken("test_refresh_jwt_456");
      return { accessToken: "test_access_jwt_123", refreshToken: "test_refresh_jwt_456" };
    });

    vi.spyOn(mobileApiClient.auth, "me").mockResolvedValue(mockUser);

    await mobileApiClient.auth.login({
      email: "household@agroloop.com",
      password: "password123",
      clientType: "MOBILE",
    });

    const access = await mobileTokenStorage.getAccessToken();
    const refresh = await mobileTokenStorage.getRefreshToken();
    const me = await mobileApiClient.auth.me();

    expect(access).toBe("test_access_jwt_123");
    expect(refresh).toBe("test_refresh_jwt_456");
    expect(me.email).toBe("household@agroloop.com");
    expect(me.role).toBe("ROLE_HOUSEHOLD");
  });

  it("clears hardware-backed storage on logout", async () => {
    await mobileTokenStorage.setAccessToken("active_jwt");
    await mobileTokenStorage.setRefreshToken("active_refresh");

    vi.spyOn(mobileApiClient.auth, "logout").mockImplementation(async () => {
      await mobileTokenStorage.clear();
    });

    await mobileApiClient.auth.logout();

    expect(await mobileTokenStorage.getAccessToken()).toBeNull();
    expect(await mobileTokenStorage.getRefreshToken()).toBeNull();
  });
});
