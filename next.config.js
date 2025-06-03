//import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['res.cloudinary.com'],
  },
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
