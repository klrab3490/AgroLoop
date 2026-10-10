export interface ServerMeta {
  status: string;
  service: string;
  api_version: string;
  minimum_client_version: string;
  server_version: string;
  app_version?: string;
  github_repo?: string;
}

export type ServerVerificationReason =
  | "INVALID_URL"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "NOT_AGROLOOP"
  | "UNSUPPORTED_API"
  | "INCOMPATIBLE_CLIENT"
  | "INVALID_RESPONSE";

export type ServerVerificationResult =
  | {
      ok: true;
      url: string;
      meta: ServerMeta;
      latencyMs: number;
    }
  | {
      ok: false;
      url: string;
      reason: ServerVerificationReason;
      message: string;
    };

export interface VerifyServerOptions {
  clientVersion?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

/**
 * Normalizes a user-entered server URL:
 * - Trims whitespace
 * - Prepends http:// if scheme is missing (e.g. localhost:8080 -> http://localhost:8080)
 * - Strips trailing slashes
 */
export function normalizeServerUrl(rawUrl: string): string {
  if (typeof rawUrl !== "string") {
    throw new Error("Server URL must be a string");
  }
  let trimmed = rawUrl.trim();
  if (trimmed === "") {
    return "";
  }
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    // If it looks like localhost or an IP, default to http://, otherwise https://
    if (trimmed.startsWith("localhost") || trimmed.startsWith("127.0.0.1") || trimmed.startsWith("10.0.2.2")) {
      trimmed = `http://${trimmed}`;
    } else {
      trimmed = `https://${trimmed}`;
    }
  }

  // Validate URL structure
  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/+$/, "");
  } catch {
    throw new Error(`Invalid server URL structure: "${rawUrl}"`);
  }
}

/**
 * Compares two semantic version strings (e.g. "1.0.0" vs "1.2.0").
 * Returns negative if v1 < v2, positive if v1 > v2, 0 if equal.
 */
export function compareSemver(v1: string, v2: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/i, "")
      .split(".")
      .map((part) => parseInt(part, 10) || 0);

  const [maj1, min1, pat1] = parse(v1);
  const [maj2, min2, pat2] = parse(v2);

  if (maj1 !== maj2) return maj1 - maj2;
  if (min1 !== min2) return min1 - min2;
  return pat1 - pat2;
}

/**
 * Centralized server verification routine for Mobile, Desktop, and Web.
 * Probes /api/v1/meta to assert service authenticity, protocol compatibility,
 * and client version satisfaction.
 */
export async function verifyServer(
  rawUrl: string,
  options: VerifyServerOptions = {}
): Promise<ServerVerificationResult> {
  const {
    clientVersion = "1.0.0",
    timeoutMs = 5000,
  } = options;

  const rawFetch = options.fetchFn ?? globalThis.fetch;
  const fetchTarget = typeof window !== "undefined" ? window : globalThis;
  const safeFetch: typeof fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    return rawFetch.call(fetchTarget, input, init);
  };

  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeServerUrl(rawUrl);
    if (!normalizedUrl) {
      return {
        ok: false,
        url: rawUrl,
        reason: "INVALID_URL",
        message: "Server URL cannot be empty.",
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      url: rawUrl,
      reason: "INVALID_URL",
      message: err?.message || "Invalid server URL syntax.",
    };
  }

  const targetEndpoint = `${normalizedUrl}/api/v1/meta`;
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  const startTime = Date.now();

  try {
    const response = await safeFetch(targetEndpoint, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller?.signal,
    });

    const latencyMs = Math.max(1, Date.now() - startTime);

    if (!response.ok) {
      return {
        ok: false,
        url: normalizedUrl,
        reason: "INVALID_RESPONSE",
        message: `Server returned HTTP ${response.status} (${response.statusText}).`,
      };
    }

    const data = await response.json();

    if (!data || typeof data !== "object") {
      return {
        ok: false,
        url: normalizedUrl,
        reason: "INVALID_RESPONSE",
        message: "Server response was not valid JSON.",
      };
    }

    // 1. Identity Check
    if (data.service !== "agroloop") {
      return {
        ok: false,
        url: normalizedUrl,
        reason: "NOT_AGROLOOP",
        message: `Connected server identified as "${data.service || "unknown"}", expected "agroloop".`,
      };
    }

    // 2. API Version Compatibility Check
    if (data.api_version !== "v1") {
      return {
        ok: false,
        url: normalizedUrl,
        reason: "UNSUPPORTED_API",
        message: `Server supports API "${data.api_version || "unknown"}", but this client requires "v1".`,
      };
    }

    // 3. Minimum Client Version Check
    const minClient = data.minimum_client_version || "1.0.0";
    if (compareSemver(clientVersion, minClient) < 0) {
      return {
        ok: false,
        url: normalizedUrl,
        reason: "INCOMPATIBLE_CLIENT",
        message: `Client version ${clientVersion} is outdated. Server requires at least v${minClient}.`,
      };
    }

    const meta: ServerMeta = {
      status: data.status || "ok",
      service: data.service,
      api_version: data.api_version,
      minimum_client_version: minClient,
      server_version: data.server_version || "unknown",
    };

    return {
      ok: true,
      url: normalizedUrl,
      meta,
      latencyMs,
    };
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return {
        ok: false,
        url: normalizedUrl,
        reason: "TIMEOUT",
        message: `Connection timed out after ${timeoutMs}ms. Check that the server is online and accessible.`,
      };
    }

    return {
      ok: false,
      url: normalizedUrl,
      reason: "NETWORK_ERROR",
      message: err?.message || "Failed to reach server. Check network connection and server host/port.",
    };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
