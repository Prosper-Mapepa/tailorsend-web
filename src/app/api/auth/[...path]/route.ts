import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

function backendBase(): string {
  return (process.env.BACKEND_URL ?? "http://localhost:4000").replace(
    /\/$/,
    "",
  );
}

async function proxyAuth(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const { path } = await ctx.params;
  const incoming = new URL(req.url);
  const target = `${backendBase()}/api/auth/${path.join("/")}${incoming.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });

  const init: RequestInit & { duplex?: "half" } = {
    method: req.method,
    headers,
    redirect: "manual",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
    init.duplex = "half";
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (err) {
    console.error("[auth-proxy]", target, err);
    return NextResponse.json(
      {
        error: `Auth API is unreachable at ${backendBase()}. Set BACKEND_URL on the Web service to your Railway API URL (e.g. https://….up.railway.app).`,
      },
      { status: 502 },
    );
  }

  const outHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) outHeaders.set(key, value);
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

export const GET = proxyAuth;
export const POST = proxyAuth;
export const PUT = proxyAuth;
export const PATCH = proxyAuth;
export const DELETE = proxyAuth;
export const OPTIONS = proxyAuth;
