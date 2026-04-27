import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Proxy API requests to the FastAPI backend to avoid CORS in production
  async rewrites() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
