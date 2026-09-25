/** NativeWind v4 + Tailwind v3 config. Design values from docs/design.md (globals.css:3-64). */
 /** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: "#E23744",
        branddark: "#FF5C69",
        osbgreen: "#0C831F",
        osbgreendark: "#35C759",
        lime: "#D8F34E",
        pine: "#0E3B2E",
        tang: "#FF6A2B",
        grape: "#7C5CFF",
        mint: "#1FB67C",
        ink: "#111114",
        ink2: "#4E4E59",
        ink3: "#8C8C99",
        paper: "#F4F5F7",
        paper2: "#EDEEF1",
      },
      fontFamily: {
        sans: ["PlusJakartaSans_400Regular", "System"],
        display: ["Fraunces_700Bold", "System"],
      },
      borderRadius: {
        12: "12px",
        18: "18px",
        24: "24px",
        32: "32px",
      },
    },
  },
  plugins: [],
};
