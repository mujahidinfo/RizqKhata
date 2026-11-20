// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite on web runs SQLite as WebAssembly (the query cache, outbox and
// language store all use expo-sqlite/kv-store), so Metro must serve .wasm.
config.resolver.assetExts.push('wasm');

// …and SharedArrayBuffer needs these headers in development. Production web
// hosting must send the same two headers.
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
