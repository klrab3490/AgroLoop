import type { TokenStorage } from "./token-storage.js";
import { MemoryTokenStorage } from "./token-storage.js";
import { RefreshMutex } from "./refresh.js";

export type PlatformClientType = "WEB" | "MOBILE" | "DESKTOP";

export interface SessionConfig {
  clientType: PlatformClientType;
  tokenStorage?: TokenStorage;
  onSessionExpired?: () => void;
}

export class SessionManager {
  readonly clientType: PlatformClientType;
  readonly storage: TokenStorage;
  readonly refreshMutex: RefreshMutex;
  private readonly onSessionExpired?: () => void;

  constructor(config: SessionConfig) {
    this.clientType = config.clientType;
    this.storage = config.tokenStorage ?? new MemoryTokenStorage();
    this.refreshMutex = new RefreshMutex();
    this.onSessionExpired = config.onSessionExpired;
  }

  async getAccessToken(): Promise<string | null> {
    return this.storage.getAccessToken();
  }

  async setAccessToken(token: string | null): Promise<void> {
    await this.storage.setAccessToken(token);
  }

  async getRefreshToken(): Promise<string | null> {
    return this.storage.getRefreshToken();
  }

  async setRefreshToken(token: string | null): Promise<void> {
    await this.storage.setRefreshToken(token);
  }

  async clearSession(): Promise<void> {
    await this.storage.clear();
    this.onSessionExpired?.();
  }
}
