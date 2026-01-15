// File: metro.config.js
const { getDefaultConfig } = require("@expo/metro-config");

const config = getDefaultConfig(__dirname);

// CRITICAL FIX: Force 'cjs' (CommonJS) to be the first extension.
// This prevents the "Auth not registered" race condition.
config.resolver.sourceExts = ["cjs", ...config.resolver.sourceExts];

module.exports = config;
