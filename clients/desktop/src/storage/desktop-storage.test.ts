import { describe, it, expect, beforeEach } from "vitest";
import { DesktopTokenStorage } from "./desktop-storage.js";

describe("DesktopTokenStorage", () => {
  let storage: DesktopTokenStorage;

  beforeEach(() => {
    storage = new DesktopTokenStorage();
  });

  it("stores and retrieves credentials in memory fallback when not running inside Tauri IPC", async () => {
    await storage.setAccessToken("test_desktop_access");
    await storage.setRefreshToken("test_desktop_refresh");

    expect(await storage.getAccessToken()).toBe("test_desktop_access");
    expect(await storage.getRefreshToken()).toBe("test_desktop_refresh");
  });

  it("clears credentials on clear()", async () => {
    await storage.setAccessToken("access");
    await storage.setRefreshToken("refresh");

    await storage.clear();

    expect(await storage.getAccessToken()).toBeNull();
    expect(await storage.getRefreshToken()).toBeNull();
  });
});
