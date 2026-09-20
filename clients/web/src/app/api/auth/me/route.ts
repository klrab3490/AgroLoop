import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_URL } from "@/lib/bff-config";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json(
      { title: "Unauthorized", detail: "No access token provided" },
      { status: 401 }
    );
  }

  try {
    const backendRes = await fetch(`${BACKEND_API_URL}/api/v1/auth/me`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "X-Request-Id": req.headers.get("x-request-id") || crypto.randomUUID(),
      },
    });

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Auth verification error";
    return NextResponse.json({ title: "BFF Me Error", detail: message, status: 500 }, { status: 500 });
  }
}
