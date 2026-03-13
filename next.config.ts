import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // Static HTML export for Electron
  trailingSlash: true,
  images: {
    unoptimized: true  // Required for static export
  }
};

export default nextConfig;
