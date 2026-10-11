/**
 * Environment configuration module.
 * Centralizes and validates environment variable access across the web client.
 */

export interface EnvConfig {
  /** Target backend API URL used by server-side BFF route handlers */
  backendApiUrl: string;
  /** Public frontend origin URL */
  publicApiUrl: string;
  /** Node environment runtime */
  nodeEnv: "development" | "production" | "test";
  /** Is running in production */
  isProduction: boolean;
  /** Is running in development */
  isDevelopment: boolean;
}

const nodeEnv = (process.env.NODE_ENV || "development") as EnvConfig["nodeEnv"];

export const env: EnvConfig = {
  backendApiUrl:
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8080",
  publicApiUrl:
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"),
  nodeEnv,
  isProduction: nodeEnv === "production",
  isDevelopment: nodeEnv === "development",
};
