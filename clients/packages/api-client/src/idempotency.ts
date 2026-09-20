/**
 * Generates and validates stable idempotency keys for financial and state-changing mutations.
 * A single logical mutation preserves the identical key across retries.
 */
export function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface MutationOptions {
  /**
   * Explicit idempotency key. If omitted on an idempotent mutation,
   * a stable key will be generated once and reused across retries.
   */
  idempotencyKey?: string;
}
