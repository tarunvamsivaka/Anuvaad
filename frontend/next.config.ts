// FE-02: Validate public Supabase configuration on production release builds
const sUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const sKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isMissingSupabase = !sUrl || sUrl.includes("placeholder.supabase.co") || sUrl.includes("your-") || !sKey || sKey.includes("placeholder_anon_key") || sKey.includes("your-");

if (process.env.NODE_ENV === "production" && process.env.STRICT_SUPABASE_CHECK === "true") {
  if (isMissingSupabase) {
    throw new Error(
      "[next.config] Production build failed: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be valid."
    );
  }
} else if (isMissingSupabase) {
  console.warn(
    "[next.config] Warning: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or configured with placeholder values."
  );
}

import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  // Proxy API requests to the FastAPI backend to avoid CORS in production.
  // Run this before the frontend catch-all route so API requests reach Render.
  async rewrites() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return {
      afterFiles: [
        {
          // Native Next.js routes (such as /api/auth/callback) take precedence.
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
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons", "framer-motion", "@monaco-editor/react"],
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

const shouldEnableSentry = Boolean(
  process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.SENTRY_AUTH_TOKEN
);

const finalConfig = shouldEnableSentry
  ? withSentryConfig(configWithPWA, {
      silent: !process.env.CI,
      widenClientFileUpload: true,
      // INFRA-05: Use /sentry-tunnel (not /monitoring) to avoid /api/:path* rewrite conflict
      tunnelRoute: "/sentry-tunnel",
    })
  : configWithPWA;

export default analyze(finalConfig);

