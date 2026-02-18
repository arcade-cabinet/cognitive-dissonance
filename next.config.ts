import type { NextConfig } from 'next';

const isGitHubPages = process.env.GITHUB_PAGES === 'true';
const repoName = 'cognitive-dissonance';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['reactylon', '@babylonjs/core', '@babylonjs/loaders', '@babylonjs/gui'],
  // Static export for GitHub Pages deployment
  ...(isGitHubPages && {
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
    basePath: `/${repoName}`,
    assetPrefix: `/${repoName}/`,
  }),
};

export default nextConfig;
