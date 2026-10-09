import type { NextConfig } from "next";

const apiHost = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1").replace(/\/api\/v1\/?$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiHost}/api/v1/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${apiHost}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;

