import type { TokenStorage } from "@agroloop/api-client";

interface TauriInvokeFn {
  <T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

/**
 * DesktopTokenStorage:
 * Interacts across the React/Tauri/Rust IPC boundary.
 * Credentials cross the webview boundary into native Rust before reaching
 * the operating system secure store (macOS Keychain, Windows Credential Manager, Linux Secret Service).
 */
export class DesktopTokenStorage implements TokenStorage {
  private inMemoryFallback = new Map<string, string>();
  private readonly hasTauri: boolean;

  constructor() {
    this.hasTauri = typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__);
  }

  private async invokeNative<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
    if (!this.hasTauri) return null;
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      return await invoke<T>(cmd, args);
    } catch {
      return null;
    }
  }

  async getAccessToken(): Promise<string | null> {
    const native = await this.invokeNative<string>("get_access_token");
    if (native !== null) return native;
    return this.inMemoryFallback.get("access_token") ?? null;
  }

  async setAccessToken(token: string | null): Promise<void> {
    if (token) {
      this.inMemoryFallback.set("access_token", token);
      await this.invokeNative("set_access_token", { token });
    } else {
      this.inMemoryFallback.delete("access_token");
      await this.invokeNative("delete_access_token");
    }
  }

  async getRefreshToken(): Promise<string | null> {
    const native = await this.invokeNative<string>("get_refresh_token");
    if (native !== null) return native;
    return this.inMemoryFallback.get("refresh_token") ?? null;
  }

  async setRefreshToken(token: string | null): Promise<void> {
    if (token) {
      this.inMemoryFallback.set("refresh_token", token);
      await this.invokeNative("set_refresh_token", { token });
    } else {
      this.inMemoryFallback.delete("refresh_token");
      await this.invokeNative("delete_refresh_token");
    }
  }

  async clear(): Promise<void> {
    this.inMemoryFallback.clear();
    await this.invokeNative("clear_tokens");
  }
}
