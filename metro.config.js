const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// The 'input' must match the CSS file we create in the next step
module.exports = withNativeWind(config, { input: "./src/global.css" });