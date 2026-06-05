const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Diperlukan agar Metro memuat bundle React Native Firebase dengan benar.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
