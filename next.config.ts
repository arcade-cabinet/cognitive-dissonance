import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['reactylon', '@babylonjs/core', '@babylonjs/loaders', '@babylonjs/gui'],
};

export default nextConfig;
