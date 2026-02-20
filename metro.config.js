const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Extend resolver for Reactylon Native + Babylon.js subpath imports
config.resolver.sourceExts = [...config.resolver.sourceExts, 'glsl', 'wgsl'];

// Force @babylonjs/havok to resolve to UMD entry (CJS-compatible).
// The ESM entry uses import.meta.url which Metro/Hermes cannot parse.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@babylonjs/havok') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/@babylonjs/havok/lib/umd/HavokPhysics_umd.js'),
      type: 'sourceFile',
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
