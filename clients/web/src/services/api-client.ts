import { createAgroLoopClient, WebTokenStorage } from "@agroloop/api-client";

// In Web mode, access tokens are held in-memory and refresh tokens are strictly
// managed via browser HttpOnly cookies. No refresh tokens touch JavaScript storage.
export const webTokenStorage = new WebTokenStorage();

/**
 * Custom fetch function for the Web client.
 * Enforces the BFF boundary: the browser runtime communicates ONLY with Next.js /api routes.
 * Direct browser-to-Spring Boot requests are completely prohibited.
 *
 * Route Mapping:
 * - /api/v1/auth/*  ➔ /api/auth/*   (BFF Cookie & Session Handlers)
 * - /api/v1/{path}  ➔ /api/proxy/{path} (BFF Proxy with Strict Route Allowlist)
 */
export const bffFetch: typeof fetch = async (input, init) => {
  let urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

  try {
    const parsed = new URL(urlStr, "http://localhost");
    const pathname = parsed.pathname;
    const search = parsed.search;

    if (pathname.startsWith("/api/v1/auth/")) {
      const authSub = pathname.replace("/api/v1/auth/", "");
      urlStr = `/api/auth/${authSub}${search}`;
    } else if (pathname.startsWith("/api/v1/")) {
      const proxySub = pathname.replace("/api/v1/", "");
      urlStr = `/api/proxy/${proxySub}${search}`;
    }
  } catch {
    // Keep original if parsing fails
  }

  return fetch(urlStr, init);
};

export const webApiClient = createAgroLoopClient({
  baseUrl: "", // Relative to current Next.js origin
  clientType: "WEB",
  tokenStorage: webTokenStorage,
  fetchFn: bffFetch,
});
