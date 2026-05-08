import type { NextConfig } from "next";

const isWindows = process.platform === "win32";

const nextConfig: NextConfig = {
  ...(isWindows ? {} : { output: "standalone" }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  turbopack: {},
  webpack: (config, { isServer, webpack }) => {
    // Rewrite node: scheme imports so webpack can resolve them
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
        resource.request = resource.request.replace(/^node:/, "");
      })
    );

    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        https: false,
        http: false,
        path: false,
        zlib: false,
        stream: false,
        crypto: false,
        os: false,
      };
    }

    return config;
  },
};

export default nextConfig;
