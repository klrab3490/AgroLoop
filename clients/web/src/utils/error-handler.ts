/**
 * Standard error parsing and normalization utilities.
 */

export interface NormalizedError {
  message: string;
  code?: string;
  status?: number;
  details?: Record<string, unknown>;
}

export function parseApiError(error: unknown, fallbackMessage: string = "An unexpected error occurred"): NormalizedError {
  if (!error) {
    return { message: fallbackMessage };
  }

  // Check if error is an Error object
  if (error instanceof Error) {
    // If it's a response with json body embedded
    const anyErr = error as any;
    if (anyErr.response?.data?.message) {
      return {
        message: String(anyErr.response.data.message),
        code: anyErr.response.data.code,
        status: anyErr.response.status,
      };
    }
    if (anyErr.body?.message) {
      return {
        message: String(anyErr.body.message),
        code: anyErr.body.code,
        status: anyErr.status,
      };
    }
    return { message: error.message };
  }

  // Check if error is an object with message property
  if (typeof error === "object") {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === "string") {
      return {
        message: obj.message,
        code: typeof obj.code === "string" ? obj.code : undefined,
        status: typeof obj.status === "number" ? obj.status : undefined,
      };
    }
    if (typeof obj.error === "string") {
      return { message: obj.error };
    }
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return { message: fallbackMessage };
}

export function getErrorMessage(error: unknown, fallbackMessage?: string): string {
  return parseApiError(error, fallbackMessage).message;
}
