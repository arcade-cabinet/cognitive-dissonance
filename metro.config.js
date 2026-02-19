const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Extend resolver for Reactylon Native + Babylon.js subpath imports
config.resolver.sourceExts = [...config.resolver.sourceExts, 'glsl', 'wgsl'];

module.exports = config;
