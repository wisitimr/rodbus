import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Cache RSC results in the client router. When the user taps between
    // dashboard / history / manage / admin tabs repeatedly, the second click
    // (within the stale window) reuses the cached render instead of round-
    // tripping to the server. Default was 0s for dynamic routes, meaning
    // every click paid full SSR latency.
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
    // Tree-shake lucide-react so we only bundle the icons actually used
    // instead of shipping the whole icon set on every page.
    optimizePackageImports: ["lucide-react"],
  },
  poweredByHeader: false,
};

export default nextConfig;
