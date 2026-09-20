import { createAgroLoopClient, WebTokenStorage } from "@agroloop/api-client";

const defaultBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// In Web mode, access tokens are held in-memory and refresh tokens are strictly
// managed via browser HttpOnly cookies. No refresh tokens touch JavaScript storage.
export const webTokenStorage = new WebTokenStorage();

export const webApiClient = createAgroLoopClient({
  baseUrl: defaultBaseUrl,
  clientType: "WEB",
  tokenStorage: webTokenStorage,
});
