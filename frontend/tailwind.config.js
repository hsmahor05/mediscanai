/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { brand: { 50: "#effcfa", 100: "#d3f8f1", 200: "#a8efe3", 300: "#72e0d1", 400: "#3ec9bb", 500: "#1fada2", 600: "#168a84", 700: "#166e6c", 800: "#165758", 900: "#164949" }, ink: "#0f1f2e" },
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"] },
      boxShadow: { card: "0 1px 2px rgba(15,31,46,.04), 0 4px 16px rgba(15,31,46,.06)" },
    },
  },
  plugins: [],
};
