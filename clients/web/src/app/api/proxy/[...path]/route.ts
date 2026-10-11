import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_URL, isAllowedProxyPath, ALLOWED_PROXY_PREFIXES } from "@/lib/bff-config";

async function proxyRequest(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;

  if (!path || path.length === 0) {
    return NextResponse.json(
      { title: "Bad Request", detail: "Missing proxy path parameter" },
      { status: 400 }
    );
  }

  const rootPrefix = path[0];
  if (!isAllowedProxyPath(rootPrefix)) {
    return NextResponse.json(
      {
        title: "Forbidden Proxy Route",
        detail: `Access to '${rootPrefix}' is prohibited. Allowed routes: ${ALLOWED_PROXY_PREFIXES.join(", ")}`,
        status: 403,
      },
      { status: 403 }
    );
  }

  const searchParams = req.nextUrl.search;
  const targetUrl = `${BACKEND_API_URL}/api/v1/${path.join("/")}${searchParams}`;

  const forwardHeaders = new Headers();
  const authHeader = req.headers.get("authorization");
  if (authHeader) forwardHeaders.set("Authorization", authHeader);

  const contentType = req.headers.get("content-type");
  if (contentType) forwardHeaders.set("Content-Type", contentType);

  const idempotencyKey = req.headers.get("idempotency-key");
  if (idempotencyKey) forwardHeaders.set("Idempotency-Key", idempotencyKey);

  const apiKey = req.headers.get("x-api-key");
  if (apiKey) forwardHeaders.set("X-API-Key", apiKey);

  forwardHeaders.set("X-Request-Id", req.headers.get("x-request-id") || crypto.randomUUID());

  try {
    let body: BodyInit | undefined = undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await req.arrayBuffer();
    }

    const backendRes = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      body,
    });

    const contentTypeHeader = backendRes.headers.get("content-type");
    if (contentTypeHeader && contentTypeHeader.includes("application/json")) {
      const data = await backendRes.json();
      return NextResponse.json(data, { status: backendRes.status });
    }

    const textData = await backendRes.text();
    return new NextResponse(textData, {
      status: backendRes.status,
      headers: {
        "Content-Type": contentTypeHeader || "text/plain",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Proxy backend unavailable";
    return NextResponse.json(
      { title: "Bad Gateway", detail: message, status: 502 },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
