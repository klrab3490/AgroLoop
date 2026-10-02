import { describe, it, expect } from "vitest";
import { isAllowedProxyPath, ALLOWED_PROXY_PREFIXES, extractCookieValue } from "../lib/bff-config";

describe("BFF Route Allowlist & Security Boundaries", () => {
  it("allows all explicitly permitted business domains", () => {
    ALLOWED_PROXY_PREFIXES.forEach((prefix) => {
      expect(isAllowedProxyPath(prefix)).toBe(true);
    });
  });

  it("strictly rejects disallowed routes such as actuator or arbitrary paths", () => {
    expect(isAllowedProxyPath("actuator")).toBe(false);
    expect(isAllowedProxyPath("users")).toBe(false);
    expect(isAllowedProxyPath("system")).toBe(false);
    expect(isAllowedProxyPath("internal")).toBe(false);
    expect(isAllowedProxyPath("..")).toBe(false);
  });

  it("extracts specific cookie value from composite cookie header", () => {
    const cookieHeader =
      "session_id=mock-session; eco_refresh_token=mock-refresh-token-value; other_cookie=val";
    const token = extractCookieValue(cookieHeader, "eco_refresh_token");
    expect(token).toBe("mock-refresh-token-value");
  });

  it("returns null if requested cookie is not found", () => {
    const cookieHeader = "session_id=xyz123; other_cookie=val";
    expect(extractCookieValue(cookieHeader, "eco_refresh_token")).toBeNull();
    expect(extractCookieValue(null, "eco_refresh_token")).toBeNull();
  });
});
