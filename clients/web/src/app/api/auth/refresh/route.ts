import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_URL, extractCookieValue } from "@/lib/bff-config";

interface RefreshResolution {
  ok: boolean;
  status: number;
  data: {
    accessToken?: string;
    expiresInSeconds?: number;
    title?: string;
    detail?: string;
  };
  newRefreshToken: string | null;
}

// Global server-side mutex to coalesce concurrent refresh operations
const inFlightRefreshes = new Map<string, Promise<RefreshResolution>>();

async function performBackendRefresh(
  refreshToken: string,
  requestId: string
): Promise<RefreshResolution> {
  try {
    const idempotencyKey = crypto.randomUUID();
    const backendRes = await fetch(`${BACKEND_API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
        "X-Request-Id": requestId,
        Cookie: `refreshToken=${refreshToken}; eco_refresh_token=${refreshToken}`,
      },
      body: JSON.stringify({
        refreshToken,
        clientType: "WEB",
      }),
    });

    const data = await backendRes.json();
    const setCookieHeader = backendRes.headers.get("set-cookie");
    const newRefreshToken =
      extractCookieValue(setCookieHeader, "eco_refresh_token") ||
      extractCookieValue(setCookieHeader, "refreshToken");

    return {
      ok: backendRes.ok,
      status: backendRes.status,
      data,
      newRefreshToken: newRefreshToken || refreshToken,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Refresh backend connection failed";
    return {
      ok: false,
      status: 502,
      data: { title: "Bad Gateway", detail: message },
      newRefreshToken: null,
    };
  }
}

export async function POST(req: NextRequest) {
  const cookieToken = req.cookies.get("eco_refresh_token")?.value;

  if (!cookieToken) {
    return NextResponse.json(
      { title: "Unauthorized", detail: "No refresh token available in session" },
      { status: 401 }
    );
  }

  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();

  // Server-Side Single-Flight Refresh Coalescing
  let refreshPromise = inFlightRefreshes.get(cookieToken);
  if (!refreshPromise) {
    refreshPromise = performBackendRefresh(cookieToken, requestId).finally(() => {
      inFlightRefreshes.delete(cookieToken);
    });
    inFlightRefreshes.set(cookieToken, refreshPromise);
  }

  const result = await refreshPromise;

  if (!result.ok) {
    const response = NextResponse.json(result.data, { status: result.status });
    // If refresh fails with 401/403, invalidate the cookie
    if (result.status === 401 || result.status === 403) {
      response.cookies.delete("eco_refresh_token");
    }
    return response;
  }

  const response = NextResponse.json({
    accessToken: result.data.accessToken,
    expiresInSeconds: result.data.expiresInSeconds,
  });

  if (result.newRefreshToken) {
    const isSecure =
      process.env.COOKIE_SECURE === "true" ||
      (process.env.NODE_ENV === "production" && req.nextUrl.protocol === "https:");

    response.cookies.set("eco_refresh_token", result.newRefreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
  }

  return response;
}
