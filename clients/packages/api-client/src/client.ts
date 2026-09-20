import type { ProblemDetailResponse } from "@agroloop/api-types";
import { generateRequestId } from "./request-id.js";
import { generateIdempotencyKey } from "./idempotency.js";
import { ApiError } from "./errors.js";
import { SessionManager, type PlatformClientType } from "./auth/session.js";
import type { TokenStorage } from "./auth/token-storage.js";

export const API_PREFIX = "/api/v1";

export interface ApiClientConfig {
  baseUrl: string;
  clientType?: PlatformClientType;
  tokenStorage?: TokenStorage;
  deviceName?: string;
  onSessionExpired?: () => void;
  fetchFn?: typeof fetch;
}

export interface RequestOptions extends RequestInit {
  idempotentMutation?: boolean;
  idempotencyKey?: string;
  skipAuth?: boolean;
  skipPrefix?: boolean;
}

export class AgroLoopApiClient {
  readonly baseUrl: string;
  readonly session: SessionManager;
  readonly deviceName: string;
  private readonly customFetch: typeof fetch;

  constructor(config: ApiClientConfig) {
    // Normalize baseUrl: strip trailing slash
    this.baseUrl = config.baseUrl.replace(/\/+$/, "");
    this.deviceName = config.deviceName ?? "AgroLoop Client";
    this.customFetch = config.fetchFn ?? globalThis.fetch;
    this.session = new SessionManager({
      clientType: config.clientType ?? "WEB",
      tokenStorage: config.tokenStorage,
      onSessionExpired: config.onSessionExpired,
    });
  }

  get clientType(): "WEB" | "MOBILE" | "DESKTOP" {
    return this.session.clientType;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const isRefreshRequest = path.includes("/auth/refresh");
    const isLoginRequest = path.includes("/auth/login") || path.includes("/auth/register");

    // Assign stable idempotency key for mutations across retries
    const stableIdempotencyKey = options.idempotentMutation
      ? (options.idempotencyKey ?? generateIdempotencyKey())
      : undefined;

    return this.executeAttempt<T>(path, options, stableIdempotencyKey, isRefreshRequest, isLoginRequest);
  }

  private async executeAttempt<T>(
    path: string,
    options: RequestOptions,
    idempotencyKey?: string,
    isRefreshRequest = false,
    isLoginRequest = false
  ): Promise<T> {
    const endpoint = options.skipPrefix
      ? `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`
      : `${this.baseUrl}${API_PREFIX}${path.startsWith("/") ? path : `/${path}`}`;

    const headers = new Headers(options.headers);

    // 1. Correlation: Unique X-Request-Id per individual attempt
    headers.set("X-Request-Id", generateRequestId());

    // 2. Content negotiation
    if (!headers.has("Accept")) {
      headers.set("Accept", "application/json");
    }

    if (options.body && typeof options.body === "string" && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    // 3. Idempotency Key
    if (idempotencyKey) {
      headers.set("Idempotency-Key", idempotencyKey);
    }

    // 4. Authorization Header
    if (!options.skipAuth) {
      const accessToken = await this.session.getAccessToken();
      if (accessToken && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${accessToken}`);
      }
    }

    // 5. Platform credentials (Web sends cookies, native does not)
    const credentials = this.session.clientType === "WEB" ? "include" : "omit";

    let response: Response;
    try {
      response = await this.customFetch(endpoint, {
        ...options,
        headers,
        credentials: options.credentials ?? credentials,
      });
    } catch (networkError: unknown) {
      throw new ApiError(0, `Network request failed: ${networkError instanceof Error ? networkError.message : String(networkError)}`);
    }

    // Handle 401 with thundering-herd refresh queue
    if (response.status === 401 && !isRefreshRequest && !isLoginRequest && !options.skipAuth) {
      const refreshedAccessToken = await this.session.refreshMutex.executeSingleFlight(async () => {
        return this.performRefreshToken();
      });

      if (refreshedAccessToken) {
        // Re-execute with new token, fresh X-Request-Id, and preserved Idempotency-Key
        return this.executeAttempt<T>(path, options, idempotencyKey, false, false);
      } else {
        await this.session.clearSession();
      }
    }

    // Parse response
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json") || contentType.includes("application/problem+json");

    if (!response.ok) {
      if (isJson) {
        const problem: ProblemDetailResponse = await response.json();
        throw new ApiError(response.status, problem.detail || `HTTP error ${response.status}`, problem);
      }
      const rawText = await response.text();
      throw new ApiError(response.status, rawText || `HTTP error ${response.status}`);
    }

    if (isJson) {
      return (await response.json()) as T;
    }

    return (await response.text()) as unknown as T;
  }

  private async performRefreshToken(): Promise<string | null> {
    try {
      const clientType = this.session.clientType;
      const storedRefreshToken = await this.session.getRefreshToken();

      // On native, stored refresh token is mandatory. On Web, cookie is sent automatically.
      const bodyPayload = clientType !== "WEB" || storedRefreshToken
        ? JSON.stringify({
            refreshToken: storedRefreshToken ?? "",
            deviceName: this.deviceName,
            clientType,
          })
        : undefined;

      const refreshHeaders = new Headers({
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Idempotency-Key": generateIdempotencyKey(),
        "X-Request-Id": generateRequestId(),
      });

      const response = await this.customFetch(`${this.baseUrl}${API_PREFIX}/auth/refresh`, {
        method: "POST",
        headers: refreshHeaders,
        body: bodyPayload,
        credentials: clientType === "WEB" ? "include" : "omit",
      });

      if (!response.ok) {
        await this.session.clearSession();
        return null;
      }

      const data = await response.json();
      const newAccessToken = data.accessToken as string;
      await this.session.setAccessToken(newAccessToken);

      if (data.refreshToken) {
        await this.session.setRefreshToken(data.refreshToken as string);
      }

      return newAccessToken;
    } catch {
      await this.session.clearSession();
      return null;
    }
  }

  // Convenience HTTP helpers
  get<T>(path: string, options?: Omit<RequestOptions, "method">): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "POST",
      body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
    });
  }

  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "PUT",
      body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
    });
  }

  delete<T>(path: string, options?: Omit<RequestOptions, "method">): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }
}
