import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" trips Vercel's build pipeline (it does its own equivalent
  // tracing/optimization and gets confused by this option - fails with an
  // ENOENT looking for a .nft.json file). Only opt in for the Docker build
  // (apps/web/Dockerfile sets NEXT_OUTPUT_STANDALONE=1), where it produces
  // the self-contained server.js the Dockerfile's runtime stage expects.
  output: process.env.NEXT_OUTPUT_STANDALONE === "1" ? "standalone" : undefined,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
