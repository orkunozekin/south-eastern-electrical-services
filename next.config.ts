import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin", "jose", "jwks-rsa"],
  // `lib/admin-guide.ts` reads this at request time.
  outputFileTracingIncludes: {
    "/admin": ["./docs/admin-guide.md"],
    "/admin/availability": ["./docs/admin-guide.md"],
    "/admin/settings": ["./docs/admin-guide.md"],
    "/admin/guide": ["./docs/admin-guide.md"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
