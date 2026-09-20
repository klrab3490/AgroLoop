import { describe, it, expect, beforeEach } from "vitest";
import { webTokenStorage, webApiClient } from "../lib/api";

describe("Web Authentication Invariants", () => {
  beforeEach(async () => {
    await webTokenStorage.clear();
  });

  it("holds access token strictly in memory and allows retrieval", async () => {
    await webTokenStorage.setAccessToken("test_jwt_access_token");
    expect(await webTokenStorage.getAccessToken()).toBe("test_jwt_access_token");
  });

  it("strictly rejects any client-side JavaScript refresh token persistence", async () => {
    // Attempting to set a refresh token on WebTokenStorage must result in null
    await webTokenStorage.setRefreshToken("forbidden_refresh_token");
    expect(await webTokenStorage.getRefreshToken()).toBeNull();
  });

  it("clears memory access token on session clear", async () => {
    await webTokenStorage.setAccessToken("valid_access_token");
    expect(await webTokenStorage.getAccessToken()).toBe("valid_access_token");

    await webTokenStorage.clear();
    expect(await webTokenStorage.getAccessToken()).toBeNull();
  });

  it("enforces ClientType == WEB on the shared API client", () => {
    expect(webApiClient.clientType).toBe("WEB");
  });
});
