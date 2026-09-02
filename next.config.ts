import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Auth is proxied at runtime by src/app/api/auth/[...path]/route.ts
  // using BACKEND_URL (defaults to http://localhost:4000).
};

export default nextConfig;
