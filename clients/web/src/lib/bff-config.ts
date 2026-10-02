export const BACKEND_API_URL =
  process.env.BACKEND_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8080";

export const ALLOWED_PROXY_PREFIXES = [
  "marketplace",
  "orders",
  "household",
  "farmer",
  "pickups",
  "admin",
] as const;

export type AllowedProxyPrefix = (typeof ALLOWED_PROXY_PREFIXES)[number];

export function isAllowedProxyPath(firstSegment: string): firstSegment is AllowedProxyPrefix {
  return (ALLOWED_PROXY_PREFIXES as readonly string[]).includes(firstSegment);
}

export function extractCookieValue(cookieHeader: string | null, cookieName: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}
