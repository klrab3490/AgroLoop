import { createAgroLoopClient } from "@agroloop/api-client";
import { SecureStoreTokenStorage } from "../storage/secure-store.js";
import { getServerConfig } from "../storage/server-config.js";

export const defaultBaseUrl =
  process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:8080";

export const mobileTokenStorage = new SecureStoreTokenStorage();

export const mobileApiClient = createAgroLoopClient({
  baseUrl: defaultBaseUrl,
  clientType: "MOBILE",
  deviceName: "AgroLoop Mobile App",
  tokenStorage: mobileTokenStorage,
});

export function setMobileServerUrl(url: string): void {
  mobileApiClient.setBaseUrl(url);
}

// Bootstrap active server URL from SecureStore if configured
getServerConfig().then((config) => {
  if (config?.url) {
    setMobileServerUrl(config.url);
  }
}).catch(() => {});
