import Constants from "expo-constants";
import { createAgroLoopClient } from "@agroloop/api-client";
import { SecureStoreTokenStorage } from "../storage/secure-store";
import { getServerConfig } from "../storage/server-config";

export function resolveDefaultBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Auto-detect the host IP address from Expo Metro bundler (e.g. 192.168.1.100:8082)
  const hostUri =
    Constants?.expoConfig?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(":")[0];
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return `http://${host}:8080`;
    }
  }

  return process.env.EXPO_OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080";
}

export const defaultBaseUrl = resolveDefaultBaseUrl();

export const mobileTokenStorage = new SecureStoreTokenStorage();

export const mobileApiClient = createAgroLoopClient({
  baseUrl: defaultBaseUrl,
  clientType: "MOBILE",
  deviceName: "AgroLoop Mobile App",
  tokenStorage: mobileTokenStorage,
});

let activeBaseUrl = defaultBaseUrl;

export function getMobileServerUrl(): string {
  return activeBaseUrl;
}

export function setMobileServerUrl(url: string): void {
  activeBaseUrl = url;
  mobileApiClient.setBaseUrl(url);
}

// Bootstrap active server URL from SecureStore if configured
getServerConfig().then((config) => {
  if (config?.url) {
    setMobileServerUrl(config.url);
  }
}).catch(() => {});
