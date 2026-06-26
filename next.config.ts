import type { NextConfig } from "next";

const isWindows = process.platform === "win32";

const securityHeaders = [
  // Empêche le clickjacking (iframes d'origines externes)
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Empêche le MIME sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Politique de referrer stricte
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Protection XSS legacy (IE/Edge pre-Chromium)
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Permissions navigateur: camera/micro autorisés (vidéo), géoloc et paiement bloqués
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=()" },
  // Empêche la mise en cache de pages authentifiées par des proxies intermédiaires
  { key: "Cache-Control", value: "no-store, max-age=0" },
];

const nextConfig: NextConfig = {
  ...(isWindows ? {} : { output: "standalone" }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  turbopack: {},
  async headers() {
    return [
      {
        // Appliqué à toutes les routes
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // Autoriser la mise en cache des assets statiques Next.js
        source: "/_next/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
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
