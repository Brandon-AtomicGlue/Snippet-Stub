import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pin the workspace root: /Users/brandon has an unrelated package-lock.json
  // that Turbopack would otherwise pick up as a false workspace root.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
