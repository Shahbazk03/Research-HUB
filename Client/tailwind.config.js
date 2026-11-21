/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        serif: ['"Source Serif 4"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        // Primary corporate navy
        navy: {
          50: "#F3F6FB",
          100: "#E4EAF3",
          200: "#C5D2E6",
          300: "#97AECF",
          400: "#6383B2",
          500: "#3F6196",
          600: "#2D4B7C",
          700: "#223B64",
          800: "#1A2E4F",
          900: "#12223D",
          950: "#0A1628",
        },
        // Restrained gold accent, used sparingly
        accent: {
          50: "#FBF7EC",
          100: "#F4EACB",
          200: "#E9D49A",
          300: "#DDBC68",
          400: "#D1A845",
          500: "#B88F2C",
          600: "#987322",
          700: "#77591D",
        },
        brand: {
          50: "#F3F6FB",
          100: "#E4EAF3",
          500: "#3F6196",
          600: "#2D4B7C",
          700: "#223B64",
          900: "#12223D",
        },
      },
      maxWidth: {
        page: "86rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)",
        lift: "0 10px 30px -12px rgba(18, 34, 61, 0.18)",
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease-out both",
        "slide-up": "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-up": "scaleUp 0.2s ease-out both",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleUp: {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};
