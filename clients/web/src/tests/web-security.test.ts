import { describe, it, expect } from "vitest";
import { webTokenStorage, webApiClient } from "../lib/api";

describe("Web Security Invariants", () => {
  it("never stores refresh tokens in JavaScript-accessible storage in Web mode", async () => {
    // 1. Storage should have null for refresh token
    const refreshToken = await webTokenStorage.getRefreshToken();
    expect(refreshToken).toBeNull();

    // 2. Client type should be WEB
    expect(webApiClient.clientType).toBe("WEB");

    // 3. Attempting to set refresh token in WebTokenStorage should be a no-op or throw
    await webTokenStorage.setRefreshToken("illegal_token_value");
    const retrievedAfter = await webTokenStorage.getRefreshToken();
    expect(retrievedAfter).toBeNull();
  });

  it("prohibits local/session storage usage for refresh credentials", () => {
    if (typeof window !== "undefined") {
      expect(window.localStorage.getItem("refreshToken")).toBeNull();
      expect(window.sessionStorage.getItem("refreshToken")).toBeNull();
    }
  });
});
