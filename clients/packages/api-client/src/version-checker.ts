import { compareSemver } from "./server-verification.js";

declare const process: { env?: Record<string, string | undefined> } | undefined;

/**
 * Safely resolves an environment variable across Next.js, Vite, Expo, and Node.
 */
export function resolveEnv(key: string, defaultValue: string): string {
  try {
    if (key === "APP_VERSION") {
      const literalVal =
        typeof process !== "undefined" && process?.env
          ? process.env.NEXT_PUBLIC_APP_VERSION || process.env.APP_VERSION || process.env.EXPO_PUBLIC_APP_VERSION
          : undefined;
      if (literalVal && typeof literalVal === "string") return literalVal.trim();
    }

    if (key === "GITHUB_REPO") {
      const literalRepo =
        typeof process !== "undefined" && process?.env
          ? process.env.NEXT_PUBLIC_GITHUB_REPO || process.env.GITHUB_REPO || process.env.EXPO_PUBLIC_GITHUB_REPO
          : undefined;
      if (literalRepo && typeof literalRepo === "string") return literalRepo.trim();
    }

    if (typeof process !== "undefined" && process?.env) {
      const val =
        process.env[key] ||
        process.env[`NEXT_PUBLIC_${key}`] ||
        process.env[`EXPO_PUBLIC_${key}`] ||
        process.env[`VITE_${key}`];
      if (val && typeof val === "string") return val.trim();
    }
  } catch {
    // ignore
  }

  try {
    // @ts-expect-error Vite env support - direct property access avoids webpack warning
    const metaEnv = import.meta.env as Record<string, string | undefined> | undefined;
    if (metaEnv) {
      const val = metaEnv[key] || metaEnv[`VITE_${key}`];
      if (val && typeof val === "string") return val.trim();
    }
  } catch {
    // ignore
  }

  return defaultValue;
}

export const DEFAULT_GITHUB_REPO = resolveEnv("GITHUB_REPO", "AgnaMariya/AgroLoop");
export const CURRENT_PLATFORM_VERSION = resolveEnv("APP_VERSION", "1.0.6");

export interface GitHubReleaseAsset {
  name: string;
  size: number;
  downloadUrl: string;
  contentType: string;
}

export interface GitHubReleaseInfo {
  tagName: string;
  version: string;
  name: string;
  body: string;
  publishedAt: string;
  htmlUrl: string;
  assets: GitHubReleaseAsset[];
}

export interface VersionCheckResult {
  currentVersion: string;
  latestVersion: string | null;
  hasUpdate: boolean;
  repo: string;
  releaseName?: string;
  releaseNotes?: string;
  publishedAt?: string;
  htmlUrl?: string;
  assets?: GitHubReleaseAsset[];
  status: "up-to-date" | "update-available" | "no-releases" | "error";
  message: string;
}

export interface CheckVersionOptions {
  repo?: string;
  token?: string;
  fetchFn?: typeof fetch;
}



/**
 * Checks for the latest release on GitHub and compares against the current version.
 */
export async function checkLatestRelease(
  currentVersion: string = CURRENT_PLATFORM_VERSION,
  options?: CheckVersionOptions
): Promise<VersionCheckResult> {
  const repo = options?.repo || DEFAULT_GITHUB_REPO;
  const customFetch = options?.fetchFn || fetch;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };

  if (options?.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const cleanCurrent = currentVersion.replace(/^v/i, "");

  try {
    // 1. Try fetching latest published release
    const latestUrl = `https://api.github.com/repos/${repo}/releases/latest`;
    let response = await customFetch(latestUrl, { headers });

    // 2. If 404, fallback to /releases list (in case latest flag isn't set or pre-releases exist)
    if (response.status === 404) {
      const allReleasesUrl = `https://api.github.com/repos/${repo}/releases?per_page=1`;
      response = await customFetch(allReleasesUrl, { headers });
    }

    // 3. If still 404, fallback to /tags list
    if (response.status === 404) {
      const tagsUrl = `https://api.github.com/repos/${repo}/tags?per_page=1`;
      const tagsRes = await customFetch(tagsUrl, { headers });
      if (tagsRes.ok) {
        const tags = (await tagsRes.json()) as Array<{ name: string; commit: { url: string } }>;
        if (Array.isArray(tags) && tags.length > 0) {
          const firstTag = tags[0]!;
          const tagName = firstTag.name;
          const cleanLatest = tagName.replace(/^v/i, "");
          const isNewer = compareSemver(cleanLatest, cleanCurrent) > 0;

          return {
            currentVersion: cleanCurrent,
            latestVersion: cleanLatest,
            hasUpdate: isNewer,
            repo,
            releaseName: `Tag ${tagName}`,
            htmlUrl: `https://github.com/${repo}/releases/tag/${tagName}`,
            status: isNewer ? "update-available" : "up-to-date",
            message: isNewer
              ? `New version ${tagName} is available on GitHub!`
              : `You are on the latest version (${cleanCurrent}).`,
          };
        }
      }

      // No releases or tags exist yet (or private repo without token)
      return {
        currentVersion: cleanCurrent,
        latestVersion: null,
        hasUpdate: false,
        repo,
        htmlUrl: `https://github.com/${repo}/releases`,
        status: "no-releases",
        message: `No public releases found on GitHub (${repo}). You are running version ${cleanCurrent}.`,
      };
    }

    if (!response.ok) {
      if (response.status === 403) {
        return {
          currentVersion: cleanCurrent,
          latestVersion: null,
          hasUpdate: false,
          repo,
          status: "error",
          message: "GitHub API rate limit exceeded. Please try again later or provide a token.",
        };
      }
      throw new Error(`GitHub API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const release = Array.isArray(data) ? data[0] : data;

    if (!release || !release.tag_name) {
      return {
        currentVersion: cleanCurrent,
        latestVersion: null,
        hasUpdate: false,
        repo,
        htmlUrl: `https://github.com/${repo}/releases`,
        status: "no-releases",
        message: `No releases published yet on GitHub (${repo}). Current version: ${cleanCurrent}.`,
      };
    }

    const tagName = release.tag_name as string;
    const cleanLatest = tagName.replace(/^v/i, "");
    const isNewer = compareSemver(cleanLatest, cleanCurrent) > 0;

    const assets: GitHubReleaseAsset[] = Array.isArray(release.assets)
      ? release.assets.map((a: Record<string, unknown>) => ({
          name: String(a.name ?? ""),
          size: Number(a.size ?? 0),
          downloadUrl: String(a.browser_download_url ?? ""),
          contentType: String(a.content_type ?? ""),
        }))
      : [];

    return {
      currentVersion: cleanCurrent,
      latestVersion: cleanLatest,
      hasUpdate: isNewer,
      repo,
      releaseName: release.name || tagName,
      releaseNotes: release.body || "",
      publishedAt: release.published_at || "",
      htmlUrl: release.html_url || `https://github.com/${repo}/releases`,
      assets,
      status: isNewer ? "update-available" : "up-to-date",
      message: isNewer
        ? `A new version (${tagName}) is available on GitHub!`
        : `You are on the latest version (${cleanCurrent}).`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    return {
      currentVersion: cleanCurrent,
      latestVersion: null,
      hasUpdate: false,
      repo,
      status: "error",
      message: `Failed to check for updates: ${errorMsg}`,
    };
  }
}
