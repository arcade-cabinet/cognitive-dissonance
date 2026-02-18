/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['reactylon', '@babylonjs/core'],
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false };
    return config;
  },
};
export default nextConfig;