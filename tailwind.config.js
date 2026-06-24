/** @type {import('tailwindcss').Config} */
module.exports = {
  // Added src/app since your console shows you are using Expo Router there
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  // THIS IS THE MISSING PIECE:
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}