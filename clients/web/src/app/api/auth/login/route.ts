import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_URL, extractCookieValue } from "@/lib/bff-config";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendRes = await fetch(`${BACKEND_API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": req.headers.get("x-request-id") || crypto.randomUUID(),
      },
      body: JSON.stringify({
        ...body,
        clientType: "WEB",
      }),
    });

    const data = await backendRes.json();
    if (!backendRes.ok) {
      return NextResponse.json(data, { status: backendRes.status });
    }

    // Extract refresh token from backend Set-Cookie header
    const setCookieHeader = backendRes.headers.get("set-cookie");
    const refreshToken = extractCookieValue(setCookieHeader, "eco_refresh_token");

    const response = NextResponse.json({
      user: data.user,
      accessToken: data.accessToken,
      expiresInSeconds: data.expiresInSeconds,
    });

    if (refreshToken) {
      response.cookies.set("eco_refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Authentication service unavailable";
    return NextResponse.json({ title: "BFF Login Error", detail: message, status: 500 }, { status: 500 });
  }
}
