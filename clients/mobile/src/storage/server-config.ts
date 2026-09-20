import * as SecureStore from "expo-secure-store";

const SERVER_CONFIG_KEY = "agroloop_server_config";

export interface MobileServerConfig {
  url: string;
  verifiedAt: string;
  serverVersion: string;
  apiVersion: string;
}

let inMemoryConfig: MobileServerConfig | null = null;

export async function getServerConfig(): Promise<MobileServerConfig | null> {
  if (inMemoryConfig) return inMemoryConfig;
  try {
    const raw = await SecureStore.getItemAsync(SERVER_CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    inMemoryConfig = parsed;
    return parsed;
  } catch {
    return inMemoryConfig;
  }
}

export async function saveServerConfig(config: MobileServerConfig): Promise<void> {
  inMemoryConfig = config;
  try {
    await SecureStore.setItemAsync(SERVER_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Non-fatal if secure-store is unavailable in web/preview
  }
}

export async function clearServerConfig(): Promise<void> {
  inMemoryConfig = null;
  try {
    await SecureStore.deleteItemAsync(SERVER_CONFIG_KEY);
  } catch {
    // Non-fatal
  }
}

export function getServerHostname(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return url.host;
  } catch {
    return rawUrl.replace(/^https?:\/\//i, "").split("/")[0] || rawUrl;
  }
}
