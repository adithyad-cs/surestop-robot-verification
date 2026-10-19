import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Do not auto-generate AGENTS.md / CLAUDE.md in the working tree.
  agentRules: false,
};

export default nextConfig;
