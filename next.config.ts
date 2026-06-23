import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow bcryptjs and other native-like modules to run server-side
  serverExternalPackages: ["bcryptjs"],

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Production image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
