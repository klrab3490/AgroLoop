/**
 * Generates a fresh unique correlation ID for every outbound HTTP request attempt.
 */
export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `req_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  // Fallback for environments lacking crypto.randomUUID
  return `req_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
}
