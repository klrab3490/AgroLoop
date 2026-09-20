import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_URL } from "@/lib/bff-config";

export async function POST(req: NextRequest) {
  const cookieToken = req.cookies.get("eco_refresh_token")?.value;
  const authHeader = req.headers.get("authorization");

  try {
    if (cookieToken) {
      await fetch(`${BACKEND_API_URL}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
          "X-Request-Id": req.headers.get("x-request-id") || crypto.randomUUID(),
        },
        body: JSON.stringify({
          refreshToken: cookieToken,
          clientType: "WEB",
        }),
      });
    }
  } catch {
    // Ignore backend logout errors to ensure client session is always cleaned up
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("eco_refresh_token");
  return response;
}
