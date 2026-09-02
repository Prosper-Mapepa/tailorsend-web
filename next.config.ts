import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Auth is proxied at runtime by src/app/api/auth/[...path]/route.ts
  // (BACKEND_URL, or the Railway API host in production).
};

export default nextConfig;
