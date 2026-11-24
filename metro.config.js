const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');
// expo-sqlite's web build loads a .wasm file (used for the web preview and screenshots).
config.resolver.assetExts.push('wasm');

module.exports = config;
