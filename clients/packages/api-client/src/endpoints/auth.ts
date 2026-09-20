import type {
  LoginApiRequest,
  RegisterApiRequest,
  RefreshTokenApiRequest,
  UserApiResponse,
} from "@agroloop/api-types";
import type { AgroLoopApiClient } from "../client.js";

export interface AuthEndpoints {
  login(request: LoginApiRequest): Promise<unknown>;
  register(request: RegisterApiRequest): Promise<unknown>;
  refresh(request?: RefreshTokenApiRequest): Promise<unknown>;
  logout(): Promise<void>;
  logoutAll(): Promise<void>;
  me(): Promise<UserApiResponse>;
}

export function createAuthEndpoints(client: AgroLoopApiClient): AuthEndpoints {
  return {
    async login(request: LoginApiRequest) {
      const response = await client.post<Record<string, unknown>>("/auth/login", request, { skipAuth: true });
      if (response.accessToken && typeof response.accessToken === "string") {
        await client.session.setAccessToken(response.accessToken);
      }
      if (response.refreshToken && typeof response.refreshToken === "string") {
        await client.session.setRefreshToken(response.refreshToken);
      }
      return response;
    },

    async register(request: RegisterApiRequest) {
      const response = await client.post<Record<string, unknown>>("/auth/register", request, { skipAuth: true });
      if (response.accessToken && typeof response.accessToken === "string") {
        await client.session.setAccessToken(response.accessToken);
      }
      if (response.refreshToken && typeof response.refreshToken === "string") {
        await client.session.setRefreshToken(response.refreshToken);
      }
      return response;
    },

    async refresh(request?: RefreshTokenApiRequest) {
      return client.post("/auth/refresh", request, {
        idempotentMutation: true,
        skipAuth: true,
      });
    },

    async logout() {
      const refreshToken = await client.session.getRefreshToken();
      await client.post("/auth/logout", { refreshToken, clientType: client.session.clientType });
      await client.session.clearSession();
    },

    async logoutAll() {
      await client.post("/auth/logout-all");
      await client.session.clearSession();
    },

    async me() {
      return client.get<UserApiResponse>("/auth/me");
    },
  };
}
