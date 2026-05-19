//import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig = {
  reactStrictMode: true,
  images: {
    // `images.domains` is deprecated — prefer `remotePatterns` for better control
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Keep an explicit (empty) turbopack config so Next won't error when a custom
  // webpack config is present. Turbopack will still be used where possible.
  turbopack: {},
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Desabilita no dev
})(nextConfig);
