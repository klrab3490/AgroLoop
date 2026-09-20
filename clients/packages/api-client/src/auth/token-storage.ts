/**
 * Universal token storage contract for multi-platform authentication.
 */
export interface TokenStorage {
  getAccessToken(): Promise<string | null> | string | null;
  setAccessToken(token: string | null): Promise<void> | void;
  getRefreshToken(): Promise<string | null> | string | null;
  setRefreshToken(token: string | null): Promise<void> | void;
  clear(): Promise<void> | void;
}

/**
 * In-memory token storage.
 * Standard for Web applications where access tokens live only in JS memory
 * and refresh tokens are managed exclusively through HttpOnly cookies.
 */
export class MemoryTokenStorage implements TokenStorage {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  setRefreshToken(token: string | null): void {
    this.refreshToken = token;
  }

  clear(): void {
    this.accessToken = null;
    this.refreshToken = null;
  }
}

/**
 * Web-specific token storage:
 * Access tokens live in memory, while refresh tokens are strictly forbidden
 * from being stored in JavaScript memory or Web storage (delegated to HttpOnly cookies).
 */
export class WebTokenStorage implements TokenStorage {
  private accessToken: string | null = null;

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  getRefreshToken(): string | null {
    return null;
  }

  setRefreshToken(_token: string | null): void {
    // Strictly a no-op on Web to guarantee refresh credentials never enter JS memory
  }

  clear(): void {
    this.accessToken = null;
  }
}

