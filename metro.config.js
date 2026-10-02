const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite's web implementation loads its database engine as WebAssembly.
config.resolver.assetExts.push('wasm');

module.exports = config;
