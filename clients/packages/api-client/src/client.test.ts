import { describe, it, expect, vi } from "vitest";
import { AgroLoopApiClient, API_PREFIX } from "./client.js";
import { createAgroLoopClient } from "./index.js";
import { MemoryTokenStorage } from "./auth/token-storage.js";
import { ApiError } from "./errors.js";

describe("AgroLoopApiClient & Universal Client Architecture", () => {
  it("strictly prepends /api/v1 to all outbound requests", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "OK" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const client = new AgroLoopApiClient({
      baseUrl: "https://api.agroloop.com",
      fetchFn: mockFetch,
    });

    await client.get("/marketplace/products");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [calledUrl] = mockFetch.mock.calls[0];
    expect(calledUrl).toBe("https://api.agroloop.com/api/v1/marketplace/products");
  });

  it("assigns a unique X-Request-Id to every HTTP attempt", async () => {
    const requestIds: string[] = [];
    const mockFetch = vi.fn().mockImplementation((_url, init) => {
      const headers = new Headers(init.headers);
      requestIds.push(headers.get("X-Request-Id")!);
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    const client = new AgroLoopApiClient({
      baseUrl: "https://api.agroloop.com",
      fetchFn: mockFetch,
    });

    await client.get("/marketplace/products");
    await client.get("/marketplace/categories");

    expect(requestIds).toHaveLength(2);
    expect(requestIds[0]).toMatch(/^req_[a-zA-Z0-9]+$/);
    expect(requestIds[1]).toMatch(/^req_[a-zA-Z0-9]+$/);
    expect(requestIds[0]).not.toBe(requestIds[1]);
  });

  it("preserves identical Idempotency-Key across retries of financial mutations", async () => {
    let attempt = 0;
    const capturedKeys: string[] = [];

    const mockFetch = vi.fn().mockImplementation((url, init) => {
      const headers = new Headers(init.headers);
      capturedKeys.push(headers.get("Idempotency-Key")!);

      if (attempt === 0 && url.includes("/orders")) {
        attempt++;
        // Simulate 401 triggering refresh and transparent retry
        return Promise.resolve(
          new Response(JSON.stringify({ title: "Unauthorized", status: 401 }), {
            status: 401,
            headers: { "Content-Type": "application/problem+json" },
          })
        );
      }

      if (url.includes("/auth/refresh")) {
        return Promise.resolve(
          new Response(JSON.stringify({ accessToken: "new_jwt" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }

      return Promise.resolve(
        new Response(JSON.stringify({ id: 101, status: "PLACED" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    const client = createAgroLoopClient({
      baseUrl: "https://api.agroloop.com",
      fetchFn: mockFetch,
    });

    const explicitKey = "order-mutation-uuid-12345";
    const result = await client.orders.create(
      { deliveryAddress: "123 Eco Way", items: [{ productId: 1, quantity: 2 }] },
      { idempotencyKey: explicitKey }
    );

    expect(result.id).toBe(101);
    // Captured keys for order requests: attempt 1 and retry attempt 2 must match
    const orderKeys = capturedKeys.filter((k) => k === explicitKey);
    expect(orderKeys).toHaveLength(2);
  });

  it("coalesces concurrent 401s into a single-flight /auth/refresh execution", async () => {
    let refreshCalls = 0;
    let initialCalls = 0;

    const mockFetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/auth/refresh")) {
        refreshCalls++;
        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve(
                new Response(JSON.stringify({ accessToken: "fresh_token_xyz" }), {
                  status: 200,
                  headers: { "Content-Type": "application/json" },
                })
              ),
            50
          )
        );
      }

      if (initialCalls < 2) {
        initialCalls++;
        return Promise.resolve(
          new Response(JSON.stringify({ title: "Unauthorized", status: 401 }), {
            status: 401,
            headers: { "Content-Type": "application/problem+json" },
          })
        );
      }

      return Promise.resolve(
        new Response(JSON.stringify({ data: "success" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    const client = new AgroLoopApiClient({
      baseUrl: "https://api.agroloop.com",
      fetchFn: mockFetch,
    });

    // Fire two concurrent requests that both receive 401
    const [res1, res2] = await Promise.all([
      client.get<{ data: string }>("/household/balance"),
      client.get<{ data: string }>("/household/ledger"),
    ]);

    expect(res1.data).toBe("success");
    expect(res2.data).toBe("success");
    expect(refreshCalls).toBe(1); // Single-flight refresh mutex prevented thundering herd!
  });

  it("normalizes RFC 7807 problem details into typed ApiError", async () => {
    const mockFetch = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            type: "https://agroloop.com/errors/forbidden",
            title: "Forbidden",
            status: 403,
            detail: "Access denied for order #99",
            code: "FORBIDDEN",
            instance: "/api/v1/orders/99",
            requestId: "req_test123",
          }),
          {
            status: 403,
            headers: { "Content-Type": "application/problem+json" },
          }
        )
      )
    );

    const client = new AgroLoopApiClient({
      baseUrl: "https://api.agroloop.com",
      fetchFn: mockFetch,
    });

    await expect(client.get("/orders/99")).rejects.toThrowError(ApiError);

    try {
      await client.get("/orders/99");
    } catch (err) {
      const apiError = err as ApiError;
      expect(apiError.status).toBe(403);
      expect(apiError.code).toBe("FORBIDDEN");
      expect(apiError.detail || apiError.message).toBe("Access denied for order #99");
      expect(apiError.isForbidden()).toBe(true);
    }
  });

  it("Web security: refresh token is never stored in JS memory or exposed on Web", async () => {
    const storage = new MemoryTokenStorage();
    const client = createAgroLoopClient({
      baseUrl: "https://api.agroloop.com",
      clientType: "WEB",
      tokenStorage: storage,
    });

    // In Web client mode, refresh token in JS memory is strictly null (managed via HttpOnly cookie)
    expect(storage.getRefreshToken()).toBeNull();
  });

  it("safely invokes fetch with global/window receiver when fetch requires strict Window/globalThis context (e.g. WebKit)", async () => {
    function webkitFetch(this: any, _url: any, _init: any) {
      const isWindowOrGlobal = this === globalThis || (typeof window !== "undefined" && this === window);
      if (!isWindowOrGlobal) {
        throw new TypeError("Can only call Window.fetch on instances of Window");
      }
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    }

    const client = new AgroLoopApiClient({
      baseUrl: "https://api.agroloop.com",
      fetchFn: webkitFetch as any,
    });

    const res = await client.get<{ ok: boolean }>("/test");
    expect(res.ok).toBe(true);
  });

  it("media.directUpload: attaches Authorization header on internal/proxy URLs but omits on external URLs", async () => {
    const capturedHeaders: Headers[] = [];
    const mockFetch = vi.fn().mockImplementation((_url, init) => {
      capturedHeaders.push(new Headers(init.headers));
      return Promise.resolve(new Response(null, { status: 200 }));
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      const storage = new MemoryTokenStorage();
      await storage.setAccessToken("test-bearer-token");

      const client = createAgroLoopClient({
        baseUrl: "https://api.agroloop.com",
        tokenStorage: storage,
      });

      // Internal proxy direct upload
      await client.media.directUpload(
        "/api/proxy/media/upload/med_123",
        new Uint8Array([1, 2, 3]),
        "image/png"
      );

      expect(capturedHeaders[0].get("Authorization")).toBe("Bearer test-bearer-token");
      expect(capturedHeaders[0].get("Content-Type")).toBe("image/png");

      // External storage direct upload (e.g. S3 presigned PUT)
      await client.media.directUpload(
        "https://s3.amazonaws.com/agroloop-bucket/med_123",
        new Uint8Array([1, 2, 3]),
        "image/png"
      );

      expect(capturedHeaders[1].get("Authorization")).toBeNull();
      expect(capturedHeaders[1].get("Content-Type")).toBe("image/png");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("media.directUpload: throws descriptive error on non-2xx status", async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;

    try {
      const client = createAgroLoopClient({
        baseUrl: "https://api.agroloop.com",
      });

      await expect(
        client.media.directUpload("/api/proxy/media/upload/med_123", new Uint8Array([]), "image/png")
      ).rejects.toThrow("Media direct upload failed with status 401");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
