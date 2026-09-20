import { normalizeServerUrl } from "@agroloop/api-client";

export interface DesktopServerProfile {
  id: string;
  name: string;
  url: string;
  lastConnected?: string;
  latencyMs?: number;
  status?: "connected" | "offline" | "untested";
}

const PROFILES_STORAGE_KEY = "agroloop_desktop_server_profiles";
const ACTIVE_PROFILE_KEY = "agroloop_desktop_active_server_id";

const DEFAULT_PROFILES: DesktopServerProfile[] = [
  {
    id: "prod",
    name: "Production",
    url: "https://api.agroloop.app",
    status: "untested",
  },
  {
    id: "dev",
    name: "Development",
    url: "http://localhost:8080",
    status: "untested",
  },
];

export function getServerProfiles(): DesktopServerProfile[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_PROFILES;
  }
  try {
    const raw = window.localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(DEFAULT_PROFILES));
      return DEFAULT_PROFILES;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PROFILES;
  }
}

export function saveServerProfiles(profiles: DesktopServerProfile[]): void {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  }
}

export function getActiveServerId(): string {
  if (typeof window === "undefined" || !window.localStorage) {
    return "dev";
  }
  return window.localStorage.getItem(ACTIVE_PROFILE_KEY) || "dev";
}

export function setActiveServerId(id: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(ACTIVE_PROFILE_KEY, id);
  }
}

export function getActiveServerProfile(): DesktopServerProfile {
  const profiles = getServerProfiles();
  const activeId = getActiveServerId();
  const match = profiles.find((p) => p.id === activeId);
  return match || profiles[0] || DEFAULT_PROFILES[1];
}

export function addServerProfile(name: string, url: string): DesktopServerProfile {
  const normalizedUrl = normalizeServerUrl(url);
  const profiles = getServerProfiles();
  const newProfile: DesktopServerProfile = {
    id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: name.trim() || "Custom Server",
    url: normalizedUrl,
    status: "untested",
  };
  const updated = [...profiles, newProfile];
  saveServerProfiles(updated);
  return newProfile;
}

export function updateServerProfile(id: string, updates: Partial<DesktopServerProfile>): void {
  const profiles = getServerProfiles();
  const updated = profiles.map((p) => (p.id === id ? { ...p, ...updates } : p));
  saveServerProfiles(updated);
}

export function deleteServerProfile(id: string): void {
  const profiles = getServerProfiles();
  if (profiles.length <= 1) {
    throw new Error("Cannot delete the only configured server profile.");
  }
  const filtered = profiles.filter((p) => p.id !== id);
  saveServerProfiles(filtered);
  if (getActiveServerId() === id) {
    setActiveServerId(filtered[0].id);
  }
}
