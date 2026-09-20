import { describe, it, expect, vi } from "vitest";
import {
  normalizeServerUrl,
  compareSemver,
  verifyServer,
} from "./server-verification.js";
import { AgroLoopApiClient } from "./client.js";

describe("Server Discovery & Verification Protocol", () => {
  describe("normalizeServerUrl", () => {
    it("trims whitespace and strips trailing slashes", () => {
      expect(normalizeServerUrl("  https://api.agroloop.app///  ")).toBe(
        "https://api.agroloop.app"
      );
    });

    it("prepends http:// for localhost, 127.0.0.1, and emulator addresses", () => {
      expect(normalizeServerUrl("localhost:8080")).toBe("http://localhost:8080");
      expect(normalizeServerUrl("127.0.0.1:8080")).toBe("http://127.0.0.1:8080");
      expect(normalizeServerUrl("10.0.2.2:8080")).toBe("http://10.0.2.2:8080");
    });

    it("prepends https:// for external domains without protocol", () => {
      expect(normalizeServerUrl("api.agroloop.app")).toBe("https://api.agroloop.app");
    });

    it("returns empty string for relative web baseUrl and throws on non-string", () => {
      expect(normalizeServerUrl("")).toBe("");
      expect(normalizeServerUrl("   ")).toBe("");
      expect(() => normalizeServerUrl(null as any)).toThrow();
    });
  });

  describe("compareSemver", () => {
    it("correctly compares semantic versions", () => {
      expect(compareSemver("1.0.0", "1.0.0")).toBe(0);
      expect(compareSemver("1.1.0", "1.0.0")).toBeGreaterThan(0);
      expect(compareSemver("1.0.0", "1.1.0")).toBeLessThan(0);
      expect(compareSemver("2.0.0", "1.9.9")).toBeGreaterThan(0);
      expect(compareSemver("1.0.0", "2.0.0")).toBeLessThan(0);
    });
  });

  describe("verifyServer handshake", () => {
    it("successfully verifies an authoritative AgroLoop server", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "ok",
            service: "agroloop",
            api_version: "v1",
            minimum_client_version: "1.0.0",
            server_version: "8.0.0",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      );

      const result = await verifyServer("http://localhost:8080", {
        clientVersion: "1.0.0",
        fetchFn: mockFetch,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.url).toBe("http://localhost:8080");
        expect(result.meta.service).toBe("agroloop");
        expect(result.meta.api_version).toBe("v1");
        expect(result.meta.server_version).toBe("8.0.0");
        expect(result.latencyMs).toBeGreaterThanOrEqual(1);
      }
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8080/api/v1/meta",
        expect.anything()
      );
    });

    it("rejects non-AgroLoop server with NOT_AGROLOOP", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "ok",
            service: "other-service",
            api_version: "v1",
          }),
          { status: 200 }
        )
      );

      const result = await verifyServer("https://example.com", {
        fetchFn: mockFetch,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("NOT_AGROLOOP");
        expect(result.message).toContain("other-service");
      }
    });

    it("rejects unsupported API version with UNSUPPORTED_API", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "ok",
            service: "agroloop",
            api_version: "v2",
          }),
          { status: 200 }
        )
      );

      const result = await verifyServer("https://api.agroloop.app", {
        fetchFn: mockFetch,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("UNSUPPORTED_API");
        expect(result.message).toContain("v2");
      }
    });

    it("rejects outdated client version with INCOMPATIBLE_CLIENT", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: "ok",
            service: "agroloop",
            api_version: "v1",
            minimum_client_version: "2.0.0",
          }),
          { status: 200 }
        )
      );

      const result = await verifyServer("https://api.agroloop.app", {
        clientVersion: "1.0.0",
        fetchFn: mockFetch,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("INCOMPATIBLE_CLIENT");
        expect(result.message).toContain("2.0.0");
      }
    });

    it("handles network failure with NETWORK_ERROR", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

      const result = await verifyServer("http://localhost:9999", {
        fetchFn: mockFetch,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe("NETWORK_ERROR");
        expect(result.message).toContain("Connection refused");
      }
    });
  });

  describe("Dynamic base URL on AgroLoopApiClient", () => {
    it("allows updating baseUrl at runtime via setBaseUrl", async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );

      const client = new AgroLoopApiClient({
        baseUrl: "http://localhost:8080",
        fetchFn: mockFetch,
      });

      expect(client.baseUrl).toBe("http://localhost:8080");

      client.setBaseUrl("https://api.agroloop.app/");
      expect(client.baseUrl).toBe("https://api.agroloop.app");

      await client.get("/marketplace/products");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.agroloop.app/api/v1/marketplace/products",
        expect.anything()
      );
    });
  });
});
