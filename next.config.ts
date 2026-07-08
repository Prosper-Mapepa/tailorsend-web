import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  async rewrites() {
    // Proxy auth requests to the Railway/local backend when the browser uses same-origin paths.
    if (process.env.NEXT_PUBLIC_API_URL) return [];
    return [
      {
        source: "/api/auth/:path*",
        destination: `${backendUrl}/api/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
