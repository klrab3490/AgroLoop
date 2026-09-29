import { describe, it, expect } from "vitest";
import { checkLatestRelease, DEFAULT_GITHUB_REPO } from "./version-checker.js";

describe("version-checker", () => {
  it("detects when a newer release is available", async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          tag_name: "v1.2.0",
          name: "AgroLoop v1.2.0",
          body: "Major feature updates",
          html_url: "https://github.com/AgnaMariya/AgroLoop/releases/tag/v1.2.0",
          assets: [
            {
              name: "agroloop-desktop.dmg",
              size: 52428800,
              browser_download_url: "https://github.com/download/dmg",
              content_type: "application/octet-stream",
            },
          ],
        }),
        { status: 200 }
      );

    const result = await checkLatestRelease("1.0.2", { fetchFn: mockFetch as unknown as typeof fetch });
    expect(result.hasUpdate).toBe(true);
    expect(result.status).toBe("update-available");
    expect(result.latestVersion).toBe("1.2.0");
    expect(result.assets?.length).toBe(1);
    expect(result.assets?.[0]?.name).toBe("agroloop-desktop.dmg");
  });

  it("detects when app is already up to date", async () => {
    const mockFetch = async () =>
      new Response(
        JSON.stringify({
          tag_name: "v1.0.2",
          name: "AgroLoop v1.0.2",
          body: "Bug fixes",
          html_url: "https://github.com/AgnaMariya/AgroLoop/releases/tag/v1.0.2",
        }),
        { status: 200 }
      );

    const result = await checkLatestRelease("1.0.2", { fetchFn: mockFetch as unknown as typeof fetch });
    expect(result.hasUpdate).toBe(false);
    expect(result.status).toBe("up-to-date");
    expect(result.latestVersion).toBe("1.0.2");
  });

  it("handles 404 when no releases exist yet gracefully", async () => {
    const mockFetch = async () => new Response("Not Found", { status: 404 });

    const result = await checkLatestRelease("1.0.2", { fetchFn: mockFetch as unknown as typeof fetch });
    expect(result.hasUpdate).toBe(false);
    expect(result.status).toBe("no-releases");
    expect(result.currentVersion).toBe("1.0.2");
  });

  it("handles rate limit error gracefully", async () => {
    const mockFetch = async () => new Response("Rate limit", { status: 403 });

    const result = await checkLatestRelease("1.0.2", { fetchFn: mockFetch as unknown as typeof fetch });
    expect(result.hasUpdate).toBe(false);
    expect(result.status).toBe("error");
    expect(result.message).toContain("rate limit");
  });
});
