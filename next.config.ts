//import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig = {
  reactStrictMode: true,
  // outras configs
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Desabilita no dev
})(nextConfig);
