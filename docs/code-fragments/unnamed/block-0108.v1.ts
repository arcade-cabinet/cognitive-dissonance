/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['reactylon', '@babylonjs/core', '@babylonjs/loaders'],
  webpack: (config) => {
    config.resolve.fallback = { fs: false, path: false, crypto: false };
    return config;
  },
  experimental: { esmExternals: 'loose' },
};
export default nextConfig;