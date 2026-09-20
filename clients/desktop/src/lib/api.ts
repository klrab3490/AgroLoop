import {
  createAgroLoopClient,
  verifyServer,
  type ServerVerificationResult,
} from "@agroloop/api-client";
import { DesktopTokenStorage } from "../storage/desktop-storage.js";
import {
  getActiveServerProfile,
  setActiveServerId,
  updateServerProfile,
  type DesktopServerProfile,
} from "../storage/server-config.js";

const initialProfile = getActiveServerProfile();

export const desktopTokenStorage = new DesktopTokenStorage();

export const desktopApiClient = createAgroLoopClient({
  baseUrl: initialProfile.url,
  clientType: "DESKTOP",
  deviceName: "AgroLoop Operator Workstation",
  tokenStorage: desktopTokenStorage,
});

/**
 * Executes a strictly guarded server profile switch:
 * 1. Probes /api/v1/meta to verify identity and compatibility
 * 2. Reconfigures API client baseUrl dynamically
 * 3. Clears the previous server's authentication tokens and session
 * 4. Clears server-scoped client caches
 * 5. Updates profile metadata (status, latency, lastConnected)
 */
export async function switchDesktopServer(
  profile: DesktopServerProfile
): Promise<ServerVerificationResult> {
  const result = await verifyServer(profile.url, {
    clientVersion: "1.0.0",
    timeoutMs: 6000,
  });

  if (!result.ok) {
    updateServerProfile(profile.id, {
      status: "offline",
    });
    return result;
  }

  // 1. Dynamic base URL re-targeting
  desktopApiClient.setBaseUrl(result.url);

  // 2. Clear previous server's authentication session and tokens
  await desktopApiClient.session.clearSession();
  await desktopTokenStorage.clear();

  // 3. Clear server-scoped storage / transient caches
  if (typeof window !== "undefined" && window.sessionStorage) {
    window.sessionStorage.clear();
  }

  // 4. Update profile metadata
  setActiveServerId(profile.id);
  updateServerProfile(profile.id, {
    url: result.url,
    status: "connected",
    latencyMs: result.latencyMs,
    lastConnected: new Date().toISOString(),
  });

  return result;
}
