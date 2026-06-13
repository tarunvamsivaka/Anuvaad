import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  // Proxy API requests to the FastAPI backend to avoid CORS in production
  // INFRA-05: Exclude /monitoring (Sentry tunnelRoute) from the proxy rewrite
  async rewrites() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return {
      fallback: [
        {
          // Proxy all unmatched /api/... requests to the FastAPI backend.
          // Native routes (like /api/auth/callback) are served by Next.js and bypass this fallback.
          source: "/api/:path*",
          destination: `${API_URL}/api/:path*`,
        },
      ],
    };
  },
  images: {
    remotePatterns: [],
  },
  experimental: {
    optimizeCss: true,
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  // Performance & security
  compress: true,          // Brotli/gzip at Next.js layer
  poweredByHeader: false,  // Remove X-Powered-By fingerprinting header
  output: "standalone",  // Enable standalone production build for smaller memory footprint
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";

const analyze = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const configWithPWA = withPWA(nextConfig);

export default analyze(withSentryConfig(configWithPWA, {
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
}));

