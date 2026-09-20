import { createAgroLoopClient } from "@agroloop/api-client";
import { DesktopTokenStorage } from "../storage/desktop-storage.js";

const defaultBaseUrl =
  (typeof process !== "undefined" && process.env?.VITE_API_URL) ||
  "http://localhost:8080";

export const desktopTokenStorage = new DesktopTokenStorage();

export const desktopApiClient = createAgroLoopClient({
  baseUrl: defaultBaseUrl,
  clientType: "DESKTOP",
  deviceName: "AgroLoop Operator Workstation",
  tokenStorage: desktopTokenStorage,
});
