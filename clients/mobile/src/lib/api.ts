import { createAgroLoopClient } from "@agroloop/api-client";
import { SecureStoreTokenStorage } from "../storage/secure-store.js";

const defaultBaseUrl =
  process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:8080";

export const mobileTokenStorage = new SecureStoreTokenStorage();

export const mobileApiClient = createAgroLoopClient({
  baseUrl: defaultBaseUrl,
  clientType: "MOBILE",
  deviceName: "AgroLoop Mobile App",
  tokenStorage: mobileTokenStorage,
});
